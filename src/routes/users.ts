import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { dbPrimary, dbReplica } from '../config/database';
import { users } from '../db/schema';
import { authMiddleware, UnauthorizedError } from '../middleware/auth';

/**
 * User routes with automatic read/write routing
 * - GET operations use replica database
 * - POST, PATCH, DELETE operations use primary database
 */
export const userRoutes = new Elysia({ prefix: '/users' })
  // Apply authentication middleware to all routes
  .derive(authMiddleware)

  /**
   * GET /users
   * List all users (read from replica)
   */
  .get(
    '/',
    async ({ query }) => {
      try {
        const limit = query.limit || 10;
        const offset = query.offset || 0;

        // Read from replica database
        const userList = await dbReplica
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            emailVerified: users.emailVerified,
            image: users.image,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .limit(limit)
          .offset(offset);

        return {
          success: true,
          data: userList,
          pagination: {
            limit,
            offset,
          },
        };
      } catch (error) {
        console.error('Error fetching users:', error);
        return {
          success: false,
          message: 'Failed to fetch users',
        };
      }
    },
    {
      query: t.Object({
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        offset: t.Optional(t.Number({ minimum: 0 })),
      }),
      detail: {
        tags: ['Users'],
        summary: 'List all users',
        description: 'Get paginated list of users (uses replica database)',
      },
    }
  )

  /**
   * GET /users/:id
   * Get user by ID (read from replica)
   */
  .get(
    '/:id',
    async ({ params, set }) => {
      try {
        // Read from replica database
        const [user] = await dbReplica
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            emailVerified: users.emailVerified,
            image: users.image,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(eq(users.id, params.id))
          .limit(1);

        if (!user) {
          set.status = 404;
          return {
            success: false,
            message: 'User not found',
          };
        }

        return {
          success: true,
          data: user,
        };
      } catch (error) {
        console.error('Error fetching user:', error);
        set.status = 500;
        return {
          success: false,
          message: 'Failed to fetch user',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        tags: ['Users'],
        summary: 'Get user by ID',
        description: 'Get specific user by ID (uses replica database)',
      },
    }
  )

  /**
   * POST /users
   * Create new user (write to primary)
   */
  .post(
    '/',
    async ({ body, set }) => {
      try {
        // Write to primary database
        const [newUser] = await dbPrimary
          .insert(users)
          .values({
            name: body.name,
            email: body.email,
            emailVerified: body.emailVerified || false,
            image: body.image,
          })
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            emailVerified: users.emailVerified,
            image: users.image,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          });

        set.status = 201;
        return {
          success: true,
          message: 'User created successfully',
          data: newUser,
        };
      } catch (error) {
        console.error('Error creating user:', error);
        set.status = 400;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create user',
        };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 255 }),
        email: t.String({ format: 'email', maxLength: 255 }),
        emailVerified: t.Optional(t.Boolean()),
        image: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Users'],
        summary: 'Create new user',
        description: 'Create a new user (uses primary database)',
      },
    }
  )

  /**
   * PATCH /users/:id
   * Update user by ID (write to primary)
   */
  .patch(
    '/:id',
    async ({ params, body, set, user }) => {
      try {
        // Check if user is updating their own profile or has admin rights
        // For now, users can only update their own profile
        if (user.id !== params.id) {
          set.status = 403;
          return {
            success: false,
            message: 'You can only update your own profile',
          };
        }

        // Write to primary database
        const [updatedUser] = await dbPrimary
          .update(users)
          .set({
            ...(body.name && { name: body.name }),
            ...(body.image !== undefined && { image: body.image }),
            updatedAt: new Date(),
          })
          .where(eq(users.id, params.id))
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            emailVerified: users.emailVerified,
            image: users.image,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          });

        if (!updatedUser) {
          set.status = 404;
          return {
            success: false,
            message: 'User not found',
          };
        }

        return {
          success: true,
          message: 'User updated successfully',
          data: updatedUser,
        };
      } catch (error) {
        console.error('Error updating user:', error);
        set.status = 400;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to update user',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2, maxLength: 255 })),
        image: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Users'],
        summary: 'Update user',
        description: 'Update user information (uses primary database)',
      },
    }
  )

  /**
   * DELETE /users/:id
   * Delete user by ID (write to primary)
   */
  .delete(
    '/:id',
    async ({ params, set, user }) => {
      try {
        // Check if user is deleting their own account or has admin rights
        // For now, users can only delete their own account
        if (user.id !== params.id) {
          set.status = 403;
          return {
            success: false,
            message: 'You can only delete your own account',
          };
        }

        // Write to primary database
        const [deletedUser] = await dbPrimary
          .delete(users)
          .where(eq(users.id, params.id))
          .returning({ id: users.id });

        if (!deletedUser) {
          set.status = 404;
          return {
            success: false,
            message: 'User not found',
          };
        }

        return {
          success: true,
          message: 'User deleted successfully',
        };
      } catch (error) {
        console.error('Error deleting user:', error);
        set.status = 400;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to delete user',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        tags: ['Users'],
        summary: 'Delete user',
        description: 'Delete user account (uses primary database)',
      },
    }
  )

  // Error handler for user routes
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

    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        success: false,
        message: 'Route not found',
      };
    }

    set.status = 500;
    return {
      success: false,
      message: 'Internal server error',
    };
  });
