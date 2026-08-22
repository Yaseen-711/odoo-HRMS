/**
 * Dashboard service — connects to the backend dashboard API endpoint.
 */

import { apiClient } from './apiClient';
import { formatTime, formatDuration } from './attendanceService';

export const dashboardService = {
  /**
   * Fetch the unified dashboard summary for the logged-in employee.
   * GET /api/dashboard/summary → DashboardSummaryOut
   *
   * Returns the raw backend data plus transformed attendance fields
   * for easy consumption by the Dashboard page.
   */
  getSummary: async () => {
    const data = await apiClient.get('/dashboard/summary');

    // Map attendance status for display
    const attendanceStatusMap = {
      ABSENT: 'Absent',
      CHECKED_IN: 'Present',
      CHECKED_OUT: 'Present',
    };

    return {
      // Raw data
      ...data,
      // Transformed attendance for the dashboard widget
      todayAttendance: {
        status: attendanceStatusMap[data.attendance.status] || data.attendance.status,
        check_in: formatTime(data.attendance.check_in_time),
        check_out: formatTime(data.attendance.check_out_time),
        duration: data.attendance.work_hours
          ? formatDuration(data.attendance.work_hours)
          : '0h 0m',
        raw_check_in: data.attendance.check_in_time,
        raw_check_out: data.attendance.check_out_time,
      },
    };
  },
};
