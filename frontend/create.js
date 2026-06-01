// ===== Create Task Page Logic =====

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndInit();
});

/**
 * Tự động kiểm tra Session OIDC của AWS và khởi tạo trang
 */
async function checkAuthAndInit() {
    try {
        // Lấy thông tin user từ hệ thống OIDC UserManager
        const user = await userManager.getUser();

        // Nếu hoàn toàn chưa đăng nhập hoặc token hết hạn -> Đá về trang auth.html
        if (!user || user.expired) {
            console.warn("Phiên làm việc không hợp lệ hoặc hết hạn.");
            window.location.href = 'auth.html';
            return;
        }

        // Đăng nhập thành công: Set dữ liệu user toàn cục
        currentUser = user;

        // Set up UI - Hiển thị email người dùng lên Header
        if (document.getElementById('username')) {
            document.getElementById('username').textContent = currentUser.profile?.email || "Thành viên";
        }
        
        // Cập nhật lại Access Token mới nhất vào localStorage phòng trường hợp token bị refresh ngầm
        localStorage.setItem('aws_access_token', currentUser.access_token);
        
        // Initialize event listeners
        initEventListeners();

    } catch (error) {
        console.error("Lỗi khởi tạo phân quyền trang Create:", error);
        window.location.href = 'auth.html';
    }
}

function initEventListeners() {
    // Gắn sự kiện Đăng xuất thực tế gọi sang hàm Cloud của config.js
    document.getElementById('logout-btn').addEventListener('click', signOutRedirect);

    // Add Task Form
    document.getElementById('add-task-form').addEventListener('submit', handleAddTask);
}

/**
 * Xử lý thêm công việc mới lên Đám mây AWS API Gateway
 */
async function handleAddTask(event) {
    event.preventDefault();
    
    // Lấy các giá trị từ form giao diện của bạn
    const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-desc')?.value || 
                            document.getElementById('task-description')?.value || 
                            document.getElementById('task-des')?.value || "";
        const deadline = document.getElementById('task-deadline').value;
        const priority = document.getElementById('task-priority').value;

    try {
        // 1. ĐỒNG BỘ TOKEN: Lấy đúng id_token từ OIDC UserManager giống như app.js đã sửa thành công
        const user = await userManager.getUser();
        if (!user) {
            throw new Error("Không tìm thấy session đăng nhập. Vui lòng quay lại trang auth.html");
        }
        const token = user.id_token || user.access_token;
        const userIdFallback = user.profile?.sub || "89ea554c-e041-701f-f9aa-55a0826fa538";

        // 2. Tạo body data để gửi lên DynamoDB
        const taskData = {
            userId: userIdFallback,
            title: title,
            description: description, // Trường mô tả chính cho DynamoDB
            desc: description,        // Trường mô tả viết tắt dự phòng
            dueDate: deadline,         // Trường ngày chính cho DynamoDB
            deadline: deadline,        // ✨ BẮT BUỘC BỔ SUNG TRƯỜNG NÀY ĐỂ TRANG APP.JS KHÔNG BỊ TRỐNG DEADLINE
            priority: priority,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        console.log("⏳ Đang gửi dữ liệu tạo mới lên Cloud:", taskData);

        // 3. Gọi API POST: Truyền cả Token ở Header và đồng bộ tham số URL viết thường để vượt qua API Gateway
        const response = await fetch(`${AWS_CONFIG.api.baseUrl}/tasks?userId=${userIdFallback}&userid=${userIdFallback}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`, // Header quyết định để bẻ gãy lỗi 401
                'X-User-Id': userIdFallback,
                'x-user-id': userIdFallback,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error("API Gateway từ chối quyền tạo mới (401 Unauthorized). Hãy kiểm tra OAuth Scopes của phương thức POST!");
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Mã lỗi từ Server: ${response.status}`);
        }

        console.log("✅ Tạo task thành công trên Đám mây!");
        
        // Điều hướng quay trở lại trang danh sách sau khi lưu thành công
        window.location.href = 'tasks.html';

    } catch (error) {
        console.error('Lỗi lưu task lên AWS:', error);
        // Hiển thị thông báo lỗi trực tiếp ra giao diện để người dùng dễ nhìn thấy
        const errorAlert = document.getElementById('error-message');
        if (errorAlert) {
            errorAlert.innerText = `❌ ${error.message}`;
            errorAlert.style.display = 'block';
        } else {
            alert(`❌ Lỗi: ${error.message}`);
        }
    }
}

function showSuccessAnimation() {
    const animation = document.getElementById('success-animation');
    if (animation) {
        animation.classList.remove('hidden');
        
        setTimeout(() => {
            animation.classList.add('hidden');
        }, 2000);
    }
}

function showTaskMessage(message, type) {
    const messageEl = document.getElementById('add-task-message');
    if (messageEl) {
        showMessage(messageEl, message, type);
    } else {
        // Phương án fallback phòng trường hợp lệch ID thông báo
        alert(message);
    }
}