/**
 * PII redaction pipeline for longform answers.
 *
 * v1: LLM-based via the existing OpenAI key. The LLM is asked to identify spans
 * of PII (emails, phone numbers, names, addresses, SSN-shaped strings, etc.) and
 * return both a redacted version of the text and a structured findings list.
 *
 * Findings are categorized:
 *   - Hard-reject: EMAIL, PHONE, SSN, CREDIT_CARD, PERSON
 *   - Flag for review: LOCATION, ORG, OTHER
 *
 * The caller (express handler / bulk-express) decides what to do with the result:
 *   - severity 'reject': do not store the opinion
 *   - severity 'review': store with review_state='pending' and surface to admin queue
 *   - severity 'clean': store with review_state='approved' (no PII found)
 *
 * Providers (env PII_REDACTION_PROVIDER):
 *   - 'openai' (default) — LLM-based redaction with structured JSON output
 *   - 'regex'           — local regex sweep only (fast, deterministic, weaker coverage)
 *   - 'none'            — no redaction; opinion goes straight to pending review with no findings
 *
 * If the OpenAI provider fails (network, timeout, parse error), we fall back to
 * regex rather than failing the request, and tag the result with
 * `provider: 'openai_fallback_regex'` so admins can see why a row landed unredacted.
 */

import logger from '../logger.js';
import { callLLM } from './llm-client.js';

export type PiiCategory =
  | 'EMAIL'
  | 'PHONE'
  | 'SSN'
  | 'CREDIT_CARD'
  | 'PERSON'
  | 'LOCATION'
  | 'ORG'
  | 'OTHER';

export type PiiSeverity = 'clean' | 'review' | 'reject';

export interface PiiFinding {
  category: PiiCategory;
  span: string; // the offending substring (or summary if too long)
  reason?: string;
}

export interface PiiResult {
  redacted: string;
  findings: PiiFinding[];
  severity: PiiSeverity;
  provider: 'openai' | 'regex' | 'none' | 'openai_fallback_regex';
}

const HARD_REJECT_CATEGORIES: PiiCategory[] = ['EMAIL', 'PHONE', 'SSN', 'CREDIT_CARD', 'PERSON'];

function severityFromFindings(findings: PiiFinding[]): PiiSeverity {
  if (findings.length === 0) return 'clean';
  const hasReject = findings.some(f => HARD_REJECT_CATEGORIES.includes(f.category));
  return hasReject ? 'reject' : 'review';
}

function getProvider(): 'openai' | 'regex' | 'none' {
  const v = (process.env.PII_REDACTION_PROVIDER || 'openai').toLowerCase();
  if (v === 'regex' || v === 'none' || v === 'openai') return v;
  return 'openai';
}

// ── Regex provider ──────────────────────────────────────────────────────

// Order matters: more specific patterns (SSN, CC) run before the broader PHONE
// pattern. Otherwise a `123-45-6789` would be classified as PHONE first.
const REGEX_PATTERNS: Array<{ category: PiiCategory; pattern: RegExp }> = [
  { category: 'EMAIL', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { category: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { category: 'CREDIT_CARD', pattern: /\b(?:\d[ -]?){13,16}\b/g },
  { category: 'PHONE', pattern: /\+?\d[\d\s().-]{7,}\d/g },
];

function regexRedact(text: string): PiiResult {
  let redacted = text;
  const findings: PiiFinding[] = [];
  for (const { category, pattern } of REGEX_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        findings.push({ category, span: m, reason: 'regex match' });
      }
      redacted = redacted.replace(pattern, `[${category}]`);
    }
  }
  return { redacted, findings, severity: severityFromFindings(findings), provider: 'regex' };
}

// ── OpenAI provider ─────────────────────────────────────────────────────

const REDACTION_SYSTEM = `You are a strict PII redaction tool. Identify spans of personally identifiable information in user-submitted text. Return JSON only.

Categories:
- EMAIL: any email address
- PHONE: phone numbers in any format
- SSN: US Social Security Numbers (999-99-9999 shape)
- CREDIT_CARD: credit-card-shaped digit strings
- PERSON: a specific named person (real or fictional, but a personal name; not a generic role like "the CEO")
- LOCATION: a specific street address (not city or country alone)
- ORG: a specific named organization, employer, or company that, combined with the rest, could identify the writer
- OTHER: any other clearly identifying personal detail (medical record numbers, government IDs, etc.)

Output schema:
{
  "redacted": "<the text with each PII span replaced with [CATEGORY]>",
  "findings": [
    { "category": "EMAIL" | "PHONE" | ..., "span": "<the original substring>", "reason": "<one short phrase>" }
  ]
}

If there are no findings, return { "redacted": "<text unchanged>", "findings": [] }. Do not invent findings. Do not flag generic statements ("I work in tech", "I live in California"). Do not flag opinions.`;

async function openaiRedact(text: string): Promise<PiiResult | null> {
  const userPrompt = `Text to scan:\n\n${text}`;
  const raw = await callLLM(REDACTION_SYSTEM, userPrompt, { temperature: 0.0, maxTokens: 1500 });
  if (!raw) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logger.warn({ err, raw: raw.slice(0, 200) }, 'PII LLM returned non-JSON');
    return null;
  }

  if (typeof parsed.redacted !== 'string' || !Array.isArray(parsed.findings)) {
    logger.warn({ parsed }, 'PII LLM returned unexpected shape');
    return null;
  }

  const validCategories: PiiCategory[] = ['EMAIL', 'PHONE', 'SSN', 'CREDIT_CARD', 'PERSON', 'LOCATION', 'ORG', 'OTHER'];
  const findings: PiiFinding[] = [];
  for (const f of parsed.findings) {
    if (!f || typeof f.span !== 'string') continue;
    const category = validCategories.includes(f.category) ? f.category : 'OTHER';
    findings.push({
      category,
      span: f.span.slice(0, 200),
      reason: typeof f.reason === 'string' ? f.reason.slice(0, 200) : undefined,
    });
  }

  return {
    redacted: parsed.redacted,
    findings,
    severity: severityFromFindings(findings),
    provider: 'openai',
  };
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Redact PII from a longform answer. Always resolves — never throws.
 * If the configured provider fails, falls back to regex so longform express
 * does not fail because of an LLM outage.
 */
export async function redactPII(text: string): Promise<PiiResult> {
  const provider = getProvider();

  if (provider === 'none') {
    return { redacted: text, findings: [], severity: 'review', provider: 'none' };
  }

  if (provider === 'regex') {
    return regexRedact(text);
  }

  // openai (with regex fallback)
  try {
    const result = await openaiRedact(text);
    if (result) return result;
  } catch (err) {
    logger.warn({ err }, 'PII OpenAI provider threw, falling back to regex');
  }

  const fallback = regexRedact(text);
  return { ...fallback, provider: 'openai_fallback_regex' };
}

// ── Free-text fields helper ─────────────────────────────────────────────
//
// /express receives 3 free-text fields beyond the answer: `basis` (≤1500
// chars), `provenance.local_summary` (≤200), and one `note` (≤140) per
// source. Each could carry PII. To keep latency low while still filtering
// every field, we fire all non-empty fields through redactPII in parallel
// via Promise.all (wall-clock latency ≈ max(call_time) instead of sum).
//
//   basis           ─┐
//   local_summary   ─┼─► Promise.all redactPII ─► per-field redactions
//   source[0].note  ─┤                          + max(severity)
//   source[N].note  ─┘
//
// Fields shorter than 20 chars skip the LLM and use regex only — most
// "basis" comments are short and don't need a frontier model.
//
// Per CEO plan D5: severity informs storage decisions (longform answers
// route to admin queue on 'review'+) but typed-answer basis-PII is always
// redacted-and-stored — never produces a 400. The caller decides what to
// do with `severity`.

import type { ProvenancePayload, ProvenanceSource } from '../types.js';

const SHORT_FIELD_THRESHOLD = 20;

export interface FreeTextFieldsResult {
  basis_redacted: string | null;
  basis_findings: PiiFinding[];
  provenance_redacted: ProvenancePayload;
  provenance_findings: PiiFinding[];
  severity: PiiSeverity;
  providers: Array<'openai' | 'regex' | 'none' | 'openai_fallback_regex'>;
}

function maxSeverity(severities: PiiSeverity[]): PiiSeverity {
  if (severities.includes('reject')) return 'reject';
  if (severities.includes('review')) return 'review';
  return 'clean';
}

async function redactField(text: string): Promise<PiiResult> {
  // Short fields skip the LLM entirely — they aren't expressive enough to
  // justify a frontier-model call, and regex covers the obvious cases.
  if (text.length < SHORT_FIELD_THRESHOLD) {
    return regexRedact(text);
  }
  return redactPII(text);
}

/**
 * Filter PII out of every free-text field on an opinion submission. Returns
 * per-field redactions, per-field findings, and a max severity across fields.
 * Always resolves; never throws.
 */
export async function redactFreeTextFields(
  input: { basis?: string | null; provenance: ProvenancePayload },
): Promise<FreeTextFieldsResult> {
  const basisText = input.basis && input.basis.length > 0 ? input.basis : null;
  const localSummary = input.provenance.local_summary && input.provenance.local_summary.length > 0
    ? input.provenance.local_summary
    : null;
  const sourceNotes: Array<{ index: number; text: string }> = [];
  for (let i = 0; i < input.provenance.sources.length; i++) {
    const note = input.provenance.sources[i]?.note;
    if (note && note.length > 0) sourceNotes.push({ index: i, text: note });
  }

  // Fire all redactions in parallel. Each entry is paired with a tag so we
  // can map results back to the field they came from after Promise.all.
  const tasks: Array<{ kind: 'basis' } | { kind: 'local_summary' } | { kind: 'source_note'; index: number }> = [];
  const promises: Array<Promise<PiiResult>> = [];

  if (basisText !== null) {
    tasks.push({ kind: 'basis' });
    promises.push(redactField(basisText));
  }
  if (localSummary !== null) {
    tasks.push({ kind: 'local_summary' });
    promises.push(redactField(localSummary));
  }
  for (const sn of sourceNotes) {
    tasks.push({ kind: 'source_note', index: sn.index });
    promises.push(redactField(sn.text));
  }

  const results = await Promise.all(promises);

  let basisRedacted: string | null = basisText;
  const basisFindings: PiiFinding[] = [];
  let provenanceRedactedLocal = input.provenance.local_summary;
  const provenanceFindings: PiiFinding[] = [];
  const redactedSources: ProvenanceSource[] = input.provenance.sources.map(s => ({ ...s }));
  const severities: PiiSeverity[] = [];
  const providers: FreeTextFieldsResult['providers'] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const result = results[i];
    severities.push(result.severity);
    providers.push(result.provider);

    if (task.kind === 'basis') {
      basisRedacted = result.redacted;
      basisFindings.push(...result.findings);
    } else if (task.kind === 'local_summary') {
      provenanceRedactedLocal = result.redacted;
      provenanceFindings.push(...result.findings);
    } else {
      redactedSources[task.index].note = result.redacted;
      provenanceFindings.push(...result.findings);
    }
  }

  return {
    basis_redacted: basisRedacted,
    basis_findings: basisFindings,
    provenance_redacted: {
      sources: redactedSources,
      local_summary: provenanceRedactedLocal,
    },
    provenance_findings: provenanceFindings,
    severity: maxSeverity(severities),
    providers,
  };
}
