Required Endpoints:

Auth:

POST /auth/signup
POST /auth/login
POST /auth/logout
GET /auth/me (protected)
Users (Protected):

GET /users → Replica
GET /users/:id → Replica
POST /users → Primary
PATCH /users/:id → Primary
DELETE /users/:id → Primary
Posts (Protected):

Same CRUD pattern as Users

Key Requirements:
✅ Auto-route: Reads → Replica, Writes → Primary
✅ Transactions always use Primary pool
✅ Better-Auth with session in PostgreSQL
✅ Auth middleware for protected routes
✅ Health check endpoint: GET /health/db
✅ Graceful shutdown (close pools)
✅ TypeScript strict mode
✅ . env for config