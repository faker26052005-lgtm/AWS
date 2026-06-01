const STORAGE_CURRENT_USER = 'app_current_user';
const STORAGE_AUTH_TOKEN = 'app_auth_token';

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_CURRENT_USER) || 'null');
  } catch (error) {
    return null;
  }
}

function getAuthToken() {
  return localStorage.getItem(STORAGE_AUTH_TOKEN);
}

function saveSession(user, token) {
  localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_AUTH_TOKEN, token);
}

function clearSession() {
  localStorage.removeItem(STORAGE_CURRENT_USER);
  localStorage.removeItem(STORAGE_AUTH_TOKEN);
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user || !getAuthToken()) {
    window.location.href = 'auth.html';
    return null;
  }
  return user;
}

function showMessage(element, message, type = 'info') {
  if (!element) return;
  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = 'block';
}

function hideMessage(element) {
  if (!element) return;
  element.style.display = 'none';
  element.className = 'message';
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getPriorityLabel(priority) {
  switch (priority) {
    case 'high':
      return '🔴 Cao';
    case 'medium':
      return '🟡 Trung bình';
    case 'low':
      return '🟢 Thấp';
    default:
      return priority || '';
  }
}

function getPriorityClass(priority) {
  switch (priority) {
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'low';
    default:
      return 'low';
  }
}
