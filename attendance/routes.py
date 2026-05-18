from flask import Blueprint, render_template

attendance_bp = Blueprint("attendance", __name__)


@attendance_bp.route("/")
def attendance_mark():
    return render_template("attendance/attendance_mark.html")