let tasks = [];
let filters = { priority: 'all', status: 'all', deadline: null, search: '' };
let sortBy = 'deadline';

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndInit();
});

/**
 * Tự động xử lý Callback URL hoặc kiểm tra Session cũ
 */
async function checkAuthAndInit() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        let user = null;

        if (urlParams.has("code")) {
            user = await userManager.signinCallback();
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            user = await userManager.getUser();
        }

        if (!user || user.expired) {
            console.warn("Phiên làm việc không hợp lệ hoặc hết hạn.");
            window.location.href = 'auth.html';
            return;
        }

        document.getElementById('username').textContent = user.profile?.email || "Thành viên";
        localStorage.setItem('aws_access_token', user.access_token);

        initEventListeners();
        await loadTasks();

    } catch (error) {
        console.error("Lỗi xác thực hệ thống:", error);
        window.location.href = 'auth.html';
    }
}

/**
 * Tải danh sách tasks từ API Gateway đám mây
 */
async function loadTasks() {
    try {
        const user = await userManager.getUser();
        if (!user) {
            throw new Error("Không tìm thấy session đăng nhập. Mời bạn quay lại trang auth.html");
        }

        const token = user.id_token || user.access_token;
        let userIdFallback = "89ea554c-e041-701f-f9aa-55a0826fa538"; 
        
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(window.atob(base64));
                if (payload.sub) {
                    userIdFallback = payload.sub;
                }
            } catch (e) {
                console.error("Không thể giải mã thử token:", e);
            }
        }
        
        console.log("⏳ Chuẩn bị gửi request với UserId chuẩn:", userIdFallback);

        const response = await fetch(`${AWS_CONFIG.api.baseUrl}/tasks?userId=${userIdFallback}&userid=${userIdFallback}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-User-Id': userIdFallback,
                'x-user-id': userIdFallback,
                'Content-Type': 'application/json'
            }
        });

        const resultData = await response.json();
        console.log("Dữ liệu gốc từ AWS API Gateway trả về:", resultData);

        let finalTasks = [];
        if (resultData && resultData.body) {
            finalTasks = typeof resultData.body === 'string' ? JSON.parse(resultData.body) : resultData.body;
        } else {
            finalTasks = resultData;
        }

        if (resultData && (resultData.statusCode === 401 || resultData.status === 401)) {
            throw new Error(finalTasks.message || "Bạn chưa được cấp quyền truy cập (Unauthorized).");
        }

        tasks = Array.isArray(finalTasks) ? finalTasks : [];
        renderTasks();
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        let errorDetails = error.message;
        
        document.getElementById('tasks-list').innerHTML = 
            `<div class="empty-message" style="color: #e74c3c; font-weight: bold; text-align: left; padding: 20px;">
                <p>❌ Lỗi đồng bộ dữ liệu đám mây: ${errorDetails}</p>
                <div id="aws-debug-box" style="margin-top: 10px; padding: 10px; background: #fdf2f2; border: 1px solid #f5c6cb; font-family: monospace; font-size: 12px; color: #721c24; border-radius: 4px;">
                    ⏳ Đang quét cấu trúc gói tin lỗi từ AWS...
                </div>
             </div>`;

        if (window.lastResponseData) {
            const debugBox = document.getElementById('aws-debug-box');
            if (debugBox) {
                debugBox.innerHTML = `<strong>Cấu trúc Lambda nhận được từ API Gateway:</strong><br>${JSON.stringify(window.lastResponseData, null, 2)}`;
            }
        }
    }
}

// ===== Thiết lập các Sự kiện (Event Listeners) =====
function initEventListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    // ✨ ĐỒNG BỘ: Gọi đúng hàm handleLogout xử lý đăng xuất tận gốc Server
    if (logoutBtn) logoutBtn.addEventListener('click', signOutRedirect);

    const addTaskForm = document.getElementById('add-task-form');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', handleAddTask);
    }

    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filterType = e.target.dataset.filter;
            const filterValue = e.target.dataset.value;
            document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filters[filterType] = filterValue;
            renderTasks();
        });
    });

    document.getElementById('filter-deadline').addEventListener('change', (e) => {
        filters.deadline = e.target.value || null;
        renderTasks();
    });
    document.getElementById('clear-deadline-btn').addEventListener('click', () => {
        document.getElementById('filter-deadline').value = '';
        filters.deadline = null;
        renderTasks();
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
        filters.search = e.target.value.toLowerCase().trim();
        renderTasks();
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
        sortBy = e.target.value;
        renderTasks();
    });

    const modalClose = document.querySelector('.modal-close');
    if (modalClose) modalClose.addEventListener('click', closeEditModal);
    
    const modalCancel = document.querySelector('.modal-cancel');
    if (modalCancel) modalCancel.addEventListener('click', closeEditModal);
    
    const editForm = document.getElementById('edit-task-form');
    if (editForm) editForm.addEventListener('submit', handleEditTask);

    document.getElementById('tasks-list').addEventListener('change', handleTaskStatusChange);
    document.getElementById('tasks-list').addEventListener('click', handleTaskActions);
}

let editingTaskId = null; 

// ===== Thay đổi trạng thái Hoàn thành (Check/Uncheck) =====
async function handleTaskStatusChange(event) {
    if (event.target.classList.contains('task-status-checkbox')) {
        const taskItem = event.target.closest('.task-item');
        const taskId = taskItem.dataset.taskId;
        const isChecked = event.target.checked;
        const task = tasks.find(t => t.id === taskId || t.taskId === taskId);
        if (!task) return;

        const newStatus = isChecked ? 'completed' : 'pending';

        try {
            const user = await userManager.getUser();
            const token = user ? (user.id_token || user.access_token) : localStorage.getItem('aws_access_token');
            
            // ✨ ĐỒNG BỘ: Chuyển sang truyền taskId qua Query String khớp cấu chỉnh sửa /tasks cùng cấp
            const response = await fetch(`${AWS_CONFIG.api.baseUrl}/tasks?taskId=${taskId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    ...task, 
                    status: newStatus,
                    title: task.title,
                    description: task.description || task.desc || "",
                    deadline: task.deadline || task.dueDate || ""
                })
            });

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const resultJson = await response.json();
            let updatedTask = resultJson.task || resultJson;
            if (updatedTask && typeof updatedTask.body === 'string') {
                updatedTask = JSON.parse(updatedTask.body);
            }

            // Cập nhật lại mảng dữ liệu local trạng thái mới nhất
            task.status = updatedTask.status || newStatus;
            renderTasks();
            console.log(`✅ Đã cập nhật trạng thái hoàn thành task: ${taskId}`);
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái:', error);
            event.target.checked = !isChecked; 
            alert('Lỗi cập nhật trạng thái: ' + error.message);
        }
    }
}

// ===== Hành động Sửa / Xóa =====
function handleTaskActions(event) {
    const btn = event.target.closest('button');
    if (!btn) return;

    const taskItem = btn.closest('.task-item');
    const taskId = taskItem.dataset.taskId;

    if (btn.classList.contains('btn-edit')) {
        openEditModal(taskId);
    } else if (btn.classList.contains('btn-delete')) {
        handleDeleteTask(taskId);
    }
}

/**
 * Xử lý thêm công việc mới lên Cloud thông qua API Gateway
 */
async function handleAddTask(event) {
    event.preventDefault(); 

    const titleInput = document.getElementById('task-title');
    const deadlineInput = document.getElementById('task-deadline');
    const priorityInput = document.getElementById('task-priority');
    const descInput = event.target.querySelector('textarea');

    const title = titleInput.value.trim();
    const description = descInput ? descInput.value.trim() : '';
    const deadline = deadlineInput.value;
    const priority = priorityInput.value;

    console.log("🚀 CHỮ THỰC TẾ BÓC ĐƯỢC TỪ TEXTAREA:", description);

    if (!title || !deadline) {
        alert('❌ Vui lòng nhập đầy đủ Tên công việc và Hạn hoàn thành!');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Thêm công việc';
    if (submitBtn) submitBtn.innerHTML = '⏳ Đang lưu...';

    try {
        const user = await userManager.getUser();
        const token = user ? (user.id_token || user.access_token) : localStorage.getItem('aws_access_token');
        
        const response = await fetch(`${AWS_CONFIG.api.baseUrl}/tasks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                description: description, 
                desc: description,        
                deadline: deadline,
                dueDate: deadline,         
                priority: priority,
                status: 'pending'
            })
        });

        if (!response.ok) throw new Error(`AWS API Error: ${response.status}`);

        const resultJson = await response.json();
        
        let createdTask = {};
        if (resultJson && resultJson.body) {
            createdTask = typeof resultJson.body === 'string' ? JSON.parse(resultJson.body) : resultJson.body;
        } else {
            createdTask = resultJson;
        }

        const syncedTask = {
            id: createdTask.id || createdTask.taskId,
            title: createdTask.title || title,
            description: createdTask.description || createdTask.desc || description,
            deadline: createdTask.deadline || createdTask.dueDate || deadline,
            priority: createdTask.priority || priority,
            status: createdTask.status || 'pending',
            createdAt: createdTask.createdAt || new Date().toISOString()
        };

        console.log("✅ Object task sạch sau khi tạo đưa vào mảng render:", syncedTask);

        tasks.push(syncedTask);
        renderTasks();
        event.target.reset();
        
    } catch (error) {
        console.error('Lỗi thêm task:', error);
        alert('❌ Không thể lưu công việc lên đám mây: ' + error.message);
    } finally {
        if (submitBtn) submitBtn.innerHTML = originalBtnText;
    }
}

async function handleDeleteTask(taskId) {
    if (!confirm('Bạn chắc chắn muốn xóa công việc này khỏi hệ thống đám mây?')) return;

    try {
        const user = await userManager.getUser();
        if (!user || user.expired) {
            alert("❌ Phiên làm việc đã hết hạn. Vui lòng tải lại trang để đăng nhập lại!");
            window.location.href = 'auth.html';
            return;
        }

        const token = user.id_token || user.access_token;
        console.log("⏳ Đang gửi yêu cầu xóa tới API Gateway với Token sạch...");

        const response = await fetch(`${AWS_CONFIG.api.baseUrl}/tasks?taskId=${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `Mã lỗi HTTP: ${response.status}`);
        }

        tasks = tasks.filter(t => (t.id !== taskId && t.taskId !== taskId));
        renderTasks();
        console.log(`✅ Đã xóa thành công task: ${taskId}`);

    } catch (error) {
        console.error('Lỗi khi xóa công việc:', error);
        alert('❌ Không thể xóa công việc: ' + error.message);
    }
}

// ===== Chỉnh sửa công việc (Modal) =====
function openEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId || t.taskId === taskId);
    if (!task) return;
    editingTaskId = taskId;

    document.getElementById('edit-title').value = task.title;
    document.getElementById('edit-description').value = task.description || task.desc || '';
    document.getElementById('edit-deadline').value = task.deadline || task.dueDate || '';
    document.getElementById('edit-priority').value = task.priority || 'medium';
    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
    editingTaskId = null;
    document.getElementById('edit-modal').classList.add('hidden');
}

async function handleEditTask(event) {
    event.preventDefault();
    if (!editingTaskId) return;

    const task = tasks.find(t => t.id === editingTaskId || t.taskId === editingTaskId);
    const title = document.getElementById('edit-title').value.trim();
    const description = document.getElementById('edit-description').value.trim();
    const deadline = document.getElementById('edit-deadline').value;
    const priority = document.getElementById('edit-priority').value;

    if (!title || !deadline) {
        alert('❌ Tiêu đề và Ngày đến hạn không được để trống!');
        return;
    }

    // Đổi chữ nút lưu để tạo hiệu ứng chờ cho user
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Lưu Thay Đổi';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Đang tối ưu trên mây...';
    }

    try {
        const user = await userManager.getUser();
        const token = user ? (user.id_token || user.access_token) : localStorage.getItem('aws_access_token');
        
        console.log("⏳ Đang gửi yêu cầu cập nhật lên Cloud...");

        const response = await fetch(`${AWS_CONFIG.api.baseUrl}/tasks?taskId=${editingTaskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                ...task, 
                title, 
                description, 
                desc: description, 
                deadline, 
                dueDate: deadline, 
                priority 
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `Mã lỗi HTTP: ${response.status}`);
        }

        const resultJson = await response.json();
        
        let updatedTask = resultJson.task || resultJson;
        if (updatedTask && typeof updatedTask.body === 'string') {
            updatedTask = JSON.parse(updatedTask.body);
        }

        const syncedUpdatedTask = {
            id: updatedTask.id || updatedTask.taskId || editingTaskId,
            title: updatedTask.title || title,
            description: updatedTask.description || updatedTask.desc || description,
            deadline: updatedTask.deadline || updatedTask.dueDate || deadline,
            priority: updatedTask.priority || priority,
            status: updatedTask.status || task.status || 'pending',
            createdAt: updatedTask.createdAt || task.createdAt || new Date().toISOString()
        };

        // 1. Cập nhật mảng dữ liệu local
        tasks = tasks.map(t => (t.id === editingTaskId || t.taskId === editingTaskId) ? syncedUpdatedTask : t);
        
        // 2. ✨ HIỂN THỊ MÀN HÌNH THÔNG BÁO CHO USER
        alert('Công việc đã được cập nhật thành công trên hệ thống đám mây.');

        // 3. Đóng modal và vẽ lại giao diện mượt mà
        closeEditModal();
        renderTasks();
        
    } catch (error) {
        console.error('Lỗi khi sửa đổi công việc:', error);
        alert('❌ Lỗi cập nhật công việc: ' + error.message);
    } finally {
        // Trả lại trạng thái nút ban đầu
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    }
}
// ===== Hàm Xử Lý Render và Lọc Dữ Liệu Lên Giao Diện =====
function renderTasks() {
    if (!Array.isArray(tasks)) {
        console.warn("Cảnh báo: Biến tasks hiện tại không phải mảng, đang tự động sửa lỗi ép kiểu.", tasks);
        tasks = [];
    }
    const filteredTasks = tasks.filter(task => {
        const p = task.priority || 'low';
        const s = task.status || 'pending';
        const dl = task.deadline || task.dueDate;

        if (filters.priority !== 'all' && p !== filters.priority) return false;
        if (filters.status !== 'all' && s !== filters.status) return false;
        if (filters.deadline && dl !== filters.deadline) return false;
        
        const taskTitle = task.title || "";
        const taskDesc = task.description || task.desc || "";

        const titleMatch = taskTitle.toLowerCase().includes(filters.search);
        const descMatch = taskDesc.toLowerCase().includes(filters.search);
        if (filters.search && !titleMatch && !descMatch) return false;
        
        return true;
    });

    if (document.getElementById('total-count')) document.getElementById('total-count').textContent = tasks.length;
    if (document.getElementById('pending-count')) document.getElementById('pending-count').textContent = tasks.filter(t => (t.status || 'pending') === 'pending').length;
    if (document.getElementById('completed-count')) document.getElementById('completed-count').textContent = tasks.filter(t => t.status === 'completed').length;
    if (document.getElementById('high-priority-count')) document.getElementById('high-priority-count').textContent = tasks.filter(t => t.priority === 'high').length;

    const tasksList = document.getElementById('tasks-list');
    if (!tasksList) return;

    if (filteredTasks.length === 0) {
        tasksList.innerHTML = '<p class="empty-message">Không có công việc nào phù hợp bộ lọc. 🤔</p>';
        return;
    }

    filteredTasks.sort((a, b) => {
        const dateA = a.deadline || a.dueDate || 0;
        const dateB = b.deadline || b.dueDate || 0;
        if (sortBy === 'deadline') return new Date(dateA) - new Date(dateB);
        if (sortBy === 'created') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        if (sortBy === 'priority') {
            const pOrder = { high: 0, medium: 1, low: 2 };
            return pOrder[a.priority || 'low'] - pOrder[b.priority || 'low'];
        }
        return 0;
    });

    tasksList.innerHTML = '';
    const template = document.getElementById('task-template');
    if (!template) {
        console.error("❌ Không tìm thấy thẻ <template id='task-template'> trong file HTML!");
        return;
    }

    filteredTasks.forEach(task => {
        const clone = template.content.cloneNode(true);
        const item = clone.querySelector('.task-item');
        item.dataset.taskId = task.id || task.taskId;
        
        if (task.status === 'completed') item.classList.add('completed');

        const checkbox = clone.querySelector('.task-status-checkbox');
        if (checkbox) checkbox.checked = task.status === 'completed';
        
        clone.querySelector('.task-title').textContent = task.title || '(Không có tiêu đề)';
        
        const displayDesc = task.description || task.desc;
        clone.querySelector('.task-description').textContent = displayDesc ? displayDesc.trim() : '(Không có mô tả)';
        
        const pBadge = clone.querySelector('.task-priority');
        if (pBadge) {
            const p = task.priority || 'low';
            pBadge.textContent = p === 'high' ? '🔴 Cao' : p === 'medium' ? '🟡 Trung bình' : '🟢 Thấp';
            pBadge.className = `task-priority ${p}`;
        }

        const dlLabel = clone.querySelector('.task-deadline');
        if (dlLabel) {
            dlLabel.textContent = `📅 Đến hạn: ${task.deadline || task.dueDate || 'Chưa đặt'}`;
        }
        
        const createdTime = clone.querySelector('.task-created');
        if (createdTime) {
            if (task.createdAt) {
                const diffDays = Math.floor((new Date() - new Date(task.createdAt)) / (1000 * 60 * 60 * 24));
                createdTime.textContent = diffDays <= 0 ? '🕐 Hôm nay' : `🕐 ${diffDays} ngày trước`;
            } else {
                createdTime.textContent = '🕐 Gần đây';
            }
        }

        tasksList.appendChild(clone);
    });
}