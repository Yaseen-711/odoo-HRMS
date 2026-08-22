/**
 * Employee service — connects to the backend employee API endpoints.
 */

import { apiClient } from './apiClient';

/**
 * Transform backend employee data to the format the frontend expects.
 * Maps `employee_code` → `employee_id` for UI compatibility.
 */
const transformEmployee = (emp) => ({
  ...emp,
  employee_id: emp.employee_code || `EMP-${String(emp.id).padStart(4, '0')}`,
  // Backend doesn't have a status field on employees.
  // Default to empty string — pages can derive status from attendance/leave if needed.
  status: emp.status || '',
});

export const employeeService = {
  /**
   * [Admin/HR] List all employees.
   * GET /api/employees → list[EmployeeAdminOut]
   */
  getAll: async () => {
    const data = await apiClient.get('/employees');
    return data.map(transformEmployee);
  },

  /**
   * Get employee by numeric database ID.
   * GET /api/employees/{id} → EmployeeAdminOut | EmployeeSelfOut | EmployeeOut
   */
  getById: async (id) => {
    const data = await apiClient.get(`/employees/${id}`);
    return transformEmployee(data);
  },

  /**
   * Get employee by employee_code (e.g. "EMP-0001").
   * GET /api/employees/code/{employee_code} → EmployeeAdminOut | EmployeeSelfOut | EmployeeOut
   *
   * Use this when navigating from the directory where the URL contains
   * the business-facing employee_code, not the numeric DB id.
   */
  getByCode: async (employeeCode) => {
    const data = await apiClient.get(`/employees/code/${encodeURIComponent(employeeCode)}`);
    return transformEmployee(data);
  },

  /**
   * Get own employee profile.
   * GET /api/employees/me → EmployeeSelfOut
   */
  getMyProfile: async () => {
    const data = await apiClient.get('/employees/me');
    return transformEmployee(data);
  },

  /**
   * [Admin/HR] Create a new employee (onboarding).
   * POST /api/employees → EmployeeCreatedOut (includes login_id + temporary_password)
   */
  create: async (employeeData) => {
    const data = await apiClient.post('/employees', employeeData);
    return {
      employee: transformEmployee(data.employee),
      login_id: data.login_id,
      temporary_password: data.temporary_password,
    };
  },

  /**
   * Update own profile (phone, address, profile_picture, etc.).
   * PATCH /api/employees/me → EmployeeSelfOut
   */
  updateMyProfile: async (updateData) => {
    const data = await apiClient.patch('/employees/me', updateData);
    return transformEmployee(data);
  },

  /**
   * [Admin/HR] Update an employee record.
   * PATCH /api/employees/{id} → EmployeeAdminOut
   */
  adminUpdate: async (id, updateData) => {
    const data = await apiClient.patch(`/employees/${id}`, updateData);
    return transformEmployee(data);
  },
};
