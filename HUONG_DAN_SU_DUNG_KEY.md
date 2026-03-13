# 🔑 HƯỚNG DẪN QUẢN LÝ VÀ SỬ DỤNG LICENSE KEY WEBQR

Tài liệu này hướng dẫn chi tiết cách tạo, quản lý và kiểm tra hệ thống Giấy phép (License Key) dành cho các Quán Cafe / Nhà hàng thuê nền tảng của bạn.

---

## PHẦN 1: CÁCH TEST THỬ TÍNH NĂNG GIA HẠN (DÀNH CHO BẠN)

Bây giờ lỗi đồng bộ Database đã được fix, bạn có thể tự tin test lại toàn bộ luồng gia hạn tự động từ A-Z theo các bước sau:

**Bước 1: Khởi động Server (nếu chưa chạy)**
Đảm bảo bạn đang chạy câu lệnh `node server/server.js` ở một cửa sổ Terminal/PowerShell.

**Bước 2: Mở một Terminal/PowerShell MỚI và tạo Key test**
Dán câu lệnh sau để tạo một mã Key có thời hạn chỉ **2 ngày** (mục đích để ép hệ thống hiện nút "Sắp hết hạn"):
```bash
node scripts/manage_keys.js create "Khach Test" "0901234567" 2
```
✅ Lệnh này sẽ in ra màn hình một mã dạng `WQR-XXXX-XXXX-XXXX`. Hãy Copy mã này.

**Bước 3: Đăng nhập với tư cách Khách Hàng (Quán Cafe)**
- Mở link: `http://localhost:3000/admin/login.html`
- Dùng mã `WQR-XXXX...` vừa copy để đăng nhập.

**Bước 4: Trải nghiệm tính năng Cảnh báo & Gia hạn**
- Nhìn lên góc phải trên cùng Dashboard, bạn sẽ thấy thẻ báo **"🔴 Sắp hết hạn! | Gia hạn ngay"**.
- Bấm vào chữ **Gia hạn ngay**.
- Bạn sẽ được chuyển sang trang Web chọn gói cước (30 ngày, 90 ngày...).
- Chọn nút **Thanh toán mã QR**.
- Bấm **"✅ Tôi đã hoàn tất chuyển khoản"**.
- Bấm "Đi tới Bảng điều khiển". Lúc này bạn nhìn lên góc phải Dashboard, thời gian đã được tự động cộng thêm và chuyến thành màu Xanh!
- **Kiểm tra Telegram**: Điện thoại của bạn (nhóm Admin) sẽ nhận được tin nhắn thông báo có người vừa tự gia hạn.

---

## PHẦN 2: HƯỚNG DẪN QUẢN LÝ KEY KHI ĐƯA LÊN WEB (CHẠY THẬT)

Khi website của bạn chính thức "Go Live" (chạy trên server thật cho khách thuê), bạn sẽ dùng công cụ `scripts/manage_keys.js` thông qua Terminal trên máy chủ VPS của bạn. 

Dưới đây là 4 câu lệnh quyền lực nhất dành riêng cho **Super Admin (Bạn)**:

### 1. 🐣 Tạo Key mới để cấp cho Khách (Quán Cafe)
Khi có quán cafe mới đồng ý thuê phần mềm trong **30 ngày**, bạn gõ:
```bash
node scripts/manage_keys.js create "Tiệm Cafe Bất Ổn" "0988777666" 30
```
- Gửi mã `WQR-XXXX-XXXX-XXXX` cho họ để họ dán vào ô đăng nhập Admin.

### 2. 📋 Xem danh sách toàn bộ Khách Hàng
Để kiểm tra xem hiện tại bạn đang có bao nhiêu khách hàng, gói cước thẻ xanh/đỏ thế nào:
```bash
node scripts/manage_keys.js list
```
*(Bạn sẽ xem được ai đang dùng, ai sắp hết hạn, ai đã quá hạn).*

### 3. ⏳ Gia hạn Thủ Công (Cộng thêm ngày)
Trong trường hợp khách hàng **chuyển khoản trực tiếp** cho bạn (không qua nút Gia Hạn tự động trên Web), bạn có thể tự tay cộng thêm ngày cho họ (ví dụ cộng 90 ngày):
```bash
node scripts/manage_keys.js extend WQR-XXXX-XXXX-XXXX 90
```

### 4. ⛔ Thu hồi Key (Khóa mõm)
Khi khách:
1. Hết tiền không trả phí duy trì.
2. Hoặc họ bấm nút "Tôi đã chuyển khoản" trên giao diện tự động nhưng khi bạn check App Ngân Hàng **không hề thấy tiền vào**.

Bạn lập tức thu hồi quyền truy cập của họ bằng lệnh:
```bash
node scripts/manage_keys.js revoke WQR-XXXX-XXXX-XXXX
```
*(Ngay sau câu lệnh này, Key của họ sẽ bị vô hiệu hóa, khách hàng không thể login vào Quản lý Đơn hàng được nữa).*

---
🎉 **CHÚC BẠN KINH DOANH HỆ THỐNG WEBQR THẬT ĐẮT KHÁCH!** 🚀
