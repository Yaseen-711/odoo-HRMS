import { apiClient } from './apiClient';
import { employeeRepository } from '../data/employees';

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
    try {
      const data = await apiClient.get('/employees');
      return data.map(transformEmployee);
    } catch (err) {
      console.warn("Using local mock employeeRepository:", err.message);
      return employeeRepository.getAll();
    }
  },

  /**
   * Get employee by numeric ID.
   * GET /api/employees/{id} → EmployeeAdminOut | EmployeeSelfOut | EmployeeOut
   */
  getById: async (id) => {
    try {
      const data = await apiClient.get(`/employees/${id}`);
      return transformEmployee(data);
    } catch (err) {
      console.warn(`Using local mock employeeRepository for getById(${id}):`, err.message);
      return employeeRepository.getById(id);
    }
  },

  /**
   * Get own employee profile.
   * GET /api/employees/me → EmployeeSelfOut
   */
  getMyProfile: async () => {
    try {
      const data = await apiClient.get('/employees/me');
      return transformEmployee(data);
    } catch (err) {
      console.warn("Using local mock employeeRepository for getMyProfile:", err.message);
      const currentUserStr = localStorage.getItem('dayflow_current_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        const code = currentUser.employee_code || currentUser.login_id || 'EMP-0001';
        return employeeRepository.getById(code);
      }
      return employeeRepository.getById('EMP-0001');
    }
  },

  /**
   * [Admin/HR] Create a new employee (onboarding).
   * POST /api/employees → EmployeeCreatedOut (includes login_id + temporary_password)
   */
  create: async (employeeData) => {
    try {
      const data = await apiClient.post('/employees', employeeData);
      return {
        employee: transformEmployee(data.employee),
        login_id: data.login_id,
        temporary_password: data.temporary_password,
      };
    } catch (err) {
      console.warn("Using local mock employeeRepository for create:", err.message);
      const newEmp = employeeRepository.create(employeeData);
      return {
        employee: newEmp,
        login_id: newEmp.employee_id,
        temporary_password: "password",
      };
    }
  },

  /**
   * Update own profile (phone, address, profile_picture, etc.).
   * PATCH /api/employees/me → EmployeeSelfOut
   */
  updateMyProfile: async (updateData) => {
    try {
      const data = await apiClient.patch('/employees/me', updateData);
      return transformEmployee(data);
    } catch (err) {
      console.warn("Using local mock employeeRepository for updateMyProfile:", err.message);
      const currentUserStr = localStorage.getItem('dayflow_current_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        const code = currentUser.employee_code || currentUser.login_id || 'EMP-0001';
        const emp = employeeRepository.getById(code);
        if (emp) {
          return employeeRepository.update(emp.id, updateData);
        }
      }
      return employeeRepository.update(1, updateData);
    }
  },

  /**
   * [Admin/HR] Update an employee record.
   * PATCH /api/employees/{id} → EmployeeAdminOut
   */
  adminUpdate: async (id, updateData) => {
    try {
      const data = await apiClient.patch(`/employees/${id}`, updateData);
      return transformEmployee(data);
    } catch (err) {
      console.warn(`Using local mock employeeRepository for adminUpdate(${id}):`, err.message);
      return employeeRepository.update(id, updateData);
    }
  },
};
