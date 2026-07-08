import type { KnowledgeSource, ProvenancePayload } from '../types.js';

const CONTEXT_TYPES = new Set(['article', 'data_point', 'link', 'attachment', 'agent_kb']);

export function computeProvenanceScore(
  provenance: ProvenancePayload,
  knowledgeSource: KnowledgeSource,
): { score: number; missing_expected: boolean; misaligned: boolean } {
  const types = provenance.sources.map(s => s.type);
  const hasContextRef = types.some(t => CONTEXT_TYPES.has(t));
  const hasLocal = types.includes('local');
  const hasTraining = types.includes('training');

  let missingExpected = false;
  let misaligned = false;

  if (knowledgeSource === 'provided_context_only') {
    if (!hasContextRef) missingExpected = true;
    if (hasLocal || hasTraining) misaligned = true;
  } else if (knowledgeSource === 'local_only') {
    if (!hasLocal) missingExpected = true;
    if (hasContextRef || hasTraining) misaligned = true;
  } else if (knowledgeSource === 'training_knowledge') {
    if (!hasTraining) missingExpected = true;
    if (hasLocal || hasContextRef) misaligned = true;
  } else {
    missingExpected = false;
    misaligned = false;
  }

  let score = 1.0;
  if (missingExpected) score -= 0.3;
  if (misaligned) score -= 0.3;
  if (score < 0) score = 0;
  return { score: parseFloat(score.toFixed(2)), missing_expected: missingExpected, misaligned };
}
