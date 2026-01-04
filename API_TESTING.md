# API Testing Guide

## Prerequisites
- Ensure PostgreSQL databases are running on the specified ports
- Ensure `.env` file is configured properly
- Run `bun install` to install dependencies

## Starting the Server

```bash
bun run dev
```

The server will start on `http://localhost:3000`

## Testing Endpoints with curl

### 1. Health Check

```bash
# General health check
curl http://localhost:3000/health

# Database health check
curl http://localhost:3000/health/db
```

### 2. Authentication Flow

#### Sign Up
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### Get Current User (Protected)
```bash
curl http://localhost:3000/auth/me \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

#### Logout
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### 3. User Management (Protected Routes)

#### List Users
```bash
curl http://localhost:3000/users?limit=10&offset=0 \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

#### Get User by ID
```bash
curl http://localhost:3000/users/{user-id} \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

#### Create User
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "New User",
    "email": "newuser@example.com",
    "emailVerified": false
  }'
```

#### Update User
```bash
curl -X PATCH http://localhost:3000/users/{user-id} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Updated Name"
  }'
```

#### Delete User
```bash
curl -X DELETE http://localhost:3000/users/{user-id} \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### 4. Post Management (Protected Routes)

#### List Posts
```bash
# All posts
curl http://localhost:3000/posts?limit=10&offset=0 \
  -H "Content-Type: application/json" \
  -b cookies.txt

# Published posts only
curl http://localhost:3000/posts?published=true \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

#### Get Post by ID
```bash
curl http://localhost:3000/posts/{post-id} \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

#### Create Post
```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "My First Post",
    "content": "This is the content of my first post",
    "published": false
  }'
```

#### Update Post
```bash
curl -X PATCH http://localhost:3000/posts/{post-id} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Updated Title",
    "published": true
  }'
```

#### Delete Post
```bash
curl -X DELETE http://localhost:3000/posts/{post-id} \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

## Testing with HTTPie (Alternative)

HTTPie is a more user-friendly command-line HTTP client. Install it with:
```bash
# macOS
brew install httpie

# Linux
apt install httpie
```

### Examples with HTTPie

#### Sign Up
```bash
http POST localhost:3000/auth/signup \
  email=user@example.com \
  password=password123 \
  name="Test User"
```

#### Login (saves session)
```bash
http --session=user POST localhost:3000/auth/login \
  email=user@example.com \
  password=password123
```

#### Get Current User
```bash
http --session=user GET localhost:3000/auth/me
```

#### Create Post
```bash
http --session=user POST localhost:3000/posts \
  title="My Post" \
  content="Post content" \
  published:=true
```

## Testing with Postman/Insomnia

1. Import the following base URL: `http://localhost:3000`
2. For authenticated requests, ensure cookies are enabled
3. After login, the session cookie will be automatically stored
4. Use the stored cookie for subsequent protected route requests

## Database Routing Verification

### Read Operations (Should use Replica - Port 5001)
- GET /users
- GET /users/:id
- GET /posts
- GET /posts/:id

### Write Operations (Should use Primary - Port 5000)
- POST /auth/signup
- POST /auth/login
- POST /users
- PATCH /users/:id
- DELETE /users/:id
- POST /posts
- PATCH /posts/:id
- DELETE /posts/:id

## Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 10,
    "offset": 0
  }
}
```

## Common HTTP Status Codes

- `200` - OK (Successful request)
- `201` - Created (Resource created successfully)
- `400` - Bad Request (Validation error)
- `401` - Unauthorized (Authentication required)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found (Resource not found)
- `500` - Internal Server Error
- `503` - Service Unavailable (Database connection issue)

## Troubleshooting

### Cannot connect to database
- Check if PostgreSQL is running
- Verify connection details in `.env`
- Run health check: `curl http://localhost:3000/health/db`

### Unauthorized errors
- Ensure you're logged in
- Check if session cookie is being sent
- Verify cookie expiration

### Validation errors
- Check request body format
- Ensure all required fields are provided
- Verify field types and constraints

## Performance Testing

### Using Apache Bench (ab)
```bash
# Test health endpoint
ab -n 1000 -c 10 http://localhost:3000/health

# Test authenticated endpoint (replace with actual session)
ab -n 100 -c 5 -C "session_cookie=value" http://localhost:3000/users
```

### Using wrk
```bash
# Basic test
wrk -t4 -c100 -d30s http://localhost:3000/health

# With custom script for POST requests
wrk -t4 -c100 -d30s -s post.lua http://localhost:3000/auth/login
```
