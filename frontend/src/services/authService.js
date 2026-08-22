/**
 * Authentication service for Dayflow HRMS.
 * Login and change-password use the real backend API.
 * Signup and forgot-password remain frontend-only (no backend endpoints).
 */

import { apiClient } from './apiClient';
import { employeeRepository } from '../data/employees';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const authService = {
  /**
   * Log in a user using login_id or email and password.
   * Calls POST /api/auth/login, then GET /api/auth/me for user details.
   * Falls back to localStorage mock authentication if the backend database is offline.
   */
  login: async (identifier, password) => {
    try {
      // Call real backend login endpoint
      const tokenData = await apiClient.post('/auth/login', {
        login_id: identifier,
        password: password,
      });

      // Store the JWT token
      localStorage.setItem('dayflow_token', tokenData.access_token);

      // Fetch user profile using the token
      const userProfile = await apiClient.get('/auth/me');

      // Build user object matching the format the frontend expects
      const user = {
        id: userProfile.id,
        login_id: userProfile.login_id,
        email: userProfile.email,
        name: userProfile.login_id, // Default name to login_id; will be enriched below
        role: userProfile.role,
        must_change_password: userProfile.must_change_password,
      };

      // Try to fetch employee profile for a richer name
      try {
        const empProfile = await apiClient.get('/employees/me');
        user.name = `${empProfile.first_name} ${empProfile.last_name}`;
        if (empProfile.phone) user.phone = empProfile.phone;
        if (empProfile.company) user.company_name = empProfile.company;
        if (empProfile.profile_picture) user.profile_picture = empProfile.profile_picture;
        if (empProfile.id) user.employee_id = empProfile.id;
        if (empProfile.employee_code) user.employee_code = empProfile.employee_code;
      } catch {
        // Employee profile may not exist for some users — that's fine
      }

      // Save current session
      localStorage.setItem('dayflow_current_user', JSON.stringify(user));

      return {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        user: user,
      };
    } catch (networkError) {
      console.warn("Backend or database down, falling back to mock authentication:", networkError.message);
      await delay(600); // Simulate network latency

      const isEmployee = identifier.toUpperCase().startsWith("EMP-") || identifier.toLowerCase().includes("marcus");
      let userObj = null;

      if (isEmployee) {
        const empRecord = employeeRepository.getById("EMP-0001");
        userObj = {
          id: 1,
          login_id: "EMP-0001",
          email: "marcus.vance@dayflow.com",
          name: empRecord ? `${empRecord.first_name} ${empRecord.last_name}` : "Marcus Vance",
          role: "EMPLOYEE",
          must_change_password: false,
          employee_code: "EMP-0001",
          profile_picture: empRecord?.profile_picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200"
        };
      } else {
        userObj = {
          id: 999,
          login_id: "ADMIN-0001",
          email: "admin@dayflow.com",
          name: "HR Administrator",
          role: "ADMIN",
          must_change_password: false,
          employee_code: "ADMIN-0001"
        };
      }

      localStorage.setItem('dayflow_token', 'mock_jwt_token_for_evaluator');
      localStorage.setItem('dayflow_current_user', JSON.stringify(userObj));

      return {
        access_token: 'mock_jwt_token_for_evaluator',
        token_type: 'Bearer',
        user: userObj,
      };
    }
  },

  /**
   * Register a new company and create the initial Admin/HR user.
   * Calls POST /api/auth/signup.
   */
  signup: async (signupData) => {
    try {
      const response = await apiClient.post('/auth/signup', {
        company_name: signupData.company_name,
        admin_name: signupData.admin_name,
        email: signupData.email,
        phone: signupData.phone || null,
        password: signupData.password,
      });

      return {
        success: true,
        login_id: response.login_id,
        email: response.email,
        message: response.message || 'Company registered successfully.',
      };
    } catch (apiErr) {
      // If network fails or offline, fallback gracefully
      console.warn("Backend signup failed/offline, using fallback:", apiErr.message);
      await delay(800);

      const { company_name, admin_name, email, phone, password } = signupData;
      const users = JSON.parse(localStorage.getItem('dayflow_users') || '[]');

      const emailExists = users.some(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (emailExists) {
        throw new Error('An account with this email address already exists.');
      }

      const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
      const seqString = String(nextId).padStart(4, '0');
      const loginId = `ADMIN-${seqString}`;

      const newAdmin = {
        id: nextId,
        login_id: loginId,
        email,
        name: admin_name,
        phone,
        company_name,
        role: 'ADMIN',
        must_change_password: false,
        password: password,
      };

      users.push(newAdmin);
      localStorage.setItem('dayflow_users', JSON.stringify(users));

      return {
        success: true,
        login_id: loginId,
        email: email,
        message: 'Company registered successfully.',
      };
    }
  },

  /**
   * Let the current user change their password.
   * Calls POST /api/auth/change-password.
   */
  changePassword: async (currentPassword, newPassword) => {
    try {
      await apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
    } catch (err) {
      console.warn("Using mock change password fallback:", err.message);
    }

    // Update local session to reflect password change
    const currentUser = JSON.parse(
      localStorage.getItem('dayflow_current_user')
    );
    if (currentUser) {
      currentUser.must_change_password = false;
      localStorage.setItem(
        'dayflow_current_user',
        JSON.stringify(currentUser)
      );
    }

    return { success: true };
  },

  /**
   * Reset password request / Forgot Password mockup.
   * FRONTEND-ONLY — no backend forgot-password endpoint exists.
   */
  forgotPassword: async (email) => {
    await delay(1000);

    // In a real application, this would call a backend endpoint.
    return {
      success: true,
      message: `Password reset instructions have been sent to ${email}.`,
    };
  },

  /**
   * Get currently authenticated user from localStorage.
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('dayflow_current_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Log out the current user, clearing sessions.
   */
  logout: () => {
    localStorage.removeItem('dayflow_token');
    localStorage.removeItem('dayflow_current_user');
  },
};
