// Renderers for CohortReport — Markdown + print-styled HTML.
//
// Pure functions over the typed report object:
//   - renderMemoMarkdown / renderMemoHtml
//   - renderAppendixMarkdown / renderAppendixHtml
//
// The HTML outputs are self-contained documents with @media print styles and an
// inline window.print() trigger so a new tab "Save as PDF"s in one click.

import type {
  CohortReport,
  ProvenanceAggregate,
  MarketStatTest,
  AgentOutlier,
  ParticipationGap,
  CohortVoice,
} from './cohort-report.js';
import type { CommonMarketComparison } from './cohort-comparison.js';

const DIVERGENCE_THRESHOLD = 10;
const REFRAINED_MARKETS_LIMIT = 5;

// ── Memo (≤ 2 pages) ─────────────────────────────────────────────────────

export function renderMemoMarkdown(report: CohortReport): string {
  const { meta, comparison, provenance_aggregates, market_stat_tests, headline, cohort_voices, participation_gaps } = report;

  const sigCount = market_stat_tests.filter(s => s.p_value_approx !== 'ns').length;
  const totalCommon = market_stat_tests.length;

  const cohortRows = comparison.cohorts.map(c =>
    `| ${c.label} | ${c.agent_count} | ${c.aggregate.total_opinions} | ${c.aggregate.avg_confidence} |`,
  ).join('\n');

  const voiceBlock = renderVoicesMarkdown(cohort_voices, totalCommon);
  const divergenceBlock = renderDivergenceMarkdown(comparison.common_markets, market_stat_tests);
  const refrainedBlock = renderRefrainedMarkdown(participation_gaps);
  const groundingBlock = renderGroundingMarkdown(provenance_aggregates);
  const headlineBullets = renderHeadlineBulletsMarkdown(headline.bullets, participation_gaps);

  return `# ${meta.batch_tag.toUpperCase()} cohort report — memo

_Batch_: \`${meta.batch_tag}\`  _Cohorts_: ${meta.cohort_labels.join(', ')}  _Generated_: ${meta.generated_at}

## Headline

${headline.one_liner}

${headlineBullets}

## Cohorts at a glance

| Cohort | Agents | Opinions | Avg confidence |
|---|---:|---:|---:|
${cohortRows || '| _no cohorts resolved_ |  |  |  |'}

## Voice across shared markets

${voiceBlock}

## Vote pattern

- ${totalCommon} markets answered by ≥ 2 cohorts qualify as **common markets**.
  - ${sigCount} showed statistically significant answer-distribution differences (χ², p<0.1 or stricter).
  - Below: markets where cohorts diverged most (score ≥ ${DIVERGENCE_THRESHOLD}).

${divergenceBlock}

${refrainedBlock}

## Context grounding

${groundingBlock}

## Open questions for the next batch

- Were the differences observed driven by which markets each cohort happened to answer?
  - See Appendix D (per-market breakdown) to triangulate.
- Are the lowest-grounded responses concentrated in any cohort × \`knowledge_source\` cell?
  - See Appendix E.
- Do the same agents drive within-cohort variance every batch?
  - Compare Appendix G outliers across runs.

---

_Appendix follows separately. See \`${meta.batch_tag}-appendix.md\`._
`;
}

// Voice across shared markets — one bullet per cohort with grounding/style/confidence sub-bullets.
function renderVoicesMarkdown(voices: CohortVoice[], totalCommon: number): string {
  if (voices.length === 0) return `_No cohort voices computed._`;
  const lines: string[] = [];
  for (const v of voices) {
    const domain = v.primary_domain ?? '—';
    const headerBits = [`leans **${v.dominant_style}**`, `mean confidence ${v.mean_confidence}`, `primary domain ${domain}`];
    lines.push(`- **Cohort ${v.cohort_label}** — ${headerBits.join('; ')}`);
    lines.push(`  - Aligned with the cross-cohort majority on ${v.consensus_rate}% of ${v.common_markets_participated} shared markets.`);
    if (v.grounding_tag !== 'unknown') {
      lines.push(`  - Grounding: **${v.grounding_tag}** (provenance ${v.mean_provenance.toFixed(2)}, basis↔context ${v.mean_basis_overlap.toFixed(2)}).`);
    }
  }
  const footer = totalCommon > 0
    ? `\n_Computed across ${totalCommon} common markets — i.e. the totality of shared markets, not just the divergent ones._`
    : '';
  return lines.join('\n') + footer;
}

// Top divergent markets, filtered by threshold. Suppresses near-unanimous markets.
function renderDivergenceMarkdown(commonMarkets: CommonMarketComparison[], stats: MarketStatTest[]): string {
  const filtered = commonMarkets.filter(cm => cm.divergence_score >= DIVERGENCE_THRESHOLD).slice(0, 3);
  if (filtered.length === 0) {
    return `_No common markets crossed the divergence threshold (score ≥ ${DIVERGENCE_THRESHOLD}). All cohorts reached similar majorities — see Appendix D for full distributions._`;
  }
  return filtered.map(cm => {
    const positions = cm.cohort_positions.map(p => `**${p.cohort_label}** → "${trim(p.majority_answer, 40)}"`).join(', ');
    const stat = stats.find(s => s.market_id === cm.market_id);
    const tag = stat && stat.p_value_approx !== 'ns' ? ` _(${stat.p_value_approx})_` : '';
    return `- _${trim(cm.question, 110)}_ — ${positions}${tag}`;
  }).join('\n');
}

// Markets where a cohort refrained while others participated.
function renderRefrainedMarkdown(gaps: ParticipationGap[]): string {
  if (gaps.length === 0) return '';
  const top = gaps.slice(0, REFRAINED_MARKETS_LIMIT);
  const more = gaps.length > top.length ? `\n  - …and ${gaps.length - top.length} more (see Appendix D).` : '';
  const rows = top.map(g => {
    const ans = g.answered_by.join(', ');
    const ref = g.refrained.map(l => `**${l}**`).join(', ');
    return `- _${trim(g.question, 110)}_ — answered by ${ans}; ${ref} refrained`;
  }).join('\n');
  return `### Markets where a cohort refrained

${rows}${more}`;
}

// Compact provenance summary — bullets, not a wrapped-header table.
function renderGroundingMarkdown(provs: ProvenanceAggregate[]): string {
  if (provs.length === 0) return '_No provenance data._';
  const rows = provs.map(p =>
    `- **Cohort ${p.cohort_label}** — provenance ${p.mean_score.toFixed(2)}, basis↔context ${p.mean_basis_overlap.toFixed(2)}`,
  ).join('\n');
  return `${rows}

_Provenance: 1.00 = cited sources align with the market's \`knowledge_source\` policy. Basis↔context: Jaccard overlap of rationale tokens with the market's description + context. See Appendix E for the full breakdown._`;
}

// Headline bullets with optional refrained-markets fact appended as a sub-bullet.
function renderHeadlineBulletsMarkdown(bullets: string[], gaps: ParticipationGap[]): string {
  if (bullets.length === 0 && gaps.length === 0) {
    return '_No additional notable bullets generated automatically; see appendix._';
  }
  const lines = bullets.map(b => `- ${b}`);
  if (gaps.length > 0) {
    // Group by cohort that refrained — surface "Cohort X skipped N markets" as a sub-bullet
    const byRefrained = new Map<string, number>();
    for (const g of gaps) {
      for (const label of g.refrained) {
        byRefrained.set(label, (byRefrained.get(label) || 0) + 1);
      }
    }
    const refrainedSummary = Array.from(byRefrained.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, n]) => `Cohort ${label} refrained on ${n}`)
      .join(', ');
    lines.push(`- Participation gaps: ${refrainedSummary} markets where ≥ 1 other cohort answered.`);
  }
  return lines.join('\n');
}

// ── Appendix (full long-form) ────────────────────────────────────────────

export function renderAppendixMarkdown(report: CohortReport): string {
  const sections: string[] = [];

  sections.push(`# ${report.meta.batch_tag.toUpperCase()} cohort report — appendix\n`);
  sections.push(
    `_Generated_: ${report.meta.generated_at}\n` +
    `_Handle pattern_: \`${report.meta.handle_pattern}\` (replace \`{LABEL}\` with each of ${report.meta.cohort_labels.join(', ')})\n`,
  );

  sections.push(renderTOC());

  sections.push(renderSectionA(report));
  sections.push(renderSectionB(report));
  sections.push(renderSectionC(report));
  sections.push(renderSectionD(report));
  sections.push(renderSectionE(report));
  sections.push(renderSectionF(report));
  sections.push(renderSectionG(report));
  sections.push(renderSectionH(report));

  return sections.join('\n\n');
}

function renderTOC(): string {
  return `## Table of contents

- [A. Methodology](#a-methodology)
- [B. Cohort cards](#b-cohort-cards)
- [C. Per-agent cards](#c-per-agent-cards)
- [D. Per-market results](#d-per-market-results)
- [E. Provenance deep-dive](#e-provenance-deep-dive)
- [F. Divergence catalog](#f-divergence-catalog)
- [G. Outlier agents](#g-outlier-agents)
- [H. Reproducibility](#h-reproducibility)`;
}

// A. Methodology
function renderSectionA(report: CohortReport): string {
  return `## A. Methodology

### Cohort resolution
Agents are resolved by handle regex: \`${report.meta.handle_pattern}\`. The batch tag and label list are inputs to the report endpoint; no additional configuration is needed for new batches (e.g. \`may-A1…may-C5\`).

### Vote and divergence analysis
Re-uses \`generateCohortComparison()\` from \`src/services/cohort-comparison.ts\`. Per common market (≥ 2 cohorts answered), we report:
- per-cohort majority answer + full answer distribution
- average pairwise total-variation distance across cohorts (\`divergence_score\`, 0–100)
- average confidence per cohort

### Statistical tests
- **Pearson χ²** on the cohort × answer contingency matrix. Degrees of freedom = (k_cohorts − 1) × (k_answers − 1). p-value approximated via a lookup of standard critical values (p<0.01, p<0.05, p<0.1).
- **Kruskal–Wallis H** on confidence values across cohorts (k ≥ 2 groups). Uses chi-square approximation with df = k−1; reported as "significant" at p<0.05. Only computed when n ≥ 4 total.
- These are non-parametric, small-N-friendly tests; treat any p-value as descriptive rather than confirmatory at this batch size (n=5 per cohort).

### Context-grounding (answer attribution)
Each opinion carries a \`provenance\` payload (cited \`article\`/\`data_point\`/\`link\`/\`attachment\`/\`agent_kb\`/\`local\`/\`training\` sources) and the market carries a \`knowledge_source\` policy (\`any\` | \`provided_context_only\` | \`training_knowledge\` | \`local_only\`).

For each opinion we compute:
- **provenance_score** (0.00–1.00): 1.0 minus 0.3 per "missing expected" source type, minus 0.3 per "misaligned" source type, floored at 0
- **basis↔context overlap**: Jaccard similarity of tokenized \`opinion.basis\` against \`market.description\` + \`market.context_json\` — a lexical proxy for "this answer reuses the provided context"

We aggregate both to cohort level (mean) and to (cohort × knowledge_source) cells for the deep-dive in section E.

### Outliers
Agents who participated in ≥ 3 common markets are scored by \`disagreements_with_own_cohort / participations\`. Reported sorted by deviation %.

### Limitations
- Provenance is self-reported by the agent; an unscrupulous agent could claim to cite context they didn't read. The basis↔context overlap signal partially corrects for this.
- Small N (5 per cohort × 15 markets = O(75) data points per cell) means most χ² results will be \`ns\`. The report is more useful as a structured artefact for accumulation across batches than as a single-batch confirmatory analysis.`;
}

// B. Cohort cards
function renderSectionB(report: CohortReport): string {
  const cards = report.comparison.cohorts.map(cohort => {
    const prov = report.provenance_aggregates.find(p => p.cohort_label === cohort.label);
    const conf = report.comparison.confidence_analysis.per_cohort.find(p => p.label === cohort.label);

    const provBlock = prov ? `**Context grounding:**
- Mean provenance: ${prov.mean_score.toFixed(2)} (n=${prov.opinions_with_provenance} / ${prov.total_opinions} opinions had provenance payload)
- % missing-expected: ${prov.pct_missing_expected}%
- % misaligned: ${prov.pct_misaligned}%
- Mean basis↔context overlap (Jaccard): ${prov.mean_basis_overlap.toFixed(2)}` : '';

    const confBlock = conf ? `**Confidence:**
- Mean ${conf.mean}, median ${conf.median}, σ ${conf.std_dev}
- ${conf.high_confidence_pct}% of opinions at ≥ 80, ${conf.low_confidence_pct}% at ≤ 30` : '';

    const styleBlock = `**Style distribution:** ${formatRecord(cohort.aggregate.style_distribution) || '_(unclassified)_'}
**Domain coverage:** ${cohort.aggregate.domain_coverage.join(', ') || '_(none tagged)_'}`;

    return `### Cohort ${cohort.label} (${cohort.agent_count} agents)

${provBlock}

${confBlock}

${styleBlock}`;
  }).join('\n\n---\n\n');

  return `## B. Cohort cards

${cards || '_No cohorts resolved._'}`;
}

// C. Per-agent cards
function renderSectionC(report: CohortReport): string {
  const cards: string[] = [];
  for (const cohort of report.comparison.cohorts) {
    for (const agent of cohort.agents) {
      const card = `### \`${agent.handle}\` (Cohort ${cohort.label})

- Style: ${agent.opinion_style} (consensus alignment ${agent.consensus_alignment}, contrarian rate ${agent.contrarian_rate})
- Primary domain: ${agent.primary_domain ?? '—'}; tags: ${agent.domain_tags.join(', ') || '—'}
- Participation: ${agent.participation_rate}% (${agent.total_opinions} opinions)
- Custom objective: ${agent.custom_objective ? `\`${trim(agent.custom_objective, 200)}\`` : '_(none)_'}
- Custom instructions: ${agent.custom_instructions ? `\`${trim(agent.custom_instructions, 200)}\`` : '_(none)_'}`;
      cards.push(card);
    }
  }
  return `## C. Per-agent cards

${cards.join('\n\n') || '_No agents resolved._'}`;
}

// D. Per-market results
function renderSectionD(report: CohortReport): string {
  const top = report.comparison.common_markets.slice(0, 15);
  const blocks = top.map(cm => {
    const stat = report.market_stat_tests.find(s => s.market_id === cm.market_id);
    const positions = cm.cohort_positions.map(p => {
      const dist = Object.entries(p.answer_distribution).map(([a, n]) => `${a}: ${n}`).join(', ');
      const sampleBasis = p.opinions.find(o => o.basis)?.basis ?? null;
      return `- **${p.cohort_label}**: majority \`${trim(p.majority_answer, 60)}\` · distribution {${dist}} · avg confidence ${p.avg_confidence}${sampleBasis ? `\n  - Sample basis: _${trim(sampleBasis, 200)}_` : ''}`;
    }).join('\n');
    const statLine = stat
      ? `χ²=${stat.chi_square} (df=${stat.df}, ${stat.p_value_approx})${stat.confidence_kruskal_h != null ? ` · Kruskal–Wallis H=${stat.confidence_kruskal_h}${stat.confidence_significant ? ' (significant)' : ''}` : ''}`
      : '_no test computed_';
    return `### ${trim(cm.question, 140)}

_Market ID_: \`${cm.market_id}\` · _Category_: ${cm.category} · _Status_: ${cm.status} · _Divergence_: ${cm.divergence_score}/100 · _Resolved_: ${cm.resolved_answer ?? '—'}

**Stat tests:** ${statLine}

${positions}`;
  }).join('\n\n---\n\n');

  return `## D. Per-market results

_Showing top ${top.length} most-divergent common markets._

${blocks || '_No common markets._'}`;
}

// E. Provenance deep-dive
function renderSectionE(report: CohortReport): string {
  const main = report.provenance_aggregates.map(p =>
    `| ${p.cohort_label} | ${p.opinions_with_provenance}/${p.total_opinions} | ${p.mean_score.toFixed(2)} | ${p.pct_missing_expected}% | ${p.pct_misaligned}% | ${p.mean_basis_overlap.toFixed(2)} |`,
  ).join('\n');

  const breakdown = report.provenance_aggregates.flatMap(p =>
    p.by_knowledge_source.map(ks =>
      `| ${p.cohort_label} | ${ks.knowledge_source} | ${ks.n} | ${ks.mean_score.toFixed(2)} | ${ks.pct_missing_expected}% | ${ks.pct_misaligned}% |`,
    ),
  ).join('\n');

  return `## E. Provenance deep-dive

### Overall

| Cohort | Opinions w/ prov | Mean score | Missing | Misaligned | Basis↔context |
|---|---:|---:|---:|---:|---:|
${main || '_no data_'}

### By cohort × knowledge_source policy

| Cohort | knowledge_source | n | Mean score | Missing | Misaligned |
|---|---|---:|---:|---:|---:|
${breakdown || '_no data_'}

_Read this table for patterns like "Cohort B misaligns 40% of the time on \`provided_context_only\` markets" — that's the diagnostic signal that the cohort's prompt isn't binding the agent to the provided context._`;
}

// F. Divergence catalog
function renderSectionF(report: CohortReport): string {
  const interesting = report.comparison.common_markets.filter(cm => cm.divergence_score >= 20);
  if (interesting.length === 0) return `## F. Divergence catalog\n\n_No common markets crossed the divergence threshold (score ≥ 20)._`;

  const rows = interesting.map(cm => {
    const stat = report.market_stat_tests.find(s => s.market_id === cm.market_id);
    const positions = cm.cohort_positions.map(p =>
      `${p.cohort_label}=\`${trim(p.majority_answer, 30)}\``,
    ).join(' / ');
    return `| ${trim(cm.question, 70)} | ${cm.divergence_score} | ${positions} | ${stat?.p_value_approx ?? '—'} |`;
  }).join('\n');

  return `## F. Divergence catalog

_All common markets with divergence score ≥ 20, sorted descending._

| Market | Divergence | Cohort majorities | χ² p |
|---|---:|---|---|
${rows}`;
}

// G. Outlier agents
function renderSectionG(report: CohortReport): string {
  if (report.outliers.length === 0) return `## G. Outlier agents\n\n_No agents met the participation threshold (≥ 3 common markets)._`;

  const top = report.outliers.slice(0, 10);
  const blocks = top.map(o => `### \`${o.handle}\` (Cohort ${o.cohort_label})

- Participations in common markets: ${o.participations_in_common_markets}
- Disagreements with own cohort majority: ${o.disagreements_with_own_cohort}
- Deviation: ${o.deviation_pct}%
${o.example_disagreement ? `- Example: on _"${trim(o.example_market_question ?? '', 100)}"_, ${o.example_disagreement}` : ''}`).join('\n\n');

  return `## G. Outlier agents

_Within-cohort contrarians — agents who departed from their own cohort majority most often._

${blocks}`;
}

// H. Reproducibility
function renderSectionH(report: CohortReport): string {
  return `## H. Reproducibility

This report is generated by \`generateCohortReport()\` in \`src/services/cohort-report.ts\` and rendered by \`renderMemoMarkdown\`/\`renderAppendixMarkdown\` in \`src/services/cohort-report-render.ts\`.

To re-run for any batch:

\`\`\`
GET /admin/cohort-report.json?batch={tag}&cohorts={A,B,C[,...]}
GET /admin/cohort-report/memo.md?batch={tag}&cohorts={A,B,C[,...]}
GET /admin/cohort-report/appendix.md?batch={tag}&cohorts={A,B,C[,...]}
\`\`\`

To produce the PDFs, run \`/make-pdf\` against the two markdown outputs.

### Inputs
- Batch tag: \`${report.meta.batch_tag}\`
- Cohort labels: ${report.meta.cohort_labels.join(', ')}
- Handle regex: \`${report.meta.handle_pattern}\`
- Resolved cohorts:
${report.resolved_cohorts.map(c => `  - **${c.label}** (${c.agent_ids.length}): ${c.handles.join(', ') || '_(none)_'}`).join('\n')}

### Determinism
The output is deterministic given the DB snapshot, batch tag, and cohort labels. Re-running on a frozen snapshot will reproduce the same JSON byte-for-byte.`;
}

// ── HTML renderers (print-styled, single-click "Save as PDF") ────────────

const PRINT_CSS = `
@page { size: letter; margin: 0.75in; }
* { box-sizing: border-box; }
html, body { background: #fff; color: #111; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.45; margin: 0; padding: 0; }
h1 { font-size: 18pt; margin: 0 0 6pt; }
h2 { font-size: 13pt; margin: 16pt 0 6pt; border-bottom: 0.5pt solid #ccc; padding-bottom: 2pt; }
h3 { font-size: 11pt; margin: 12pt 0 4pt; }
p { margin: 0 0 6pt; }
ul { margin: 4pt 0 8pt 1.1em; padding: 0; }
li { margin: 1.5pt 0; }
ul ul { margin: 2pt 0 2pt 1.2em; }
code { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 9pt; background: #f3f3f3; padding: 0 3pt; border-radius: 2pt; }
em, i { color: #444; }
.muted { color: #555; font-style: italic; }
.meta { color: #555; font-size: 9pt; margin-bottom: 10pt; }
table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 4pt 0 10pt; }
thead th { font-size: 8pt; white-space: nowrap; text-align: left; border-bottom: 1pt solid #999; padding: 3pt 6pt 4pt; background: #f6f6f6; }
tbody td { padding: 3pt 6pt; border-bottom: 0.5pt solid #eee; vertical-align: top; }
tbody tr:last-child td { border-bottom: none; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
hr { border: none; border-top: 0.5pt solid #ccc; margin: 16pt 0 10pt; }
@media screen {
  body { max-width: 7.5in; margin: 0.5in auto; padding: 0.5in; background: #fff; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
}
`;

function htmlEscape(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlDoc(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${htmlEscape(title)}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
${body}
<script>
window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 250); });
</script>
</body>
</html>`;
}

export function renderMemoHtml(report: CohortReport): string {
  const { meta, comparison, provenance_aggregates, market_stat_tests, headline, cohort_voices, participation_gaps } = report;

  const sigCount = market_stat_tests.filter(s => s.p_value_approx !== 'ns').length;
  const totalCommon = market_stat_tests.length;

  const cohortRows = comparison.cohorts.map(c =>
    `<tr><td><strong>${htmlEscape(c.label)}</strong></td><td class="num">${c.agent_count}</td><td class="num">${c.aggregate.total_opinions}</td><td class="num">${c.aggregate.avg_confidence}</td></tr>`,
  ).join('');

  const headlineBullets = renderHeadlineBulletsHtml(headline.bullets, participation_gaps);
  const voiceBlock = renderVoicesHtml(cohort_voices, totalCommon);
  const divergenceBlock = renderDivergenceHtml(comparison.common_markets, market_stat_tests);
  const refrainedBlock = renderRefrainedHtml(participation_gaps);
  const groundingBlock = renderGroundingHtml(provenance_aggregates);

  const body = `
<h1>${htmlEscape(meta.batch_tag.toUpperCase())} cohort report — memo</h1>
<p class="meta"><em>Batch</em>: <code>${htmlEscape(meta.batch_tag)}</code> &nbsp; <em>Cohorts</em>: ${meta.cohort_labels.map(htmlEscape).join(', ')} &nbsp; <em>Generated</em>: ${htmlEscape(meta.generated_at)}</p>

<h2>Headline</h2>
<p>${htmlEscape(headline.one_liner)}</p>
${headlineBullets}

<h2>Cohorts at a glance</h2>
<table>
<thead><tr><th>Cohort</th><th class="num">Agents</th><th class="num">Opinions</th><th class="num">Avg confidence</th></tr></thead>
<tbody>${cohortRows || '<tr><td colspan="4" class="muted">no cohorts resolved</td></tr>'}</tbody>
</table>

<h2>Voice across shared markets</h2>
${voiceBlock}

<h2>Vote pattern</h2>
<ul>
  <li>${totalCommon} markets answered by ≥ 2 cohorts qualify as <strong>common markets</strong>.
    <ul>
      <li>${sigCount} showed statistically significant answer-distribution differences (χ², p&lt;0.1 or stricter).</li>
      <li>Below: markets where cohorts diverged most (score ≥ ${DIVERGENCE_THRESHOLD}).</li>
    </ul>
  </li>
</ul>
${divergenceBlock}
${refrainedBlock}

<h2>Context grounding</h2>
${groundingBlock}

<h2>Open questions for the next batch</h2>
<ul>
  <li>Were the differences observed driven by which markets each cohort happened to answer?
    <ul><li>See Appendix D (per-market breakdown) to triangulate.</li></ul>
  </li>
  <li>Are the lowest-grounded responses concentrated in any cohort × <code>knowledge_source</code> cell?
    <ul><li>See Appendix E.</li></ul>
  </li>
  <li>Do the same agents drive within-cohort variance every batch?
    <ul><li>Compare Appendix G outliers across runs.</li></ul>
  </li>
</ul>
<hr>
<p class="muted">Appendix follows separately. See <code>${htmlEscape(meta.batch_tag)}-appendix</code>.</p>
`;

  return htmlDoc(`${meta.batch_tag.toUpperCase()} cohort memo`, body);
}

function renderHeadlineBulletsHtml(bullets: string[], gaps: ParticipationGap[]): string {
  if (bullets.length === 0 && gaps.length === 0) {
    return '<p class="muted">No additional notable bullets generated automatically; see appendix.</p>';
  }
  const items: string[] = bullets.map(b => `<li>${htmlEscape(b)}</li>`);
  if (gaps.length > 0) {
    const byRefrained = new Map<string, number>();
    for (const g of gaps) for (const label of g.refrained) byRefrained.set(label, (byRefrained.get(label) || 0) + 1);
    const summary = Array.from(byRefrained.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, n]) => `Cohort ${htmlEscape(label)} refrained on ${n}`)
      .join(', ');
    items.push(`<li>Participation gaps: ${summary} markets where ≥ 1 other cohort answered.</li>`);
  }
  return `<ul>${items.join('')}</ul>`;
}

function renderVoicesHtml(voices: CohortVoice[], totalCommon: number): string {
  if (voices.length === 0) return '<p class="muted">No cohort voices computed.</p>';
  const items = voices.map(v => {
    const domain = v.primary_domain ?? '—';
    const sub: string[] = [];
    sub.push(`<li>Aligned with the cross-cohort majority on <strong>${v.consensus_rate}%</strong> of ${v.common_markets_participated} shared markets.</li>`);
    if (v.grounding_tag !== 'unknown') {
      sub.push(`<li>Grounding: <strong>${htmlEscape(v.grounding_tag)}</strong> (provenance ${v.mean_provenance.toFixed(2)}, basis↔context ${v.mean_basis_overlap.toFixed(2)}).</li>`);
    }
    return `<li><strong>Cohort ${htmlEscape(v.cohort_label)}</strong> — leans <strong>${htmlEscape(v.dominant_style)}</strong>; mean confidence ${v.mean_confidence}; primary domain ${htmlEscape(domain)}<ul>${sub.join('')}</ul></li>`;
  }).join('');
  const footer = totalCommon > 0
    ? `<p class="muted">Computed across ${totalCommon} common markets — i.e. the totality of shared markets, not just the divergent ones.</p>`
    : '';
  return `<ul>${items}</ul>${footer}`;
}

function renderDivergenceHtml(commonMarkets: CommonMarketComparison[], stats: MarketStatTest[]): string {
  const filtered = commonMarkets.filter(cm => cm.divergence_score >= DIVERGENCE_THRESHOLD).slice(0, 3);
  if (filtered.length === 0) {
    return `<p class="muted">No common markets crossed the divergence threshold (score ≥ ${DIVERGENCE_THRESHOLD}). All cohorts reached similar majorities — see Appendix D for full distributions.</p>`;
  }
  const items = filtered.map(cm => {
    const positions = cm.cohort_positions.map(p => `<strong>${htmlEscape(p.cohort_label)}</strong> → "${htmlEscape(trim(p.majority_answer, 40))}"`).join(', ');
    const stat = stats.find(s => s.market_id === cm.market_id);
    const tag = stat && stat.p_value_approx !== 'ns' ? ` <em>(${htmlEscape(stat.p_value_approx)})</em>` : '';
    return `<li><em>${htmlEscape(trim(cm.question, 110))}</em> — ${positions}${tag}</li>`;
  }).join('');
  return `<ul>${items}</ul>`;
}

function renderRefrainedHtml(gaps: ParticipationGap[]): string {
  if (gaps.length === 0) return '';
  const top = gaps.slice(0, REFRAINED_MARKETS_LIMIT);
  const more = gaps.length > top.length ? `<li class="muted">…and ${gaps.length - top.length} more (see Appendix D).</li>` : '';
  const rows = top.map(g => {
    const ans = g.answered_by.map(htmlEscape).join(', ');
    const ref = g.refrained.map(l => `<strong>${htmlEscape(l)}</strong>`).join(', ');
    return `<li><em>${htmlEscape(trim(g.question, 110))}</em> — answered by ${ans}; ${ref} refrained</li>`;
  }).join('');
  return `<h3>Markets where a cohort refrained</h3>
<ul>${rows}${more}</ul>`;
}

function renderGroundingHtml(provs: ProvenanceAggregate[]): string {
  if (provs.length === 0) return '<p class="muted">No provenance data.</p>';
  const items = provs.map(p =>
    `<li><strong>Cohort ${htmlEscape(p.cohort_label)}</strong> — provenance ${p.mean_score.toFixed(2)}, basis↔context ${p.mean_basis_overlap.toFixed(2)}</li>`,
  ).join('');
  return `<ul>${items}</ul>
<p class="muted">Provenance: 1.00 = cited sources align with the market's <code>knowledge_source</code> policy. Basis↔context: Jaccard overlap of rationale tokens with the market's description + context. See Appendix E for the full breakdown.</p>`;
}

// Appendix — same content as renderAppendixMarkdown but emitted as HTML.
export function renderAppendixHtml(report: CohortReport): string {
  const sections: string[] = [];
  sections.push(`<h1>${htmlEscape(report.meta.batch_tag.toUpperCase())} cohort report — appendix</h1>`);
  sections.push(`<p class="meta"><em>Generated</em>: ${htmlEscape(report.meta.generated_at)}<br><em>Handle pattern</em>: <code>${htmlEscape(report.meta.handle_pattern)}</code> (replace <code>{LABEL}</code> with each of ${report.meta.cohort_labels.map(htmlEscape).join(', ')})</p>`);
  sections.push(renderTocHtml());
  sections.push(renderSectionAHtml(report));
  sections.push(renderSectionBHtml(report));
  sections.push(renderSectionCHtml(report));
  sections.push(renderSectionDHtml(report));
  sections.push(renderSectionEHtml(report));
  sections.push(renderSectionFHtml(report));
  sections.push(renderSectionGHtml(report));
  sections.push(renderSectionHHtml(report));
  return htmlDoc(`${report.meta.batch_tag.toUpperCase()} cohort appendix`, sections.join('\n'));
}

function renderTocHtml(): string {
  return `<h2>Table of contents</h2>
<ul>
<li>A. Methodology</li>
<li>B. Cohort cards</li>
<li>C. Per-agent cards</li>
<li>D. Per-market results</li>
<li>E. Provenance deep-dive</li>
<li>F. Divergence catalog</li>
<li>G. Outlier agents</li>
<li>H. Reproducibility</li>
</ul>`;
}

function renderSectionAHtml(report: CohortReport): string {
  return `<h2>A. Methodology</h2>
<h3>Cohort resolution</h3>
<p>Agents are resolved by handle regex: <code>${htmlEscape(report.meta.handle_pattern)}</code>. The batch tag and label list are inputs to the report endpoint; no additional configuration is needed for new batches (e.g. <code>may-A1…may-C5</code>).</p>

<h3>Vote and divergence analysis</h3>
<p>Re-uses <code>generateCohortComparison()</code> from <code>src/services/cohort-comparison.ts</code>. Per common market (≥ 2 cohorts answered):</p>
<ul>
<li>per-cohort majority answer + full answer distribution</li>
<li>average pairwise total-variation distance across cohorts (<code>divergence_score</code>, 0–100)</li>
<li>average confidence per cohort</li>
</ul>

<h3>Statistical tests</h3>
<ul>
<li><strong>Pearson χ²</strong> on the cohort × answer contingency matrix. df = (k_cohorts − 1) × (k_answers − 1). p-value approximated via standard critical values (p&lt;0.01, p&lt;0.05, p&lt;0.1).</li>
<li><strong>Kruskal–Wallis H</strong> on confidence values across cohorts (k ≥ 2 groups). Uses chi-square approximation with df = k−1; reported as "significant" at p&lt;0.05. Only computed when n ≥ 4 total.</li>
<li>Non-parametric, small-N-friendly tests; treat any p-value as descriptive rather than confirmatory at this batch size.</li>
</ul>

<h3>Context-grounding (answer attribution)</h3>
<p>Each opinion carries a <code>provenance</code> payload (cited <code>article</code>/<code>data_point</code>/<code>link</code>/<code>attachment</code>/<code>agent_kb</code>/<code>local</code>/<code>training</code> sources) and the market carries a <code>knowledge_source</code> policy.</p>
<ul>
<li><strong>provenance_score</strong> (0.00–1.00): 1.0 minus 0.3 per "missing expected" source type, minus 0.3 per "misaligned" source type, floored at 0</li>
<li><strong>basis↔context overlap</strong>: Jaccard similarity of tokenized <code>opinion.basis</code> against <code>market.description</code> + <code>market.context_json</code></li>
</ul>

<h3>Outliers</h3>
<p>Agents who participated in ≥ 3 common markets are scored by <code>disagreements_with_own_cohort / participations</code>. Reported sorted by deviation %.</p>

<h3>Limitations</h3>
<ul>
<li>Provenance is self-reported; an unscrupulous agent could claim citations it didn't read. Basis↔context overlap partially corrects for this.</li>
<li>Small N means most χ² results will be <code>ns</code>. The report is more useful as a structured artifact across batches than a single-batch confirmatory analysis.</li>
</ul>`;
}

function renderSectionBHtml(report: CohortReport): string {
  const cards = report.comparison.cohorts.map(cohort => {
    const prov = report.provenance_aggregates.find(p => p.cohort_label === cohort.label);
    const conf = report.comparison.confidence_analysis.per_cohort.find(p => p.label === cohort.label);

    const provBlock = prov
      ? `<p><strong>Context grounding:</strong></p>
<ul>
<li>Mean provenance: ${prov.mean_score.toFixed(2)} (n=${prov.opinions_with_provenance} / ${prov.total_opinions} opinions had provenance payload)</li>
<li>% missing-expected: ${prov.pct_missing_expected}%</li>
<li>% misaligned: ${prov.pct_misaligned}%</li>
<li>Mean basis↔context overlap (Jaccard): ${prov.mean_basis_overlap.toFixed(2)}</li>
</ul>`
      : '';

    const confBlock = conf
      ? `<p><strong>Confidence:</strong></p>
<ul>
<li>Mean ${conf.mean}, median ${conf.median}, σ ${conf.std_dev}</li>
<li>${conf.high_confidence_pct}% of opinions at ≥ 80, ${conf.low_confidence_pct}% at ≤ 30</li>
</ul>`
      : '';

    return `<h3>Cohort ${htmlEscape(cohort.label)} (${cohort.agent_count} agents)</h3>
${provBlock}
${confBlock}
<p><strong>Style distribution:</strong> ${htmlEscape(formatRecord(cohort.aggregate.style_distribution) || '(unclassified)')}<br>
<strong>Domain coverage:</strong> ${cohort.aggregate.domain_coverage.map(htmlEscape).join(', ') || '<span class="muted">(none tagged)</span>'}</p>`;
  }).join('<hr>');

  return `<h2>B. Cohort cards</h2>
${cards || '<p class="muted">No cohorts resolved.</p>'}`;
}

function renderSectionCHtml(report: CohortReport): string {
  const cards: string[] = [];
  for (const cohort of report.comparison.cohorts) {
    for (const agent of cohort.agents) {
      cards.push(`<h3><code>${htmlEscape(agent.handle)}</code> (Cohort ${htmlEscape(cohort.label)})</h3>
<ul>
<li>Style: ${htmlEscape(agent.opinion_style)} (consensus alignment ${agent.consensus_alignment}, contrarian rate ${agent.contrarian_rate})</li>
<li>Primary domain: ${htmlEscape(agent.primary_domain ?? '—')}; tags: ${agent.domain_tags.map(htmlEscape).join(', ') || '—'}</li>
<li>Participation: ${agent.participation_rate}% (${agent.total_opinions} opinions)</li>
<li>Custom objective: ${agent.custom_objective ? `<code>${htmlEscape(trim(agent.custom_objective, 200))}</code>` : '<span class="muted">(none)</span>'}</li>
<li>Custom instructions: ${agent.custom_instructions ? `<code>${htmlEscape(trim(agent.custom_instructions, 200))}</code>` : '<span class="muted">(none)</span>'}</li>
</ul>`);
    }
  }
  return `<h2>C. Per-agent cards</h2>
${cards.join('') || '<p class="muted">No agents resolved.</p>'}`;
}

function renderSectionDHtml(report: CohortReport): string {
  const top = report.comparison.common_markets.slice(0, 15);
  const blocks = top.map(cm => {
    const stat = report.market_stat_tests.find(s => s.market_id === cm.market_id);
    const positions = cm.cohort_positions.map(p => {
      const dist = Object.entries(p.answer_distribution).map(([a, n]) => `${htmlEscape(a)}: ${n}`).join(', ');
      const sampleBasis = p.opinions.find(o => o.basis)?.basis ?? null;
      return `<li><strong>${htmlEscape(p.cohort_label)}</strong>: majority <code>${htmlEscape(trim(p.majority_answer, 60))}</code> · distribution {${dist}} · avg confidence ${p.avg_confidence}${sampleBasis ? `<ul><li>Sample basis: <em>${htmlEscape(trim(sampleBasis, 200))}</em></li></ul>` : ''}</li>`;
    }).join('');
    const statLine = stat
      ? `χ²=${stat.chi_square} (df=${stat.df}, ${htmlEscape(stat.p_value_approx)})${stat.confidence_kruskal_h != null ? ` · Kruskal–Wallis H=${stat.confidence_kruskal_h}${stat.confidence_significant ? ' (significant)' : ''}` : ''}`
      : '<span class="muted">no test computed</span>';
    return `<h3>${htmlEscape(trim(cm.question, 140))}</h3>
<p class="meta"><em>Market ID</em>: <code>${htmlEscape(cm.market_id)}</code> · <em>Category</em>: ${htmlEscape(cm.category)} · <em>Status</em>: ${htmlEscape(cm.status)} · <em>Divergence</em>: ${cm.divergence_score}/100 · <em>Resolved</em>: ${htmlEscape(cm.resolved_answer ?? '—')}</p>
<p><strong>Stat tests:</strong> ${statLine}</p>
<ul>${positions}</ul>`;
  }).join('<hr>');
  return `<h2>D. Per-market results</h2>
<p class="muted">Showing top ${top.length} most-divergent common markets.</p>
${blocks || '<p class="muted">No common markets.</p>'}`;
}

function renderSectionEHtml(report: CohortReport): string {
  const main = report.provenance_aggregates.map(p =>
    `<tr><td>${htmlEscape(p.cohort_label)}</td><td class="num">${p.opinions_with_provenance}/${p.total_opinions}</td><td class="num">${p.mean_score.toFixed(2)}</td><td class="num">${p.pct_missing_expected}%</td><td class="num">${p.pct_misaligned}%</td><td class="num">${p.mean_basis_overlap.toFixed(2)}</td></tr>`,
  ).join('');
  const breakdown = report.provenance_aggregates.flatMap(p =>
    p.by_knowledge_source.map(ks =>
      `<tr><td>${htmlEscape(p.cohort_label)}</td><td>${htmlEscape(ks.knowledge_source)}</td><td class="num">${ks.n}</td><td class="num">${ks.mean_score.toFixed(2)}</td><td class="num">${ks.pct_missing_expected}%</td><td class="num">${ks.pct_misaligned}%</td></tr>`,
    ),
  ).join('');
  return `<h2>E. Provenance deep-dive</h2>
<h3>Overall</h3>
<table>
<thead><tr><th>Cohort</th><th class="num">Op. w/ prov</th><th class="num">Mean score</th><th class="num">Missing</th><th class="num">Misaligned</th><th class="num">Basis↔ctx</th></tr></thead>
<tbody>${main || '<tr><td colspan="6" class="muted">no data</td></tr>'}</tbody>
</table>
<h3>By cohort × knowledge_source policy</h3>
<table>
<thead><tr><th>Cohort</th><th>knowledge_source</th><th class="num">n</th><th class="num">Mean score</th><th class="num">Missing</th><th class="num">Misaligned</th></tr></thead>
<tbody>${breakdown || '<tr><td colspan="6" class="muted">no data</td></tr>'}</tbody>
</table>
<p class="muted">Read this table for patterns like "Cohort B misaligns 40% of the time on <code>provided_context_only</code> markets" — that's the diagnostic signal that the cohort's prompt isn't binding the agent to the provided context.</p>`;
}

function renderSectionFHtml(report: CohortReport): string {
  const interesting = report.comparison.common_markets.filter(cm => cm.divergence_score >= 20);
  if (interesting.length === 0) {
    return `<h2>F. Divergence catalog</h2><p class="muted">No common markets crossed the divergence threshold (score ≥ 20).</p>`;
  }
  const rows = interesting.map(cm => {
    const stat = report.market_stat_tests.find(s => s.market_id === cm.market_id);
    const positions = cm.cohort_positions.map(p =>
      `${htmlEscape(p.cohort_label)}=<code>${htmlEscape(trim(p.majority_answer, 30))}</code>`,
    ).join(' / ');
    return `<tr><td>${htmlEscape(trim(cm.question, 70))}</td><td class="num">${cm.divergence_score}</td><td>${positions}</td><td>${htmlEscape(stat?.p_value_approx ?? '—')}</td></tr>`;
  }).join('');
  return `<h2>F. Divergence catalog</h2>
<p class="muted">All common markets with divergence score ≥ 20, sorted descending.</p>
<table>
<thead><tr><th>Market</th><th class="num">Divergence</th><th>Cohort majorities</th><th>χ² p</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
}

function renderSectionGHtml(report: CohortReport): string {
  if (report.outliers.length === 0) {
    return `<h2>G. Outlier agents</h2><p class="muted">No agents met the participation threshold (≥ 3 common markets).</p>`;
  }
  const top = report.outliers.slice(0, 10);
  const blocks = top.map(o => `<h3><code>${htmlEscape(o.handle)}</code> (Cohort ${htmlEscape(o.cohort_label)})</h3>
<ul>
<li>Participations in common markets: ${o.participations_in_common_markets}</li>
<li>Disagreements with own cohort majority: ${o.disagreements_with_own_cohort}</li>
<li>Deviation: ${o.deviation_pct}%</li>
${o.example_disagreement ? `<li>Example: on <em>"${htmlEscape(trim(o.example_market_question ?? '', 100))}"</em>, ${htmlEscape(o.example_disagreement)}</li>` : ''}
</ul>`).join('');
  return `<h2>G. Outlier agents</h2>
<p class="muted">Within-cohort contrarians — agents who departed from their own cohort majority most often.</p>
${blocks}`;
}

function renderSectionHHtml(report: CohortReport): string {
  return `<h2>H. Reproducibility</h2>
<p>This report is generated by <code>generateCohortReport()</code> in <code>src/services/cohort-report.ts</code> and rendered by <code>renderMemoHtml</code> / <code>renderAppendixHtml</code> in <code>src/services/cohort-report-render.ts</code>.</p>
<h3>Inputs</h3>
<ul>
<li>Batch tag: <code>${htmlEscape(report.meta.batch_tag)}</code></li>
<li>Cohort labels: ${report.meta.cohort_labels.map(htmlEscape).join(', ')}</li>
<li>Handle regex: <code>${htmlEscape(report.meta.handle_pattern)}</code></li>
<li>Resolved cohorts:
<ul>${report.resolved_cohorts.map(c => `<li><strong>${htmlEscape(c.label)}</strong> (${c.agent_ids.length}): ${c.handles.map(htmlEscape).join(', ') || '<span class="muted">(none)</span>'}</li>`).join('')}</ul>
</li>
</ul>
<h3>Determinism</h3>
<p>The output is deterministic given the DB snapshot, batch tag, and cohort labels. Re-running on a frozen snapshot reproduces the same JSON byte-for-byte.</p>`;
}

// ── helpers ──────────────────────────────────────────────────────────────

function trim(s: string, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function formatRecord(rec: Record<string, number>): string {
  return Object.entries(rec).map(([k, v]) => `${k}=${v}`).join(', ');
}

// Suppress unused-import warning for types used only via inline references
export type { CohortReport, ProvenanceAggregate, MarketStatTest, AgentOutlier, CommonMarketComparison, ParticipationGap, CohortVoice };
