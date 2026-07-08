/**
 * July Agents — Corpus-Intensity Experiment.
 *
 * 25 agents across 5 cohorts (A–E) × 5 replicates. All agents share the same
 * neutral persona; cohorts differ only in the knowledge base available to them
 * at opinion-expression time:
 *
 *   Cohort A: control        — no July knowledge base
 *   Cohort B: 2,000-char digest — balanced across all themes (no retrieval)
 *   Cohort C: 10-document corpus  ┐ retrieval cohorts: identical visible
 *   Cohort D: 100-document corpus ├ budget (top-K source cards per market),
 *   Cohort E: 1,000-document corpus ┘ nested corpora (C ⊂ D ⊂ E)
 *
 * Unlike June (per-agent prefix truncation of one blob), the July treatment is
 * the SIZE OF THE CORPUS retrieval draws from — the visible prompt budget is
 * held constant across C/D/E. Handle pattern jul-{LETTER}{n} matches the
 * Cohort Analyzer's regex, so the batch auto-discovers.
 */

export type JulyCohort = 'A' | 'B' | 'C' | 'D' | 'E';

export type JulyTreatment =
  | { kind: 'control' }
  | { kind: 'digest'; digest_chars: number }
  | { kind: 'corpus'; corpus_docs: number };

export interface JulyAgentDef {
  handle: string;
  cohort: JulyCohort;
  replicate: number;
  treatment: JulyTreatment;
}

export const JULY_SHARED_PERSONA =
  'You are a balanced, thoughtful pragmatist who weighs evidence carefully and forms opinions based on the specific merits of each question. You have no default ideological leaning. When evidence supports a position, you adopt it; when it does not, you remain calibrated and uncertain.';

export const JULY_TREATMENTS: Record<JulyCohort, JulyTreatment> = {
  A: { kind: 'control' },
  B: { kind: 'digest', digest_chars: 2000 },
  C: { kind: 'corpus', corpus_docs: 10 },
  D: { kind: 'corpus', corpus_docs: 100 },
  E: { kind: 'corpus', corpus_docs: 1000 },
};

/** Numeric treatment values for reporting (docs available; digest = 0 docs). */
export const JULY_CORPUS_DOCS: Record<JulyCohort, number> = {
  A: 0,
  B: 0,
  C: 10,
  D: 100,
  E: 1000,
};

export const JULY_COHORTS: JulyCohort[] = ['A', 'B', 'C', 'D', 'E'];

export const JULY_AGENTS: JulyAgentDef[] = [];

for (const cohort of JULY_COHORTS) {
  for (let replicate = 1; replicate <= 5; replicate++) {
    JULY_AGENTS.push({
      handle: `jul-${cohort}${replicate}`,
      cohort,
      replicate,
      treatment: JULY_TREATMENTS[cohort],
    });
  }
}

/** Retrieval budget shared by all corpus cohorts (C/D/E). */
export const JULY_RETRIEVAL_TOP_K = 8;
/** Cap on total visible characters of retrieved source cards per market. */
export const JULY_RETRIEVAL_MAX_CHARS = 4000;

export interface JulyTheme {
  key: string;
  label: string;
  /** MediaWiki category seeds crawled by scripts/fetch-july-documents.ts. */
  categories: string[];
}

/**
 * Expanded theme set (vs June's 3). A 1,000-doc corpus over 3 themes collapses
 * into near-identical top-K retrievals across tiers; breadth here is what lets
 * the D/E corpora actually change what gets retrieved per market.
 */
export const JULY_THEMES: JulyTheme[] = [
  { key: 'ai', label: 'Artificial intelligence', categories: ['Category:Artificial intelligence', 'Category:Machine learning', 'Category:Ethics of artificial intelligence'] },
  { key: 'climate', label: 'Climate change', categories: ['Category:Climate change', 'Category:Climate change policy', 'Category:Renewable energy'] },
  { key: 'inequality', label: 'Economic inequality', categories: ['Category:Economic inequality', 'Category:Income distribution', 'Category:Wealth concentration'] },
  { key: 'energy', label: 'Energy policy', categories: ['Category:Energy policy', 'Category:Energy transition', 'Category:Nuclear power'] },
  { key: 'labor', label: 'Labor and automation', categories: ['Category:Automation', 'Category:Labour economics', 'Category:Future of work'] },
  { key: 'health', label: 'Public health', categories: ['Category:Public health', 'Category:Health policy', 'Category:Global health'] },
  { key: 'housing', label: 'Housing and urbanization', categories: ['Category:Housing', 'Category:Urbanization', 'Category:Affordable housing'] },
];

/** Evidence-type buckets used to balance corpus tiers. */
export type JulyEvidenceType = 'concept' | 'policy' | 'event' | 'organization' | 'debate';

export const JULY_EVIDENCE_TYPES: JulyEvidenceType[] = ['concept', 'policy', 'event', 'organization', 'debate'];
