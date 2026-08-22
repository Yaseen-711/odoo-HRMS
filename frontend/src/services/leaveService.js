/**
 * Leave service — connects to the backend leave API endpoints.
 * Leave balances remain frontend-only (no backend endpoint).
 */

import { apiClient } from './apiClient';

/**
 * Transform a backend LeaveOut to the frontend display format.
 */
const transformLeave = (leave) => ({
  id: leave.id,
  employee_id: leave.employee_id, // numeric employee ID from backend
  leave_type: leave.leave_type,
  start_date: leave.start_date,
  end_date: leave.end_date,
  remarks: leave.remarks || '',
  status: leave.status,
  approved_by: leave.approved_by,
  approval_comment: leave.approval_comment,
  created_at: leave.created_at,
  updated_at: leave.updated_at,
});

export const leaveService = {
  /**
   * Submit a leave request.
   * POST /api/leave → LeaveOut
   */
  create: async (data) => {
    const body = {
      leave_type: data.leave_type,
      start_date: data.start_date,
      end_date: data.end_date,
      remarks: data.remarks || null,
    };
    const result = await apiClient.post('/leave', body);
    return transformLeave(result);
  },

  /**
   * List leave requests.
   * GET /api/leave?employee_id=X&status=Y → list[LeaveOut]
   * Admin sees all; Employee sees own.
   */
  getAll: async (employeeId = null, status = null) => {
    const params = {};
    if (employeeId) params.employee_id = employeeId;
    if (status) params.status = status;
    const data = await apiClient.get('/leave', params);
    return data.map(transformLeave);
  },

  /**
   * Get a single leave request by ID.
   * GET /api/leave/{id} → LeaveOut
   */
  getById: async (id) => {
    const data = await apiClient.get(`/leave/${id}`);
    return transformLeave(data);
  },

  /**
   * [Admin] Approve or reject a leave request.
   * PATCH /api/leave/{id}/decide → LeaveOut
   */
  decide: async (id, status, approvalComment = null) => {
    const body = {
      status: status,
    };
    if (approvalComment) {
      body.approval_comment = approvalComment;
    }
    const data = await apiClient.patch(`/leave/${id}/decide`, body);
    return transformLeave(data);
  },
};
