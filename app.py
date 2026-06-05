import os
from flask import Flask, render_template, send_from_directory, Blueprint, redirect, url_for
from dotenv import load_dotenv

from dashboard.routes import dashboard_bp
from students.routes import students_bp
from attendance.routes import attendance_bp
from ca_test.routes import ca_tests_bp
from reports.routes import reports_bp
from promotion.routes import promotion_bp
from settings.routes import settings_bp
from auth.routes import auth_bp


load_dotenv()


classes_bp = Blueprint("classes", __name__)
staff_bp = Blueprint("staff", __name__)


@classes_bp.route("/")
def classes_dashboard():
    return render_template("dashboard/dashboard.html")


@staff_bp.route("/")
def staff_list():
    return render_template("dashboard/dashboard.html")


def create_app():
    app = Flask(__name__, template_folder="templates", static_folder="static")

    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "staff-management-secret-key")

    app.register_blueprint(auth_bp)

    app.register_blueprint(dashboard_bp)
    app.register_blueprint(students_bp, url_prefix="/students")
    app.register_blueprint(attendance_bp, url_prefix="/attendance")
    app.register_blueprint(ca_tests_bp, url_prefix="/ca-test")
    app.register_blueprint(reports_bp, url_prefix="/reports")
    app.register_blueprint(promotion_bp, url_prefix="/promotion")
    app.register_blueprint(settings_bp, url_prefix="/settings")

    # temporary placeholders because base.html sidebar already uses them
    app.register_blueprint(classes_bp, url_prefix="/classes")
    app.register_blueprint(staff_bp, url_prefix="/staff")

    @app.route("/")
    def index():
        return redirect(url_for("auth.admin_login"))

    @app.route("/favicon.ico")
    def favicon():
        return send_from_directory(app.static_folder, "favicon.ico")

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5009)