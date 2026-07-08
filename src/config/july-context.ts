/**
 * Runtime loader + retriever for July agent context.
 *
 * Reads the cached document corpus from scripts/.july-documents.json and, at
 * opinion-expression time, returns per-(agent, market) context:
 *   Cohort A — null (no knowledge base)
 *   Cohort B — the pre-built balanced 2,000-char digest (market-independent)
 *   Cohorts C/D/E — the top-K source cards retrieved from that cohort's
 *     corpus tier for THIS market. Same K and char cap for all three tiers;
 *     only the corpus retrieval draws from differs.
 *
 * Retrieval is deterministic: lexical Jaccard overlap between market text and
 * document text, ties broken by document id.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  JULY_AGENTS,
  JULY_RETRIEVAL_TOP_K,
  JULY_RETRIEVAL_MAX_CHARS,
  type JulyEvidenceType,
} from './july-agents.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_FILE = join(__dirname, '../../scripts/.july-documents.json');

export interface JulyDocument {
  id: string;
  title: string;
  url: string;
  theme: string;
  evidence_type: JulyEvidenceType;
  extract: string;
  keywords: string[];
  last_revised: string | null;
  fetched_at: string;
}

export interface JulyDocumentsFile {
  documents: JulyDocument[];
  /** Nested tiers: tier arrays hold document ids, 10 ⊂ 100 ⊂ 1000. */
  tiers: { '10': string[]; '100': string[]; '1000': string[] };
  /** Balanced ~2,000-char digest across all themes, for Cohort B. */
  digest: string;
  fetched_at: string;
}

export interface JulyMarketLike {
  question: string;
  description?: string | null;
}

let cache: JulyDocumentsFile | null = null;

export function loadJulyDocuments(): JulyDocumentsFile | null {
  if (cache) return cache;

  if (!existsSync(CONTENT_FILE)) {
    console.warn('july-context: .july-documents.json not found — run npm run scripts:july-documents first');
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(CONTENT_FILE, 'utf-8'));
    if (!isValidDocumentsFile(parsed)) {
      console.warn('july-context: .july-documents.json is malformed (missing documents/tiers/digest) — refusing to load');
      return null;
    }
    cache = parsed;
    return cache;
  } catch {
    console.warn('july-context: Failed to parse .july-documents.json');
    return null;
  }
}

function isValidDocumentsFile(raw: unknown): raw is JulyDocumentsFile {
  const f = raw as JulyDocumentsFile;
  return !!f && Array.isArray(f.documents) &&
    !!f.tiers && Array.isArray(f.tiers['10']) && Array.isArray(f.tiers['100']) && Array.isArray(f.tiers['1000']) &&
    typeof f.digest === 'string';
}

/** Test hook: inject a corpus in-memory instead of reading from disk. */
export function setJulyDocumentsForTest(file: JulyDocumentsFile | null): void {
  cache = file;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our',
  'out', 'has', 'have', 'had', 'this', 'that', 'these', 'those', 'with', 'from', 'they',
  'will', 'would', 'could', 'should', 'what', 'when', 'where', 'which', 'while', 'about',
  'into', 'over', 'under', 'more', 'most', 'much', 'many', 'some', 'such', 'than', 'then',
  'them', 'there', 'their', 'been', 'being', 'both', 'does', 'how', 'its', 'also', 'may',
  'between', 'likely', 'scale', 'next', 'years', 'decade',
]);

export function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOPWORDS.has(raw)) continue;
    tokens.add(raw);
  }
  return tokens;
}

// Token sets are memoized per document object — retrieval runs per (agent,
// market) inside the bulk-express loop, so retokenizing a 1,000-doc corpus
// every call would be ~400k redundant tokenizations per cycle. A WeakMap keys
// on identity, so replacing the corpus (or mutating test fixtures) never
// serves stale tokens.
const docTokenCache = new WeakMap<JulyDocument, Set<string>>();

function docTokens(doc: JulyDocument): Set<string> {
  const cached = docTokenCache.get(doc);
  if (cached) return cached;
  const tokens = tokenize(`${doc.title} ${doc.keywords.join(' ')} ${doc.extract}`);
  docTokenCache.set(doc, tokens);
  return tokens;
}

/** Jaccard overlap between market tokens and document tokens. */
export function scoreDocument(marketTokens: Set<string>, doc: JulyDocument): number {
  const dTokens = docTokens(doc);
  if (marketTokens.size === 0 || dTokens.size === 0) return 0;
  let intersection = 0;
  for (const t of marketTokens) if (dTokens.has(t)) intersection++;
  const union = marketTokens.size + dTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Deterministic top-K retrieval from a set of documents for a market.
 * Ties broken by document id so identical inputs always yield identical sets.
 */
export function retrieveTopK(
  market: JulyMarketLike,
  documents: JulyDocument[],
  k: number = JULY_RETRIEVAL_TOP_K,
): JulyDocument[] {
  const marketTokens = tokenize(`${market.question} ${market.description ?? ''}`);
  return documents
    .map(doc => ({ doc, score: scoreDocument(marketTokens, doc) }))
    .sort((a, b) => b.score - a.score || (a.doc.id < b.doc.id ? -1 : 1))
    .slice(0, k)
    .map(s => s.doc);
}

/** Documents in a given corpus tier (10 / 100 / 1000). */
export function getTierDocuments(file: JulyDocumentsFile, tierSize: number): JulyDocument[] {
  const key = String(tierSize) as keyof JulyDocumentsFile['tiers'];
  const ids = file.tiers[key];
  if (!ids) return [];
  const byId = new Map(file.documents.map(d => [d.id, d]));
  return ids.map(id => byId.get(id)).filter((d): d is JulyDocument => !!d);
}

/**
 * Renders retrieved documents as citable source cards within the char cap.
 * Cards are wrapped in <agent_kb_cards> tags so they fall under the system
 * prompt's standing instruction to treat tagged data as context-only (the
 * extracts are third-party Wikipedia text and must not be followed as
 * instructions).
 */
export function renderSourceCards(docs: JulyDocument[], maxChars: number = JULY_RETRIEVAL_MAX_CHARS): string {
  const header =
    'Your knowledge base returned these source cards for this question. When you use one, cite its id in your provenance sources with type "agent_kb".\n<agent_kb_cards>\n';
  const footer = '\n</agent_kb_cards>';
  const budget = maxChars - header.length - footer.length;
  const perCard = Math.floor(budget / Math.max(1, docs.length));
  const cards = docs.map(doc => {
    const meta = `[agent_kb:${doc.id}] ${doc.title} (${doc.theme}, ${doc.evidence_type})`;
    const room = Math.max(80, perCard - meta.length - 2);
    return `${meta}\n${doc.extract.slice(0, room)}`;
  });
  return header + cards.join('\n\n') + footer;
}

/**
 * True when the handle belongs to a July agent whose cohort SHOULD receive
 * knowledge-base context (B–E). Used by bulk-express to fail loudly instead
 * of silently expressing as a control when the corpus is unavailable.
 */
export function isJulyTreatmentAgent(handle: string): boolean {
  const agent = JULY_AGENTS.find(a => a.handle === handle);
  return !!agent && agent.treatment.kind !== 'control';
}

/**
 * Strips untrustworthy agent_kb provenance sources from an opinion:
 *  - non-July (or control-cohort) agents may not cite agent_kb at all
 *  - corpus agents may only cite ids actually retrieved for THIS market
 *  - digest agents (no per-doc ids) may not cite agent_kb ids
 * Without this, any agent could fabricate agent_kb citations and inflate the
 * grounding metric the experiment measures. Returns the payload unchanged
 * when it contains no agent_kb sources.
 */
export function sanitizeAgentKbProvenance<T extends { sources: Array<{ type: string; id?: string }> }>(
  handle: string,
  market: JulyMarketLike,
  payload: T,
): T {
  if (!payload.sources.some(s => s.type === 'agent_kb')) return payload;

  const agent = JULY_AGENTS.find(a => a.handle === handle);
  let allowedIds: Set<string> | null = null;
  if (agent && agent.treatment.kind === 'corpus') {
    const file = loadJulyDocuments();
    if (file) {
      const tierDocs = getTierDocuments(file, agent.treatment.corpus_docs);
      allowedIds = new Set(retrieveTopK(market, tierDocs).map(d => d.id));
    }
  }

  const sources = payload.sources.filter(s => {
    if (s.type !== 'agent_kb') return true;
    return !!allowedIds && !!s.id && allowedIds.has(s.id);
  });
  return { ...payload, sources };
}

/**
 * Returns the knowledge-base context for a July agent on a specific market.
 * Cohort A (control) returns null. Returns null if the handle is not a July
 * agent or the document cache is missing.
 */
export function getJulyContext(handle: string, market: JulyMarketLike): string | null {
  const agent = JULY_AGENTS.find(a => a.handle === handle);
  if (!agent) return null;
  if (agent.treatment.kind === 'control') return null;

  const file = loadJulyDocuments();
  if (!file) return null;

  if (agent.treatment.kind === 'digest') {
    if (!file.digest) return null;
    return `Your knowledge base:\n${file.digest.slice(0, agent.treatment.digest_chars)}`;
  }

  const tierDocs = getTierDocuments(file, agent.treatment.corpus_docs);
  if (tierDocs.length === 0) return null;

  const retrieved = retrieveTopK(market, tierDocs);
  if (retrieved.length === 0) return null;
  return renderSourceCards(retrieved);
}
