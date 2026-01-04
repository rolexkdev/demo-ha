import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { postRoutes } from './routes/posts';
import { checkDatabaseHealth, closeDatabaseConnections } from './config/database';

/**
 * Main application setup
 * Configures Elysia server with routes, middleware, and error handling
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

  // Request logging middleware
  .onRequest(({ request }) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${request.method} ${request.url}`);
  })

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

  // Database health check endpoint
  .get('/health/db', async ({ set }) => {
    try {
      const dbHealth = await checkDatabaseHealth();
      const isHealthy = dbHealth.primary && dbHealth.replica;

      set.status = isHealthy ? 200 : 503;

      return {
        success: isHealthy,
        primary: {
          status: dbHealth.primary ? 'connected' : 'disconnected',
          healthy: dbHealth.primary,
        },
        replica: {
          status: dbHealth.replica ? 'connected' : 'disconnected',
          healthy: dbHealth.replica,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      set.status = 503;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
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

    // Handle specific error codes
    switch (code) {
      case 'VALIDATION':
        set.status = 400;
        return {
          success: false,
          error: 'Validation error',
          message: error.message,
        };

      case 'NOT_FOUND':
        set.status = 404;
        return {
          success: false,
          error: 'Not found',
          message: 'The requested resource was not found',
        };

      case 'PARSE':
        set.status = 400;
        return {
          success: false,
          error: 'Parse error',
          message: 'Invalid request format',
        };

      case 'INTERNAL_SERVER_ERROR':
        set.status = 500;
        return {
          success: false,
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'production' 
            ? 'An error occurred' 
            : error.message,
        };

      default:
        set.status = 500;
        return {
          success: false,
          error: 'Unknown error',
          message: process.env.NODE_ENV === 'production'
            ? 'An error occurred'
            : error instanceof Error ? error.message : 'Unknown error',
        };
    }
  })

  // After response hook for logging
  .onAfterResponse(({ request, set }) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${request.method} ${request.url} - ${set.status}`);
  });

// Server configuration
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// Start server - bind to 127.0.0.1 only to avoid dual-stack issues
const server = app.listen({
  port: PORT,
  hostname: HOST,
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`🚀 Server is running`);
console.log(`📍 URL:      http://${HOST}:${PORT}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

/**
 * Graceful shutdown handler
 * Closes database connections before process exit
 */
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close database connections
    await closeDatabaseConnections();

    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors - only log, don't shutdown to avoid port conflicts
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't call gracefulShutdown here as it can cause port conflicts
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't call gracefulShutdown here as it can cause port conflicts
});

export default app;
