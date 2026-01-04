import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { dbPrimary, dbReplica } from '../config/database';
import { posts, users } from '../db/schema';
import { authMiddleware, UnauthorizedError } from '../middleware/auth';

/**
 * Post routes with automatic read/write routing
 * - GET operations use replica database
 * - POST, PATCH, DELETE operations use primary database
 */
export const postRoutes = new Elysia({ prefix: '/posts' })
  // Apply authentication middleware to all routes
  .derive(authMiddleware)

  /**
   * GET /posts
   * List all posts (read from replica)
   */
  .get(
    '/',
    async ({ query }) => {
      try {
        const limit = query.limit || 10;
        const offset = query.offset || 0;
        const published = query.published;

        // Read from replica database with author information
        const postQuery = dbReplica
          .select({
            id: posts.id,
            title: posts.title,
            content: posts.content,
            published: posts.published,
            authorId: posts.authorId,
            createdAt: posts.createdAt,
            updatedAt: posts.updatedAt,
            author: {
              id: users.id,
              name: users.name,
              email: users.email,
              image: users.image,
            },
          })
          .from(posts)
          .innerJoin(users, eq(posts.authorId, users.id))
          .limit(limit)
          .offset(offset);

        // Filter by published status if provided
        const postList = published !== undefined
          ? await postQuery.where(eq(posts.published, published))
          : await postQuery;

        return {
          success: true,
          data: postList,
          pagination: {
            limit,
            offset,
          },
        };
      } catch (error) {
        console.error('Error fetching posts:', error);
        return {
          success: false,
          message: 'Failed to fetch posts',
        };
      }
    },
    {
      query: t.Object({
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        offset: t.Optional(t.Number({ minimum: 0 })),
        published: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ['Posts'],
        summary: 'List all posts',
        description: 'Get paginated list of posts (uses replica database)',
      },
    }
  )

  /**
   * GET /posts/:id
   * Get post by ID (read from replica)
   */
  .get(
    '/:id',
    async ({ params, set }) => {
      try {
        // Read from replica database with author information
        const [post] = await dbReplica
          .select({
            id: posts.id,
            title: posts.title,
            content: posts.content,
            published: posts.published,
            authorId: posts.authorId,
            createdAt: posts.createdAt,
            updatedAt: posts.updatedAt,
            author: {
              id: users.id,
              name: users.name,
              email: users.email,
              image: users.image,
            },
          })
          .from(posts)
          .innerJoin(users, eq(posts.authorId, users.id))
          .where(eq(posts.id, params.id))
          .limit(1);

        if (!post) {
          set.status = 404;
          return {
            success: false,
            message: 'Post not found',
          };
        }

        return {
          success: true,
          data: post,
        };
      } catch (error) {
        console.error('Error fetching post:', error);
        set.status = 500;
        return {
          success: false,
          message: 'Failed to fetch post',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        tags: ['Posts'],
        summary: 'Get post by ID',
        description: 'Get specific post by ID (uses replica database)',
      },
    }
  )

  /**
   * POST /posts
   * Create new post (write to primary)
   */
  .post(
    '/',
    async ({ body, user, set }) => {
      try {
        // Write to primary database
        const [newPost] = await dbPrimary
          .insert(posts)
          .values({
            title: body.title,
            content: body.content,
            published: body.published || false,
            authorId: user.id,
          })
          .returning({
            id: posts.id,
            title: posts.title,
            content: posts.content,
            published: posts.published,
            authorId: posts.authorId,
            createdAt: posts.createdAt,
            updatedAt: posts.updatedAt,
          });

        set.status = 201;
        return {
          success: true,
          message: 'Post created successfully',
          data: newPost,
        };
      } catch (error) {
        console.error('Error creating post:', error);
        set.status = 400;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create post',
        };
      }
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 255 }),
        content: t.String({ minLength: 1 }),
        published: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ['Posts'],
        summary: 'Create new post',
        description: 'Create a new post (uses primary database)',
      },
    }
  )

  /**
   * PATCH /posts/:id
   * Update post by ID (write to primary)
   */
  .patch(
    '/:id',
    async ({ params, body, user, set }) => {
      try {
        // Check if post exists and user is the author
        const [existingPost] = await dbPrimary
          .select({ authorId: posts.authorId })
          .from(posts)
          .where(eq(posts.id, params.id))
          .limit(1);

        if (!existingPost) {
          set.status = 404;
          return {
            success: false,
            message: 'Post not found',
          };
        }

        if (existingPost.authorId !== user.id) {
          set.status = 403;
          return {
            success: false,
            message: 'You can only update your own posts',
          };
        }

        // Write to primary database
        const [updatedPost] = await dbPrimary
          .update(posts)
          .set({
            ...(body.title && { title: body.title }),
            ...(body.content && { content: body.content }),
            ...(body.published !== undefined && { published: body.published }),
            updatedAt: new Date(),
          })
          .where(eq(posts.id, params.id))
          .returning({
            id: posts.id,
            title: posts.title,
            content: posts.content,
            published: posts.published,
            authorId: posts.authorId,
            createdAt: posts.createdAt,
            updatedAt: posts.updatedAt,
          });

        return {
          success: true,
          message: 'Post updated successfully',
          data: updatedPost,
        };
      } catch (error) {
        console.error('Error updating post:', error);
        set.status = 400;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to update post',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
        content: t.Optional(t.String({ minLength: 1 })),
        published: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ['Posts'],
        summary: 'Update post',
        description: 'Update post information (uses primary database)',
      },
    }
  )

  /**
   * DELETE /posts/:id
   * Delete post by ID (write to primary)
   */
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      try {
        // Check if post exists and user is the author
        const [existingPost] = await dbPrimary
          .select({ authorId: posts.authorId })
          .from(posts)
          .where(eq(posts.id, params.id))
          .limit(1);

        if (!existingPost) {
          set.status = 404;
          return {
            success: false,
            message: 'Post not found',
          };
        }

        if (existingPost.authorId !== user.id) {
          set.status = 403;
          return {
            success: false,
            message: 'You can only delete your own posts',
          };
        }

        // Write to primary database
        await dbPrimary
          .delete(posts)
          .where(eq(posts.id, params.id))
          .returning({ id: posts.id });

        return {
          success: true,
          message: 'Post deleted successfully',
        };
      } catch (error) {
        console.error('Error deleting post:', error);
        set.status = 400;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to delete post',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        tags: ['Posts'],
        summary: 'Delete post',
        description: 'Delete post (uses primary database)',
      },
    }
  )

  // Error handler for post routes
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
