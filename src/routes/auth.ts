import { Elysia, t } from 'elysia';
import { auth, getUserFromSession } from '../lib/auth';
import { UnauthorizedError } from '../middleware/auth';

/**
 * Authentication routes
 * Handles signup, login, logout, and user profile retrieval
 */
export const authRoutes = new Elysia({ prefix: '/auth' })
  /**
   * POST /auth/signup
   * Register a new user with email and password
   */
  .post(
    '/signup',
    async ({ body, request }) => {
      try {
        const response = await auth.api.signUpEmail({
          body: {
            email: body.email,
            password: body.password,
            name: body.name,
          },
          headers: request.headers as unknown as Record<string, string>,
        });

        if (!response) {
          return {
            success: false,
            message: 'Failed to create account',
          };
        }

        return {
          success: true,
          message: 'Account created successfully',
          data: response,
        };
      } catch (error) {
        console.error('Signup error:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Signup failed',
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
        name: t.String({ minLength: 2 }),
      }),
      detail: {
        tags: ['Auth'],
        summary: 'Register new user',
        description: 'Create a new user account with email and password',
      },
    }
  )

  /**
   * POST /auth/login
   * Authenticate user with email and password
   */
  .post(
    '/login',
    async ({ body, request, set }) => {
      try {
        const response = await auth.api.signInEmail({
          body: {
            email: body.email,
            password: body.password,
          },
          headers: request.headers as unknown as Record<string, string>,
        });

        if (!response) {
          set.status = 401;
          return {
            success: false,
            message: 'Invalid credentials',
          };
        }

        return {
          success: true,
          message: 'Login successful',
          data: response,
        };
      } catch (error) {
        console.error('Login error:', error);
        set.status = 401;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Login failed',
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String(),
      }),
      detail: {
        tags: ['Auth'],
        summary: 'Login user',
        description: 'Authenticate user with email and password',
      },
    }
  )

  /**
   * POST /auth/logout
   * Logout current user and invalidate session
   */
  .post(
    '/logout',
    async ({ request }) => {
      try {
        await auth.api.signOut({
          headers: request.headers as unknown as Record<string, string>,
        });

        return {
          success: true,
          message: 'Logout successful',
        };
      } catch (error) {
        console.error('Logout error:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Logout failed',
        };
      }
    },
    {
      detail: {
        tags: ['Auth'],
        summary: 'Logout user',
        description: 'Logout current user and invalidate session',
      },
    }
  )

  /**
   * GET /auth/me
   * Get current authenticated user profile
   * Protected route - requires authentication
   */
  .get(
    '/me',
    async ({ request, set }) => {
      try {
        const headers: Record<string, string | undefined> = {};
        const authHeader = request.headers.get('authorization');
        const cookieHeader = request.headers.get('cookie');
        
        if (authHeader) headers['authorization'] = authHeader;
        if (cookieHeader) headers['cookie'] = cookieHeader;

        const user = await getUserFromSession(headers);

        if (!user) {
          set.status = 401;
          return {
            success: false,
            message: 'Unauthorized',
          };
        }

        return {
          success: true,
          data: user,
        };
      } catch (error) {
        console.error('Get user error:', error);
        set.status = 401;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to get user',
        };
      }
    },
    {
      detail: {
        tags: ['Auth'],
        summary: 'Get current user',
        description: 'Get authenticated user profile information',
      },
    }
  )

  // Error handler for auth routes
  .onError(({ code, error, set }) => {
    if (error instanceof UnauthorizedError) {
      set.status = 401;
      return {
        success: false,
        message: error.message,
      };
    }

    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        success: false,
        message: 'Validation error',
        error: error.message,
      };
    }

    set.status = 500;
    return {
      success: false,
      message: 'Internal server error',
    };
  });
