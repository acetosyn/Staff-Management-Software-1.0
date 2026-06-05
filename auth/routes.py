import os
from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from dotenv import load_dotenv

load_dotenv()

auth_bp = Blueprint("auth", __name__, template_folder="../templates")

@auth_bp.route("/admin-login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        env_username = os.getenv("ADMIN_USERNAME", "admin")
        env_password = os.getenv("ADMIN_PASSWORD", "Emis2026")

        if username == env_username and password == env_password:
            session["username"] = username
            session["is_admin"] = True
            flash("Welcome back, Admin.", "success")
            return redirect(url_for("dashboard.dashboard"))

        flash("Invalid username or password.", "danger")

    return render_template("auth/admin_login.html")


@auth_bp.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "success")
    return redirect(url_for("auth.admin_login"))