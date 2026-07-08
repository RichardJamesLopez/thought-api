// Smoke test for the cohort-report framework.
//
// Seeds a fresh temp DB with 15 agents (apr-A1…apr-C5), 4 markets with mixed
// knowledge_source policies, and ~50 opinions with varying provenance, then
// verifies generateCohortReport() produces the expected shape and that both
// renderers emit Markdown without throwing.

import { mkdirSync, rmSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';

// Must point DB_PATH to a temp file BEFORE importing anything that reads from
// src/db/index.ts, since that module opens the DB connection at load time.
const TMP_DB = resolve(`./.tmp-cohort-report-${Date.now()}.db`);
process.env.DB_PATH = TMP_DB;
mkdirSync(dirname(TMP_DB), { recursive: true });

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

// NB: src/services/cohort-report.ts transitively imports src/db/index.ts,
// which opens the DB at module-load time. Static imports are hoisted before
// our `process.env.DB_PATH = ...` line above, so we must dynamic-import the
// services AFTER seeding the temp DB. Module-level holders below.
let generateCohortReport: typeof import('../src/services/cohort-report.js').generateCohortReport;
let generateCohortReportFromExplicitCohorts: typeof import('../src/services/cohort-report.js').generateCohortReportFromExplicitCohorts;
let renderMemoMarkdown: typeof import('../src/services/cohort-report-render.js').renderMemoMarkdown;
let renderAppendixMarkdown: typeof import('../src/services/cohort-report-render.js').renderAppendixMarkdown;

// Schema mirrors the production migrations the report touches. We seed
// directly via SQL to keep the test self-contained and migration-drift-proof.
const SCHEMA = `
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  api_key_hash TEXT NOT NULL,
  points_balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  agent_type TEXT,
  custom_instructions TEXT,
  custom_objective TEXT,
  location_country TEXT,
  location_region TEXT,
  location_city TEXT,
  consent_version TEXT,
  consented_at TEXT,
  retention_days INTEGER,
  deletion_requested_at TEXT,
  email TEXT
);
CREATE TABLE markets (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  description TEXT NOT NULL,
  context_json TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_by TEXT NOT NULL,
  deadline TEXT NOT NULL,
  majority_position TEXT,
  created_at TEXT NOT NULL,
  funded_amount INTEGER,
  platform_fee INTEGER,
  reward_pool INTEGER,
  reward_distributed INTEGER DEFAULT 0,
  answer_options TEXT,
  answer_type TEXT NOT NULL DEFAULT 'binary',
  response_constraints TEXT,
  knowledge_source TEXT NOT NULL DEFAULT 'any',
  max_participants INTEGER,
  tags TEXT,
  scheduled_start TEXT,
  session_id TEXT,
  session_order INTEGER,
  creator_type TEXT,
  research_theme TEXT
);
CREATE TABLE opinions (
  id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  basis TEXT,
  provenance_json TEXT,
  provenance_score REAL,
  confidence INTEGER,
  created_at TEXT NOT NULL,
  review_state TEXT,
  redacted_answer TEXT,
  reviewer_id TEXT,
  reviewed_at TEXT,
  pii_findings_json TEXT
);
CREATE TABLE profile_answers (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  question_key TEXT NOT NULL,
  answer TEXT NOT NULL,
  question_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (agent_id, question_key)
);
CREATE TABLE agent_classifications (
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
  computed_at TEXT NOT NULL DEFAULT ''
);
`;

interface SeededIds {
  agents: Record<string, string>; // handle → id
  markets: Record<string, string>; // question → id
}

const NOW = new Date().toISOString();
const DEADLINE = new Date(Date.now() + 7 * 86400_000).toISOString();

function seed(sqlite: Database.Database): SeededIds {
  sqlite.exec(SCHEMA);

  const cohorts: Record<string, { count: number; objective: string; ks_bias: string }> = {
    A: { count: 5, objective: 'Express your most considered opinion', ks_bias: 'any' },
    B: { count: 5, objective: 'Cite only the provided market context', ks_bias: 'provided_context_only' },
    C: { count: 5, objective: 'Reason from training knowledge; no external context', ks_bias: 'training_knowledge' },
  };

  const seeded: SeededIds = { agents: {}, markets: {} };

  // Agents
  const insertAgent = sqlite.prepare(`
    INSERT INTO agents (id, handle, api_key_hash, points_balance, created_at, custom_objective, custom_instructions)
    VALUES (?, ?, 'fake-hash', 0, ?, ?, ?)
  `);
  for (const [label, spec] of Object.entries(cohorts)) {
    for (let i = 1; i <= spec.count; i++) {
      const handle = `apr-${label}${i}`;
      const id = randomUUID();
      insertAgent.run(id, handle, NOW, spec.objective, `Operate as Cohort ${label} agent.`);
      seeded.agents[handle] = id;
    }
  }

  // Markets — 4 markets with varied knowledge_source policies
  const insertMarket = sqlite.prepare(`
    INSERT INTO markets (id, question, description, context_json, category, status, created_by, deadline, created_at, knowledge_source, answer_type)
    VALUES (?, ?, ?, ?, 'pure_opinion', 'open', 'admin', ?, ?, ?, 'binary')
  `);
  const marketSpecs = [
    {
      q: 'Should AI agents be allowed to vote in public elections?',
      desc: 'A question about delegating civic participation to autonomous agents.',
      ctx: { articles: [{ title: 'Civic AI', url: 'https://example.com/civic', summary: 'EU proposed a ban on AI voting delegation in 2025.' }], data_points: [{ label: 'EU members opposed', value: '24/27', source: 'Council 2025' }], links: [] },
      ks: 'any',
    },
    {
      q: 'Is universal basic income a solution to AI-driven displacement?',
      desc: 'Economic policy question — context provided.',
      ctx: { articles: [{ title: 'UBI pilots', url: 'https://example.com/ubi', summary: 'Finland and Stockton pilots showed mixed labour-market effects.' }], data_points: [{ label: 'Stockton employment delta', value: '+12pp', source: 'SEED Study' }], links: [] },
      ks: 'provided_context_only',
    },
    {
      q: 'Do open-source LLMs improve more rapidly than closed-source?',
      desc: 'Technical comparison — answer from your training knowledge.',
      ctx: { articles: [], data_points: [], links: [] },
      ks: 'training_knowledge',
    },
    {
      q: 'Should social media require age verification?',
      desc: 'Policy debate around minors and social platforms.',
      ctx: { articles: [{ title: 'UK age check rollout', url: 'https://example.com/age', summary: 'UK enforced strict ID-based age checks; Australia followed.' }], data_points: [], links: [] },
      ks: 'any',
    },
  ];
  for (const m of marketSpecs) {
    const id = randomUUID();
    insertMarket.run(id, m.q, m.desc, JSON.stringify(m.ctx), DEADLINE, NOW, m.ks);
    seeded.markets[m.q] = id;
  }

  // Opinions — design varied answers per cohort + varied provenance quality
  const insertOpinion = sqlite.prepare(`
    INSERT INTO opinions (id, market_id, agent_id, answer, basis, provenance_json, provenance_score, confidence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Helper: provenance payload generator
  const ctxProv = JSON.stringify({ sources: [{ type: 'article', id: 'a1' }, { type: 'data_point', id: 'd1' }] });
  const trainProv = JSON.stringify({ sources: [{ type: 'training' }] });
  const mixedProv = JSON.stringify({ sources: [{ type: 'article' }, { type: 'training' }] });
  const localProv = JSON.stringify({ sources: [{ type: 'local' }] });

  // Cohort A leans "yes" on Q1/Q4, varied on Q2/Q3; mid confidence; mixed provenance
  // Cohort B answers "no" more often, especially Q1/Q4; cites context cleanly
  // Cohort C answers based on training; misaligned on provided_context_only markets
  type Row = { handle: string; q: string; ans: string; basis: string; prov: string; provScore: number; conf: number };
  const ops: Row[] = [];
  for (let i = 1; i <= 5; i++) {
    const h = `apr-A${i}`;
    ops.push({ handle: h, q: marketSpecs[0].q, ans: 'yes', basis: 'Civic AI delegation is the future. EU proposal is restrictive.', prov: mixedProv, provScore: 1.0, conf: 70 });
    ops.push({ handle: h, q: marketSpecs[1].q, ans: i % 2 === 0 ? 'yes' : 'no', basis: 'Stockton pilots showed modest gains.', prov: ctxProv, provScore: 1.0, conf: 60 });
    ops.push({ handle: h, q: marketSpecs[2].q, ans: 'yes', basis: 'Open-source iteration cadence visibly accelerated 2023-2025.', prov: trainProv, provScore: 1.0, conf: 75 });
    ops.push({ handle: h, q: marketSpecs[3].q, ans: 'yes', basis: 'UK rollout suggests workable enforcement.', prov: mixedProv, provScore: 0.7, conf: 65 });
  }
  for (let i = 1; i <= 5; i++) {
    const h = `apr-B${i}`;
    ops.push({ handle: h, q: marketSpecs[0].q, ans: 'no', basis: 'No evidence in provided context supports the affirmative.', prov: ctxProv, provScore: 1.0, conf: 80 });
    ops.push({ handle: h, q: marketSpecs[1].q, ans: 'no', basis: 'Stockton SEED Study showed +12pp employment but mixed labour-market effects per article.', prov: ctxProv, provScore: 1.0, conf: 85 });
    ops.push({ handle: h, q: marketSpecs[2].q, ans: 'no', basis: 'No context provided to support the affirmative.', prov: ctxProv, provScore: 0.4, conf: 50 }); // misaligned: cited context on training_knowledge market
    ops.push({ handle: h, q: marketSpecs[3].q, ans: 'no', basis: 'UK and Australia enforced ID-based age checks per article.', prov: ctxProv, provScore: 1.0, conf: 75 });
  }
  for (let i = 1; i <= 5; i++) {
    const h = `apr-C${i}`;
    ops.push({ handle: h, q: marketSpecs[0].q, ans: i === 3 ? 'no' : 'yes', basis: 'AI delegation raises representation concerns from my training.', prov: trainProv, provScore: 1.0, conf: 70 });
    ops.push({ handle: h, q: marketSpecs[1].q, ans: 'yes', basis: 'My training suggests UBI is increasingly viable.', prov: trainProv, provScore: 0.4, conf: 65 }); // misaligned: training on provided_context_only
    ops.push({ handle: h, q: marketSpecs[2].q, ans: 'yes', basis: 'Open-source velocity outpaced closed in 2024-2025 per my knowledge.', prov: trainProv, provScore: 1.0, conf: 80 });
    ops.push({ handle: h, q: marketSpecs[3].q, ans: 'yes', basis: 'Age verification has broad parental support historically.', prov: trainProv, provScore: 1.0, conf: 60 });
  }

  for (const op of ops) {
    insertOpinion.run(
      randomUUID(),
      seeded.markets[op.q],
      seeded.agents[op.handle],
      op.ans,
      op.basis,
      op.prov,
      op.provScore,
      op.conf,
      NOW,
    );
  }

  return seeded;
}

describe('Cohort report framework', () => {
  beforeAll(async () => {
    const sqlite = new Database(TMP_DB);
    seed(sqlite);
    sqlite.close();
    ({ generateCohortReport, generateCohortReportFromExplicitCohorts } = await import('../src/services/cohort-report.js'));
    ({ renderMemoMarkdown, renderAppendixMarkdown } = await import('../src/services/cohort-report-render.js'));
  });

  afterAll(() => {
    if (existsSync(TMP_DB)) rmSync(TMP_DB);
    if (existsSync(TMP_DB + '-wal')) rmSync(TMP_DB + '-wal');
    if (existsSync(TMP_DB + '-shm')) rmSync(TMP_DB + '-shm');
  });

  it('resolves apr-A1…C5 into three cohorts of 5 each', async () => {
    const report = await generateCohortReport({ batch_tag: 'apr', cohort_labels: ['A', 'B', 'C'] });
    const sizes = report.resolved_cohorts.map(c => ({ label: c.label, n: c.agent_ids.length }));
    expect(sizes).toEqual([
      { label: 'A', n: 5 },
      { label: 'B', n: 5 },
      { label: 'C', n: 5 },
    ]);
    expect(report.resolved_cohorts[0].handles).toContain('apr-A1');
    expect(report.resolved_cohorts[2].handles).toContain('apr-C5');
  });

  it('finds the seeded markets as common across all three cohorts', async () => {
    const report = await generateCohortReport({ batch_tag: 'apr', cohort_labels: ['A', 'B', 'C'] });
    // All 4 markets were answered by all 5 agents in each cohort
    expect(report.comparison.common_markets.length).toBe(4);
    for (const cm of report.comparison.common_markets) {
      expect(cm.cohort_positions).toHaveLength(3);
    }
  });

  it('computes provenance aggregates per cohort, with B + C showing misalignment on policy-specific markets', async () => {
    const report = await generateCohortReport({ batch_tag: 'apr', cohort_labels: ['A', 'B', 'C'] });
    expect(report.provenance_aggregates).toHaveLength(3);
    const a = report.provenance_aggregates.find(p => p.cohort_label === 'A')!;
    const b = report.provenance_aggregates.find(p => p.cohort_label === 'B')!;
    const c = report.provenance_aggregates.find(p => p.cohort_label === 'C')!;
    expect(a.total_opinions).toBe(20);
    expect(b.total_opinions).toBe(20);
    expect(c.total_opinions).toBe(20);
    // B is misaligned on training_knowledge market (cited context)
    expect(b.pct_misaligned).toBeGreaterThan(0);
    // C is misaligned on provided_context_only market (cited training)
    expect(c.pct_misaligned).toBeGreaterThan(0);
    // basis overlap should be highest for B (verbatim quoting of context)
    expect(b.mean_basis_overlap).toBeGreaterThan(a.mean_basis_overlap);
  });

  it('runs chi-square per common market and includes the result', async () => {
    const report = await generateCohortReport({ batch_tag: 'apr', cohort_labels: ['A', 'B', 'C'] });
    expect(report.market_stat_tests).toHaveLength(4);
    for (const s of report.market_stat_tests) {
      expect(s.chi_square).toBeGreaterThanOrEqual(0);
      expect(['p<0.01', 'p<0.05', 'p<0.1', 'ns']).toContain(s.p_value_approx);
    }
    // Q1 ("AI voting") should show a strong A=yes vs B=no split → significant
    const q1 = report.market_stat_tests.find(s => s.question.includes('AI agents'));
    expect(q1?.p_value_approx).not.toBe('ns');
  });

  it('builds treatment fingerprints reflecting per-cohort objectives', async () => {
    const report = await generateCohortReport({ batch_tag: 'apr', cohort_labels: ['A', 'B', 'C'] });
    expect(report.treatment_fingerprints).toHaveLength(3);
    const b = report.treatment_fingerprints.find(t => t.cohort_label === 'B')!;
    expect(b.distinct_objectives[0].value).toContain('provided market context');
    expect(b.unique_traits.some(t => t.includes('Unique objective'))).toBe(true);
  });

  it('produces a non-empty memo and appendix markdown', async () => {
    const report = await generateCohortReport({ batch_tag: 'apr', cohort_labels: ['A', 'B', 'C'] });
    const memo = renderMemoMarkdown(report);
    const appendix = renderAppendixMarkdown(report);

    expect(memo).toContain('# APR cohort report — memo');
    expect(memo).toContain('Cohorts at a glance');
    expect(memo).toContain('Context grounding');
    expect(memo.length).toBeLessThan(8000); // ~2 pages worth

    expect(appendix).toContain('# APR cohort report — appendix');
    expect(appendix).toContain('## A. Methodology');
    expect(appendix).toContain('## E. Provenance deep-dive');
    expect(appendix).toContain('## H. Reproducibility');
    // 15 per-agent cards
    for (let i = 1; i <= 5; i++) {
      expect(appendix).toContain(`apr-A${i}`);
      expect(appendix).toContain(`apr-B${i}`);
      expect(appendix).toContain(`apr-C${i}`);
    }
  });

  it('generateCohortReportFromExplicitCohorts produces the same shape as the batch-tag flow', async () => {
    // First get the batch-resolved report to pull agent_ids
    const batchReport = await generateCohortReport({ batch_tag: 'apr', cohort_labels: ['A', 'B', 'C'] });
    const cohortsPayload = batchReport.resolved_cohorts.map(c => ({ label: c.label, agent_ids: c.agent_ids }));

    const adhoc = await generateCohortReportFromExplicitCohorts({ cohorts: cohortsPayload });
    expect(adhoc.comparison.common_markets.length).toBe(4);
    expect(adhoc.treatment_fingerprints).toHaveLength(3);
    expect(adhoc.provenance_aggregates).toHaveLength(3);
    expect(adhoc.market_stat_tests).toHaveLength(4);
    expect(adhoc.meta.batch_tag).toBe('(ad-hoc)');
    // The renderers must accept this report too
    expect(() => renderMemoMarkdown(adhoc)).not.toThrow();
    expect(() => renderAppendixMarkdown(adhoc)).not.toThrow();
  });

  it('handles missing-cohort gracefully without throwing', async () => {
    const report = await generateCohortReport({ batch_tag: 'doesnotexist', cohort_labels: ['A', 'B'] });
    expect(report.resolved_cohorts).toHaveLength(2);
    expect(report.resolved_cohorts.every(c => c.agent_ids.length === 0)).toBe(true);
    expect(report.comparison.common_markets).toHaveLength(0);
    // Renderers must not throw on the empty report
    expect(() => renderMemoMarkdown(report)).not.toThrow();
    expect(() => renderAppendixMarkdown(report)).not.toThrow();
  });
});
