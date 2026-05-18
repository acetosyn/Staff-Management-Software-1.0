import csv
import os
from datetime import datetime, date
from collections import Counter
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
    "Session",
    "Term",
    "Class",
    "Class_category",
    "Admission_number",
    "Last_name",
    "First_name",
    "Other_names",
    "Status",
    "Reason",
    "Note",
    "Saved_at",
    "Record_type",
]


def data_dir():
    return os.path.join(current_app.root_path, "static", "data")


def attendance_dir():
    folder = os.path.join(data_dir(), "attendance")
    os.makedirs(folder, exist_ok=True)
    return folder


def normalize_arm(value):
    return (value or "").strip().upper().replace(" ", "_")


def get_level_from_arm(class_arm):
    class_arm = normalize_arm(class_arm)

    for level in LEVELS:
      if class_arm.startswith(level):
        return level

    return ""


def student_file_path(level):
    filename = STUDENT_FILES.get(level)
    if not filename:
        return None

    return os.path.join(data_dir(), filename)


def attendance_file_path(class_arm):
    safe_class = normalize_arm(class_arm).replace("/", "_")
    return os.path.join(attendance_dir(), f"attendance_{safe_class}.csv")


def build_full_name(row):
    return " ".join([
        (row.get("Last_name") or "").strip(),
        (row.get("First_name") or "").strip(),
        (row.get("Other_names") or "").strip(),
    ]).strip()


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
                "phone": (row.get("Phone") or "").strip(),
                "class_arm": row_class,
                "class_category": (row.get("Class_category") or level).strip().upper(),
                "full_name": build_full_name(row),
            })

    return students


def read_attendance_file(class_arm):
    path = attendance_file_path(class_arm)

    if not os.path.exists(path):
        return []

    with open(path, "r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def write_attendance_file(class_arm, rows):
    path = attendance_file_path(class_arm)

    with open(path, "w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=ATTENDANCE_FIELDS)
        writer.writeheader()

        for row in rows:
            writer.writerow({
                field: row.get(field, "")
                for field in ATTENDANCE_FIELDS
            })


def get_attendance_for_date(class_arm, attendance_date):
    rows = read_attendance_file(class_arm)

    return [
        row for row in rows
        if row.get("Date") == attendance_date
    ]


def build_summary(class_arm, attendance_date=None):
    rows = read_attendance_file(class_arm)

    if attendance_date:
        rows = [row for row in rows if row.get("Date") == attendance_date]

    counter = Counter(row.get("Status", "UNMARKED") for row in rows)

    return {
        "total_records": len(rows),
        "present": counter.get("PRESENT", 0),
        "absent": counter.get("ABSENT", 0),
        "late": counter.get("LATE", 0),
        "sick": counter.get("SICK", 0),
        "excused": counter.get("EXCUSED", 0),
        "holiday": sum(1 for row in rows if row.get("Record_type") == "HOLIDAY"),
    }


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
    }

    for student in students:
        saved = existing_map.get(student["admission_number"])
        student["status"] = saved.get("Status", "") if saved else ""
        student["reason"] = saved.get("Reason", "") if saved else ""
        student["note"] = saved.get("Note", "") if saved else ""

    return jsonify({
        "ok": True,
        "class_arm": class_arm,
        "class_category": get_level_from_arm(class_arm),
        "date": attendance_date,
        "students": students,
        "existing_count": len(existing_records),
        "summary": build_summary(class_arm, attendance_date),
    })


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

    saved_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    new_rows = []

    for record in records:
        new_rows.append({
            "Date": attendance_date,
            "Session": session,
            "Term": term,
            "Class": class_arm,
            "Class_category": class_category,
            "Admission_number": record.get("admission_number", ""),
            "Last_name": record.get("last_name", ""),
            "First_name": record.get("first_name", ""),
            "Other_names": record.get("other_names", ""),
            "Status": record.get("status", "UNMARKED"),
            "Reason": record.get("reason", ""),
            "Note": record.get("note", ""),
            "Saved_at": saved_at,
            "Record_type": "DAILY",
        })

    final_rows = existing_rows + new_rows
    write_attendance_file(class_arm, final_rows)

    return jsonify({
        "ok": True,
        "message": "Attendance saved successfully.",
        "saved_count": len(new_rows),
        "summary": build_summary(class_arm, attendance_date),
        "saved_at": saved_at,
    })


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

    saved_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    holiday_row = {
        "Date": attendance_date,
        "Session": session,
        "Term": term,
        "Class": class_arm,
        "Class_category": class_category,
        "Admission_number": "",
        "Last_name": "",
        "First_name": "",
        "Other_names": "",
        "Status": "HOLIDAY",
        "Reason": reason,
        "Note": "School not in session",
        "Saved_at": saved_at,
        "Record_type": "HOLIDAY",
    }

    final_rows = existing_rows + [holiday_row]
    write_attendance_file(class_arm, final_rows)

    return jsonify({
        "ok": True,
        "message": "Public holiday saved successfully.",
        "summary": build_summary(class_arm, attendance_date),
        "saved_at": saved_at,
    })


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