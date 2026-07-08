import { db, sqlite } from '../db/index.js';
import { researchFunnels } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { safeJsonParse } from '../utils.js';

export type FunnelStatus = 'active' | 'paused' | 'archived';

export interface FunnelAnswerTypeMix {
  binary: number;
  single_choice: number;
  multi_choice: number;
  longform: number;
}

export interface ResearchFunnel {
  id: string;
  name: string;
  description: string;
  insight_goal: string;
  display_insight_name: string;
  example_topics: string[];
  generation_guidance: Array<{ phase: number; guidance: string }>;
  forbidden_terms: string[];
  camouflage_categories: string[];
  status: FunnelStatus;
  created_at: string;
  updated_at: string;
  target_resolved: number;
  markets_per_session: number;
  mix: FunnelAnswerTypeMix;
}

export interface FunnelInput {
  id?: string;
  name: string;
  description: string;
  insight_goal: string;
  display_insight_name: string;
  example_topics: string[];
  generation_guidance: Array<{ phase: number; guidance: string }>;
  forbidden_terms: string[];
  camouflage_categories: string[];
  status?: FunnelStatus;
  target_resolved?: number;
  markets_per_session?: number;
  mix?: Partial<FunnelAnswerTypeMix>;
}

const ID_PATTERN = /^[a-z][a-z0-9_]{2,40}$/;
const ALLOWED_STATUSES: FunnelStatus[] = ['active', 'paused', 'archived'];

type Row = typeof researchFunnels.$inferSelect;

function hydrate(row: Row): ResearchFunnel {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    insight_goal: row.insight_goal,
    display_insight_name: row.display_insight_name,
    example_topics: safeJsonParse<string[]>(row.example_topics, []),
    generation_guidance: safeJsonParse<Array<{ phase: number; guidance: string }>>(row.generation_guidance, []),
    forbidden_terms: safeJsonParse<string[]>(row.forbidden_terms, []),
    camouflage_categories: safeJsonParse<string[]>(row.camouflage_categories, []),
    status: (ALLOWED_STATUSES.includes(row.status as FunnelStatus) ? row.status : 'active') as FunnelStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
    target_resolved: row.target_resolved ?? 40,
    markets_per_session: row.markets_per_session ?? 2,
    mix: {
      binary: row.mix_binary ?? 0.2,
      single_choice: row.mix_single_choice ?? 0.2,
      multi_choice: row.mix_multi_choice ?? 0.2,
      longform: row.mix_longform ?? 0.4,
    },
  };
}

interface CacheEntry {
  active: ResearchFunnel[];
  expiresAt: number;
}

let activeCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000;

export function invalidateFunnelsCache(): void {
  activeCache = null;
}

export async function getActiveFunnels(): Promise<ResearchFunnel[]> {
  const now = Date.now();
  if (activeCache && activeCache.expiresAt > now) return activeCache.active;
  const rows = await db.select().from(researchFunnels).where(eq(researchFunnels.status, 'active'));
  const funnels = rows.map(hydrate);
  activeCache = { active: funnels, expiresAt: now + CACHE_TTL_MS };
  return funnels;
}

export async function getAllFunnels(): Promise<ResearchFunnel[]> {
  const rows = await db.select().from(researchFunnels);
  return rows.map(hydrate);
}

export async function getFunnelById(id: string): Promise<ResearchFunnel | null> {
  const [row] = await db.select().from(researchFunnels).where(eq(researchFunnels.id, id));
  return row ? hydrate(row) : null;
}

export class FunnelValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FunnelValidationError';
  }
}

function trimNonEmpty(s: unknown, label: string, max: number): string {
  if (typeof s !== 'string') throw new FunnelValidationError(`${label} must be a string`);
  const t = s.trim();
  if (!t) throw new FunnelValidationError(`${label} is required`);
  if (t.length > max) throw new FunnelValidationError(`${label} must be ≤ ${max} chars`);
  return t;
}

function normalizeStringArray(input: unknown, label: string): string[] {
  if (!Array.isArray(input)) throw new FunnelValidationError(`${label} must be an array`);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') throw new FunnelValidationError(`${label} entries must be strings`);
    const t = item.trim();
    if (!t) continue;
    if (t.length > 100) throw new FunnelValidationError(`${label} entries must be ≤ 100 chars`);
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  if (out.length > 50) throw new FunnelValidationError(`${label} must have ≤ 50 entries`);
  return out;
}

function normalizeGuidance(input: unknown): Array<{ phase: number; guidance: string }> {
  if (!Array.isArray(input)) throw new FunnelValidationError('generation_guidance must be an array');
  if (input.length !== 3) throw new FunnelValidationError('generation_guidance must have exactly 3 phases');
  const out: Array<{ phase: number; guidance: string }> = [];
  for (let i = 0; i < 3; i++) {
    const entry = input[i] as { phase?: unknown; guidance?: unknown };
    const phase = Number(entry?.phase);
    if (phase !== i + 1) throw new FunnelValidationError(`generation_guidance phase ${i + 1} is missing or out of order`);
    const guidance = typeof entry?.guidance === 'string' ? entry.guidance.trim() : '';
    if (!guidance) throw new FunnelValidationError(`generation_guidance phase ${i + 1} is empty`);
    if (guidance.length > 2000) throw new FunnelValidationError(`generation_guidance phase ${i + 1} must be ≤ 2000 chars`);
    out.push({ phase, guidance });
  }
  return out;
}

function normalizeStatus(input: unknown): FunnelStatus {
  if (input === undefined || input === null || input === '') return 'active';
  if (typeof input !== 'string' || !ALLOWED_STATUSES.includes(input as FunnelStatus)) {
    throw new FunnelValidationError('status must be one of active, paused, archived');
  }
  return input as FunnelStatus;
}

function parsePositiveInteger(
  input: unknown,
  opts: { fieldName: string; min: number; max: number; fallback: number }
): number {
  if (input === undefined || input === null || input === '') return opts.fallback;
  const asNumber = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(asNumber)) {
    throw new FunnelValidationError(`${opts.fieldName} must be a number`);
  }
  if (!Number.isInteger(asNumber)) {
    throw new FunnelValidationError(`${opts.fieldName} must be a whole number`);
  }
  if (asNumber < opts.min || asNumber > opts.max) {
    throw new FunnelValidationError(`${opts.fieldName} must be between ${opts.min} and ${opts.max}`);
  }
  return asNumber;
}

function normalizeMix(input: unknown, fallback: FunnelAnswerTypeMix): FunnelAnswerTypeMix {
  if (input === undefined || input === null) return { ...fallback };
  if (typeof input !== 'object') throw new FunnelValidationError('mix must be an object');
  const raw = input as Record<string, unknown>;
  const parseShare = (key: keyof FunnelAnswerTypeMix): number => {
    if (raw[key] === undefined || raw[key] === null || raw[key] === '') return fallback[key];
    const n = Number(raw[key]);
    if (!Number.isFinite(n)) throw new FunnelValidationError(`mix.${key} must be a number`);
    if (n < 0 || n > 1) throw new FunnelValidationError(`mix.${key} must be between 0 and 1`);
    return n;
  };
  const mix: FunnelAnswerTypeMix = {
    binary: parseShare('binary'),
    single_choice: parseShare('single_choice'),
    multi_choice: parseShare('multi_choice'),
    longform: parseShare('longform'),
  };
  const sum = mix.binary + mix.single_choice + mix.multi_choice + mix.longform;
  if (Math.abs(sum - 1) > 0.01) {
    throw new FunnelValidationError(`mix shares must sum to 1.0 (got ${sum.toFixed(2)})`);
  }
  return mix;
}

const DEFAULT_MIX: FunnelAnswerTypeMix = { binary: 0.2, single_choice: 0.2, multi_choice: 0.2, longform: 0.4 };

export async function createFunnel(input: FunnelInput): Promise<ResearchFunnel> {
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  if (!ID_PATTERN.test(id)) {
    throw new FunnelValidationError('id must match ^[a-z][a-z0-9_]{2,40}$');
  }
  const existing = await getFunnelById(id);
  if (existing) throw new FunnelValidationError(`funnel ${id} already exists`);

  const now = new Date().toISOString();
  const mix = normalizeMix(input.mix, DEFAULT_MIX);
  const row = {
    id,
    name: trimNonEmpty(input.name, 'name', 200),
    description: trimNonEmpty(input.description, 'description', 500),
    insight_goal: trimNonEmpty(input.insight_goal, 'insight_goal', 500),
    display_insight_name: trimNonEmpty(input.display_insight_name, 'display_insight_name', 100),
    example_topics: JSON.stringify(normalizeStringArray(input.example_topics, 'example_topics')),
    generation_guidance: JSON.stringify(normalizeGuidance(input.generation_guidance)),
    forbidden_terms: JSON.stringify(normalizeStringArray(input.forbidden_terms, 'forbidden_terms')),
    camouflage_categories: JSON.stringify(normalizeStringArray(input.camouflage_categories, 'camouflage_categories')),
    status: normalizeStatus(input.status),
    created_at: now,
    updated_at: now,
    target_resolved: parsePositiveInteger(input.target_resolved, { fieldName: 'target_resolved', min: 1, max: 500, fallback: 40 }),
    markets_per_session: parsePositiveInteger(input.markets_per_session, { fieldName: 'markets_per_session', min: 1, max: 10, fallback: 2 }),
    mix_binary: mix.binary,
    mix_single_choice: mix.single_choice,
    mix_multi_choice: mix.multi_choice,
    mix_longform: mix.longform,
  };

  await db.insert(researchFunnels).values(row);
  invalidateFunnelsCache();
  const created = await getFunnelById(id);
  if (!created) throw new Error('failed to load created funnel');
  return created;
}

export async function updateFunnel(id: string, input: Partial<FunnelInput>): Promise<ResearchFunnel> {
  const existing = await getFunnelById(id);
  if (!existing) throw new FunnelValidationError(`funnel ${id} not found`);

  const updated: Partial<typeof researchFunnels.$inferInsert> = { updated_at: new Date().toISOString() };

  if (input.name !== undefined) updated.name = trimNonEmpty(input.name, 'name', 200);
  if (input.description !== undefined) updated.description = trimNonEmpty(input.description, 'description', 500);
  if (input.insight_goal !== undefined) updated.insight_goal = trimNonEmpty(input.insight_goal, 'insight_goal', 500);
  if (input.display_insight_name !== undefined) updated.display_insight_name = trimNonEmpty(input.display_insight_name, 'display_insight_name', 100);
  if (input.example_topics !== undefined) updated.example_topics = JSON.stringify(normalizeStringArray(input.example_topics, 'example_topics'));
  if (input.generation_guidance !== undefined) updated.generation_guidance = JSON.stringify(normalizeGuidance(input.generation_guidance));
  if (input.forbidden_terms !== undefined) updated.forbidden_terms = JSON.stringify(normalizeStringArray(input.forbidden_terms, 'forbidden_terms'));
  if (input.camouflage_categories !== undefined) updated.camouflage_categories = JSON.stringify(normalizeStringArray(input.camouflage_categories, 'camouflage_categories'));
  if (input.status !== undefined) updated.status = normalizeStatus(input.status);
  if (input.target_resolved !== undefined) {
    updated.target_resolved = parsePositiveInteger(input.target_resolved, { fieldName: 'target_resolved', min: 1, max: 500, fallback: existing.target_resolved });
  }
  if (input.markets_per_session !== undefined) {
    updated.markets_per_session = parsePositiveInteger(input.markets_per_session, { fieldName: 'markets_per_session', min: 1, max: 10, fallback: existing.markets_per_session });
  }
  if (input.mix !== undefined) {
    const mix = normalizeMix(input.mix, existing.mix);
    updated.mix_binary = mix.binary;
    updated.mix_single_choice = mix.single_choice;
    updated.mix_multi_choice = mix.multi_choice;
    updated.mix_longform = mix.longform;
  }

  await db.update(researchFunnels).set(updated).where(eq(researchFunnels.id, id));
  invalidateFunnelsCache();
  const fresh = await getFunnelById(id);
  if (!fresh) throw new Error('failed to load updated funnel');
  return fresh;
}

export async function archiveFunnel(id: string): Promise<ResearchFunnel> {
  return updateFunnel(id, { status: 'archived' });
}
