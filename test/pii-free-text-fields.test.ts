/**
 * Unit tests for redactFreeTextFields — PII filtering across basis +
 * provenance.local_summary + provenance.sources[].note. Per CEO plan D7
 * the helper fires per-field redactions in parallel; per D5 basis-PII never
 * triggers a 400 (the caller redacts and stores).
 *
 * These tests run against the regex provider so they're deterministic and
 * fast — set PII_REDACTION_PROVIDER=regex in beforeAll. The OpenAI provider
 * is covered separately in pii.test.ts / pii-pipeline.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { redactFreeTextFields } from '../src/services/pii';

describe('redactFreeTextFields', () => {
  const originalProvider = process.env.PII_REDACTION_PROVIDER;
  beforeAll(() => { process.env.PII_REDACTION_PROVIDER = 'regex'; });
  afterAll(() => {
    if (originalProvider === undefined) delete process.env.PII_REDACTION_PROVIDER;
    else process.env.PII_REDACTION_PROVIDER = originalProvider;
  });

  it('clean basis + clean provenance → severity clean, no findings', async () => {
    const result = await redactFreeTextFields({
      basis: 'clean text no pii here whatsoever to find',
      provenance: { sources: [{ type: 'local', note: 'local file note here' }], local_summary: 'clean summary text' },
    });
    expect(result.severity).toBe('clean');
    expect(result.basis_findings).toEqual([]);
    expect(result.provenance_findings).toEqual([]);
    expect(result.basis_redacted).toBe('clean text no pii here whatsoever to find');
  });

  it('basis with EMAIL: severity reject, redacted, no 400 (caller decides)', async () => {
    const result = await redactFreeTextFields({
      basis: 'reach me at someone@example.com if you want to follow up later',
      provenance: { sources: [], local_summary: undefined },
    });
    expect(result.severity).toBe('reject');
    expect(result.basis_findings.map(f => f.category)).toContain('EMAIL');
    expect(result.basis_redacted).toMatch(/\[EMAIL\]/);
    expect(result.basis_redacted).not.toMatch(/someone@example\.com/);
  });

  it('basis with PHONE: severity reject, redacted', async () => {
    const result = await redactFreeTextFields({
      basis: 'call me at +1-555-123-4567 anytime',
      provenance: { sources: [], local_summary: undefined },
    });
    expect(result.severity).toBe('reject');
    expect(result.basis_findings.map(f => f.category)).toContain('PHONE');
    expect(result.basis_redacted).toMatch(/\[PHONE\]/);
  });

  it('provenance.local_summary with PII: provenance_findings populated, basis untouched', async () => {
    const result = await redactFreeTextFields({
      basis: 'clean basis text here just analysis no pii',
      provenance: { sources: [], local_summary: 'summary mentions admin@example.org as the source' },
    });
    expect(result.basis_findings).toEqual([]);
    expect(result.provenance_findings.map(f => f.category)).toContain('EMAIL');
    expect(result.provenance_redacted.local_summary).toMatch(/\[EMAIL\]/);
    expect(result.severity).toBe('reject');
  });

  it('provenance.sources[].note with PII: redacted in place', async () => {
    const result = await redactFreeTextFields({
      basis: undefined,
      provenance: {
        sources: [
          { type: 'local', note: 'from my notes alice@example.com wrote this' },
          { type: 'local', note: 'second source clean text here' },
        ],
        local_summary: undefined,
      },
    });
    expect(result.provenance_redacted.sources[0].note).toMatch(/\[EMAIL\]/);
    expect(result.provenance_redacted.sources[1].note).toBe('second source clean text here');
    expect(result.severity).toBe('reject');
  });

  it('basis undefined → no findings for basis; runs only provenance', async () => {
    const result = await redactFreeTextFields({
      basis: undefined,
      provenance: { sources: [{ type: 'local', note: 'clean enough note here' }], local_summary: undefined },
    });
    expect(result.basis_findings).toEqual([]);
    expect(result.basis_redacted).toBeNull();
    expect(result.severity).toBe('clean');
  });

  it('basis empty string → no findings, no LLM call', async () => {
    const result = await redactFreeTextFields({
      basis: '',
      provenance: { sources: [], local_summary: undefined },
    });
    expect(result.basis_findings).toEqual([]);
    expect(result.basis_redacted).toBeNull();
    expect(result.severity).toBe('clean');
  });

  it('empty provenance.sources + missing local_summary → no provenance findings', async () => {
    const result = await redactFreeTextFields({
      basis: 'clean basis text just analysis',
      provenance: { sources: [], local_summary: undefined },
    });
    expect(result.provenance_findings).toEqual([]);
    expect(result.severity).toBe('clean');
  });

  it('both fields have PII: severity reflects max (reject)', async () => {
    const result = await redactFreeTextFields({
      basis: 'my email a@b.com is in the basis',
      provenance: { sources: [{ type: 'local', note: 'and phone +1-555-999-1234 here too' }], local_summary: undefined },
    });
    expect(result.basis_findings.length).toBeGreaterThan(0);
    expect(result.provenance_findings.length).toBeGreaterThan(0);
    expect(result.severity).toBe('reject');
  });

  it('preserves non-note provenance source fields untouched', async () => {
    const result = await redactFreeTextFields({
      basis: undefined,
      provenance: {
        sources: [{ type: 'article', id: 'art-1', note: 'clean note about the article reference' }],
        local_summary: undefined,
      },
    });
    expect(result.provenance_redacted.sources[0].type).toBe('article');
    expect(result.provenance_redacted.sources[0].id).toBe('art-1');
  });

  it('basis under 20 chars uses regex-only (short-field optimization)', async () => {
    // "short clean" is < 20 chars; regex returns severity clean with no findings.
    const result = await redactFreeTextFields({
      basis: 'short clean',
      provenance: { sources: [], local_summary: undefined },
    });
    expect(result.severity).toBe('clean');
    // We can't directly assert "no LLM call" without spying, but if the
    // regex provider was used (per beforeAll), this just confirms no false
    // positives on short inputs.
  });
});
