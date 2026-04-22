const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('taskflow_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

export const authAPI = {
  login: async (email, password) => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data;
  },
  register: async (email, password) => {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    return data;
  },
  verifyCode: async (email, code, skip_2fa) => {
    const res = await fetch(`${BASE_URL}/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, skip_2fa })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Verification failed');
    return data;
  }
};

export const taskAPI = {
  getTasks: async () => {
    const res = await fetch(`${BASE_URL}/tasks`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },
  createTask: async (data) => {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },
  updateTask: async (id, data) => {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },
  deleteTask: async (id) => {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
  },
  updateNotifyStatus: async (id, data) => {
    const res = await fetch(`${BASE_URL}/tasks/${id}/notify-status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update notify status');
    return res.json();
  }
};

export const statsAPI = {
  getStats: async () => {
    const res = await fetch(`${BASE_URL}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  }
};

export const googleAPI = {
  getAuthUrl: async (redirectUri) => {
    const res = await fetch(`${BASE_URL}/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to get Google Auth URL');
    return res.json();
  },
  callback: async (code, redirectUri) => {
    const res = await fetch(`${BASE_URL}/auth/google/callback`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ code, redirect_uri: redirectUri })
    });
    if (!res.ok) throw new Error('Failed to link Google account');
    return res.json();
  },
  getStatus: async () => {
    const res = await fetch(`${BASE_URL}/auth/google/status`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to get Google status');
    return res.json();
  },
  toggleSync: async (enabled) => {
    const res = await fetch(`${BASE_URL}/auth/google/toggle`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled })
    });
    if (!res.ok) throw new Error('Failed to toggle Google sync');
    return res.json();
  },
  unlink: async () => {
    const res = await fetch(`${BASE_URL}/auth/google/unlink`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to unlink Google account');
    return res.json();
  }
};
