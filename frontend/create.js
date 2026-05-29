// ===== Create Task Page Logic =====

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndInit();
});

function checkAuthAndInit() {
    currentUser = getCurrentUser();
    
    if (!currentUser) {
        window.location.href = 'auth.html';
        return;
    }

    // Set up UI
    document.getElementById('username').textContent = currentUser.name;
    
    // Initialize event listeners
    initEventListeners();
}

function initEventListeners() {
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Add Task Form
    document.getElementById('add-task-form').addEventListener('submit', handleAddTask);
}

function handleLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        clearCurrentUser();
        window.location.href = 'auth.html';
    }
}

function handleAddTask(event) {
    event.preventDefault();

    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;

    if (!title || !deadline) {
        showTaskMessage('Vui lòng điền tiêu đề và ngày đến hạn', 'error');
        return;
    }

    // Create new task
    const newTask = {
        id: generateId(),
        title,
        description,
        deadline,
        priority,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    // Get existing tasks
    let tasks = getUserTasks(currentUser.id);
    tasks.push(newTask);
    
    // Save to localStorage
    saveUserTasks(currentUser.id, tasks);

    // Show success message
    showTaskMessage('✅ Công việc được tạo thành công!', 'success');
    
    // Show animation
    showSuccessAnimation();

    // Reset form
    document.getElementById('add-task-form').reset();

    // Auto redirect after 2 seconds
    setTimeout(() => {
        window.location.href = 'tasks.html';
    }, 2000);
}

function showSuccessAnimation() {
    const animation = document.getElementById('success-animation');
    animation.classList.remove('hidden');
    
    setTimeout(() => {
        animation.classList.add('hidden');
    }, 2000);
}

function showTaskMessage(message, type) {
    const messageEl = document.getElementById('add-task-message');
    showMessage(messageEl, message, type);
}
