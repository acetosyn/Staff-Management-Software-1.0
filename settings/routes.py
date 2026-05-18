from flask import Blueprint, render_template

settings_bp = Blueprint("settings", __name__)


@settings_bp.route("/")
def settings_general():
    return render_template("settings/settings_general.html")


@settings_bp.route("/sessions-terms")
def sessions_terms():
    return render_template("settings/sessions_terms.html")


@settings_bp.route("/subjects")
def subjects():
    return render_template("settings/subjects.html")


@settings_bp.route("/grading")
def grading():
    return render_template("settings/grading.html")