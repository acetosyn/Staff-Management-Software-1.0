import csv
import os
from collections import Counter
from flask import Blueprint, current_app, jsonify, render_template

dashboard_bp = Blueprint("dashboard", __name__, template_folder="../templates")
bp = dashboard_bp

STUDENT_FILES = [
    "JSS1_Students.csv",
    "JSS2_Students.csv",
    "JSS3_Students.csv",
    "SS1_Students.csv",
    "SS2_Students.csv",
    "SS3_Students.csv",
]


def _read_student_data():
    data_dir = os.path.join(current_app.root_path, "static", "data")

    students = []
    missing_files = []

    for filename in STUDENT_FILES:
        file_path = os.path.join(data_dir, filename)

        if not os.path.exists(file_path):
            missing_files.append(filename)
            continue

        with open(file_path, "r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)

            for row in reader:
                admission = (row.get("Admission_number") or "").strip()
                class_arm = (row.get("Class") or "").strip()
                class_category = (row.get("Class_category") or "").strip()
                phone = (row.get("Phone") or "").strip()

                if not admission:
                    continue

                if not class_category and class_arm:
                    class_category = (
                        class_arm.replace("_GOLD", "")
                        .replace("_SILVER", "")
                        .replace("_DIAMOND", "")
                    )
                    class_category = "".join([c for c in class_category if not c.isalpha() or c.upper() in "JSS"])

                students.append({
                    "admission": admission,
                    "last_name": (row.get("Last_name") or "").strip(),
                    "first_name": (row.get("First_name") or "").strip(),
                    "other_names": (row.get("Other_names") or "").strip(),
                    "phone": phone,
                    "class_arm": class_arm,
                    "class_category": class_category,
                })

    return students, missing_files


def get_dashboard_stats():
    students, missing_files = _read_student_data()

    class_level_counter = Counter()
    class_arm_counter = Counter()
    complete_phone_count = 0

    for student in students:
        if student["class_category"]:
            class_level_counter[student["class_category"]] += 1

        if student["class_arm"]:
            class_arm_counter[student["class_arm"]] += 1

        if student["phone"]:
            complete_phone_count += 1

    total_students = len(students)
    total_class_arms = len(class_arm_counter)
    total_levels = len(class_level_counter)
    missing_phone_count = max(total_students - complete_phone_count, 0)

    class_breakdown = []
    for level in ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"]:
        count = class_level_counter.get(level, 0)
        percent = round((count / total_students) * 100) if total_students else 0

        class_breakdown.append({
            "level": level,
            "count": count,
            "percent": percent,
        })

    arm_breakdown = []
    for arm, count in sorted(class_arm_counter.items()):
        percent = round((count / total_students) * 100) if total_students else 0

        arm_breakdown.append({
            "arm": arm,
            "count": count,
            "percent": percent,
        })

    return {
        "total_students": total_students,
        "total_class_arms": total_class_arms,
        "total_levels": total_levels,
        "complete_phone_count": complete_phone_count,
        "missing_phone_count": missing_phone_count,
        "class_breakdown": class_breakdown,
        "arm_breakdown": arm_breakdown,
        "missing_files": missing_files,
    }


@dashboard_bp.route("/")
def dashboard():
    dashboard_stats = get_dashboard_stats()
    return render_template("dashboard/dashboard.html", dashboard_stats=dashboard_stats)


@dashboard_bp.route("/api/stats")
def dashboard_stats_api():
    return jsonify(get_dashboard_stats())