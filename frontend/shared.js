// ===== Shared Utility Functions with AWS Integration =====

// Local Storage Keys
const STORAGE_KEY_CURRENT_USER = 'app_current_user';
const STORAGE_KEY_AUTH_TOKEN = 'app_auth_token';
const STORAGE_KEY_ID_TOKEN = 'app_id_token';
const STORAGE_KEY_REFRESH_TOKEN = 'app_refresh_token';

// ===== AWS Cognito Helper Functions =====

/**
 * Kiểm tra xem Amplify/Auth đã được cấu hình đầy đủ hay chưa
 * @returns {boolean}
 */
function isAuthConfigured() {
    try {
        return typeof Amplify !== 'undefined' && typeof Auth !== 'undefined' &&
            AWS_CONFIG && AWS_CONFIG.cognito &&
            AWS_CONFIG.cognito.userPoolId && AWS_CONFIG.cognito.clientId;
    } catch (e) {
        return false;
    }
}

/**
 * Lấy user hiện tại từ Cognito
 * @returns {Promise<object|null>} User object hoặc null nếu chưa đăng nhập
 */
async function getCurrentUser() {
    try {
        if (!isAuthConfigured()) {
            console.warn('getCurrentUser: Amplify/Auth not configured');
            return null;
        }

        const user = await Auth.currentAuthenticatedUser();
        return user;
    } catch (error) {
        // User không đăng nhập hoặc phiên hết hạn
        return null;
    }
}

/**
 * Lấy thông tin user từ Cognito
 * @returns {Promise<object>} User attributes
 */
async function getCurrentUserAttributes() {
    try {
        const user = await Auth.currentAuthenticatedUser();
        const attributes = await Auth.userAttributes(user);
        
        return {
            id: user.username,
            email: attributes.find(attr => attr.Name === 'email')?.Value,
            name: attributes.find(attr => attr.Name === 'name')?.Value || attributes.find(attr => attr.Name === 'given_name')?.Value,
            attributes: attributes
        };
    } catch (error) {
        console.error('Error getting user attributes:', error);
        return null;
    }
}

/**
 * Lấy JWT token từ Cognito
 * @returns {Promise<string>} JWT token
 */
async function getAuthToken() {
    try {
        if (!isAuthConfigured()) {
            console.warn('getAuthToken: Amplify/Auth not configured');
            return null;
        }

        const session = await Auth.currentSession();
        return session.getAccessToken().getJwtToken();
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
}

/**
 * Lưu Cognito tokens vào localStorage
 */
async function saveCognitoTokens() {
    try {
        if (!isAuthConfigured()) {
            console.warn('saveCognitoTokens: Amplify/Auth not configured');
            return;
        }

        const session = await Auth.currentSession();
        const accessToken = session.getAccessToken().getJwtToken();
        const idToken = session.getIdToken().getJwtToken();
        const refreshToken = session.getRefreshToken().getToken();

        localStorage.setItem(STORAGE_KEY_AUTH_TOKEN, accessToken);
        localStorage.setItem(STORAGE_KEY_ID_TOKEN, idToken);
        localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, refreshToken);
    } catch (error) {
        console.error('Error saving Cognito tokens:', error);
    }
}

/**
 * Xóa tokens khi đăng xuất
 */
function clearAuthTokens() {
    localStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEY_ID_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
}

/**
 * Kiểm tra user đã đăng nhập chưa
 * @returns {Promise<boolean>}
 */
function isUserSignedIn() {
    if (typeof userPool === 'undefined' || !userPool) return Promise.resolve(false);
    const cognitoUser = userPool.getCurrentUser();
    return new Promise((resolve) => {
        if (cognitoUser != null) {
            cognitoUser.getSession((err, session) => {
                if (err) resolve(false);
                else resolve(true);
            });
        } else {
            resolve(false);
        }
    });
}

// ===== API Gateway Helper Functions =====

/**
 * Gọi API Gateway với JWT authentication
 * @param {string} endpoint - API endpoint (vd: '/tasks', '/tasks/123')
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<object>} Response data
 */
async function apiCall(endpoint, options = {}) {
    try {
        const token = await getAuthToken();
        
        if (!token) {
            throw new Error('Unauthorized - Please sign in');
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };
        
        const baseUrl = AWS_CONFIG.api.baseUrl;
        const url = `${baseUrl}${endpoint}`;
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        // Xử lý response
        if (response.status === 401) {
            // Token hết hạn, đăng xuất người dùng
            clearAuthTokens();
            window.location.href = 'auth.html';
            throw new Error('Session expired - Please sign in again');
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API Error: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

// ===== Task API Functions =====

/**
 * Lấy danh sách tất cả tasks của user
 * @returns {Promise<array>}
 */
async function getUserTasks() {
    try {
        return await apiCall('/tasks');
    } catch (error) {
        console.error('Error fetching tasks:', error);
        throw error;
    }
}

/**
 * Tạo task mới
 * @param {object} taskData - { title, description, deadline, priority }
 * @returns {Promise<object>} Created task
 */
async function createTask(taskData) {
    try {
        return await apiCall('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    } catch (error) {
        console.error('Error creating task:', error);
        throw error;
    }
}

/**
 * Cập nhật task
 * @param {string} taskId - Task ID
 * @param {object} taskData - Updated task data
 * @returns {Promise<object>} Updated task
 */
async function updateTask(taskId, taskData) {
    try {
        return await apiCall(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(taskData)
        });
    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
}

/**
 * Xóa task
 * @param {string} taskId - Task ID
 * @returns {Promise<void>}
 */
async function deleteTask(taskId) {
    try {
        return await apiCall(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
}

// ===== Utility Functions =====
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) {
        return '📅 Hôm nay';
    } else if (isTomorrow) {
        return '📅 Ngày mai';
    } else {
        const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
        if (diff < 0) {
            return `📅 ${Math.abs(diff)} ngày trước`;
        }
        return `📅 ${date.toLocaleDateString('vi-VN')}`;
    }
}

function getPriorityText(priority) {
    const priorityMap = {
        'high': '🔴 Cao',
        'medium': '🟡 Trung bình',
        'low': '🟢 Thấp'
    };
    return priorityMap[priority] || priority;
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    
    setTimeout(() => {
        element.className = 'message';
    }, 5000);
}

// ===== Loading State Management =====

/**
 * Bật loading state cho button
 * @param {HTMLElement} button - Button element
 * @param {string} originalText - Original button text
 */
function setButtonLoading(button, originalText) {
    button.disabled = true;
    button.dataset.originalText = originalText;
    button.innerHTML = '<span class="spinner"></span> Đang xử lý...';
}

/**
 * Tắt loading state cho button
 * @param {HTMLElement} button - Button element
 */
function unsetButtonLoading(button) {
    button.disabled = false;
    const originalText = button.dataset.originalText || 'Lưu';
    button.textContent = originalText;
}

/**
 * Bật loading overlay
 */
function showLoadingOverlay() {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div><p>Đang tải...</p>';
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

/**
 * Tắt loading overlay
 */
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // `initializeTestAccount` is optional helper used in dev. Provide a noop if absent.
    try {
        if (typeof initializeTestAccount === 'function') {
            initializeTestAccount();
        }
    } catch (e) {
        console.warn('initializeTestAccount failed:', e);
    }
});

// Provide a minimal stub for initializeTestAccount to avoid ReferenceError in production
function initializeTestAccount() {
    // Intentionally empty. Projects can override this in a dev helper script.
}
