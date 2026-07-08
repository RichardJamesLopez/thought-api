import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  JULY_AGENTS,
  JULY_COHORTS,
  JULY_TREATMENTS,
  JULY_RETRIEVAL_TOP_K,
  JULY_RETRIEVAL_MAX_CHARS,
  JULY_THEMES,
} from '../src/config/july-agents.js';
import {
  getJulyContext,
  setJulyDocumentsForTest,
  retrieveTopK,
  getTierDocuments,
  renderSourceCards,
  isJulyTreatmentAgent,
  sanitizeAgentKbProvenance,
  type JulyDocument,
  type JulyDocumentsFile,
} from '../src/config/july-context.js';
import { computeProvenanceScore } from '../src/services/provenance.js';
import { marketMatchesFilter } from '../src/services/cohort-comparison.js';

// ── Synthetic corpus: 1,000 docs, balanced across the 7 themes ──────────

function makeDoc(i: number): JulyDocument {
  const theme = JULY_THEMES[i % JULY_THEMES.length].key;
  return {
    id: `doc-${String(i).padStart(4, '0')}`,
    title: `${theme} document ${i}`,
    url: `https://example.org/${i}`,
    theme,
    evidence_type: 'concept',
    extract: `This document discusses ${theme} topic-${i} with unique marker word alpha${i} and shared theme vocabulary about ${theme} policy evidence.`,
    keywords: [theme, `alpha${i}`],
    last_revised: '2026-06-01T00:00:00Z',
    fetched_at: '2026-07-01T00:00:00Z',
  };
}

function makeCorpus(): JulyDocumentsFile {
  const documents = Array.from({ length: 1000 }, (_, i) => makeDoc(i));
  const ids = documents.map(d => d.id);
  return {
    documents,
    tiers: { '10': ids.slice(0, 10), '100': ids.slice(0, 100), '1000': ids.slice(0, 1000) },
    digest: JULY_THEMES.map(t => `${t.label}: balanced digest section covering ${t.key}.`).join('\n\n').padEnd(2400, ' x'),
    fetched_at: '2026-07-01T00:00:00Z',
  };
}

const MARKET = { question: 'Will policy evidence about climate change?', description: 'A test market description.' };

beforeEach(() => setJulyDocumentsForTest(makeCorpus()));
afterEach(() => setJulyDocumentsForTest(null));

describe('July cohort definitions', () => {
  it('resolves 25 handles across 5 cohorts with 5 agents each', () => {
    expect(JULY_AGENTS).toHaveLength(25);
    expect(JULY_COHORTS).toEqual(['A', 'B', 'C', 'D', 'E']);
    for (const cohort of JULY_COHORTS) {
      const members = JULY_AGENTS.filter(a => a.cohort === cohort);
      expect(members).toHaveLength(5);
      expect(members.map(m => m.handle)).toEqual([1, 2, 3, 4, 5].map(n => `jul-${cohort}${n}`));
    }
  });

  it('uses nested 10/100/1000 corpus treatments for C/D/E', () => {
    expect(JULY_TREATMENTS.C).toEqual({ kind: 'corpus', corpus_docs: 10 });
    expect(JULY_TREATMENTS.D).toEqual({ kind: 'corpus', corpus_docs: 100 });
    expect(JULY_TREATMENTS.E).toEqual({ kind: 'corpus', corpus_docs: 1000 });
  });
});

describe('getJulyContext', () => {
  it('returns null for Cohort A (control) and non-July handles', () => {
    expect(getJulyContext('jul-A1', MARKET)).toBeNull();
    expect(getJulyContext('jun-B1', MARKET)).toBeNull();
    expect(getJulyContext('random', MARKET)).toBeNull();
  });

  it('returns a ~2,000-char digest covering all themes for Cohort B', () => {
    const ctx = getJulyContext('jul-B1', MARKET);
    expect(ctx).not.toBeNull();
    const digestBody = ctx!.replace(/^Your knowledge base:\n/, '');
    expect(digestBody.length).toBeLessThanOrEqual(2000);
    for (const theme of JULY_THEMES) {
      expect(ctx).toContain(theme.label);
    }
  });

  it('corpus tiers are nested: 10 ⊂ 100 ⊂ 1000', () => {
    const file = makeCorpus();
    const t10 = new Set(getTierDocuments(file, 10).map(d => d.id));
    const t100 = new Set(getTierDocuments(file, 100).map(d => d.id));
    const t1000 = new Set(getTierDocuments(file, 1000).map(d => d.id));
    expect(t10.size).toBe(10);
    expect(t100.size).toBe(100);
    expect(t1000.size).toBe(1000);
    for (const id of t10) expect(t100.has(id)).toBe(true);
    for (const id of t100) expect(t1000.has(id)).toBe(true);
  });

  it('C/D/E retrieve the same number of visible cards for the same market', () => {
    const counts = (['C', 'D', 'E'] as const).map(cohort => {
      const ctx = getJulyContext(`jul-${cohort}1`, MARKET);
      expect(ctx).not.toBeNull();
      return (ctx!.match(/\[agent_kb:/g) || []).length;
    });
    expect(counts[0]).toBe(Math.min(JULY_RETRIEVAL_TOP_K, 10));
    expect(counts[1]).toBe(JULY_RETRIEVAL_TOP_K);
    expect(counts[2]).toBe(JULY_RETRIEVAL_TOP_K);
  });

  it('stays within the visible character cap', () => {
    const ctx = getJulyContext('jul-E1', MARKET);
    expect(ctx!.length).toBeLessThanOrEqual(JULY_RETRIEVAL_MAX_CHARS);
  });

  it('is deterministic for identical inputs', () => {
    const a = getJulyContext('jul-D3', MARKET);
    const b = getJulyContext('jul-D3', { ...MARKET });
    expect(a).toBe(b);
  });

  it('replicates within a cohort see identical context for the same market', () => {
    expect(getJulyContext('jul-E1', MARKET)).toBe(getJulyContext('jul-E5', MARKET));
  });
});

describe('retrieval', () => {
  it('ranks lexically-relevant documents first', () => {
    const docs = [makeDoc(1), makeDoc(2)];
    docs[0].extract = 'Entirely unrelated content about gardening and cooking recipes.';
    docs[0].keywords = ['gardening'];
    docs[1].extract = 'Deep analysis of climate change policy evidence and emissions.';
    docs[1].keywords = ['climate', 'policy'];
    const top = retrieveTopK({ question: 'climate change policy evidence' }, docs, 1);
    expect(top[0].id).toBe(docs[1].id);
  });

  it('breaks score ties by document id for determinism', () => {
    const a = { ...makeDoc(1), id: 'doc-b' };
    const b = { ...makeDoc(1), id: 'doc-a' };
    const top = retrieveTopK({ question: 'zzz nothing matches' }, [a, b], 2);
    expect(top.map(d => d.id)).toEqual(['doc-a', 'doc-b']);
  });

  it('renders citable agent_kb source cards', () => {
    const cards = renderSourceCards([makeDoc(7)]);
    expect(cards).toContain('[agent_kb:doc-0007]');
    expect(cards).toContain('type "agent_kb"');
  });
});

describe('agent_kb trust boundary', () => {
  it('flags treatment agents (B–E) but not control or non-July handles', () => {
    expect(isJulyTreatmentAgent('jul-A1')).toBe(false);
    expect(isJulyTreatmentAgent('jul-B1')).toBe(true);
    expect(isJulyTreatmentAgent('jul-E5')).toBe(true);
    expect(isJulyTreatmentAgent('jun-D1')).toBe(false);
  });

  it('strips agent_kb sources from non-July and control agents', () => {
    const payload = { sources: [{ type: 'agent_kb', id: 'doc-0001' }, { type: 'training' }] };
    expect(sanitizeAgentKbProvenance('jul-A1', MARKET, payload).sources).toEqual([{ type: 'training' }]);
    expect(sanitizeAgentKbProvenance('random-agent', MARKET, payload).sources).toEqual([{ type: 'training' }]);
    // Digest cohort has no per-doc ids to cite either
    expect(sanitizeAgentKbProvenance('jul-B1', MARKET, payload).sources).toEqual([{ type: 'training' }]);
  });

  it('keeps only agent_kb ids actually retrieved for the market', () => {
    const retrieved = retrieveTopK(MARKET, getTierDocuments(makeCorpus(), 1000)).map(d => d.id);
    const payload = {
      sources: [
        { type: 'agent_kb', id: retrieved[0] },
        { type: 'agent_kb', id: 'doc-fabricated' },
        { type: 'agent_kb' },
        { type: 'training' },
      ],
    };
    const clean = sanitizeAgentKbProvenance('jul-E1', MARKET, payload);
    expect(clean.sources).toEqual([{ type: 'agent_kb', id: retrieved[0] }, { type: 'training' }]);
  });

  it('returns payloads without agent_kb sources unchanged', () => {
    const payload = { sources: [{ type: 'training' }] };
    expect(sanitizeAgentKbProvenance('jul-E1', MARKET, payload)).toBe(payload);
  });
});

describe('agent_kb provenance', () => {
  it('counts agent_kb as a context source under provided_context_only', () => {
    const result = computeProvenanceScore({ sources: [{ type: 'agent_kb', id: 'doc-0001' }] }, 'provided_context_only');
    expect(result.missing_expected).toBe(false);
    expect(result.misaligned).toBe(false);
    expect(result.score).toBe(1.0);
  });

  it('flags agent_kb as misaligned under training_knowledge policy', () => {
    const result = computeProvenanceScore({ sources: [{ type: 'agent_kb' }, { type: 'training' }] }, 'training_knowledge');
    expect(result.misaligned).toBe(true);
  });
});

describe('cohort-report tag filter', () => {
  const july = { category: 'economics_markets', status: 'open', tags: JSON.stringify(['july-diagnostic']) };
  const other = { category: 'economics_markets', status: 'open', tags: JSON.stringify(['platform']) };
  const untagged = { category: 'economics_markets', status: 'open', tags: null };

  it('keeps only markets carrying a requested tag', () => {
    const filter = { tags: ['july-diagnostic'] };
    expect(marketMatchesFilter(july, filter)).toBe(true);
    expect(marketMatchesFilter(other, filter)).toBe(false);
    expect(marketMatchesFilter(untagged, filter)).toBe(false);
  });

  it('still applies category/status alongside tags', () => {
    expect(marketMatchesFilter(july, { tags: ['july-diagnostic'], category: 'technology_innovation' })).toBe(false);
    expect(marketMatchesFilter(july, { tags: ['july-diagnostic'], status: 'resolved' })).toBe(false);
    expect(marketMatchesFilter(july, { tags: ['july-diagnostic'], status: 'all' })).toBe(true);
  });

  it('matches everything when no filter is provided', () => {
    expect(marketMatchesFilter(untagged, undefined)).toBe(true);
    expect(marketMatchesFilter(untagged, {})).toBe(true);
  });
});
