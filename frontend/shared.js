// ===== Shared Utility Functions =====

// Local Storage Keys
const STORAGE_KEY_USERS = 'app_users';
const STORAGE_KEY_TASKS = 'app_tasks_';
const STORAGE_KEY_CURRENT_USER = 'app_current_user';

// Initialize test account
function initializeTestAccount() {
    const users = getUsersFromStorage();
    const testUserExists = users.some(u => u.email === 'demo@mail.com');
    
    if (!testUserExists) {
        const testUser = {
            id: generateId(),
            name: 'Demo User',
            email: 'demo@mail.com',
            password: btoa('123456')
        };
        users.push(testUser);
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    }
}

// User Storage Functions
function getUsersFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY_USERS);
    return stored ? JSON.parse(stored) : [];
}

function getCurrentUser() {
    const stored = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    return stored ? JSON.parse(stored) : null;
}

function saveCurrentUser(user) {
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
}

// Task Storage Functions
function getUserTasks(userId) {
    const storageKey = STORAGE_KEY_TASKS + userId;
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
}

function saveUserTasks(userId, tasks) {
    const storageKey = STORAGE_KEY_TASKS + userId;
    localStorage.setItem(storageKey, JSON.stringify(tasks));
}

// Utility Functions
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

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeTestAccount();
});
