/**
 * Dashboard service — connects to the backend dashboard API endpoint.
 *
 * The backend returns different shapes based on the user's role:
 *   EMPLOYEE → DashboardSummaryOut (with employee, attendance, leave, payroll)
 *   ADMIN/HR_OFFICER → AdminDashboardOut (with stats aggregate)
 *
 * This service returns the raw data plus transformed attendance fields (for employees).
 */

import { apiClient } from './apiClient';
import { formatTime, formatDuration } from './attendanceService';

export const dashboardService = {
  /**
   * Fetch the unified dashboard summary for the logged-in user.
   * GET /api/dashboard/summary → DashboardSummaryOut | AdminDashboardOut
   */
  getSummary: async () => {
    const data = await apiClient.get('/dashboard/summary');

    // Admin/HR response — return as-is (contains stats: { total_employees, ... })
    if (data.role === 'ADMIN' || data.role === 'HR_OFFICER') {
      return data;
    }

    // Employee response — augment with transformed attendance fields for UI use
    const attendanceStatusMap = {
      ABSENT: 'Absent',
      CHECKED_IN: 'Present',
      CHECKED_OUT: 'Present',
    };

    return {
      // Raw data
      ...data,
      // Transformed attendance for the dashboard clock widget
      todayAttendance: {
        status: attendanceStatusMap[data.attendance?.status] || data.attendance?.status || 'Absent',
        check_in: formatTime(data.attendance?.check_in_time),
        check_out: formatTime(data.attendance?.check_out_time),
        duration: data.attendance?.work_hours
          ? formatDuration(data.attendance.work_hours)
          : '0h 0m',
        raw_check_in: data.attendance?.check_in_time,
        raw_check_out: data.attendance?.check_out_time,
      },
    };
  },
};
