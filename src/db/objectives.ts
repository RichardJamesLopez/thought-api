/**
 * Agent objective functions.
 * Agents call GET /agents/objective/:index to receive their objective text.
 * Bucket assignment is automatic: indices are evenly divided across objectives.
 *
 * Objective text and MAX_AGENTS are defined in src/config/agents.ts.
 */

import { OBJECTIVES, runtimeConfig } from '../config/agents.js';

export const objectives = OBJECTIVES;

export function getObjective(index: number): string {
  const numBuckets = objectives.length;
  const agentCount = runtimeConfig.AGENT_COUNT;
  const bucketSize = Math.ceil(agentCount / numBuckets);
  const bucket = Math.floor(index / bucketSize);
  const clampedBucket = Math.min(bucket, numBuckets - 1);
  return objectives[clampedBucket];
}
