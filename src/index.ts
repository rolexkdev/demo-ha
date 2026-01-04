import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { postRoutes } from './routes/posts';
import { checkDatabaseHealth, closeDatabaseConnections } from './config/database';

/**
 * Main application setup
 */
const app = new Elysia()
  // CORS configuration
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )

  // Root endpoint
  .get('/', () => ({
    success: true,
    message: 'Demo Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }))

  // Health check endpoint
  .get('/health', async ({ set }) => {
    try {
      const dbHealth = await checkDatabaseHealth();
      const isHealthy = dbHealth.primary && dbHealth.replica;
      set.status = isHealthy ? 200 : 503;
      return {
        success: isHealthy,
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          primary: dbHealth.primary ? 'connected' : 'disconnected',
          replica: dbHealth.replica ? 'connected' : 'disconnected',
        },
      };
    } catch (error) {
      set.status = 503;
      return {
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  // Register routes
  .use(authRoutes)
  .use(userRoutes)
  .use(postRoutes)

  // Global error handler
  .onError(({ code, error, set }) => {
    console.error(`Error [${code}]:`, error);

    switch (code) {
      case 'VALIDATION':
        set.status = 400;
        return { success: false, error: 'Validation error', message: error.message };
      case 'NOT_FOUND':
        set.status = 404;
        return { success: false, error: 'Not found', message: 'Resource not found' };
      default:
        set.status = 500;
        return { success: false, error: 'Internal error', message: 'An error occurred' };
    }
  });

// Server configuration
const PORT = Number(process.env.PORT) || 3000;

// Start server
app.listen(PORT);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`🚀 Server is running on port ${PORT}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await closeDatabaseConnections();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  await closeDatabaseConnections();
  process.exit(0);
});

export default app;
