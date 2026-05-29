// ===== App State Management =====

let currentUser = null;
let tasks = [];
let filters = {
    priority: 'all',
    status: 'all',
    deadline: null
};
let editingTaskId = null;

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndInit();
});

function checkAuthAndInit() {
    currentUser = getCurrentUser();
    
    if (!currentUser) {
        // Not logged in, redirect to auth page
        window.location.href = 'auth.html';
        return;
    }

    // Load user's tasks
    tasks = getUserTasks(currentUser.id);
    
    // Set up UI
    document.getElementById('username').textContent = currentUser.name;
    
    // Initialize event listeners
    initEventListeners();
    
    // Render initial state
    renderTasks();
}

// ===== Event Listeners Setup =====
function initEventListeners() {
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Add Task Form
    document.getElementById('add-task-form').addEventListener('submit', handleAddTask);

    // Filter Buttons
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', handleFilterChange);
    });

    // Deadline Filter
    document.getElementById('filter-deadline').addEventListener('change', handleDeadlineFilter);
    document.getElementById('clear-deadline-btn').addEventListener('click', clearDeadlineFilter);

    // Modal Events
    document.querySelector('.modal-close').addEventListener('click', closeEditModal);
    document.querySelector('.modal-cancel').addEventListener('click', closeEditModal);
    document.getElementById('edit-task-form').addEventListener('submit', handleEditTask);

    // Task List Delegation
    document.getElementById('tasks-list').addEventListener('change', handleTaskStatusChange);
    document.getElementById('tasks-list').addEventListener('click', handleTaskActions);
}

// ===== Logout =====
function handleLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        clearCurrentUser();
        window.location.href = 'auth.html';
    }
}

// ===== Add Task =====
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

    const newTask = {
        id: generateId(),
        title,
        description,
        deadline,
        priority,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    saveUserTasks(currentUser.id, tasks);
    renderTasks();

    document.getElementById('add-task-form').reset();
    showTaskMessage('✅ Công việc được thêm thành công!', 'success');
}

// ===== Task Status Change =====
function handleTaskStatusChange(event) {
    if (event.target.classList.contains('task-status-checkbox')) {
        const taskItem = event.target.closest('.task-item');
        const taskId = taskItem.dataset.taskId;
        const isChecked = event.target.checked;

        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.status = isChecked ? 'completed' : 'pending';
            saveUserTasks(currentUser.id, tasks);
            renderTasks();
        }
    }
}

// ===== Task Actions (Edit/Delete) =====
function handleTaskActions(event) {
    const btn = event.target.closest('button');
    if (!btn) return;

    const taskItem = btn.closest('.task-item');
    const taskId = taskItem.dataset.taskId;

    if (btn.classList.contains('btn-edit')) {
        openEditModal(taskId);
    } else if (btn.classList.contains('btn-delete')) {
        deleteTask(taskId);
    }
}

function deleteTask(taskId) {
    if (confirm('Bạn chắc chắn muốn xóa công việc này?')) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveUserTasks(currentUser.id, tasks);
        renderTasks();
        showTaskMessage('🗑️ Công việc được xóa thành công!', 'success');
    }
}

// ===== Edit Modal =====
function openEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    editingTaskId = taskId;

    document.getElementById('edit-title').value = task.title;
    document.getElementById('edit-description').value = task.description;
    document.getElementById('edit-deadline').value = task.deadline;
    document.getElementById('edit-priority').value = task.priority;

    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
    editingTaskId = null;
    document.getElementById('edit-modal').classList.add('hidden');
    document.getElementById('edit-task-form').reset();
}

function handleEditTask(event) {
    event.preventDefault();

    if (!editingTaskId) return;

    const task = tasks.find(t => t.id === editingTaskId);
    if (!task) return;

    task.title = document.getElementById('edit-title').value.trim();
    task.description = document.getElementById('edit-description').value.trim();
    task.deadline = document.getElementById('edit-deadline').value;
    task.priority = document.getElementById('edit-priority').value;

    saveUserTasks(currentUser.id, tasks);
    renderTasks();
    closeEditModal();
    showTaskMessage('💾 Công việc được cập nhật thành công!', 'success');
}

// ===== Filter Functions =====
function handleFilterChange(event) {
    const filterType = event.target.dataset.filter;
    const filterValue = event.target.dataset.value;

    // Update active state
    document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update filter
    filters[filterType] = filterValue;
    renderTasks();
}

function handleDeadlineFilter(event) {
    filters.deadline = event.target.value || null;
    renderTasks();
}

function clearDeadlineFilter() {
    document.getElementById('filter-deadline').value = '';
    filters.deadline = null;
    renderTasks();
}

// ===== Render Functions =====
function renderTasks() {
    const filteredTasks = getFilteredTasks();
    const tasksList = document.getElementById('tasks-list');

    // Update stats
    updateStats(filteredTasks);

    if (filteredTasks.length === 0) {
        tasksList.innerHTML = '<p class="empty-message">Không có công việc nào phù hợp với bộ lọc. 🤔</p>';
        return;
    }

    tasksList.innerHTML = '';

    // Sort by deadline
    filteredTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    filteredTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        tasksList.appendChild(taskElement);
    });
}

function createTaskElement(task) {
    const template = document.getElementById('task-template');
    const clone = template.content.cloneNode(true);

    const taskItem = clone.querySelector('.task-item');
    taskItem.dataset.taskId = task.id;
    
    if (task.status === 'completed') {
        taskItem.classList.add('completed');
    }

    clone.querySelector('.task-status-checkbox').checked = task.status === 'completed';
    clone.querySelector('.task-title').textContent = task.title;
    clone.querySelector('.task-description').textContent = task.description || '(Không có mô tả)';
    
    const priorityBadge = clone.querySelector('.task-priority');
    priorityBadge.textContent = getPriorityText(task.priority);
    priorityBadge.className = `task-priority ${task.priority}`;

    const deadlineBadge = clone.querySelector('.task-deadline');
    deadlineBadge.textContent = formatDate(task.deadline);

    return clone;
}

function getFilteredTasks() {
    return tasks.filter(task => {
        if (filters.priority !== 'all' && task.priority !== filters.priority) {
            return false;
        }

        if (filters.status !== 'all' && task.status !== filters.status) {
            return false;
        }

        if (filters.deadline && task.deadline !== filters.deadline) {
            return false;
        }

        return true;
    });
}

function updateStats(filteredTasks) {
    const totalCount = filteredTasks.length;
    const pendingCount = filteredTasks.filter(t => t.status === 'pending').length;
    const completedCount = filteredTasks.filter(t => t.status === 'completed').length;

    document.getElementById('total-count').textContent = totalCount;
    document.getElementById('pending-count').textContent = pendingCount;
    document.getElementById('completed-count').textContent = completedCount;
}

// ===== Message Functions =====
function showTaskMessage(message, type) {
    const messageEl = document.getElementById('add-task-message');
    showMessage(messageEl, message, type);
}
