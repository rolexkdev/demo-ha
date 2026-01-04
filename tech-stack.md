# Task: Build Elysia + Bun API with PostgreSQL HA Cluster

## Tech Stack:
- **Runtime:** Bun
- **Framework:** Elysia. js
- **Database:** PostgreSQL via HAProxy (dual connection pools)
- **ORM:** Drizzle ORM
- **Auth:** Better-Auth
- **Validation:** Zod (built-in Elysia)

## Database Connection: 
```typescript
// Primary (writes): 10.100.0.20:5000
// Replica (reads): 10.100.0.20:5001
// DB: demo_db, User: postgres

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const primaryPool = new Pool({ host: '10.100.0.20', port: 5000, ... });
const replicaPool = new Pool({ host: '10.100.0.20', port: 5001, ... });

export const dbPrimary = drizzle(primaryPool);  // For writes
export const dbReplica = drizzle(replicaPool);  // For reads

