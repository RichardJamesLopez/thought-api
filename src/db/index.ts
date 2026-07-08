import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { eq } from 'drizzle-orm';
import * as schema from './schema.js';
import { PLATFORM_TREASURY_ID, PLATFORM_TREASURY_HANDLE } from '../types.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import logger from '../logger.js';
import { INSTANCE_ID } from '../runtime.js';

export const DB_PATH = process.env.DB_PATH || './thought.db';
mkdirSync(dirname(DB_PATH), { recursive: true });
export const sqlite: DatabaseType = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

if (process.env.NODE_ENV === 'production' && DB_PATH === './thought.db') {
  logger.warn({ instanceId: INSTANCE_ID, dbPath: DB_PATH }, 'Using local SQLite in production; multiple instances will drift');
}

export async function seedTreasury() {
  const existing = await db.select().from(schema.agents).where(eq(schema.agents.id, PLATFORM_TREASURY_ID));
  if (existing.length === 0) {
    const dummyKeyHash = await bcrypt.hash(randomUUID(), 10);
    await db.insert(schema.agents).values({
      id: PLATFORM_TREASURY_ID,
      handle: PLATFORM_TREASURY_HANDLE,
      api_key_hash: dummyKeyHash,
      points_balance: 0,
      created_at: new Date().toISOString(),
    });
    logger.info('Platform treasury account created');
  }
}
