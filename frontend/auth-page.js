document.addEventListener('DOMContentLoaded', () => {
  initAuthListeners();
  const currentUser = getCurrentUser();
  if (currentUser && getAuthToken()) {
    window.location.href = 'tasks.html';
  }
});

function initAuthListeners() {
  const signupButton = document.getElementById('to-signup-btn');
  const loginButton = document.getElementById('to-login-btn');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (signupButton) signupButton.addEventListener('click', switchToSignup);
  if (loginButton) loginButton.addEventListener('click', switchToLogin);
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (signupForm) signupForm.addEventListener('submit', handleSignup);
}

function switchToSignup(event) {
  event.preventDefault();
  document.getElementById('login-form').classList.remove('active');
  document.getElementById('signup-form').classList.add('active');
  hideMessage(document.getElementById('auth-message'));
}

function switchToLogin(event) {
  event.preventDefault();
  document.getElementById('signup-form').classList.remove('active');
  document.getElementById('login-form').classList.add('active');
  hideMessage(document.getElementById('auth-message'));
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const messageEl = document.getElementById('auth-message');
  const submitButton = event.target.querySelector('button[type="submit"]');

  hideMessage(messageEl);

  if (!email || !password) {
    showMessage(messageEl, 'Vui lòng nhập email và mật khẩu.', 'error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Đang đăng nhập...';

  try {
    const result = await loginUser(email, password);
    saveSession(result.user, result.token);
    window.location.href = 'tasks.html';
  } catch (error) {
    showMessage(messageEl, error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Đăng Nhập';
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  const messageEl = document.getElementById('auth-message');
  const submitButton = event.target.querySelector('button[type="submit"]');

  hideMessage(messageEl);

  if (!name || !email || !password || !confirmPassword) {
    showMessage(messageEl, 'Vui lòng điền đầy đủ thông tin.', 'error');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage(messageEl, 'Email không hợp lệ.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showMessage(messageEl, 'Mật khẩu không khớp.', 'error');
    return;
  }

  if (password.length < 6) {
    showMessage(messageEl, 'Mật khẩu phải có ít nhất 6 ký tự.', 'error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Đang đăng ký...';

  try {
    const result = await signupUser(name, email, password);
    saveSession(result.user, result.token);
    window.location.href = 'tasks.html';
  } catch (error) {
    showMessage(messageEl, error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Đăng Ký';
  }
}
