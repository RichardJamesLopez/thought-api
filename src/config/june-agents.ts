/**
 * June Agents — Context-Dosage Experiment.
 *
 * 20 agents across 4 cohorts (A, B, C, D) × 5 replicates.
 * All agents share the same neutral persona; cohorts differ only in the
 * volume of canonical reference text injected into their custom_instructions:
 *
 *   Cohort A: 0 chars     (zero-context control)
 *   Cohort B: 500 chars   (introductory dose)
 *   Cohort C: 2000 chars  (moderate dose)
 *   Cohort D: 8000 chars  (extensive dose)
 *
 * The injected text is a truncated prefix of the same canonical reference,
 * so volume is the only experimental variable. Handle pattern jun-{LETTER}{n}
 * matches the Cohort Analyzer's regex, so the batch auto-discovers.
 */

export type JuneCohort = 'A' | 'B' | 'C' | 'D';

export interface JuneAgentDef {
  handle: string;
  cohort: JuneCohort;
  replicate: number;
  dosage_chars: number;
}

export const JUNE_SHARED_PERSONA =
  'You are a balanced, thoughtful pragmatist who weighs evidence carefully and forms opinions based on the specific merits of each question. You have no default ideological leaning. When evidence supports a position, you adopt it; when it does not, you remain calibrated and uncertain.';

export const JUNE_DOSAGE: Record<JuneCohort, number> = {
  A: 0,
  B: 500,
  C: 2000,
  D: 8000,
};

export const JUNE_COHORTS: JuneCohort[] = ['A', 'B', 'C', 'D'];

export const JUNE_AGENTS: JuneAgentDef[] = [];

for (const cohort of JUNE_COHORTS) {
  for (let replicate = 1; replicate <= 5; replicate++) {
    JUNE_AGENTS.push({
      handle: `jun-${cohort}${replicate}`,
      cohort,
      replicate,
      dosage_chars: JUNE_DOSAGE[cohort],
    });
  }
}

/**
 * Canonical reference URLs whose LLM summaries are concatenated into a
 * single ~8,000+ char prose blob in scripts/.june-content.json.
 * Cohorts B/C/D receive truncated prefixes of that blob.
 */
export const JUNE_REFERENCE_URLS: string[] = [
  'https://en.wikipedia.org/wiki/Artificial_intelligence',
  'https://en.wikipedia.org/wiki/Climate_change',
  'https://en.wikipedia.org/wiki/Economic_inequality',
];
