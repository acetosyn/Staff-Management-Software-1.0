from flask import Blueprint, render_template

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/")
def report_sheet():
    return render_template("reports/report_sheet.html")