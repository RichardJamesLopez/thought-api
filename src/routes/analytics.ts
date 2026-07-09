import { Hono } from 'hono';
import { adminAuthMiddleware } from '../middleware/auth.js';
import { isAdminApiKey } from '../config/admin-auth.js';
import { hasValidAdminSession, setAdminSessionCookie } from '../middleware/admin-session.js';
import { renderDashboard, renderLoginPage, renderMarketDetail, renderFunnelDetail, renderSurfaceTopicsPage, renderMarketsPage } from '../views/dashboard.js';
import { renderMarketCreator } from '../views/market-creator.js';
import { renderSchedulePage } from '../views/schedule.js';
import { renderTopicCreator } from '../views/topic-creator.js';
import { renderTopicDetail } from '../views/topic-detail.js';
import { renderDirectoryPage } from '../views/agent-directory.js';
import { renderAgentDetailPage } from '../views/agent-detail-admin.js';
import { renderPoolAnalyzerPage } from '../views/pool-analyzer.js';
import { renderCohortAnalyzerPage } from '../views/cohort-analyzer.js';
import { renderClassificationSettings } from '../views/classification-settings.js';
import { renderLongformQueuePage } from '../views/longform-queue.js';
import * as analyticsService from '../services/analytics.js';
import * as classificationService from '../services/classification.js';
import { generateCohortComparison, type CohortComparisonRequest } from '../services/cohort-comparison.js';
import { generateCohortReport, type CohortReportRequest } from '../services/cohort-report.js';
import { renderMemoMarkdown, renderAppendixMarkdown, renderMemoHtml, renderAppendixHtml } from '../services/cohort-report-render.js';
import { DB_PATH, db, sqlite } from '../db/index.js';
import { INSTANCE_ID } from '../runtime.js';
import { surfaceTopics, draftQuestions, markets, pointTransactions, agents } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { generateDraftQuestions } from '../services/topic-generator.js';
import { getTopicAnalysis, generateTopicAnalysis } from '../services/topic-analysis.js';
import { getFunnelAnalysis, generateFunnelAnalysis } from '../services/funnel-analysis.js';
import { randomUUID } from 'crypto';
import {
  getAllFunnels,
  getFunnelById,
  createFunnel,
  updateFunnel,
  archiveFunnel,
  FunnelValidationError,
} from '../services/funnels.js';
import { renderStudiesLandingPage, renderFunnelsOverviewPage, renderFunnelsManagePage } from '../views/dashboard.js';
import { renderFunnelCreator } from '../views/funnel-creator.js';
import { renderFunnelEditor } from '../views/funnel-editor.js';
import {
  createScheduledMarketValues,
  ensureUpcomingSessions,
  getMarketTemplatesForScheduling,
  getSessionById,
  getSessionsWithMarkets,
  nextSessionOrder,
  planNextFourWeeks,
  reorderSessionMarkets,
} from '../services/sessions.js';
import { PLATFORM_TREASURY_ID, VALID_CATEGORIES } from '../types.js';
import { EMPTY_MARKET_CONTEXT, normalizeContextForStorage } from '../services/context.js';
import { getDefaultMarketFunding, getMaxAdminMarketFunding, safeJsonParse } from '../utils.js';
import logger from '../logger.js';

export const analyticsRoutes = new Hono();

// Dashboard HTML page — cookie-based auth for browser access
analyticsRoutes.get('/dashboard', (c) => {
  if (!hasValidAdminSession(c)) {
    return c.html(renderLoginPage());
  }

  return c.html(renderDashboard());
});

// POST login — sets cookie and redirects, key never appears in URL
analyticsRoutes.post('/dashboard', async (c) => {
  const body = await c.req.parseBody();
  const key = typeof body['key'] === 'string' ? body['key'] : '';

  if (!isAdminApiKey(key)) {
    return c.html(renderLoginPage('Invalid admin key'), 401);
  }

  setAdminSessionCookie(c);

  return c.redirect('/admin/dashboard', 303);
});

// Longform PII review queue (admin)
analyticsRoutes.get('/longform-queue', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderLongformQueuePage());
});

// Surface-Topics standalone page — cookie-based auth
analyticsRoutes.get('/surface-topics', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderSurfaceTopicsPage());
});

// Studies tab — chooser between Research Funnels and Surface Topics
analyticsRoutes.get('/studies', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderStudiesLandingPage());
});

// Research Funnels analytics overview (with Manage Funnels button)
analyticsRoutes.get('/funnels', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderFunnelsOverviewPage());
});

// Funnel CRUD list page — admin-style
analyticsRoutes.get('/funnels/manage', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderFunnelsManagePage());
});

// Funnel creator form
analyticsRoutes.get('/funnels/manage/new', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderFunnelCreator());
});

// Funnel editor form
analyticsRoutes.get('/funnels/manage/:id', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderFunnelEditor(c.req.param('id')));
});

// Surface Topic creator page — cookie-based auth
analyticsRoutes.get('/surface-topics/new', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderTopicCreator());
});

// Surface Topic detail/management page — cookie-based auth
analyticsRoutes.get('/surface-topics/:id', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderTopicDetail(c.req.param('id')));
});

// Agent Directory page — cookie-based auth
analyticsRoutes.get('/directory', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderDirectoryPage());
});

// Redirect old leaderboard URL to directory
analyticsRoutes.get('/leaderboard', (c) => {
  return c.redirect('/admin/directory', 302);
});

// Agent Detail page — cookie-based auth
analyticsRoutes.get('/agent/:id', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderAgentDetailPage(c.req.param('id')));
});

// Pool Analyzer page — cookie-based auth
analyticsRoutes.get('/pool-analyzer', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderPoolAnalyzerPage());
});

// Cohort Analyzer page — cookie-based auth
analyticsRoutes.get('/cohort-analyzer', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderCohortAnalyzerPage());
});

// ── Cohort Report endpoints (powering Cohort Analyzer's report features) ──
// These extend Cohort Analyzer with a quick-load-by-batch shortcut, a full
// structured report (treatment fingerprint, provenance, stat tests, outliers,
// headline), and downloadable memo + appendix Markdown / JSON.

// Discovery: scan agent handles and return detected batches with their cohort labels.
analyticsRoutes.get('/cohort-analyzer/batches', async (c) => {
  const { listBatches } = await import('../services/cohort-report.js');
  const batches = await listBatches();
  return c.json({ batches });
});

// Quick-load: resolve agents by handle regex {batch}-{LABEL}\d+
analyticsRoutes.post('/cohort-analyzer/resolve-batch', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { batch_tag?: string; cohort_labels?: string[] };
  if (!body.batch_tag || typeof body.batch_tag !== 'string') return c.json({ error: 'batch_tag required' }, 400);
  if (!Array.isArray(body.cohort_labels) || body.cohort_labels.length < 2) return c.json({ error: 'cohort_labels[] required (≥ 2)' }, 400);
  const { resolveCohorts } = await import('../services/cohort-report.js');
  const resolved = await resolveCohorts(body.batch_tag, body.cohort_labels);
  return c.json({ resolved_cohorts: resolved });
});

// Full report (existing comparison + treatment + provenance + stats + outliers + headline)
analyticsRoutes.post('/cohort-analyzer/full-report', async (c) => {
  const body = await c.req.json().catch(() => ({})) as {
    batch_tag?: string;
    cohort_labels?: string[];
    cohorts?: Array<{ label: string; agent_ids: string[] }>;
    researcher_intent?: string;
  };
  let req: CohortReportRequest;
  if (body.batch_tag && Array.isArray(body.cohort_labels)) {
    req = { batch_tag: body.batch_tag, cohort_labels: body.cohort_labels, researcher_intent: body.researcher_intent };
  } else if (Array.isArray(body.cohorts) && body.cohorts.length >= 2) {
    // Ad-hoc: synthesize a batch_tag and labels from explicit cohorts. resolveCohorts
    // won't be hit (the service short-circuits when handle pattern matches nothing);
    // we feed agent_ids directly via cohort-comparison instead.
    const { generateCohortReportFromExplicitCohorts } = await import('../services/cohort-report.js');
    const report = await generateCohortReportFromExplicitCohorts({
      cohorts: body.cohorts,
      researcher_intent: body.researcher_intent,
    });
    return c.json(report);
  } else {
    return c.json({ error: 'provide either {batch_tag, cohort_labels} or {cohorts:[{label, agent_ids}]}' }, 400);
  }
  const report = await generateCohortReport(req);
  return c.json(report);
});

// Export: returns the rendered artifact as a download.
// Formats:
//   - 'memo' | 'appendix' → markdown download
//   - 'memo-pdf' | 'appendix-pdf' → print-styled HTML (client opens in new tab, auto window.print())
//   - 'json' → raw report JSON
analyticsRoutes.post('/cohort-analyzer/export', async (c) => {
  const body = await c.req.json().catch(() => ({})) as {
    batch_tag?: string;
    cohort_labels?: string[];
    cohorts?: Array<{ label: string; agent_ids: string[] }>;
    format: 'memo' | 'appendix' | 'memo-pdf' | 'appendix-pdf' | 'json';
  };
  const validFormats = ['memo', 'appendix', 'memo-pdf', 'appendix-pdf', 'json'];
  if (!body.format || !validFormats.includes(body.format)) {
    return c.json({ error: `format must be one of: ${validFormats.join(', ')}` }, 400);
  }

  let report;
  if (body.batch_tag && Array.isArray(body.cohort_labels)) {
    report = await generateCohortReport({
      batch_tag: body.batch_tag,
      cohort_labels: body.cohort_labels,
    });
  } else if (Array.isArray(body.cohorts) && body.cohorts.length >= 2) {
    const { generateCohortReportFromExplicitCohorts } = await import('../services/cohort-report.js');
    report = await generateCohortReportFromExplicitCohorts({
      cohorts: body.cohorts,
    });
  } else {
    return c.json({ error: 'provide either {batch_tag, cohort_labels} or {cohorts:[{label, agent_ids}]}' }, 400);
  }

  const baseName = body.batch_tag || 'cohort-report';
  if (body.format === 'json') {
    return new Response(JSON.stringify(report, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}-report.json"`,
      },
    });
  }
  if (body.format === 'memo') {
    return new Response(renderMemoMarkdown(report), {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}-memo.md"`,
      },
    });
  }
  if (body.format === 'appendix') {
    return new Response(renderAppendixMarkdown(report), {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}-appendix.md"`,
      },
    });
  }
  if (body.format === 'memo-pdf') {
    return new Response(renderMemoHtml(report), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
  return new Response(renderAppendixHtml(report), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});

// Markets standalone page — cookie-based auth
analyticsRoutes.get('/markets', (c) => {
  if (!hasValidAdminSession(c)) return c.redirect('/admin/dashboard', 303);
  return c.html(renderMarketsPage());
});

// Market creator HTML page — cookie-based auth
analyticsRoutes.get('/markets/new', (c) => {
  if (!hasValidAdminSession(c)) {
    return c.redirect('/admin/dashboard', 303);
  }

  return c.html(renderMarketCreator());
});

// Schedule planning page — cookie-based auth
analyticsRoutes.get('/schedule', (c) => {
  if (!hasValidAdminSession(c)) {
    return c.redirect('/admin/dashboard', 303);
  }

  return c.html(renderSchedulePage());
});

// Funnel detail HTML page — cookie-based auth
analyticsRoutes.get('/funnel/:funnelId', (c) => {
  if (!hasValidAdminSession(c)) {
    return c.redirect('/admin/dashboard', 303);
  }

  return c.html(renderFunnelDetail(c.req.param('funnelId')));
});

// Classification Settings — cookie-based auth
analyticsRoutes.get('/settings/classifications', (c) => {
  if (!hasValidAdminSession(c)) {
    return c.redirect('/admin/dashboard', 303);
  }

  return c.html(renderClassificationSettings());
});

// Market detail HTML page — cookie-based auth
analyticsRoutes.get('/market/:id', (c) => {
  if (!hasValidAdminSession(c)) {
    return c.redirect('/admin/dashboard', 303);
  }

  return c.html(renderMarketDetail(c.req.param('id')));
});

// JSON API endpoints — standard admin Bearer auth
analyticsRoutes.use('/analytics/*', adminAuthMiddleware);

analyticsRoutes.get('/analytics/overview', (c) => {
  return c.json(analyticsService.getOverview());
});

// GET /admin/analytics/pending-markets - list markets pending review
analyticsRoutes.get('/analytics/pending-markets', async (c) => {
  const pending = await db.select().from(markets).where(eq(markets.status, 'pending_review'));
  return c.json({
    count: pending.length,
    markets: pending.map(m => ({
      id: m.id,
      question: m.question,
      description: m.description,
      category: m.category,
      created_by: m.created_by,
      creator_type: m.creator_type,
      created_at: m.created_at,
      deadline: m.deadline,
      funded_amount: m.funded_amount,
      answer_type: m.answer_type,
    })),
  });
});

analyticsRoutes.get('/analytics/agents', (c) => {
  const sort = c.req.query('sort') || 'points';
  const limit = parseInt(c.req.query('limit') || '1000');
  return c.json(analyticsService.getAgentAnalytics(sort, limit));
});

analyticsRoutes.patch('/analytics/agents/:agentId/type', async (c) => {
  const agentId = c.req.param('agentId');
  const body = await c.req.json();
  const validTypes = ['human', 'e2e', 'system'];
  const agentType = body.agent_type;

  if (agentType !== null && !validTypes.includes(agentType)) {
    return c.json({ error: `Invalid agent_type. Must be one of: ${validTypes.join(', ')}, or null to clear.` }, 400);
  }

  const agent = sqlite.prepare('SELECT id FROM agents WHERE id = ?').get(agentId) as any;
  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  sqlite.prepare('UPDATE agents SET agent_type = ? WHERE id = ?').run(agentType, agentId);
  return c.json({ agent_id: agentId, agent_type: agentType });
});

analyticsRoutes.get('/analytics/funnels', async (c) => {
  return c.json(await analyticsService.getFunnelOverviews());
});

analyticsRoutes.get('/analytics/funnels/:funnelId', async (c) => {
  const detail = await analyticsService.getFunnelDetail(c.req.param('funnelId'));
  if (!detail) return c.json({ error: 'Funnel not found' }, 404);
  return c.json(detail);
});

analyticsRoutes.post('/analytics/funnels/:funnelId/confirm', (c) => {
  const funnelId = c.req.param('funnelId');
  analyticsService.confirmFunnelSynthesized(funnelId);
  return c.json({ ok: true });
});

analyticsRoutes.get('/analytics/funnels/:funnelId/analysis', async (c) => {
  const funnelId = c.req.param('funnelId');
  const funnel = sqlite.prepare('SELECT id FROM research_funnels WHERE id = ?').get(funnelId) as any;
  if (!funnel) return c.json({ error: 'Funnel not found' }, 404);

  const cached = getFunnelAnalysis(funnelId);

  // Lazy generate on first request if we have resolved markets but no cached analysis
  if (!cached.analysis && cached.current_resolved_count > 0) {
    try {
      const fresh = await generateFunnelAnalysis(funnelId);
      return c.json(fresh);
    } catch (err: any) {
      return c.json({ error: err?.message || 'Analysis generation failed' }, 500);
    }
  }

  return c.json(cached);
});

analyticsRoutes.post('/analytics/funnels/:funnelId/analysis/regenerate', async (c) => {
  const funnelId = c.req.param('funnelId');
  const funnel = sqlite.prepare('SELECT id FROM research_funnels WHERE id = ?').get(funnelId) as any;
  if (!funnel) return c.json({ error: 'Funnel not found' }, 404);

  try {
    const fresh = await generateFunnelAnalysis(funnelId);
    return c.json(fresh);
  } catch (err: any) {
    return c.json({ error: err?.message || 'Analysis generation failed' }, 500);
  }
});

analyticsRoutes.get('/analytics/points-timeseries', (c) => {
  const daysParam = c.req.query('days') || '30';
  const days = daysParam === 'all' ? null : parseInt(daysParam);
  if (days !== null && ![7, 30, 90].includes(days)) {
    return c.json({ error: 'days must be 7, 30, 90, or "all"' }, 400);
  }
  return c.json(analyticsService.getPointsTimeSeries(days));
});

analyticsRoutes.get('/analytics/agent-activity', (c) => {
  const daysParam = c.req.query('days') || '30';
  const days = daysParam === 'all' ? null : parseInt(daysParam);
  if (days !== null && ![7, 30, 90].includes(days)) {
    return c.json({ error: 'days must be 7, 30, 90, or "all"' }, 400);
  }
  return c.json(analyticsService.getAgentActivityTimeSeries(days));
});

analyticsRoutes.get('/analytics/markets/:id', (c) => {
  const marketId = c.req.param('id');
  try {
    const detail = analyticsService.getMarketDetail(marketId);
    if (!detail) {
      const marketsCount = (sqlite.prepare('SELECT COUNT(*) as count FROM markets').get() as any)?.count ?? 0;
      const opinionsForId = (sqlite.prepare('SELECT COUNT(*) as count FROM opinions WHERE market_id = ?').get(marketId) as any)?.count ?? 0;
      const transactionsForId = (sqlite.prepare('SELECT COUNT(*) as count FROM point_transactions WHERE market_id = ?').get(marketId) as any)?.count ?? 0;
      logger.warn({
        marketId,
        instanceId: INSTANCE_ID,
        dbPath: DB_PATH,
        marketsCount,
        opinionsForId,
        transactionsForId,
      }, 'Market detail lookup failed');
      return c.json({ error: 'Market not found' }, 404);
    }
    return c.json(detail);
  } catch (err) {
    logger.error({ err, marketId, instanceId: INSTANCE_ID, dbPath: DB_PATH }, 'Market detail lookup crashed');
    return c.json({ error: 'Market detail lookup failed' }, 500);
  }
});

analyticsRoutes.get('/analytics/markets', (c) => {
  const sort = c.req.query('sort') || 'created_at';
  const creatorType = c.req.query('creator_type');
  const result = analyticsService.getMarketAnalytics(sort);

  // Filter by creator_type if specified
  if (creatorType && ['system', 'admin', 'agent'].includes(creatorType)) {
    result.markets = result.markets.filter((m: any) => m.creator_type === creatorType);
  }

  return c.json(result);
});

// ── Session Schedule API ───────────────────────────────────────────────

analyticsRoutes.get('/analytics/sessions', (c) => {
  const days = Math.min(Math.max(parseInt(c.req.query('days') || '14', 10), 1), 60);
  return c.json({
    sessions: getSessionsWithMarkets(days),
    templates: getMarketTemplatesForScheduling().map(t => ({
      index: t.index,
      question: t.question,
      description: t.description,
      category: t.category,
      answer_type: t.answer_type || 'binary',
    })),
  });
});

analyticsRoutes.post('/analytics/sessions/plan', async (c) => {
  let body: { days?: number } = {};
  try { body = await c.req.json(); } catch { /* use defaults */ }
  const requestedDays = Math.min(Math.max(parseInt(String(body.days || 28), 10), 1), 60);
  const sessions = requestedDays >= 28 ? planNextFourWeeks() : ensureUpcomingSessions(requestedDays);
  return c.json({ ok: true, sessions_created_or_updated: sessions.length });
});

analyticsRoutes.post('/analytics/sessions/:id/questions', async (c) => {
  const sessionId = c.req.param('id');
  const session = getSessionById(sessionId);
  if (!session) return c.json({ error: 'Session not found' }, 404);
  if (session.status !== 'scheduled' || session.scheduled_start_utc <= new Date().toISOString()) {
    return c.json({ error: 'Questions can only be added to future scheduled sessions' }, 400);
  }

  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

  const order = nextSessionOrder(sessionId);
  let values: typeof markets.$inferInsert;
  let requiredRewardPool = 0;

  if (body.type === 'template') {
    const templates = getMarketTemplatesForScheduling();
    const template = templates[Number(body.template_index)];
    if (!template) return c.json({ error: 'Template not found' }, 404);
    values = createScheduledMarketValues(session, template, order);
    requiredRewardPool = values.reward_pool || 0;
  } else if (body.type === 'custom') {
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const category = typeof body.category === 'string' ? body.category : 'pure_opinion';
    if (!question || !description) return c.json({ error: 'question and description are required' }, 400);
    if (!(VALID_CATEGORIES as readonly string[]).includes(category)) {
      return c.json({ error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` }, 400);
    }

    const rewardPool = getDefaultMarketFunding();
    requiredRewardPool = rewardPool;
    values = {
      id: randomUUID(),
      question: question.slice(0, 240),
      description: description.slice(0, 1000),
      context_json: JSON.stringify(normalizeContextForStorage({ articles: [], data_points: [], links: [] })),
      category: category as any,
      status: 'scheduled',
      created_by: 'admin',
      deadline: session.deadline_utc,
      created_at: new Date().toISOString(),
      funded_amount: rewardPool,
      platform_fee: 0,
      reward_pool: rewardPool,
      reward_distributed: 0,
      answer_type: 'binary',
      knowledge_source: 'local_only',
      scheduled_start: session.scheduled_start_utc,
      session_id: session.id,
      session_order: order,
      creator_type: 'admin',
    };
  } else {
    return c.json({ error: 'type must be "template" or "custom"' }, 400);
  }

  if (requiredRewardPool > 0) {
    const treasury = await db.select({ points_balance: agents.points_balance })
      .from(agents)
      .where(eq(agents.id, PLATFORM_TREASURY_ID));
    const balance = treasury[0]?.points_balance ?? 0;
    if (balance < requiredRewardPool) {
      return c.json({ error: `Treasury balance (${balance}) is below required reward pool (${requiredRewardPool})` }, 400);
    }
  }

  await db.insert(markets).values(values);

  if (values.reward_pool && values.reward_pool > 0) {
    await db.insert(pointTransactions).values({
      id: randomUUID(),
      agent_id: PLATFORM_TREASURY_ID,
      market_id: values.id!,
      amount: -values.reward_pool,
      type: 'system_funding',
      created_at: new Date().toISOString(),
    });
    await db.update(agents)
      .set({ points_balance: sql`${agents.points_balance} - ${values.reward_pool}` })
      .where(eq(agents.id, PLATFORM_TREASURY_ID));
  }

  return c.json({ ok: true, market_id: values.id }, 201);
});

analyticsRoutes.delete('/analytics/sessions/:id/questions/:marketId', async (c) => {
  const sessionId = c.req.param('id');
  const marketId = c.req.param('marketId');
  const market = sqlite.prepare('SELECT id, reward_pool, status FROM markets WHERE id = ? AND session_id = ?').get(marketId, sessionId) as any;
  if (!market) return c.json({ error: 'Market not found in session' }, 404);
  if (market.status !== 'scheduled') return c.json({ error: 'Only scheduled session questions can be removed' }, 400);

  sqlite.prepare('DELETE FROM markets WHERE id = ? AND session_id = ?').run(marketId, sessionId);

  if (market.reward_pool && market.reward_pool > 0) {
    const now = new Date().toISOString();
    await db.insert(pointTransactions).values({
      id: randomUUID(),
      agent_id: PLATFORM_TREASURY_ID,
      market_id: marketId,
      amount: market.reward_pool,
      type: 'system_funding',
      created_at: now,
    });
    await db.update(agents)
      .set({ points_balance: sql`${agents.points_balance} + ${market.reward_pool}` })
      .where(eq(agents.id, PLATFORM_TREASURY_ID));
  }

  return c.json({ ok: true });
});

analyticsRoutes.patch('/analytics/sessions/:id/questions/reorder', async (c) => {
  const sessionId = c.req.param('id');
  const session = getSessionById(sessionId);
  if (!session) return c.json({ error: 'Session not found' }, 404);
  const nowIso = new Date().toISOString();
  if (session.status !== 'scheduled' || session.scheduled_start_utc <= nowIso) {
    return c.json({ error: 'Only future scheduled sessions can be reordered' }, 400);
  }
  let body: { market_ids?: string[] };
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  if (!Array.isArray(body.market_ids)) return c.json({ error: 'market_ids must be an array' }, 400);

  const marketIds = body.market_ids.map(String);
  if (marketIds.length === 0) return c.json({ ok: true });

  const placeholders = marketIds.map(() => '?').join(',');
  const rows = sqlite.prepare(`SELECT id, status FROM markets WHERE id IN (${placeholders})`).all(...marketIds) as Array<{ id: string; status: string }>;
  if (rows.length !== marketIds.length) return c.json({ error: 'One or more markets not found' }, 404);
  if (rows.some(row => row.status !== 'scheduled')) {
    return c.json({ error: 'Only scheduled markets can be reordered' }, 400);
  }

  reorderSessionMarkets(sessionId, marketIds);
  return c.json({ ok: true });
});

// ── Classification API ────────────────────────────────────────────────

analyticsRoutes.get('/analytics/classifications', async (c) => {
  const filters: classificationService.ClassifiedAgentFilters = {};
  if (c.req.query('domain')) filters.domain = c.req.query('domain');
  if (c.req.query('style')) filters.style = c.req.query('style');
  if (c.req.query('type')) filters.type = c.req.query('type');
  if (c.req.query('country')) filters.country = c.req.query('country');
  if (c.req.query('min_participation')) filters.min_participation = parseFloat(c.req.query('min_participation')!);
  if (c.req.query('min_opinions')) filters.min_opinions = parseInt(c.req.query('min_opinions')!);
  if (c.req.query('active_days')) filters.active_days = parseInt(c.req.query('active_days')!);
  if (c.req.query('sort')) filters.sort = c.req.query('sort');
  if (c.req.query('limit')) filters.limit = parseInt(c.req.query('limit')!);
  if (c.req.query('search')) filters.search = c.req.query('search');
  if (c.req.query('offset')) filters.offset = parseInt(c.req.query('offset')!);
  if (c.req.query('member_since_from')) filters.member_since_from = c.req.query('member_since_from');
  if (c.req.query('member_since_to')) filters.member_since_to = c.req.query('member_since_to');
  const result = await classificationService.getClassifiedAgents(filters);
  return c.json(result);
});

analyticsRoutes.get('/analytics/agent-dashboard', async (c) => {
  const filters: classificationService.ClassifiedAgentFilters = {};
  if (c.req.query('domain')) filters.domain = c.req.query('domain');
  if (c.req.query('style')) filters.style = c.req.query('style');
  if (c.req.query('type')) filters.type = c.req.query('type');
  if (c.req.query('country')) filters.country = c.req.query('country');
  if (c.req.query('min_participation')) filters.min_participation = parseFloat(c.req.query('min_participation')!);
  if (c.req.query('min_opinions')) filters.min_opinions = parseInt(c.req.query('min_opinions')!);
  if (c.req.query('active_days')) filters.active_days = parseInt(c.req.query('active_days')!);
  if (c.req.query('search')) filters.search = c.req.query('search');
  if (c.req.query('member_since_from')) filters.member_since_from = c.req.query('member_since_from');
  if (c.req.query('member_since_to')) filters.member_since_to = c.req.query('member_since_to');
  const result = await analyticsService.getAgentDirectoryDashboard(filters);
  return c.json(result);
});

analyticsRoutes.get('/analytics/classifications/:agentId', async (c) => {
  const result = await classificationService.getClassifiedAgents({});
  const agent = result.agents.find(a => a.agent_id === c.req.param('agentId'));
  if (!agent) return c.json({ error: 'Agent not found or not classified' }, 404);
  return c.json(agent);
});

analyticsRoutes.post('/analytics/classifications/recompute', async (c) => {
  const { recomputed, skipped } = await classificationService.recomputeAllClassifications();
  return c.json({ ok: true, recomputed, skipped });
});

analyticsRoutes.get('/analytics/geographic', (c) => {
  const country = c.req.query('country');
  return c.json(analyticsService.getGeographicBreakdown(country));
});

analyticsRoutes.get('/analytics/thresholds', async (c) => {
  const thresholds = await classificationService.getThresholds();
  // Return with full metadata
  const rows = sqlite.prepare('SELECT * FROM classification_thresholds ORDER BY key').all() as Array<{ key: string; value: string; label: string; description: string | null; updated_at: string }>;
  return c.json({ thresholds: rows });
});

analyticsRoutes.patch('/analytics/thresholds/:key', async (c) => {
  const key = c.req.param('key');
  const body = await c.req.json();
  const value = body.value;
  if (typeof value !== 'number') {
    return c.json({ error: 'value must be a number' }, 400);
  }
  try {
    await classificationService.updateThreshold(key, value);
    return c.json({ ok: true, key, value });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// ── App Settings API ────────────────────────────────────────────────

analyticsRoutes.get('/analytics/settings/default-market-funding', (c) => {
  const value = getDefaultMarketFunding();
  return c.json({ key: 'default_market_funding', value });
});

analyticsRoutes.patch('/analytics/settings/default-market-funding', async (c) => {
  const body = await c.req.json();
  const value = body.value;
  const maxAdminFunding = getMaxAdminMarketFunding();
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return c.json({ error: 'value must be a positive integer' }, 400);
  }
  if (value > maxAdminFunding) {
    return c.json({ error: `value must be at most ${maxAdminFunding}` }, 400);
  }
  const now = new Date().toISOString();
  sqlite.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run('default_market_funding', String(value), now);
  return c.json({ ok: true, key: 'default_market_funding', value });
});

analyticsRoutes.get('/analytics/settings/max-admin-market-funding', (c) => {
  const value = getMaxAdminMarketFunding();
  return c.json({ key: 'max_admin_market_funding', value });
});

analyticsRoutes.patch('/analytics/settings/max-admin-market-funding', async (c) => {
  const body = await c.req.json();
  const value = body.value;
  const currentDefault = getDefaultMarketFunding();
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return c.json({ error: 'value must be a positive integer' }, 400);
  }
  if (value < currentDefault) {
    return c.json({ error: `value must be at least current default (${currentDefault})` }, 400);
  }
  const now = new Date().toISOString();
  sqlite.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run('max_admin_market_funding', String(value), now);
  return c.json({ ok: true, key: 'max_admin_market_funding', value });
});

// ── Pool Analysis API ─────────────────────────────────────────────────

analyticsRoutes.get('/analytics/pool-analysis', async (c) => {
  const query: classificationService.PoolAnalysisQuery = {};
  if (c.req.query('category')) query.category = c.req.query('category');
  if (c.req.query('domain')) query.domain = c.req.query('domain');
  if (c.req.query('style')) query.style = c.req.query('style');
  if (c.req.query('type')) query.type = c.req.query('type');
  if (c.req.query('country')) query.country = c.req.query('country');
  if (c.req.query('min_participation')) query.min_participation = parseFloat(c.req.query('min_participation')!);
  if (c.req.query('min_opinions')) query.min_opinions = parseInt(c.req.query('min_opinions')!);
  if (c.req.query('active_days')) query.active_days = parseInt(c.req.query('active_days')!);
  const result = await classificationService.getPoolAnalysis(query);
  return c.json(result);
});

// ── Cohort Comparison API ─────────────────────────────────────────────

analyticsRoutes.post('/analytics/cohort-comparison', async (c) => {
  const body = await c.req.json() as CohortComparisonRequest;
  if (!body.cohorts || !Array.isArray(body.cohorts) || body.cohorts.length < 2) {
    return c.json({ error: 'At least 2 cohorts required' }, 400);
  }
  for (const cohort of body.cohorts) {
    if (!cohort.label || !Array.isArray(cohort.agent_ids) || cohort.agent_ids.length === 0) {
      return c.json({ error: 'Each cohort needs a label and at least one agent_id' }, 400);
    }
  }
  const result = await generateCohortComparison(body);
  return c.json(result);
});

// ── Surface Topics API ────────────────────────────────────────────────

analyticsRoutes.get('/analytics/surface-topics', (c) => {
  const rows = sqlite.prepare('SELECT * FROM surface_topics ORDER BY created_at DESC').all() as any[];
  return c.json({ topics: rows });
});

analyticsRoutes.get('/analytics/surface-topics/:id', (c) => {
  const id = c.req.param('id');
  const topic = sqlite.prepare('SELECT * FROM surface_topics WHERE id = ?').get(id) as any;
  if (!topic) return c.json({ error: 'Topic not found' }, 404);

  const drafts = sqlite.prepare('SELECT * FROM draft_questions WHERE surface_topic_id = ? ORDER BY generation_round, created_at').all(id) as any[];
  return c.json({ topic, drafts });
});

analyticsRoutes.post('/analytics/surface-topics', async (c) => {
  const body = await c.req.json();
  const { name, description, insight_goal, example_seeds } = body;

  if (!name || !description || !insight_goal) {
    return c.json({ error: 'name, description, and insight_goal are required' }, 400);
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  await db.insert(surfaceTopics).values({
    id,
    name: String(name).slice(0, 200),
    description: String(description).slice(0, 1000),
    insight_goal: String(insight_goal).slice(0, 1000),
    example_seeds: Array.isArray(example_seeds) ? JSON.stringify(example_seeds) : null,
    status: 'active',
    created_at: now,
    updated_at: now,
  });

  // Trigger LLM generation (runs synchronously — client shows spinner)
  const generated = await generateDraftQuestions(id, 12);

  return c.json({ id, generated });
});

analyticsRoutes.post('/analytics/surface-topics/:id/generate', async (c) => {
  const id = c.req.param('id');
  const topic = sqlite.prepare('SELECT id FROM surface_topics WHERE id = ?').get(id) as any;
  if (!topic) return c.json({ error: 'Topic not found' }, 404);

  const generated = await generateDraftQuestions(id, 8);
  return c.json({ generated });
});

analyticsRoutes.get('/analytics/surface-topics/:id/analysis', async (c) => {
  const id = c.req.param('id');
  const topic = sqlite.prepare('SELECT id FROM surface_topics WHERE id = ?').get(id) as any;
  if (!topic) return c.json({ error: 'Topic not found' }, 404);

  const cached = getTopicAnalysis(id);

  // Lazy generate on first request if we have resolved markets but no cached analysis
  if (!cached.analysis && cached.current_resolved_count > 0) {
    try {
      const fresh = await generateTopicAnalysis(id);
      return c.json(fresh);
    } catch (err: any) {
      return c.json({ error: err?.message || 'Analysis generation failed' }, 500);
    }
  }

  return c.json(cached);
});

analyticsRoutes.post('/analytics/surface-topics/:id/analysis/regenerate', async (c) => {
  const id = c.req.param('id');
  const topic = sqlite.prepare('SELECT id FROM surface_topics WHERE id = ?').get(id) as any;
  if (!topic) return c.json({ error: 'Topic not found' }, 404);

  try {
    const fresh = await generateTopicAnalysis(id);
    return c.json(fresh);
  } catch (err: any) {
    return c.json({ error: err?.message || 'Analysis generation failed' }, 500);
  }
});

analyticsRoutes.patch('/analytics/draft-questions/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const draft = sqlite.prepare('SELECT * FROM draft_questions WHERE id = ?').get(id) as any;
  if (!draft) return c.json({ error: 'Draft not found' }, 404);

  const updates: string[] = [];
  const values: any[] = [];

  if (body.status && ['draft', 'approved', 'rejected'].includes(body.status)) {
    updates.push('status = ?');
    values.push(body.status);
  }
  if (body.question) {
    updates.push('question = ?');
    values.push(String(body.question).slice(0, 200));
  }
  if (body.description) {
    updates.push('description = ?');
    values.push(String(body.description).slice(0, 500));
  }

  if (updates.length === 0) return c.json({ error: 'No valid fields to update' }, 400);

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  sqlite.prepare(`UPDATE draft_questions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return c.json({ ok: true });
});

analyticsRoutes.post('/analytics/draft-questions/:id/deploy', async (c) => {
  const id = c.req.param('id');
  const draft = sqlite.prepare('SELECT * FROM draft_questions WHERE id = ?').get(id) as any;
  if (!draft) return c.json({ error: 'Draft not found' }, 404);
  if (draft.status !== 'approved') return c.json({ error: 'Only approved drafts can be deployed' }, 400);
  if (draft.funnel_id) {
    return c.json({ error: 'Funnel-sourced drafts deploy via the funnel scheduler; use /admin/api/longform-question/:id/approve instead' }, 400);
  }

  const now = new Date().toISOString();
  const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2h default
  const rewardPool = getDefaultMarketFunding();
  const marketId = randomUUID();
  const topicTag = `custom:${draft.surface_topic_id}`;

  await db.insert(markets).values({
    id: marketId,
    question: draft.question,
    description: draft.description,
    context_json: JSON.stringify(normalizeContextForStorage(draft.context_json ? safeJsonParse(draft.context_json, EMPTY_MARKET_CONTEXT) : EMPTY_MARKET_CONTEXT)),
    category: draft.category,
    status: 'open',
    created_by: 'admin',
    deadline,
    created_at: now,
    answer_type: draft.answer_type,
    answer_options: draft.answer_options,
    response_constraints: draft.response_constraints,
    knowledge_source: 'any',
    tags: JSON.stringify([topicTag]),
    creator_type: 'admin',
    research_theme: topicTag,
    funded_amount: rewardPool,
    platform_fee: 0,
    reward_pool: rewardPool,
    reward_distributed: 0,
  });

  sqlite.prepare('UPDATE draft_questions SET status = ?, updated_at = ? WHERE id = ?').run('deployed', now, id);

  return c.json({ ok: true, market_id: marketId });
});

// ── Research Funnels API ──────────────────────────────────────────────

analyticsRoutes.get('/analytics/funnels-admin', async (c) => {
  const funnels = await getAllFunnels();
  return c.json({ funnels });
});

analyticsRoutes.get('/analytics/funnels-admin/:id', async (c) => {
  const funnel = await getFunnelById(c.req.param('id'));
  if (!funnel) return c.json({ error: 'Funnel not found' }, 404);
  return c.json({ funnel });
});

analyticsRoutes.post('/analytics/funnels-admin', async (c) => {
  try {
    const body = await c.req.json();
    const funnel = await createFunnel(body);
    return c.json({ funnel });
  } catch (err: any) {
    if (err instanceof FunnelValidationError) return c.json({ error: err.message }, 400);
    return c.json({ error: err?.message || 'Failed to create funnel' }, 500);
  }
});

analyticsRoutes.patch('/analytics/funnels-admin/:id', async (c) => {
  try {
    const body = await c.req.json();
    const funnel = await updateFunnel(c.req.param('id'), body);
    return c.json({ funnel });
  } catch (err: any) {
    if (err instanceof FunnelValidationError) return c.json({ error: err.message }, 400);
    return c.json({ error: err?.message || 'Failed to update funnel' }, 500);
  }
});

analyticsRoutes.delete('/analytics/funnels-admin/:id', async (c) => {
  try {
    const funnel = await archiveFunnel(c.req.param('id'));
    return c.json({ funnel });
  } catch (err: any) {
    if (err instanceof FunnelValidationError) return c.json({ error: err.message }, 400);
    return c.json({ error: err?.message || 'Failed to archive funnel' }, 500);
  }
});
