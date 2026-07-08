/**
 * LLM-powered 3-paragraph analysis for research-funnel resolved markets.
 * Generates Consensus / Outlier Opinions / Interesting Trends summary.
 *
 * Bridge markets (funnelId only in tags, not research_theme) are intentionally
 * excluded so the analysis reflects only primary funnel markets.
 */

import { sqlite } from '../db/index.js';
import { callLLM } from './llm-client.js';
import logger from '../logger.js';

export interface FunnelAnalysis {
  consensus: string;
  outliers: string;
  trends: string;
}

export interface FunnelAnalysisResponse {
  empty: boolean;
  analysis: FunnelAnalysis | null;
  generated_at: string | null;
  resolved_count_at_generation: number | null;
  current_resolved_count: number;
}

function countResolvedForFunnel(funnelId: string): number {
  const row = sqlite.prepare(
    `SELECT COUNT(*) as cnt FROM markets WHERE status = 'resolved' AND research_theme = ?`
  ).get(funnelId) as any;
  return row?.cnt || 0;
}

function loadCached(funnelId: string): FunnelAnalysisResponse {
  const row = sqlite.prepare(
    `SELECT analysis_json, analysis_generated_at, analysis_resolved_count FROM research_funnels WHERE id = ?`
  ).get(funnelId) as any;

  const currentResolved = countResolvedForFunnel(funnelId);

  if (!row || !row.analysis_json) {
    return {
      empty: currentResolved === 0,
      analysis: null,
      generated_at: null,
      resolved_count_at_generation: null,
      current_resolved_count: currentResolved,
    };
  }

  let parsed: FunnelAnalysis | null = null;
  try {
    parsed = JSON.parse(row.analysis_json) as FunnelAnalysis;
  } catch {
    parsed = null;
  }

  return {
    empty: false,
    analysis: parsed,
    generated_at: row.analysis_generated_at || null,
    resolved_count_at_generation: row.analysis_resolved_count ?? null,
    current_resolved_count: currentResolved,
  };
}

export function getFunnelAnalysis(funnelId: string): FunnelAnalysisResponse {
  return loadCached(funnelId);
}

interface MarketSummary {
  question: string;
  answer_type: string;
  majority_position: string | null;
  total_opinions: number;
  answer_distribution: Array<{ answer: string; count: number }>;
  sample_bases: string[];
}

function buildMarketSummaries(funnelId: string): MarketSummary[] {
  const marketRows = sqlite.prepare(
    `SELECT id, question, answer_type, majority_position
     FROM markets
     WHERE status = 'resolved' AND research_theme = ?
     ORDER BY created_at`
  ).all(funnelId) as any[];

  if (marketRows.length === 0) return [];

  const marketIds = marketRows.map(m => m.id);
  const placeholders = marketIds.map(() => '?').join(',');

  const distRows = sqlite.prepare(
    `SELECT market_id, answer, COUNT(*) as cnt
     FROM opinions
     WHERE market_id IN (${placeholders})
     GROUP BY market_id, answer`
  ).all(...marketIds) as any[];

  const distByMarket = new Map<string, Array<{ answer: string; count: number }>>();
  for (const r of distRows) {
    const list = distByMarket.get(r.market_id) || [];
    list.push({ answer: String(r.answer), count: Number(r.cnt) });
    distByMarket.set(r.market_id, list);
  }

  const basisRows = sqlite.prepare(
    `SELECT market_id, basis
     FROM opinions
     WHERE market_id IN (${placeholders}) AND basis IS NOT NULL AND LENGTH(basis) > 0
     ORDER BY created_at
     LIMIT 1000`
  ).all(...marketIds) as any[];

  const basisByMarket = new Map<string, string[]>();
  for (const r of basisRows) {
    const list = basisByMarket.get(r.market_id) || [];
    if (list.length < 3) list.push(String(r.basis).slice(0, 240));
    basisByMarket.set(r.market_id, list);
  }

  return marketRows.map(m => {
    const dist = (distByMarket.get(m.id) || []).sort((a, b) => b.count - a.count);
    const total = dist.reduce((sum, d) => sum + d.count, 0);
    return {
      question: String(m.question),
      answer_type: String(m.answer_type || 'binary'),
      majority_position: m.majority_position ? String(m.majority_position) : null,
      total_opinions: total,
      answer_distribution: dist.slice(0, 6),
      sample_bases: basisByMarket.get(m.id) || [],
    };
  });
}

const SYSTEM_PROMPT = `You are a research analyst summarizing opinion-market results for an admin dashboard. You write in a concise, observational voice — no hedging, no marketing language.

You will receive a research funnel's context plus data from its resolved opinion markets (question, majority answer, full answer distribution, sample reasoning from agents).

Produce a JSON object with exactly three fields, each a single plain-prose paragraph of 3–5 sentences:
- "consensus": What agents broadly agreed on across the markets. Reference specific questions or positions when helpful.
- "outliers": Notable minority or dissenting positions that stood out. Quote or paraphrase the most interesting contrarian takes.
- "trends": Patterns that emerged across markets — recurring reasoning, splits along apparent axes, surprising correlations, or directional shifts.

Each paragraph must stand alone as prose — no bullet lists, no headings inside the text, no meta-commentary like "based on the data". Respond with valid JSON only.`;

export async function generateFunnelAnalysis(funnelId: string): Promise<FunnelAnalysisResponse> {
  const funnel = sqlite.prepare(
    `SELECT id, name, description, insight_goal, display_insight_name FROM research_funnels WHERE id = ?`
  ).get(funnelId) as any;
  if (!funnel) throw new Error(`Research funnel ${funnelId} not found`);

  const summaries = buildMarketSummaries(funnelId);
  if (summaries.length === 0) {
    return {
      empty: true,
      analysis: null,
      generated_at: null,
      resolved_count_at_generation: null,
      current_resolved_count: 0,
    };
  }

  const marketsText = summaries.map((s, i) => {
    const distText = s.answer_distribution
      .map(d => `${d.answer} (${d.count})`)
      .join(', ');
    const basesText = s.sample_bases.length > 0
      ? `\n  Sample reasoning: ${s.sample_bases.map(b => `"${b}"`).join(' | ')}`
      : '';
    return `${i + 1}. ${s.question} [${s.answer_type}, ${s.total_opinions} opinions]
  Majority: ${s.majority_position || 'n/a'}
  Distribution: ${distText}${basesText}`;
  }).join('\n\n');

  const displayName = funnel.display_insight_name || funnel.name;
  const userPrompt = `Research funnel: ${displayName}
Description: ${funnel.description}
Research goal (internal, hidden from agents): ${funnel.insight_goal}

Resolved markets (${summaries.length} total):

${marketsText}

Respond with JSON:
{
  "consensus": "...",
  "outliers": "...",
  "trends": "..."
}`;

  const content = await callLLM(SYSTEM_PROMPT, userPrompt, { maxTokens: 1500, temperature: 0.7 });
  if (!content) {
    logger.error({ funnelId }, 'LLM returned no content for funnel analysis');
    throw new Error('Analysis generation failed');
  }

  let parsed: FunnelAnalysis;
  try {
    const obj = JSON.parse(content);
    parsed = {
      consensus: String(obj.consensus || '').trim(),
      outliers: String(obj.outliers || '').trim(),
      trends: String(obj.trends || '').trim(),
    };
  } catch (err) {
    logger.error({ err, content: content.slice(0, 500) }, 'Failed to parse LLM funnel analysis JSON');
    throw new Error('Analysis parsing failed');
  }

  if (!parsed.consensus || !parsed.outliers || !parsed.trends) {
    throw new Error('Analysis missing required fields');
  }

  const now = new Date().toISOString();
  sqlite.prepare(
    `UPDATE research_funnels
     SET analysis_json = ?, analysis_generated_at = ?, analysis_resolved_count = ?, updated_at = ?
     WHERE id = ?`
  ).run(JSON.stringify(parsed), now, summaries.length, now, funnelId);

  logger.info({ funnelId, resolved: summaries.length }, 'Generated funnel analysis');

  return {
    empty: false,
    analysis: parsed,
    generated_at: now,
    resolved_count_at_generation: summaries.length,
    current_resolved_count: summaries.length,
  };
}
