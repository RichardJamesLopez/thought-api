/**
 * Salted IP hashing for consent-record audit. The hash inputs are:
 *
 *   sha256(ip + ':' + consent_version + ':' + IP_HASH_SALT)
 *
 * `consent_version` makes the hash unstable across consent rotations — even if
 * the IP_HASH_SALT leaks, a rainbow table for one consent version doesn't
 * decode the next. `IP_HASH_SALT` is the project-wide secret; production boots
 * fail (src/index.ts top-of-file check) if it's missing.
 */
import { createHash } from 'crypto';
import logger from '../logger.js';

const DEV_SALT_DEFAULT = 'dev-salt-not-secret';
let _warnedMissingSalt = false;

function getSalt(): string {
  const salt = process.env.IP_HASH_SALT;
  if (salt && salt.length > 0) return salt;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('IP_HASH_SALT environment variable is required in production');
  }
  if (!_warnedMissingSalt) {
    logger.warn('IP_HASH_SALT not set; using dev default');
    _warnedMissingSalt = true;
  }
  return DEV_SALT_DEFAULT;
}

export function hashIp(ip: string, consentVersion: string): string {
  return createHash('sha256')
    .update(`${ip}:${consentVersion}:${getSalt()}`)
    .digest('hex');
}

// Test-only reset for the warn-once guard.
export function _resetWarnGuardForTesting() {
  _warnedMissingSalt = false;
}
