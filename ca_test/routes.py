import csv
import os
from flask import Blueprint, current_app, jsonify, render_template, request
from datetime import datetime

ca_tests_bp = Blueprint("ca_test", __name__)

LEVELS = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"]

STUDENT_FILES = {
    "JSS1": "JSS1_Students.csv",
    "JSS2": "JSS2_Students.csv",
    "JSS3": "JSS3_Students.csv",
    "SS1": "SS1_Students.csv",
    "SS2": "SS2_Students.csv",
    "SS3": "SS3_Students.csv",
}


def normalize_arm(value):
    return (value or "").strip().upper().replace(" ", "_")


def get_level_from_arm(class_arm):
    class_arm = normalize_arm(class_arm)
    for level in LEVELS:
        if class_arm.startswith(level):
            return level
    return ""


def build_full_name(row):
    return " ".join([
        (row.get("Last_name") or "").strip(),
        (row.get("First_name") or "").strip(),
        (row.get("Other_names") or "").strip(),
    ]).strip()


def student_file_path(level):
    filename = STUDENT_FILES.get(level)
    if not filename:
        return None
    return os.path.join(current_app.root_path, "static", "data", filename)


def load_students_for_class(class_arm):
    class_arm = normalize_arm(class_arm)
    level = get_level_from_arm(class_arm)

    if not level:
        return []

    path = student_file_path(level)

    if not path or not os.path.exists(path):
        return []

    students = []

    with open(path, "r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            row_class = normalize_arm(row.get("Class"))

            if row_class != class_arm:
                continue

            admission = (row.get("Admission_number") or "").strip()
            if not admission:
                continue

            students.append({
                "admission_number": admission,
                "last_name": (row.get("Last_name") or "").strip(),
                "first_name": (row.get("First_name") or "").strip(),
                "other_names": (row.get("Other_names") or "").strip(),
                "full_name": build_full_name(row),
                "phone": (row.get("Phone") or "").strip(),
                "class_arm": row_class,
                "class_category": (row.get("Class_category") or level).strip().upper(),
            })

    return students


@ca_tests_bp.route("/")
def ca_entry():
    return render_template("ca_test/ca_entry.html")


@ca_tests_bp.route("/api/students")
def ca_students_api():
    class_arm = normalize_arm(request.args.get("class_arm"))

    if not class_arm:
        return jsonify({
            "ok": False,
            "message": "Class arm is required.",
            "students": [],
        }), 400

    students = load_students_for_class(class_arm)

    return jsonify({
        "ok": True,
        "class_arm": class_arm,
        "class_category": get_level_from_arm(class_arm),
        "students": students,
        "count": len(students),
    })



# =========================================================
# CA TEST CSV DATABASE HELPERS
# =========================================================

CA_DATA_FOLDER = os.path.join("static", "data", "ca_tests")
CA_RECORDS_FILE = "ca_test_records.csv"


def ca_data_dir():
    path = os.path.join(current_app.root_path, CA_DATA_FOLDER)
    os.makedirs(path, exist_ok=True)
    return path


def ca_records_path():
    return os.path.join(ca_data_dir(), CA_RECORDS_FILE)


def safe_text(value):
    return str(value or "").strip()


def normalize_subject(value):
    return safe_text(value).upper()


def normalize_session(value):
    return safe_text(value)


def normalize_term(value):
    return safe_text(value).upper()


def get_ca_structure(class_arm):
    level = get_level_from_arm(class_arm)

    if level.startswith("JSS"):
        return {
            "mode": "JSS",
            "columns": ["ca1", "ca2", "test1", "test2", "exam"],
            "max_scores": {
                "ca1": 10,
                "ca2": 10,
                "test1": 20,
                "test2": 20,
                "exam": 40,
            },
        }

    return {
        "mode": "SS",
        "columns": ["ass1", "ass2", "test", "exam"],
        "max_scores": {
            "ass1": 5,
            "ass2": 5,
            "test": 20,
            "exam": 70,
        },
    }


def read_ca_records():
    path = ca_records_path()

    if not os.path.exists(path):
        return []

    with open(path, "r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def write_ca_records(rows):
    path = ca_records_path()

    fieldnames = [
        "Session",
        "Term",
        "Class_arm",
        "Class_category",
        "Subject",
        "Admission_number",
        "Student_name",
        "CA1",
        "CA2",
        "TEST1",
        "TEST2",
        "ASS1",
        "ASS2",
        "TEST",
        "EXAM",
        "TOTAL",
        "Mode",
        "Saved_at",
    ]

    with open(path, "w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def score_to_float(value):
    try:
        if value in ["", None]:
            return 0
        return float(value)
    except (TypeError, ValueError):
        return 0


def get_payload_scores(item):
    """
    Supports both:
    scores: {ca1: 5, ca2: 6}
    and direct keys: ca1: 5, ca2: 6
    """
    scores = item.get("scores") or {}

    return {
        "ca1": score_to_float(scores.get("ca1", item.get("ca1"))),
        "ca2": score_to_float(scores.get("ca2", item.get("ca2"))),
        "test1": score_to_float(scores.get("test1", item.get("test1"))),
        "test2": score_to_float(scores.get("test2", item.get("test2"))),
        "ass1": score_to_float(scores.get("ass1", item.get("ass1"))),
        "ass2": score_to_float(scores.get("ass2", item.get("ass2"))),
        "test": score_to_float(scores.get("test", item.get("test"))),
        "exam": score_to_float(scores.get("exam", item.get("exam"))),
    }


def same_record(row, session, term, class_arm, subject):
    return (
        normalize_session(row.get("Session")) == session
        and normalize_term(row.get("Term")) == term
        and normalize_arm(row.get("Class_arm")) == class_arm
        and normalize_subject(row.get("Subject")) == subject
    )


# =========================================================
# SAVE CA / TEST SCORES
# =========================================================

@ca_tests_bp.route("/api/save", methods=["POST"])
def ca_save_api():
    data = request.get_json(silent=True) or {}

    session = normalize_session(data.get("session"))
    term = normalize_term(data.get("term"))
    class_arm = normalize_arm(data.get("class_arm"))
    subject = normalize_subject(data.get("subject"))

    students = data.get("students") or data.get("records") or []

    if not session or not term or not class_arm or not subject:
        return jsonify({
            "ok": False,
            "message": "Session, term, class arm and subject are required.",
        }), 400

    if not students:
        return jsonify({
            "ok": False,
            "message": "No student score records received.",
        }), 400

    level = get_level_from_arm(class_arm)
    structure = get_ca_structure(class_arm)
    mode = structure["mode"]
    saved_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    existing_rows = read_ca_records()

    # Remove old matching subject records before saving updated ones
    remaining_rows = [
        row for row in existing_rows
        if not same_record(row, session, term, class_arm, subject)
    ]

    new_rows = []

    for item in students:
        admission = safe_text(
            item.get("admission_number")
            or item.get("Admission_number")
            or item.get("admission")
        )

        if not admission:
            continue

        student_name = safe_text(
            item.get("student_name")
            or item.get("full_name")
            or item.get("name")
        )

        scores = get_payload_scores(item)

        if mode == "JSS":
            total = (
                scores["ca1"]
                + scores["ca2"]
                + scores["test1"]
                + scores["test2"]
                + scores["exam"]
            )
        else:
            total = (
                scores["ass1"]
                + scores["ass2"]
                + scores["test"]
                + scores["exam"]
            )

        new_rows.append({
            "Session": session,
            "Term": term,
            "Class_arm": class_arm,
            "Class_category": level,
            "Subject": subject,
            "Admission_number": admission,
            "Student_name": student_name,
            "CA1": scores["ca1"],
            "CA2": scores["ca2"],
            "TEST1": scores["test1"],
            "TEST2": scores["test2"],
            "ASS1": scores["ass1"],
            "ASS2": scores["ass2"],
            "TEST": scores["test"],
            "EXAM": scores["exam"],
            "TOTAL": total,
            "Mode": mode,
            "Saved_at": saved_at,
        })

    write_ca_records(remaining_rows + new_rows)

    return jsonify({
        "ok": True,
        "message": "CA/Test scores saved successfully.",
        "saved_count": len(new_rows),
        "session": session,
        "term": term,
        "class_arm": class_arm,
        "subject": subject,
        "mode": mode,
    })


# =========================================================
# LOAD / VIEW SAVED CA RECORDS
# =========================================================

@ca_tests_bp.route("/api/records")
def ca_records_api():
    session = normalize_session(request.args.get("session"))
    term = normalize_term(request.args.get("term"))
    class_arm = normalize_arm(request.args.get("class_arm"))
    subject = normalize_subject(request.args.get("subject"))

    rows = read_ca_records()

    filtered = []

    for row in rows:
        if session and normalize_session(row.get("Session")) != session:
            continue

        if term and normalize_term(row.get("Term")) != term:
            continue

        if class_arm and normalize_arm(row.get("Class_arm")) != class_arm:
            continue

        if subject and normalize_subject(row.get("Subject")) != subject:
            continue

        filtered.append(row)

    grouped = {}

    for row in filtered:
        key = (
            row.get("Session"),
            row.get("Term"),
            row.get("Class_arm"),
            row.get("Subject"),
        )

        if key not in grouped:
            grouped[key] = {
                "session": row.get("Session"),
                "term": row.get("Term"),
                "class_arm": row.get("Class_arm"),
                "class_category": row.get("Class_category"),
                "subject": row.get("Subject"),
                "students_count": 0,
                "saved_at": row.get("Saved_at"),
                "records": [],
            }

        grouped[key]["students_count"] += 1
        grouped[key]["saved_at"] = row.get("Saved_at") or grouped[key]["saved_at"]
        grouped[key]["records"].append(row)

    return jsonify({
        "ok": True,
        "records": list(grouped.values()),
        "raw_records": filtered,
        "count": len(filtered),
    })


# =========================================================
# DELETE SUBJECT CA RECORDS
# =========================================================

@ca_tests_bp.route("/api/delete", methods=["POST", "DELETE"])
def ca_delete_api():
    data = request.get_json(silent=True) or {}

    session = normalize_session(data.get("session"))
    term = normalize_term(data.get("term"))
    class_arm = normalize_arm(data.get("class_arm"))
    subject = normalize_subject(data.get("subject"))

    if not session or not term or not class_arm or not subject:
        return jsonify({
            "ok": False,
            "message": "Session, term, class arm and subject are required before deleting.",
        }), 400

    rows = read_ca_records()

    remaining_rows = [
        row for row in rows
        if not same_record(row, session, term, class_arm, subject)
    ]

    deleted_count = len(rows) - len(remaining_rows)

    write_ca_records(remaining_rows)

    return jsonify({
        "ok": True,
        "message": "Selected CA/Test records deleted successfully.",
        "deleted_count": deleted_count,
    })