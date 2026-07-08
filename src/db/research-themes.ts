/**
 * Generator-internal constants for cross-funnel bridge questions and decoy markets.
 *
 * The previously-hardcoded `researchThemes` array now lives in the `research_funnels`
 * DB table — see `src/services/funnels.ts`. The constants below are not user-CRUD-able:
 * they are camouflage / decoy machinery and remain code-defined.
 */

/** IDs for cross-funnel bridge themes */
export const BRIDGE_THEMES = {
  ECON_FASHION: '__bridge_ab__',
  ECON_POLITICS: '__bridge_ac__',
  FASHION_POLITICS: '__bridge_bc__',
  ALL_THREE: '__bridge_abc__',
} as const;

/** Theme used for decoy/camouflage markets that aren't part of any research track */
export const FUN_THEME_ID = '__fun__';

/** Bridge theme guidance for cross-funnel questions */
export const bridgeThemeGuidance: Record<string, { description: string; guidance: string; example_angles: string[] }> = {
  [BRIDGE_THEMES.ECON_FASHION]: {
    description: 'Questions that simultaneously probe economic behavior and fashion/style influence',
    guidance: `Ask about the intersection of lifestyle costs and style choices — without mentioning inflation, prices, or specific people.
Examples: "Does 'looking successful' cost more than it used to?", "Is the rise of fast fashion a sign of smart consumerism or something else?", "Have clothing budgets shifted toward fewer/better or more/cheaper items?"`,
    example_angles: ['cost of looking good', 'brand loyalty economics', 'dressing down culture motives', 'fast fashion growth drivers', 'style vs budget tradeoffs'],
  },
  [BRIDGE_THEMES.ECON_POLITICS]: {
    description: 'Questions that simultaneously probe economic perception and political sentiment',
    guidance: `Ask about the relationship between daily life quality and trust in institutions — without economic jargon or political names.
Examples: "Do economic concerns or cultural concerns drive elections more?", "Do people trust government or commercial sector more to improve daily life?", "Does the 'system' work for most Americans?"`,
    example_angles: ['economic vs cultural election drivers', 'institutional trust', 'job market and faith in leadership', 'system working perception', 'homeownership and political attitudes'],
  },
  [BRIDGE_THEMES.FASHION_POLITICS]: {
    description: 'Questions that simultaneously probe style influence and political landscape',
    guidance: `Ask about the intersection of public figure influence, personal presentation, and leadership perception.
Examples: "Does a leader's personal style affect their credibility?", "Do cultural tastemakers have more influence on young adults than politicians?", "Is 'looking presidential' a meaningful concept?"`,
    example_angles: ['leader presentation and credibility', 'tastemaker vs politician influence', 'looking presidential concept', 'most admired public figure domain'],
  },
  [BRIDGE_THEMES.ALL_THREE]: {
    description: 'Questions that serve all three funnels — economy, fashion, and politics',
    guidance: `Ask about national mood, American identity, and what defines admired public figures — touching economics, culture, and politics simultaneously.
Examples: "Is the 'American lifestyle' as a global brand stronger or weaker than 10 years ago?", "Is the country's direction best measured by economics, culture, or politics?", "Are the most admired public figures defined by wealth, style, power, or ideas?"`,
    example_angles: ['American lifestyle brand strength', 'national direction measurement', 'admired figure definition', 'national mood optimism/pessimism'],
  },
};
