// ===== Authentication Logic with AWS Cognito =====

// Ensure `Auth` global exists (CDN bundles may expose Amplify under different globals)
if (typeof Auth === 'undefined') {
    if (typeof Amplify !== 'undefined' && Amplify.Auth) {
        window.Auth = Amplify.Auth;
    } else if (typeof window.aws_amplify !== 'undefined' && window.aws_amplify.Auth) {
        window.Auth = window.aws_amplify.Auth;
    }
}

// Enable Amplify debug logging when available to help diagnose auth issues
if (typeof Amplify !== 'undefined' && Amplify.Logger) {
    try {
        Amplify.Logger.LOG_LEVEL = 'DEBUG';
    } catch (e) {
        // ignore if setting log level isn't supported in this build
    }
}

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

/**
 * Kiểm tra xem user đã đăng nhập chưa khi load trang
 */
async function checkAuthOnLoad() {
    try {
        const isSignedIn = await isUserSignedIn();
        
        if (isSignedIn) {
            // User đã đăng nhập, chuyển hướng đến app
            redirectToApp();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
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

/**
 * Xử lý đăng nhập qua AWS Cognito
 */
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const loginButton = event.target.querySelector('button[type="submit"]');

    setButtonLoading(loginButton, 'Đăng Nhập');
    
    const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({ Username: email, Password: password });
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: userPool });

    cognitoUser.authenticateUser(authDetails, {
        onSuccess: function(result) {
            unsetButtonLoading(loginButton);
            showAuthMessage('✅ Đăng nhập thành công! Đang chuyển hướng...', 'success');
            
            localStorage.setItem('aws_access_token', result.getAccessToken().getJwtToken());
            localStorage.setItem('app_current_user', JSON.stringify({ name: email, email: email }));

            setTimeout(() => { window.location.href = AWS_CONFIG.cognito.redirectSignIn; }, 1000);
        },
        onFailure: function(err) {
            unsetButtonLoading(loginButton);
            showAuthMessage(`❌ Đăng nhập thất bại: ${err.message}`, 'error');
        }
    });
}

/**
 * Xử lý đăng ký qua AWS Cognito
 */
async function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const signupButton = event.target.querySelector('button[type="submit"]');

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

    if (password.length < 8) {
        showAuthMessage('Mật khẩu phải có ít nhất 8 ký tự', 'error');
        return;
    }

    // Kiểm tra độ mạnh mật khẩu (phải có số, chữ hoa, chữ thường)
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        showAuthMessage('Mật khẩu phải chứa chữ hoa, chữ thường và số', 'error');
        return;
    }

    try {
        if (typeof isAuthConfigured === 'function' && !isAuthConfigured()) {
            showAuthMessage('❌ Authentication not configured. Vui lòng kiểm tra cấu hình.', 'error');
            return;
        }
        // Bật loading state
        setButtonLoading(signupButton, 'Đăng Ký');
        showAuthMessage('Đang tạo tài khoản...', 'info');

        // Gọi Cognito sign up
        const { userSub } = await Auth.signUp({
            username: email,
            password: password,
            attributes: {
                email: email,
                name: name,
                given_name: name.split(' ')[0] || name,
                family_name: name.split(' ').slice(1).join(' ') || ''
            },
            validationData: []
        });

        showAuthMessage('✅ Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.', 'success');
        
        // Chuyển sang form xác nhận (nếu cần)
        setTimeout(() => {
            document.getElementById('signup-form').classList.remove('active');
            document.getElementById('login-form').classList.add('active');
            clearAuthMessage();
        }, 2000);

    } catch (error) {
        console.error('Signup error:', error);

        // Xử lý các lỗi Cognito khác nhau
        const code = error.code || error.name || '';
        const message = error.message || String(error);

        if (code === 'UsernameExistsException') {
            showAuthMessage('❌ Email này đã được đăng ký', 'error');
        } else if (code === 'InvalidPasswordException') {
            showAuthMessage('❌ Mật khẩu không đủ mạnh. Cần có chữ hoa, chữ thường và số.', 'error');
        } else if (code) {
            showAuthMessage(`❌ Lỗi đăng ký: ${code} - ${message}`, 'error');
        } else {
            showAuthMessage(`❌ Lỗi đăng ký: ${message}`, 'error');
        }

        // For debugging: log full error details
        console.debug('Signup error details:', { code, message, error });
    } finally {
        // Tắt loading state
        unsetButtonLoading(signupButton);
    }
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
