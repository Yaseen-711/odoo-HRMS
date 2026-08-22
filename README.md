# 🚀 Dayflow HRMS — Next-Generation HR & Workforce Management System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Realtime-Redis_Pub/Sub-DC382D.svg?style=flat&logo=redis)](https://redis.io/)

**Dayflow HRMS** is an enterprise-grade Human Resource Management System engineered for high-performance workforce operations, employee onboarding, shift tracking, automated payroll rendering, and real-time activity feeds.

---

## 📚 Technical Documentation Quick Links

For in-depth architectural and developer documentation, please refer to the dedicated specification guides:

- 🎨 **[Frontend Technical Guide (FRONTEND.md)](./FRONTEND.md)** — React 18 SPA architecture, Tailwind CSS design system, routing matrix, API client integration, and real-time state management.
- ⚙️ **[Backend Technical Guide (BACKEND.md)](./BACKEND.md)** — FastAPI application layer, SQLAlchemy 2.0 Async, PostgreSQL schema, Redis Pub/Sub WebSockets, ARQ background email dispatch, and ReportLab PDF engine.

---

## 🌟 Key Features & Capability Matrix

### 👤 Employee & Directory Management
- **Atomic Sequence Login ID Generation**: System-generated identifiers (`ADMIN-0001`, `EMP-0001`) with temporary password issuance.
- **Role-Based Access Control**: Granular roles (`ADMIN`, `HR_OFFICER`, `EMPLOYEE`) securing sensitive payroll and banking attributes.
- **Coworker Directory**: Quick employee phonebook search with position and department filtering.

### ⏱️ Attendance & Shift Tracking
- **Interactive Shift Timer**: Live clock-in/out widget calculating work hours and overtime duration in real time.
- **Attendance Status Downgrade Rules**: Automated classification (`PRESENT`, `HALF_DAY`, `ABSENT`, `LEAVE`).
- **Streaming CSV Export**: One-click generation of workforce attendance CSV logs.

### 💰 Payroll & Compensation Engine
- **Salary Structure Management**: Component-based compensation calculation (Basic, HRA, Allowances, PF, Professional Tax).
- **ReportLab PDF Payslip Generator**: Dynamic pixel-perfect PDF payslip rendering served inline or downloadable.

### 🏖️ Leave & Time-Off Management
- **Multi-Type Leave Requests**: Paid, Sick, and Unpaid leave workflows with quota balance tracking.
- **Approval Workspace**: Admin review portal for instant leave approval or rejection.

### ⚡ Real-Time Live Updates & Email Dispatch
- **WebSocket Broadcast**: Redis Pub/Sub distribution powering live UI updates across connected client sessions.
- **Asynchronous Mail Queue**: ARQ background worker executing SMTP email dispatch over SSL (port 465) / STARTTLS (port 587).

---

## 🏗️ High-Level System Architecture

```
               ┌───────────────────────────────────────────────┐
               │              React 18 Single Page App         │
               │            (Vite + Tailwind CSS + Lucide)     │
               └───────────────────────┬───────────────────────┘
                                       │
                         REST API (HTTP) / WebSockets (WS)
                                       │
                                       ▼
               ┌───────────────────────────────────────────────┐
               │             FastAPI Application Server        │
               │          (AsyncSQLAlchemy + Pydantic v2)      │
               └───────────┬───────────────────────┬───────────┘
                           │                       │
           Async DB Driver │                       │ Pub/Sub & Job Queue
           (asyncpg)       ▼                       ▼
                   ┌───────────────┐       ┌───────────────┐
                   │  PostgreSQL   │       │     Redis     │
                   │   Database    │       │ Message Broker│
                   └───────────────┘       └───────┬───────┘
                                                   │
                                            Worker │ (ARQ)
                                                   ▼
                                           ┌───────────────┐
                                           │  Gmail SMTP   │
                                           │ Mail Dispatch │
                                           └───────────────┘
```

---

## 🛠️ Technology Stack

| Domain | Technology | Purpose |
|--------|------------|---------|
| **Frontend** | React 18 + Vite | High-speed Single Page Application framework |
| **Styling** | Tailwind CSS v3 | Custom dark-mode design system & utility classes |
| **Icons** | Lucide React | Modern UI icon library |
| **Backend** | FastAPI | High-performance async Python web framework |
| **ORM** | SQLAlchemy 2.0 Async | Asynchronous Object-Relational Mapping |
| **Database** | PostgreSQL 14+ | Relational data persistence engine |
| **Pub/Sub & Queue** | Redis | WebSockets event distribution & ARQ task broker |
| **Background Tasks** | ARQ | Async background job processing |
| **PDF Generation** | ReportLab | Programmatic PDF canvas rendering |
| **Email Protocol** | SMTP (Implicit SSL / STARTTLS) | Automated credential email dispatch |

---

## 🚀 Quickstart & Installation Guide

### Prerequisites
- **Node.js**: v18.0.0+ and `npm`
- **Python**: v3.10+
- **PostgreSQL**: Running instance on port `5432`
- **Redis**: Running instance on port `6379`

---

### Option A: One-Click Launch (Windows)

Simply double-click **`run_project.bat`** in the root directory. It automatically launches both backend and frontend servers in separate terminal windows:

```cmd
run_project.bat
```

- **Frontend App**: `http://localhost:5173`
- **Backend Swagger Docs**: `http://127.0.0.1:8000/docs`

---

### Option B: Manual Setup

#### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env configuration file (refer to .env.example)
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start FastAPI dev server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node modules
npm install

# Start Vite development server
npm run dev
```

---

## 🔑 Pre-Configured Test Accounts

The system comes pre-populated with 3 default accounts for evaluator testing:

| Role | Employee Name | Login ID / Email | Password | Access Privileges |
|------|---------------|------------------|----------|-------------------|
| **ADMIN** | Chinmayanand Nk | `nkchinmayanandunk@gmail.com` | `123456` | Full administrative access to employees, payroll PDF export, attendance CSV export, and leave decisions |
| **EMPLOYEE** | Anish Kumar | `anishk.s149@gmail.com` | `123456` | Personal dashboard, shift clock-in/out, leave filing, profile updates |
| **EMPLOYEE** | Yaseen S | `yaseen0706@gmail.com` | `123456` | Personal dashboard, shift clock-in/out, leave filing, profile updates |

*Note: You can also use the **Quick Sandbox Logins** buttons on the login screen (`/login`) to pre-fill test credentials with one click.*

---

## ⚙️ Environment Variables Reference (`backend/.env`)

```env
PROJECT_NAME=Nitte Hack Backend
VERSION=0.1.0
API_PREFIX=/api
DATABASE_URL=postgresql://hackathon_user:2007@chinmay-alienware-16-aurora-ac16250:5432/hackathon_test
SECRET_KEY=TDLIGMJ4_LQhIokGwNX8suRZF_U3WDWc_7jbvnkf0ak
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REDIS_URL=redis://100.85.59.51:6379
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=nkchinmayanandunk@gmail.com
SMTP_PASSWORD=aboq wwdy rqnk qegu
SMTP_FROM=nkchinmayanandunk@gmail.com
SMTP_USE_TLS=false
```

---

## 📄 License & Documentation Summary

For comprehensive technical deep-dives into specific subsystems, see:
- 📖 **[FRONTEND.md](./FRONTEND.md)** for UI components, design tokens, routing matrix, and React state management.
- 📖 **[BACKEND.md](./BACKEND.md)** for FastAPI endpoint references, SQLAlchemy schemas, WebSocket Pub/Sub flows, and ARQ workers.