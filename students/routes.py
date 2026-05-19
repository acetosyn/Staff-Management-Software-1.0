import csv
import os
import tempfile
from collections import Counter
from flask import Blueprint, current_app, jsonify, render_template, request

students_bp = Blueprint("students", __name__)

LEVELS = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"]

LEVEL_FILES = {
    "JSS1": "JSS1_Students.csv",
    "JSS2": "JSS2_Students.csv",
    "JSS3": "JSS3_Students.csv",
    "SS1": "SS1_Students.csv",
    "SS2": "SS2_Students.csv",
    "SS3": "SS3_Students.csv",
}

FIELDNAMES = [
    "Admission_number",
    "Last_name",
    "First_name",
    "Other_names",
    "Phone",
    "Class",
    "Class_category",
]


def data_dir():
    return os.path.join(current_app.root_path, "static", "data")


def get_level_from_arm(class_arm):
    class_arm = (class_arm or "").strip().upper()

    for level in LEVELS:
        if class_arm.startswith(level):
            return level

    return ""


def normalize_student(row):
    admission = (row.get("Admission_number") or row.get("admission_number") or "").strip()
    last_name = (row.get("Last_name") or row.get("last_name") or "").strip()
    first_name = (row.get("First_name") or row.get("first_name") or "").strip()
    other_names = (row.get("Other_names") or row.get("other_names") or "").strip()
    phone = (row.get("Phone") or row.get("phone") or "").strip()
    class_arm = (row.get("Class") or row.get("class_arm") or "").strip().upper()
    class_category = (row.get("Class_category") or row.get("class_category") or "").strip().upper()

    if not class_category:
        class_category = get_level_from_arm(class_arm)

    full_name = " ".join([last_name, first_name, other_names]).strip()

    return {
        "Admission_number": admission,
        "Last_name": last_name,
        "First_name": first_name,
        "Other_names": other_names,
        "Phone": phone,
        "Class": class_arm,
        "Class_category": class_category,
        "admission_number": admission,
        "last_name": last_name,
        "first_name": first_name,
        "other_names": other_names,
        "phone": phone,
        "class_arm": class_arm,
        "class_category": class_category,
        "full_name": full_name,
    }


def read_all_students():
    students = []

    for level in LEVELS:
        filename = LEVEL_FILES[level]
        path = os.path.join(data_dir(), filename)

        if not os.path.exists(path):
            continue

        with open(path, "r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)

            for row in reader:
                student = normalize_student(row)

                if student["admission_number"]:
                    students.append(student)

    return students


def write_students_by_level(students):
    grouped = {level: [] for level in LEVELS}

    for student in students:
        normalized = normalize_student(student)
        level = normalized["class_category"] or get_level_from_arm(normalized["class_arm"])

        if level not in grouped:
            level = get_level_from_arm(normalized["class_arm"])

        if level in grouped:
            grouped[level].append(normalized)

    os.makedirs(data_dir(), exist_ok=True)

    for level, filename in LEVEL_FILES.items():
        path = os.path.join(data_dir(), filename)

        fd, temp_path = tempfile.mkstemp(prefix=f"{level}_", suffix=".csv", dir=data_dir(), text=True)

        with os.fdopen(fd, "w", encoding="utf-8", newline="") as temp_file:
            writer = csv.DictWriter(temp_file, fieldnames=FIELDNAMES)
            writer.writeheader()

            for student in grouped[level]:
                writer.writerow({
                    "Admission_number": student["admission_number"],
                    "Last_name": student["last_name"],
                    "First_name": student["first_name"],
                    "Other_names": student["other_names"],
                    "Phone": student["phone"],
                    "Class": student["class_arm"],
                    "Class_category": student["class_category"],
                })

        os.replace(temp_path, path)


def build_stats(students):
    level_counts = Counter(student["class_category"] for student in students)
    arm_counts = Counter(student["class_arm"] for student in students)

    return {
        "total_students": len(students),
        "total_levels": len([level for level in LEVELS if level_counts.get(level, 0)]),
        "total_arms": len(arm_counts),
        "missing_phone": sum(1 for student in students if not student["phone"]),
        "level_counts": {level: level_counts.get(level, 0) for level in LEVELS},
        "arms": sorted([arm for arm in arm_counts if arm]),
    }


def validate_payload(payload, old_admission=None):
    student = normalize_student(payload)

    if not student["admission_number"]:
        return None, "Admission number is required."

    if not student["last_name"]:
        return None, "Last name is required."

    if not student["first_name"]:
        return None, "First name is required."

    if not student["class_arm"]:
        return None, "Class arm is required."

    if not student["class_category"]:
        return None, "Class category is required."

    if student["class_category"] not in LEVELS:
        return None, "Invalid class category."

    if not student["class_arm"].startswith(student["class_category"]):
        return None, "Class arm must match class category."

    return student, None


@students_bp.route("/")
def student_list():
    students = read_all_students()
    stats = build_stats(students)

    return render_template(
        "students/student_list.html",
        students=students,
        stats=stats,
        level_order=LEVELS
    )


@students_bp.route("/api/list")
def student_list_api():
    students = read_all_students()

    return jsonify({
        "ok": True,
        "students": students,
        "stats": build_stats(students),
    })


@students_bp.route("/api/create", methods=["POST"])
def create_student_api():
    payload = request.get_json(silent=True) or {}
    new_student, error = validate_payload(payload)

    if error:
        return jsonify({"ok": False, "message": error}), 400

    students = read_all_students()

    if any(student["admission_number"].lower() == new_student["admission_number"].lower() for student in students):
        return jsonify({"ok": False, "message": "Admission number already exists."}), 409

    students.append(new_student)
    write_students_by_level(students)

    return jsonify({
        "ok": True,
        "message": "Student added successfully.",
        "student": new_student,
        "stats": build_stats(students),
    })


@students_bp.route("/api/update/<admission_number>", methods=["PUT"])
def update_student_api(admission_number):
    payload = request.get_json(silent=True) or {}
    updated_student, error = validate_payload(payload, admission_number)

    if error:
        return jsonify({"ok": False, "message": error}), 400

    students = read_all_students()
    found = False

    for student in students:
        same_current_record = student["admission_number"].lower() == admission_number.lower()
        duplicate_new_admission = (
            student["admission_number"].lower() == updated_student["admission_number"].lower()
            and not same_current_record
        )

        if duplicate_new_admission:
            return jsonify({"ok": False, "message": "New admission number already belongs to another student."}), 409

    new_students = []

    for student in students:
        if student["admission_number"].lower() == admission_number.lower():
            new_students.append(updated_student)
            found = True
        else:
            new_students.append(student)

    if not found:
        return jsonify({"ok": False, "message": "Student record not found."}), 404

    write_students_by_level(new_students)

    return jsonify({
        "ok": True,
        "message": "Student updated successfully.",
        "student": updated_student,
        "stats": build_stats(new_students),
    })


@students_bp.route("/api/delete/<admission_number>", methods=["DELETE"])
def delete_student_api(admission_number):
    students = read_all_students()
    new_students = [
        student for student in students
        if student["admission_number"].lower() != admission_number.lower()
    ]

    if len(new_students) == len(students):
        return jsonify({"ok": False, "message": "Student record not found."}), 404

    write_students_by_level(new_students)

    return jsonify({
        "ok": True,
        "message": "Student deleted successfully.",
        "stats": build_stats(new_students),
    })


@students_bp.route("/api/bulk-delete", methods=["POST"])
def bulk_delete_students_api():
    payload = request.get_json(silent=True) or {}
    admission_numbers = payload.get("admission_numbers") or []

    admission_set = {str(item).lower() for item in admission_numbers if item}

    if not admission_set:
        return jsonify({"ok": False, "message": "No student selected."}), 400

    students = read_all_students()
    new_students = [
        student for student in students
        if student["admission_number"].lower() not in admission_set
    ]

    deleted_count = len(students) - len(new_students)

    if deleted_count == 0:
        return jsonify({"ok": False, "message": "No matching student record found."}), 404

    write_students_by_level(new_students)

    return jsonify({
        "ok": True,
        "message": f"{deleted_count} student record(s) removed successfully.",
        "deleted_count": deleted_count,
        "stats": build_stats(new_students),
    })