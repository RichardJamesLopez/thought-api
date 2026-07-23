export const PRODUCT_NAME = 'Rish';

export function brandTitle(section?: string): string {
  return section ? `${PRODUCT_NAME} — ${section}` : PRODUCT_NAME;
}

