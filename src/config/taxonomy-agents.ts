/**
 * April Agents — Taxonomy-based agent definitions.
 *
 * 15 agents across 3 groups (A, B, C) × 5 depth levels.
 * Group A: Keynesian Economics, French Haute Culture, Hermann Hesse
 * Group B: Austrian School Economics, Japanese Harajuku Fashion, Shakespeare
 * Group C: All 6 topics combined (A + B)
 *
 * Depth N = N links per topic used as context.
 */

export interface TaxonomyTopic {
  name: string;
  links: string[];
}

export type GroupKey = 'A' | 'B' | 'C';

export interface TaxonomyAgentDef {
  handle: string;
  group: GroupKey;
  depth: number;
  topics: string[];
  shortPersona: string;
}

export const TAXONOMY_TOPICS: Record<string, TaxonomyTopic> = {
  keynesian: {
    name: 'Keynesian Economics',
    links: [
      'https://www.marxists.org/reference/subject/economics/keynes/general-theory/',
      'https://www.imf.org/en/Publications/fandd/issues/Series/Back-to-Basics/Fiscal-Policy',
      'https://www.econlib.org/library/Enc/KeynesianEconomics.html',
      'https://www.khanacademy.org/economics-finance-domain/macroeconomics',
      'https://fred.stlouisfed.org/education',
    ],
  },
  french_haute: {
    name: 'French Haute Culture',
    links: [
      'https://en.wikipedia.org/wiki/Haute_couture',
      'https://www.louvre.fr/en',
      'https://www.institutfrancais.com/en',
      'https://www.centrepompidou.fr/en',
      'https://www.vogue.fr/',
    ],
  },
  hesse: {
    name: 'Hermann Hesse Literature',
    links: [
      'https://www.britannica.com/biography/Hermann-Hesse',
      'https://www.sparknotes.com/lit/siddhartha/',
      'https://www.litcharts.com/lit/steppenwolf',
      'https://www.britannica.com/topic/The-Glass-Bead-Game',
      'https://www.nobelprize.org/prizes/literature/1946/hesse/facts/',
    ],
  },
  austrian: {
    name: 'Austrian School Economics',
    links: [
      'https://mises.org/',
      'https://www.britannica.com/biography/Friedrich-August-von-Hayek',
      'https://mises.org/library/human-action-0',
      'https://plato.stanford.edu/entries/economics-austrian/',
      'https://www.econlib.org/library/Enc/AustrianSchoolofEconomics.html',
    ],
  },
  harajuku: {
    name: 'Japanese Harajuku Fashion',
    links: [
      'https://www.japan-guide.com/e/e3006.html',
      'https://bape.com/',
      'https://www.comme-des-garcons.com/',
      'https://www.fruitsmagazine.com/',
      'https://tokyofashion.com/',
    ],
  },
  shakespeare: {
    name: 'Shakespeare Literature',
    links: [
      'https://www.opensourceshakespeare.org/',
      'https://www.folger.edu/',
      'https://www.rsc.org.uk/education',
      'http://shakespeare.mit.edu/',
      'https://www.bl.uk/shakespeare',
    ],
  },
};

export const GROUP_TOPICS: Record<GroupKey, string[]> = {
  A: ['keynesian', 'french_haute', 'hesse'],
  B: ['austrian', 'harajuku', 'shakespeare'],
  C: ['keynesian', 'french_haute', 'hesse', 'austrian', 'harajuku', 'shakespeare'],
};

const DEPTH_LABELS: Record<number, string> = {
  1: 'introductory-level',
  2: 'moderate',
  3: 'solid',
  4: 'deep',
  5: 'extensive',
};

function buildPersona(group: GroupKey, depth: number): string {
  const topicKeys = GROUP_TOPICS[group];
  const topicNames = topicKeys.map(k => TAXONOMY_TOPICS[k].name);
  const depthLabel = DEPTH_LABELS[depth] || 'moderate';

  if (topicNames.length <= 3) {
    return `You are an agent whose worldview is shaped by ${topicNames.join(', ')}. You have ${depthLabel} familiarity with each domain. Draw on these perspectives when forming opinions.`;
  }
  return `You are an agent whose worldview is shaped by six domains: ${topicNames.join(', ')}. You have ${depthLabel} knowledge across all six. Draw on these diverse perspectives when forming opinions.`;
}

export const TAXONOMY_AGENTS: TaxonomyAgentDef[] = [];

for (const group of ['A', 'B', 'C'] as GroupKey[]) {
  for (let depth = 1; depth <= 5; depth++) {
    TAXONOMY_AGENTS.push({
      handle: `apr-${group}${depth}`,
      group,
      depth,
      topics: GROUP_TOPICS[group],
      shortPersona: buildPersona(group, depth),
    });
  }
}
