/**
 * Runtime loader for June agent context.
 *
 * Reads the cached canonical reference text from .june-content.json (a
 * single concatenated prose blob of ~8,000+ chars) and returns the
 * dosage-truncated prefix for each June agent at opinion-expression time.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JUNE_AGENTS } from './june-agents.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_FILE = join(__dirname, '../../scripts/.june-content.json');

interface JuneContentFile {
  canonical_text: string;
  fetched_at: string;
  sources: string[];
}

let cache: JuneContentFile | null = null;

function loadContent(): JuneContentFile | null {
  if (cache) return cache;

  if (!existsSync(CONTENT_FILE)) {
    console.warn('june-context: .june-content.json not found — run npm run scripts:june-content first');
    return null;
  }

  try {
    cache = JSON.parse(readFileSync(CONTENT_FILE, 'utf-8')) as JuneContentFile;
    return cache;
  } catch {
    console.warn('june-context: Failed to parse .june-content.json');
    return null;
  }
}

/**
 * Returns the dosage-truncated knowledge-base context for a June agent.
 * Cohort A (dosage_chars = 0) returns null — no context injected.
 * Returns null if the handle is not a June agent or the content file is missing.
 */
export function getJuneContext(handle: string): string | null {
  const agent = JUNE_AGENTS.find(a => a.handle === handle);
  if (!agent) return null;
  if (agent.dosage_chars === 0) return null;

  const content = loadContent();
  if (!content || !content.canonical_text) return null;

  return content.canonical_text.slice(0, agent.dosage_chars);
}
