export const LOCAL_ADMIN_API_KEY = 'local-admin-key';

const PLACEHOLDER_PREFIX = 'replace-with-';

function isLocalFallbackAllowed(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}

export function isPlaceholderAdminApiKey(value: string | undefined | null): boolean {
  const normalized = value?.trim() ?? '';
  return normalized.length === 0
    || normalized === LOCAL_ADMIN_API_KEY
    || normalized.startsWith(PLACEHOLDER_PREFIX);
}

export function getAdminApiKey(): string {
  const configured = process.env.ADMIN_API_KEY?.trim();

  if (configured) {
    if (isPlaceholderAdminApiKey(configured) && !isLocalFallbackAllowed()) {
      if (configured === LOCAL_ADMIN_API_KEY) {
        throw new Error('ADMIN_API_KEY must not be local-admin-key unless NODE_ENV is development or test');
      }
      throw new Error('ADMIN_API_KEY must be set to a non-placeholder value');
    }
    return configured;
  }

  if (isLocalFallbackAllowed()) {
    return LOCAL_ADMIN_API_KEY;
  }

  throw new Error('ADMIN_API_KEY is required unless NODE_ENV is development or test');
}

export function validateAdminApiKeyConfiguration(): void {
  getAdminApiKey();
}

export function isAdminApiKey(candidate: string | undefined | null): boolean {
  if (!candidate) return false;
  return candidate === getAdminApiKey();
}

export function extractBearerToken(authHeader: string | undefined | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
