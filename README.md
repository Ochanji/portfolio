# Vincent Ochanji — Portfolio

![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=flat&logo=flask&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-CSS3-E34F26?style=flat&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

A self-contained personal portfolio web application built with Flask. Content — projects, work experience, skills, and profile details — is managed through a built-in admin panel and stored as JSON files, so no database is required.

---

## Features

- **Dynamic portfolio page** — hero section, project cards, experience timeline, and skills grid, all driven by editable JSON data
- **All Projects page** — expandable cards with problem, solution, impact, and key metrics for each project
- **Contact form** — powered by the [Resend](https://resend.com) transactional email API with server-side validation
- **CV upload & download** — upload a PDF/Word CV through the admin panel; a download button appears on the public site automatically
- **Admin panel** — session-authenticated interface to create, edit, reorder, and delete projects, experience entries, and skills without touching code
- **Image uploads** — attach screenshots or thumbnails to projects via the admin panel
- **Dark / light mode** — defaults to the visitor's OS preference with a manual toggle
- **No database** — all data is stored in plain JSON files for simplicity and portability

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11 · Flask 3.x |
| Templating | Jinja2 (HTML5) |
| Styling | Custom CSS3 (no framework) |
| Interactivity | Vanilla JavaScript (ES6+) |
| Email | Resend API |
| Deployment | Gunicorn · Railway / Render / VPS |

---

## Project Structure

```
portfolio/
├── app.py                  # Flask application — routes, API endpoints, auth
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template (copy to .env)
├── .gitignore
├── data/                   # JSON data files (auto-created on first run)
│   ├── profile.json        # Name, headline, bio, skills, avatar
│   ├── projects.json       # Project entries
│   └── experience.json     # Work / volunteer experience
├── static/
│   ├── css/                # Stylesheets
│   ├── js/                 # Client-side scripts
│   └── uploads/            # Uploaded images and CV (git-ignored)
└── templates/
    ├── base.html           # Shared layout (navbar, footer, theme toggle)
    ├── index.html          # Main portfolio page
    ├── projects.html       # All projects page
    └── admin/              # Admin panel templates
```

---

## Getting Started

### Prerequisites

- Python 3.10 or newer
- A free [Resend](https://resend.com) account (optional — only needed for the contact form)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Ochanji/portfolio.git
cd portfolio

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Open .env and fill in your values (see Environment Variables below)

# 5. Run the development server
python app.py
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

### Environment Variables

| Variable | Description |
|---|---|
| `ADMIN_USERNAME` | Login username for the admin panel |
| `ADMIN_PASSWORD` | Login password for the admin panel |
| `SECRET_KEY` | Flask session secret — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) (contact form) |
| `CONTACT_TO_EMAIL` | Email address that receives contact form submissions |

---

## Admin Panel

Navigate to `/admin/login` after starting the server and sign in with your `ADMIN_USERNAME` and `ADMIN_PASSWORD`. From the admin bar you can:

- Edit your profile (name, headline, bio, avatar, skills)
- Add, edit, reorder, or delete projects
- Add, edit, or delete experience entries
- Upload / remove your CV
- Upload project images

---

## Deployment

The app is production-ready with Gunicorn. Example for Railway or Render:

```bash
gunicorn app:app
```

Set all environment variables in your hosting platform's dashboard — never commit your `.env` file.

---

## API Routes (Admin)

All routes under `/admin/api/` require an active admin session and return JSON.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/admin/api/login` | Authenticate |
| POST | `/admin/api/logout` | End session |
| GET / POST | `/admin/api/profile` | Read or update profile data |
| POST | `/admin/api/upload` | Upload an image |
| POST / DELETE | `/admin/api/cv` | Upload or remove CV |
| GET / POST | `/admin/api/projects` | List or add a project |
| PUT / DELETE | `/admin/api/projects/<n>` | Update or delete project at index n |
| POST | `/admin/api/projects/reorder` | Reorder projects |
| GET / POST | `/admin/api/experience` | List or add an experience entry |
| PUT / DELETE | `/admin/api/experience/<n>` | Update or delete experience at index n |
| POST | `/admin/api/skills/reorder` | Reorder skills |

---

## Contributing

This is a personal portfolio — forks and inspiration are welcome. If you spot a bug or have a suggestion, feel free to open an issue.

---

## License

Distributed under the MIT License. See `LICENSE` for details.
