from flask import Blueprint, render_template, jsonify, request, current_app, Response
from pathlib import Path
from datetime import datetime
import csv
import json
import io

try:
    from supabase_client import supabase
except Exception:
    supabase = None


reports_bp = Blueprint("reports", __name__)

LEVELS = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"]
JSS_ARMS = ["A", "B", "C"]
SS_ARMS = ["GOLD", "SILVER", "DIAMOND"]

STUDENT_FILES = {
    "JSS1": "JSS1_Students.csv",
    "JSS2": "JSS2_Students.csv",
    "JSS3": "JSS3_Students.csv",
    "SS1": "SS1_Students.csv",
    "SS2": "SS2_Students.csv",
    "SS3": "SS3_Students.csv",
}

GRADE_SCALE = [
    ("A", 80, 100, "Excellent"),
    ("B", 70, 79.99, "Very good"),
    ("C", 60, 69.99, "Good"),
    ("D", 45, 59.99, "Pass"),
    ("E", 40, 44.99, "Pass"),
    ("F", 0, 39.99, "Fail"),
]


# =========================================================
# PATH HELPERS
# =========================================================

def data_dir():
    return Path(current_app.root_path) / "static" / "data"


def reports_data_dir():
    path = data_dir() / "reports"
    path.mkdir(parents=True, exist_ok=True)
    return path


def saved_reports_path():
    return reports_data_dir() / "generated_reports.csv"

def report_settings_path():
    return reports_data_dir() / "report_settings.json"


def read_report_settings():
    path = report_settings_path()

    default = {
        "report_next_term": "",
        "updated_at": "",
    }

    if not path.exists():
        return default

    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        if not isinstance(data, dict):
            return default

        return {
            **default,
            **data,
        }
    except Exception:
        return default


def save_report_settings(settings):
    path = report_settings_path()

    with path.open("w", encoding="utf-8") as file:
        json.dump(settings, file, indent=2, ensure_ascii=False)

    return settings


def valid_date_string(value):
    value = normalize_text(value)

    if not value:
        return ""

    try:
        datetime.strptime(value, "%Y-%m-%d")
        return value
    except Exception:
        return ""


def student_file_path(level):
    filename = STUDENT_FILES.get(normalize_upper(level))
    if not filename:
        return None
    return data_dir() / filename


# =========================================================
# NORMALIZATION HELPERS
# =========================================================

def normalize_text(value):
    return str(value or "").strip()


def normalize_upper(value):
    return normalize_text(value).upper()


def normalize_arm(value):
    return normalize_upper(value).replace(" ", "_")


def normalize_admission(value):
    return "".join(ch for ch in normalize_text(value).lower() if ch.isalnum())


def normalize_subject_key(value):
    return " ".join(normalize_text(value).replace("_", " ").upper().split())


def safe_float(value, default=0):
    try:
        if value in ["", None]:
            return default
        return float(value)
    except Exception:
        return default


def safe_int(value, default=0):
    try:
        if value in ["", None]:
            return default
        return int(float(value))
    except Exception:
        return default


def exam_score_value(row):
    if not row:
        return 0

    return (
        row.get("exam_score")
        or row.get("Exam_score")
        or row.get("EXAM_SCORE")
        or row.get("score")
        or row.get("Score")
        or row.get("SCORE")
        or 0
    )


def is_jss(level):
    return normalize_upper(level).startswith("JSS")


def get_level_from_class_arm(class_arm):
    class_arm = normalize_arm(class_arm)

    for level in LEVELS:
        if class_arm.startswith(level):
            return level

    return ""


def build_class_arm(level, arm):
    level = normalize_upper(level)
    arm = normalize_arm(arm)

    if not level or not arm:
        return ""

    if is_jss(level):
        if arm.startswith(level):
            return arm.replace("_", "")
        return f"{level}{arm}".replace("_", "")

    if arm.startswith(level):
        return arm

    return f"{level}_{arm}"


def split_class_arm(class_arm):
    class_arm = normalize_arm(class_arm)
    level = get_level_from_class_arm(class_arm)

    if not level:
        return "", ""

    arm = class_arm.replace(level, "", 1).strip("_")
    return level, arm


def display_class_arm(level, arm):
    class_arm = build_class_arm(level, arm)
    level, arm = split_class_arm(class_arm)

    if not level:
        return ""

    return f"{level} {arm}".strip()


def class_arm_variants(level, arm):
    class_arm = build_class_arm(level, arm)
    level = normalize_upper(level)
    arm = normalize_arm(arm)

    return {
        normalize_arm(class_arm),
        normalize_arm(class_arm.replace("_", "")),
        normalize_arm(display_class_arm(level, arm)),
        normalize_arm(f"{level}{arm}"),
        normalize_arm(f"{level}_{arm}"),
        normalize_arm(arm),
    }


def display_subject(value):
    text = normalize_text(value).replace("_", " ").lower()

    special = {
        "irk": "IRK",
        "irs": "IRS",
        "bst": "BST",
        "pvs": "PVS",
        "cca": "CCA",
        "phe": "P.H.E",
        "p.h.e": "P.H.E",
    }

    if text in special:
        return special[text]

    return " ".join(part.capitalize() for part in text.split())


def student_full_name(row):
    full = normalize_text(
        row.get("Full_name")
        or row.get("full_name")
        or row.get("Student_name")
        or row.get("student_name")
    )

    if full:
        return full

    return " ".join([
        normalize_text(row.get("Last_name") or row.get("last_name")),
        normalize_text(row.get("First_name") or row.get("first_name")),
        normalize_text(row.get("Other_names") or row.get("other_names")),
    ]).strip()


def get_student_admission(row):
    return normalize_text(
        row.get("Admission_number")
        or row.get("admission_number")
        or row.get("Admission No")
        or row.get("Admission No.")
        or row.get("admission_no")
        or row.get("Admission")
    )


def now_string():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# =========================================================
# STUDENTS
# =========================================================

def load_students(level, arm):
    level = normalize_upper(level)
    arm = normalize_arm(arm)
    class_arm = build_class_arm(level, arm)

    path = student_file_path(level)

    if not path or not path.exists():
        return []

    students = []

    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            admission = get_student_admission(row)
            name = student_full_name(row)

            if not admission or not name:
                continue

            row_class = normalize_arm(row.get("Class") or row.get("class"))
            row_category = normalize_arm(row.get("Class_category") or row.get("class_category"))

            accepts = class_arm_variants(level, arm)

            valid = (
                row_class in accepts
                or row_category in accepts
                or row_category == level
            )

            if not valid:
                continue

            students.append({
                "admission_number": admission,
                "admission_key": normalize_admission(admission),
                "full_name": name,
                "last_name": normalize_text(row.get("Last_name") or row.get("last_name")),
                "first_name": normalize_text(row.get("First_name") or row.get("first_name")),
                "other_names": normalize_text(row.get("Other_names") or row.get("other_names")),
                "phone": normalize_text(row.get("Phone") or row.get("phone")),
                "class_level": level,
                "class_arm": class_arm,
                "class_display": display_class_arm(level, arm),
                "class_category": level,
                "age": normalize_text(row.get("Age") or row.get("age")),
                "raw": row,
            })

    return students


# =========================================================
# GRADING / REMARKS
# =========================================================

def grade_for_score(score):
    score = safe_float(score)

    for grade, low, high, comment in GRADE_SCALE:
        if low <= score <= high:
            return grade, comment

    return "F", "Fail"


def final_grade_for_average(avg):
    grade, _ = grade_for_score(avg)
    return grade


def teacher_remark(avg):
    avg = safe_float(avg)

    if avg >= 80:
        return "An excellent student with great potentials."
    if avg >= 70:
        return "A very good performance. Keep it up."
    if avg >= 60:
        return "A good result with room for more improvement."
    if avg >= 45:
        return "An average performance. More effort is needed."

    return "Poor performance. Serious improvement is required."


def principal_remark(avg):
    avg = safe_float(avg)

    if avg >= 80:
        return "An excellent result."
    if avg >= 70:
        return "A very good result. Keep it up."
    if avg >= 60:
        return "Good result."
    if avg >= 45:
        return "Average performance."

    return "Unsatisfactory performance."


# =========================================================
# ATTENDANCE
# =========================================================

def read_attendance(level, arm, session_value, term_value):
    class_arm = build_class_arm(level, arm)
    path = data_dir() / "attendance" / f"attendance_{class_arm}.csv"

    summary = {}

    if not path.exists():
        return summary

    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            if session_value and normalize_upper(row.get("Session")) != normalize_upper(session_value):
                continue

            if term_value and normalize_upper(row.get("Term")) != normalize_upper(term_value):
                continue

            admission = normalize_admission(row.get("Admission_number") or row.get("Admission No"))

            if not admission:
                continue

            status = normalize_upper(row.get("Status"))
            record_type = normalize_upper(row.get("Record_type"))

            if admission not in summary:
                summary[admission] = {
                    "days_open": 0,
                    "present": 0,
                    "absent": 0,
                    "late": 0,
                    "sick": 0,
                    "excused": 0,
                    "holiday": 0,
                    "attendance_percentage": 0,
                }

            if record_type != "HOLIDAY":
                summary[admission]["days_open"] += 1

            if status == "PRESENT":
                summary[admission]["present"] += 1
            elif status == "ABSENT":
                summary[admission]["absent"] += 1
            elif status == "LATE":
                summary[admission]["late"] += 1
                summary[admission]["present"] += 1
            elif status == "SICK":
                summary[admission]["sick"] += 1
            elif status == "EXCUSED":
                summary[admission]["excused"] += 1
            elif status == "HOLIDAY":
                summary[admission]["holiday"] += 1

    for admission, item in summary.items():
        days_open = safe_float(item.get("days_open"))
        present = safe_float(item.get("present"))
        item["attendance_percentage"] = round((present / days_open) * 100, 1) if days_open else 0

    return summary


# =========================================================
# CA / TEST RECORDS
# =========================================================

def parse_students_blob(value):
    if not value:
        return []

    if isinstance(value, list):
        return value

    try:
        parsed = json.loads(value)

        if isinstance(parsed, list):
            return parsed

        if isinstance(parsed, dict):
            return parsed.get("students", []) or parsed.get("records", [])
    except Exception:
        return []

    return []


def normalize_ca_row(row, level):
    if is_jss(level):
        ca1 = safe_float(row.get("ca1") or row.get("CA1") or row.get("Ca1"))
        ca2 = safe_float(row.get("ca2") or row.get("CA2") or row.get("Ca2"))
        test1 = safe_float(row.get("test1") or row.get("TEST1") or row.get("Test1"))
        test2 = safe_float(row.get("test2") or row.get("TEST2") or row.get("Test2"))

        return {
            "ca1": ca1,
            "ca2": ca2,
            "test1": test1,
            "test2": test2,
            "ca_total": round(ca1 + ca2 + test1 + test2, 2),
            "mode": "JSS",
        }

    ass1 = safe_float(
        row.get("ass1")
        or row.get("ASS1")
        or row.get("first_ass")
        or row.get("1st_ass")
        or row.get("1ST ASS")
        or row.get("1ST ASS.")
    )

    ass2 = safe_float(
        row.get("ass2")
        or row.get("ASS2")
        or row.get("second_ass")
        or row.get("2nd_ass")
        or row.get("2ND ASS")
        or row.get("2ND ASS.")
    )

    test = safe_float(row.get("test") or row.get("TEST"))

    return {
        "ass1": ass1,
        "ass2": ass2,
        "test": test,
        "ca_total": round(ass1 + ass2 + test, 2),
        "mode": "SS",
    }


def read_ca_records(session_value, term_value, level, arm):
    path = data_dir() / "ca_tests" / "ca_test_records.csv"

    if not path.exists():
        return {}, []

    valid_classes = class_arm_variants(level, arm)

    by_student = {}
    subjects_found = set()

    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            row_session = normalize_text(row.get("Session") or row.get("session"))
            row_term = normalize_upper(row.get("Term") or row.get("term"))

            row_class = normalize_arm(
                row.get("Class")
                or row.get("class")
                or row.get("Class_arm")
                or row.get("class_arm")
                or row.get("Class Category")
                or row.get("class_category")
            )

            if row_session and row_session != session_value:
                continue

            if row_term and row_term != normalize_upper(term_value):
                continue

            if row_class and row_class not in valid_classes:
                continue

            subject = normalize_subject_key(row.get("Subject") or row.get("subject"))

            students_blob = (
                row.get("Students")
                or row.get("students")
                or row.get("Scores")
                or row.get("scores")
                or row.get("Data")
                or row.get("data")
            )

            blob_students = parse_students_blob(students_blob)

            if blob_students:
                for item in blob_students:
                    admission = normalize_admission(
                        item.get("admission_number")
                        or item.get("Admission_number")
                        or item.get("Admission No")
                        or item.get("admission_no")
                    )

                    item_subject = normalize_subject_key(item.get("subject") or subject)

                    if not admission or not item_subject:
                        continue

                    subjects_found.add(item_subject)
                    by_student.setdefault(admission, {})
                    by_student[admission][item_subject] = normalize_ca_row(item, level)

                continue

            admission = normalize_admission(
                row.get("Admission_number")
                or row.get("admission_number")
                or row.get("Admission No")
                or row.get("admission_no")
            )

            if not admission or not subject:
                continue

            subjects_found.add(subject)
            by_student.setdefault(admission, {})
            by_student[admission][subject] = normalize_ca_row(row, level)

    return by_student, sorted(subjects_found)


# =========================================================
# CBT / SUPABASE EXAM RESULTS — DEBUG MODE
# =========================================================

def fetch_supabase_exam_results(session_value, term_value, level, arm):
    if supabase is None:
        print("REPORT DEBUG: Supabase client is None. Check SMS supabase_client.py and .env.")
        return {}, {
            "connected": False,
            "message": "Supabase client is not available.",
            "rows": 0,
            "matched_students": 0,
        }

    class_arm = build_class_arm(level, arm)
    level_upper = normalize_upper(level)

    valid_class_names = {
        normalize_arm(class_arm),
        normalize_arm(class_arm.replace("_", "")),
        normalize_arm(display_class_arm(level, arm)),
    }

    try:
        response = (
            supabase.table("exam_results")
            .select("*")
            .eq("session", normalize_text(session_value))
            .eq("term", normalize_upper(term_value))
            .execute()
        )
    except Exception as error:
        print("REPORT DEBUG: SUPABASE EXAM FETCH ERROR:", error)
        return {}, {
            "connected": False,
            "message": str(error),
            "rows": 0,
            "matched_students": 0,
        }

    rows = response.data or []
    exam_map = {}

    print("============================================")
    print("REPORT DEBUG: SUPABASE FETCH")
    print("REPORT DEBUG: rows fetched:", len(rows))
    print("REPORT DEBUG: session:", normalize_text(session_value))
    print("REPORT DEBUG: term:", normalize_upper(term_value))
    print("REPORT DEBUG: selected level:", level_upper)
    print("REPORT DEBUG: selected class_arm:", class_arm)
    print("REPORT DEBUG: valid_class_names:", valid_class_names)

    for row in rows:
        admission = normalize_admission(row.get("admission_number") or row.get("student_id"))
        subject = normalize_subject_key(row.get("subject"))

        row_class_name = normalize_arm(
            row.get("class_name")
            or row.get("class")
            or row.get("class_arm")
        )

        row_class_category = normalize_upper(
            row.get("class_category")
            or row.get("level")
        )

        valid_class = (
            row_class_name in valid_class_names
            or row_class_category == level_upper
        )

        print("REPORT DEBUG EXAM ROW:", {
            "raw_admission_number": row.get("admission_number"),
            "admission_key": admission,
            "student_id": row.get("student_id"),
            "subject": subject,
            "class_name": row_class_name,
            "class_category": row_class_category,
            "valid_class": valid_class,
            "exam_score": row.get("exam_score"),
            "raw_score_percent": row.get("raw_score_percent"),
            "attempt_no": row.get("attempt_no"),
        })

        if not admission or not subject:
            continue

        if not valid_class:
            continue

        attempt_no = safe_int(row.get("attempt_no"), 1)

        exam_map.setdefault(admission, {})

        old_row = exam_map[admission].get(subject)
        old_attempt = safe_int(old_row.get("attempt_no"), 1) if old_row else 0

        if not old_row or attempt_no >= old_attempt:
            exam_map[admission][subject] = row

    print("REPORT DEBUG: final exam_map students:", list(exam_map.keys()))
    print("REPORT DEBUG: final exam_map:", {
        student_key: list(subjects.keys())
        for student_key, subjects in exam_map.items()
    })
    print("============================================")

    return exam_map, {
        "connected": True,
        "message": f"Supabase CBT records fetched. {len(exam_map)} student(s) matched.",
        "rows": len(rows),
        "matched_students": len(exam_map),
    }


def scale_exam_score(row, level):
    if not row:
        return 0

    raw_percent = safe_float(row.get("raw_score_percent"))
    exam_score = safe_float(exam_score_value(row))

    if is_jss(level):
        if raw_percent:
            return round((raw_percent / 100) * 40, 2)

        if exam_score <= 40:
            return round(exam_score, 2)

        return round((exam_score / 70) * 40, 2)

    if raw_percent:
        return round((raw_percent / 100) * 70, 2)

    if exam_score > 70:
        return round((exam_score / 100) * 70, 2)

    return round(exam_score, 2)


# =========================================================
# REPORT COMPUTATION
# =========================================================

def compute_position(score, all_scores):
    score = safe_float(score)
    higher = len([s for s in all_scores if safe_float(s) > score])
    return higher + 1


def ordinal_position(number):
    number = safe_int(number)

    if 10 <= number % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(number % 10, "th")

    return f"{number}{suffix}" if number else "--"


def build_student_source_status(students, ca_map, exam_map, attendance_map):
    rows = []

    for student in students:
        admission_key = normalize_admission(student.get("admission_number"))

        student_ca = ca_map.get(admission_key, {})
        student_exam = exam_map.get(admission_key, {})

        has_ca = bool(student_ca)
        has_exam = bool(student_exam)
        has_attendance = bool(attendance_map.get(admission_key))

        if has_ca and has_exam:
            status = "ready"
            status_label = "Ready"
        elif not has_exam:
            status = "missing_exam"
            status_label = "No live CBT result"
        elif not has_ca:
            status = "missing_ca"
            status_label = "Missing CA/Test"
        else:
            status = "not_ready"
            status_label = "Not ready"

        rows.append({
            **student,
            "has_ca": has_ca,
            "has_exam": has_exam,
            "has_attendance": has_attendance,
            "exam_subjects": sorted(student_exam.keys()),
            "ca_subjects": sorted(student_ca.keys()),
            "status": status,
            "status_label": status_label,
        })

    return rows

def build_empty_summary(students_count=0):
    return {
        "students": students_count,
        "students_in_class": students_count,
        "generated": 0,
        "subjects": 0,
        "class_average": 0,
        "highest_average": 0,
        "lowest_average": 0,
        "missing_ca": 0,
        "missing_exam": 0,
        "missing_attendance": 0,
    }


def build_source_status(students_found, ca_map, attendance_map, supabase_status):
    return {
        "students": {
            "found": bool(students_found),
            "message": "Students loaded from class CSV." if students_found else "No students loaded.",
        },
        "ca_test": {
            "found": bool(ca_map),
            "students_matched": len(ca_map),
            "message": "CA/Test records found." if ca_map else "No CA/Test records found.",
        },
        "attendance": {
            "found": bool(attendance_map),
            "students_matched": len(attendance_map),
            "message": "Attendance records found." if attendance_map else "No attendance records found.",
        },
        "supabase": supabase_status,
    }


def build_report_payload(session_value, term_value, level, arm, admission_number=None, save_snapshot=False):
    session_value = normalize_text(session_value)
    term_value = normalize_upper(term_value)
    level = normalize_upper(level)
    arm = normalize_arm(arm)

    students = load_students(level, arm)
    full_class_students = load_students(level, arm)

    if admission_number:
        admission_key = normalize_admission(admission_number)
        students = [
            s for s in students
            if normalize_admission(s.get("admission_number")) == admission_key
        ]

    ca_map, subjects = read_ca_records(session_value, term_value, level, arm)
    attendance_map = read_attendance(level, arm, session_value, term_value)
    exam_map, supabase_status = fetch_supabase_exam_results(session_value, term_value, level, arm)

    source_students = build_student_source_status(students, ca_map, exam_map, attendance_map)

    print("REPORT DEBUG: students selected for report:", [
        {
            "name": s.get("full_name"),
            "admission": s.get("admission_number"),
            "admission_key": normalize_admission(s.get("admission_number")),
        }
        for s in students
    ])
    print("REPORT DEBUG: CA map keys:", list(ca_map.keys()))
    print("REPORT DEBUG: Exam map keys:", list(exam_map.keys()))

    if not students:
        return {
            "success": False,
            "error": "No student found for the selected class.",
            "students": [],
            "reports": [],
            "blocked_students": [],
            "summary": build_empty_summary(),
            "source_status": build_source_status(False, ca_map, attendance_map, supabase_status),
        }

    if not exam_map:
        return {
            "success": False,
            "error": "No live Supabase CBT result found for this class, session and term.",
            "students": source_students,
            "reports": [],
            "blocked_students": [
                {
                    "admission_number": s.get("admission_number"),
                    "full_name": s.get("full_name"),
                    "reason": "No live CBT/Supabase exam result found.",
                }
                for s in students
            ],
            "summary": build_empty_summary(students_count=len(students)),
            "source_status": build_source_status(True, ca_map, attendance_map, supabase_status),
        }

    if not ca_map:
        return {
            "success": False,
            "error": "CA/Test scores are required before report sheets can be generated.",
            "students": source_students,
            "reports": [],
            "blocked_students": [
                {
                    "admission_number": s.get("admission_number"),
                    "full_name": s.get("full_name"),
                    "reason": "No CA/Test record found.",
                }
                for s in students
            ],
            "summary": build_empty_summary(students_count=len(students)),
            "source_status": build_source_status(True, ca_map, attendance_map, supabase_status),
        }

    subject_scores = {}
    raw_reports = []
    blocked_students = []

    for student in students:
        admission_key = normalize_admission(student.get("admission_number"))
        student_ca_subjects = ca_map.get(admission_key, {})
        student_exam_subjects = exam_map.get(admission_key, {})

        if not student_exam_subjects:
            print("REPORT BLOCKED: No Supabase CBT found for:", admission_key, student.get("full_name"))
            blocked_students.append({
                "admission_number": student.get("admission_number"),
                "full_name": student.get("full_name"),
                "reason": "No live CBT/Supabase exam result found for this admission number.",
            })
            continue

        if not student_ca_subjects:
            print("REPORT BLOCKED: No CA found for:", admission_key, student.get("full_name"))
            blocked_students.append({
                "admission_number": student.get("admission_number"),
                "full_name": student.get("full_name"),
                "reason": "No CA/Test record found for this admission number.",
            })
            continue

        subject_rows = []

        # IMPORTANT:
        # Only subjects written on Supabase are allowed into the report.
        # We do NOT loop through CA subjects first anymore.
        for subject_key, exam_row in student_exam_subjects.items():
            subject_key = normalize_subject_key(subject_key)
            ca = student_ca_subjects.get(subject_key)

            print("REPORT DEBUG STRICT MATCH:", {
                "student": student.get("full_name"),
                "admission_key": admission_key,
                "subject_key": subject_key,
                "ca_found": bool(ca),
                "exam_found": bool(exam_row),
                "available_ca_subjects": list(student_ca_subjects.keys()),
                "available_exam_subjects": list(student_exam_subjects.keys()),
            })

            if not ca:
                print("REPORT SKIPPED SUBJECT: Supabase subject exists but CA missing:", {
                    "student": student.get("full_name"),
                    "admission_key": admission_key,
                    "subject_key": subject_key,
                })
                continue

            exam_score = scale_exam_score(exam_row, level)

            print("REPORT DEBUG SCORE:", {
                "student": student.get("full_name"),
                "subject": subject_key,
                "exam_found": True,
                "raw_score_percent": exam_row.get("raw_score_percent") if exam_row else None,
                "raw_exam_score": exam_row.get("exam_score") if exam_row else None,
                "scaled_exam_score": exam_score,
            })

            total = round(safe_float(ca.get("ca_total")) + exam_score, 2)
            grade, comment = grade_for_score(total)

            subject_scores.setdefault(subject_key, [])
            subject_scores[subject_key].append(total)

            subject_rows.append({
                "subject": display_subject(subject_key),
                "subject_key": subject_key,
                "ca": ca,
                "exam": exam_score,
                "exam_found": True,
                "exam_raw": exam_row or {},
                "total": total,
                "grade": grade,
                "comment": comment,
                "position": "--",
                "position_text": "--",
                "out_of": 0,
                "lowest": 0,
                "highest": 0,
                "class_average": 0,
            })

        if not subject_rows:
            blocked_students.append({
                "admission_number": student.get("admission_number"),
                "full_name": student.get("full_name"),
                "reason": "CBT result exists, but no matching CA/Test subject was found.",
            })
            continue

        raw_reports.append({
            "student": student,
            "subjects": subject_rows,
        })

    if not raw_reports:
        return {
            "success": False,
            "error": "No report generated. No student has both matching CA/Test and live Supabase CBT result.",
            "students": source_students,
            "reports": [],
            "blocked_students": blocked_students,
            "summary": build_empty_summary(students_count=len(students)),
            "source_status": build_source_status(True, ca_map, attendance_map, supabase_status),
        }

    for report in raw_reports:
        for row in report["subjects"]:
            scores = subject_scores.get(row["subject_key"], [])
            pos = compute_position(row["total"], scores)

            row["position"] = pos
            row["position_text"] = ordinal_position(pos)
            row["out_of"] = len(scores)
            row["lowest"] = round(min(scores), 2) if scores else 0
            row["highest"] = round(max(scores), 2) if scores else 0
            row["class_average"] = round(sum(scores) / len(scores), 2) if scores else 0

    averages = []

    for report in raw_reports:
        totals = [safe_float(row["total"]) for row in report["subjects"]]
        total_score = round(sum(totals), 2)
        average = round(total_score / len(totals), 2) if totals else 0
        final_grade = final_grade_for_average(average)

        report["total_score"] = total_score
        report["final_average"] = average
        report["final_grade"] = final_grade
        report["subject_count"] = len(totals)
        report["teacher_remark"] = teacher_remark(average)
        report["principal_remark"] = principal_remark(average)
        report["missing_exam_count"] = 0
        report["ready"] = report["subject_count"] > 0
        averages.append(average)

    class_average = round(sum(averages) / len(averages), 2) if averages else 0
    highest_average = round(max(averages), 2) if averages else 0
    lowest_average = round(min(averages), 2) if averages else 0
    no_in_class = len(full_class_students)

    overall_positions = [report["final_average"] for report in raw_reports]

    for report in raw_reports:
        admission_key = normalize_admission(report["student"].get("admission_number"))
        att = attendance_map.get(admission_key, {})
        overall_pos = compute_position(report["final_average"], overall_positions)

        report["overall_position"] = overall_pos
        report["overall_position_text"] = ordinal_position(overall_pos)

        report["attendance"] = {
            "days_open": att.get("days_open", 0),
            "present": att.get("present", 0),
            "absent": att.get("absent", 0),
            "late": att.get("late", 0),
            "sick": att.get("sick", 0),
            "excused": att.get("excused", 0),
            "holiday": att.get("holiday", 0),
            "attendance_percentage": att.get("attendance_percentage", 0),
            "found": bool(att),
        }

        report["class_stats"] = {
            "class_average": class_average,
            "highest_average": highest_average,
            "lowest_average": lowest_average,
            "no_in_class": no_in_class,
        }

    payload = {
        "success": True,
        "session": session_value,
        "term": term_value,
        "level": level,
        "arm": arm,
        "class_arm": build_class_arm(level, arm),
        "class_display": display_class_arm(level, arm),
        "generated_at": now_string(),
        "logo_url": "/static/images/emis.png",
        "students": source_students,
        "reports": raw_reports,
        "blocked_students": blocked_students,
        "source_status": build_source_status(True, ca_map, attendance_map, supabase_status),
        "summary": {
            "students": len(students),
            "students_in_class": no_in_class,
            "generated": len(raw_reports),
            "blocked": len(blocked_students),
            "subjects": len(subject_scores.keys()),
            "class_average": class_average,
            "highest_average": highest_average,
            "lowest_average": lowest_average,
            "missing_ca": len([s for s in source_students if not s.get("has_ca")]),
            "missing_exam": len([s for s in source_students if not s.get("has_exam")]),
            "missing_attendance": len([r for r in raw_reports if not r.get("attendance", {}).get("found")]),
            "minimum_required": "CA/Test scores + matching Supabase CBT result",
            "attendance_required": False,
            "exam_required": True,
        }
    }

    if save_snapshot and raw_reports:
        save_generated_reports(payload)

    return payload


# =========================================================
# SAVED REPORT SNAPSHOTS
# =========================================================

def save_generated_reports(payload):
    path = saved_reports_path()
    exists = path.exists()

    fieldnames = [
        "Generated_at",
        "Session",
        "Term",
        "Class_arm",
        "Class_display",
        "Admission_number",
        "Student_name",
        "Average",
        "Grade",
        "Overall_position",
        "Subjects",
        "Missing_exam",
        "Payload",
    ]

    with path.open("a", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)

        if not exists:
            writer.writeheader()

        for report in payload.get("reports", []):
            student = report.get("student", {})

            writer.writerow({
                "Generated_at": payload.get("generated_at"),
                "Session": payload.get("session"),
                "Term": payload.get("term"),
                "Class_arm": payload.get("class_arm"),
                "Class_display": payload.get("class_display"),
                "Admission_number": student.get("admission_number"),
                "Student_name": student.get("full_name"),
                "Average": report.get("final_average"),
                "Grade": report.get("final_grade"),
                "Overall_position": report.get("overall_position_text"),
                "Subjects": report.get("subject_count"),
                "Missing_exam": report.get("missing_exam_count"),
                "Payload": json.dumps(report, ensure_ascii=False),
            })


def read_saved_reports(session_value=None, term_value=None, class_arm=None):
    path = saved_reports_path()

    if not path.exists():
        return []

    rows = []

    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            if session_value and row.get("Session") != session_value:
                continue

            if term_value and normalize_upper(row.get("Term")) != normalize_upper(term_value):
                continue

            if class_arm and normalize_arm(row.get("Class_arm")) != normalize_arm(class_arm):
                continue

            rows.append(row)

    return rows


def overwrite_saved_reports(rows):
    path = saved_reports_path()

    fieldnames = [
        "Generated_at",
        "Session",
        "Term",
        "Class_arm",
        "Class_display",
        "Admission_number",
        "Student_name",
        "Average",
        "Grade",
        "Overall_position",
        "Subjects",
        "Missing_exam",
        "Payload",
    ]

    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


# =========================================================
# EXPORT HELPERS
# =========================================================

def reports_to_summary_rows(reports):
    rows = []

    for report in reports:
        student = report.get("student", {})
        attendance = report.get("attendance", {})

        rows.append({
            "Admission No": student.get("admission_number", ""),
            "Student Name": student.get("full_name", ""),
            "Class": student.get("class_display", ""),
            "Total Score": report.get("total_score", 0),
            "Average": report.get("final_average", 0),
            "Grade": report.get("final_grade", ""),
            "Overall Position": report.get("overall_position_text", ""),
            "Subjects": report.get("subject_count", 0),
            "Days Open": attendance.get("days_open", 0),
            "Days Present": attendance.get("present", 0),
            "Attendance %": attendance.get("attendance_percentage", 0),
            "Missing CBT": report.get("missing_exam_count", 0),
        })

    return rows


def csv_response(rows, filename):
    output = io.StringIO()

    if rows:
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    else:
        output.write("No records found\n")

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# =========================================================
# ROUTES
# =========================================================

@reports_bp.route("/")
def report_sheet():
    return render_template("reports/report_sheet.html")


@reports_bp.route("/api/config")
def report_config_api():
    return jsonify({
        "success": True,
        "report_settings": read_report_settings(),
        "levels": LEVELS,
        "jss_arms": JSS_ARMS,
        "ss_arms": SS_ARMS,
        "grading": [
            {"grade": g, "min": low, "max": high, "comment": comment}
            for g, low, high, comment in GRADE_SCALE
        ],
        "structures": {
            "JSS": {
                "columns": ["CA1 /10", "CA2 /10", "TEST1 /20", "TEST2 /20", "EXAM /40"],
                "ca_required": True,
                "attendance_required": False,
                "exam_required": False,
                "total": 100,
            },
            "SS": {
                "columns": ["1ST ASS. /5", "2ND ASS. /5", "TEST /20", "EXAM /70"],
                "ca_required": True,
                "attendance_required": False,
                "exam_required": False,
                "total": 100,
            }
        }
    })


@reports_bp.route("/api/students")
def report_students_api():
    level = request.args.get("level", "").strip()
    arm = request.args.get("arm", "").strip()

    if not level or not arm:
        return jsonify({
            "success": False,
            "message": "Class level and class arm are required.",
            "students": [],
            "count": 0,
        }), 400

    students = load_students(level, arm)

    return jsonify({
        "success": True,
        "message": f"{len(students)} student(s) loaded.",
        "level": normalize_upper(level),
        "arm": normalize_arm(arm),
        "class_arm": build_class_arm(level, arm),
        "class_display": display_class_arm(level, arm),
        "students": students,
        "count": len(students),
    })


@reports_bp.route("/api/source-status")
def report_source_status_api():
    session_value = request.args.get("session", "2025/2026").strip()
    term_value = request.args.get("term", "FIRST TERM").strip()
    level = request.args.get("level", "").strip()
    arm = request.args.get("arm", "").strip()

    if not level or not arm:
        return jsonify({
            "success": False,
            "message": "Select class level and arm.",
        }), 400

    students = load_students(level, arm)
    ca_map, subjects = read_ca_records(session_value, term_value, level, arm)
    attendance_map = read_attendance(level, arm, session_value, term_value)
    exam_map, supabase_status = fetch_supabase_exam_results(session_value, term_value, level, arm)

    source_students = build_student_source_status(students, ca_map, exam_map, attendance_map)

    return jsonify({
        "success": True,
        "students": source_students,
        "subjects": subjects,
        "source_status": build_source_status(bool(students), ca_map, attendance_map, supabase_status),
        "summary": {
            "students": len(students),
            "ca_students": len(ca_map),
            "exam_students": len(exam_map),
            "attendance_students": len(attendance_map),
            "subjects": len(subjects),
            "missing_ca": len([s for s in source_students if not s["has_ca"]]),
            "missing_exam": len([s for s in source_students if not s["has_exam"]]),
            "missing_attendance": len([s for s in source_students if not s["has_attendance"]]),
        }
    })


@reports_bp.route("/api/preview")
def report_preview_api():
    session_value = request.args.get("session", "2025/2026").strip()
    term_value = request.args.get("term", "FIRST TERM").strip()
    level = request.args.get("level", "").strip()
    arm = request.args.get("arm", "").strip()
    admission_number = request.args.get("admission_number", "").strip()

    if not level or not arm:
        return jsonify({"success": False, "error": "Select class level and arm."}), 400

    payload = build_report_payload(
        session_value=session_value,
        term_value=term_value,
        level=level,
        arm=arm,
        admission_number=admission_number or None,
        save_snapshot=False,
    )

    return jsonify(payload), 200 if payload.get("success") else 400


@reports_bp.route("/api/generate", methods=["POST"])
def report_generate_api():
    data = request.get_json(silent=True) or {}

    payload = build_report_payload(
        session_value=data.get("session", "2025/2026"),
        term_value=data.get("term", "FIRST TERM"),
        level=data.get("level", ""),
        arm=data.get("arm", ""),
        admission_number=normalize_text(data.get("admission_number")) or None,
        save_snapshot=True,
    )

    return jsonify(payload), 200 if payload.get("success") else 400


@reports_bp.route("/api/generate-student", methods=["POST"])
def report_generate_student_api():
    data = request.get_json(silent=True) or {}

    session_value = data.get("session", "2025/2026")
    term_value = data.get("term", "FIRST TERM")
    level = data.get("level", "")
    arm = data.get("arm", "")
    admission_number = normalize_text(data.get("admission_number"))

    if not level or not arm or not admission_number:
        return jsonify({
            "success": False,
            "error": "Session, term, class and admission number are required.",
        }), 400

    payload = build_report_payload(
        session_value=session_value,
        term_value=term_value,
        level=level,
        arm=arm,
        admission_number=admission_number,
        save_snapshot=True,
    )

    return jsonify(payload), 200 if payload.get("success") else 400


@reports_bp.route("/api/saved")
def report_saved_api():
    session_value = request.args.get("session", "").strip()
    term_value = request.args.get("term", "").strip()
    level = request.args.get("level", "").strip()
    arm = request.args.get("arm", "").strip()

    class_arm = build_class_arm(level, arm) if level and arm else ""

    rows = read_saved_reports(
        session_value=session_value or None,
        term_value=term_value or None,
        class_arm=class_arm or None,
    )

    return jsonify({"success": True, "records": rows, "count": len(rows)})


@reports_bp.route("/api/delete-saved", methods=["POST", "DELETE"])
def report_delete_saved_api():
    data = request.get_json(silent=True) or {}

    session_value = normalize_text(data.get("session"))
    term_value = normalize_upper(data.get("term"))
    class_arm = normalize_arm(data.get("class_arm"))
    admission_number = normalize_text(data.get("admission_number"))

    if not session_value or not term_value or not class_arm or not admission_number:
        return jsonify({
            "success": False,
            "message": "Session, term, class arm and admission number are required.",
        }), 400

    rows = read_saved_reports()
    remaining = []

    for row in rows:
        match = (
            row.get("Session") == session_value
            and normalize_upper(row.get("Term")) == term_value
            and normalize_arm(row.get("Class_arm")) == class_arm
            and normalize_admission(row.get("Admission_number")) == normalize_admission(admission_number)
        )

        if not match:
            remaining.append(row)

    deleted_count = len(rows) - len(remaining)
    overwrite_saved_reports(remaining)

    return jsonify({
        "success": True,
        "message": "Saved report deleted successfully.",
        "deleted_count": deleted_count,
    })


@reports_bp.route("/api/export/csv")
def report_export_csv_api():
    session_value = request.args.get("session", "2025/2026").strip()
    term_value = request.args.get("term", "FIRST TERM").strip()
    level = request.args.get("level", "").strip()
    arm = request.args.get("arm", "").strip()

    if not level or not arm:
        return csv_response([], "report_summary.csv")

    payload = build_report_payload(session_value, term_value, level, arm)
    rows = reports_to_summary_rows(payload.get("reports", []))

    filename = f"report_summary_{session_value.replace('/', '-')}_{term_value.replace(' ', '-')}_{build_class_arm(level, arm)}.csv"
    return csv_response(rows, filename)


@reports_bp.route("/api/export/excel")
def report_export_excel_api():
    session_value = request.args.get("session", "2025/2026").strip()
    term_value = request.args.get("term", "FIRST TERM").strip()
    level = request.args.get("level", "").strip()
    arm = request.args.get("arm", "").strip()

    if not level or not arm:
        return csv_response([], "report_excel_export.csv")

    payload = build_report_payload(session_value, term_value, level, arm)
    rows = reports_to_summary_rows(payload.get("reports", []))

    filename = f"report_excel_export_{session_value.replace('/', '-')}_{term_value.replace(' ', '-')}_{build_class_arm(level, arm)}.csv"
    return csv_response(rows, filename)



@reports_bp.route("/api/settings/next-term", methods=["GET", "POST"])
def report_next_term_settings_api():
    settings = read_report_settings()

    if request.method == "GET":
        return jsonify({
            "success": True,
            "settings": settings,
            "report_next_term": settings.get("report_next_term", ""),
        })

    data = request.get_json(silent=True) or {}
    next_term = valid_date_string(data.get("report_next_term"))

    if not next_term:
        return jsonify({
            "success": False,
            "message": "Please provide a valid next term date.",
        }), 400

    settings["report_next_term"] = next_term
    settings["updated_at"] = now_string()

    save_report_settings(settings)

    return jsonify({
        "success": True,
        "message": "Default next term date saved successfully.",
        "settings": settings,
        "report_next_term": next_term,
    })



@reports_bp.route("/api/health")
def report_health_api():
    return jsonify({
        "success": True,
        "module": "reports",
        "students_folder": str(data_dir()),
        "reports_folder": str(reports_data_dir()),
        "supabase_available": supabase is not None,
        "timestamp": now_string(),
    })