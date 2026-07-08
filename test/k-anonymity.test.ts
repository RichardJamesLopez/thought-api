/**
 * Unit tests for K-anonymity bucket suppression and cohort param parsing.
 * Pure functions — no server, no DB.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  applyKAnonymity,
  resolveCohortParam,
  getKAnonymityThreshold,
  maskCount,
  computeCohortBreakdown,
} from '../src/services/results';

describe('applyKAnonymity (per-bucket suppression)', () => {
  it('returns counts unchanged when every bucket meets K', () => {
    const result = applyKAnonymity({ yes: 10, no: 8 }, 5);
    expect(result).toEqual({ yes: 10, no: 8 });
  });

  it('collapses sub-K buckets into <suppressed>', () => {
    const result = applyKAnonymity({ yes: 10, no: 3 }, 5);
    expect(result).toEqual({ yes: 10, '<suppressed>': 3 });
  });

  it('aggregates multiple sub-K buckets together', () => {
    const result = applyKAnonymity({ a: 12, b: 2, c: 1, d: 4 }, 5);
    expect(result).toEqual({ a: 12, '<suppressed>': 7 });
  });

  it('preserves zero buckets (no individual revealed)', () => {
    const result = applyKAnonymity({ yes: 10, no: 0 }, 5);
    expect(result).toEqual({ yes: 10, no: 0 });
  });

  it('treats K=1 as no suppression', () => {
    const result = applyKAnonymity({ yes: 1, no: 1 }, 1);
    expect(result).toEqual({ yes: 1, no: 1 });
  });

  it('boundary: count exactly K is exposed; count K-1 is suppressed', () => {
    const result = applyKAnonymity({ exactly_k: 5, below_k: 4 }, 5);
    expect(result).toEqual({ exactly_k: 5, '<suppressed>': 4 });
  });

  it('skips suppression when values look like ranking borda scores', () => {
    // Borda counts produce non-integer-or-clearly-aggregate values; the heuristic
    // checks for non-integer values to detect this.
    const result = applyKAnonymity({ a: 7.5, b: 3.5 }, 5);
    expect(result).toEqual({ a: 7.5, b: 3.5 });
  });
});

describe('resolveCohortParam', () => {
  const originalEnv = process.env.LEGACY_RESULT_COHORT;
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.LEGACY_RESULT_COHORT;
    else process.env.LEGACY_RESULT_COHORT = originalEnv;
  });

  it('defaults to human when no query and no env', () => {
    delete process.env.LEGACY_RESULT_COHORT;
    expect(resolveCohortParam(undefined)).toBe('human');
  });

  it('respects explicit ?cohort=synthetic', () => {
    expect(resolveCohortParam('synthetic')).toBe('synthetic');
  });

  it('respects explicit ?cohort=all', () => {
    expect(resolveCohortParam('all')).toBe('all');
  });

  it('falls back to default for unknown values', () => {
    delete process.env.LEGACY_RESULT_COHORT;
    expect(resolveCohortParam('garbage')).toBe('human');
  });

  it('lets LEGACY_RESULT_COHORT=all flip the default during rollout', () => {
    process.env.LEGACY_RESULT_COHORT = 'all';
    expect(resolveCohortParam(undefined)).toBe('all');
  });
});

describe('maskCount (single-count K-anon)', () => {
  it('preserves a zero count', () => {
    expect(maskCount(0, 5)).toBe(0);
  });

  it('returns the count when at or above K', () => {
    expect(maskCount(5, 5)).toBe(5);
    expect(maskCount(99, 5)).toBe(99);
  });

  it("returns '<K' for counts in 1..K-1", () => {
    expect(maskCount(1, 5)).toBe('<K');
    expect(maskCount(4, 5)).toBe('<K');
  });

  it('K=1 means no masking (every count exposed)', () => {
    expect(maskCount(1, 1)).toBe(1);
  });
});

describe('computeCohortBreakdown', () => {
  it('zero synthetic in any cohort → excluded_synthetic false, no masking', () => {
    const out = computeCohortBreakdown(10, 0, 'human', 5);
    expect(out).toEqual({ human: 10, synthetic: 0, requested: 'human', excluded_synthetic: false });
  });

  it('synthetic ≥ K, cohort=human → human excludes synthetic (true)', () => {
    const out = computeCohortBreakdown(10, 12, 'human', 5);
    expect(out).toEqual({ human: 10, synthetic: 12, requested: 'human', excluded_synthetic: true });
  });

  it('synthetic ≥ K, cohort=all → synthetic NOT excluded (false)', () => {
    const out = computeCohortBreakdown(10, 12, 'all', 5);
    expect(out).toEqual({ human: 10, synthetic: 12, requested: 'all', excluded_synthetic: false });
  });

  it('synthetic in 1..K-1 → excluded_synthetic masked (regardless of cohort)', () => {
    const out = computeCohortBreakdown(10, 3, 'human', 5);
    expect(out).toEqual({ human: 10, synthetic: '<K', requested: 'human', excluded_synthetic: 'masked' });
  });

  it('synthetic in 1..K-1, cohort=all → still masked (existence hidden)', () => {
    const out = computeCohortBreakdown(10, 3, 'all', 5);
    expect(out.excluded_synthetic).toBe('masked');
  });

  it('both human and synthetic below K → both masked', () => {
    const out = computeCohortBreakdown(3, 3, 'human', 5);
    expect(out).toEqual({ human: '<K', synthetic: '<K', requested: 'human', excluded_synthetic: 'masked' });
  });

  it('boundary: synthetic exactly K exposes the count and the exclusion flag', () => {
    const out = computeCohortBreakdown(10, 5, 'human', 5);
    expect(out).toEqual({ human: 10, synthetic: 5, requested: 'human', excluded_synthetic: true });
  });

  it('K=1 disables all masking', () => {
    const out = computeCohortBreakdown(1, 1, 'human', 1);
    expect(out).toEqual({ human: 1, synthetic: 1, requested: 'human', excluded_synthetic: true });
  });
});

describe('getKAnonymityThreshold', () => {
  const originalEnv = process.env.K_ANONYMITY_THRESHOLD;
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.K_ANONYMITY_THRESHOLD;
    else process.env.K_ANONYMITY_THRESHOLD = originalEnv;
  });

  it('defaults to 5', () => {
    delete process.env.K_ANONYMITY_THRESHOLD;
    expect(getKAnonymityThreshold()).toBe(5);
  });

  it('reads a positive integer from env', () => {
    process.env.K_ANONYMITY_THRESHOLD = '10';
    expect(getKAnonymityThreshold()).toBe(10);
  });

  it('rejects non-numeric env values and falls back to 5', () => {
    process.env.K_ANONYMITY_THRESHOLD = 'banana';
    expect(getKAnonymityThreshold()).toBe(5);
  });

  it('rejects zero / negative values', () => {
    process.env.K_ANONYMITY_THRESHOLD = '0';
    expect(getKAnonymityThreshold()).toBe(5);
  });
});
