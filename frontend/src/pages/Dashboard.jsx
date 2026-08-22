import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { 
  Users, 
  UserCheck, 
  Calendar, 
  UserMinus, 
  Clock, 
  ArrowRight, 
  Plus, 
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Sparkles,
  HelpCircle,
  MessageSquare,
  Zap,
  CalendarDays,
  Send,
  Search,
  Loader2
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { authService } from "../services/authService";
import { dashboardService } from "../services/dashboardService";
import { attendanceService } from "../services/attendanceService";
import { employeeRepository } from "../data/employees";
import { attendanceRepository } from "../data/attendance";
import { leaveRepository } from "../data/leave";
import { notificationRepository } from "../data/notifications";
import { InputField } from "../components/InputField";
import { PasswordField } from "../components/PasswordField";

export const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    leave: 0,
    absent: 0
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

  // Activities list
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

      const summary = await dashboardService.getSummary();

      if (summary.role === 'ADMIN' || summary.role === 'HR_OFFICER') {
        // Admin/HR response: stats object with aggregate counts
        if (summary.stats) {
          setStats({
            total: summary.stats.total_employees || 0,
            present: summary.stats.checked_in_today || 0,
            leave: summary.stats.pending_leave_requests || 0,
            absent: Math.max(0, (summary.stats.total_employees || 0) - (summary.stats.checked_in_today || 0) - (summary.stats.checked_out_today || 0)),
          });
        }
        // Admin doesn't have a personal attendance widget
        setTodayAttendance({ status: 'Absent', check_in: '--', check_out: '--', duration: '0h 0m' });
      } else {
        // Employee response: personal attendance/leave/payroll
        if (summary.todayAttendance) {
          setTodayAttendance(summary.todayAttendance);
        }
      }

      // Recent activity feed still uses mock data (no backend endpoint yet)
      const emps = employeeRepository.getAll();
      const total = emps.length;
      const present = emps.filter(e => e.status === 'Present').length;
      const leave = emps.filter(e => e.status === 'On Leave').length;
      const absent = emps.filter(e => e.status === 'Absent').length;

      // Only override stats from mock if we got an employee response (not admin)
      if (summary.role !== 'ADMIN' && summary.role !== 'HR_OFFICER') {
        setStats({ total, present, leave, absent });
      }

      // Merge check-in/out & leave logs
      const mockAttendance = attendanceRepository.getAll();
      const mockLeaves = leaveRepository.getAll();
      const merged = [
        ...mockAttendance.map(a => {
          const matchedEmp = emps.find(e => e.employee_id === a.employee_id);
          return {
            type: "attendance",
            title: a.check_out !== "--" ? "Checked Out" : "Checked In",
            statusPill: a.check_out !== "--" ? "bg-secondary text-white" : "bg-white text-ink",
            name: matchedEmp ? `${matchedEmp.first_name} ${matchedEmp.last_name}` : "Unknown Staff",
            email: matchedEmp ? matchedEmp.email : "staff@dayflow.com",
            avatar: matchedEmp ? matchedEmp.profile_picture : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
            meta: a.check_out !== "--" ? `Completed shift duration: ${a.duration}` : `Active shift initialized at ${a.check_in}`,
            time: "Today"
          };
        }),
        ...mockLeaves.map(l => {
          const matchedEmp = emps.find(e => e.employee_id === l.employee_id);
          return {
            type: "leave",
            title: `Leave ${l.status}`,
            statusPill: l.status === "APPROVED" ? "bg-emerald-500 text-white" : "bg-primary text-white",
            name: matchedEmp ? `${matchedEmp.first_name} ${matchedEmp.last_name}` : "Unknown Staff",
            email: matchedEmp ? matchedEmp.email : "staff@dayflow.com",
            avatar: matchedEmp ? matchedEmp.profile_picture : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
            meta: `${l.leave_type} Leave: ${l.start_date} to ${l.end_date}`,
            time: "Recently"
          };
        })
      ];
      setRecentActivities(merged.slice(0, 3));
    } catch (err) {
      setError("Failed to load dashboard data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!currentUser) return;
    try {
      await attendanceService.checkIn();
      notificationRepository.add(
        "Clock-in Registered",
        `${currentUser.name} registered shift check-in.`,
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
      await attendanceService.checkOut();
      notificationRepository.add(
        "Clock-out Registered",
        `${currentUser.name} completed workspace shift.`,
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
      setAskSuccessMsg(`Searching database archives for "${askInput}"...`);
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
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-col gap-4 max-w-2xl">
            <div>
              <h1 className="text-3xl font-medium text-ink tracking-tight">
                Welcome in, {currentUser?.name?.split(" ")[0] || "Caroline"}
              </h1>
              <p className="text-xs text-muted mt-1">
                Here is what's happening at Dayflow today.
              </p>
            </div>

            {/* Horizontal progress capsules row */}
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-muted select-none mt-1">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Present shifts</span>
                <div className="flex items-center bg-surface-strong rounded-full h-7 border border-hairline overflow-hidden w-28 p-1">
                  <div className="bg-primary text-white text-[9px] font-bold h-full flex items-center justify-center rounded-full px-2" style={{ width: "80%" }}>
                    80%
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Leave rate</span>
                <div className="flex items-center bg-surface-strong rounded-full h-7 border border-hairline overflow-hidden w-28 p-1">
                  <div className="bg-white text-ink text-[9px] font-bold h-full flex items-center justify-center rounded-full px-2" style={{ width: "25%" }}>
                    25%
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Filing coverage</span>
                <div className="flex items-center bg-surface-strong rounded-full h-7 border border-hairline overflow-hidden w-28 p-1">
                  <div className="bg-surface-card border border-hairline-strong text-muted text-[9px] font-bold h-full flex items-center justify-center rounded-full px-2" style={{ width: "40%" }}>
                    40%
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Approve rate</span>
                <div className="flex items-center bg-surface-strong rounded-full h-7 border border-hairline overflow-hidden w-28 p-1">
                  <div className="bg-primary/20 text-primary text-[9px] font-bold h-full flex items-center justify-center rounded-full px-2" style={{ width: "15%" }}>
                    15%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column statistics pills matching Resq.io indicators */}
          <div className="flex flex-wrap items-center gap-6 xl:gap-8 bg-surface-card border border-hairline p-5 rounded-lg">
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-bold">
                +12%
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold text-ink font-mono leading-none">{stats.present}</span>
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider mt-1">Present Staff</span>
              </div>
            </div>

            <div className="flex items-center gap-3 border-l border-hairline pl-6">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] font-bold">
                +24%
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold text-ink font-mono leading-none">{stats.leave}</span>
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider mt-1">On Leaves</span>
              </div>
            </div>

            <div className="flex items-center gap-3 border-l border-hairline pl-6">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                -64%
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold text-ink font-mono leading-none">{stats.absent}</span>
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider mt-1">Absences</span>
              </div>
            </div>

          </div>
        </div>

        {/* MIDDLE SECTION - RESQ STYLE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Widget 1: Vertical Directory Summary */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col justify-between text-left min-h-[340px]">
            <div className="flex flex-col gap-1.5 border-b border-hairline pb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Attendance Summary</span>
              <h3 className="text-base font-semibold text-ink">Workforce Status</h3>
            </div>

            <div className="flex flex-col gap-3 py-6">
              {/* Present row */}
              <div className="flex items-center justify-between bg-surface-strong border border-hairline rounded-md p-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="text-xs font-semibold text-ink">Present</span>
                </div>
                <span className="text-xs font-mono font-bold bg-canvas border border-hairline px-2 py-0.5 rounded text-ink">{stats.present}</span>
              </div>

              {/* Leave row */}
              <div className="flex items-center justify-between bg-surface-strong border border-hairline rounded-md p-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-semibold text-ink">On Leave</span>
                </div>
                <span className="text-xs font-mono font-bold bg-canvas border border-hairline px-2 py-0.5 rounded text-ink">{stats.leave}</span>
              </div>

              {/* Absent row */}
              <div className="flex items-center justify-between bg-surface-strong border border-hairline rounded-md p-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span className="text-xs font-semibold text-ink">Absent / Late</span>
                </div>
                <span className="text-xs font-mono font-bold bg-canvas border border-hairline px-2 py-0.5 rounded text-ink">{stats.absent}</span>
              </div>
            </div>

            <div className="text-[10px] text-muted flex items-center gap-1.5 pt-2 border-t border-hairline-soft">
              <Activity size={12} className="text-primary shrink-0" />
              <span>Shift active values automatically update via stopwatch timers</span>
            </div>
          </div>

          {/* Widget 2: Incident Frequency SVG Curve Chart */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col justify-between text-left lg:col-span-1 min-h-[340px]">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted font-mono">Filing frequency</span>
                <span className="text-sm font-semibold text-ink">Check-In Trends</span>
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
                <span>40</span>
                <span>30</span>
                <span>20</span>
                <span>10</span>
                <span>0</span>
              </div>

              <svg className="w-full h-full pb-6 pl-6 pr-2 overflow-visible" viewBox="0 0 200 120">
                {/* Horizontal grid lines */}
                <line x1="0" y1="0" x2="200" y2="0" stroke="#26272e" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="30" x2="200" y2="30" stroke="#26272e" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="60" x2="200" y2="60" stroke="#26272e" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="90" x2="200" y2="90" stroke="#26272e" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="120" x2="200" y2="120" stroke="#26272e" strokeWidth="1" />

                {/* Pink/Magenta Curve Line (Check-Ins) */}
                <path
                  d="M 0,90 C 30,30 60,110 90,60 C 120,20 150,110 180,80 C 190,70 195,65 200,60"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Electric Blue Curve Line (Leaves) */}
                <path
                  d="M 0,40 C 35,60 60,20 90,95 C 120,110 150,40 180,50 C 190,52 195,58 200,65"
                  fill="none"
                  stroke="#1e75ff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.8"
                />

                {/* Selected Point Highlight */}
                <circle cx="90" cy="60" r="4.5" fill="#f43f5e" stroke="#111215" strokeWidth="1.5" />
                <circle cx="90" cy="60" r="10" fill="#f43f5e" fillOpacity="0.15" />
              </svg>

              {/* X Axis indicators matching Resq.io layout */}
              <div className="absolute left-6 right-2 bottom-0 flex justify-between text-[9px] font-mono text-muted select-none">
                <span>24 Aug</span>
                <span>31 Aug</span>
                <span>7 Sept</span>
                <span>14 Sept</span>
                <span>21 Sept</span>
              </div>
            </div>

            <div className="text-[10px] text-muted flex items-center justify-between pt-2 border-t border-hairline-soft">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-primary rounded"></span> Present</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-secondary rounded"></span> Leaves</span>
            </div>
          </div>

          {/* Widget 3: High Impact Electric Blue Vulnerability Card */}
          <div className="bg-secondary text-white rounded-lg p-6 flex flex-col justify-between text-left min-h-[340px] relative overflow-hidden">
            
            {/* Background glowing circle for aesthetic */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/5 border border-white/10 blur-xl"></div>
            
            <div className="flex items-start justify-between z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Workspace Security</span>
                <h3 className="text-lg font-semibold text-white">Platform Shield</h3>
              </div>
              <div className="p-1.5 bg-white/10 border border-white/20 rounded hover:bg-white/20 transition-all cursor-pointer">
                <ArrowUpRight size={16} className="text-white" />
              </div>
            </div>

            <p className="text-xs text-white/90 leading-relaxed py-4 z-10 font-normal">
              Authentication utilizes secure local storage sessions and password entropy checkers. System endpoints require MFA codes when toggled.
            </p>

            <div className="flex flex-col gap-2 z-10">
              {/* White capsule 1 */}
              <div className="bg-white text-canvas rounded-md px-3 py-2 flex items-center justify-between border border-white/10 shadow-xs">
                <span className="text-xs font-semibold">Priority Protection</span>
                <span className="text-xs font-mono font-bold bg-canvas border border-hairline px-2 py-0.5 rounded text-ink">3</span>
              </div>

              {/* White capsule 2 */}
              <div className="bg-white text-canvas rounded-md px-3 py-2 flex items-center justify-between border border-white/10 shadow-xs">
                <span className="text-xs font-semibold">Security Toggles Active</span>
                <span className="text-xs font-mono font-bold bg-canvas border border-hairline px-2 py-0.5 rounded text-ink">1</span>
              </div>
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
                <h3 className="text-base font-semibold text-ink">Active Shift Logs</h3>
              </div>
              
              <Link to="/attendance" className="text-xs text-primary hover:text-primary-active font-semibold flex items-center gap-1">
                View History <ArrowRight size={12} />
              </Link>
            </div>

            <div className="flex flex-col gap-4">
              {recentActivities.map((act, index) => (
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
              ))}
            </div>
          </div>

          {/* Interactive AI Prompt Assistant (Styled as Hi Caroline from reference) */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 text-left lg:col-span-1 flex flex-col justify-between min-h-[380px]">
            <div className="border-b border-hairline pb-4">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Workspace Assistant</span>
              <h3 className="text-base font-semibold text-ink flex items-center gap-1.5 mt-1">
                Hi, {currentUser?.name?.split(" ")[0] || "Caroline"} 👋
              </h3>
              <p className="text-[11px] text-muted mt-0.5">How can I assist your HR dashboard tasks today?</p>
            </div>

            {/* Quick action buttons row */}
            <div className="grid grid-cols-2 gap-2 py-4">
              <button
                onClick={() => navigate("/employees")}
                className="bg-surface-strong hover:bg-canvas-soft border border-hairline rounded-md p-3 text-left flex flex-col gap-1 transition-all"
              >
                <Users size={14} className="text-primary" />
                <span className="text-[11px] font-semibold text-ink">Staff Directory</span>
              </button>

              <button
                onClick={() => navigate("/time-off")}
                className="bg-surface-strong hover:bg-canvas-soft border border-hairline rounded-md p-3 text-left flex flex-col gap-1 transition-all"
              >
                <CalendarDays size={14} className="text-secondary" />
                <span className="text-[11px] font-semibold text-ink">Filing Leaves</span>
              </button>

              <button
                onClick={() => navigate("/attendance")}
                className="bg-surface-strong hover:bg-canvas-soft border border-hairline rounded-md p-3 text-left flex flex-col gap-1 transition-all"
              >
                <Clock size={14} className="text-emerald-500" />
                <span className="text-[11px] font-semibold text-ink">Shift Timers</span>
              </button>

              <button
                onClick={() => navigate("/settings")}
                className="bg-surface-strong hover:bg-canvas-soft border border-hairline rounded-md p-3 text-left flex flex-col gap-1 transition-all"
              >
                <Zap size={14} className="text-primary" />
                <span className="text-[11px] font-semibold text-ink">Workspace Settings</span>
              </button>
            </div>

            {/* Search Input block */}
            <form onSubmit={handleAskAssistant} className="flex flex-col gap-2 mt-2 pt-2 border-t border-hairline-soft">
              {askSuccessMsg && (
                <div className="bg-secondary/5 border border-secondary/20 rounded p-2 text-[10px] text-secondary font-mono">
                  {askSuccessMsg}
                </div>
              )}
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Ask database archives..."
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  className="w-full bg-surface-strong border border-hairline-strong rounded-md pl-3.5 pr-10 py-2 text-xs text-ink focus:outline-none focus:border-secondary placeholder-muted-soft"
                />
                <button
                  type="submit"
                  className="absolute right-2.5 p-1 rounded hover:bg-canvas-soft text-muted hover:text-ink transition-colors"
                >
                  <Send size={12} />
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
      )}

      {/* FORCE CHANGE PASSWORD DIALOG MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-card border border-hairline-strong max-w-sm w-full rounded-md p-6 text-center flex flex-col gap-4 shadow-sm relative overflow-hidden animate-fade-in">
            
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary mx-auto flex items-center justify-center">
              <ShieldAlert size={24} />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-ink">Security Password Update Required</h3>
              <p className="text-xs text-muted leading-relaxed">
                This is a seeded account or password change was requested. Please establish your master password to continue.
              </p>
            </div>

            {passwordError && (
              <div className="bg-red-500/5 border border-semantic-error/30 rounded-md p-2.5 text-xs text-semantic-error text-left">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-md p-2.5 text-xs text-emerald-600 text-left">
                Password updated successfully. Loading workspace...
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit} className="flex flex-col gap-4">
              <PasswordField
                label="Current Password"
                id="current-pwd"
                placeholder="••••••••"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                required
              />

              <PasswordField
                label="New Password"
                id="new-pwd"
                placeholder="••••••••"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                required
              />

              <PasswordField
                label="Confirm New Password"
                id="confirm-pwd"
                placeholder="••••••••"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                required
              />

              <button
                type="submit"
                disabled={passwordSuccess}
                className="w-full mt-2 rounded-md bg-primary hover:bg-primary-active text-white font-bold text-sm py-2.5 px-4 transition-all duration-150 disabled:opacity-50"
              >
                Change Master Password
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

