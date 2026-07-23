import { describe, expect, it } from 'vitest';
import { brandTitle, PRODUCT_NAME } from '../src/branding.js';

describe('display branding', () => {
  it('uses Rish as the product name', () => {
    expect(PRODUCT_NAME).toBe('Rish');
  });

  it('formats browser titles without changing functional identifiers', () => {
    expect(brandTitle()).toBe('Rish');
    expect(brandTitle('Admin')).toBe('Rish — Admin');
  });
});

