/**
 * LLM-powered 3-paragraph analysis for surface topic resolved markets.
 * Generates Consensus / Outlier Opinions / Interesting Trends summary.
 */

import { sqlite } from '../db/index.js';
import { callLLM } from './llm-client.js';
import logger from '../logger.js';

export interface TopicAnalysis {
  consensus: string;
  outliers: string;
  trends: string;
}

export interface TopicAnalysisResponse {
  empty: boolean;
  analysis: TopicAnalysis | null;
  generated_at: string | null;
  resolved_count_at_generation: number | null;
  current_resolved_count: number;
}

function countResolvedForTopic(topicId: string): number {
  const tag = `custom:${topicId}`;
  const row = sqlite.prepare(
    `SELECT COUNT(*) as cnt FROM markets WHERE status = 'resolved' AND research_theme = ?`
  ).get(tag) as any;
  return row?.cnt || 0;
}

function loadCached(topicId: string): TopicAnalysisResponse {
  const row = sqlite.prepare(
    `SELECT analysis_json, analysis_generated_at, analysis_resolved_count FROM surface_topics WHERE id = ?`
  ).get(topicId) as any;

  const currentResolved = countResolvedForTopic(topicId);

  if (!row || !row.analysis_json) {
    return {
      empty: currentResolved === 0,
      analysis: null,
      generated_at: null,
      resolved_count_at_generation: null,
      current_resolved_count: currentResolved,
    };
  }

  let parsed: TopicAnalysis | null = null;
  try {
    parsed = JSON.parse(row.analysis_json) as TopicAnalysis;
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

export function getTopicAnalysis(topicId: string): TopicAnalysisResponse {
  return loadCached(topicId);
}

interface MarketSummary {
  question: string;
  answer_type: string;
  majority_position: string | null;
  total_opinions: number;
  answer_distribution: Array<{ answer: string; count: number }>;
  sample_bases: string[];
}

function buildMarketSummaries(topicId: string): MarketSummary[] {
  const tag = `custom:${topicId}`;
  const marketRows = sqlite.prepare(
    `SELECT id, question, answer_type, majority_position
     FROM markets
     WHERE status = 'resolved' AND research_theme = ?
     ORDER BY created_at`
  ).all(tag) as any[];

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

You will receive a surface topic's research context plus data from its resolved opinion markets (question, majority answer, full answer distribution, sample reasoning from agents).

Produce a JSON object with exactly three fields, each a single plain-prose paragraph of 3–5 sentences:
- "consensus": What agents broadly agreed on across the markets. Reference specific questions or positions when helpful.
- "outliers": Notable minority or dissenting positions that stood out. Quote or paraphrase the most interesting contrarian takes.
- "trends": Patterns that emerged across markets — recurring reasoning, splits along apparent axes, surprising correlations, or directional shifts.

Each paragraph must stand alone as prose — no bullet lists, no headings inside the text, no meta-commentary like "based on the data". Respond with valid JSON only.`;

export async function generateTopicAnalysis(topicId: string): Promise<TopicAnalysisResponse> {
  const topic = sqlite.prepare(
    `SELECT id, name, description, insight_goal FROM surface_topics WHERE id = ?`
  ).get(topicId) as any;
  if (!topic) throw new Error(`Surface topic ${topicId} not found`);

  const summaries = buildMarketSummaries(topicId);
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

  const userPrompt = `Surface topic: ${topic.name}
Description: ${topic.description}
Research goal (internal, hidden from agents): ${topic.insight_goal}

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
    logger.error({ topicId }, 'LLM returned no content for topic analysis');
    throw new Error('Analysis generation failed');
  }

  let parsed: TopicAnalysis;
  try {
    const obj = JSON.parse(content);
    parsed = {
      consensus: String(obj.consensus || '').trim(),
      outliers: String(obj.outliers || '').trim(),
      trends: String(obj.trends || '').trim(),
    };
  } catch (err) {
    logger.error({ err, content: content.slice(0, 500) }, 'Failed to parse LLM analysis JSON');
    throw new Error('Analysis parsing failed');
  }

  if (!parsed.consensus || !parsed.outliers || !parsed.trends) {
    throw new Error('Analysis missing required fields');
  }

  const now = new Date().toISOString();
  sqlite.prepare(
    `UPDATE surface_topics
     SET analysis_json = ?, analysis_generated_at = ?, analysis_resolved_count = ?, updated_at = ?
     WHERE id = ?`
  ).run(JSON.stringify(parsed), now, summaries.length, now, topicId);

  logger.info({ topicId, resolved: summaries.length }, 'Generated topic analysis');

  return {
    empty: false,
    analysis: parsed,
    generated_at: now,
    resolved_count_at_generation: summaries.length,
    current_resolved_count: summaries.length,
  };
}
