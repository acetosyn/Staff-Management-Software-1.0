from flask import Blueprint, render_template

students_bp = Blueprint("students", __name__)


@students_bp.route("/")
def student_list():
    return render_template("students/student_list.html")