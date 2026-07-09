import { describe, expect, it } from 'vitest';
import { getAdminKey, getBaseUrl } from './helpers.js';

const COOKIE_NAME = 'thought_admin_session';

describe('Admin UI sessions', () => {
  it('sets an opaque HttpOnly session cookie on successful login', async () => {
    const res = await login(getAdminKey());

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin/dashboard');

    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain(`${COOKIE_NAME}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('Path=/admin');
    expect(setCookie).not.toContain(getAdminKey());

    const token = extractSessionCookie(setCookie);
    expect(token).toMatch(/^v1\.\d+\.[^.]+\.[^.]+$/);
    expect(token).not.toBe(getAdminKey());
  });

  it('rejects invalid login attempts without issuing a session', async () => {
    const res = await login('wrong-admin-key');

    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie') || '').not.toContain(`${COOKIE_NAME}=`);
  });

  it('renders admin page source without the raw admin key after session login', async () => {
    const cookie = extractSessionCookie((await login(getAdminKey())).headers.get('set-cookie') || '');
    const res = await fetch(`${getBaseUrl()}/admin/dashboard`, {
      headers: { Cookie: `${COOKIE_NAME}=${cookie}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).not.toContain(getAdminKey());
    expect(html).not.toContain('API_KEY');
  });

  it('allows admin UI fetches to authenticate with only the session cookie', async () => {
    const cookie = extractSessionCookie((await login(getAdminKey())).headers.get('set-cookie') || '');

    const analyticsRes = await fetch(`${getBaseUrl()}/admin/analytics/overview`, {
      headers: { Cookie: `${COOKIE_NAME}=${cookie}` },
    });
    expect(analyticsRes.status).toBe(200);

    const adminApiRes = await fetch(`${getBaseUrl()}/admin/api/agents`, {
      headers: { Cookie: `${COOKIE_NAME}=${cookie}` },
    });
    expect(adminApiRes.status).toBe(200);
  });

  it('rejects missing or invalid admin sessions', async () => {
    const missingRes = await fetch(`${getBaseUrl()}/admin/analytics/overview`);
    expect(missingRes.status).toBe(401);

    const invalidRes = await fetch(`${getBaseUrl()}/admin/analytics/overview`, {
      headers: { Cookie: `${COOKIE_NAME}=invalid-session` },
    });
    expect(invalidRes.status).toBe(401);
  });

  it('keeps Bearer admin key auth working for API clients', async () => {
    const res = await fetch(`${getBaseUrl()}/admin/api/agents`, {
      headers: { Authorization: `Bearer ${getAdminKey()}` },
    });

    expect(res.status).toBe(200);
  });
});

async function login(key: string): Promise<Response> {
  return fetch(`${getBaseUrl()}/admin/dashboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ key }),
    redirect: 'manual',
  });
}

function extractSessionCookie(setCookie: string): string {
  const match = setCookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  expect(match).not.toBeNull();
  return decodeURIComponent(match![1]);
}
