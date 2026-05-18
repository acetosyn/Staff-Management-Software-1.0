from flask import Blueprint, render_template

promotion_bp = Blueprint("promotion", __name__)


@promotion_bp.route("/")
def promotion_dashboard():
    return render_template("promotion/promotion_dashboard.html")


@promotion_bp.route("/graduation")
def graduation():
    return render_template("promotion/graduation.html")


@promotion_bp.route("/withdraw-transfer")
def withdraw_transfer():
    return render_template("promotion/withdraw_transfer.html")