# 🚀 Hướng dẫn Deploy WebQR lên Web

## Mục lục
- [Cách 1: Render.com (MIỄN PHÍ, dễ nhất)](#cách-1-rendercom)
- [Cách 2: Railway.app (Nhanh, $5/tháng)](#cách-2-railwayapp)
- [Cách 3: VPS (DigitalOcean/Vultr, $5-6/tháng)](#cách-3-vps)
- [Sau khi deploy: Cấu hình QR & Domain](#sau-khi-deploy)

---

## Chuẩn bị chung

### 1. Cài Git (nếu chưa có)
Tải tại: https://git-scm.com/downloads

### 2. Tạo tài khoản GitHub
- Đăng ký tại https://github.com
- Tạo repository mới tên `webqr`
- Push code lên:

```bash
cd "c:\Users\Kiem PC\Desktop\WebQR"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TEN-CUA-BAN/webqr.git
git push -u origin main
```

### 3. Tạo file `.gitignore`
Tạo file `.gitignore` trong thư mục gốc với nội dung:

```
node_modules/
data/database.sqlite
.env
```

> ⚠️ **Quan trọng**: KHÔNG push file `.env` lên GitHub (chứa mật khẩu). Sẽ cấu hình biến môi trường trên hosting.

---

## Cách 1: Render.com

**Chi phí**: Miễn phí (free tier) — nhưng app sẽ tắt sau 15 phút không hoạt động, khởi động lại mất ~30 giây.

### Bước 1: Đăng ký
- Vào https://render.com → Sign up bằng GitHub

### Bước 2: Tạo Web Service
1. Dashboard → **New** → **Web Service**
2. Kết nối GitHub repo `webqr`
3. Cấu hình:
   - **Name**: `webqr` (hoặc tên bạn muốn)
   - **Region**: `Singapore` (gần Việt Nam nhất)
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### Bước 3: Thiết lập biến môi trường
Vào **Environment** → Thêm từng biến:

| Key | Value |
|-----|-------|
| `PORT` | `3000` |
| `ADMIN_PASSWORD` | `matkhau_cua_ban` |
| `BANK_ID` | `TCB` |
| `BANK_ACCOUNT` | `99902052007` |
| `BANK_NAME` | `DANG THANH AN` |
| `TELEGRAM_BOT_TOKEN` | `(token bot telegram)` |
| `TELEGRAM_CHAT_ID` | `(chat id nhóm)` |

### Bước 4: Deploy
- Nhấn **Create Web Service** → Đợi vài phút
- App sẽ có URL dạng: `https://webqr-xxxx.onrender.com`

> ⚠️ **Lưu ý**: Free tier dùng RAM disk, **database sẽ bị reset** khi app restart. Nếu cần lưu dữ liệu lâu dài, nâng lên gói **Starter ($7/tháng)** có Persistent Disk.

### Thêm Persistent Disk (giữ database):
1. Trong Web Service → **Disks** → **Add Disk**
2. **Mount Path**: `/opt/render/project/src/data`
3. **Size**: `1 GB` (đủ dùng)
4. Sửa file `server/database.js`: đảm bảo `dbPath` trỏ đến `/opt/render/project/src/data/database.sqlite`

---

## Cách 2: Railway.app

**Chi phí**: ~$5/tháng (tính theo usage, có $5 free credit/tháng cho plan Trial).

### Bước 1: Đăng ký
- Vào https://railway.app → Sign up bằng GitHub

### Bước 2: Deploy
1. **New Project** → **Deploy from GitHub repo**
2. Chọn repo `webqr`
3. Railway tự detect Node.js và deploy

### Bước 3: Thiết lập biến môi trường
Vào **Variables** tab → thêm các biến giống bảng ở Cách 1.

### Bước 4: Tạo domain
1. Vào **Settings** → **Networking** → **Generate Domain**
2. Sẽ có URL dạng: `https://webqr-production.up.railway.app`

> ✅ Railway giữ lại filesystem giữa các lần deploy, database sẽ không bị mất.

---

## Cách 3: VPS

**Chi phí**: $5-6/tháng. **Đề xuất** cho production thực tế.

### Nhà cung cấp phổ biến:
- **DigitalOcean**: https://digitalocean.com ($4-6/tháng)
- **Vultr**: https://vultr.com ($5/tháng)
- **Linode/Akamai**: https://linode.com ($5/tháng)
- **Tinahost** (VN): https://tinahost.vn (VPS Việt Nam)

### Bước 1: Tạo VPS
- Chọn **Ubuntu 22.04**
- RAM: **1GB** (đủ dùng)
- Region: **Singapore** hoặc **Việt Nam** (nếu có)

### Bước 2: SSH vào VPS

```bash
ssh root@IP_CUA_VPS
```

### Bước 3: Cài Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

### Bước 4: Clone và chạy

```bash
cd /home
git clone https://github.com/TEN-CUA-BAN/webqr.git
cd webqr
npm install
```

### Bước 5: Tạo file .env

```bash
nano .env
```

Dán nội dung:

```
PORT=3000
ADMIN_PASSWORD=matkhau_cua_ban
BANK_ID=TCB
BANK_ACCOUNT=99902052007
BANK_NAME=DANG THANH AN
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
```

Lưu: `Ctrl+O` → `Enter` → `Ctrl+X`

### Bước 6: Cài PM2 (giữ app chạy 24/7)

```bash
sudo npm install -g pm2
pm2 start server/server.js --name webqr
pm2 save
pm2 startup
```

### Bước 7: Cài Nginx (reverse proxy + SSL)

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/webqr
```

Dán nội dung:

```nginx
server {
    listen 80;
    server_name ten-mien-cua-ban.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Kích hoạt:

```bash
sudo ln -s /etc/nginx/sites-available/webqr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Bước 8: Cài SSL miễn phí (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ten-mien-cua-ban.com
```

Chọn option tự redirect HTTP → HTTPS.

### Bước 9: Trỏ domain
Vào nơi quản lý domain → thêm **A Record**:
- **Host**: `@`
- **Value**: `IP_CUA_VPS`

---

## Sau khi deploy

### 1. Cập nhật URL cho QR Code
Sau khi có URL thật (ví dụ `https://quanxyz.com`), vào trang admin:
- **Quản lý Bàn**: QR tự cập nhật theo domain
- **In QR Code**: Sửa ô "URL gốc" thành `https://quanxyz.com` → nhấn **Tạo QR** → **In**

### 2. In QR cho từng bàn
- Vào `/admin/qr-print.html` → In ra giấy → dán lên bàn
- Hoặc in thành tent card để khách quét

### 3. Cấu hình Telegram Bot
1. Nhắn `/newbot` cho [@BotFather](https://t.me/BotFather) trên Telegram
2. Đặt tên bot → nhận **Bot Token**
3. Tạo nhóm Telegram → thêm bot vào → gửi 1 tin nhắn
4. Truy cập: `https://api.telegram.org/botTOKEN/getUpdates`
5. Tìm `"chat":{"id": -XXXXXXXXX}` → đó là **Chat ID**
6. Cập nhật vào `.env` hoặc biến môi trường trên hosting

### 4. Cập nhật code
Khi sửa code xong:

```bash
git add .
git commit -m "Mô tả thay đổi"
git push
```

- **Render/Railway**: Tự động deploy lại khi push
- **VPS**: SSH vào rồi chạy:
  ```bash
  cd /home/webqr
  git pull
  npm install
  pm2 restart webqr
  ```

---

## So sánh nhanh

| | Render (Free) | Railway | VPS |
|---|---|---|---|
| **Chi phí** | Miễn phí | ~$5/tháng | $5-6/tháng |
| **Dễ setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Hiệu năng** | Chậm (cold start) | Tốt | Tốt nhất |
| **Giữ data** | ❌ (cần Disk) | ✅ | ✅ |
| **Custom domain** | ✅ | ✅ | ✅ |
| **SSL/HTTPS** | ✅ Tự động | ✅ Tự động | Cần cài Certbot |
| **Khuyên dùng** | Test/Demo | Nhỏ lẻ | Production |
