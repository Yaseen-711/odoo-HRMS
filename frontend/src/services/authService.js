/**
 * Authentication service for Dayflow HRMS.
 * Currently simulates interaction with the FastAPI backend.
 * Stored credentials and active user sessions are persisted in localStorage.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Pre-seeded accounts in localStorage if not already present
const initMockDB = () => {
  const users = localStorage.getItem("dayflow_users");
  if (!users) {
    const seedUsers = [
      {
        id: 1,
        login_id: "ADMIN-0001",
        email: "admin@dayflow.com",
        name: "Yaseen HR Admin",
        phone: "+919876543210",
        company_name: "Dayflow Corp",
        role: "ADMIN",
        must_change_password: false,
        password: "password", // In a real DB this would be hashed
      },
      {
        id: 2,
        login_id: "EMP-0001",
        email: "employee@dayflow.com",
        name: "John Doe",
        phone: "+919876543211",
        company_name: "Dayflow Corp",
        role: "EMPLOYEE",
        must_change_password: true, // Forces password change on first login
        password: "password",
      }
    ];
    localStorage.setItem("dayflow_users", JSON.stringify(seedUsers));
  }
};

initMockDB();

export const authService = {
  /**
   * Log in a user using login_id or email and password
   */
  login: async (identifier, password) => {
    await delay(1000); // Simulate network latency

    const users = JSON.parse(localStorage.getItem("dayflow_users") || "[]");
    const user = users.find(
      (u) => (u.login_id === identifier || u.email === identifier)
    );

    if (!user) {
      throw new Error("Invalid credentials. User not found.");
    }

    if (user.password !== password) {
      throw new Error("Invalid credentials. Incorrect password.");
    }

    // Generate a mock JWT token containing user details
    const token = btoa(JSON.stringify({ user_id: user.id, role: user.role, email: user.email }));
    
    // Save current session
    localStorage.setItem("dayflow_token", token);
    localStorage.setItem("dayflow_current_user", JSON.stringify({
      id: user.id,
      login_id: user.login_id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      company_name: user.company_name,
      role: user.role,
      must_change_password: user.must_change_password
    }));

    return {
      access_token: token,
      token_type: "bearer",
      user: {
        id: user.id,
        login_id: user.login_id,
        email: user.email,
        name: user.name,
        role: user.role,
        must_change_password: user.must_change_password
      }
    };
  },

  /**
   * Register a new company and create the initial Admin/HR user
   */
  signup: async (signupData) => {
    await delay(1200);

    const { company_name, admin_name, email, phone, password } = signupData;
    const users = JSON.parse(localStorage.getItem("dayflow_users") || "[]");

    // Check if email already exists
    const emailExists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      throw new Error("An account with this email address already exists.");
    }

    const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    const seqString = String(nextId).padStart(4, "0");
    const loginId = `ADMIN-${seqString}`;

    const newAdmin = {
      id: nextId,
      login_id: loginId,
      email,
      name: admin_name,
      phone,
      company_name,
      role: "ADMIN",
      must_change_password: false,
      password: password,
    };

    users.push(newAdmin);
    localStorage.setItem("dayflow_users", JSON.stringify(users));

    return {
      success: true,
      login_id: loginId,
      email: email,
      message: "Company registered successfully."
    };
  },

  /**
   * Let the current user change their password
   */
  changePassword: async (currentPassword, newPassword) => {
    await delay(800);
    const currentUser = JSON.parse(localStorage.getItem("dayflow_current_user"));
    if (!currentUser) {
      throw new Error("No active session found.");
    }

    const users = JSON.parse(localStorage.getItem("dayflow_users") || "[]");
    const userIndex = users.findIndex((u) => u.id === currentUser.id);

    if (userIndex === -1) {
      throw new Error("User record not found in database.");
    }

    const user = users[userIndex];
    if (user.password !== currentPassword) {
      throw new Error("Current password is incorrect.");
    }

    if (currentPassword === newPassword) {
      throw new Error("New password must differ from your current password.");
    }

    // Update DB
    user.password = newPassword;
    user.must_change_password = false;
    users[userIndex] = user;
    localStorage.setItem("dayflow_users", JSON.stringify(users));

    // Update active session
    currentUser.must_change_password = false;
    localStorage.setItem("dayflow_current_user", JSON.stringify(currentUser));

    return { success: true };
  },

  /**
   * Reset password request / Forgot Password mockup
   */
  forgotPassword: async (email) => {
    await delay(1000);
    const users = JSON.parse(localStorage.getItem("dayflow_users") || "[]");
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      throw new Error("No account found with this email address.");
    }

    // In a real application, this would email a reset token.
    return {
      success: true,
      message: `Password reset instructions have been sent to ${email}.`
    };
  },

  /**
   * Get currently authenticated user from localStorage
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem("dayflow_current_user");
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Log out the current user, clearing sessions
   */
  logout: () => {
    localStorage.removeItem("dayflow_token");
    localStorage.removeItem("dayflow_current_user");
  }
};
