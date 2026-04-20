"""
Portfolio Flask Application — Vincent Ochanji
=============================================
Public routes:
  GET  /            → main portfolio page (shows first 3 projects)
  GET  /projects    → all projects page
  POST /contact     → contact form handler (JSON response)

Admin API routes (JSON, session-protected via .env credentials):
  POST          /admin/api/login              → authenticate
  POST          /admin/api/logout             → destroy session
  GET / POST    /admin/api/profile            → read or update profile.json
  POST          /admin/api/upload             → upload image file
  GET / POST    /admin/api/projects           → list or add project
  PUT / DELETE  /admin/api/projects/<n>       → update or delete project
  GET / POST    /admin/api/experience         → list or add experience entry
  PUT / DELETE  /admin/api/experience/<n>     → update or delete entry

Legacy admin routes (kept for fallback):
  GET/POST /admin/login   → login form
  GET      /admin/logout  → destroy session, redirect home
  GET      /admin         → redirects to home (admin bar visible there)
"""

import html
import json
import os
import uuid
from functools import wraps

import resend
from dotenv import load_dotenv
from flask import (
    Flask,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from werkzeug.utils import secure_filename

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY", "")

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024   # 5 MB upload limit

DATA_DIR   = os.path.join(os.path.dirname(__file__), "data")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "static", "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
ALLOWED_CV_EXTENSIONS = {"pdf", "doc", "docx"}


# ── Template filter ────────────────────────────────────────────────────────────


@app.template_filter("initials")
def get_initials(name: str) -> str:
    """Return up to two initials from a full name (e.g. 'Vincent Ochanji' → 'VO')."""
    parts = str(name).strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return parts[0][:2].upper() if parts else "VO"


# ── Data helpers ───────────────────────────────────────────────────────────────


def load_data(filename: str):
    """Read and return parsed JSON from data/<filename>."""
    filepath = os.path.join(DATA_DIR, filename)
    try:
        with open(filepath, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        return {} if filename == "profile.json" else []


def save_data(filename: str, data) -> None:
    """Serialise data as pretty-printed JSON and write to data/<filename>."""
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def allowed_cv(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_CV_EXTENSIONS


# ── Auth decorators ────────────────────────────────────────────────────────────


def admin_required(f):
    """Redirect unauthenticated requests to the login page."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_login"))
        return f(*args, **kwargs)
    return decorated


def admin_required_json(f):
    """Return 401 JSON for unauthenticated API requests."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return jsonify({"status": "error", "message": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


# ── Context processor ──────────────────────────────────────────────────────────


@app.context_processor
def inject_profile():
    """Make profile data available in every template automatically."""
    return {"profile": load_data("profile.json")}


# ── Public routes ──────────────────────────────────────────────────────────────


@app.route("/")
def home():
    return render_template(
        "index.html",
        projects=load_data("projects.json"),
        experience=load_data("experience.json"),
    )


@app.route("/projects")
def all_projects():
    return render_template("projects.html", projects=load_data("projects.json"))


@app.route("/contact", methods=["POST"])
def contact():
    name    = request.form.get("name",    "").strip()
    email   = request.form.get("email",   "").strip()
    message = request.form.get("message", "").strip()

    if not all([name, email, message]):
        return jsonify({"status": "error", "message": "All fields are required."}), 400

    to_email = os.getenv("CONTACT_TO_EMAIL", "")
    if not resend.api_key:
        print("[Contact] WARNING: RESEND_API_KEY is not set — email not sent.")
    elif not to_email:
        print("[Contact] WARNING: CONTACT_TO_EMAIL is not set — email not sent.")
    else:
        try:
            safe_name    = html.escape(name)
            safe_email   = html.escape(email)
            safe_message = html.escape(message).replace("\n", "<br>")
            resend.Emails.send({
                "from":     "Portfolio Contact <onboarding@resend.dev>",
                "to":       [to_email],
                "reply_to": email,
                "subject":  f"Portfolio enquiry from {safe_name}",
                "html": (
                    f"<p><strong>Name:</strong> {safe_name}</p>"
                    f"<p><strong>Email:</strong> {safe_email}</p>"
                    f"<p><strong>Message:</strong></p>"
                    f"<p>{safe_message}</p>"
                ),
            })
            print(f"[Contact] Email sent to {to_email} from {email}")
        except Exception as exc:
            print(f"[Contact] Resend error: {exc}")

    print(f"[Contact] {name} <{email}>: {message}")
    return jsonify({"status": "ok", "message": "Thanks — I'll be in touch soon."})


# ── Admin API: auth ────────────────────────────────────────────────────────────


@app.route("/admin/api/login", methods=["POST"])
def admin_api_login():
    data     = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if (username == os.getenv("ADMIN_USERNAME") and
            password == os.getenv("ADMIN_PASSWORD")):
        session["admin_logged_in"] = True
        return jsonify({"status": "ok"})

    return jsonify({"status": "error", "message": "Invalid credentials."}), 401


@app.route("/admin/api/logout", methods=["POST"])
def admin_api_logout():
    session.pop("admin_logged_in", None)
    return jsonify({"status": "ok"})


# ── Admin API: profile ─────────────────────────────────────────────────────────


@app.route("/admin/api/profile", methods=["GET", "POST"])
@admin_required_json
def admin_api_profile():
    if request.method == "GET":
        return jsonify(load_data("profile.json"))

    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({"status": "error", "message": "Invalid data."}), 400

    save_data("profile.json", data)
    return jsonify({"status": "ok"})


# ── Admin API: image upload ────────────────────────────────────────────────────


@app.route("/admin/api/upload", methods=["POST"])
@admin_required_json
def admin_api_upload():
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "No file provided."}), 400

    file = request.files["file"]
    if not file or file.filename == "" or not allowed_file(file.filename):
        return jsonify({
            "status": "error",
            "message": "Invalid file type. Use PNG, JPG, GIF, or WebP.",
        }), 400

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext      = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(UPLOAD_DIR, filename))

    return jsonify({"status": "ok", "url": f"/static/uploads/{filename}"})


# ── Admin API: CV upload ───────────────────────────────────────────────────────


@app.route("/admin/api/cv", methods=["POST"])
@admin_required_json
def admin_api_cv():
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "No file provided."}), 400

    file = request.files["file"]
    if not file or file.filename == "" or not allowed_cv(file.filename):
        return jsonify({
            "status": "error",
            "message": "Invalid file type. Use PDF, DOC, or DOCX.",
        }), 400

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext      = file.filename.rsplit(".", 1)[1].lower()
    filename = f"cv.{ext}"
    file.save(os.path.join(UPLOAD_DIR, filename))

    url     = f"/static/uploads/{filename}"
    profile = load_data("profile.json")
    profile["cv_url"] = url
    save_data("profile.json", profile)

    return jsonify({"status": "ok", "url": url})


@app.route("/admin/api/cv", methods=["DELETE"])
@admin_required_json
def admin_api_cv_delete():
    profile = load_data("profile.json")
    old_url = profile.pop("cv_url", None)
    save_data("profile.json", profile)

    if old_url:
        old_path = os.path.join(os.path.dirname(__file__), old_url.lstrip("/"))
        try:
            os.remove(old_path)
        except OSError:
            pass

    return jsonify({"status": "ok"})


# ── Admin API: projects ────────────────────────────────────────────────────────


def _build_project(data: dict) -> dict:
    tags = [t.strip() for t in data.get("tags", "").split(",") if t.strip()]
    # Metrics: accept a JSON list or fall back to empty
    raw_metrics = data.get("metrics", [])
    if isinstance(raw_metrics, str):
        try:
            import json as _json
            raw_metrics = _json.loads(raw_metrics)
        except Exception:
            raw_metrics = []
    metrics = [
        {"value": str(m.get("value", "")).strip(), "label": str(m.get("label", "")).strip()}
        for m in raw_metrics if isinstance(m, dict)
    ]
    return {
        "title":    data.get("title",    "").strip(),
        "tagline":  data.get("tagline",  "").strip(),
        "problem":  data.get("problem",  "").strip(),
        "solution": data.get("solution", "").strip(),
        "impact":   data.get("impact",   "").strip(),
        "metrics":  metrics,
        "tags":     tags,
        "github":    data.get("github", "").strip(),
        "demo":      data.get("demo",   "").strip(),
        "demo_type": data.get("demo_type", "").strip(),
        "image":     data.get("image",  "") or "",
    }


@app.route("/admin/api/projects", methods=["GET", "POST"])
@admin_required_json
def admin_api_projects():
    if request.method == "GET":
        return jsonify(load_data("projects.json"))

    projects = load_data("projects.json")
    project  = _build_project(request.get_json() or {})
    projects.append(project)
    save_data("projects.json", projects)
    return jsonify({"status": "ok", "idx": len(projects) - 1, "project": project})


@app.route("/admin/api/projects/reorder", methods=["POST"])
@admin_required_json
def admin_api_projects_reorder():
    data     = request.get_json() or {}
    order    = data.get("order", [])
    projects = load_data("projects.json")
    if not isinstance(order, list) or sorted(order) != list(range(len(projects))):
        return jsonify({"status": "error", "message": "Invalid order."}), 400
    save_data("projects.json", [projects[i] for i in order])
    return jsonify({"status": "ok"})


@app.route("/admin/api/projects/<int:idx>", methods=["PUT", "DELETE"])
@admin_required_json
def admin_api_project(idx):
    projects = load_data("projects.json")
    if idx >= len(projects):
        return jsonify({"status": "error", "message": "Not found."}), 404

    if request.method == "DELETE":
        projects.pop(idx)
        save_data("projects.json", projects)
        return jsonify({"status": "ok"})

    projects[idx] = _build_project(request.get_json() or {})
    save_data("projects.json", projects)
    return jsonify({"status": "ok", "project": projects[idx]})


# ── Admin API: experience ──────────────────────────────────────────────────────


def _build_experience(data: dict) -> dict:
    highlights = [h.strip() for h in data.get("highlights", "").splitlines() if h.strip()]
    return {
        "title":        data.get("title",        "").strip(),
        "organization": data.get("organization", "").strip(),
        "period":       data.get("period",       "").strip(),
        "highlights":   highlights,
    }


@app.route("/admin/api/experience", methods=["GET", "POST"])
@admin_required_json
def admin_api_experience_list():
    if request.method == "GET":
        return jsonify(load_data("experience.json"))

    experience = load_data("experience.json")
    entry      = _build_experience(request.get_json() or {})
    experience.append(entry)
    save_data("experience.json", experience)
    return jsonify({"status": "ok", "idx": len(experience) - 1, "entry": entry})


@app.route("/admin/api/experience/<int:idx>", methods=["PUT", "DELETE"])
@admin_required_json
def admin_api_experience_item(idx):
    experience = load_data("experience.json")
    if idx >= len(experience):
        return jsonify({"status": "error", "message": "Not found."}), 404

    if request.method == "DELETE":
        experience.pop(idx)
        save_data("experience.json", experience)
        return jsonify({"status": "ok"})

    experience[idx] = _build_experience(request.get_json() or {})
    save_data("experience.json", experience)
    return jsonify({"status": "ok", "entry": experience[idx]})


# ── Admin API: skills reorder ─────────────────────────────────────────────────


@app.route("/admin/api/skills/reorder", methods=["POST"])
@admin_required_json
def admin_api_skills_reorder():
    data    = request.get_json() or {}
    order   = data.get("order", [])
    profile = load_data("profile.json")
    skills  = profile.get("skills", [])
    if not isinstance(order, list) or sorted(order) != list(range(len(skills))):
        return jsonify({"status": "error", "message": "Invalid order."}), 400
    profile["skills"] = [skills[i] for i in order]
    save_data("profile.json", profile)
    return jsonify({"status": "ok"})


# ── Legacy admin routes ────────────────────────────────────────────────────────


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()
        if (username == os.getenv("ADMIN_USERNAME") and
                password == os.getenv("ADMIN_PASSWORD")):
            session["admin_logged_in"] = True
            return redirect(url_for("home"))
        error = "Invalid credentials — please try again."
    return render_template("admin/login.html", error=error)


@app.route("/admin/logout")
def admin_logout():
    session.pop("admin_logged_in", None)
    return redirect(url_for("home"))


@app.route("/admin")
@admin_required
def admin_dashboard():
    return redirect(url_for("home"))


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True)
