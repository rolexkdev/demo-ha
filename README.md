# Demo Backend API

A professional Elysia + Bun API with PostgreSQL High Availability cluster, implementing clean code principles and SOLID architecture.

## 🚀 Tech Stack

- **Runtime:** Bun
- **Framework:** Elysia.js
- **Database:** PostgreSQL (Primary/Replica via HAProxy)
- **ORM:** Drizzle ORM
- **Auth:** Better-Auth
- **Validation:** Zod (built-in Elysia)

## 📋 Features

- ✅ Dual database connection pools (Primary for writes, Replica for reads)
- ✅ Automatic read/write routing
- ✅ Better-Auth with PostgreSQL session storage
- ✅ Protected routes with authentication middleware
- ✅ Clean architecture with separation of concerns
- ✅ TypeScript strict mode
- ✅ Health check endpoints
- ✅ Graceful shutdown
- ✅ Comprehensive error handling
- ✅ CORS support
- ✅ Request logging

## 📁 Project Structure

```
src/
├── config/
│   └── database.ts          # Dual pool configuration (primary/replica)
├── db/
│   └── schema.ts            # Drizzle ORM schemas
├── lib/
│   └── auth.ts              # Better-Auth configuration
├── middleware/
│   └── auth.ts              # Authentication middleware
├── routes/
│   ├── auth.ts              # Auth endpoints (signup, login, logout, me)
│   ├── users.ts             # User CRUD operations
│   └── posts.ts             # Post CRUD operations
└── index.ts                 # Main application entry point
```

## 🔧 Installation

1. **Install Bun** (if not already installed):
```bash
curl -fsSL https://bun.sh/install | bash
```

2. **Install dependencies:**
```bash
bun install
```

3. **Setup environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database Configuration
DB_PRIMARY_HOST=10.100.0.20
DB_PRIMARY_PORT=5000
DB_REPLICA_HOST=10.100.0.20
DB_REPLICA_PORT=5001
DB_NAME=demo_db
DB_USER=postgres
DB_PASSWORD=your_password_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Better-Auth Configuration
BETTER_AUTH_SECRET=your_secret_key_here
BETTER_AUTH_URL=http://localhost:3000
```

4. **Generate and run database migrations:**
```bash
bun run db:generate
bun run db:migrate
```

## 🏃 Running the Application

### Development mode (with hot reload):
```bash
bun run dev
```

### Production mode:
```bash
bun run start
```

### Database management:
```bash
# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Open Drizzle Studio
bun run db:studio
```

## 📡 API Endpoints

### Authentication (Public)
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user (protected)

### Users (Protected)
- `GET /users` - List all users (uses replica)
- `GET /users/:id` - Get user by ID (uses replica)
- `POST /users` - Create new user (uses primary)
- `PATCH /users/:id` - Update user (uses primary)
- `DELETE /users/:id` - Delete user (uses primary)

### Posts (Protected)
- `GET /posts` - List all posts (uses replica)
- `GET /posts/:id` - Get post by ID (uses replica)
- `POST /posts` - Create new post (uses primary)
- `PATCH /posts/:id` - Update post (uses primary)
- `DELETE /posts/:id` - Delete post (uses primary)

### Health Check
- `GET /health` - Overall health status
- `GET /health/db` - Database connections status

## 🏗️ Architecture Principles

### Clean Code
- **Single Responsibility:** Each module has a single, well-defined purpose
- **DRY (Don't Repeat Yourself):** Reusable functions and configurations
- **Meaningful Names:** Clear, descriptive variable and function names
- **Error Handling:** Comprehensive error handling at all levels

### SOLID Principles
- **Single Responsibility Principle:** Each class/module has one reason to change
- **Open/Closed Principle:** Extendable without modification
- **Liskov Substitution Principle:** Subtypes are substitutable for base types
- **Interface Segregation Principle:** Specific interfaces over general ones
- **Dependency Inversion Principle:** Depend on abstractions, not concretions

### Database Strategy
- **Read Operations:** Automatically routed to replica database
- **Write Operations:** Automatically routed to primary database
- **Transactions:** Always use primary database pool
- **Connection Pooling:** Separate pools for optimal performance
- **Health Checks:** Monitor both primary and replica connections

## 🔒 Security Features

- Password hashing with Better-Auth
- Session-based authentication stored in PostgreSQL
- Protected routes with authentication middleware
- CORS configuration
- Secure cookies in production
- Input validation with Zod schemas

## 🧪 Database Schema

### Users Table
```typescript
{
  id: UUID (Primary Key)
  name: String
  email: String (Unique)
  emailVerified: Boolean
  image: String (Optional)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Posts Table
```typescript
{
  id: UUID (Primary Key)
  title: String
  content: Text
  published: Boolean
  authorId: UUID (Foreign Key → users.id)
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Sessions Table (Better-Auth)
```typescript
{
  id: String (Primary Key)
  userId: UUID (Foreign Key → users.id)
  expiresAt: Timestamp
  token: String (Unique)
  ipAddress: String
  userAgent: String
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## 🛠️ Development Guidelines

### Adding New Routes
1. Create route file in `src/routes/`
2. Apply authentication middleware if needed
3. Use `dbReplica` for read operations
4. Use `dbPrimary` for write operations
5. Register route in `src/index.ts`

### Adding New Database Tables
1. Add schema to `src/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Run migration: `bun run db:migrate`

### Error Handling
Always return consistent error responses:
```typescript
{
  success: false,
  message: "Error description"
}
```

## 📊 Monitoring

The application includes comprehensive logging:
- Request/response logging
- Database connection status
- Error tracking
- Performance metrics

## 🚦 Graceful Shutdown

The application handles shutdown signals properly:
- Closes database connections
- Completes pending requests
- Logs shutdown status

Supported signals: `SIGTERM`, `SIGINT`

## 📝 License

MIT

## 👥 Contributing

1. Follow TypeScript strict mode
2. Maintain clean code principles
3. Add comprehensive error handling
4. Update documentation
5. Write meaningful commit messages

## 🤝 Support

For issues or questions, please create an issue in the repository.
