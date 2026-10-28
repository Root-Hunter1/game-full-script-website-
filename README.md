<p align="center">
  <img src="preview_1600x800.png" width="100%" alt="Root-Hunter1 banner">
</p>

# ApexGamer — Top-up Website: Full Setup Guide

This project is a game top-up / wallet website.

- **Backend:** Python (FastAPI) + SQLAlchemy
- **Database:** PostgreSQL
- **Frontend:** HTML / CSS / JavaScript (served by the same backend server)
- **Admin Panel:** `/admin-login.html`

---

## ⚠️ Before You Start

1. Copy `backend/.env.example` to `backend/.env` and fill in your own values. Never share or commit `.env`.
2. The database dump contains only the site catalog (games, packages, gift cards, settings). It has no users, orders, deposits or payment accounts. Create your own admin account (see section 4).
3. Change every placeholder password (`change_me`) and the JWT secret before going live.

---

## 1. Folder Structure

```
project_restore/
├── start.sh                 # Script to start the server
├── database_backup.sql      # PostgreSQL database dump (catalog data: games, packages, gift cards, settings)
├── README.md                # This file
├── backend/
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Template: copy to .env and fill in your values
│   └── app/                 # FastAPI application code
│       ├── main.py          # Entry point
│       ├── config.py        # Reads settings from .env
│       ├── database.py      # Database connection
│       ├── models.py        # Table definitions
│       ├── api/             # All API routes (auth, orders, admin, wallet, ...)
│       └── suppliers/       # Supplier (VertexBazaar) integration
└── frontend/
    ├── index.html           # Main website
    ├── admin-login.html     # Admin login page
    ├── admin.html           # Admin dashboard
    ├── reset-password.html  # Password reset page
    ├── app.js, style.css    # Main site scripts and styles
    └── admin-*.js/.css      # Admin panel scripts and styles
```

---

## 2. Requirements

| Software | Version | Why it is needed |
|---|---|---|
| Python | 3.10 or newer | Runs the backend |
| PostgreSQL | 18 (the dump was made with PostgreSQL 18; older versions may fail to restore it) | Database |
| pip and venv | Included with Python | Installs dependencies |
| Git (optional) | Any | Version control |

**Linux / Ubuntu:**
```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip postgresql postgresql-contrib
```

**Termux (Android):**
```bash
pkg install python postgresql zip
```

**Windows:** Install Python from python.org and PostgreSQL from postgresql.org. Then run the commands below in PowerShell or Git Bash.

---

## 3. Step-by-Step Setup

### Step 1: Extract the zip

```bash
unzip project_restore.zip
cd project_restore
```

### Step 2: Create the PostgreSQL user and database

Start PostgreSQL, then create a user and a database. The examples below use user `apex`, password `change_me` and database `topup`. Change these to your own values.

```bash
sudo -u postgres psql -c "CREATE USER apex WITH PASSWORD 'change_me';"
sudo -u postgres psql -c "CREATE DATABASE topup OWNER apex;"
sudo -u postgres psql -d topup -c "GRANT ALL ON SCHEMA public TO apex;"
```

> On Termux, `sudo` is not needed. Run `psql` directly, or start the server first with `initdb` and `pg_ctl start`. Then run:
> ```bash
> psql postgres -c "CREATE USER apex WITH PASSWORD 'change_me';"
> psql postgres -c "CREATE DATABASE topup OWNER apex;"
> psql postgres -d topup -c "GRANT ALL ON SCHEMA public TO apex;"
> ```
> Replace `change_me` with your own password. Use the same password in `DATABASE_URL` in Step 5.

> **Important (PostgreSQL 15 and newer):** If the restore in Step 3 shows `permission denied for schema public`, the `GRANT` command above was missed. Run it, drop the database, create it again, and restore again:
> ```bash
> sudo -u postgres psql -c "DROP DATABASE topup;"
> sudo -u postgres psql -c "CREATE DATABASE topup OWNER apex;"
> sudo -u postgres psql -d topup -c "GRANT ALL ON SCHEMA public TO apex;"
> ```

### Step 3: Restore the database dump

```bash
psql "postgresql://apex:change_me@localhost:5432/topup" -f database_backup.sql
```

To check the restore, run `psql "postgresql://apex:change_me@localhost:5432/topup" -c "\dt"`. You should see tables such as `users`, `games` and `orders`.

If it finishes without errors, all tables are created and the catalog data (games, game_packages, gift_cards, settings, supplier mappings) is loaded. The users, orders, deposits and payment accounts tables are created empty.

### Step 4: Create the Python environment and install dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### Step 5: Create `backend/.env`

Copy `backend/.env.example` to `backend/.env` (`cp backend/.env.example backend/.env`) and fill in your own values. Example:

```env
# Database (must use the asyncpg driver)
DATABASE_URL=postgresql+asyncpg://apex:change_me@localhost:5432/topup

# JWT (login tokens)
JWT_SECRET_KEY=put-a-long-random-string-here
JWT_ALGORITHM=HS256

# Public address of the site (used in password reset email links)
# Local testing:
FRONTEND_URL=http://127.0.0.1:8000
# Live site: FRONTEND_URL=https://your-domain.com

# Gmail SMTP (for sending emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM=your-gmail@gmail.com

# Supplier API (VertexBazaar). Keep live mode false while testing.
SUPPLIER_API_URL=
SUPPLIER_API_KEY=
SUPPLIER_API_SECRET=
SUPPLIER_LIVE_MODE=false

# Google Sign-in (optional)
GOOGLE_CLIENT_ID=
```

**Important notes:**
- `DATABASE_URL` must start with `postgresql+asyncpg://`.
- The app will not start without `DATABASE_URL` and `JWT_SECRET_KEY`. These are required.
- Never commit `.env` to Git. It is already listed in `.gitignore`.

**How to generate a JWT secret:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```
Paste the output as the value of `JWT_SECRET_KEY`.

**How to create a Gmail App Password:**
1. Open your Google Account, go to Security, and turn on 2-Step Verification.
2. Go to Security → App passwords and create a new app password.
3. Paste the 16-character password as `SMTP_PASSWORD`. Do not use your normal Gmail password.

### Step 6: Start the server

From the project root (where `start.sh` is), with the venv activated:

```bash
source backend/venv/bin/activate
bash start.sh
```

This runs `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

Once it is running:
- **Website:** http://127.0.0.1:8000
- **Admin login:** http://127.0.0.1:8000/admin-login.html
- **API docs:** http://127.0.0.1:8000/docs

> On first start, the app checks and adds any missing tables and columns automatically (`create_tables`). It is safe to restart the server.

---

## 4. Admin Panel

### Login details

| | |
|---|---|
| **Login page** | http://127.0.0.1:8000/admin-login.html |

There is no default admin account in this package. The easiest way to create the first admin is directly in the database, so you do not need email verification. Run these commands from the project root (with the venv activated):

```bash
cd backend
HASH=$(python3 -c "from app.security import hash_password; print(hash_password('your-strong-password'))")
cd ..
psql "postgresql://apex:change_me@localhost:5432/topup" -c "INSERT INTO users (name, email, password_hash, created_at, wallet_balance, is_admin) VALUES ('Admin', 'your@email.com', '$HASH', NOW(), 0, true);"
```

Replace `your-strong-password` and `your@email.com` with your own values. Then log in at http://127.0.0.1:8000/admin-login.html.

> **Note:** Normal sign-up sends a verification email, which needs the SMTP settings in `.env` (Step 5). Until those are set, use the command above to create the admin.

### Creating a new admin
The user must first sign up on the website. Then run this in the database:
```sql
UPDATE users SET is_admin = true WHERE email = 'new-admin@gmail.com';
```
With psql:
```bash
psql "postgresql://apex:change_me@localhost:5432/topup" -c "UPDATE users SET is_admin = true WHERE email = 'new-admin@gmail.com';"
```

### Admin password reset (if you forget it)
1. Go to the backend folder, activate the venv, and generate a bcrypt hash:
```bash
cd backend
source venv/bin/activate
python3 -c "from app.security import hash_password; print(hash_password('your-new-password'))"
```
2. Copy the hash that is printed and save it to the database:
```bash
psql "postgresql://apex:change_me@localhost:5432/topup" -c "UPDATE users SET password_hash = 'paste-hash-here' WHERE email = 'your-admin@gmail.com';"
```

### What the admin panel contains
- **Games / Packages:** add and edit games and packages, set prices
- **Orders:** view all orders and change their status
- **Wallet / Payments:** approve deposits, edit payment accounts
- **Gift cards:** create and manage gift cards
- **Users:** user list and wallet balances
- **Email / Password settings:** change the admin email and password
- **Contact:** edit the site's contact information

---

## 5. Google Sign-in Setup (optional)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Go to APIs & Services → Credentials → Create Credentials → **OAuth client ID**. Choose application type **Web application**.
3. Under **Authorized JavaScript origins**, add:
   - `http://127.0.0.1:8000`
   - `http://localhost:8000`
   - your live domain, if you have one
4. Copy the **Client ID** into `backend/.env` as `GOOGLE_CLIENT_ID=`. The frontend fetches it from `/auth/google/config`, so you do not need to put it anywhere else.
5. Restart the server.

---

## 6. Supplier API (VertexBazaar) Setup

- For testing, keep `SUPPLIER_LIVE_MODE=false`. This does not charge the real supplier.
- Before going live, fill in `SUPPLIER_API_URL`, `SUPPLIER_API_KEY` and `SUPPLIER_API_SECRET`, then set `SUPPLIER_LIVE_MODE=true`.
- Supplier game/package mappings are stored in the `supplier_product_mappings` table.

---

### Running without a supplier API (manual mode)

You do not need a VertexBazaar account to run this store. Leave the supplier settings empty and keep `SUPPLIER_LIVE_MODE=false`. In this mode the store works fully, but you deliver top-ups yourself:

- **Game orders:** When an order is paid, open it in the admin panel and click **Approve & Send**. Because live mode is off, no supplier order is placed. The order moves to `processing`. Top up the player's account yourself, then set the order status to `completed`.
- **Gift card orders:** These are always delivered manually. Approve the order, send the code to the customer, then mark it `completed`.
- **Packages without a supplier mapping:** The order is marked `no_supplier_mapping`. Deliver it manually and mark it `completed`.

To use automatic delivery later, get your own supplier account, fill in `SUPPLIER_API_URL`, `SUPPLIER_API_KEY` and `SUPPLIER_API_SECRET`, and set `SUPPLIER_LIVE_MODE=true` (see the supplier section above). Test the flow in test mode first.

---

## 7. Places to Change for Your Own Site

| What to change | Where |
|---|---|
| WhatsApp number (shown on site, WhatsApp link) | `backend/app/api/site_contact.py`, `frontend/app.js` (search for `8800000000000`), `frontend/gift-checkout.js` (`CONTACT_WHATSAPP_INTL`) |
| Phone number (call button) | `backend/app/api/site_contact.py`, `frontend/app.js` (search for `tel:+8800000000000`) |
| Contact / admin email (support and gift card emails) | `backend/app/api/site_contact.py`, `backend/app/api/support.py` (`ADMIN_EMAIL`), `frontend/gift-checkout.js` (`CONTACT_EMAIL`) |
| Contact values in the database | Admin panel → Contact Details, or the `site_settings` table |

> **Note:** The contact numbers and emails in this package are placeholders (`8800000000000`, `your-email@example.com`). Replace them with your own values in every place listed above before going live. Links such as WhatsApp will not work until you do.
| Site domain (canonical link) | `frontend/index.html` (search for `https://apexgamer.com/`) |
| Site name | `backend/app/main.py` (title) and `backend/app/config.py` (app_name) |
| Logo | `frontend/apex-logo.png` |
| Theme / colors | `frontend/style.css`, `frontend/theme-dark.css` |
| Robots and sitemap | `frontend/robots.txt`, `frontend/sitemap.xml` (update the domain) |

---

## 8. Troubleshooting

| Problem | Solution |
|---|---|
| `DATABASE_URL not found` / `ValidationError` | Check that `backend/.env` exists and includes `DATABASE_URL` and `JWT_SECRET_KEY`. |
| `password authentication failed` | The user and password in `DATABASE_URL` must match your PostgreSQL user. |
| `could not connect to server` | Make sure PostgreSQL is running: `sudo systemctl status postgresql` |
| `ModuleNotFoundError` | Activate the venv and run `pip install -r requirements.txt`. |
| `Admin access required` | The user's `is_admin` is not `true`. See "Creating a new admin" above. |
| Emails are not sending | Make sure you are using a Gmail App Password and 2-Step Verification is on. |
| Google login does not work | Make sure your URL is listed under Authorized JavaScript origins. |
| Port 8000 is already in use | Change `--port 8000` in `start.sh`, or stop the process already using it. |

---

## 9. Security Checklist (before going live)

- [ ] Your admin account has been created and is the only admin
- [ ] `JWT_SECRET_KEY` is a new, long, random string
- [ ] The database password is strong and unique
- [ ] `FRONTEND_URL` is set to your real domain
- [ ] `SUPPLIER_LIVE_MODE` is `true` only when you are ready
- [ ] `.env` and `database_backup.sql` are not in any public location
- [ ] HTTPS is enabled on the live server
