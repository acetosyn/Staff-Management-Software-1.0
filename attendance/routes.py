import csv
import os
from datetime import datetime, date
from collections import Counter, defaultdict
from flask import Blueprint, current_app, jsonify, render_template, request

attendance_bp = Blueprint("attendance", __name__)

LEVELS = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"]

CLASS_ARMS = {
    "JSS1": ["JSS1A", "JSS1B", "JSS1C"],
    "JSS2": ["JSS2A", "JSS2B", "JSS2C"],
    "JSS3": ["JSS3A", "JSS3B", "JSS3C"],

    "SS1": ["SS1_GOLD", "SS1_SILVER", "SS1_DIAMOND"],
    "SS2": ["SS2_GOLD", "SS2_SILVER", "SS2_DIAMOND"],
    "SS3": ["SS3_GOLD", "SS3_SILVER", "SS3_DIAMOND"],
}

STUDENT_FILES = {
    "JSS1": "JSS1_Students.csv",
    "JSS2": "JSS2_Students.csv",
    "JSS3": "JSS3_Students.csv",
    "SS1": "SS1_Students.csv",
    "SS2": "SS2_Students.csv",
    "SS3": "SS3_Students.csv",
}

ATTENDANCE_FIELDS = [
    "Date",
    "Day",
    "Month",
    "Week",
    "Time",
    "Session",
    "Term",
    "Class",
    "Class_category",
    "Admission_number",
    "Last_name",
    "First_name",
    "Other_names",
    "Full_name",
    "Status",
    "Reason",
    "Note",
    "Saved_at",
    "Record_type",
]


# ============================================================
# PATH HELPERS
# ============================================================

def data_dir():
    return os.path.join(current_app.root_path, "static", "data")


def attendance_dir():
    folder = os.path.join(data_dir(), "attendance")
    os.makedirs(folder, exist_ok=True)
    return folder


def student_file_path(level):
    filename = STUDENT_FILES.get(level)

    if not filename:
        return None

    return os.path.join(data_dir(), filename)


def attendance_file_path(class_arm):
    safe_class = normalize_arm(class_arm).replace("/", "_")
    return os.path.join(attendance_dir(), f"attendance_{safe_class}.csv")


# ============================================================
# NORMALIZERS / FORMATTERS
# ============================================================

def normalize_arm(value):
    return (value or "").strip().upper().replace(" ", "_")


def normalize_status(value):
    status = (value or "UNMARKED").strip().upper()

    allowed = {
        "PRESENT",
        "ABSENT",
        "LATE",
        "SICK",
        "EXCUSED",
        "HOLIDAY",
        "UNMARKED",
    }

    return status if status in allowed else "UNMARKED"


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


def safe_parse_date(value):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except Exception:
        return date.today()


def get_date_meta(attendance_date):
    parsed = safe_parse_date(attendance_date)
    week_no = ((parsed.day - 1) // 7) + 1

    return {
        "Date": parsed.isoformat(),
        "Day": parsed.strftime("%A"),
        "Month": parsed.strftime("%B"),
        "Week": f"Week {week_no}",
    }


def now_meta():
    now = datetime.now()

    return {
        "Saved_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        "Time": now.strftime("%I:%M %p"),
    }


def row_date_in_range(row, start_date=None, end_date=None):
    row_date = row.get("Date", "")

    if start_date and row_date < start_date:
        return False

    if end_date and row_date > end_date:
        return False

    return True


def get_row_search_text(row):
    return " ".join([
        row.get("Date", ""),
        row.get("Day", ""),
        row.get("Month", ""),
        row.get("Week", ""),
        row.get("Session", ""),
        row.get("Term", ""),
        row.get("Class", ""),
        row.get("Class_category", ""),
        row.get("Admission_number", ""),
        row.get("Last_name", ""),
        row.get("First_name", ""),
        row.get("Other_names", ""),
        row.get("Full_name", ""),
        row.get("Status", ""),
        row.get("Reason", ""),
        row.get("Note", ""),
        row.get("Record_type", ""),
    ]).lower()


# ============================================================
# STUDENTS
# ============================================================

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

            full_name = build_full_name(row)

            students.append({
                "admission_number": admission,
                "last_name": (row.get("Last_name") or "").strip(),
                "first_name": (row.get("First_name") or "").strip(),
                "other_names": (row.get("Other_names") or "").strip(),
                "phone": (row.get("Phone") or "").strip(),
                "class_arm": row_class,
                "class_category": (row.get("Class_category") or level).strip().upper(),
                "full_name": full_name,
            })

    return students


# ============================================================
# CSV READ / WRITE
# ============================================================

def upgrade_attendance_row(row):
    attendance_date = row.get("Date") or date.today().isoformat()
    date_meta = get_date_meta(attendance_date)

    upgraded = {
        field: row.get(field, "")
        for field in ATTENDANCE_FIELDS
    }

    upgraded["Date"] = row.get("Date") or date_meta["Date"]
    upgraded["Day"] = row.get("Day") or date_meta["Day"]
    upgraded["Month"] = row.get("Month") or date_meta["Month"]
    upgraded["Week"] = row.get("Week") or date_meta["Week"]
    upgraded["Time"] = row.get("Time") or ""

    upgraded["Class"] = normalize_arm(row.get("Class"))
    upgraded["Class_category"] = (
        row.get("Class_category") or get_level_from_arm(upgraded["Class"])
    ).strip().upper()

    upgraded["Status"] = normalize_status(row.get("Status"))
    upgraded["Record_type"] = row.get("Record_type") or "DAILY"

    if not upgraded["Full_name"]:
        upgraded["Full_name"] = build_full_name(row)

    return upgraded


def read_attendance_file(class_arm):
    path = attendance_file_path(class_arm)

    if not os.path.exists(path):
        return []

    with open(path, "r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        return [upgrade_attendance_row(row) for row in reader]


def write_attendance_file(class_arm, rows):
    path = attendance_file_path(class_arm)

    rows = [upgrade_attendance_row(row) for row in rows]

    rows.sort(key=lambda row: (
        row.get("Date", ""),
        row.get("Admission_number", ""),
        row.get("Record_type", ""),
    ))

    with open(path, "w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=ATTENDANCE_FIELDS)
        writer.writeheader()

        for row in rows:
            writer.writerow({
                field: row.get(field, "")
                for field in ATTENDANCE_FIELDS
            })


def get_attendance_for_date(class_arm, attendance_date):
    return [
        row for row in read_attendance_file(class_arm)
        if row.get("Date") == attendance_date
    ]


# ============================================================
# SUMMARY BUILDERS
# ============================================================

def build_summary_from_rows(rows):
    counter = Counter(row.get("Status", "UNMARKED") for row in rows)

    school_open_dates = sorted(set(
        row.get("Date")
        for row in rows
        if row.get("Date") and row.get("Record_type") != "HOLIDAY"
    ))

    holiday_dates = sorted(set(
        row.get("Date")
        for row in rows
        if row.get("Date") and row.get("Record_type") == "HOLIDAY"
    ))

    return {
        "total_records": len(rows),
        "present": counter.get("PRESENT", 0),
        "absent": counter.get("ABSENT", 0),
        "late": counter.get("LATE", 0),
        "sick": counter.get("SICK", 0),
        "excused": counter.get("EXCUSED", 0),
        "unmarked": counter.get("UNMARKED", 0),
        "holiday": counter.get("HOLIDAY", 0),
        "days_school_open": len(school_open_dates),
        "holiday_days": len(holiday_dates),
        "unique_dates": len(set(row.get("Date") for row in rows if row.get("Date"))),
    }


def build_summary(class_arm, attendance_date=None):
    rows = read_attendance_file(class_arm)

    if attendance_date:
        rows = [row for row in rows if row.get("Date") == attendance_date]

    return build_summary_from_rows(rows)


def build_student_summary(rows):
    counter = Counter(row.get("Status", "UNMARKED") for row in rows)

    school_open_dates = sorted(set(
        row.get("Date")
        for row in rows
        if row.get("Date") and row.get("Record_type") != "HOLIDAY"
    ))

    days_open = len(school_open_dates)

    days_present = counter.get("PRESENT", 0)
    days_late = counter.get("LATE", 0)
    days_excused = counter.get("EXCUSED", 0)
    days_sick = counter.get("SICK", 0)
    days_absent_raw = counter.get("ABSENT", 0)
    days_unmarked = counter.get("UNMARKED", 0)

    # Report-card logic:
    # Present score counts PRESENT + LATE + EXCUSED.
    # Absent count includes ABSENT + SICK + UNMARKED.
    attendance_score = days_present + days_late + days_excused
    days_absent = days_absent_raw + days_sick + days_unmarked

    percentage = 0
    if days_open:
        percentage = round((attendance_score / days_open) * 100, 1)

    return {
        "days_school_open": days_open,
        "days_present": days_present,
        "days_absent": days_absent,
        "days_absent_raw": days_absent_raw,
        "days_late": days_late,
        "days_sick": days_sick,
        "days_excused": days_excused,
        "days_unmarked": days_unmarked,
        "attendance_score": attendance_score,
        "attendance_percentage": percentage,
        "total_records": len(rows),
    }


def build_daily_breakdown(rows):
    grouped = defaultdict(list)

    for row in rows:
        grouped[row.get("Date", "")].append(row)

    breakdown = []

    for attendance_date, day_rows in sorted(grouped.items()):
        if not attendance_date:
            continue

        summary = build_summary_from_rows(day_rows)

        breakdown.append({
            "date": attendance_date,
            "day": day_rows[0].get("Day", ""),
            "month": day_rows[0].get("Month", ""),
            "week": day_rows[0].get("Week", ""),
            "summary": summary,
        })

    return breakdown


def build_student_breakdown(rows):
    grouped = defaultdict(list)

    for row in rows:
        admission = row.get("Admission_number", "")
        if admission:
            grouped[admission].append(row)

    students = []

    for admission, student_rows in grouped.items():
        first = student_rows[0]

        students.append({
            "admission_number": admission,
            "last_name": first.get("Last_name", ""),
            "first_name": first.get("First_name", ""),
            "other_names": first.get("Other_names", ""),
            "full_name": first.get("Full_name") or build_full_name(first),
            "class_arm": first.get("Class", ""),
            "class_category": first.get("Class_category", ""),
            "summary": build_student_summary(student_rows),
        })

    students.sort(key=lambda item: item.get("full_name", ""))

    return students


# ============================================================
# PAGE
# ============================================================

@attendance_bp.route("/")
def attendance_mark():
    today = date.today()

    sessions = [
        "2025/2026",
        "2026/2027",
        "2027/2028",
    ]

    return render_template(
        "attendance/attendance_mark.html",
        today_iso=today.isoformat(),
        today_label=today.strftime("%B %d, %Y"),
        today_day=today.strftime("%A"),
        sessions=sessions,
        active_session="2025/2026",
        active_term="FIRST TERM",
        class_levels=LEVELS,
        class_arms=CLASS_ARMS,
    )


# ============================================================
# API: LOAD STUDENTS FOR DAILY MARKING
# ============================================================

@attendance_bp.route("/api/students")
def attendance_students_api():
    class_arm = normalize_arm(request.args.get("class_arm"))
    attendance_date = request.args.get("date") or date.today().isoformat()

    if not class_arm:
        return jsonify({
            "ok": False,
            "message": "Class arm is required.",
            "students": [],
        }), 400

    students = load_students_for_class(class_arm)
    existing_records = get_attendance_for_date(class_arm, attendance_date)

    existing_map = {
        row.get("Admission_number"): row
        for row in existing_records
        if row.get("Admission_number")
    }

    for student in students:
        saved = existing_map.get(student["admission_number"])

        student["status"] = saved.get("Status", "") if saved else ""
        student["reason"] = saved.get("Reason", "") if saved else ""
        student["note"] = saved.get("Note", "") if saved else ""
        student["saved_at"] = saved.get("Saved_at", "") if saved else ""

    return jsonify({
        "ok": True,
        "class_arm": class_arm,
        "class_category": get_level_from_arm(class_arm),
        "date": attendance_date,
        "students": students,
        "existing_count": len(existing_records),
        "summary": build_summary(class_arm, attendance_date),
    })


# ============================================================
# API: SAVE DAILY ATTENDANCE
# One CSV per class arm.
# Same class + same date can be replaced with overwrite=True.
# Different dates are appended inside same CSV.
# ============================================================

@attendance_bp.route("/api/save", methods=["POST"])
def save_attendance_api():
    payload = request.get_json(silent=True) or {}

    class_arm = normalize_arm(payload.get("class_arm"))
    class_category = (payload.get("class_category") or get_level_from_arm(class_arm)).strip().upper()
    attendance_date = payload.get("date") or date.today().isoformat()
    session = payload.get("session") or ""
    term = payload.get("term") or ""
    records = payload.get("records") or []
    overwrite = bool(payload.get("overwrite"))

    if not class_arm:
        return jsonify({"ok": False, "message": "Class arm is required."}), 400

    if not records:
        return jsonify({"ok": False, "message": "No attendance records provided."}), 400

    existing_rows = read_attendance_file(class_arm)

    same_date_exists = any(
        row.get("Date") == attendance_date
        for row in existing_rows
    )

    if same_date_exists and not overwrite:
        return jsonify({
            "ok": False,
            "message": "Attendance already exists for this class and date. Enable overwrite to replace it.",
        }), 409

    if overwrite:
        existing_rows = [
            row for row in existing_rows
            if row.get("Date") != attendance_date
        ]

    date_meta = get_date_meta(attendance_date)
    time_meta = now_meta()

    new_rows = []

    for record in records:
        last_name = record.get("last_name", "")
        first_name = record.get("first_name", "")
        other_names = record.get("other_names", "")

        full_name = " ".join([
            str(last_name).strip(),
            str(first_name).strip(),
            str(other_names).strip(),
        ]).strip()

        new_rows.append({
            "Date": date_meta["Date"],
            "Day": date_meta["Day"],
            "Month": date_meta["Month"],
            "Week": date_meta["Week"],
            "Time": time_meta["Time"],
            "Session": session,
            "Term": term,
            "Class": class_arm,
            "Class_category": class_category,
            "Admission_number": record.get("admission_number", ""),
            "Last_name": last_name,
            "First_name": first_name,
            "Other_names": other_names,
            "Full_name": full_name,
            "Status": normalize_status(record.get("status")),
            "Reason": record.get("reason", ""),
            "Note": record.get("note", ""),
            "Saved_at": time_meta["Saved_at"],
            "Record_type": "DAILY",
        })

    final_rows = existing_rows + new_rows
    write_attendance_file(class_arm, final_rows)

    return jsonify({
        "ok": True,
        "message": "Attendance saved successfully.",
        "saved_count": len(new_rows),
        "summary": build_summary(class_arm, attendance_date),
        "class_summary": build_summary(class_arm),
        "saved_at": time_meta["Saved_at"],
    })


# ============================================================
# API: MARK HOLIDAY
# ============================================================

@attendance_bp.route("/api/holiday", methods=["POST"])
def mark_holiday_api():
    payload = request.get_json(silent=True) or {}

    class_arm = normalize_arm(payload.get("class_arm"))
    class_category = (payload.get("class_category") or get_level_from_arm(class_arm)).strip().upper()
    attendance_date = payload.get("date") or date.today().isoformat()
    session = payload.get("session") or ""
    term = payload.get("term") or ""
    reason = payload.get("reason") or "Public holiday"
    overwrite = bool(payload.get("overwrite"))

    if not class_arm:
        return jsonify({"ok": False, "message": "Class arm is required."}), 400

    existing_rows = read_attendance_file(class_arm)

    same_date_exists = any(
        row.get("Date") == attendance_date
        for row in existing_rows
    )

    if same_date_exists and not overwrite:
        return jsonify({
            "ok": False,
            "message": "A record already exists for this date. Enable overwrite to replace it.",
        }), 409

    if overwrite:
        existing_rows = [
            row for row in existing_rows
            if row.get("Date") != attendance_date
        ]

    date_meta = get_date_meta(attendance_date)
    time_meta = now_meta()

    holiday_row = {
        "Date": date_meta["Date"],
        "Day": date_meta["Day"],
        "Month": date_meta["Month"],
        "Week": date_meta["Week"],
        "Time": time_meta["Time"],
        "Session": session,
        "Term": term,
        "Class": class_arm,
        "Class_category": class_category,
        "Admission_number": "",
        "Last_name": "",
        "First_name": "",
        "Other_names": "",
        "Full_name": "",
        "Status": "HOLIDAY",
        "Reason": reason,
        "Note": "School not in session",
        "Saved_at": time_meta["Saved_at"],
        "Record_type": "HOLIDAY",
    }

    final_rows = existing_rows + [holiday_row]
    write_attendance_file(class_arm, final_rows)

    return jsonify({
        "ok": True,
        "message": "Public holiday saved successfully.",
        "summary": build_summary(class_arm, attendance_date),
        "class_summary": build_summary(class_arm),
        "saved_at": time_meta["Saved_at"],
    })


# ============================================================
# API: BASIC SUMMARY
# ============================================================

@attendance_bp.route("/api/summary")
def attendance_summary_api():
    class_arm = normalize_arm(request.args.get("class_arm"))
    attendance_date = request.args.get("date")

    if not class_arm:
        return jsonify({"ok": False, "message": "Class arm is required."}), 400

    return jsonify({
        "ok": True,
        "summary": build_summary(class_arm, attendance_date),
    })


# ============================================================
# API: VIEW SAVED ATTENDANCE HISTORY
# Used by frontend modal.
# Supports date range, session, term, status and search.
# ============================================================

@attendance_bp.route("/api/history")
def attendance_history_api():
    class_arm = normalize_arm(request.args.get("class_arm"))
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    session = (request.args.get("session") or "").strip()
    term = (request.args.get("term") or "").strip()
    status = normalize_status(request.args.get("status")) if request.args.get("status") else ""
    search = (request.args.get("search") or "").strip().lower()

    if not class_arm:
        return jsonify({"ok": False, "message": "Class arm is required."}), 400

    rows = read_attendance_file(class_arm)

    filtered = []

    for row in rows:
        if not row_date_in_range(row, start_date, end_date):
            continue

        if session and row.get("Session") != session:
            continue

        if term and row.get("Term") != term:
            continue

        if status and row.get("Status") != status:
            continue

        if search and search not in get_row_search_text(row):
            continue

        filtered.append(row)

    return jsonify({
        "ok": True,
        "class_arm": class_arm,
        "records": filtered,
        "summary": build_summary_from_rows(filtered),
        "daily_breakdown": build_daily_breakdown(filtered),
        "student_breakdown": build_student_breakdown(filtered),
        "total_records": len(filtered),
    })


# ============================================================
# API: STUDENT ATTENDANCE PROFILE
# Good for report-card attendance and checking any past day.
# ============================================================

@attendance_bp.route("/api/student-history")
def student_attendance_history_api():
    class_arm = normalize_arm(request.args.get("class_arm"))
    admission_number = (request.args.get("admission_number") or "").strip()
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    session = (request.args.get("session") or "").strip()
    term = (request.args.get("term") or "").strip()

    if not class_arm:
        return jsonify({"ok": False, "message": "Class arm is required."}), 400

    if not admission_number:
        return jsonify({"ok": False, "message": "Admission number is required."}), 400

    rows = read_attendance_file(class_arm)

    filtered = []

    for row in rows:
        if row.get("Admission_number") != admission_number:
            continue

        if not row_date_in_range(row, start_date, end_date):
            continue

        if session and row.get("Session") != session:
            continue

        if term and row.get("Term") != term:
            continue

        filtered.append(row)

    student = {}

    if filtered:
        first = filtered[0]
        student = {
            "admission_number": first.get("Admission_number", ""),
            "last_name": first.get("Last_name", ""),
            "first_name": first.get("First_name", ""),
            "other_names": first.get("Other_names", ""),
            "full_name": first.get("Full_name") or build_full_name(first),
            "class_arm": first.get("Class", ""),
            "class_category": first.get("Class_category", ""),
        }

    return jsonify({
        "ok": True,
        "student": student,
        "records": filtered,
        "summary": build_student_summary(filtered),
    })


# ============================================================
# API: REPORT CARD ATTENDANCE SUMMARY
# Returns:
# Days School Open
# Day(s) Present
# Day(s) Absent
# Attendance Percentage
# ============================================================

@attendance_bp.route("/api/report-attendance")
def report_attendance_api():
    class_arm = normalize_arm(request.args.get("class_arm"))
    admission_number = (request.args.get("admission_number") or "").strip()
    session = (request.args.get("session") or "").strip()
    term = (request.args.get("term") or "").strip()

    if not class_arm:
        return jsonify({"ok": False, "message": "Class arm is required."}), 400

    rows = read_attendance_file(class_arm)

    if session:
        rows = [row for row in rows if row.get("Session") == session]

    if term:
        rows = [row for row in rows if row.get("Term") == term]

    school_open_dates = sorted(set(
        row.get("Date")
        for row in rows
        if row.get("Date") and row.get("Record_type") != "HOLIDAY"
    ))

    result = {
        "ok": True,
        "class_arm": class_arm,
        "session": session,
        "term": term,
        "days_school_open": len(school_open_dates),
    }

    if admission_number:
        student_rows = [
            row for row in rows
            if row.get("Admission_number") == admission_number
        ]

        result["admission_number"] = admission_number
        result["student_summary"] = build_student_summary(student_rows)
        result["records"] = student_rows

    return jsonify(result)


# ============================================================
# API: AVAILABLE DATES
# Useful for frontend date picker/history modal.
# ============================================================

@attendance_bp.route("/api/dates")
def attendance_dates_api():
    class_arm = normalize_arm(request.args.get("class_arm"))

    if not class_arm:
        return jsonify({"ok": False, "message": "Class arm is required."}), 400

    rows = read_attendance_file(class_arm)

    grouped = defaultdict(list)

    for row in rows:
        grouped[row.get("Date", "")].append(row)

    dates = []

    for attendance_date, day_rows in sorted(grouped.items()):
        if not attendance_date:
            continue

        dates.append({
            "date": attendance_date,
            "day": day_rows[0].get("Day", ""),
            "month": day_rows[0].get("Month", ""),
            "week": day_rows[0].get("Week", ""),
            "record_count": len(day_rows),
            "summary": build_summary_from_rows(day_rows),
        })

    return jsonify({
        "ok": True,
        "class_arm": class_arm,
        "dates": dates,
        "total_dates": len(dates),
    })





@attendance_bp.route("/api/delete", methods=["POST", "DELETE"])
def delete_attendance_api():
    payload = request.get_json(silent=True) or {}

    class_arm = normalize_arm(payload.get("class_arm"))
    attendance_date = (payload.get("date") or "").strip()

    if not class_arm:
        return jsonify({
            "ok": False,
            "message": "Class arm is required.",
        }), 400

    if not attendance_date:
        return jsonify({
            "ok": False,
            "message": "Attendance date is required.",
        }), 400

    rows = read_attendance_file(class_arm)

    before_count = len(rows)

    remaining_rows = [
        row for row in rows
        if row.get("Date") != attendance_date
    ]

    deleted_count = before_count - len(remaining_rows)

    write_attendance_file(class_arm, remaining_rows)

    return jsonify({
        "ok": True,
        "message": f"Deleted {deleted_count} attendance record(s) for {attendance_date}.",
        "deleted_count": deleted_count,
        "class_arm": class_arm,
        "date": attendance_date,
        "summary": build_summary(class_arm),
    })