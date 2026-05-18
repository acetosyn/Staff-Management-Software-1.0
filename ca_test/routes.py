from flask import Blueprint, render_template

ca_tests_bp = Blueprint("ca_test", __name__)


@ca_tests_bp.route("/")
def ca_entry():
    return render_template("ca_test/ca_entry.html")