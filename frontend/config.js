// ===== AWS Configuration =====
// Cấu hình AWS Amplify cho Cognito, API Gateway, etc.
// ===== AWS Cognito OIDC Configuration =====
const cognitoAuthConfig = {
    authority: "https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_l1TnlF9vP",
    client_id: "609qe7sdfg6ke4h02qifum0upq",
    // Chú ý: File callback xử lý token bắt buộc phải là trang tasks.html 
    // vì Cognito sau khi login xong sẽ đá user về đây kèm theo mã ?code= trên URL
    redirect_uri: "https://dwarnvuzl14qe.cloudfront.net/tasks.html", 
    post_logout_redirect_uri: "https://dwarnvuzl14qe.cloudfront.net/auth.html",
    response_type: "code",
    scope: "email openid phone profile"
};

// Khởi tạo UserManager từ thư viện oidc-client-ts
let userManager = null;

if (typeof oidc !== 'undefined') {
    userManager = new oidc.UserManager(cognitoAuthConfig);
    console.log("✅ Hệ thống OIDC UserManager đã cấu hình thành công!");
} else {
    console.error("❌ Không nạp được thư viện oidc-client-ts!");
}

// Hàm xử lý Đăng xuất điều hướng thẳng lên Hosted UI của Cloud
async function signOutRedirect() {
    const clientId = "609qe7sdfg6ke4h02qifum0upq";
    const logoutUri = "https://dwarnvuzl14qe.cloudfront.net/auth.html"; // Nơi quay về sau khi logout thành công
    const cognitoDomain = "https://ap-southeast-1l1tnlf9vp.auth.ap-southeast-1.amazoncognito.com";
    
    if (userManager) {
        await userManager.removeUser(); // Xóa phiên làm việc ở local storage
    }
    // Chuyển hướng trình duyệt lên endpoint logout của AWS để xóa session trên cloud
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
}

const AWS_CONFIG = {
    api: {
        // Hãy thay chuỗi URL này bằng Invoke URL thực tế từ API Gateway Console của bạn
        baseUrl: "https://0259f7j8ab.execute-api.ap-southeast-1.amazonaws.com/v1" 
    },
    cognito: {
        clientId: cognitoAuthConfig.client_id,
        cognitoDomain: "https://ap-southeast-1l1tnlf9vp.auth.ap-southeast-1.amazoncognito.com"
    }
};
