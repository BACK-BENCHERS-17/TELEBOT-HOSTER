// Database connection setup - CockroachDB (PostgreSQL-compatible)
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

export const db = drizzle({ client: pool, schema });
