/**
 * Central API client for Dayflow HRMS.
 * Wraps fetch with auth headers, JSON handling, and error management.
 */

const API_BASE = '/api';

/**
 * Get the stored auth token.
 */
const getToken = () => localStorage.getItem('dayflow_token');

/**
 * Build headers for API requests.
 */
const buildHeaders = (hasBody = false) => {
  const headers = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

/**
 * Handle API response — parse JSON or throw on error.
 */
const handleResponse = async (response) => {
  // 204 No Content
  if (response.status === 204) {
    return null;
  }

  // Try to parse JSON body
  let body = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    body = await response.json();
  }

  if (!response.ok) {
    // If 401 Unauthorized, clear auth state
    if (response.status === 401) {
      localStorage.removeItem('dayflow_token');
      localStorage.removeItem('dayflow_current_user');
      // Only redirect if we're not already on a public page
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/signup') &&
        !window.location.pathname.includes('/forgot-password')
      ) {
        window.location.href = '/login';
      }
    }

    // Extract error message from FastAPI's response format
    const message =
      body?.detail ||
      (typeof body?.detail === 'object' ? JSON.stringify(body.detail) : null) ||
      body?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
};

/**
 * API client methods.
 */
export const apiClient = {
  get: async (path, queryParams = {}) => {
    const url = new URL(`${API_BASE}${path}`, window.location.origin);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildHeaders(false),
    });

    return handleResponse(response);
  },

  post: async (path, body = null) => {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: buildHeaders(body !== null),
      body: body !== null ? JSON.stringify(body) : undefined,
    });

    return handleResponse(response);
  },

  patch: async (path, body = null) => {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: buildHeaders(body !== null),
      body: body !== null ? JSON.stringify(body) : undefined,
    });

    return handleResponse(response);
  },

  del: async (path) => {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(false),
    });

    return handleResponse(response);
  },
};
