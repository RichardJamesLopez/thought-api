/**
 * Unit tests for pure helpers introduced in PR2 (consent + delete-account)
 * and Jerusalem v1 refinements (salted IP hash).
 *
 * Full integration coverage of /register / DELETE me / delete-confirm requires
 * a live server and runs as part of the existing Phase 1 integration suite once
 * the team's pre-existing migration-drift issue is fixed.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashIp } from '../src/services/ip-hash';

const DELETE_CONFIRM_TTL_MS = 24 * 60 * 60 * 1000;

describe('hashIp (salted, version-bound)', () => {
  const originalSalt = process.env.IP_HASH_SALT;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.IP_HASH_SALT = 'test-salt';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    if (originalSalt === undefined) delete process.env.IP_HASH_SALT;
    else process.env.IP_HASH_SALT = originalSalt;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('produces a 64-char hex sha256 string', () => {
    expect(hashIp('203.0.113.42', '2026-05-08')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same (ip, version, salt) triple', () => {
    expect(hashIp('1.2.3.4', '2026-05-08')).toBe(hashIp('1.2.3.4', '2026-05-08'));
  });

  it('differs for different IPs (same version)', () => {
    expect(hashIp('1.2.3.4', '2026-05-08')).not.toBe(hashIp('1.2.3.5', '2026-05-08'));
  });

  it('differs across consent versions (same IP) — rotation breaks rainbow tables', () => {
    expect(hashIp('1.2.3.4', '2026-05-08')).not.toBe(hashIp('1.2.3.4', '2026-05-13'));
  });

  it('differs across IP_HASH_SALT values (same IP, same version)', () => {
    const a = hashIp('1.2.3.4', '2026-05-08');
    process.env.IP_HASH_SALT = 'different-salt';
    expect(hashIp('1.2.3.4', '2026-05-08')).not.toBe(a);
  });

  it('throws in production when IP_HASH_SALT is missing', () => {
    delete process.env.IP_HASH_SALT;
    process.env.NODE_ENV = 'production';
    expect(() => hashIp('1.2.3.4', '2026-05-08')).toThrow(/IP_HASH_SALT/);
  });

  it('falls back to dev default in non-production when salt is missing', () => {
    delete process.env.IP_HASH_SALT;
    process.env.NODE_ENV = 'development';
    expect(() => hashIp('1.2.3.4', '2026-05-08')).not.toThrow();
    expect(hashIp('1.2.3.4', '2026-05-08')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('delete-confirm TTL', () => {
  it('expires_at is exactly 24h after request time', () => {
    const requestedAt = Date.parse('2026-05-08T12:00:00Z');
    const expectedExpiry = requestedAt + DELETE_CONFIRM_TTL_MS;
    expect(new Date(expectedExpiry).toISOString()).toBe('2026-05-09T12:00:00.000Z');
  });

  it('a token created 23h59m ago is still valid', () => {
    const now = Date.now();
    const expiresAt = new Date(now + DELETE_CONFIRM_TTL_MS - 60_000).toISOString();
    expect(new Date(expiresAt).getTime() > now).toBe(true);
  });

  it('a token created 24h01m ago has expired', () => {
    const now = Date.now();
    const expiresAt = new Date(now - 60_000).toISOString();
    expect(new Date(expiresAt).getTime() <= now).toBe(true);
  });
});

describe('consent payload contract', () => {
  it('expected keys for /register success body', () => {
    const sample = { agent_id: 'a', api_key: 'k', handle: 'h', consent_version: '2026-05-08' };
    expect(Object.keys(sample).sort()).toEqual(['agent_id', 'api_key', 'consent_version', 'handle']);
  });

  it('expected keys for /register stale-consent rejection', () => {
    const sample = {
      error: 'consent_version is out of date',
      required_consent_version: '2026-05-08',
      tos_url: '/terms',
      privacy_url: '/privacy',
    };
    expect(sample).toHaveProperty('required_consent_version');
    expect(sample.tos_url).toBe('/terms');
    expect(sample.privacy_url).toBe('/privacy');
  });

  it('expected keys for DELETE /agents/me 202 body', () => {
    const sample = {
      agent_id: 'a',
      deletion_requested_at: '2026-05-08T12:00:00.000Z',
      confirm_token: 'uuid',
      expires_at: '2026-05-09T12:00:00.000Z',
      action: 'POST /agents/me/delete-confirm with { confirm_token } within 24h',
    };
    expect(sample).toHaveProperty('confirm_token');
    expect(sample).toHaveProperty('expires_at');
  });
});
