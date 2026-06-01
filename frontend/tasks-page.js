let tasks = [];
let filters = { priority: 'all', status: 'all', deadline: null, search: '' };
let sortBy = 'deadline';
let editingTaskId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;

  setUsername(user);
  initEventListeners();
  await loadTasks();
});

function setUsername(user) {
  const usernameElement = document.getElementById('username');
  if (usernameElement) {
    usernameElement.textContent = user.name || user.email || 'User';
  }
}

function initEventListeners() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logoutUser);
  }

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const filterType = event.target.dataset.filter;
      const filterValue = event.target.dataset.value;

      document.querySelectorAll(`[data-filter="${filterType}"]`).forEach((btn) => btn.classList.remove('active'));
      event.target.classList.add('active');
      filters[filterType] = filterValue;
      renderTasks();
    });
  });

  const deadlineInput = document.getElementById('filter-deadline');
  if (deadlineInput) {
    deadlineInput.addEventListener('change', (event) => {
      filters.deadline = event.target.value || null;
      renderTasks();
    });
  }

  const clearDeadlineButton = document.getElementById('clear-deadline-btn');
  if (clearDeadlineButton) {
    clearDeadlineButton.addEventListener('click', () => {
      const deadlineElement = document.getElementById('filter-deadline');
      if (deadlineElement) {
        deadlineElement.value = '';
      }
      filters.deadline = null;
      renderTasks();
    });
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      filters.search = event.target.value.toLowerCase().trim();
      renderTasks();
    });
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (event) => {
      sortBy = event.target.value;
      renderTasks();
    });
  }

  const tasksList = document.getElementById('tasks-list');
  if (tasksList) {
    tasksList.addEventListener('change', handleTaskStatusChange);
    tasksList.addEventListener('click', handleTaskActions);
  }

  const modalClose = document.querySelector('.modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', closeEditModal);
  }

  const modalCancel = document.querySelector('.modal-cancel');
  if (modalCancel) {
    modalCancel.addEventListener('click', closeEditModal);
  }

  const editForm = document.getElementById('edit-task-form');
  if (editForm) {
    editForm.addEventListener('submit', handleEditTask);
  }
}

async function loadTasks() {
  try {
    tasks = await fetchTasks();
    if (!Array.isArray(tasks)) {
      tasks = [];
    }
    renderTasks();
  } catch (error) {
    const tasksList = document.getElementById('tasks-list');
    if (tasksList) {
      tasksList.innerHTML = `<p class="empty-message">Không thể tải danh sách công việc: ${error.message}</p>`;
    }
  }
}

function handleTaskStatusChange(event) {
  if (!event.target.classList.contains('task-status-checkbox')) return;

  const taskItem = event.target.closest('.task-item');
  if (!taskItem) return;

  const taskId = taskItem.dataset.taskId;
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;

  const newStatus = event.target.checked ? 'completed' : 'pending';
  updateTask(taskId, { status: newStatus })
    .then((updatedTask) => {
      task.status = updatedTask.status;
      renderTasks();
    })
    .catch((error) => {
      event.target.checked = !event.target.checked;
      alert(`Lỗi cập nhật trạng thái: ${error.message}`);
    });
}

function handleTaskActions(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const taskItem = button.closest('.task-item');
  if (!taskItem) return;

  const taskId = taskItem.dataset.taskId;
  if (!taskId) return;

  if (button.classList.contains('btn-edit')) {
    openEditModal(taskId);
  }

  if (button.classList.contains('btn-delete')) {
    handleDeleteTask(taskId);
  }
}

async function handleDeleteTask(taskId) {
  if (!confirm('Bạn có chắc muốn xóa công việc này?')) return;

  try {
    await deleteTaskById(taskId);
    tasks = tasks.filter((task) => task.id !== taskId);
    renderTasks();
  } catch (error) {
    alert(`Lỗi xóa công việc: ${error.message}`);
  }
}

function openEditModal(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;

  editingTaskId = taskId;
  document.getElementById('edit-title').value = task.title;
  document.getElementById('edit-description').value = task.description || '';
  document.getElementById('edit-deadline').value = task.deadline;
  document.getElementById('edit-priority').value = task.priority || 'medium';
  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  editingTaskId = null;
  const modal = document.getElementById('edit-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

async function handleEditTask(event) {
  event.preventDefault();
  if (!editingTaskId) return;

  const title = document.getElementById('edit-title').value.trim();
  const description = document.getElementById('edit-description').value.trim();
  const deadline = document.getElementById('edit-deadline').value;
  const priority = document.getElementById('edit-priority').value;

  if (!title || !deadline) {
    alert('Tiêu đề và ngày đến hạn không được để trống');
    return;
  }

  try {
    const updatedTask = await updateTask(editingTaskId, {
      title,
      description,
      deadline,
      priority
    });

    tasks = tasks.map((task) => (task.id === editingTaskId ? updatedTask : task));
    renderTasks();
    closeEditModal();
  } catch (error) {
    alert(`Lỗi cập nhật công việc: ${error.message}`);
  }
}

function renderTasks() {
  const tasksList = document.getElementById('tasks-list');
  if (!tasksList) return;

  const filteredTasks = tasks.filter((task) => {
    const priority = task.priority || 'low';
    const status = task.status || 'pending';
    const deadline = task.deadline || '';
    const searchText = filters.search.toLowerCase();

    if (filters.priority !== 'all' && priority !== filters.priority) return false;
    if (filters.status !== 'all' && status !== filters.status) return false;
    if (filters.deadline && deadline !== filters.deadline) return false;

    if (!searchText) return true;
    return (
      (task.title || '').toLowerCase().includes(searchText) ||
      (task.description || '').toLowerCase().includes(searchText)
    );
  });

  updateStatistics();

  if (filteredTasks.length === 0) {
    tasksList.innerHTML = '<p class="empty-message">Không có công việc nào phù hợp bộ lọc. 🤔</p>';
    return;
  }

  filteredTasks.sort((a, b) => {
    if (sortBy === 'deadline') {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (sortBy === 'created') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority || 'low'] || 2) - (priorityOrder[b.priority || 'low'] || 2);
  });

  tasksList.innerHTML = '';
  const template = document.getElementById('task-template');

  filteredTasks.forEach((task) => {
    const clone = template.content.cloneNode(true);
    const item = clone.querySelector('.task-item');
    const checkbox = clone.querySelector('.task-status-checkbox');
    const titleEl = clone.querySelector('.task-title');
    const descriptionEl = clone.querySelector('.task-description');
    const priorityEl = clone.querySelector('.task-priority');
    const deadlineEl = clone.querySelector('.task-deadline');
    const createdEl = clone.querySelector('.task-created');

    if (item) {
      item.dataset.taskId = task.id;
      if (task.status === 'completed') {
        item.classList.add('completed');
      }
    }

    if (checkbox) {
      checkbox.checked = task.status === 'completed';
    }

    if (titleEl) titleEl.textContent = task.title || '';
    if (descriptionEl) descriptionEl.textContent = task.description || '';
    if (priorityEl) {
      priorityEl.textContent = getPriorityLabel(task.priority);
      priorityEl.className = `task-priority ${getPriorityClass(task.priority)}`;
    }
    if (deadlineEl) deadlineEl.textContent = task.deadline ? formatDate(task.deadline) : '';
    if (createdEl) createdEl.textContent = task.createdAt ? `Tạo: ${formatDate(task.createdAt)}` : '';

    tasksList.appendChild(clone);
  });
}

function updateStatistics() {
  const total = tasks.length;
  const pending = tasks.filter((task) => task.status !== 'completed').length;
  const completed = tasks.filter((task) => task.status === 'completed').length;
  const highPriority = tasks.filter((task) => task.priority === 'high').length;

  const totalEl = document.getElementById('total-count');
  const pendingEl = document.getElementById('pending-count');
  const completedEl = document.getElementById('completed-count');
  const highPriorityEl = document.getElementById('high-priority-count');

  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = pending;
  if (completedEl) completedEl.textContent = completed;
  if (highPriorityEl) highPriorityEl.textContent = highPriority;
}
