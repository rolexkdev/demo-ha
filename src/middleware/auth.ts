import type { Context } from 'elysia';
import { getUserFromSession } from '../lib/auth';

/**
 * Custom error for unauthorized access
 */
export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Authentication middleware for protected routes
 * Verifies session and attaches user to context
 */
export const authMiddleware = async (context: Context) => {
  const headers: Record<string, string | undefined> = {};
  
  // Extract headers from request
  const authHeader = context.request.headers.get('authorization');
  const cookieHeader = context.request.headers.get('cookie');
  
  if (authHeader) {
    headers['authorization'] = authHeader;
  }
  
  if (cookieHeader) {
    headers['cookie'] = cookieHeader;
  }

  // Verify session and get user
  const user = await getUserFromSession(headers);

  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }

  // Attach user to context for route handlers
  return {
    user,
  };
};

/**
 * Type for authenticated context
 */
export interface AuthContext {
  user: NonNullable<Awaited<ReturnType<typeof getUserFromSession>>>;
}

/**
 * Helper to check if user is authenticated
 */
export const isAuthenticated = (context: Context): context is Context & AuthContext => {
  return 'user' in context && context.user !== null;
};
