# Hướng Dẫn Nhanh - Demo Backend API

## 📚 Tổng Quan

Backend server chuyên nghiệp sử dụng Elysia.js + Bun + PostgreSQL với kiến trúc High Availability (HA), tuân thủ nguyên tắc Clean Code và SOLID.

## 🚀 Bắt Đầu Nhanh

### 1. Cài Đặt Dependencies

```bash
# Sử dụng script tự động
./setup.sh

# Hoặc cài đặt thủ công
bun install
```

### 2. Cấu Hình Môi Trường

File `.env` đã được tạo sẵn với cấu hình mặc định:

```env
DB_PRIMARY_HOST=10.100.0.20    # Database chính (ghi)
DB_PRIMARY_PORT=5000
DB_REPLICA_HOST=10.100.0.20    # Database replica (đọc)
DB_REPLICA_PORT=5001
DB_NAME=demo_db
DB_USER=postgres
DB_PASSWORD=postgres
```

### 3. Chạy Database Migrations

```bash
# Tạo migration files
bun run db:generate

# Chạy migrations
bun run db:migrate
```

### 4. Khởi Động Server

```bash
# Development mode (tự động reload)
bun run dev

# Production mode
bun run start
```

Server sẽ chạy tại: `http://localhost:3000`

## 🏗️ Kiến Trúc Hệ Thống

### Cấu Trúc Thư Mục

```
src/
├── config/           # Cấu hình database, connection pools
├── db/              # Schema và types của database
├── lib/             # Business logic, auth configuration
├── middleware/      # Authentication middleware
├── routes/          # API endpoints
│   ├── auth.ts     # Đăng ký, đăng nhập, đăng xuất
│   ├── users.ts    # CRUD người dùng
│   └── posts.ts    # CRUD bài viết
└── index.ts        # Entry point, khởi tạo server
```

### Nguyên Tắc Thiết Kế

#### 1. Separation of Concerns (Tách Biệt Mối Quan Tâm)
- Mỗi file/module có một trách nhiệm cụ thể
- Config riêng, schema riêng, routes riêng
- Dễ dàng maintain và mở rộng

#### 2. Database Read/Write Splitting
```typescript
// ĐỌC từ Replica (port 5001)
GET /users        → dbReplica
GET /users/:id    → dbReplica
GET /posts        → dbReplica

// GHI vào Primary (port 5000)
POST /users       → dbPrimary
PATCH /users/:id  → dbPrimary
DELETE /users/:id → dbPrimary
```

#### 3. Authentication Flow
```
1. Đăng ký/Đăng nhập → Better-Auth tạo session
2. Session lưu trong PostgreSQL
3. Cookie được gửi về client
4. Các request sau gửi cookie → Middleware verify → Cho phép truy cập
```

## 📡 API Endpoints

### Authentication (Công Khai)

```bash
# Đăng ký
POST /auth/signup
Body: { "email": "...", "password": "...", "name": "..." }

# Đăng nhập
POST /auth/login
Body: { "email": "...", "password": "..." }

# Đăng xuất
POST /auth/logout

# Lấy thông tin user hiện tại (cần auth)
GET /auth/me
```

### Users (Cần Authentication)

```bash
# Danh sách users
GET /users?limit=10&offset=0

# Chi tiết user
GET /users/:id

# Tạo user mới
POST /users
Body: { "name": "...", "email": "..." }

# Cập nhật user
PATCH /users/:id
Body: { "name": "..." }

# Xóa user
DELETE /users/:id
```

### Posts (Cần Authentication)

```bash
# Danh sách posts
GET /posts?limit=10&offset=0&published=true

# Chi tiết post
GET /posts/:id

# Tạo post mới
POST /posts
Body: { "title": "...", "content": "...", "published": false }

# Cập nhật post
PATCH /posts/:id
Body: { "title": "...", "content": "..." }

# Xóa post
DELETE /posts/:id
```

### Health Check

```bash
# Kiểm tra server
GET /health

# Kiểm tra database
GET /health/db
```

## 🧪 Test API

### Sử dụng curl

```bash
# 1. Đăng ký
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# 2. Đăng nhập (lưu cookie)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'

# 3. Tạo post (sử dụng cookie)
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title":"Bài viết đầu tiên","content":"Nội dung bài viết","published":true}'

# 4. Lấy danh sách posts
curl http://localhost:3000/posts -b cookies.txt
```

## 🔐 Bảo Mật

### Đã Implement
- ✅ Hash password với Better-Auth (bcrypt)
- ✅ Session-based authentication
- ✅ HTTP-only cookies (production)
- ✅ Input validation với Zod
- ✅ SQL injection prevention (parameterized queries)
- ✅ Authorization checks (user chỉ sửa/xóa resource của mình)

### Best Practices
- Đổi `BETTER_AUTH_SECRET` thành chuỗi ngẫu nhiên mạnh
- Sử dụng HTTPS trong production
- Cấu hình CORS cho domain cụ thể
- Thêm rate limiting để chống abuse

## 📊 Database Schema

### Bảng Users
```sql
id          UUID (Primary Key)
name        VARCHAR(255)
email       VARCHAR(255) UNIQUE
emailVerified BOOLEAN
image       TEXT
createdAt   TIMESTAMP
updatedAt   TIMESTAMP
```

### Bảng Posts
```sql
id          UUID (Primary Key)
title       VARCHAR(255)
content     TEXT
published   BOOLEAN
authorId    UUID (Foreign Key → users.id)
createdAt   TIMESTAMP
updatedAt   TIMESTAMP
```

### Bảng Sessions (Better-Auth)
```sql
id          VARCHAR(255) (Primary Key)
userId      UUID (Foreign Key → users.id)
expiresAt   TIMESTAMP
token       TEXT UNIQUE
ipAddress   VARCHAR(45)
userAgent   TEXT
createdAt   TIMESTAMP
updatedAt   TIMESTAMP
```

## 🛠️ Development

### Xem Database với Drizzle Studio
```bash
bun run db:studio
```
Mở trình duyệt: `https://local.drizzle.studio`

### Logs
Server tự động log:
- Request/Response
- Database connection status
- Errors với stack trace
- Graceful shutdown events

### Hot Reload
Khi chạy `bun run dev`, server tự động reload khi có thay đổi code.

## 🐛 Troubleshooting

### Không kết nối được database
```bash
# Kiểm tra database health
curl http://localhost:3000/health/db

# Kiểm tra .env
cat .env | grep DB_

# Test connection thủ công
psql -h 10.100.0.20 -p 5000 -U postgres -d demo_db
```

### Lỗi 401 Unauthorized
- Đảm bảo đã đăng nhập
- Kiểm tra cookie có được gửi không
- Session có thể đã hết hạn (7 ngày)

### Lỗi validation
- Kiểm tra format request body
- Đảm bảo tất cả required fields có giá trị
- Kiểm tra type của từng field

## 📈 Performance

### Connection Pooling
- Primary pool: 20 connections
- Replica pool: 20 connections
- Idle timeout: 30 giây
- Connection timeout: 5 giây

### Optimization Tips
- Sử dụng pagination cho list endpoints
- Cache session trong cookie (5 phút)
- Index trên các columns thường query
- Monitor slow queries

## 🚀 Production Deployment

### Checklist
- [ ] Đổi `NODE_ENV=production`
- [ ] Tạo `BETTER_AUTH_SECRET` mạnh (>32 ký tự)
- [ ] Cấu hình CORS origins cụ thể
- [ ] Enable SSL/TLS
- [ ] Setup monitoring (logs, metrics)
- [ ] Configure backup cho database
- [ ] Test load balancing
- [ ] Setup rate limiting

### Deploy với PM2
```bash
# Cài PM2
bun add -g pm2

# Start
pm2 start src/index.ts --name demo-api --interpreter bun

# Monitor
pm2 monit

# Logs
pm2 logs demo-api

# Restart
pm2 restart demo-api
```

## 📚 Tài Liệu Thêm

- `README.md` - Tổng quan và hướng dẫn cơ bản
- `ARCHITECTURE.md` - Kiến trúc chi tiết và design decisions
- `API_TESTING.md` - Hướng dẫn test API đầy đủ

## 🤝 Liên Hệ & Hỗ Trợ

Nếu gặp vấn đề hoặc có câu hỏi, vui lòng tạo issue trong repository.

## ✨ Tính Năng Nổi Bật

1. **Type Safety**: TypeScript strict mode
2. **Auto Routing**: Đọc → Replica, Ghi → Primary (tự động)
3. **Clean Architecture**: SOLID principles
4. **Error Handling**: Toàn diện và nhất quán
5. **Security**: Authentication, authorization, validation
6. **Performance**: Connection pooling, pagination
7. **Monitoring**: Health checks, logging
8. **Production Ready**: Graceful shutdown, error recovery

---

**Chúc bạn code vui vẻ! 🎉**
