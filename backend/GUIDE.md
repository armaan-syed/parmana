# Pramāṇa — Backend & Database Setup & Testing Guide

This guide is for **Person 1 (Backend)** and the team (**Person 2 - Frontend**, **Person 3 - Cloud**) to run, test, and integrate the FastAPI backend and PostgreSQL database.

---

## 1. Quick Overview

- **Backend Framework**: FastAPI (Python 3.10+)
- **ORM & Database**: SQLAlchemy 2.x + PostgreSQL (`pramana_db`)
- **Containerization**: Docker Compose (runs PostgreSQL and Backend together without local database setup)
- **API Documentation**: Interactive Swagger UI at `http://localhost:8000/docs`

---

## 2. Running Options

### Option A: You do NOT have PostgreSQL installed (Recommended: Docker Compose)

If you don't have PostgreSQL installed on your computer, Docker can run both PostgreSQL and the Backend automatically in isolated containers.

1. **Start Docker Desktop**:
   Make sure Docker Desktop is running on Windows.
2. **Navigate to the Backend directory**:
   ```powershell
   cd "c:\laptop backup\Documents\Aradhya\SEM5\CCL\Mini Project\Pramana\backend"
   ```
3. **Configure the backend environment**:
   ```powershell
   Copy-Item .env.example .env
   ```
   Set `SECRET_KEY` in `.env` to a private random value (see the command below). Never commit `.env`.
4. **Launch with Docker Compose**:
   ```powershell
   docker compose up -d --build
   ```
5. **Verify it's running**:
   ```powershell
   docker compose ps
   ```
   You will see:
   - `pramana-postgres` running on port `5432`
   - `pramana-backend` running on port `8000`
6. **Shut down when done**:
   ```powershell
   docker compose down
   ```

---

### Option B: Running PostgreSQL in Docker & Backend locally with Python

If you want live reload while coding:

1. **Start only PostgreSQL container**:
   ```powershell
   cd "c:\laptop backup\Documents\Aradhya\SEM5\CCL\Mini Project\Pramana\backend"
   docker compose up -d db
   ```
2. **Setup your local Python Virtual Environment**:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
3. **Create your `.env` file**:
   Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
   *(Ensure `DATABASE_URL=postgresql+psycopg2://postgres:postgrespassword@localhost:5432/pramana_db`)*
4. **Start the FastAPI server**:
   ```powershell
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

---

### Option C: You already have PostgreSQL installed locally on your PC

1. **Create the database in your local PostgreSQL**:
   ```sql
   CREATE DATABASE pramana_db;
   ```
2. **Create `backend/.env`**:
   Set your actual PostgreSQL credentials in `backend/.env`:
   ```env
   DATABASE_URL=postgresql+psycopg2://postgres:<your_password>@localhost:5432/pramana_db
   ```
3. **Run Backend**:
   ```powershell
   cd "c:\laptop backup\Documents\Aradhya\SEM5\CCL\Mini Project\Pramana\backend"
   .\venv\Scripts\Activate.ps1
   uvicorn app.main:app --reload --port 8000
   ```

---

## 3. How to Inspect Database in DBeaver

1. Open **DBeaver**.
2. Click **Database** → **New Database Connection** → **PostgreSQL**.
3. Connection settings:
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Database**: `pramana_db`
   - **Username**: `postgres`
   - **Password**: `postgrespassword` (or your local password if using Option C)
4. Click **Test Connection** (Accept prompt to download driver if prompted) → Click **Finish**.
5. Browse tables under `pramana_db` → `Schemas` → `public` → `Tables`:
   - `users`: Registered customer accounts and explicitly provisioned administrators. Passwords are stored as hashes.
   - `customers`: Customer baseline records.
   - `kyc_requests`: KYC submission requests with match statuses.
   - `documents`: Document upload metadata.
   - `audit_logs`: Immutable logs of every verification & update.

---

## 4. Testing Endpoints (Swagger UI & Postman)

### Interactive Swagger UI
Open your browser to:
👉 **`http://localhost:8000/docs`**

You can test every endpoint directly:

1. **`GET /health`**
   - Returns application status and tests whether PostgreSQL is connected.
2. **`POST /auth/register`**
   - Request body: `{"fullName":"Example Customer","email":"customer@example.com","password":"A-long-password-123","confirmPassword":"A-long-password-123"}`
   - Registration always assigns the `customer` role; a supplied role is ignored.
3. **`POST /auth/login`**
   - Request body: `{"email":"customer@example.com","password":"A-long-password-123"}`
   - Copy the returned token into Swagger's **Authorize** dialog as a Bearer token.
4. **`GET /auth/me`**
   - Validates the token and returns the authenticated database identity.
5. **`GET /admin/requests`**
   - Returns all queued KYC cases (`KYC-2841`, `KYC-2838`, etc.).
6. **`POST /admin/requests/{request_id}/update-and-process`**
   - Resolves a mismatch and automatically writes to `audit_logs`.
   - Body:
     ```json
     {
       "field": "Address",
       "value": "18 Lakeview Road, Pune",
       "reason": "Verified against original Voter ID proof",
       "adminName": "Nisha Verma"
     }
     ```
7. **`GET /audit/logs`**
   - Returns the complete tamper-evident audit history.

### Provision an administrator

There is no public administrator registration. With the backend virtual environment activated and `backend/.env` configured, run:

```powershell
python -m app.cli create-admin
```

The command prompts for the administrator's name, email, and password without echoing the password. It refuses to overwrite an existing account.

Set `SECRET_KEY` in `backend/.env` to a unique random value of at least 32 characters. For example:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Tokens are signed JWT bearer tokens with an expiry controlled by `ACCESS_TOKEN_EXPIRE_MINUTES` (default 60 minutes). Passwords use pwdlib's recommended Argon2id hashing scheme. The frontend keeps the token in tab-scoped `sessionStorage`, never `localStorage`.

---

## 5. Connecting Frontend (Person 2) to Backend

Configure the frontend to use the FastAPI service:
- Add `VITE_API_BASE_URL=http://localhost:8000` to `Pramana/.env`.
- Set `VITE_API_BASE_URL=http://localhost:8000` in the frontend environment.
- Sign up using the **Create Account** form, then sign in with the new credentials.
- Customer and administrator APIs verify the bearer token against the database; customer identifiers in request bodies or query parameters do not override the authenticated identity.

---

## 6. Git & Security Rules

- **Never push `.env` to GitHub** (it is excluded by `.gitignore`).
- Only **`.env.example`** is committed so teammates have the template.
- Virtual environments (`venv/`), Python cache (`__pycache__/`), and test caches (`.pytest_cache/`) are ignored.
