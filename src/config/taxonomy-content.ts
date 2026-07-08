/**
 * Runtime loader for taxonomy agent context.
 *
 * Reads the cached URL summaries from .taxonomy-content.json and builds
 * context strings for each taxonomy agent at opinion-expression time.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TAXONOMY_TOPICS, TAXONOMY_AGENTS, GROUP_TOPICS } from './taxonomy-agents.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_FILE = join(__dirname, '../../scripts/.taxonomy-content.json');

interface LinkSummary {
  url: string;
  title: string;
  summary: string;
  fetched_at: string;
}

type ContentCache = Record<string, LinkSummary[]>;

let contentCache: ContentCache | null = null;

function loadContent(): ContentCache {
  if (contentCache) return contentCache;

  if (!existsSync(CONTENT_FILE)) {
    console.warn('taxonomy-content: .taxonomy-content.json not found — run npm run scripts:fetch-taxonomy first');
    contentCache = {};
    return contentCache;
  }

  try {
    contentCache = JSON.parse(readFileSync(CONTENT_FILE, 'utf-8'));
    return contentCache!;
  } catch {
    console.warn('taxonomy-content: Failed to parse .taxonomy-content.json');
    contentCache = {};
    return contentCache;
  }
}

/**
 * Build the full knowledge-base context string for a taxonomy agent.
 * Returns null if the handle doesn't match a taxonomy agent.
 */
export function getTaxonomyContext(handle: string): string | null {
  const agent = TAXONOMY_AGENTS.find(a => a.handle === handle);
  if (!agent) return null;

  const content = loadContent();
  if (Object.keys(content).length === 0) return null;

  const topicKeys = GROUP_TOPICS[agent.group];
  const sections: string[] = [];

  for (const topicKey of topicKeys) {
    const topic = TAXONOMY_TOPICS[topicKey];
    const topicContent = content[topicKey];
    if (!topicContent || topicContent.length === 0) continue;

    const linksToUse = topicContent.slice(0, agent.depth);
    const lines = linksToUse
      .filter(l => l.summary && !l.summary.startsWith('['))
      .map(l => `- ${l.summary}`);

    if (lines.length > 0) {
      sections.push(`## ${topic.name}\n${lines.join('\n')}`);
    }
  }

  return sections.length > 0 ? sections.join('\n\n') : null;
}
