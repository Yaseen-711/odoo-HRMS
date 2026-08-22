import React, { useState, useEffect } from "react";
import { Clock, Filter, Loader2, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { authService } from "../services/authService";
import { attendanceService } from "../services/attendanceService";
import { attendanceRepository } from "../data/attendance";
import { employeeRepository } from "../data/employees";
import { notificationRepository } from "../data/notifications";

export const EmployeeAttendance = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Clock widget states
  const [todayAttendance, setTodayAttendance] = useState({
    status: "Absent",
    check_in: "--",
    check_out: "--",
    duration: "0h 0m"
  });
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [timerIntervalId, setTimerIntervalId] = useState(null);

  // History logs
  const [historyLogs, setHistoryLogs] = useState([]);
  const [filterRange, setFilterRange] = useState("All"); // All, Today, This Week, This Month

  useEffect(() => {
    const init = async () => {
      const user = authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const empCode = user.employee_code || user.login_id || "EMP-0001";
        
        try {
          const profile = employeeRepository.getById(empCode);
          setEmployeeProfile(profile);
          await loadAttendanceData(empCode);
        } catch (err) {
          setError("Failed to load attendance data.");
        } finally {
          setIsLoading(false);
        }
      }
    };
    init();

    return () => {
      if (timerIntervalId) clearInterval(timerIntervalId);
    };
  }, []);

  // Timer clock increments
  useEffect(() => {
    if (todayAttendance.check_in && todayAttendance.check_in !== "--" && todayAttendance.check_out === "--") {
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
  }, [todayAttendance.check_in, todayAttendance.check_out]);

  const loadAttendanceData = async (empCode) => {
    try {
      // Get today status
      const today = attendanceRepository.getTodayStatus(empCode);
      setTodayAttendance(today);

      // Get personal attendance logs from repository
      const logs = attendanceRepository.getByEmployee(empCode);
      setHistoryLogs(logs);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleCheckIn = async () => {
    if (!currentUser) return;
    try {
      const empCode = currentUser.employee_code || currentUser.login_id || "EMP-0001";
      attendanceRepository.checkIn(empCode);
      notificationRepository.add(
        "Clock-in Successful",
        `You registered check-in successfully.`,
        "attendance"
      );
      await loadAttendanceData(empCode);
    } catch (err) {
      console.error(err);
      setError("Failed to check in");
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser) return;
    try {
      const empCode = currentUser.employee_code || currentUser.login_id || "EMP-0001";
      attendanceRepository.checkOut(empCode);
      notificationRepository.add(
        "Clock-out Successful",
        `You completed shift check-out.`,
        "attendance"
      );
      await loadAttendanceData(empCode);
    } catch (err) {
      console.error(err);
      setError("Failed to check out");
    }
  };

  // Filter Logic
  const getFilteredLogs = () => {
    let list = [...historyLogs];
    const todayStr = new Date().toISOString().split("T")[0];
    const todayDate = new Date(todayStr);

    if (filterRange === "Today") {
      list = list.filter(log => log.date === todayStr);
    } else if (filterRange === "This Week") {
      // Calculate start of week (Monday)
      const day = todayDate.getDay();
      const diff = todayDate.getDate() - day + (day === 0 ? -6 : 1);
      const monDate = new Date(todayDate.setDate(diff));
      const monStr = monDate.toISOString().split("T")[0];
      list = list.filter(log => log.date >= monStr && log.date <= todayStr);
    } else if (filterRange === "This Month") {
      const monthPrefix = todayStr.substring(0, 7);
      list = list.filter(log => log.date.startsWith(monthPrefix));
    }

    return list;
  };

  const filteredLogs = getFilteredLogs();

  return (
    <DashboardLayout>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted">Loading attendance data...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto">
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm border border-red-100 flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* HEADER SECTION */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col text-left">
              <h1 className="text-2xl md:text-3xl font-normal text-ink tracking-tight">
                My Attendance
              </h1>
              <p className="text-xs md:text-sm text-muted">
                Clock in/out or view your historical working shifts.
              </p>
            </div>
          </div>

          {/* INTERACTIVE SHIFT WIDGET */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
            
            <div className="flex items-center gap-4">
              <div className="p-3 bg-canvas border border-hairline rounded-md text-primary shrink-0">
                <Clock size={28} />
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Clock Status</span>
                <h3 className="text-xl font-normal text-ink mt-0.5">
                  {todayAttendance.check_in !== "--" && todayAttendance.check_out === "--"
                    ? `Active Shift - Checked in at ${todayAttendance.check_in}`
                    : todayAttendance.check_out !== "--"
                    ? `Shift Complete - Checked out at ${todayAttendance.check_out}`
                    : "Not checked in yet today"}
                </h3>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              {todayAttendance.check_in !== "--" && todayAttendance.check_out === "--" && (
                <div className="px-4 py-2 bg-canvas border border-hairline rounded font-mono text-ink text-base font-bold text-center w-full sm:w-32">
                  {elapsedTime}
                </div>
              )}
              
              {todayAttendance.check_in === "--" ? (
                <button
                  onClick={handleCheckIn}
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-active text-white text-xs font-bold rounded-md transition-all duration-150 shadow-xs"
                >
                  CLOCK IN
                </button>
              ) : todayAttendance.check_out === "--" ? (
                <button
                  onClick={handleCheckOut}
                  className="w-full sm:w-auto px-6 py-2.5 bg-ink hover:bg-black text-white text-xs font-bold rounded-md transition-all duration-150 border border-hairline-strong"
                >
                  CLOCK OUT
                </button>
              ) : (
                <div className="w-full sm:w-auto px-5 py-2.5 bg-canvas border border-hairline text-muted text-xs font-semibold rounded text-center">
                  Shift Logged ({todayAttendance.duration})
                </div>
              )}
            </div>

          </div>

          {/* ATTENDANCE HISTORY LIST */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col gap-5 text-left">
            
            {/* History Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
              <span className="text-[12px] font-bold uppercase tracking-wider text-ink">
                Your Attendance History
              </span>

              {/* Filter buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider mr-1.5">
                  Range:
                </span>
                {["All", "Today", "This Week", "This Month"].map((range) => (
                  <button
                    key={range}
                    onClick={() => setFilterRange(range)}
                    className={`px-3 py-1 rounded text-xs font-semibold border transition-all duration-150 ${
                      filterRange === range
                        ? "bg-ink text-white border-ink"
                        : "bg-surface-card text-body border-hairline-strong hover:bg-canvas-soft"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                No attendance logs found for the selected scope.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-hairline text-muted font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Check-In</th>
                      <th className="py-3 px-4">Check-Out</th>
                      <th className="py-3 px-4">Working Hours</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b border-hairline-soft hover:bg-canvas-soft/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-body">{log.date}</td>
                        <td className="py-3 px-4 font-mono text-ink">{log.check_in}</td>
                        <td className="py-3 px-4 font-mono text-ink">{log.check_out}</td>
                        <td className="py-3 px-4 font-mono text-ink">{log.duration}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            log.status === "Present"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : "bg-red-50 text-red-500 border-red-100"
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>
      )}
    </DashboardLayout>
  );
};
