/**
 * Unit tests for the longform PII pipeline (regex provider + severity logic).
 *
 * The OpenAI provider is exercised live by the smoke script in the PR description,
 * not by unit tests, since it depends on a network call.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { redactPII } from '../src/services/pii';

describe('redactPII (regex provider)', () => {
  const originalEnv = process.env.PII_REDACTION_PROVIDER;
  beforeEach(() => { process.env.PII_REDACTION_PROVIDER = 'regex'; });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PII_REDACTION_PROVIDER;
    else process.env.PII_REDACTION_PROVIDER = originalEnv;
  });

  it('returns clean for benign text', async () => {
    const r = await redactPII('I think the answer is yes because of evidence X.');
    expect(r.severity).toBe('clean');
    expect(r.findings).toHaveLength(0);
    expect(r.redacted).toBe('I think the answer is yes because of evidence X.');
    expect(r.provider).toBe('regex');
  });

  it('rejects on email (hard-PII)', async () => {
    const r = await redactPII('Reach me at jane.doe@example.com.');
    expect(r.severity).toBe('reject');
    expect(r.findings.some(f => f.category === 'EMAIL')).toBe(true);
    expect(r.redacted).toContain('[EMAIL]');
    expect(r.redacted).not.toContain('jane.doe@example.com');
  });

  it('rejects on phone number (hard-PII)', async () => {
    const r = await redactPII('Call me at +1 415-555-0100 anytime.');
    expect(r.severity).toBe('reject');
    expect(r.findings.some(f => f.category === 'PHONE')).toBe(true);
    expect(r.redacted).toContain('[PHONE]');
  });

  it('rejects on SSN-shaped string', async () => {
    const r = await redactPII('My SSN is 123-45-6789.');
    expect(r.severity).toBe('reject');
    expect(r.findings.some(f => f.category === 'SSN')).toBe(true);
    expect(r.redacted).toContain('[SSN]');
  });

  it('rejects on credit-card-shaped string', async () => {
    const r = await redactPII('Card: 4111 1111 1111 1111');
    expect(r.severity).toBe('reject');
    expect(r.findings.some(f => f.category === 'CREDIT_CARD')).toBe(true);
  });

  it('redacts and preserves surrounding text', async () => {
    const r = await redactPII('Email me — foo@bar.co — about this.');
    expect(r.redacted).toBe('Email me — [EMAIL] — about this.');
  });

  it('reports all findings, not just the first', async () => {
    const r = await redactPII('Reach me at a@b.com or +1 415-555-0100.');
    const cats = r.findings.map(f => f.category);
    expect(cats).toContain('EMAIL');
    expect(cats).toContain('PHONE');
  });
});

describe('redactPII (none provider)', () => {
  const originalEnv = process.env.PII_REDACTION_PROVIDER;
  beforeEach(() => { process.env.PII_REDACTION_PROVIDER = 'none'; });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PII_REDACTION_PROVIDER;
    else process.env.PII_REDACTION_PROVIDER = originalEnv;
  });

  it('queues for review without inspecting content', async () => {
    const r = await redactPII('anything goes here jane@example.com');
    expect(r.severity).toBe('review');
    expect(r.findings).toHaveLength(0);
    expect(r.provider).toBe('none');
    expect(r.redacted).toBe('anything goes here jane@example.com');
  });
});

describe('redactPII (openai fallback)', () => {
  const originalEnv = process.env.PII_REDACTION_PROVIDER;
  const originalKey = process.env.OPENAI_API_KEY;
  const originalLlmKey = process.env.LLM_API_KEY;
  beforeEach(() => {
    process.env.PII_REDACTION_PROVIDER = 'openai';
    delete process.env.OPENAI_API_KEY;
    delete process.env.LLM_API_KEY;
  });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PII_REDACTION_PROVIDER;
    else process.env.PII_REDACTION_PROVIDER = originalEnv;
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
    if (originalLlmKey !== undefined) process.env.LLM_API_KEY = originalLlmKey;
  });

  it('falls back to regex if OpenAI returns null (no API key)', async () => {
    const r = await redactPII('Email me at someone@example.org.');
    expect(r.provider).toBe('openai_fallback_regex');
    expect(r.severity).toBe('reject');
    expect(r.redacted).toContain('[EMAIL]');
  });
});
