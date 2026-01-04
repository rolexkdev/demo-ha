# Architecture Documentation

## Overview

This backend server implements a professional-grade REST API using Elysia.js and Bun, with PostgreSQL High Availability cluster support. The architecture follows clean code principles and SOLID design patterns.

## Design Principles

### 1. Clean Code Principles

#### Single Responsibility Principle (SRP)
- **Database Configuration** (`src/config/database.ts`): Only handles database connection setup and management
- **Schema Definition** (`src/db/schema.ts`): Only defines database table structures
- **Authentication** (`src/lib/auth.ts`): Only handles auth configuration and session verification
- **Middleware** (`src/middleware/auth.ts`): Only handles authentication verification
- **Routes**: Each route file handles only its specific domain (auth, users, posts)

#### DRY (Don't Repeat Yourself)
- Reusable `getDatabase()` function for routing reads/writes
- Shared error handling patterns across routes
- Centralized authentication middleware
- Common response format structures

#### Meaningful Names
- Clear function names: `checkDatabaseHealth`, `closeDatabaseConnections`, `getUserFromSession`
- Descriptive variable names: `primaryPool`, `replicaPool`, `dbPrimary`, `dbReplica`
- Self-documenting code with JSDoc comments

### 2. SOLID Principles

#### Single Responsibility (S)
Each module has one reason to change:
- Database module: Changes only when database connection logic changes
- Auth module: Changes only when authentication logic changes
- Route modules: Changes only when business logic for that domain changes

#### Open/Closed Principle (O)
- Routes can be extended without modifying existing code
- New routes can be added by creating new files and registering them
- Middleware can be added without changing route implementations

#### Liskov Substitution Principle (L)
- Database instances (`dbPrimary`, `dbReplica`) can be used interchangeably
- Both implement the same Drizzle interface
- Route handlers follow consistent patterns

#### Interface Segregation Principle (I)
- Authentication middleware provides only what routes need (`user` object)
- Database functions expose specific capabilities (`getDatabase`, `checkDatabaseHealth`)
- No fat interfaces forcing unused dependencies

#### Dependency Inversion Principle (D)
- Routes depend on database abstraction (Drizzle), not concrete PostgreSQL
- Authentication uses Better-Auth abstraction
- Configuration is injected via environment variables

## Architecture Layers

### 1. Entry Point Layer (`src/index.ts`)
**Responsibilities:**
- Application initialization
- Route registration
- Global middleware setup
- Error handling
- Server lifecycle management
- Graceful shutdown

**Key Features:**
- CORS configuration
- Request/response logging
- Health check endpoints
- Signal handlers (SIGTERM, SIGINT)
- Uncaught error handlers

### 2. Configuration Layer (`src/config/`)
**Responsibilities:**
- External service configuration
- Connection pool management
- Environment variable handling

**Database Configuration:**
```typescript
- Primary Pool: Write operations
- Replica Pool: Read operations
- Connection pooling with configurable limits
- Health check utilities
- Graceful shutdown support
```

### 3. Data Layer (`src/db/`)
**Responsibilities:**
- Database schema definitions
- Type exports for TypeScript
- Table relationships

**Tables:**
- `users`: User accounts
- `posts`: Blog posts
- `sessions`: Authentication sessions
- `accounts`: OAuth/credential accounts
- `verifications`: Email/password verification

### 4. Business Logic Layer (`src/lib/`)
**Responsibilities:**
- Core business logic
- Third-party service integration
- Helper utilities

**Authentication:**
- Better-Auth configuration
- Session management
- User verification helpers

### 5. Middleware Layer (`src/middleware/`)
**Responsibilities:**
- Request preprocessing
- Authentication verification
- Authorization checks

**Auth Middleware:**
- Extracts session from request
- Verifies user authentication
- Injects user context into routes
- Throws `UnauthorizedError` for unauthenticated requests

### 6. Route Layer (`src/routes/`)
**Responsibilities:**
- HTTP endpoint definitions
- Request validation
- Response formatting
- Business logic orchestration

**Route Structure:**
```typescript
Route File
├── Route definitions (GET, POST, PATCH, DELETE)
├── Request validation schemas (Zod via Elysia)
├── Business logic
├── Database operations
└── Error handling
```

## Database Strategy

### Read/Write Splitting

#### Primary Database (Port 5000)
**Used for:**
- All write operations (INSERT, UPDATE, DELETE)
- Transactions
- Operations requiring immediate consistency

**Routes using Primary:**
- POST /auth/signup
- POST /auth/login
- POST /users
- PATCH /users/:id
- DELETE /users/:id
- POST /posts
- PATCH /posts/:id
- DELETE /posts/:id

#### Replica Database (Port 5001)
**Used for:**
- All read operations (SELECT)
- List endpoints
- Detail endpoints
- Reports and analytics

**Routes using Replica:**
- GET /users
- GET /users/:id
- GET /posts
- GET /posts/:id
- GET /auth/me (session lookup)

### Connection Pooling Strategy

```typescript
Pool Configuration:
- Max connections: 20 per pool
- Idle timeout: 30 seconds
- Connection timeout: 5 seconds
```

**Benefits:**
- Reduced connection overhead
- Better resource utilization
- Improved performance under load
- Connection reuse

## Authentication Flow

### 1. Sign Up
```
Client → POST /auth/signup
  ↓
Better-Auth processes registration
  ↓
Password hashed and stored
  ↓
User record created in Primary DB
  ↓
Session created
  ↓
Response with user data and session cookie
```

### 2. Login
```
Client → POST /auth/login
  ↓
Better-Auth verifies credentials
  ↓
Password verified against hash
  ↓
Session created in Primary DB
  ↓
Session cookie sent to client
```

### 3. Protected Request
```
Client → GET /users (with session cookie)
  ↓
Auth Middleware extracts session
  ↓
Session verified against DB
  ↓
User object injected into context
  ↓
Route handler executes
  ↓
Response sent to client
```

### 4. Logout
```
Client → POST /auth/logout (with session cookie)
  ↓
Better-Auth invalidates session
  ↓
Session deleted from Primary DB
  ↓
Cookie cleared
  ↓
Success response
```

## Error Handling Strategy

### Error Types
1. **Validation Errors** (400): Invalid input data
2. **Unauthorized Errors** (401): Missing or invalid authentication
3. **Forbidden Errors** (403): Insufficient permissions
4. **Not Found Errors** (404): Resource doesn't exist
5. **Server Errors** (500): Internal server issues
6. **Service Unavailable** (503): Database connection issues

### Error Flow
```
Error occurs in route
  ↓
Route-level error handler
  ↓
Global error handler (fallback)
  ↓
Formatted error response
  ↓
Logged to console
```

### Consistent Error Response
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Error type or code"
}
```

## Security Considerations

### Authentication Security
- Passwords hashed with Better-Auth (bcrypt)
- Session tokens stored securely
- HTTP-only cookies in production
- CSRF protection via SameSite cookies

### Authorization
- Users can only modify their own resources
- Protected routes require authentication
- Owner verification for updates/deletes

### Input Validation
- Zod schemas for all inputs
- Type safety with TypeScript
- Email format validation
- String length constraints

### Database Security
- Parameterized queries (SQL injection prevention)
- Connection pooling with limits
- Separate read/write credentials (recommended)

## Performance Optimizations

### Database Level
1. **Read/Write Splitting**: Distributes load across databases
2. **Connection Pooling**: Reduces connection overhead
3. **Indexes**: Primary keys and unique constraints on email
4. **Foreign Keys**: Ensures referential integrity with CASCADE deletes

### Application Level
1. **Efficient Queries**: Select only needed columns
2. **Pagination**: Limit/offset for list endpoints
3. **Lazy Loading**: Load related data only when needed

### Caching Strategy (Recommended for Production)
- Session caching (5-minute cookie cache in Better-Auth)
- Query result caching for read-heavy operations
- Redis integration for distributed caching

## Monitoring and Observability

### Health Checks
- `/health`: Overall application health
- `/health/db`: Database connection status (both pools)

### Logging
- Request/response logging
- Error logging with stack traces
- Database connection status
- Graceful shutdown events

### Metrics (Recommended for Production)
- Request rate and latency
- Database query performance
- Error rates by type
- Connection pool utilization

## Scalability Considerations

### Horizontal Scaling
- Stateless application design
- Session storage in database (shared state)
- No in-memory state
- Load balancer friendly

### Vertical Scaling
- Efficient resource utilization
- Connection pooling
- Async operations with Bun

### Database Scaling
- Primary/Replica setup already implemented
- Can add more replicas for read scaling
- Sharding strategy can be implemented per domain

## Deployment Strategy

### Environment Variables
All configuration via `.env`:
- Database connections
- Auth secrets
- Server settings
- Feature flags

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `BETTER_AUTH_SECRET`
- [ ] Configure proper CORS origins
- [ ] Enable secure cookies
- [ ] Set up SSL/TLS
- [ ] Configure proper connection pool sizes
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up backup strategy
- [ ] Configure rate limiting

## Testing Strategy

### Unit Tests
- Database utilities
- Authentication helpers
- Validation schemas

### Integration Tests
- API endpoints
- Authentication flow
- Database operations

### Load Tests
- Concurrent user simulation
- Database connection pool limits
- Rate limiting validation

## Future Enhancements

### Recommended Additions
1. **Rate Limiting**: Prevent abuse
2. **Caching Layer**: Redis for performance
3. **API Versioning**: Support multiple versions
4. **WebSocket Support**: Real-time features
5. **File Upload**: Image/document handling
6. **Search**: Full-text search with PostgreSQL
7. **Pagination Cursor**: For large datasets
8. **API Documentation**: OpenAPI/Swagger
9. **Metrics**: Prometheus integration
10. **Tracing**: OpenTelemetry support

## Maintenance Guidelines

### Adding New Features
1. Create schema in `src/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Create route file in `src/routes/`
4. Apply middleware as needed
5. Use `dbReplica` for reads, `dbPrimary` for writes
6. Register route in `src/index.ts`
7. Update API documentation

### Database Migrations
1. Modify schema in `src/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Review generated SQL
4. Test on development database
5. Run on production: `bun run db:migrate`

### Updating Dependencies
```bash
bun update
# Review breaking changes
# Update code if needed
# Test thoroughly
```

## Conclusion

This architecture provides:
- ✅ Scalable foundation for growth
- ✅ Clean separation of concerns
- ✅ Type safety with TypeScript
- ✅ Professional error handling
- ✅ Security best practices
- ✅ Performance optimization
- ✅ Maintainable codebase
- ✅ Production-ready design
