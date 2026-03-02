# 🐙 Hướng dẫn chi tiết: Tạo GitHub và Push Code (Đưa code lên mạng)

Bài viết này hướng dẫn từng bước (dành cho người mới) để bạn lưu trữ thư mục `WebQR` của mình lên GitHub một cách an toàn. Việc này giúp bạn không lo mất code và dễ dàng triển khai (deploy) lên các máy chủ web.

---

## Phần 1: Các bước chuẩn bị ban đầu (Chỉ làm 1 lần)

### Bước 1: Cài đặt phần mềm Git (nếu máy chưa có)
Git là phần mềm giúp theo dõi sự thay đổi của các file code.
1. Truy cập trang web: [https://git-scm.com/downloads](https://git-scm.com/downloads)
2. Nhấp vào **Download for Windows** và tải bản cài đặt.
3. Mở file vừa tải về, cứ nhấn **Next** liên tục cho đến khi nhấn **Install** để cài đặt.

### Bước 2: Tạo tài khoản GitHub
1. Vào trang [https://github.com/](https://github.com/) 
2. Nhấn **Sign up** góc trên bên phải để tạo tài khoản bằng email của bạn.
3. Sau khi tạo xong, đăng nhập vào GitHub.

### Bước 3: Tạo Kho lưu trữ (Repository) trên GitHub
1. Đăng nhập vào GitHub, nhìn góc trên bên phải có dấu **`+`** ➔ Chọn **New repository**.
2. **Repository name**: Nhập tên dự án, ví dụ: `webqr-dat-do`
3. Điểm cực kỳ quan trọng: Chọn **Private** (Riêng tư) để không ai lấy cắp được code và thông tin quán của bạn. Nhấn nút **Create repository** màu xanh lá.
4. Màn hình tiếp theo sẽ hiện ra các dòng code (link có dạng `https://github.com/Tên-Của-Bạn/webqr-dat-do.git`). Hãy mở sẵn trang đó để dùng cho Bước 5.

---

## Phần 2: Đưa code từ máy lên GitHub (Push lần đầu tiên)

Bây giờ chúng ta sẽ kết nối thư mục `WebQR` trên máy tính với kho vừa tạo trên mạng.

### Bước 4: Tạo file `.gitignore` để bảo mật mật khẩu
Có những file tuyệt đối **KHÔNG ĐƯỢC** đưa lên mạng (như file `.env` chứa mật khẩu ngân hàng, bot telegram, file database).

Tôi đã tạo sẵn file `.gitignore` trong dự án này nên bạn có thể an tâm bước này.
*(Nó sẽ loại bỏ thư mục `node_modules`, `data/database.sqlite` và file `.env`)*

### Bước 5: Mở Terminal (Cửa sổ lệnh) tại thư mục WebQR
1. Mở thư mục `WebQR` ở ngoài Desktop của bạn (`c:\Users\Kiem PC\Desktop\WebQR`).
2. Nhấn chuột phải vào khoảng trống trong thư mục ➔ Chọn **Open in Terminal** (nếu dùng Windows 11).
   *(Hoặc gõ chữ `cmd` vào thanh đường dẫn thư mục ở trên cùng rồi ấn Enter)*

### Bước 6: Copy dán từng lệnh sau vào Terminal và ấn Enter

**Lệnh 1:** Khởi tạo Git trong thư mục này
```bash
git init
```

**Lệnh 2:** Lấy tất cả các file trong thư mục để chuẩn bị tải lên (lưu ý có dấu chấm `.` ở cuối)
```bash
git add .
```

**Lệnh 3:** Đóng gói code lại và ghi chú sửa đổi
```bash
git commit -m "Đưa code WebQR lên lần đầu tiên"
```

**Lệnh 4:** Đổi tên nhánh chính thành `main`
```bash
git branch -M main
```

**Lệnh 5:** Kết nối máy tính với GitHub
> ⚠️ **Lưu ý:** Thay cái link ở dưới bằng cái link kho lưu trữ của BẠN (ở màn hình cuối cùng của Bước 3).
```bash
git remote add origin https://github.com/TEN-CUA-BAN/webqr-dat-do.git
```

**Lệnh 6:** Bắt đầu đẩy code lên mạng
```bash
git push -u origin main
```
> Lúc này có thể máy sẽ hiện lên một khung yêu cầu bạn đăng nhập (**Sign in with your browser**). Nhấn vào đó để cho phép kết nối máy tính và GitHub.

🎉 Chờ một chút chạy xong 100% ➔ Bạn quay lại trang GitHub lúc nãy và ấn **F5 (Tải lại trang)**, bạn sẽ thấy toàn bộ code của mình đã hiện lên mạng!

---

## Phần 3: Cách push code LẦN SAU (Khi sửa/thêm code mới)

Sau khi đưa lên thành công lần đầu. Mọi việc cực kỳ dễ. Từ ngày mai, bất cứ khi nào bạn chỉnh sửa file lỗi, thêm mới danh sách... bạn chỉ cần làm 3 lệnh sau:

1. Mở Terminal trong thư mục WebQR.
2. Gõ lần lượt:

```bash
git add .
```

```bash
git commit -m "Sửa lỗi trạng thái bàn" 
```
*(Ghi chú trong ngoặc kép tùy bạn ghi gì cũng được để nhớ)*

```bash
git push
```

Thế là xong, code sửa mới đã được ấn định lên mạng tự động! Ngay sau lệnh này, các nền tảng hosting (nếu bạn dùng Render/Railway như đã hướng dẫn) sẽ tự động lấy code mới nhất về và cập nhật cho website của quán.
