import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Dashboard } from "./pages/Dashboard";
import { Employees } from "./pages/Employees";
import { EmployeeDetail } from "./pages/EmployeeDetail";
import { Attendance } from "./pages/Attendance";
import { TimeOff } from "./pages/TimeOff";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import { Payroll } from "./pages/Payroll";

// Employee role pages
import { EmployeeDashboard } from "./pages/EmployeeDashboard";
import { EmployeeDirectory } from "./pages/EmployeeDirectory";
import { EmployeeDetailLimited } from "./pages/EmployeeDetailLimited";
import { EmployeeAttendance } from "./pages/EmployeeAttendance";
import { EmployeeTimeOff } from "./pages/EmployeeTimeOff";
import { authService } from "./services/authService";

const DashboardRoute = () => {
  const user = authService.getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role?.toUpperCase();
  if (role === "ADMIN" || role === "HR") {
    return <Dashboard />;
  }
  return <EmployeeDashboard />;
};

const EmployeesRoute = () => {
  const user = authService.getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role?.toUpperCase();
  if (role === "ADMIN" || role === "HR") {
    return <Employees />;
  }
  return <EmployeeDirectory />;
};

const EmployeeDetailRoute = () => {
  const user = authService.getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role?.toUpperCase();
  if (role === "ADMIN" || role === "HR") {
    return <EmployeeDetail />;
  }
  return <EmployeeDetailLimited />;
};

const AttendanceRoute = () => {
  const user = authService.getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role?.toUpperCase();
  if (role === "ADMIN" || role === "HR") {
    return <Attendance />;
  }
  return <EmployeeAttendance />;
};

const TimeOffRoute = () => {
  const user = authService.getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role?.toUpperCase();
  if (role === "ADMIN" || role === "HR") {
    return <TimeOff />;
  }
  return <EmployeeTimeOff />;
};

const PayrollRoute = () => {
  const user = authService.getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role?.toUpperCase();
  if (role === "ADMIN" || role === "HR") {
    return <Payroll />;
  }
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Core HRMS Dashboard & Sub-pages */}
        <Route path="/dashboard" element={<DashboardRoute />} />
        <Route path="/employees" element={<EmployeesRoute />} />
        <Route path="/employees/:id" element={<EmployeeDetailRoute />} />
        <Route path="/attendance" element={<AttendanceRoute />} />
        <Route path="/time-off" element={<TimeOffRoute />} />
        <Route path="/payroll" element={<PayrollRoute />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* Admin manual path redirects to Dashboard (which routes correctly by role) */}
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
        <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />
        
        {/* Fallback route - redirect any undefined page back to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

