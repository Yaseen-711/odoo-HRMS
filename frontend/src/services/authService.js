/**
 * Authentication service for Dayflow HRMS.
 * Login and change-password use the real backend API.
 * Signup and forgot-password remain frontend-only (no backend endpoints).
 */

import { apiClient } from './apiClient';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const authService = {
  /**
   * Log in a user using login_id or email and password.
   * Calls POST /api/auth/login, then GET /api/auth/me for user details.
   */
  login: async (identifier, password) => {
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
  },

  /**
   * Register a new company and create the initial Admin/HR user.
   * FRONTEND-ONLY — no backend signup endpoint exists.
   */
  signup: async (signupData) => {
    await delay(1200);

    const { company_name, admin_name, email, phone, password } = signupData;
    const users = JSON.parse(localStorage.getItem('dayflow_users') || '[]');

    // Check if email already exists
    const emailExists = users.some(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (emailExists) {
      throw new Error('An account with this email address already exists.');
    }

    const nextId =
      users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
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
  },

  /**
   * Let the current user change their password.
   * Calls POST /api/auth/change-password.
   */
  changePassword: async (currentPassword, newPassword) => {
    await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });

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
