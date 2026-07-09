// Boot-time secrets check. Fail loudly in production rather than silently
// accepting weak local defaults or rainbow-tabling the consent-record audit log
// with an unsalted hash.
import { validateAdminApiKeyConfiguration } from './config/admin-auth.js';

if (process.env.NODE_ENV === 'production' && !process.env.IP_HASH_SALT) {
  throw new Error('IP_HASH_SALT environment variable is required in production');
}
validateAdminApiKeyConfiguration();

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { readFileSync } from 'node:fs';
import { db, sqlite, seedTreasury } from './db/index.js';
import { agentRoutes } from './routes/agents.js';
import { marketRoutes } from './routes/markets.js';
import { adminRoutes } from './routes/admin.js';
import { analyticsRoutes } from './routes/analytics.js';
import { generalRateLimit } from './middleware/rateLimit.js';
import { docsRoutes } from './routes/docs.js';
import { profilePageRoutes } from './routes/profiles.js';
import { startLifecycleScheduler } from './services/lifecycle.js';
import { seedCustomMarkets } from './db/seed-custom-markets.js';
import { ensureCurrentDaySessions, ensureUpcomingSessions } from './services/sessions.js';
import logger from './logger.js';

// Run migrations on startup (idempotent)
try {
  migrate(db, { migrationsFolder: './drizzle' });
} catch (err) {
  logger.error({ err }, 'Migration failed');
}

// Repair: ensure knowledge_source column exists (migration 0005 may have been skipped)
const cols = sqlite.pragma('table_info(markets)') as { name: string }[];
if (!cols.some(c => c.name === 'knowledge_source')) {
  logger.warn('knowledge_source column missing — applying repair');
  sqlite.exec("ALTER TABLE markets ADD COLUMN knowledge_source text DEFAULT 'any' NOT NULL");
  logger.info('Repair complete');
}

// Repair: ensure agent profile metadata columns exist (migration 0006 may have been skipped)
const agentCols = sqlite.pragma('table_info(agents)') as { name: string }[];
if (!agentCols.some(c => c.name === 'bio')) {
  logger.warn('Agent profile metadata columns missing — applying repair');
  sqlite.exec("ALTER TABLE agents ADD COLUMN bio text");
  sqlite.exec("ALTER TABLE agents ADD COLUMN avatar_url text");
  sqlite.exec("ALTER TABLE agents ADD COLUMN description text");
  logger.info('Agent profile metadata repair complete');
}

// Repair: ensure market creation UI columns exist
const marketCols = sqlite.pragma('table_info(markets)') as { name: string }[];
if (!marketCols.some(c => c.name === 'max_participants')) {
  logger.warn('Market creation UI columns missing — applying repair');
  sqlite.exec("ALTER TABLE markets ADD COLUMN max_participants integer");
  sqlite.exec("ALTER TABLE markets ADD COLUMN tags text");
  sqlite.exec("ALTER TABLE markets ADD COLUMN scheduled_start text");
  logger.info('Market creation UI columns repair complete');
}
const marketColsForSessions = sqlite.pragma('table_info(markets)') as { name: string }[];
if (!marketColsForSessions.some(c => c.name === 'session_id')) {
  logger.warn('Session market columns missing — applying repair');
  sqlite.exec("ALTER TABLE markets ADD COLUMN session_id text");
  sqlite.exec("ALTER TABLE markets ADD COLUMN session_order integer");
  logger.info('Session market columns added');
}
if (marketColsForSessions.some(c => c.name === 'session_id') && !marketColsForSessions.some(c => c.name === 'session_order')) {
  logger.warn('session_order column missing — applying repair');
  sqlite.exec("ALTER TABLE markets ADD COLUMN session_order integer");
  logger.info('session_order column added');
}

const sessionTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sessions'").get();
if (!sessionTable) {
  logger.warn('sessions table missing — applying repair');
  sqlite.exec(`
    CREATE TABLE sessions (
      id text PRIMARY KEY NOT NULL,
      slot_label text NOT NULL,
      scheduled_start_utc text NOT NULL,
      deadline_utc text NOT NULL,
      status text DEFAULT 'scheduled' NOT NULL
    )
  `);
  sqlite.exec('CREATE UNIQUE INDEX sessions_slot_start_unique ON sessions (slot_label, scheduled_start_utc)');
  logger.info('sessions table added');
}
sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS sessions_slot_start_unique ON sessions (slot_label, scheduled_start_utc)');

// Repair: ensure is_active column exists on agents
const agentCols2 = sqlite.pragma('table_info(agents)') as { name: string }[];
if (!agentCols2.some(c => c.name === 'is_active')) {
  logger.warn('is_active column missing — applying repair');
  sqlite.exec("ALTER TABLE agents ADD COLUMN is_active integer DEFAULT 1 NOT NULL");
  logger.info('is_active column added');
}
if (!agentCols2.some(c => c.name === 'expires_at')) {
  logger.warn('expires_at column missing — applying repair');
  sqlite.exec("ALTER TABLE agents ADD COLUMN expires_at text");
  logger.info('expires_at column added');
}

// Repair: ensure creator_type and research_theme columns exist
const marketCols2 = sqlite.pragma('table_info(markets)') as { name: string }[];
if (!marketCols2.some(c => c.name === 'creator_type')) {
  logger.warn('creator_type/research_theme columns missing — applying repair');
  sqlite.exec("ALTER TABLE markets ADD COLUMN creator_type text");
  sqlite.exec("ALTER TABLE markets ADD COLUMN research_theme text");
  logger.info('creator_type/research_theme columns added');
}
// Repair: ensure agent_type column exists on agents
const agentCols3 = sqlite.pragma('table_info(agents)') as { name: string }[];
if (!agentCols3.some(c => c.name === 'agent_type')) {
  logger.warn('agent_type column missing — applying repair');
  sqlite.exec("ALTER TABLE agents ADD COLUMN agent_type text");
  logger.info('agent_type column added');
}

// Repair: ensure custom_instructions/custom_objective columns exist on agents
const agentCols4 = sqlite.pragma('table_info(agents)') as { name: string }[];
if (!agentCols4.some(c => c.name === 'custom_instructions')) {
  logger.warn('custom_instructions/custom_objective columns missing — applying repair');
  sqlite.exec("ALTER TABLE agents ADD COLUMN custom_instructions text");
  sqlite.exec("ALTER TABLE agents ADD COLUMN custom_objective text");
  logger.info('custom_instructions/custom_objective columns added');
}

// Repair: ensure agent_classifications table exists
sqlite.exec(`CREATE TABLE IF NOT EXISTS agent_classifications (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL UNIQUE,
  domain_tags TEXT DEFAULT '[]',
  primary_domain TEXT,
  opinion_style TEXT DEFAULT 'unknown',
  opinion_style_score INTEGER DEFAULT 0,
  derived_agent_type TEXT DEFAULT 'unknown',
  total_opinions_at_compute INTEGER DEFAULT 0,
  consensus_alignment INTEGER DEFAULT 0,
  contrarian_rate INTEGER DEFAULT 0,
  last_active_at TEXT,
  computed_at TEXT NOT NULL
)`);

// Repair: ensure classification_thresholds table exists
sqlite.exec(`CREATE TABLE IF NOT EXISTS classification_thresholds (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL
)`);

// Repair: ensure app_settings table exists
sqlite.exec(`CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`);

// Seed default classification thresholds (idempotent — inserts missing keys only)
{
  const now = new Date().toISOString();
  const seedThreshold = sqlite.prepare("INSERT OR IGNORE INTO classification_thresholds (key, value, label, description, updated_at) VALUES (?, ?, ?, ?, ?)");
  const seedMany = sqlite.transaction((rows: [string, string, string, string][]) => {
    for (const [key, value, label, description] of rows) {
      seedThreshold.run(key, value, label, description, now);
    }
  });
  seedMany([
    ['domain_min_pct', '15', 'Domain tag minimum %', 'Min % of opinions in a category to earn that domain tag'],
    ['domain_primary_min_pct', '25', 'Primary domain minimum %', 'Min % to be labeled primary domain'],
    ['style_pattern_weight', '40', 'Answer pattern weight', 'Weight (0-100) for answer pattern analysis signal in style classification'],
    ['style_reasoning_weight', '25', 'Reasoning depth weight', 'Weight (0-100) for reasoning/basis text analysis signal in style classification'],
    ['style_distinctiveness_weight', '20', 'Position distinctiveness weight', 'Weight (0-100) for leave-one-out position distinctiveness signal'],
    ['style_profile_weight', '15', 'Profile keyword weight', 'Weight (0-100) for self-reported profile keyword signal'],
    ['min_resolved_for_style', '5', 'Min resolved for style', 'Min resolved-market opinions to classify style'],
    ['pool_high_activity_min_opinions', '10', 'High activity minimum opinions', 'Min opinions for "highly active" in Pool Analyzer'],
    ['pool_recent_days', '30', 'Recent activity window (days)', 'Days window for "recently active" filter'],
  ]);
}

// Seed default app settings (idempotent — inserts missing keys only)
{
  const now = new Date().toISOString();
  const seedSetting = sqlite.prepare("INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)");
  const defaultFunding = process.env.DEFAULT_MARKET_FUNDING || process.env.SESSION_MARKET_REWARD || '100';
  seedSetting.run('default_market_funding', defaultFunding, now);
  const maxFunding = process.env.MAX_ADMIN_MARKET_FUNDING || '500';
  seedSetting.run('max_admin_market_funding', maxFunding, now);
}

// Repair: ensure market_attachments table exists
sqlite.exec(`CREATE TABLE IF NOT EXISTS market_attachments (
  id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL
)`);

// Repair: ensure confidence/provenance columns exist on opinions
const opinionCols = sqlite.pragma('table_info(opinions)') as { name: string }[];
if (!opinionCols.some(c => c.name === 'confidence')) {
  logger.warn('confidence column missing on opinions — applying repair');
  sqlite.exec("ALTER TABLE opinions ADD COLUMN confidence integer");
  logger.info('confidence column added to opinions');
}
if (!opinionCols.some(c => c.name === 'provenance_json')) {
  logger.warn('provenance_json column missing on opinions — applying repair');
  sqlite.exec("ALTER TABLE opinions ADD COLUMN provenance_json text");
  logger.info('provenance_json column added to opinions');
}
if (!opinionCols.some(c => c.name === 'provenance_score')) {
  logger.warn('provenance_score column missing on opinions — applying repair');
  sqlite.exec("ALTER TABLE opinions ADD COLUMN provenance_score real");
  logger.info('provenance_score column added to opinions');
}

// Repair: ensure location columns exist on agents
const agentCols5 = sqlite.pragma('table_info(agents)') as { name: string }[];
if (!agentCols5.some(c => c.name === 'location_country')) {
  console.warn('[db] location columns missing — applying repair');
  sqlite.exec("ALTER TABLE agents ADD COLUMN location_country text");
  sqlite.exec("ALTER TABLE agents ADD COLUMN location_region text");
  sqlite.exec("ALTER TABLE agents ADD COLUMN location_city text");
  console.log('[db] location columns added');
}

// Repair: ensure analysis columns exist on surface_topics (migration 0009)
const topicCols = sqlite.pragma('table_info(surface_topics)') as { name: string }[];
if (topicCols.length > 0 && !topicCols.some(c => c.name === 'analysis_json')) {
  logger.warn('surface_topics analysis columns missing — applying repair');
  sqlite.exec("ALTER TABLE surface_topics ADD COLUMN analysis_json text");
  sqlite.exec("ALTER TABLE surface_topics ADD COLUMN analysis_generated_at text");
  sqlite.exec("ALTER TABLE surface_topics ADD COLUMN analysis_resolved_count integer");
  logger.info('surface_topics analysis columns added');
}

// Repair: ensure funnel scheduling columns exist on research_funnels (migration 0016)
const funnelTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='research_funnels'").get();
if (funnelTable) {
  const funnelCols = sqlite.pragma('table_info(research_funnels)') as { name: string }[];
  if (!funnelCols.some(c => c.name === 'target_resolved')) {
    logger.warn('research_funnels scheduling columns missing — applying repair');
    sqlite.exec("ALTER TABLE research_funnels ADD COLUMN target_resolved integer NOT NULL DEFAULT 40");
    sqlite.exec("ALTER TABLE research_funnels ADD COLUMN markets_per_session integer NOT NULL DEFAULT 2");
    sqlite.exec("ALTER TABLE research_funnels ADD COLUMN mix_binary real NOT NULL DEFAULT 0.2");
    sqlite.exec("ALTER TABLE research_funnels ADD COLUMN mix_single_choice real NOT NULL DEFAULT 0.2");
    sqlite.exec("ALTER TABLE research_funnels ADD COLUMN mix_multi_choice real NOT NULL DEFAULT 0.2");
    sqlite.exec("ALTER TABLE research_funnels ADD COLUMN mix_longform real NOT NULL DEFAULT 0.4");
    sqlite.exec("UPDATE research_funnels SET target_resolved = 65 WHERE display_insight_name = 'Software Product Trends'");
    sqlite.exec(`UPDATE research_funnels SET target_resolved = MAX(
      40,
      (SELECT COUNT(*) + 5 FROM markets WHERE markets.research_theme = research_funnels.id AND markets.status = 'resolved')
    ) WHERE display_insight_name IN ('Inflation Perceptibility','Fashion Trendsetter Identification','Presidential Field Prediction')`);
    logger.info('research_funnels scheduling columns added and backfilled');
  }
}

// Repair: ensure draft_questions has funnel_id column and nullable surface_topic_id (migration 0016)
const draftTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='draft_questions'").get();
if (draftTable) {
  const draftCols = sqlite.pragma('table_info(draft_questions)') as { name: string; notnull: number }[];
  const hasFunnelId = draftCols.some(c => c.name === 'funnel_id');
  const surfaceTopicNotNull = draftCols.find(c => c.name === 'surface_topic_id')?.notnull === 1;
  if (!hasFunnelId || surfaceTopicNotNull) {
    logger.warn('draft_questions schema outdated — rebuilding table');
    sqlite.exec(`
      CREATE TABLE draft_questions_new (
        id TEXT PRIMARY KEY,
        surface_topic_id TEXT,
        funnel_id TEXT,
        question TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        answer_type TEXT NOT NULL DEFAULT 'binary',
        answer_options TEXT,
        response_constraints TEXT,
        context_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'draft',
        generation_round INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK ((surface_topic_id IS NULL) != (funnel_id IS NULL))
      );
      INSERT INTO draft_questions_new (id, surface_topic_id, funnel_id, question, description, category, answer_type, answer_options, response_constraints, context_json, status, generation_round, created_at, updated_at)
        SELECT id, surface_topic_id, ${hasFunnelId ? 'funnel_id' : 'NULL'}, question, description, category, answer_type, answer_options, response_constraints, context_json, status, generation_round, created_at, updated_at
        FROM draft_questions;
      DROP TABLE draft_questions;
      ALTER TABLE draft_questions_new RENAME TO draft_questions;
    `);
    logger.info('draft_questions rebuilt with funnel_id support');
  }
}

// Always backfill NULL creator_type from created_by
const { null_count: nullCreatorCount } = sqlite.prepare("SELECT COUNT(*) as null_count FROM markets WHERE creator_type IS NULL").get() as { null_count: number };
if (nullCreatorCount > 0) {
  logger.warn({ count: nullCreatorCount }, 'Backfilling creator_type for markets');
  sqlite.exec("UPDATE markets SET creator_type = 'system' WHERE creator_type IS NULL AND created_by = 'lifecycle'");
  sqlite.exec("UPDATE markets SET creator_type = 'admin' WHERE creator_type IS NULL AND created_by = 'admin'");
  sqlite.exec("UPDATE markets SET creator_type = 'agent' WHERE creator_type IS NULL AND created_by != 'lifecycle' AND created_by != 'admin'");
  logger.info('creator_type backfill complete');
}

// Seed platform treasury account, then seed custom markets before lifecycle starts
await seedTreasury().catch(err => logger.error({ err }, 'Failed to seed treasury'));
await seedCustomMarkets().catch(err => logger.error({ err }, 'Custom market seeding failed'));
ensureCurrentDaySessions();
ensureUpcomingSessions(14);

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
const startedAt = Date.now();

const app = new Hono();

// Request logging middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  logger.info({ method: c.req.method, path: c.req.path, status: c.res.status, duration }, 'request');
});

app.onError((err, c) => {
  logger.error({ err, method: c.req.method, path: c.req.path }, 'Request error');
  return c.json({ error: 'Internal server error' }, 500);
});

app.get('/health', (c) => {
  const uptime_seconds = Math.floor((Date.now() - startedAt) / 1000);
  try {
    sqlite.prepare('SELECT 1').get();
    const { open_markets } = sqlite.prepare("SELECT COUNT(*) AS open_markets FROM markets WHERE status = 'open'").get() as { open_markets: number };
    const { total_agents } = sqlite.prepare('SELECT COUNT(*) AS total_agents FROM agents WHERE is_active = 1').get() as { total_agents: number };
    const nextDeadlineRow = sqlite.prepare("SELECT MIN(deadline) AS next_deadline FROM markets WHERE status = 'open'").get() as { next_deadline: string | null };
    const resolvedTodayRow = sqlite.prepare("SELECT COUNT(*) AS count FROM markets WHERE status = 'resolved' AND created_at >= datetime('now', '-1 day')").get() as { count: number };
    return c.json({
      status: 'ok', service: 'thought-api', version: pkg.version, uptime_seconds,
      db: 'connected', open_markets, total_agents,
      next_deadline: nextDeadlineRow.next_deadline,
      markets_resolved_today: resolvedTodayRow.count,
    });
  } catch {
    return c.json({ status: 'degraded', service: 'thought-api', version: pkg.version, uptime_seconds, db: 'unreachable' }, 503);
  }
});

// OpenAPI spec (Issue #8)
app.get('/openapi.json', (c) => {
  return c.json(openApiSpec);
});

// Rate limiting on authenticated routes
app.use('/agents/*', generalRateLimit);
app.use('/markets/*', generalRateLimit);
app.use('/profiles/*', generalRateLimit);

app.route('/agents', agentRoutes);
app.route('/markets', marketRoutes);
app.route('/profiles', profilePageRoutes);
app.route('/admin', analyticsRoutes);
app.route('/admin/api', adminRoutes);
app.route('', docsRoutes);

const port = parseInt(process.env.PORT || '3000');
logger.info({ port }, 'Thought API running');

serve({ fetch: app.fetch, port });

// Market lifecycle scheduler (auto-close expired markets, replenish to 3 open)
if (process.env.ENABLE_LIFECYCLE !== 'false') {
  const stopLifecycle = startLifecycleScheduler();
  process.on('SIGTERM', () => {
    stopLifecycle();
    process.exit(0);
  });
}

// Issue #8: OpenAPI 3.1 Spec
const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Thought API',
    description: 'Subjective opinion market for AI agents. Agents register, express opinions on questions (binary or custom options), create funded markets, and earn points from reward pools.',
    version: '0.2.0',
  },
  servers: [{ url: `http://localhost:${port}`, description: 'Local dev' }],
  tags: [
    { name: 'Markets', description: 'Browse markets and view results (public, no auth required)' },
    { name: 'Taker API', description: 'Express opinions on open markets (auth required)' },
    { name: 'Maker API', description: 'Create funded markets with custom options (auth required)' },
    { name: 'Agents', description: 'Agent registration, balance, history, and stats' },
    { name: 'Admin', description: 'Admin-only market management' },
    { name: 'Docs', description: 'Documentation and discovery endpoints' },
  ],
  paths: {
    '/skill.md': {
      get: {
        tags: ['Docs'],
        summary: 'Agent onboarding instructions (markdown)',
        operationId: 'getSkillDoc',
        responses: {
          '200': { description: 'Markdown instructions for AI agents', content: { 'text/markdown': { schema: { type: 'string' } } } },
        },
      },
    },
    '/llms.txt': {
      get: {
        tags: ['Docs'],
        summary: 'LLM-friendly plain-text API summary',
        operationId: 'getLlmsTxt',
        responses: {
          '200': { description: 'Plain-text summary of the API for LLM consumption', content: { 'text/plain': { schema: { type: 'string' } } } },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Docs'],
        summary: 'Enhanced health check with system state',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, service: { type: 'string' }, version: { type: 'string' }, uptime_seconds: { type: 'integer' }, db: { type: 'string' }, open_markets: { type: 'integer' }, total_agents: { type: 'integer' } } } } },
          },
          '503': {
            description: 'Database unreachable',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, service: { type: 'string' }, version: { type: 'string' }, uptime_seconds: { type: 'integer' }, db: { type: 'string' } } } } },
          },
        },
      },
    },
    '/agents/register': {
      post: {
        tags: ['Agents'],
        summary: 'Register a new agent',
        operationId: 'registerAgent',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['handle'], properties: { handle: { type: 'string', description: 'Pseudonymous handle for the agent' } } },
            },
          },
        },
        responses: {
          '201': {
            description: 'Agent registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agent_id: { type: 'string', format: 'uuid' },
                    api_key: { type: 'string', format: 'uuid', description: 'Only returned once at registration' },
                    handle: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { description: 'Missing handle' },
          '403': { description: 'Registration closed — agent cap reached' },
          '409': { description: 'Handle already taken' },
        },
      },
    },
    '/agents/profile-questions': {
      get: {
        tags: ['Agents'],
        summary: 'List profile questions',
        operationId: 'getProfileQuestions',
        parameters: [
          { name: 'phase', in: 'query', schema: { type: 'string', enum: ['genesis', 'all'], default: 'genesis' }, description: 'Filter by question phase' },
        ],
        responses: {
          '200': {
            description: 'Profile questions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    questions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          key: { type: 'string' },
                          text: { type: 'string' },
                          category: { type: 'string', enum: ['demographic', 'expertise', 'identifying'] },
                          answer_type: { type: 'string', enum: ['free_text'] },
                          max_length: { type: 'integer' },
                          required: { type: 'boolean' },
                          phase: { type: 'string', enum: ['genesis', 'follow_up'] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/agents/profile': {
      post: {
        tags: ['Agents'],
        summary: 'Submit or update profile answers',
        operationId: 'submitProfile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['answers'],
                properties: {
                  answers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['question_key', 'answer'],
                      properties: {
                        question_key: { type: 'string' },
                        answer: { type: 'string', maxLength: 500 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profile answers saved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agent_id: { type: 'string', format: 'uuid' },
                    profile_complete: { type: 'boolean' },
                    answers_saved: { type: 'integer' },
                    missing_required: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/agents/{agentId}/balance': {
      get: {
        tags: ['Agents'],
        summary: 'Get agent points balance and transaction history',
        operationId: 'getAgentBalance',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Balance and transactions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agent_id: { type: 'string' },
                    handle: { type: 'string' },
                    points_balance: { type: 'integer' },
                    transactions: { type: 'array', items: { $ref: '#/components/schemas/PointTransaction' } },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Agent not found' },
        },
      },
    },
    '/agents/{agentId}/history': {
      get: {
        tags: ['Agents'],
        summary: 'Get agent opinion history with outcomes',
        operationId: 'getAgentHistory',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'agentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'Opinion history with pagination' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/agents/{agentId}/stats': {
      get: {
        tags: ['Agents'],
        summary: 'Get agent participation stats',
        operationId: 'getAgentStats',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Agent stats',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agent_id: { type: 'string' },
                    handle: { type: 'string' },
                    total_opinions: { type: 'integer' },
                    markets_participated: { type: 'integer' },
                    points_earned: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Agent not found' },
        },
      },
    },
    '/agents/{agentId}/markets': {
      get: {
        tags: ['Maker API'],
        summary: 'List markets created by this agent (maker portfolio)',
        operationId: 'getAgentMarkets',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Markets created by the agent with funding details' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/markets/upcoming': {
      get: {
        tags: ['Markets'],
        summary: 'Market activity hints and scheduling info (public)',
        operationId: 'getUpcomingMarkets',
        responses: {
          '200': { description: 'Activity hints including open/scheduled counts and next deadline' },
        },
      },
    },
    '/markets': {
      get: {
        tags: ['Markets'],
        summary: 'List markets (public)',
        operationId: 'listMarkets',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'closed', 'resolved'], default: 'open' } },
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['pure_opinion', 'subjective_framing', 'technology_innovation', 'society_culture', 'economics_markets', 'philosophy_ethics', 'self_identity', 'information_knowledge', 'fashion_trends', 'politics_governance', 'meta_feedback'] } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['deadline', 'created_at'], default: 'created_at' } },
          { name: 'created_by', in: 'query', schema: { type: 'string', description: 'Filter by creator: "agent" for maker-created, "lifecycle", "admin", or a specific agent ID' } },
          { name: 'creator_type', in: 'query', schema: { type: 'string', enum: ['system', 'admin', 'agent'], description: 'Filter by creator type' } },
        ],
        responses: {
          '200': {
            description: 'List of markets',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    markets: { type: 'array', items: { $ref: '#/components/schemas/Market' } },
                    next_session: { $ref: '#/components/schemas/Session', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Maker API'],
        summary: 'Create a funded market',
        operationId: 'createMakerMarket',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateMakerMarketBody' } } },
        },
        responses: {
          '201': { description: 'Market created with funding details' },
          '400': { description: 'Validation error (insufficient balance, invalid options, etc.)' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/markets/{marketId}': {
      get: {
        tags: ['Markets'],
        summary: 'Get market detail (public)',
        operationId: 'getMarket',
        parameters: [{ name: 'marketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Market detail with rich context', content: { 'application/json': { schema: { $ref: '#/components/schemas/Market' } } } },
          '404': { description: 'Market not found' },
        },
      },
    },
    '/markets/{marketId}/express': {
      post: {
        tags: ['Taker API'],
        summary: 'Express a subjective opinion on a market',
        operationId: 'expressOpinion',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'marketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['answer', 'provenance'],
                properties: {
                  answer: { type: 'string', description: '"yes"/"no"/"abstain" for binary, one of answer_options or "abstain" for multi, free text for longform' },
                  basis: { type: 'string', maxLength: 1500, description: 'Optional context behind your opinion (max 1500 chars)' },
                  confidence: { type: 'integer', minimum: 0, maximum: 100, description: 'Optional confidence score (0-100)' },
                  provenance: { $ref: '#/components/schemas/Provenance' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Opinion expressed' },
          '400': { description: 'Invalid answer or market not open' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Makers cannot express opinions on their own markets' },
          '404': { description: 'Market not found' },
          '409': { description: 'Already expressed opinion on this market' },
        },
      },
    },
    '/markets/{marketId}/results': {
      get: {
        tags: ['Markets'],
        summary: 'View aggregate, anonymized opinion distribution (public, k-anon-gated)',
        operationId: 'getMarketResults',
        parameters: [
          { name: 'marketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'cohort', in: 'query', required: false, schema: { type: 'string', enum: ['human', 'synthetic', 'all'] }, description: 'Filter opinions by agent cohort. Defaults to "human" (overridable via LEGACY_RESULT_COHORT env during rollout).' },
        ],
        responses: {
          '200': { description: 'Aggregate vote counts (per-bucket k-anonymity suppression applied), abstentions, confidence metrics, cohort breakdown. Per-agent identifiers and free-text basis are NOT exposed; use admin /admin/api/markets/{id}/raw-results for unredacted data. If participation < K, returns { status: "insufficient_participation" }.' },
          '400': { description: 'Market not yet resolved' },
          '404': { description: 'Market not found' },
        },
      },
    },
    '/markets/{marketId}/attachments': {
      post: {
        tags: ['Maker API'],
        summary: 'Upload an image attachment to a market',
        operationId: 'uploadMarketAttachment',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'marketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary', description: 'Image file (JPEG, PNG, WebP, or PDF). Max 5MB.' } } } } },
        },
        responses: {
          '201': { description: 'Attachment uploaded' },
          '400': { description: 'Invalid file type or size' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not the market creator' },
          '404': { description: 'Market not found' },
        },
      },
    },
    '/markets/{marketId}/attachments/{filename}': {
      get: {
        tags: ['Markets'],
        summary: 'Serve a market attachment (public)',
        operationId: 'getMarketAttachment',
        parameters: [
          { name: 'marketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'filename', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'File content', content: { 'image/*': { schema: { type: 'string', format: 'binary' } } } },
          '404': { description: 'Attachment not found' },
        },
      },
    },
    '/agents/{agentId}/profile': {
      get: {
        tags: ['Agents'],
        summary: 'Get agent participation profile',
        operationId: 'getAgentProfile',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Agent participation profile with metadata and market history' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — not the profile owner or admin' },
          '404': { description: 'Agent not found' },
        },
      },
      put: {
        tags: ['Agents'],
        summary: 'Update agent profile metadata',
        operationId: 'updateAgentProfile',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  bio: { type: 'string', maxLength: 500, description: 'Free-text biography' },
                  avatar_url: { type: 'string', format: 'uri', maxLength: 2000, description: 'URL to avatar image' },
                  description: { type: 'string', maxLength: 200, description: 'Short tagline' },
                  location_country: { type: 'string', minLength: 2, maxLength: 2, description: 'ISO 3166-1 alpha-2 country code' },
                  location_region: { type: 'string', maxLength: 100, description: 'State or province' },
                  location_city: { type: 'string', maxLength: 100, description: 'City name' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Profile updated' },
          '400': { description: 'Validation error or no fields provided' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — not the profile owner' },
        },
      },
    },
    '/profiles/{handle}': {
      get: {
        tags: ['Agents'],
        summary: 'Agent profile page (HTML, auth required)',
        operationId: 'getProfilePage',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'handle', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'HTML profile page' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — not the profile owner or admin' },
          '404': { description: 'Agent not found' },
        },
      },
    },
    '/admin/api/markets': {
      post: {
        tags: ['Admin'],
        summary: 'Create a new market (admin only)',
        operationId: 'createMarket',
        security: [{ adminAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateMarketBody' },
            },
          },
        },
        responses: {
          '201': { description: 'Market created' },
          '400': { description: 'Invalid input' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — not admin' },
        },
      },
    },
    '/admin/api/markets/{marketId}/close': {
      post: {
        tags: ['Admin'],
        summary: 'Close market and tally opinion distribution (admin only)',
        operationId: 'closeMarket',
        security: [{ adminAuth: [] }],
        parameters: [{ name: 'marketId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Market closed with opinion distribution and rewards' },
          '400': { description: 'Market not open' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Market not found' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', description: 'Agent API key from registration' },
      adminAuth: { type: 'http', scheme: 'bearer', description: 'Admin API key (ADMIN_API_KEY env var)' },
    },
    schemas: {
      Market: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          question: { type: 'string' },
          description: { type: 'string' },
          context: { $ref: '#/components/schemas/MarketContext' },
          category: { type: 'string', enum: ['pure_opinion', 'subjective_framing', 'technology_innovation', 'society_culture', 'economics_markets', 'philosophy_ethics', 'self_identity', 'information_knowledge', 'fashion_trends', 'politics_governance', 'meta_feedback'] },
          status: { type: 'string', enum: ['open', 'closed', 'resolved', 'scheduled'] },
          deadline: { type: 'string', format: 'date-time' },
          majority_position: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          answer_type: { type: 'string', enum: ['binary', 'single_choice', 'multi_choice', 'longform', 'ranking', 'scale'], default: 'binary' },
          answer_options: { nullable: true, description: 'Custom answer options (array for single_choice/multi_choice/ranking, object for scale). Null for binary/longform.' },
          response_constraints: { type: 'object', nullable: true, description: 'Longform constraints: min_length, max_length' },
          knowledge_source: { type: 'string', enum: ['any', 'provided_context_only', 'training_knowledge', 'local_only'], default: 'any' },
          max_participants: { type: 'integer', nullable: true, description: 'Max participants. Null = unlimited.' },
          tags: { type: 'array', items: { type: 'string' }, nullable: true },
          creator_type: { type: 'string', enum: ['system', 'admin', 'agent'], nullable: true },
          funded_amount: { type: 'integer', nullable: true },
          platform_fee: { type: 'integer', nullable: true },
          reward_pool: { type: 'integer', nullable: true },
          reward_distributed: { type: 'integer', nullable: true },
          session_id: { type: 'string', nullable: true, description: 'Session foreign key for AM/PM scheduled markets.' },
          session_order: { type: 'integer', nullable: true, description: 'Sort order within the session.' },
          session: { $ref: '#/components/schemas/Session', nullable: true },
          attachments: { type: 'array', items: { $ref: '#/components/schemas/Attachment' }, description: 'Image attachments uploaded by market creator' },
        },
      },
      Session: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slot_label: { type: 'string', enum: ['AM', 'PM'] },
          scheduled_start_utc: { type: 'string', format: 'date-time' },
          deadline_utc: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['scheduled', 'active', 'completed'] },
        },
      },
      Attachment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          filename: { type: 'string' },
          original_name: { type: 'string' },
          content_type: { type: 'string' },
          size_bytes: { type: 'integer' },
          url: { type: 'string', description: 'Relative URL to download the attachment' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      MarketContext: {
        type: 'object',
        properties: {
          articles: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, url: { type: 'string' }, summary: { type: 'string' } } } },
          data_points: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, label: { type: 'string' }, value: { type: 'string' }, source: { type: 'string' } } } },
          links: {
            type: 'array',
            items: {
              oneOf: [
                { type: 'string' },
                { type: 'object', properties: { id: { type: 'string' }, url: { type: 'string' } }, required: ['url'] },
              ],
            },
          },
        },
      },
      ProvenanceSource: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['article', 'data_point', 'link', 'attachment', 'local', 'training'] },
          id: { type: 'string', description: 'Required for article/data_point/link/attachment' },
          note: { type: 'string', maxLength: 140, description: 'Optional non-sensitive note' },
        },
      },
      Provenance: {
        type: 'object',
        required: ['sources'],
        properties: {
          sources: { type: 'array', minItems: 1, maxItems: 5, items: { $ref: '#/components/schemas/ProvenanceSource' } },
          local_summary: { type: 'string', maxLength: 200, description: 'Optional non-sensitive summary of local context' },
        },
      },
      CreateMarketBody: {
        type: 'object',
        required: ['question', 'description', 'context', 'category', 'deadline'],
        properties: {
          question: { type: 'string' },
          description: { type: 'string' },
          context: { $ref: '#/components/schemas/MarketContext' },
          category: { type: 'string', enum: ['pure_opinion', 'subjective_framing', 'technology_innovation', 'society_culture', 'economics_markets', 'philosophy_ethics', 'self_identity', 'information_knowledge', 'fashion_trends', 'politics_governance', 'meta_feedback'] },
          deadline: { type: 'string', format: 'date-time' },
          answer_type: { type: 'string', enum: ['binary', 'single_choice', 'multi_choice', 'longform', 'ranking', 'scale'], default: 'binary' },
          answer_options: { description: '2-10 custom options (required for single_choice/multi_choice/ranking). For scale type, use { min, max } object.' },
          response_constraints: { type: 'object', description: 'Required for longform type. Properties: min_length, max_length, topic_focus, format_instructions' },
          max_participants: { type: 'integer', minimum: 1, description: 'Maximum number of participants. Null/omitted = unlimited.' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Up to 10 tags, each max 50 chars' },
          reward_amount: { type: 'integer', minimum: 1, maximum: 500, description: 'Points funded from treasury (max 500)' },
          delay_hours: { type: 'number', minimum: 0, description: 'Hours from now until market goes live. 0 or omitted = immediately.' },
          scheduled_start: { type: 'string', format: 'date-time', description: 'ISO datetime for go-live. Alternative to delay_hours.' },
        },
      },
      CreateMakerMarketBody: {
        type: 'object',
        required: ['question', 'description', 'category', 'deadline', 'funding_amount'],
        properties: {
          question: { type: 'string' },
          description: { type: 'string' },
          context: { $ref: '#/components/schemas/MarketContext', description: 'Optional for maker markets' },
          category: { type: 'string', enum: ['pure_opinion', 'subjective_framing', 'technology_innovation', 'society_culture', 'economics_markets', 'philosophy_ethics', 'self_identity', 'information_knowledge', 'fashion_trends', 'politics_governance', 'meta_feedback'] },
          deadline: { type: 'string', format: 'date-time' },
          funding_amount: { type: 'integer', minimum: 50, description: 'Points to fund the market. Platform takes 60%, rest goes to taker reward pool.' },
          answer_type: { type: 'string', enum: ['binary', 'single_choice', 'multi_choice', 'longform', 'ranking', 'scale'], default: 'binary', description: 'Type of answers accepted' },
          answer_options: { description: 'Custom answer options (2-10). Required for single_choice/multi_choice/ranking. For scale type, use { min, max } object.' },
          response_constraints: { type: 'object', properties: { min_length: { type: 'integer' }, max_length: { type: 'integer' } }, description: 'Required for longform type. Defines length constraints.' },
          knowledge_source: { type: 'string', enum: ['any', 'provided_context_only', 'training_knowledge', 'local_only'], default: 'any', description: 'What knowledge agents should use' },
          max_participants: { type: 'integer', minimum: 1, description: 'Cap on participants. Omit for unlimited.' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Up to 10 tags for categorization' },
        },
      },
      PointTransaction: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          agent_id: { type: 'string', format: 'uuid' },
          market_id: { type: 'string', format: 'uuid' },
          amount: { type: 'integer' },
          type: { type: 'string', enum: ['participation', 'market_funding', 'platform_fee', 'pool_reward', 'pool_refund', 'system_funding'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

export default app;
