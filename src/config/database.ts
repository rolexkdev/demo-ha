import { Pool, type PoolConfig } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

/**
 * Database configuration interface
 */
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Create a PostgreSQL pool with configuration
 */
const createPool = (config: DatabaseConfig): Pool => {
  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.max ?? 20,
    idleTimeoutMillis: config.idleTimeoutMillis ?? 30000,
    connectionTimeoutMillis: config.connectionTimeoutMillis ?? 5000,
    // SSL configuration for self-signed certificates
    ssl: process.env.DB_SSL_ENABLED === 'true' ? {
      rejectUnauthorized: false, // Allow self-signed certificates
    } : false,
  };

  return new Pool(poolConfig);
};

/**
 * Primary database pool configuration (for writes)
 */
const primaryConfig: DatabaseConfig = {
  host: process.env.DB_PRIMARY_HOST || '10.100.0.20',
  port: Number(process.env.DB_PRIMARY_PORT) || 5000,
  database: process.env.DB_NAME || 'demo_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

/**
 * Replica database pool configuration (for reads)
 */
const replicaConfig: DatabaseConfig = {
  host: process.env.DB_REPLICA_HOST || '10.100.0.20',
  port: Number(process.env.DB_REPLICA_PORT) || 5001,
  database: process.env.DB_NAME || 'demo_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

// Initialize connection pools
export const primaryPool = createPool(primaryConfig);
export const replicaPool = createPool(replicaConfig);

// Initialize Drizzle instances
export const dbPrimary: NodePgDatabase<typeof schema> = drizzle(primaryPool, { schema });
export const dbReplica: NodePgDatabase<typeof schema> = drizzle(replicaPool, { schema });

/**
 * Health check for database connections
 */
export const checkDatabaseHealth = async (): Promise<{
  primary: boolean;
  replica: boolean;
}> => {
  const results = {
    primary: false,
    replica: false,
  };

  try {
    await primaryPool.query('SELECT 1');
    results.primary = true;
  } catch (error) {
    console.error('Primary database health check failed:', error);
  }

  try {
    await replicaPool.query('SELECT 1');
    results.replica = true;
  } catch (error) {
    console.error('Replica database health check failed:', error);
  }

  return results;
};

/**
 * Graceful shutdown - close all database connections
 */
export const closeDatabaseConnections = async (): Promise<void> => {
  console.log('Closing database connections...');
  
  try {
    await Promise.all([
      primaryPool.end(),
      replicaPool.end(),
    ]);
    console.log('Database connections closed successfully');
  } catch (error) {
    console.error('Error closing database connections:', error);
    throw error;
  }
};

/**
 * Get appropriate database instance based on operation type
 * @param isWrite - true for write operations, false for read operations
 */
export const getDatabase = (isWrite: boolean): NodePgDatabase<typeof schema> => {
  return isWrite ? dbPrimary : dbReplica;
};
