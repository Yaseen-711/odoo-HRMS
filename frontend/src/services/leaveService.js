import { apiClient } from './apiClient';
import { leaveRepository } from '../data/leave';

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
    try {
      const body = {
        leave_type: data.leave_type,
        start_date: data.start_date,
        end_date: data.end_date,
        remarks: data.remarks || null,
      };
      const result = await apiClient.post('/leave', body);
      return transformLeave(result);
    } catch (err) {
      console.warn("Using local mock leaveRepository for create:", err.message);
      const currentUserStr = localStorage.getItem('dayflow_current_user');
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
      const empCode = currentUser?.employee_code || currentUser?.login_id || 'EMP-0001';
      return leaveRepository.submit(empCode, data);
    }
  },

  /**
   * List leave requests.
   * GET /api/leave?employee_id=X&status=Y → list[LeaveOut]
   * Admin sees all; Employee sees own.
   */
  getAll: async (employeeId = null, status = null) => {
    try {
      const params = {};
      if (employeeId) params.employee_id = employeeId;
      if (status) params.status = status;
      const data = await apiClient.get('/leave', params);
      return data.map(transformLeave);
    } catch (err) {
      console.warn("Using local mock leaveRepository for getAll:", err.message);
      let list = leaveRepository.getAll();
      if (employeeId) {
        list = list.filter(r => r.employee_id === employeeId);
      }
      if (status) {
        list = list.filter(r => r.status === status);
      }
      return list;
    }
  },

  /**
   * Get a single leave request by ID.
   * GET /api/leave/{id} → LeaveOut
   */
  getById: async (id) => {
    try {
      const data = await apiClient.get(`/leave/${id}`);
      return transformLeave(data);
    } catch (err) {
      console.warn(`Using local mock leaveRepository for getById(${id}):`, err.message);
      const list = leaveRepository.getAll();
      return list.find(r => r.id === id) || null;
    }
  },

  /**
   * [Admin] Approve or reject a leave request.
   * PATCH /api/leave/{id}/decide → LeaveOut
   */
  decide: async (id, status, approvalComment = null) => {
    try {
      const body = {
        status: status,
      };
      if (approvalComment) {
        body.approval_comment = approvalComment;
      }
      const data = await apiClient.patch(`/leave/${id}/decide`, body);
      return transformLeave(data);
    } catch (err) {
      console.warn(`Using local mock leaveRepository for decide(${id}):`, err.message);
      const list = leaveRepository.getAll();
      const req = list.find(r => r.id === id);
      if (req) {
        req.status = status;
        if (approvalComment) req.approval_comment = approvalComment;
        localStorage.setItem("dayflow_leaves", JSON.stringify(list));
        return req;
      }
      throw err;
    }
  },
};
