const API_BASE_URL = 'http://localhost:3000/api';

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'omit',
    ...options,
    headers
  });

  if (response.status === 401) {
    clearSession();
    window.location.href = 'auth.html';
    throw new Error('Unauthorized. Please sign in again.');
  }

  if (response.status === 204) {
    return {};
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body && body.message ? body.message : response.statusText;
    throw new Error(message || 'API request failed');
  }

  return body;
}

function getAuthToken() {
  return localStorage.getItem('app_auth_token');
}

function saveSession(user, token) {
  localStorage.setItem('app_current_user', JSON.stringify(user));
  localStorage.setItem('app_auth_token', token);
}

function clearSession() {
  localStorage.removeItem('app_current_user');
  localStorage.removeItem('app_auth_token');
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('app_current_user') || 'null');
  } catch (error) {
    return null;
  }
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user || !getAuthToken()) {
    window.location.href = 'auth.html';
    return null;
  }
  return user;
}

function buildTaskPriorityLabel(priority) {
  switch (priority) {
    case 'high':
      return '🔴 Cao';
    case 'medium':
      return '🟡 Trung bình';
    case 'low':
      return '🟢 Thấp';
    default:
      return priority;
  }
}

function formatDateText(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function showMessage(element, message, type = 'info') {
  if (!element) return;
  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = 'block';
}

async function signupUser(name, email, password) {
  return apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });
}

async function loginUser(email, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

async function logoutUser() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    clearSession();
    window.location.href = 'auth.html';
  }
}

async function fetchTasks() {
  return apiRequest('/tasks');
}

async function createTask(taskData) {
  return apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData)
  });
}

async function updateTask(taskId, taskData) {
  return apiRequest(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(taskData)
  });
}

async function deleteTaskById(taskId) {
  return apiRequest(`/tasks/${taskId}`, {
    method: 'DELETE'
  });
}
