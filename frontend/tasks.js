// ===== Tasks List Page Logic =====

let currentUser = null;
let tasks = [];
let allTasks = []; // Keep original list for filtering
let filters = {
    priority: 'all',
    status: 'all',
    deadline: null,
    search: ''
};
let sortBy = 'deadline';
let editingTaskId = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndInit();
});

function checkAuthAndInit() {
    currentUser = getCurrentUser();
    
    if (!currentUser) {
        window.location.href = 'auth.html';
        return;
    }

    // Load user's tasks
    tasks = getUserTasks(currentUser.id);
    allTasks = [...tasks];
    
    // Set up UI
    document.getElementById('username').textContent = currentUser.name;
    
    // Initialize event listeners
    initEventListeners();
    
    // Render initial state
    renderTasks();
}

function initEventListeners() {
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Filter Buttons
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', handleFilterChange);
    });

    // Deadline Filter
    document.getElementById('filter-deadline').addEventListener('change', handleDeadlineFilter);
    document.getElementById('clear-deadline-btn').addEventListener('click', clearDeadlineFilter);

    // Search
    document.getElementById('search-input').addEventListener('input', handleSearchInput);

    // Sort
    document.getElementById('sort-select').addEventListener('change', handleSortChange);

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

// ===== Task Status Change =====
function handleTaskStatusChange(event) {
    if (event.target.classList.contains('task-status-checkbox')) {
        const taskItem = event.target.closest('.task-item');
        const taskId = taskItem.dataset.taskId;
        const isChecked = event.target.checked;

        const task = allTasks.find(t => t.id === taskId);
        if (task) {
            task.status = isChecked ? 'completed' : 'pending';
            saveUserTasks(currentUser.id, allTasks);
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
        allTasks = allTasks.filter(t => t.id !== taskId);
        saveUserTasks(currentUser.id, allTasks);
        renderTasks();
        showMessage(document.createElement('div'), '🗑️ Công việc được xóa thành công!', 'success');
    }
}

// ===== Edit Modal =====
function openEditModal(taskId) {
    const task = allTasks.find(t => t.id === taskId);
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

    const task = allTasks.find(t => t.id === editingTaskId);
    if (!task) return;

    task.title = document.getElementById('edit-title').value.trim();
    task.description = document.getElementById('edit-description').value.trim();
    task.deadline = document.getElementById('edit-deadline').value;
    task.priority = document.getElementById('edit-priority').value;

    saveUserTasks(currentUser.id, allTasks);
    renderTasks();
    closeEditModal();
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

function handleSearchInput(event) {
    filters.search = event.target.value.toLowerCase().trim();
    renderTasks();
}

function handleSortChange(event) {
    sortBy = event.target.value;
    renderTasks();
}

// ===== Render Functions =====
function renderTasks() {
    const filteredTasks = getFilteredTasks();
    const tasksList = document.getElementById('tasks-list');

    // Update stats
    updateStats(filteredTasks);

    if (filteredTasks.length === 0) {
        tasksList.innerHTML = '<p class="empty-message">Không có công việc nào phù hợp với bộ lọc. 🤔 <a href="create.html">Tạo một công việc mới!</a></p>';
        return;
    }

    tasksList.innerHTML = '';

    // Sort tasks
    const sortedTasks = sortTasks(filteredTasks, sortBy);

    sortedTasks.forEach(task => {
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

    const createdBadge = clone.querySelector('.task-created');
    createdBadge.textContent = formatCreatedDate(task.createdAt);

    return clone;
}

function getFilteredTasks() {
    return allTasks.filter(task => {
        // Priority filter
        if (filters.priority !== 'all' && task.priority !== filters.priority) {
            return false;
        }

        // Status filter
        if (filters.status !== 'all' && task.status !== filters.status) {
            return false;
        }

        // Deadline filter
        if (filters.deadline && task.deadline !== filters.deadline) {
            return false;
        }

        // Search filter
        if (filters.search) {
            const searchTerm = filters.search;
            if (!task.title.toLowerCase().includes(searchTerm) && 
                !task.description.toLowerCase().includes(searchTerm)) {
                return false;
            }
        }

        return true;
    });
}

function sortTasks(tasksToSort, sortType) {
    const sorted = [...tasksToSort];

    switch (sortType) {
        case 'deadline':
            sorted.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
            break;
        case 'priority':
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            break;
        case 'created':
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
    }

    return sorted;
}

function updateStats(filteredTasks) {
    const totalCount = allTasks.length;
    const pendingCount = allTasks.filter(t => t.status === 'pending').length;
    const completedCount = allTasks.filter(t => t.status === 'completed').length;
    const highPriorityCount = allTasks.filter(t => t.priority === 'high').length;

    document.getElementById('total-count').textContent = totalCount;
    document.getElementById('pending-count').textContent = pendingCount;
    document.getElementById('completed-count').textContent = completedCount;
    document.getElementById('high-priority-count').textContent = highPriorityCount;
}

function formatCreatedDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return '🕐 Hôm nay';
    } else if (diffDays === 1) {
        return '🕐 Hôm qua';
    } else {
        return `🕐 ${diffDays} ngày trước`;
    }
}
