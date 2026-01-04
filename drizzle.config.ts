import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_PRIMARY_HOST!,
    port: Number(process.env.DB_PRIMARY_PORT!),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    ssl: process.env.DB_SSL_ENABLED === 'true' ? {
      rejectUnauthorized: false, // Allow self-signed certificates
    } : false,
  },
} satisfies Config;
