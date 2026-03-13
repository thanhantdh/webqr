# 🚀 Hướng dẫn Cập nhật Website WebQR trên VPS

Khi bạn đã sửa code trên máy tính và đẩy lên GitHub (bằng lệnh `git push`), bước tiếp theo là yêu cầu máy chủ VPS lấy code mới đó về và khởi động lại trang web.

Đây là các bước chuẩn cần làm trên **Máy chủ VPS** của bạn, không phải máy tính cá nhân.

## Bước 1: Đăng nhập vào VPS

Mở ứng dụng kết nối SSH (như **PuTTY**, **MobaXterm**, **Termius**, hoặc dùng Command Prompt/Windows Terminal mở mới).

Gõ lệnh đăng nhập (thay IP bằng địa chỉ IP VPS của bạn):
```bash
ssh root@DIA_CHI_IP_VPS
```
*(Nó sẽ hỏi mật khẩu, bạn gõ mật khẩu VPS vào - lưu ý khi gõ sẽ không hiện dấu sao hay ký tự gì đâu, cứ gõ đúng rồi Enter).*

---

## Bước 2: Di chuyển vào thư mục chứa code WebQR

Bạn cần biết code trang web đang được lưu ở thư mục nào trên VPS (thường là `/var/www/webqr` hoặc `~/webqr`).
Giả sử thư mục là `/var/www/webqr`, bạn gõ:

```bash
cd /var/www/webqr
```

---

## Bước 3: Kéo code mới nhất từ GitHub về

Chạy lệnh sau để VPS tải các thay đổi mới nhất (như phần Lịch sử đơn hàng, Thanh toán, Đổi màu...):

```bash
git pull origin main
```
> **Dấu hiệu thành công:** Trả về một loạt danh sách các file được cập nhật (Fast-forward, 28 files changed...), giống như lúc bạn push trên máy.

---

## Bước 4: Chạy lệnh cài đặt lại (Nếu có thêm thư viện mới)
Để chắc chắn, hãy chạy lệnh cài đặt thư viện để nếu có cập nhật gì mới trong `package.json` thì nó sẽ tự động tải:
```bash
npm install
```

---

## Bước 5: Khởi động lại Website để code mới có hiệu lực

Hệ thống của bạn đang chạy ngầm 24/24 bằng Node.js (rất có thể là bằng ứng dụng **PM2**).
Bạn cần gõ lệnh sau để khởi động lại tiến trình của trang web:

```bash
pm2 restart all
```
Hoặc nếu bạn biết rõ tên app chạy webqr (ví dụ tên pm2 là `webqr`), gõ: `pm2 restart webqr`

> **Kết quả:** PM2 sẽ hiển thị một cái bảng trạng thái với chữ **online** màu xanh lá cây nghĩa là web đã khởi động lại hoàn tất.

---

## 🎉 Bước 6: Kiểm tra
Mở điện thoại hoặc máy tính, vào đường link quán của bạn.
Nhấn `F5` hoặc chọn **"Xóa bộ nhớ đệm (Clear Cache)"** trên trình duyệt để thấy giao diện admin xanh lá mới tinh, nút "Lịch sử mua hàng" và nút "Tôi đã thanh toán" xuất hiện.
