import type { ResponseConstraints, KnowledgeSource, ProvenancePayload } from '../types.js';

// ── Prompt injection detection ──────────────────────────────────────────
// Patterns that indicate prompt injection attempts in user-provided text
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /override\s+(system|previous|prior)/i,
  /you\s+are\s+now\s+a/i,
  /new\s+instructions?\s*:/i,
  /system\s*prompt\s*:/i,
  /\<\/?system\>/i,
  /\<\/?assistant\>/i,
  /\<\/?user\>/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<<\s*SYS\s*>>/i,
];

/**
 * Check text for common prompt injection patterns.
 * Returns null if clean, or a description of the detected pattern.
 */
export function detectInjectionPatterns(text: string): string | null {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return `Input contains suspicious pattern that resembles a prompt injection attempt`;
    }
  }
  return null;
}

/**
 * Sanitize text for safe interpolation into LLM prompts.
 * Strips control characters and normalizes whitespace.
 */
export function sanitizeForPrompt(text: string): string {
  return text
    // Remove zero-width and control characters (except newline, tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u200B-\u200F\u2028-\u202F\uFEFF]/g, '')
    // Collapse excessive newlines (max 2)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Market text validation ──────────────────────────────────────────────
const MAX_QUESTION_LENGTH = 300;
const MAX_DESCRIPTION_LENGTH = 500;

export function validateMarketQuestion(question: unknown): { valid: boolean; error?: string } {
  if (typeof question !== 'string') {
    return { valid: false, error: 'question must be a string' };
  }
  const trimmed = question.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'question cannot be empty' };
  }
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return { valid: false, error: `question must be ${MAX_QUESTION_LENGTH} characters or fewer (got ${trimmed.length})` };
  }
  const injection = detectInjectionPatterns(trimmed);
  if (injection) {
    return { valid: false, error: injection };
  }
  return { valid: true };
}

export function validateMarketDescription(description: unknown): { valid: boolean; error?: string } {
  if (typeof description !== 'string') {
    return { valid: false, error: 'description must be a string' };
  }
  const trimmed = description.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'description cannot be empty' };
  }
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    return { valid: false, error: `description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer (got ${trimmed.length})` };
  }
  const injection = detectInjectionPatterns(trimmed);
  if (injection) {
    return { valid: false, error: injection };
  }
  return { valid: true };
}

// ── Context JSON validation ─────────────────────────────────────────────
const MAX_ARTICLE_TITLE_LENGTH = 150;
const MAX_ARTICLE_SUMMARY_LENGTH = 500;
const MAX_ARTICLE_URL_LENGTH = 500;
const MAX_ARTICLE_ID_LENGTH = 64;
const MAX_DATA_POINT_LABEL_LENGTH = 100;
const MAX_DATA_POINT_VALUE_LENGTH = 200;
const MAX_DATA_POINT_SOURCE_LENGTH = 200;
const MAX_DATA_POINT_ID_LENGTH = 64;
const MAX_LINK_URL_LENGTH = 500;
const MAX_LINK_ID_LENGTH = 64;

interface ContextArticle { id?: string; title?: string; url?: string; summary?: string }
interface ContextDataPoint { id?: string; label?: string; value?: string; source?: string }
interface ContextLink { id?: string; url?: string }
interface MarketContext { articles?: ContextArticle[]; data_points?: ContextDataPoint[]; links?: Array<string | ContextLink> }

export function validateMarketContext(context: unknown): { valid: boolean; error?: string } {
  if (context === undefined || context === null) {
    return { valid: true };
  }
  if (typeof context !== 'object' || Array.isArray(context)) {
    return { valid: false, error: 'context must be an object' };
  }

  const ctx = context as MarketContext;

  if (ctx.articles && Array.isArray(ctx.articles)) {
    if (ctx.articles.length > 10) {
      return { valid: false, error: 'context.articles must have at most 10 items' };
    }
    for (let i = 0; i < ctx.articles.length; i++) {
      const a = ctx.articles[i];
      if (a.id && String(a.id).length > MAX_ARTICLE_ID_LENGTH) {
        return { valid: false, error: `context.articles[${i}].id must be ${MAX_ARTICLE_ID_LENGTH} characters or fewer` };
      }
      if (a.title && String(a.title).length > MAX_ARTICLE_TITLE_LENGTH) {
        return { valid: false, error: `context.articles[${i}].title must be ${MAX_ARTICLE_TITLE_LENGTH} characters or fewer` };
      }
      if (a.summary && String(a.summary).length > MAX_ARTICLE_SUMMARY_LENGTH) {
        return { valid: false, error: `context.articles[${i}].summary must be ${MAX_ARTICLE_SUMMARY_LENGTH} characters or fewer` };
      }
      if (a.url && String(a.url).length > MAX_ARTICLE_URL_LENGTH) {
        return { valid: false, error: `context.articles[${i}].url must be ${MAX_ARTICLE_URL_LENGTH} characters or fewer` };
      }
      // Check injection in article fields
      const fields = [a.title, a.summary].filter(Boolean) as string[];
      for (const field of fields) {
        const injection = detectInjectionPatterns(field);
        if (injection) {
          return { valid: false, error: `context.articles[${i}]: ${injection}` };
        }
      }
    }
  }

  if (ctx.data_points && Array.isArray(ctx.data_points)) {
    if (ctx.data_points.length > 20) {
      return { valid: false, error: 'context.data_points must have at most 20 items' };
    }
    for (let i = 0; i < ctx.data_points.length; i++) {
      const d = ctx.data_points[i];
      if (d.id && String(d.id).length > MAX_DATA_POINT_ID_LENGTH) {
        return { valid: false, error: `context.data_points[${i}].id must be ${MAX_DATA_POINT_ID_LENGTH} characters or fewer` };
      }
      if (d.label && String(d.label).length > MAX_DATA_POINT_LABEL_LENGTH) {
        return { valid: false, error: `context.data_points[${i}].label must be ${MAX_DATA_POINT_LABEL_LENGTH} characters or fewer` };
      }
      if (d.value && String(d.value).length > MAX_DATA_POINT_VALUE_LENGTH) {
        return { valid: false, error: `context.data_points[${i}].value must be ${MAX_DATA_POINT_VALUE_LENGTH} characters or fewer` };
      }
      if (d.source && String(d.source).length > MAX_DATA_POINT_SOURCE_LENGTH) {
        return { valid: false, error: `context.data_points[${i}].source must be ${MAX_DATA_POINT_SOURCE_LENGTH} characters or fewer` };
      }
      const fields = [d.label, d.value, d.source].filter(Boolean) as string[];
      for (const field of fields) {
        const injection = detectInjectionPatterns(field);
        if (injection) {
          return { valid: false, error: `context.data_points[${i}]: ${injection}` };
        }
      }
    }
  }

  if (ctx.links && Array.isArray(ctx.links)) {
    for (let i = 0; i < ctx.links.length; i++) {
      const link = ctx.links[i];
      if (typeof link === 'string') {
        if (link.length > MAX_LINK_URL_LENGTH) {
          return { valid: false, error: `context.links[${i}] must be ${MAX_LINK_URL_LENGTH} characters or fewer` };
        }
        const injection = detectInjectionPatterns(link);
        if (injection) {
          return { valid: false, error: `context.links[${i}]: ${injection}` };
        }
      } else if (typeof link === 'object' && link !== null) {
        const url = typeof (link as any).url === 'string' ? (link as any).url : '';
        const id = typeof (link as any).id === 'string' ? (link as any).id : '';
        if (id && id.length > MAX_LINK_ID_LENGTH) {
          return { valid: false, error: `context.links[${i}].id must be ${MAX_LINK_ID_LENGTH} characters or fewer` };
        }
        if (!url) {
          return { valid: false, error: `context.links[${i}].url is required` };
        }
        if (url.length > MAX_LINK_URL_LENGTH) {
          return { valid: false, error: `context.links[${i}].url must be ${MAX_LINK_URL_LENGTH} characters or fewer` };
        }
        const injection = detectInjectionPatterns(url);
        if (injection) {
          return { valid: false, error: `context.links[${i}]: ${injection}` };
        }
      } else {
        return { valid: false, error: `context.links[${i}] must be a string or { id, url }` };
      }
    }
  }

  return { valid: true };
}

// ── Sensitive-data (PII) detection ──────────────────────────────────────
// Lightweight regex sweep applied to every free-text field that reaches the server
// (basis, provenance notes, longform answers). Catches the obvious leaks
// (emails, phone numbers); the LLM PII pipeline in src/services/pii.ts is the
// deeper layer that runs on longform answers.
const SENSITIVE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(\+?\d[\d\s().-]{7,}\d)/,
];

export function detectSensitive(text: string, label: string = 'text'): string | null {
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      return `${label} appears to contain sensitive information (email or phone-like pattern)`;
    }
  }
  return null;
}

// ── Basis text validation ───────────────────────────────────────────────
export function validateBasis(basis: unknown): { valid: boolean; error?: string } {
  if (basis === undefined || basis === null) {
    return { valid: true };
  }
  if (typeof basis !== 'string') {
    return { valid: false, error: 'basis must be a string' };
  }
  if (basis.length > 1500) {
    return { valid: false, error: 'basis must be 1500 characters or fewer' };
  }
  const injection = detectInjectionPatterns(basis);
  if (injection) {
    return { valid: false, error: injection };
  }
  const sensitive = detectSensitive(basis, 'basis');
  if (sensitive) {
    return { valid: false, error: sensitive };
  }
  return { valid: true };
}

// ── Provenance validation ───────────────────────────────────────────────
// 'agent_kb' is deliberately absent: it is a bulk-express-only source type,
// injected and verified server-side against the agent's retrieved knowledge
// base (src/config/july-context.ts). Public submitters cannot claim it.
const PROVENANCE_SOURCE_TYPES = ['article', 'data_point', 'link', 'attachment', 'local', 'training'] as const;
const MAX_PROVENANCE_NOTE_LENGTH = 140;
const MAX_PROVENANCE_LOCAL_SUMMARY_LENGTH = 200;

export function validateProvenance(
  provenance: unknown,
  ctx: { articleIds: Set<string>; dataPointIds: Set<string>; linkIds: Set<string>; attachmentIds: Set<string> },
): { valid: boolean; error?: string; sanitized?: ProvenancePayload } {
  if (provenance === undefined || provenance === null) {
    return { valid: false, error: 'provenance is required' };
  }
  if (typeof provenance !== 'object' || Array.isArray(provenance)) {
    return { valid: false, error: 'provenance must be an object' };
  }
  const raw = provenance as any;
  const sources = raw.sources;
  if (!Array.isArray(sources) || sources.length === 0) {
    return { valid: false, error: 'provenance.sources must be a non-empty array' };
  }
  if (sources.length > 5) {
    return { valid: false, error: 'provenance.sources must have at most 5 items' };
  }

  const sanitizedSources = [];
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    if (typeof source !== 'object' || source === null || Array.isArray(source)) {
      return { valid: false, error: `provenance.sources[${i}] must be an object` };
    }
    const type = source.type;
    if (!PROVENANCE_SOURCE_TYPES.includes(type)) {
      return { valid: false, error: `provenance.sources[${i}].type must be one of: ${PROVENANCE_SOURCE_TYPES.join(', ')}` };
    }
    const id = source.id;
    const note = source.note;

    if (type === 'article' || type === 'data_point' || type === 'link') {
      if (!id || typeof id !== 'string') {
        return { valid: false, error: `provenance.sources[${i}].id is required for ${type}` };
      }
      if (type === 'article' && !ctx.articleIds.has(id)) {
        return { valid: false, error: `provenance.sources[${i}].id does not match a market article` };
      }
      if (type === 'data_point' && !ctx.dataPointIds.has(id)) {
        return { valid: false, error: `provenance.sources[${i}].id does not match a market data_point` };
      }
      if (type === 'link' && !ctx.linkIds.has(id)) {
        return { valid: false, error: `provenance.sources[${i}].id does not match a market link` };
      }
    } else if (type === 'attachment') {
      if (!id || typeof id !== 'string') {
        return { valid: false, error: `provenance.sources[${i}].id is required for attachment` };
      }
      if (!ctx.attachmentIds.has(id)) {
        return { valid: false, error: `provenance.sources[${i}].id does not match a market attachment` };
      }
    } else {
      if (id !== undefined && id !== null) {
        return { valid: false, error: `provenance.sources[${i}].id is not allowed for ${type}` };
      }
    }

    if (note !== undefined && note !== null) {
      if (typeof note !== 'string') {
        return { valid: false, error: `provenance.sources[${i}].note must be a string` };
      }
      if (note.length > MAX_PROVENANCE_NOTE_LENGTH) {
        return { valid: false, error: `provenance.sources[${i}].note must be ${MAX_PROVENANCE_NOTE_LENGTH} characters or fewer` };
      }
      const injection = detectInjectionPatterns(note);
      if (injection) {
        return { valid: false, error: `provenance.sources[${i}].note: ${injection}` };
      }
      const sensitive = detectSensitive(note, `provenance.sources[${i}].note`);
      if (sensitive) {
        return { valid: false, error: sensitive };
      }
    }

    sanitizedSources.push({ type, ...(id ? { id } : {}), ...(note ? { note } : {}) });
  }

  const localSummary = raw.local_summary;
  if (localSummary !== undefined && localSummary !== null) {
    if (typeof localSummary !== 'string') {
      return { valid: false, error: 'provenance.local_summary must be a string' };
    }
    if (localSummary.length > MAX_PROVENANCE_LOCAL_SUMMARY_LENGTH) {
      return { valid: false, error: `provenance.local_summary must be ${MAX_PROVENANCE_LOCAL_SUMMARY_LENGTH} characters or fewer` };
    }
    const injection = detectInjectionPatterns(localSummary);
    if (injection) {
      return { valid: false, error: `provenance.local_summary: ${injection}` };
    }
    const sensitive = detectSensitive(localSummary, 'provenance.local_summary');
    if (sensitive) {
      return { valid: false, error: sensitive };
    }
  }

  return {
    valid: true,
    sanitized: {
      sources: sanitizedSources,
      ...(localSummary ? { local_summary: localSummary } : {}),
    },
  };
}

const VALID_KNOWLEDGE_SOURCES: KnowledgeSource[] = ['any', 'provided_context_only', 'training_knowledge', 'local_only'];

export function validateKnowledgeSource(value: unknown): { valid: boolean; error?: string; sanitized?: KnowledgeSource } {
  if (value === undefined || value === null) {
    return { valid: true, sanitized: 'any' };
  }
  if (typeof value !== 'string') {
    return { valid: false, error: 'knowledge_source must be a string' };
  }
  if (!VALID_KNOWLEDGE_SOURCES.includes(value as KnowledgeSource)) {
    return { valid: false, error: `knowledge_source must be one of: ${VALID_KNOWLEDGE_SOURCES.join(', ')}` };
  }
  return { valid: true, sanitized: value as KnowledgeSource };
}

// Allowlist: alphanumeric, spaces, hyphens, apostrophes, periods, commas
const SAFE_OPTION_PATTERN = /^[a-zA-Z0-9 \-'.,:!?()]+$/;
const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;
const MAX_OPTION_LENGTH = 100;

export function validateAnswerOptions(options: unknown): { valid: boolean; error?: string; sanitized?: string[] } {
  if (!Array.isArray(options)) {
    return { valid: false, error: 'answer_options must be an array' };
  }

  if (options.length < MIN_OPTIONS) {
    return { valid: false, error: `answer_options must have at least ${MIN_OPTIONS} options` };
  }

  if (options.length > MAX_OPTIONS) {
    return { valid: false, error: `answer_options must have at most ${MAX_OPTIONS} options` };
  }

  const sanitized: string[] = [];
  const seen = new Set<string>();

  for (const opt of options) {
    if (typeof opt !== 'string') {
      return { valid: false, error: 'Each answer option must be a string' };
    }

    const trimmed = opt.trim();

    if (trimmed.length === 0) {
      return { valid: false, error: 'Answer options cannot be empty' };
    }

    if (trimmed.length > MAX_OPTION_LENGTH) {
      return { valid: false, error: `Answer options must be ${MAX_OPTION_LENGTH} characters or fewer` };
    }

    if (!SAFE_OPTION_PATTERN.test(trimmed)) {
      return { valid: false, error: `Answer option "${trimmed}" contains invalid characters. Only letters, numbers, spaces, hyphens, apostrophes, periods, commas, and basic punctuation are allowed.` };
    }

    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) {
      return { valid: false, error: `Duplicate answer option: "${trimmed}"` };
    }
    seen.add(lower);
    sanitized.push(trimmed);
  }

  return { valid: true, sanitized };
}

export function validateResponseConstraints(constraints: unknown): { valid: boolean; error?: string; sanitized?: ResponseConstraints } {
  if (!constraints || typeof constraints !== 'object') {
    return { valid: false, error: 'response_constraints must be an object' };
  }

  const c = constraints as Record<string, unknown>;

  if (typeof c.min_length !== 'number' || !Number.isInteger(c.min_length) || c.min_length < 1) {
    return { valid: false, error: 'response_constraints.min_length must be a positive integer' };
  }

  if (typeof c.max_length !== 'number' || !Number.isInteger(c.max_length) || c.max_length < 1 || c.max_length > 10000) {
    return { valid: false, error: 'response_constraints.max_length must be an integer between 1 and 10000' };
  }

  if (c.min_length >= c.max_length) {
    return { valid: false, error: 'response_constraints.min_length must be less than max_length' };
  }

  if (c.format_instructions !== undefined) {
    if (typeof c.format_instructions !== 'string' || c.format_instructions.length > 500) {
      return { valid: false, error: 'response_constraints.format_instructions must be a string of 500 characters or fewer' };
    }
  }

  if (c.topic_focus !== undefined) {
    if (typeof c.topic_focus !== 'string' || c.topic_focus.length > 200) {
      return { valid: false, error: 'response_constraints.topic_focus must be a string of 200 characters or fewer' };
    }
  }

  return {
    valid: true,
    sanitized: {
      min_length: c.min_length as number,
      max_length: c.max_length as number,
      ...(c.format_instructions !== undefined && { format_instructions: c.format_instructions as string }),
      ...(c.topic_focus !== undefined && { topic_focus: c.topic_focus as string }),
    },
  };
}

export function validateMultiChoiceAnswer(
  answer: unknown,
  options: string[]
): { valid: boolean; error?: string } {
  if (typeof answer !== 'string') {
    return { valid: false, error: 'Answer must be a JSON array string of selected options' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(answer);
  } catch {
    return { valid: false, error: 'Answer must be a valid JSON array of selected options' };
  }

  if (!Array.isArray(parsed)) {
    return { valid: false, error: 'Answer must be a JSON array of selected options' };
  }

  if (parsed.length === 0) {
    return { valid: false, error: 'Must select at least one option' };
  }

  const seen = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== 'string') {
      return { valid: false, error: 'Each selected option must be a string' };
    }
    const lower = item.toLowerCase();
    if (seen.has(lower)) {
      return { valid: false, error: `Duplicate selection: "${item}"` };
    }
    seen.add(lower);
    if (!options.some(o => o.toLowerCase() === lower)) {
      return { valid: false, error: `Invalid option: "${item}". Must be one of: ${options.join(', ')}` };
    }
  }

  return { valid: true };
}

export function validateRankingAnswer(
  answer: unknown,
  options: string[]
): { valid: boolean; error?: string } {
  if (typeof answer !== 'string') {
    return { valid: false, error: 'Answer must be a JSON array ranking all options' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(answer);
  } catch {
    return { valid: false, error: 'Answer must be a valid JSON array ranking all options' };
  }

  if (!Array.isArray(parsed)) {
    return { valid: false, error: 'Answer must be a JSON array ranking all options' };
  }

  if (parsed.length !== options.length) {
    return { valid: false, error: `Must rank all ${options.length} options (got ${parsed.length})` };
  }

  const seen = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== 'string') {
      return { valid: false, error: 'Each ranked option must be a string' };
    }
    const lower = item.toLowerCase();
    if (seen.has(lower)) {
      return { valid: false, error: `Duplicate in ranking: "${item}"` };
    }
    seen.add(lower);
    if (!options.some(o => o.toLowerCase() === lower)) {
      return { valid: false, error: `Invalid option in ranking: "${item}". Must be one of: ${options.join(', ')}` };
    }
  }

  return { valid: true };
}

export function validateScaleAnswer(
  answer: unknown,
  config: { min: number; max: number }
): { valid: boolean; error?: string } {
  if (typeof answer === 'string') {
    const num = Number(answer);
    if (isNaN(num) || !Number.isInteger(num)) {
      return { valid: false, error: `Answer must be an integer between ${config.min} and ${config.max}` };
    }
    if (num < config.min || num > config.max) {
      return { valid: false, error: `Answer must be between ${config.min} and ${config.max} (got ${num})` };
    }
    return { valid: true };
  }
  if (typeof answer === 'number') {
    if (!Number.isInteger(answer)) {
      return { valid: false, error: `Answer must be an integer between ${config.min} and ${config.max}` };
    }
    if (answer < config.min || answer > config.max) {
      return { valid: false, error: `Answer must be between ${config.min} and ${config.max} (got ${answer})` };
    }
    return { valid: true };
  }
  return { valid: false, error: `Answer must be an integer between ${config.min} and ${config.max}` };
}

export function validateScaleConfig(config: unknown): { valid: boolean; error?: string; sanitized?: { min: number; max: number } } {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { valid: false, error: 'Scale config must be an object with { min, max }' };
  }

  const c = config as Record<string, unknown>;

  if (typeof c.min !== 'number' || !Number.isInteger(c.min)) {
    return { valid: false, error: 'Scale config min must be an integer' };
  }
  if (typeof c.max !== 'number' || !Number.isInteger(c.max)) {
    return { valid: false, error: 'Scale config max must be an integer' };
  }
  if (c.min >= c.max) {
    return { valid: false, error: 'Scale config min must be less than max' };
  }
  if (c.max - c.min > 100) {
    return { valid: false, error: 'Scale range must not exceed 100 points' };
  }

  return { valid: true, sanitized: { min: c.min as number, max: c.max as number } };
}

export function validateLongformAnswer(
  answer: unknown,
  constraints: ResponseConstraints
): { valid: boolean; error?: string } {
  if (typeof answer !== 'string') {
    return { valid: false, error: 'Answer must be a string' };
  }

  const trimmed = answer.trim();

  if (trimmed.length < constraints.min_length) {
    return { valid: false, error: `Answer must be at least ${constraints.min_length} characters (got ${trimmed.length})` };
  }

  if (trimmed.length > constraints.max_length) {
    return { valid: false, error: `Answer must be at most ${constraints.max_length} characters (got ${trimmed.length})` };
  }

  return { valid: true };
}
