import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { dbPrimary } from '../config/database';
import * as schema from '../db/schema';

/**
 * Better-Auth configuration with PostgreSQL session storage
 * Using Drizzle adapter for database operations
 */
export const auth = betterAuth({
  database: drizzleAdapter(dbPrimary, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  
  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production with email service
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Security settings
  advanced: {
    cookiePrefix: 'demo',
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
  },

  // Base URL for redirects and callbacks
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  
  // Secret key for encryption
  secret: process.env.BETTER_AUTH_SECRET || 'your-secret-key-change-in-production',

  // Trust proxy for production environments behind reverse proxy
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  ],
});

/**
 * Type-safe session interface
 */
export type AuthSession = typeof auth.$Infer.Session;

/**
 * Helper to verify session and get user
 */
export const verifySession = async (headers: Record<string, string | undefined>) => {
  try {
    const session = await auth.api.getSession({
      headers: headers as Record<string, string>,
    });

    if (!session) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
};

/**
 * Helper to get user from session
 */
export const getUserFromSession = async (headers: Record<string, string | undefined>) => {
  const session = await verifySession(headers);
  return session?.user ?? null;
};
