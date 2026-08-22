/**
 * Attendance service — connects to the backend attendance API endpoints.
 */

import { apiClient } from './apiClient';

/**
 * Format an ISO datetime string to "HH:MM AM/PM" display format.
 */
export const formatTime = (isoString) => {
  if (!isoString) return '--';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Convert work_hours float (e.g. 8.5) to a display string (e.g. "8h 30m").
 */
export const formatDuration = (workHours) => {
  if (workHours === null || workHours === undefined) return '0h 0m';
  const hours = Math.floor(workHours);
  const minutes = Math.round((workHours - hours) * 60);
  return `${hours}h ${minutes}m`;
};

/**
 * Format an ISO date string to "YYYY-MM-DD".
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  // Already in YYYY-MM-DD format from backend
  return dateStr;
};

/**
 * Transform a backend AttendanceOut to the frontend display format.
 */
const transformAttendance = (record) => {
  const checkIn = formatTime(record.check_in);
  const checkOut = formatTime(record.check_out);

  // Determine display duration
  let duration;
  if (record.work_hours !== null && record.work_hours !== undefined) {
    duration = formatDuration(record.work_hours);
  } else if (checkIn !== '--' && checkOut === '--') {
    duration = 'Active';
  } else {
    duration = '0h 0m';
  }

  // Map backend AttendanceStatus to frontend display
  const statusMap = {
    PRESENT: 'Present',
    ABSENT: 'Absent',
    HALF_DAY: 'Half Day',
    LEAVE: 'On Leave',
  };

  return {
    id: record.id,
    employee_id: record.employee_id, // This is the numeric employee ID from backend
    date: formatDate(record.date),
    check_in: checkIn,
    check_out: checkOut,
    duration: duration,
    work_hours: record.work_hours,
    extra_hours: record.extra_hours,
    status: statusMap[record.status] || record.status,
    raw_check_in: record.check_in,
    raw_check_out: record.check_out,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
};

export const attendanceService = {
  /**
   * Employee check-in for today.
   * POST /api/attendance/check-in → AttendanceOut
   */
  checkIn: async () => {
    const data = await apiClient.post('/attendance/check-in');
    return transformAttendance(data);
  },

  /**
   * Employee check-out for today.
   * POST /api/attendance/check-out → AttendanceOut
   */
  checkOut: async () => {
    const data = await apiClient.post('/attendance/check-out');
    return transformAttendance(data);
  },

  /**
   * Get daily attendance for a specific employee.
   * GET /api/attendance/daily?employee_id=X&for_date=Y → AttendanceOut
   */
  getDaily: async (employeeId, forDate = null) => {
    const params = { employee_id: employeeId };
    if (forDate) params.for_date = forDate;
    try {
      const data = await apiClient.get('/attendance/daily', params);
      return transformAttendance(data);
    } catch (err) {
      // If no record found or any error fetching daily attendance,
      // return a default absent record so the page doesn't break
      console.warn('getDaily fallback:', err.message);
      return {
        status: 'Absent',
        check_in: '--',
        check_out: '--',
        duration: '0h 0m',
      };
    }
  },

  /**
   * Get weekly attendance for a specific employee.
   * GET /api/attendance/weekly?employee_id=X&week_start=Y → list[AttendanceOut]
   */
  getWeekly: async (employeeId, weekStart) => {
    const data = await apiClient.get('/attendance/weekly', {
      employee_id: employeeId,
      week_start: weekStart,
    });
    return data.map(transformAttendance);
  },

  /**
   * [Admin] List all attendance records.
   * GET /api/attendance?for_date=Y → list[AttendanceOut]
   */
  getAll: async (forDate = null) => {
    const params = {};
    if (forDate) params.for_date = forDate;
    const data = await apiClient.get('/attendance', params);
    return data.map(transformAttendance);
  },
};
