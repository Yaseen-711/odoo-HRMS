import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Activity,
  Clock,
  Calendar,
  User as UserIcon,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Plus
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { authService } from "../services/authService";
import { attendanceService } from "../services/attendanceService";
import { leaveRepository } from "../data/leave";
import { attendanceRepository } from "../data/attendance";
import { employeeRepository } from "../data/employees";
import { notificationRepository } from "../data/notifications";
import { InputField } from "../components/InputField";
import { PasswordField } from "../components/PasswordField";

export const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Employee-specific profile and stats
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [leaveBalances, setLeaveBalances] = useState({ PAID: 0, SICK: 0, UNPAID: 0 });
  const [stats, setStats] = useState({
    presentDays: 0,
    absentDays: 0,
    onLeaveDays: 0,
    avgHours: "0h 0m",
    attendanceRate: 0,
    paidLeaveUsed: 0
  });

  // Clock widget states
  const [todayAttendance, setTodayAttendance] = useState({
    status: "Absent",
    check_in: "--",
    check_out: "--",
    duration: "0h 0m"
  });
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [timerIntervalId, setTimerIntervalId] = useState(null);

  // Personal activities list
  const [recentActivities, setRecentActivities] = useState([]);

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Search Assistant Prompt State
  const [askInput, setAskInput] = useState("");
  const [askSuccessMsg, setAskSuccessMsg] = useState("");

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setCurrentUser(user);

    // Check if password change is forced
    const queryParams = new URLSearchParams(location.search);
    if (user.must_change_password || queryParams.get("change_password") === "true") {
      setShowPasswordModal(true);
    }

    loadDashboardData(user);

    return () => {
      if (timerIntervalId) clearInterval(timerIntervalId);
    };
  }, [navigate, location.search]);

  // Handle active session timing clock increments
  useEffect(() => {
    if (timerIntervalId) clearInterval(timerIntervalId);
    
    if (todayAttendance.raw_check_in && !todayAttendance.raw_check_out) {
      const checkInDate = new Date(todayAttendance.raw_check_in);

      const interval = setInterval(() => {
        const diffMs = new Date() - checkInDate;
        if (diffMs > 0) {
          const diffHrs = Math.floor(diffMs / 3600000);
          const diffMins = Math.floor((diffMs % 3600000) / 60000);
          const diffSecs = Math.floor((diffMs % 60000) / 1000);
          setElapsedTime(
            `${String(diffHrs).padStart(2, "0")}:${String(diffMins).padStart(2, "0")}:${String(diffSecs).padStart(2, "0")}`
          );
        }
      }, 1000);

      setTimerIntervalId(interval);
      return () => clearInterval(interval);
    } else if (todayAttendance.check_in && todayAttendance.check_in !== "--" && todayAttendance.check_out === "--" && !todayAttendance.raw_check_in) {
      const [timeStr, ampm] = todayAttendance.check_in.split(" ");
      let [hours, minutes] = timeStr.split(":").map(Number);
      if (ampm === "PM" && hours !== 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      const checkInDate = new Date();
      checkInDate.setHours(hours, minutes, 0, 0);

      const interval = setInterval(() => {
        const diffMs = new Date() - checkInDate;
        if (diffMs > 0) {
          const diffHrs = Math.floor(diffMs / 3600000);
          const diffMins = Math.floor((diffMs % 3600000) / 60000);
          const diffSecs = Math.floor((diffMs % 60000) / 1000);
          setElapsedTime(
            `${String(diffHrs).padStart(2, "0")}:${String(diffMins).padStart(2, "0")}:${String(diffSecs).padStart(2, "0")}`
          );
        }
      }, 1000);

      setTimerIntervalId(interval);
      return () => clearInterval(interval);
    } else {
      setElapsedTime("00:00:00");
    }
  }, [todayAttendance]);

  const loadDashboardData = async (user) => {
    try {
      setLoading(true);
      setError(null);

      // Determine Employee Code (Marcus Vance: EMP-0001)
      const empCode = user.employee_code || user.login_id || "EMP-0001";
      
      // Get employee details
      const emp = employeeRepository.getById(empCode);
      if (emp) {
        setEmployeeProfile(emp);
      }

      // Fetch Today's Attendance status for this specific employee
      const today = attendanceRepository.getTodayStatus(empCode);
      setTodayAttendance(today);

      // Leave Balances for employee
      const balances = leaveRepository.getBalances(empCode);
      setLeaveBalances(balances);

      // Personal Attendance history
      const personalAttendance = attendanceRepository.getByEmployee(empCode);
      const personalLeaves = leaveRepository.getByEmployee(empCode);

      // Calculate stats based on logs
      const present = personalAttendance.filter(a => a.status === "Present").length;
      const absent = personalAttendance.filter(a => a.status === "Absent").length;
      const onLeave = personalLeaves.filter(l => l.status === "APPROVED").length;

      // Calculate attendance rate (Present / Total logs)
      const totalDays = personalAttendance.length;
      const rate = totalDays > 0 ? Math.round((present / totalDays) * 100) : 95;
      
      // Calculate Paid Leave used (15 is the standard allocation)
      const leaveUsed = 15 - balances.PAID;
      
      // Calculate Avg Working Hours (mocked dynamically)
      setStats({
        presentDays: present,
        absentDays: absent,
        onLeaveDays: onLeave,
        avgHours: "8h 12m",
        attendanceRate: rate,
        paidLeaveUsed: leaveUsed
      });

      // Merge check-in/out & leave logs for employee only
      const merged = [
        ...personalAttendance.map(a => ({
          type: "attendance",
          title: a.check_out !== "--" ? "Checked Out" : "Checked In",
          statusPill: a.check_out !== "--" ? "bg-secondary text-white" : "bg-white text-ink",
          name: emp ? `${emp.first_name} ${emp.last_name}` : "You",
          email: emp ? emp.email : "user@dayflow.com",
          avatar: emp ? emp.profile_picture : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
          meta: a.check_out !== "--" ? `Completed shift duration: ${a.duration}` : `Active shift initialized at ${a.check_in}`,
          time: a.date === new Date().toISOString().split("T")[0] ? "Today" : a.date
        })),
        ...personalLeaves.map(l => ({
          type: "leave",
          title: `Leave ${l.status}`,
          statusPill: l.status === "APPROVED" ? "bg-emerald-500 text-white" : l.status === "PENDING" ? "bg-amber-500 text-white" : "bg-primary text-white",
          name: emp ? `${emp.first_name} ${emp.last_name}` : "You",
          email: emp ? emp.email : "user@dayflow.com",
          avatar: emp ? emp.profile_picture : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
          meta: `Leave category ${l.leave_type} requested for range ${l.start_date} to ${l.end_date}. Reason: ${l.remarks || "Personal"}`,
          time: l.start_date
        }))
      ];

      // Sort by date/time (simplistic sort: "Today" first)
      merged.sort((a, b) => {
        if (a.time === "Today") return -1;
        if (b.time === "Today") return 1;
        return b.time.localeCompare(a.time);
      });

      setRecentActivities(merged.slice(0, 4));

    } catch (err) {
      console.error("Error loading employee dashboard data:", err);
      setError("Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!currentUser) return;
    try {
      const empCode = currentUser.employee_code || currentUser.login_id || "EMP-0001";
      attendanceRepository.checkIn(empCode);
      notificationRepository.add(
        "Clock-in Registered",
        `You checked in successfully.`,
        "attendance"
      );
      loadDashboardData(currentUser);
    } catch (err) {
      console.error(err);
      notificationRepository.add("Error", "Failed to check in.", "error");
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser) return;
    try {
      const empCode = currentUser.employee_code || currentUser.login_id || "EMP-0001";
      attendanceRepository.checkOut(empCode);
      notificationRepository.add(
        "Clock-out Registered",
        `You completed your shift check-out.`,
        "attendance"
      );
      loadDashboardData(currentUser);
    } catch (err) {
      console.error(err);
      notificationRepository.add("Error", "Failed to check out.", "error");
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      setPasswordError("All fields are required");
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }

    try {
      await authService.changePassword(passwordForm.current, passwordForm.new);
      setPasswordSuccess(true);
      const updatedUser = authService.getCurrentUser();
      setCurrentUser(updatedUser);

      setTimeout(() => {
        setShowPasswordModal(false);
        navigate("/dashboard", { replace: true });
      }, 1500);
    } catch (err) {
      setPasswordError(err.message || "Failed to change password");
    }
  };

  const handleAskAssistant = (e) => {
    e.preventDefault();
    if (askInput.trim() !== "") {
      setAskSuccessMsg(`Searching personal archives for "${askInput}"...`);
      setTimeout(() => {
        setAskSuccessMsg("");
        setAskInput("");
      }, 3000);
    }
  };

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary w-8 h-8" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-500 p-4 rounded-md flex items-center justify-center h-64">
          {error}
        </div>
      ) : (
      <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto text-left">
        
        {/* RESQ STYLE HEADER GREETING ROW */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-medium text-ink tracking-tight">
              Welcome back, {currentUser?.name?.split(" ")[0] || "Marcus"}
            </h1>
            <p className="text-xs text-muted mt-1">
              {employeeProfile?.job_position || "Staff"} • {employeeProfile?.department || "Operations"}
            </p>
          </div>

          {/* 4 Personal Summary Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Present */}
            <div className="bg-surface-card border border-hairline rounded-lg p-5 flex flex-col justify-between hover:border-hairline-strong transition-all">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Present</span>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-2xl font-semibold text-ink">{stats.presentDays || 18}</span>
                <span className="text-xs text-muted">days this month</span>
              </div>
            </div>

            {/* Card 2: Work Hours */}
            <div className="bg-surface-card border border-hairline rounded-lg p-5 flex flex-col justify-between hover:border-hairline-strong transition-all">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Work Hours</span>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-2xl font-semibold text-ink">{stats.presentDays > 0 ? stats.presentDays * 8 : 142}</span>
                <span className="text-xs text-muted">hours logged</span>
              </div>
            </div>

            {/* Card 3: Leave Left */}
            <div className="bg-surface-card border border-hairline rounded-lg p-5 flex flex-col justify-between hover:border-hairline-strong transition-all">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Leave Left</span>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-2xl font-semibold text-ink">{leaveBalances.PAID}</span>
                <span className="text-xs text-muted">days remaining</span>
              </div>
            </div>

            {/* Card 4: My Salary */}
            <div className="bg-surface-card border border-hairline rounded-lg p-5 flex flex-col justify-between hover:border-hairline-strong transition-all">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">My Salary</span>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-2xl font-semibold text-primary">₹{(employeeProfile?.salary || 50000).toLocaleString()}</span>
                <span className="text-xs text-muted">/ month</span>
              </div>
            </div>

          </div>
        </div>

        {/* MIDDLE SECTION - RESQ STYLE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Widget 1: Today's Shift status card */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col justify-between text-left min-h-[340px]">
            <div className="flex flex-col gap-1.5 border-b border-hairline pb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Attendance Widget</span>
              <h3 className="text-base font-semibold text-ink">Today's Shift Status</h3>
            </div>

            <div className="flex flex-col gap-3 py-6">
              <div className="flex items-center justify-between bg-surface-strong border border-hairline rounded-md p-2.5">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Clock Status</span>
                  <span className="text-xs font-semibold text-ink mt-0.5">
                    {todayAttendance.check_in !== "--" && todayAttendance.check_out === "--" ? "Checked In (Active)" : todayAttendance.check_out !== "--" ? "Shift Completed" : "Not Checked In"}
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  todayAttendance.check_in !== "--" && todayAttendance.check_out === "--"
                    ? "bg-secondary/10 text-secondary border-secondary/20"
                    : todayAttendance.check_out !== "--"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-primary/10 text-primary border-primary/20"
                }`}>
                  {todayAttendance.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-surface-strong border border-hairline rounded-md p-2.5 flex flex-col">
                  <span className="text-muted font-medium">Checked In</span>
                  <span className="font-semibold text-ink font-mono mt-0.5">{todayAttendance.check_in}</span>
                </div>
                <div className="bg-surface-strong border border-hairline rounded-md p-2.5 flex flex-col">
                  <span className="text-muted font-medium">Checked Out</span>
                  <span className="font-semibold text-ink font-mono mt-0.5">{todayAttendance.check_out}</span>
                </div>
              </div>

              {todayAttendance.check_in !== "--" && todayAttendance.check_out === "--" && (
                <div className="bg-surface-strong border border-hairline rounded-md p-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted font-medium">Elapsed Session</span>
                  <span className="text-xs font-mono font-bold text-ink bg-canvas border border-hairline px-2.5 py-0.5 rounded">{elapsedTime}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-hairline-soft">
              {todayAttendance.check_in === "--" ? (
                <button
                  onClick={handleCheckIn}
                  className="w-full bg-primary hover:bg-primary-active text-white text-xs font-bold py-2.5 rounded-md transition-all"
                >
                  CLOCK IN
                </button>
              ) : todayAttendance.check_out === "--" ? (
                <button
                  onClick={handleCheckOut}
                  className="w-full bg-ink hover:bg-black text-white text-xs font-bold py-2.5 rounded-md transition-all border border-hairline-strong"
                >
                  CLOCK OUT
                </button>
              ) : (
                <div className="w-full bg-canvas border border-hairline text-muted text-xs font-semibold py-2.5 rounded text-center">
                  Shift Logged ({todayAttendance.duration})
                </div>
              )}
            </div>
          </div>

          {/* Widget 2: Check-In Trends SVG Curve Chart */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col justify-between text-left lg:col-span-1 min-h-[340px]">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted font-mono">Filing frequency</span>
                <span className="text-sm font-semibold text-ink">My Work Hours Trends</span>
              </div>

              <div className="flex bg-surface-strong border border-hairline p-0.5 rounded-md text-[10px] font-semibold text-muted">
                <span className="px-2 py-0.5 rounded bg-canvas border border-hairline text-ink">30 days</span>
                <span className="px-2 py-0.5 rounded">1 week</span>
              </div>
            </div>

            {/* Custom SVG Dual Bezier Curve Chart */}
            <div className="relative h-44 w-full mt-4 flex items-end">
              
              {/* Grid Y Axis indicators */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[9px] font-mono text-muted/50 pointer-events-none select-none">
                <span>12h</span>
                <span>9h</span>
                <span>6h</span>
                <span>3h</span>
                <span>0h</span>
              </div>

              <svg className="w-full h-full pb-6 pl-6 pr-2 overflow-visible" viewBox="0 0 200 120">
                {/* Horizontal grid lines */}
                <line x1="0" y1="0" x2="200" y2="0" stroke="#26272e" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="30" x2="200" y2="30" stroke="#26272e" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="60" x2="200" y2="60" stroke="#26272e" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="90" x2="200" y2="90" stroke="#26272e" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="120" x2="200" y2="120" stroke="#26272e" strokeWidth="1" />

                {/* Pink/Magenta Curve Line (Working hours) */}
                <path
                  d="M 0,80 C 30,50 60,30 90,45 C 120,40 150,55 180,48 C 190,40 195,42 200,45"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Electric Blue Curve Line (Break minutes) */}
                <path
                  d="M 0,110 C 35,90 60,105 90,80 C 120,95 150,110 180,100 C 190,102 195,108 200,105"
                  fill="none"
                  stroke="#1e75ff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.8"
                />

                {/* Selected Point Highlight */}
                <circle cx="90" cy="45" r="4.5" fill="#f43f5e" stroke="#111215" strokeWidth="1.5" />
                <circle cx="90" cy="45" r="10" fill="#f43f5e" fillOpacity="0.15" />
              </svg>

              {/* X Axis indicators matching Resq.io layout */}
              <div className="absolute left-6 right-2 bottom-0 flex justify-between text-[9px] font-mono text-muted select-none">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
              </div>
            </div>

            <div className="text-[10px] text-muted flex items-center justify-between pt-2 border-t border-hairline-soft">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-primary rounded"></span> Work Hours</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-secondary rounded"></span> Break Time</span>
            </div>
          </div>

          {/* Widget 3: Quick Action List Card */}
          <div className="bg-secondary text-white rounded-lg p-6 flex flex-col justify-between text-left min-h-[340px] relative overflow-hidden">
            
            {/* Background glowing circle for aesthetic */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/5 border border-white/10 blur-xl"></div>
            
            <div className="flex items-start justify-between z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Workspace Hub</span>
                <h3 className="text-lg font-semibold text-white">Quick Shortcuts</h3>
              </div>
              <div className="p-1.5 bg-white/10 border border-white/20 rounded hover:bg-white/20 transition-all cursor-pointer">
                <ShieldCheck size={16} className="text-white" />
              </div>
            </div>

            <p className="text-xs text-white/90 leading-relaxed py-3 z-10 font-normal">
              Quickly perform primary workspace updates, profile modifications, or file leave requests.
            </p>

            <div className="flex flex-col gap-2 z-10 text-canvas">
              {/* Shortcut 1 */}
              <Link to="/time-off" className="bg-white hover:bg-white/90 rounded-md px-3 py-2.5 flex items-center justify-between border border-white/10 shadow-xs transition-colors">
                <span className="text-xs font-semibold">Submit Leave Request</span>
                <Plus size={14} className="text-ink" />
              </Link>

              {/* Shortcut 2 */}
              <Link to="/profile" className="bg-white hover:bg-white/90 rounded-md px-3 py-2.5 flex items-center justify-between border border-white/10 shadow-xs transition-colors">
                <span className="text-xs font-semibold">View / Edit Profile Details</span>
                <ArrowUpRight size={14} className="text-ink" />
              </Link>

              {/* Shortcut 3 */}
              <Link to="/employees" className="bg-white hover:bg-white/90 rounded-md px-3 py-2.5 flex items-center justify-between border border-white/10 shadow-xs transition-colors">
                <span className="text-xs font-semibold">LookupCoworker Contact Info</span>
                <ArrowRight size={14} className="text-ink" />
              </Link>
            </div>

          </div>

        </div>

        {/* BOTTOM SECTION: ACTIVE INCIDENTS & ASSISTANT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Shifts Feed (Styled as Active Incidents from reference) */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 text-left lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-hairline pb-4 mb-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Activity Logs</span>
                <h3 className="text-base font-semibold text-ink">My Recent Activity Logs</h3>
              </div>
              
              <Link to="/attendance" className="text-xs text-primary hover:text-primary-active font-semibold flex items-center gap-1">
                View All <ArrowRight size={12} />
              </Link>
            </div>

            <div className="flex flex-col gap-4">
              {recentActivities.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted">
                  No recent activities recorded.
                </div>
              ) : (
                recentActivities.map((act, index) => (
                  <div key={index} className="bg-surface-strong border border-hairline rounded-md p-4 flex flex-col gap-3 justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1 text-left">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-block self-start ${act.statusPill}`}>
                          {act.title}
                        </span>
                        <p className="text-xs text-body leading-relaxed mt-1">
                          {act.meta}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-muted whitespace-nowrap">{act.time}</span>
                    </div>

                    {/* Profile avatar row below */}
                    <div className="flex items-center gap-2 pt-2.5 border-t border-hairline-soft">
                      <img
                        src={act.avatar}
                        alt={act.name}
                        className="w-6 h-6 rounded-full object-cover border border-hairline"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-ink leading-none">{act.name}</span>
                        <span className="text-[10px] text-muted mt-0.5">{act.email}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Search Assistant Column */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 text-left flex flex-col justify-between min-h-[300px]">
            <div className="flex flex-col gap-1.5 border-b border-hairline pb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Workspace Assistant</span>
              <h3 className="text-base font-semibold text-ink font-sans">Query Assistant</h3>
            </div>

            <p className="text-xs text-muted leading-relaxed py-4 font-normal">
              Ask questions about your leave balance, shift requirements, or company holidays.
            </p>

            <form onSubmit={handleAskAssistant} className="flex flex-col gap-2 pt-2">
              <div className="relative flex items-center">
                <textarea
                  placeholder="e.g. How many paid leave days do I have remaining?"
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  rows={3}
                  className="w-full rounded-md bg-canvas border border-hairline-strong pl-3 pr-10 py-2.5 text-xs text-ink focus:outline-none focus:border-primary placeholder-muted-soft resize-none"
                />
                <button
                  type="submit"
                  className="absolute right-2.5 bottom-2.5 p-1.5 bg-surface-strong hover:bg-canvas-soft border border-hairline rounded text-ink transition-colors"
                >
                  <Send size={12} />
                </button>
              </div>
              {askSuccessMsg && (
                <div className="text-[10px] text-primary font-semibold animate-pulse mt-1">
                  {askSuccessMsg}
                </div>
              )}
            </form>
          </div>

        </div>

      </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-card border border-hairline-strong max-w-sm w-full rounded-md p-6 text-left flex flex-col gap-4 shadow-sm animate-fade-in">
            
            <div className="flex flex-col gap-1 border-b border-hairline pb-3">
              <span className="text-base font-semibold text-ink">Update Security Credentials</span>
              <span className="text-[10px] text-primary font-bold uppercase tracking-wide">Forced change on first sign-in</span>
            </div>

            {passwordError && (
              <div className="bg-red-500/5 border border-semantic-error/30 rounded-md p-2.5 text-xs text-semantic-error flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-md p-2.5 text-xs text-emerald-500 flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>Password changed! Redirecting...</span>
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit} className="flex flex-col gap-4">
              <PasswordField
                label="Current Password"
                id="current_password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                required
              />

              <PasswordField
                label="New Password"
                id="new_password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                required
              />

              <PasswordField
                label="Confirm Password"
                id="confirm_password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                required
              />

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-active text-white font-bold py-2.5 rounded-md text-xs transition-all mt-2"
              >
                SAVE AND ACTIVATE ACCOUNT
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
