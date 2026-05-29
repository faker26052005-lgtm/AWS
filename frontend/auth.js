// ===== Authentication Logic =====

document.addEventListener('DOMContentLoaded', () => {
    initAuthListeners();
    checkAuthOnLoad();
});

function initAuthListeners() {
    // Form Switching
    document.getElementById('to-signup-btn').addEventListener('click', switchToSignup);
    document.getElementById('to-login-btn').addEventListener('click', switchToLogin);

    // Form Submission
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
}

function checkAuthOnLoad() {
    const currentUser = getCurrentUser();
    
    if (currentUser) {
        // User already logged in, redirect to app
        redirectToApp();
    }
}

function switchToSignup(event) {
    event.preventDefault();
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('signup-form').classList.add('active');
    clearAuthMessage();
}

function switchToLogin(event) {
    event.preventDefault();
    document.getElementById('signup-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
    clearAuthMessage();
}

function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    // Validation
    if (!email || !password) {
        showAuthMessage('Vui lòng điền email và mật khẩu', 'error');
        return;
    }

    // Check credentials
    const users = getUsersFromStorage();
    const user = users.find(u => u.email === email && u.password === btoa(password));

    if (!user) {
        showAuthMessage('Email hoặc mật khẩu không đúng', 'error');
        return;
    }

    // Login success
    showAuthMessage('Đăng nhập thành công! Đang chuyển hướng...', 'success');
    saveCurrentUser(user);
    
    setTimeout(() => {
        redirectToApp();
    }, 1000);
}

function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showAuthMessage('Vui lòng điền đầy đủ thông tin', 'error');
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showAuthMessage('Email không hợp lệ', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAuthMessage('Mật khẩu không khớp', 'error');
        return;
    }

    if (password.length < 6) {
        showAuthMessage('Mật khẩu phải có ít nhất 6 ký tự', 'error');
        return;
    }

    // Check if email already exists
    const users = getUsersFromStorage();
    if (users.find(u => u.email === email)) {
        showAuthMessage('Email này đã được đăng ký', 'error');
        return;
    }

    // Create new user
    const newUser = {
        id: generateId(),
        name,
        email,
        password: btoa(password)
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

    showAuthMessage('Đăng ký thành công! Đang chuyển hướng...', 'success');
    
    setTimeout(() => {
        saveCurrentUser(newUser);
        redirectToApp();
    }, 1500);
}

function showAuthMessage(message, type) {
    const messageEl = document.getElementById('auth-message');
    showMessage(messageEl, message, type);
}

function clearAuthMessage() {
    document.getElementById('auth-message').className = 'message';
}

function redirectToApp() {
    window.location.href = 'tasks.html';
}
