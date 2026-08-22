/**
 * Document service — connects to backend employee document API endpoints.
 */

import { apiClient } from './apiClient';

const getToken = () => localStorage.getItem('dayflow_token');

export const documentService = {
  /**
   * Upload a file for an employee.
   * POST /api/employees/{employeeId}/documents
   */
  upload: async (employeeId, file, documentType = 'OTHER') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    const headers = {};
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/employees/${employeeId}/documents`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      let msg = 'Failed to upload document';
      try {
        const errJson = await response.json();
        msg = errJson.detail || msg;
      } catch {}
      throw new Error(msg);
    }

    return response.json();
  },

  /**
   * List all documents for an employee.
   * GET /api/employees/{employeeId}/documents
   */
  getByEmployee: async (employeeId) => {
    return apiClient.get(`/employees/${employeeId}/documents`);
  },

  /**
   * Download a document by ID.
   * GET /api/documents/{docId}/download
   */
  download: async (docId, fileName) => {
    const headers = {};
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/documents/${docId}/download`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error('Failed to download document');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Delete a document by ID.
   * DELETE /api/documents/{docId}
   */
  delete: async (docId) => {
    return apiClient.del(`/documents/${docId}`);
  },
};
