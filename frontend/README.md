# 📱 Frontend - Task Management System

Giao diện HTML/CSS/JS thuần cho hệ thống quản lý công việc serverless.

## 📁 Cấu Trúc File

```
frontend/
├── auth.html          # 🔐 Màn hình Đăng Nhập/Đăng Ký
├── app.html           # 📋 Màn hình Quản Lý Công Việc
├── index.html         # (Deprecated - dùng auth.html thay thế)
├── auth.js            # Logic đăng nhập/đăng ký
├── app.js             # Logic quản lý công việc (CRUD, Filter)
├── shared.js          # Utility functions dùng chung
└── styles.css         # Styling responsive cho cả 2 màn hình
```

## 🚀 Cách Khởi Chạy

### Option 1: Python Server (Khuyến nghị)
```bash
cd frontend
python -m http.server 8000
```

Truy cập: `http://localhost:8000/auth.html`

### Option 2: Node.js http-server
```bash
npm install -g http-server
http-server -p 8000
```

### Option 3: Live Server (VS Code Extension)
Cài đặt **Live Server** extension rồi click "Go Live"

---

## 📄 Chi Tiết Các File

### 🔐 `auth.html` - Màn Hình Xác Thực
**Chức năng:**
- Form Đăng Nhập
- Form Đăng Ký Tài Khoản
- Validation form
- Lưu user vào Local Storage

**Scripts:**
- `shared.js` - Utility functions
- `auth.js` - Authentication logic

**Luồng:**
1. User nhập email/password
2. Validate thông tin
3. Lưu user vào `localStorage['app_users']`
4. Lưu session: `localStorage['app_current_user']`
5. Redirect tới `app.html`

---

### 📋 `app.html` - Màn Hình Quản Lý Công Việc
**Chức năng:**
- ✏️ **Add Task** - Thêm công việc mới
- 👁️ **View Tasks** - Xem danh sách công việc
- ✏️ **Edit Task** - Chỉnh sửa công việc
- 🗑️ **Delete Task** - Xóa công việc
- ✅ **Mark Complete** - Đánh dấu hoàn thành
- 🔍 **Filters** - Lọc theo ưu tiên, trạng thái, ngày đến hạn
- 📊 **Statistics** - Hiển thị số lượng công việc

**Scripts:**
- `shared.js` - Utility functions
- `app.js` - Task management logic

---

### 🛠️ `shared.js` - Utility Functions
```javascript
// Storage Management
getUsersFromStorage()      // Lấy danh sách user
getCurrentUser()           // Lấy user hiện tại
saveCurrentUser(user)      // Lưu user hiện tại
clearCurrentUser()         // Xóa session user

// Task Storage
getUserTasks(userId)       // Lấy tasks của user
saveUserTasks(userId, tasks) // Lưu tasks

// Utilities
generateId()               // Tạo ID ngẫu nhiên
formatDate(dateString)     // Format ngày (hiển thị: "Hôm nay", "Ngày mai", ...)
getPriorityText(priority)  // Convert: 'high' → '🔴 Cao'
showMessage(element, msg, type) // Hiển thị message (error/success/info)
```

---

### 🔐 `auth.js` - Authentication Logic
**Hàm Chính:**
- `handleSignup()` - Xử lý đăng ký
- `handleLogin()` - Xử lý đăng nhập
- `checkAuthOnLoad()` - Kiểm tra đã login chưa
- `redirectToApp()` - Chuyển hướng tới app.html

**Validation:**
- Email format hợp lệ
- Password ≥ 6 ký tự
- Password và Confirm Password khớp
- Email không trùng lặp

---

### 📋 `app.js` - Task Management Logic
**Hàm Chính:**
- `handleAddTask()` - Thêm công việc
- `handleTaskStatusChange()` - Đánh dấu hoàn thành
- `handleTaskActions()` - Xử lý Edit/Delete
- `openEditModal()` - Mở dialog chỉnh sửa
- `handleEditTask()` - Lưu thay đổi
- `handleFilterChange()` - Lọc theo ưu tiên/trạng thái
- `handleDeadlineFilter()` - Lọc theo ngày
- `renderTasks()` - Render danh sách

---

## 💾 Local Storage Schema

```javascript
// Users List
app_users = [
  {
    id: '_abc123',
    name: 'John Doe',
    email: 'john@mail.com',
    password: 'MzIz...' // base64 encoded
  }
]

// Current Session
app_current_user = {
  id: '_abc123',
  name: 'John Doe',
  email: 'john@mail.com',
  password: 'MzIz...'
}

// User's Tasks
app_tasks_<userId> = [
  {
    id: '_task001',
    title: 'Làm Project AWS',
    description: 'Hoàn thành giai đoạn 1',
    deadline: '2026-06-01',
    priority: 'high',
    status: 'pending',
    createdAt: '2026-05-29T...'
  }
]
```

---

## 🧪 Test Account

**Email:** `demo@mail.com`  
**Password:** `123456`

Tài khoản này tự động được tạo khi load app lần đầu.

---

## 🎨 Responsive Design

| Device | Width | Behavior |
|--------|-------|----------|
| Desktop | >768px | Multi-column layout |
| Tablet | 481-768px | Single column, optimized |
| Mobile | <480px | Full-width, compact UI |

---

## ✨ Features

| Feature | Status | Ghi chú |
|---------|--------|---------|
| Sign Up / Login | ✅ | Form validation, session management |
| Add Task | ✅ | Title, description, deadline, priority |
| View Tasks | ✅ | Sorted by deadline |
| Edit Task | ✅ | Modal dialog |
| Delete Task | ✅ | Confirm before delete |
| Mark Complete | ✅ | Checkbox, strikethrough |
| Filter by Priority | ✅ | High/Medium/Low |
| Filter by Status | ✅ | Pending/Completed |
| Filter by Deadline | ✅ | Date picker |
| Statistics | ✅ | Total, Pending, Completed count |
| Responsive | ✅ | Mobile/Tablet/Desktop |
| Local Persistence | ✅ | localStorage API |

---

## 🔄 Workflow

```
User visits auth.html
    ↓
Check if logged in (localStorage)
    ↓ YES: Redirect to app.html
    ↓ NO: Show login/signup form
    ↓
User signs up/logs in
    ↓
Save to localStorage
    ↓
Redirect to app.html
    ↓
Load user's tasks from localStorage
    ↓
Render task list
    ↓
User can: Add/Edit/Delete/Filter tasks
    ↓
All changes saved to localStorage
```

---

## ⚠️ Lưu Ý

1. **Local Storage Only** - Dữ liệu chỉ lưu trên browser, không sync đến server
2. **Not for Production** - Password được encode base64 (không bảo mật)
3. **Single User** - Mỗi user có tasks riêng
4. **No Backend** - Không kết nối AWS/DynamoDB ở giai đoạn này
5. **Clear Data** - Xóa localStorage sẽ mất tất cả data

---

## 🚀 Next Steps (Giai đoạn 2)

Thành viên B sẽ:
1. Xây dựng 4 hàm Lambda (Create, Read, Update, Delete)
2. Thiết lập DynamoDB trên AWS
3. Tạo API Gateway
4. Tích hợp frontend với backend thực

Frontend hiện tại có thể dễ dàng được cập nhật để gọi APIs thay vì localStorage.

---

## 📞 Support

Nếu gặp lỗi:
1. Kiểm tra console (F12 → Console tab)
2. Xóa localStorage: `localStorage.clear()`
3. Reload page: `Ctrl+Shift+R` (hard refresh)
