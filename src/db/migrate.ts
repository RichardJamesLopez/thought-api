import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './index.js';
import logger from '../logger.js';

migrate(db, { migrationsFolder: './drizzle' });
logger.info('Migrations complete');
