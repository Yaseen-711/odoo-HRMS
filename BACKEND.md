# Dayflow HRMS — Backend Documentation

Welcome to the backend system design and architecture reference for **Dayflow HRMS**. This document outlines the FastAPI application layer, database schemas, authentication & authorization models, event-driven WebSocket distribution, ARQ background job queue, ReportLab PDF rendering, and CSV data streaming services.

---

## 🛠️ Tech Stack & Dependencies

- **Framework**: [FastAPI 0.115+](https://fastapi.tiangolo.com/) with Python 3.10+
- **ORM & Database**: [SQLAlchemy 2.0 Async](https://www.sqlalchemy.org/) with `asyncpg` driver for PostgreSQL 14+.
- **Database Migrations**: [Alembic](https://alembic.sqlalchemy.org/).
- **Cache & Message Broker**: [Redis](https://redis.io/) (used for Pub/Sub WebSockets and ARQ background job queue).
- **Background Worker**: [ARQ](https://arq-docs.readthedocs.io/) async job processing.
- **Email Dispatch**: Python `smtplib` supporting implicit SSL (port 465) and explicit STARTTLS (port 587).
- **Document Rendering**: [ReportLab](https://www.reportlab.com/) canvas engine for dynamic PDF payslip generation.
- **Security & Auth**: `python-jose` for JWT validation and `passlib` (bcrypt) for password hashing.

---

## 📁 Directory Structure

```
backend/
├── alembic/                    # Database migration scripts & env.py
├── app/
│   ├── api/                    # FastAPI APIRouters
│   │   ├── attendance.py       # Check-in/out, daily/weekly logs, CSV report streaming
│   │   ├── auth.py             # Login, current user info, company signup, password change
│   │   ├── dashboard.py        # Unified summary endpoint for landing metrics
│   │   ├── dependencies.py     # Auth dependencies (require_admin, require_employee, etc.)
│   │   ├── documents.py        # Employee document uploads & downloads
│   │   ├── employees.py        # Employee CRUD, onboarding, profile updates
│   │   ├── leave.py            # Leave request submission, listing, decision workflow
│   │   ├── payroll.py          # Salary structure management & PDF payslip export
│   │   └── websocket.py        # Live WebSocket connection endpoint (/ws/dashboard)
│   ├── core/                   # Application config & core exceptions
│   │   ├── config.py           # BaseSettings loading environment variables from .env
│   │   ├── exceptions.py       # Domain exception mappings to HTTP status codes
│   │   └── security.py         # JWT creation/verification & bcrypt password hashing
│   ├── db/                     # Database engine & session initialization
│   │   ├── base.py             # Base metadata export for Alembic
│   │   └── session.py          # AsyncSession generator & engine setup
│   ├── events/                 # Real-time event publishing infrastructure
│   │   ├── publisher.py        # Redis event publisher (publish_event helper)
│   │   └── schemas.py          # Event payload schema definitions
│   ├── middleware/             # HTTP Middleware
│   │   └── request_id.py       # X-Request-ID header & request timing logging
│   ├── models/                 # SQLAlchemy ORM models
│   │   ├── attendance.py       # Attendance record model & status enum
│   │   ├── company.py          # Company entity model
│   │   ├── document.py         # Employee document model
│   │   ├── employee.py         # Employee profile model
│   │   ├── leave.py            # Leave request model & status/type enums
│   │   ├── salary.py           # Salary structure model & compensation calculation
│   │   └── user.py             # Auth user model & UserRole enum
│   ├── realtime/               # WebSocket connection manager & Redis subscriber
│   │   ├── manager.py          # ConnectionManager tracking active WebSockets per client
│   │   └── subscriber.py       # Async background Redis pub/sub channel listener
│   ├── schemas/                # Pydantic schema validation models
│   │   ├── attendance.py
│   │   ├── auth.py
│   │   ├── dashboard.py
│   │   ├── employee.py
│   │   ├── leave.py
│   │   └── payroll.py
│   ├── services/               # Business domain logic layer
│   │   ├── attendance_service.py # Attendance check-in/out calculation
│   │   ├── dashboard_service.py  # Aggregated metrics calculation
│   │   ├── document_service.py   # Disk storage & metadata management
│   │   ├── email_service.py      # SMTP dispatch engine
│   │   ├── employee_service.py   # Employee CRUD & access checks
│   │   ├── leave_service.py     # Leave request business rules
│   │   ├── login_id_service.py  # Atomic sequence login_id generator
│   │   ├── pdf_service.py        # ReportLab PDF payslip builder
│   │   └── payroll_service.py    # Salary structure & deduction calculations
│   ├── utils/                  # Utility helpers
│   ├── workers/                # ARQ background task workers
│   │   └── jobs.py             # ARQ background worker functions & enqueue helpers
│   └── main.py                 # FastAPI application factory, lifespan, & router mounting
├── logs/                       # Application runtime log outputs
├── scratch/                    # Administrative & maintenance utility scripts
├── tests/                      # Pytest async test suite
├── alembic.ini                 # Alembic configuration file
├── Dockerfile                  # Production container definition
├── docker-compose.yml          # Docker service orchestration (FastAPI + Postgres + Redis)
└── requirements.txt            # Python dependencies
```

---

## 🗄️ Database Schema & Models

```
   ┌───────────┐       1:1       ┌──────────────┐       1:N       ┌──────────────┐
   │   users   │ ───────────────>│  employees   │ ───────────────>│  attendance  │
   └───────────┘                 └──────────────┘                 └──────────────┘
         │                              │
         │ 1:N                          │ 1:N
         v                              v
   ┌───────────┐                 ┌──────────────┐
   │ companies │                 │leave_requests│
   └───────────┘                 └──────────────┘
                                        │ 1:1
                                        v
                                 ┌──────────────┐
                                 │salary_structs│
                                 └──────────────┘
```

### Table Specifications

#### 1. `users`
- `id` (Integer, Primary Key)
- `email` (String, Unique, Index)
- `hashed_password` (String)
- `login_id` (String, Unique, Index)
- `role` (Enum: `ADMIN`, `HR_OFFICER`, `EMPLOYEE`)
- `must_change_password` (Boolean)
- `is_active` (Boolean)
- `company_id` (ForeignKey `companies.id`, Optional)

#### 2. `employees`
- `id` (Integer, Primary Key)
- `user_id` (ForeignKey `users.id`, Unique, OnDelete CASCADE)
- `company_id` (ForeignKey `companies.id`, Optional)
- `employee_code` (String, Unique, Index)
- `first_name` (String), `last_name` (String)
- `department` (String), `job_position` (String)
- `phone` (String), `address` (Text), `location` (String)
- `date_of_birth` (Date), `date_of_joining` (Date)
- `company` (String), `manager` (String), `profile_picture` (String)

#### 3. `attendance`
- `id` (Integer, Primary Key)
- `employee_id` (ForeignKey `employees.id`, OnDelete CASCADE)
- `date` (Date, Index)
- `check_in` (DateTime, UTC)
- `check_out` (DateTime, UTC)
- `work_hours` (Float), `extra_hours` (Float)
- `status` (Enum: `PRESENT`, `ABSENT`, `HALF_DAY`, `LEAVE`)

#### 4. `leave_requests`
- `id` (Integer, Primary Key)
- `employee_id` (ForeignKey `employees.id`, OnDelete CASCADE)
- `leave_type` (Enum: `PAID`, `SICK`, `UNPAID`)
- `start_date` (Date), `end_date` (Date)
- `remarks` (Text), `approval_comment` (Text)
- `status` (Enum: `PENDING`, `APPROVED`, `REJECTED`)
- `approved_by` (ForeignKey `users.id`, Optional)

#### 5. `salary_structures`
- `id` (Integer, Primary Key)
- `employee_id` (ForeignKey `employees.id`, Unique, OnDelete CASCADE)
- `basic_salary` (Float), `hra` (Float), `standard_allowance` (Float)
- `performance_bonus` (Float), `lta` (Float), `fixed_allowance` (Float)
- `professional_tax` (Float), `pf` (Float)
- `effective_from` (Date, Optional)

---

## ⚡ API Router Reference

| Router | Method | Endpoint | Access | Purpose |
|--------|--------|----------|--------|---------|
| **Auth** | POST | `/api/auth/login` | Public | Authenticate user & return JWT token |
| | GET | `/api/auth/me` | Authenticated | Get current authenticated user details |
| | POST | `/api/auth/signup` | Public | Register new company & initial Admin user |
| | POST | `/api/auth/change-password` | Authenticated | Change current user password |
| **Employees** | GET | `/api/employees` | Admin / HR | List all employees in directory |
| | POST | `/api/employees` | Admin / HR | Onboard new employee & generate login ID |
| | GET | `/api/employees/me` | Employee | Get own employee profile details |
| | PATCH | `/api/employees/me` | Employee | Update permitted personal profile fields |
| | GET | `/api/employees/{id}` | Admin / Self | Get employee record by ID |
| | PATCH | `/api/employees/{id}` | Admin / HR | Admin update of employee record |
| **Attendance**| POST | `/api/attendance/check-in` | Employee | Record today's check-in timestamp |
| | POST | `/api/attendance/check-out` | Employee | Record check-out & calculate work hours |
| | GET | `/api/attendance/daily` | Admin / Self | Fetch daily attendance record |
| | GET | `/api/attendance/weekly` | Admin / Self | Fetch 7-day attendance records |
| | GET | `/api/attendance` | Admin | List all attendance records |
| | GET | `/api/attendance/export` | Admin | Stream attendance report as CSV file |
| **Payroll** | GET | `/api/payroll/me` | Employee | Get own salary structure & calculations |
| | GET | `/api/payroll/{id}` | Admin / Self | Get salary structure for an employee |
| | POST | `/api/payroll/{id}` | Admin | Create salary structure for an employee |
| | PATCH | `/api/payroll/{id}` | Admin | Update salary structure components |
| | GET | `/api/payroll/{id}/slip` | Admin / Self | Download PDF payslip report |
| **Leave** | POST | `/api/leave` | Employee | File a new leave request |
| | GET | `/api/leave` | Admin / Self | List leave requests |
| | PATCH | `/api/leave/{id}/decide` | Admin | Approve or reject a leave request |
| **Dashboard** | GET | `/api/dashboard/summary` | Employee | Unified aggregate payload for landing view |
| **Real-Time** | WS | `/api/ws/dashboard` | Authenticated | WebSockets connection for live updates |

---

## 📡 Event-Driven Architecture & Real-Time WebSockets

```
  FastAPI Route Action
         │
         ▼
  publish_event() (app/events/publisher.py)
         │
         ▼
   Redis Pub/Sub Channel ("hrms:dashboard")
         │
         ▼
  Redis Subscriber Loop (app/realtime/subscriber.py)
         │
         ▼
  ConnectionManager Broadcast (app/realtime/manager.py)
         │
         ▼
  Connected WebSockets (/api/ws/dashboard)
```

1. **Publisher**: When an action occurs (e.g. check-in, leave approval), `publish_event(event_type, employee_id)` pushes a JSON payload onto the Redis Pub/Sub channel `hrms:dashboard`.
2. **Subscriber**: The async lifespan task running in `app/realtime/subscriber.py` receives messages from Redis and forwards them to `ConnectionManager`.
3. **Broadcast**: `ConnectionManager` broadcasts JSON updates to active client WebSockets.

---

## 📧 ARQ Background Email Dispatch

When a new employee is onboarded, credential dispatch is offloaded to a background task queue:
- **Queue**: Redis ARQ Queue configured via `settings.REDIS_URL`.
- **Worker Job**: `send_employee_credentials_job` in `app/workers/jobs.py`.
- **SMTP Protocol**:
  - `port 465`: Uses `smtplib.SMTP_SSL` (implicit SSL/TLS required for Gmail on port 465).
  - `port 587`: Uses `smtplib.SMTP` with `STARTTLS`.
