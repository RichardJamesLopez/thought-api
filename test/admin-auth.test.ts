import { afterEach, describe, expect, it } from 'vitest';
import {
  LOCAL_ADMIN_API_KEY,
  extractBearerToken,
  getAdminApiKey,
  isAdminApiKey,
  validateAdminApiKeyConfiguration,
} from '../src/config/admin-auth';

const originalAdminApiKey = process.env.ADMIN_API_KEY;
const originalNodeEnv = process.env.NODE_ENV;

function restoreEnv() {
  if (originalAdminApiKey === undefined) delete process.env.ADMIN_API_KEY;
  else process.env.ADMIN_API_KEY = originalAdminApiKey;

  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
}

describe('admin auth configuration', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('falls back to the local admin key in development when unset', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ADMIN_API_KEY;

    expect(getAdminApiKey()).toBe(LOCAL_ADMIN_API_KEY);
    expect(isAdminApiKey(LOCAL_ADMIN_API_KEY)).toBe(true);
  });

  it('falls back to the local admin key in test when unset', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.ADMIN_API_KEY;

    expect(getAdminApiKey()).toBe(LOCAL_ADMIN_API_KEY);
    expect(isAdminApiKey(LOCAL_ADMIN_API_KEY)).toBe(true);
  });

  it('allows an explicitly configured local admin key in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.ADMIN_API_KEY = LOCAL_ADMIN_API_KEY;

    expect(validateAdminApiKeyConfiguration).not.toThrow();
    expect(isAdminApiKey(LOCAL_ADMIN_API_KEY)).toBe(true);
  });

  it('uses a configured production admin key', () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_API_KEY = 'prod-admin-key';

    expect(validateAdminApiKeyConfiguration).not.toThrow();
    expect(getAdminApiKey()).toBe('prod-admin-key');
    expect(isAdminApiKey('prod-admin-key')).toBe(true);
    expect(isAdminApiKey(LOCAL_ADMIN_API_KEY)).toBe(false);
  });

  it('rejects missing admin key outside development and test', () => {
    process.env.NODE_ENV = 'staging';
    delete process.env.ADMIN_API_KEY;

    expect(validateAdminApiKeyConfiguration).toThrow(/ADMIN_API_KEY is required/);
  });

  it('rejects local admin key outside development and test', () => {
    process.env.NODE_ENV = 'staging';
    process.env.ADMIN_API_KEY = LOCAL_ADMIN_API_KEY;

    expect(validateAdminApiKeyConfiguration).toThrow(/local-admin-key/);
  });

  it('rejects missing admin key in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_API_KEY;

    expect(validateAdminApiKeyConfiguration).toThrow(/ADMIN_API_KEY is required/);
  });

  it('rejects local admin key in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_API_KEY = LOCAL_ADMIN_API_KEY;

    expect(validateAdminApiKeyConfiguration).toThrow(/local-admin-key/);
  });

  it('rejects placeholder admin key in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_API_KEY = 'replace-with-a-long-random-admin-api-key';

    expect(validateAdminApiKeyConfiguration).toThrow(/non-placeholder/);
  });

  it('extracts Bearer admin tokens without changing compatibility', () => {
    expect(extractBearerToken('Bearer prod-admin-key')).toBe('prod-admin-key');
    expect(extractBearerToken('Token prod-admin-key')).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
  });
});
