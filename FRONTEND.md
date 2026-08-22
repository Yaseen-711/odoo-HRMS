# Dayflow HRMS — Frontend Documentation

Welcome to the frontend architecture and implementation guide for **Dayflow HRMS**. This document details the technology stack, design system, directory layout, routing matrix, API client integration, authentication state management, and real-time features.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: [React 18](https://react.dev/) with [Vite](https://vitejs.dev/) as the build tool.
- **Styling**: Vanilla Tailwind CSS v3 configured with custom dark-mode design tokens.
- **Icons**: [Lucide React](https://lucide.dev/) icon system.
- **Routing**: Client-side single-page app routing via [React Router DOM v6](https://reactrouter.com/).
- **API Transport**: Fetch API encapsulated inside a central `apiClient` service with JWT Bearer authentication headers.
- **Real-Time Layer**: Native WebSocket connection manager communicating with `/api/ws/dashboard`.

---

## 📁 Directory Structure

```
frontend/
├── public/                     # Static assets (favicons, public images)
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── AuthIllustration.jsx  # Marketing graphic & metrics card on login/signup
│   │   ├── DashboardLayout.jsx   # Master layout wrapping sidebar, topbar, & page content
│   │   ├── Header.jsx            # Top navigation bar with search & notification drawer
│   │   ├── InputField.jsx        # Styled text input form field with icon support
│   │   ├── Logo.jsx              # Dayflow brand logo (small & large variants)
│   │   ├── PasswordField.jsx     # Password field with toggleable show/hide eye icon
│   │   └── Sidebar.jsx           # Left navigation bar with role-aware menu links
│   ├── data/                   # Fallback local storage repositories & seed data
│   │   ├── attendance.js         # Mock attendance records & localStorage repo
│   │   ├── employees.js          # Mock employee profiles & localStorage repo
│   │   ├── leave.js              # Mock leave requests & quota balances
│   │   └── notifications.js      # Mock system notifications & repository
│   ├── pages/                  # Page route components
│   │   ├── Attendance.jsx        # Admin shift attendance monitoring & CSV export
│   │   ├── Dashboard.jsx         # Executive overview & quick actions dashboard
│   │   ├── EmployeeAttendance.jsx# Employee personal check-in/out shift log
│   │   ├── EmployeeDashboard.jsx # Employee personal dashboard view
│   │   ├── EmployeeDetail.jsx    # Full employee profile detail view (Admin/Self)
│   │   ├── EmployeeDetailLimited.jsx # Limited coworker profile view (Employee)
│   │   ├── EmployeeDirectory.jsx # Public employee directory search
│   │   ├── Employees.jsx         # Admin employee management directory & onboarding
│   │   ├── EmployeeTimeOff.jsx   # Employee leave request filing & balance tracking
│   │   ├── ForgotPassword.jsx    # Password recovery request page
│   │   ├── Login.jsx             # User login page with quick sandbox pre-fill tools
│   │   ├── Payroll.jsx           # Payroll & compensation management + PDF export
│   │   ├── Profile.jsx           # Own user profile view & edit modal
│   │   ├── Settings.jsx          # System preferences & notification toggles
│   │   ├── Signup.jsx            # Company registration page
│   │   └── TimeOff.jsx           # Admin leave request approval workspace
│   ├── services/               # API integration client services
│   │   ├── apiClient.js          # Central HTTP client wrapper (fetch, JWT, 401 handling)
│   │   ├── attendanceService.js  # Attendance check-in/out, daily & weekly logs
│   │   ├── authService.js        # Login, company signup, password change & session
│   │   ├── dashboardService.js   # Unified dashboard summary data fetcher
│   │   ├── documentService.js    # Employee document upload & retrieval service
│   │   ├── employeeService.js    # Employee directory, profile updates, onboarding
│   │   ├── leaveService.js       # Leave request filing, list, and decision endpoint
│   │   └── payrollService.js     # Salary structure queries & PDF slip downloads
│   ├── App.jsx                 # Route definitions & router provider
│   ├── index.css               # Global CSS & Tailwind directives
│   └── main.jsx                # React application entry point
├── index.html                  # HTML entry point
├── postcss.config.js           # PostCSS configuration
├── tailwind.config.js          # Tailwind CSS theme extension configuration
└── vite.config.js              # Vite dev server configuration (API proxying to port 8000)
```

---

## 🎨 Design System & Color Palette

Dayflow HRMS features a custom dark-mode aesthetic tuned for modern IDEs and workplace dashboards.

### Color Tokens (`tailwind.config.js`)

| Token | Hex / Value | Purpose |
|-------|-------------|---------|
| `canvas` | `#111215` | Main application background (deep charcoal) |
| `canvas-soft` | `#16171b` | Secondary background for headers and sidebars |
| `surface-card` | `#1a1b1f` | Card containers and elevated panels |
| `surface-strong` | `#26272e` | Interactive button backgrounds & hover surfaces |
| `hairline` | `#26272e` | Subtle container border dividers |
| `hairline-strong` | `#32343d` | High-contrast structural borders |
| `primary` | `#f43f5e` | Primary brand accent (Neon Rose / Magenta) |
| `primary-active` | `#e11d48` | Darker rose for button hover/active states |
| `secondary` | `#1e75ff` | Electric blue accent for highlights and badges |
| `ink` | `#f9fafb` | Primary text color (high contrast near-white) |
| `body` | `#9ca3af` | Secondary body text color (slate grey) |
| `muted` | `#6b7280` | Subtitles, captions, and muted indicators |

### Typography & Animations
- **Fonts**: `Inter` (sans-serif) for general text; `JetBrains Mono` (monospace) for IDs, currency, and timestamps.
- **Animations**: Custom `fade-in` (`0.3s ease-out`) for smooth page transitions and modal popups.

---

## 🚦 Navigation & Route Matrix

| Path | Component | Target Role | Description |
|------|-----------|-------------|-------------|
| `/login` | `Login.jsx` | Public | Account authentication page |
| `/signup` | `Signup.jsx` | Public | Company registration page |
| `/forgot-password` | `ForgotPassword.jsx` | Public | Password recovery form |
| `/dashboard` | `Dashboard.jsx` | Admin / Employee | Main executive dashboard overview |
| `/employees` | `Employees.jsx` | Admin / HR | Full employee management directory |
| `/employees/:id` | `EmployeeDetail.jsx` | Admin / Employee | Employee detailed profile view |
| `/directory` | `EmployeeDirectory.jsx` | Employee | Coworker phonebook & directory |
| `/attendance` | `Attendance.jsx` | Admin / HR | Workforce shift logs & CSV export |
| `/my-attendance` | `EmployeeAttendance.jsx` | Employee | Personal shift timer & attendance history |
| `/payroll` | `Payroll.jsx` | Admin / HR | Salary management & PDF payslip download |
| `/time-off` | `TimeOff.jsx` | Admin / HR | Leave approval workspace |
| `/my-time-off` | `EmployeeTimeOff.jsx` | Employee | Personal leave request filing |
| `/profile` | `Profile.jsx` | All | User personal profile settings |
| `/settings` | `Settings.jsx` | All | User preferences & notifications |

---

## 🔐 Session Management & API Client

### Authentication Flow
1. **Login**: User submits credentials to `authService.login(identifier, password)`.
2. **Token Storage**: On HTTP 200, `access_token` is stored in `localStorage.getItem('dayflow_token')`.
3. **User Profile**: `authService` immediately fetches `/api/auth/me` and `/api/employees/me` to enrich the session object stored under `localStorage.getItem('dayflow_current_user')`.
4. **Header Injection**: `apiClient` automatically injects `Authorization: Bearer <token>` on all outbound HTTP requests.
5. **Unauthorized Handling**: On HTTP `401 Unauthorized`, `apiClient` clears localStorage session data and redirects the browser to `/login`.

---

## 📄 Export & Downloading Workflows

### 1. Payslip PDF Export
- Admin clicks **Download Payslip (PDF)** on the Payroll table (`Payroll.jsx`).
- Triggers GET request to `/api/payroll/{employee_id}/slip?month=X&year=Y`.
- The browser processes the binary response as a `Blob` of type `application/pdf` and triggers an automatic browser file download (`payslip_<code >.pdf`).

### 2. Shift Attendance CSV Export
- Admin clicks **Export Report (CSV)** on `Attendance.jsx`.
- Calls GET `/api/attendance/export`.
- Returns an inline CSV stream. The frontend creates a dynamic `URL.createObjectURL(blob)` link to prompt instant CSV download (`attendance_report.csv`).

---

## 🔌 WebSocket Live Integration

The frontend maintains a WebSocket listener to listen for company-wide notifications:
- **WebSocket Endpoint**: `ws://<host>/api/ws/dashboard`
- **Received Events**: `attendance.updated`, `leave.updated`, `payroll.updated`
- **Reaction**: Triggers live UI state re-fetch so dashboard shift counters update instantly without manual page refreshes.
