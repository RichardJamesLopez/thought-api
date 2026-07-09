import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { getAdminApiKey } from '../config/admin-auth.js';

export const ADMIN_SESSION_COOKIE = 'thought_admin_session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const SESSION_VERSION = 'v1';

export function createAdminSessionToken(nowMs = Date.now()): string {
  const expiresAt = Math.floor(nowMs / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS;
  const nonce = randomBytes(24).toString('base64url');
  const payload = `${SESSION_VERSION}.${expiresAt}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token: string | undefined, nowMs = Date.now()): boolean {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== SESSION_VERSION) return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(nowMs / 1000)) {
    return false;
  }

  const payload = parts.slice(0, 3).join('.');
  return constantTimeEqual(parts[3], sign(payload));
}

export function hasValidAdminSession(c: Context): boolean {
  return verifyAdminSessionToken(getCookie(c, ADMIN_SESSION_COOKIE));
}

export function setAdminSessionCookie(c: Context): void {
  setCookie(c, ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: 'Strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: '/admin',
  });
}

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || getAdminApiKey();
}

function sign(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);
  return aBytes.length === bBytes.length && timingSafeEqual(aBytes, bBytes);
}
