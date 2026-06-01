document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth();
  if (!user) return;

  setUsername(user);
  initEventListeners();
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

  const form = document.getElementById('add-task-form');
  if (form) {
    form.addEventListener('submit', handleAddTask);
  }
}

async function handleAddTask(event) {
  event.preventDefault();

  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const deadline = document.getElementById('task-deadline').value;
  const priority = document.getElementById('task-priority').value;
  const messageElement = document.getElementById('add-task-message');

  hideMessage(messageElement);

  if (!title || !deadline) {
    showMessage(messageElement, 'Vui lòng điền đầy đủ tiêu đề và hạn hoàn thành.', 'error');
    return;
  }

  const submitButton = event.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Đang tạo...';

  try {
    await createTask({ title, description, deadline, priority });
    showMessage(messageElement, 'Công việc đã được tạo thành công!', 'success');
    setTimeout(() => {
      window.location.href = 'tasks.html';
    }, 900);
  } catch (error) {
    showMessage(messageElement, error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '✅ Tạo Công Việc';
  }
}
