import { themeCSS, themeToggleButton, themeScript } from './theme.js';
import { brandTitle, PRODUCT_NAME } from '../branding.js';

export function renderCohortAnalyzerPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandTitle("Cohort Analyzer")}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #1a1816; --surface: #292524; --border: #3d3533;
      --shadow: 0 2px 8px rgba(0,0,0,.3), 0 1px 3px rgba(0,0,0,.2);
      --text: #a8a29e; --text-dark: #fafaf9; --text-muted: #78716c;
      --accent: #2dd4a0; --accent-light: rgba(45,212,160,.1);
      --green: #2dd4a0; --green-bg: rgba(45,212,160,.1);
      --yellow: #f59e0b; --yellow-bg: rgba(245,158,11,.1);
      --red: #e87461; --red-bg: rgba(232,116,97,.1);
      --blue: #60a5fa; --blue-bg: rgba(96,165,250,.1);
      --purple: #a78bfa; --purple-bg: rgba(167,139,250,.1);
    }
    ${themeCSS}
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }

    /* Topbar + nav */
    .topbar { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 32px; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
    .topbar-left { display: flex; align-items: center; gap: 16px; }
    .topbar-wordmark { font-size: 13px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.01em; }
    .topbar-divider { width: 1px; height: 18px; background: var(--border); }
    .topbar-subtitle { font-size: 13px; color: var(--text-muted); }
    .topbar-right { display: flex; align-items: center; gap: 16px; }
    .hamburger-btn { background: none; border: none; color: var(--text-dark); font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background .15s; line-height: 1; }
    .hamburger-btn:hover { background: var(--bg); }
    .nav-dropdown { position: absolute; top: 56px; left: 0; background: var(--surface); border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 0; box-shadow: 0 8px 24px rgba(0,0,0,.4); min-width: 220px; display: none; flex-direction: column; z-index: 200; }
    .nav-dropdown.open { display: flex; }
    .nav-item { padding: 12px 20px; font-size: 14px; color: var(--text); text-decoration: none; transition: background .15s, color .15s; }
    .nav-item:hover { background: var(--bg); color: var(--text-dark); }
    .nav-item.active { color: var(--accent); font-weight: 600; }
    .nav-divider { height: 1px; background: var(--border); margin: 4px 0; }

    .main { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }

    /* Setup section */
    .setup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    @media (max-width: 900px) { .setup-grid { grid-template-columns: 1fr; } }

    .panel { background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); overflow: hidden; }
    .panel-header { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
    .panel-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .panel-body { padding: 16px 20px; }

    /* Collapsible panel (details-based) */
    details.panel > summary.panel-header { cursor: pointer; list-style: none; user-select: none; border-bottom: 1px solid transparent; transition: border-color .15s; }
    details.panel > summary.panel-header::-webkit-details-marker { display: none; }
    details.panel > summary.panel-header::before { content: '▶'; font-size: 10px; color: var(--text-muted); margin-right: 8px; transition: transform 0.2s; display: inline-block; }
    details.panel[open] > summary.panel-header { border-bottom-color: var(--border); }
    details.panel[open] > summary.panel-header::before { transform: rotate(90deg); }

    /* Agent pool */
    .pool-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .pool-search { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; font-size: 13px; flex: 1; min-width: 120px; }
    .pool-search:focus { outline: none; border-color: var(--accent); }
    .pool-select { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
    .agent-list { max-height: 420px; overflow-y: auto; }
    .agent-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 4px; cursor: pointer; transition: background .1s; user-select: none; border-left: 3px solid transparent; }
    .agent-row:hover { background: var(--bg); }
    .agent-row.in-cohort { opacity: 0.4; }
    .agent-row.selected { border-left-color: var(--accent); background: var(--accent-light); }
    .agent-row.selected:hover { background: var(--accent-light); }
    .agent-checkbox { width: 14px; height: 14px; accent-color: var(--accent); cursor: pointer; margin: 0; flex-shrink: 0; }
    .agent-checkbox:disabled { cursor: not-allowed; opacity: 0.5; }

    /* Multi-select strip above the agent list */
    .pool-selection-strip {
      display: none; align-items: center; gap: 10px; margin-bottom: 8px;
      padding: 8px 10px; background: var(--accent-light); border-radius: 4px;
      font-size: 12px; color: var(--text-dark);
    }
    .pool-selection-strip.visible { display: flex; }
    .pool-selection-strip .pool-sel-count { font-weight: 700; color: var(--accent); }
    .pool-selection-strip .pool-sel-btn {
      background: transparent; border: 1px solid var(--border); color: var(--text);
      padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;
    }
    .pool-selection-strip .pool-sel-btn:hover { border-color: var(--accent); color: var(--accent); }
    .agent-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--text-dark); flex-shrink: 0; overflow: hidden; }
    .agent-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .agent-info { flex: 1; min-width: 0; }
    .agent-handle { font-size: 13px; font-weight: 600; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .agent-meta { font-size: 11px; color: var(--text-muted); }
    .agent-add-btn { font-size: 18px; color: var(--accent); cursor: pointer; padding: 0 4px; line-height: 1; opacity: 0; transition: opacity .15s; }
    .agent-row:hover .agent-add-btn { opacity: 1; }

    /* Cohort containers */
    .cohorts-area { display: flex; flex-direction: column; gap: 12px; }
    .cohort-box { background: var(--bg); border: 2px dashed var(--border); border-radius: 8px; padding: 12px; min-height: 80px; transition: border-color .15s, background .15s; }
    .cohort-box.drag-over { border-color: var(--accent); background: var(--accent-light); }
    .cohort-box-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .cohort-label { font-size: 13px; font-weight: 700; color: var(--text-dark); }
    .cohort-count { font-size: 11px; color: var(--text-muted); }
    .cohort-remove-btn { font-size: 11px; color: var(--red); cursor: pointer; background: none; border: none; padding: 2px 6px; }
    .cohort-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .agent-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 4px 10px 4px 6px; font-size: 12px; color: var(--text-dark); cursor: grab; user-select: none; }
    .agent-chip:active { cursor: grabbing; }
    .agent-chip .chip-avatar { width: 20px; height: 20px; border-radius: 50%; background: var(--border); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; overflow: hidden; }
    .agent-chip .chip-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .agent-chip .chip-remove { font-size: 14px; cursor: pointer; color: var(--text-muted); margin-left: 2px; line-height: 1; }
    .agent-chip .chip-remove:hover { color: var(--red); }
    .cohort-empty { font-size: 12px; color: var(--text-muted); font-style: italic; }
    .add-cohort-btn { background: none; border: 1px dashed var(--border); border-radius: 8px; padding: 10px; font-size: 13px; color: var(--text-muted); cursor: pointer; text-align: center; transition: border-color .15s, color .15s; }
    .add-cohort-btn:hover { border-color: var(--accent); color: var(--accent); }

    /* Cohort colors */
    .cohort-a { --cohort-color: var(--accent); }
    .cohort-b { --cohort-color: var(--blue); }
    .cohort-c { --cohort-color: var(--yellow); }
    .cohort-d { --cohort-color: var(--purple); }
    .cohort-e { --cohort-color: var(--red); }
    .cohort-f { --cohort-color: var(--green); }
    .cohort-g { --cohort-color: #f472b6; }
    .cohort-h { --cohort-color: #38bdf8; }
    .cohort-a .cohort-label { color: var(--accent); }
    .cohort-b .cohort-label { color: var(--blue); }
    .cohort-c .cohort-label { color: var(--yellow); }
    .cohort-d .cohort-label { color: var(--purple); }
    .cohort-e .cohort-label { color: var(--red); }
    .cohort-f .cohort-label { color: var(--green); }
    .cohort-g .cohort-label { color: #f472b6; }
    .cohort-h .cohort-label { color: #38bdf8; }

    /* Batch loader + generic control styling */
    .control-group { display: flex; flex-direction: column; gap: 4px; }
    .control-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .control-select { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; font-size: 13px; cursor: pointer; }
    .btn-generate { background: var(--accent); color: #1a1816; border: none; border-radius: 4px; padding: 8px 24px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s; height: 37px; }
    .btn-generate:hover { background: #22b888; }
    .btn-generate:disabled { opacity: 0.5; cursor: default; }

    /* Comparison action bar — sticky CTA + cohort feed summary + post-gen exports */
    .action-bar {
      position: sticky; top: 56px; z-index: 90;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      border-top: 2px solid var(--accent);
      box-shadow: 0 2px 8px rgba(0,0,0,.25);
    }
    .action-bar-inner {
      max-width: 1200px; margin: 0 auto;
      padding: 14px 24px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .action-bar-top { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
    .action-bar-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .action-bar-batch { font-size: 12px; color: var(--text-muted); }
    .action-bar-batch strong { color: var(--text-dark); font-weight: 700; }
    .action-bar-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .action-bar-feed { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; color: var(--text); flex: 1; min-width: 0; }
    .action-bar-feed .feed-label { color: var(--text-muted); margin-right: 2px; font-size: 12px; }
    .action-bar-feed .feed-empty { color: var(--text-muted); font-style: italic; }
    .action-bar-feed .vs { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
    .cohort-chip-summary {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 14px;
      font-size: 12px; font-weight: 600;
      background: var(--bg);
      border: 1px solid currentColor;
    }
    .cohort-chip-summary .chip-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
    .cohort-chip-summary .chip-count { color: var(--text-muted); font-weight: 400; }
    .cohort-chip-summary.cs-a { color: var(--accent); }
    .cohort-chip-summary.cs-b { color: var(--blue); }
    .cohort-chip-summary.cs-c { color: var(--yellow); }
    .cohort-chip-summary.cs-d { color: var(--purple); }
    .cohort-chip-summary.cs-e { color: var(--red); }
    .cohort-chip-summary.cs-f { color: var(--green); }
    .cohort-chip-summary.cs-g { color: #f472b6; }
    .cohort-chip-summary.cs-h { color: #38bdf8; }

    .action-bar-cta { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .btn-generate-primary {
      background: var(--accent); color: #1a1816; border: none; border-radius: 6px;
      padding: 10px 22px; font-size: 14px; font-weight: 700;
      cursor: pointer; transition: background .15s, opacity .15s;
      display: inline-flex; align-items: center; gap: 8px;
      box-shadow: 0 2px 6px rgba(45,212,160,.25);
    }
    .btn-generate-primary:hover:not(:disabled) { background: #22b888; }
    .btn-generate-primary:disabled { opacity: 0.45; cursor: default; box-shadow: none; }
    .btn-generate-primary .btn-arrow { font-size: 11px; }
    .action-bar-helper { font-size: 12px; color: var(--text-muted); }

    .action-bar-exports {
      display: none; align-items: center; gap: 8px; flex-wrap: wrap;
      padding-top: 10px; border-top: 1px dashed var(--border);
    }
    .action-bar.has-report .action-bar-exports { display: flex; }
    .action-bar-exports .export-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--text-muted); margin-right: 2px;
    }
    .btn-export {
      border: 1px solid var(--border); border-radius: 4px;
      padding: 6px 12px; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: filter .15s, border-color .15s, background .15s;
      background: var(--bg); color: var(--text-dark);
    }
    .btn-export:hover { filter: brightness(1.15); }
    .btn-export.fmt-memo-pdf { background: var(--accent); color: #1a1816; border-color: var(--accent); }
    .btn-export.fmt-appendix-pdf { background: var(--blue); color: #1a1816; border-color: var(--blue); }
    .btn-export.fmt-json { background: var(--purple); color: #1a1816; border-color: var(--purple); }
    .action-bar-exports-note { font-size: 11px; color: var(--text-muted); margin-left: 6px; }

    /* Results */
    .results { display: none; }
    .results.visible { display: block; }

    .section-title { font-size: 16px; font-weight: 700; color: var(--text-dark); margin-bottom: 16px; }
    .section-subtitle { font-size: 12px; color: var(--text-muted); margin-bottom: 16px; }

    .collapsible-section { margin-bottom: 8px; }
    .collapsible-section summary.section-title { cursor: pointer; list-style: none; display: flex; align-items: center; gap: 8px; user-select: none; }
    .collapsible-section summary.section-title::-webkit-details-marker { display: none; }
    .collapsible-section summary.section-title::before { content: '\u25B6'; font-size: 10px; transition: transform 0.2s; }
    .collapsible-section[open] summary.section-title::before { transform: rotate(90deg); }
    .collapsible-section .section-subtitle { margin-left: 18px; }
    .collapsible-section summary .section-subtitle { font-weight: 400; }

    /* Cohort profiles */
    .profiles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .profile-card { background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); padding: 16px; border-top: 3px solid var(--border); }
    .profile-card.cohort-a { border-top-color: var(--accent); }
    .profile-card.cohort-b { border-top-color: var(--blue); }
    .profile-card.cohort-c { border-top-color: var(--yellow); }
    .profile-card.cohort-d { border-top-color: var(--purple); }
    .profile-card.cohort-e { border-top-color: var(--red); }
    .profile-card.cohort-f { border-top-color: var(--green); }
    .profile-card.cohort-g { border-top-color: #f472b6; }
    .profile-card.cohort-h { border-top-color: #38bdf8; }
    .profile-label { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
    .profile-stat { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
    .profile-stat strong { color: var(--text-dark); }
    .profile-agents { margin-top: 8px; }
    .profile-agent-row { font-size: 12px; padding: 4px 0; border-bottom: 1px solid var(--border); }
    .profile-agent-row:last-child { border-bottom: none; }
    .profile-context { margin-top: 8px; padding: 8px; background: var(--bg); border-radius: 4px; font-size: 11px; color: var(--text); line-height: 1.5; max-height: 120px; overflow-y: auto; }

    /* Divergence highlights */
    .highlight-card { background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); margin-bottom: 16px; overflow: hidden; }
    .highlight-header { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
    .highlight-question { font-size: 14px; font-weight: 600; color: var(--text-dark); flex: 1; }
    .highlight-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .badge-opposite { background: var(--red-bg); color: var(--red); }
    .badge-confidence { background: var(--yellow-bg); color: var(--yellow); }
    .badge-unanimous { background: var(--blue-bg); color: var(--blue); }
    .highlight-positions { display: flex; gap: 8px; margin-left: 12px; flex-wrap: wrap; }
    .highlight-positions .pos-tag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: var(--surface); }
    .highlight-body { padding: 16px 20px; display: none; }
    .highlight-body.open { display: block; }
    .highlight-desc { font-size: 13px; color: var(--text); margin-bottom: 16px; line-height: 1.5; }
    .cohort-opinions { margin-bottom: 16px; }
    .cohort-opinions-header { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid var(--border); }
    .opinion-row { padding: 8px 0; border-bottom: 1px solid var(--border); }
    .opinion-row:last-child { border-bottom: none; }
    .opinion-agent { font-size: 12px; font-weight: 600; color: var(--text-dark); }
    .opinion-answer { font-size: 12px; margin-top: 2px; }
    .opinion-answer .answer-val { font-weight: 600; color: var(--text-dark); }
    .opinion-answer .conf-val { color: var(--text-muted); margin-left: 8px; }
    .opinion-basis { font-size: 12px; color: var(--text); margin-top: 4px; line-height: 1.5; padding: 6px 8px; background: var(--bg); border-radius: 4px; }

    /* Confidence analysis */
    .confidence-section { background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); padding: 20px; margin-bottom: 32px; }
    .conf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .conf-card { background: var(--bg); border-radius: 6px; padding: 14px; text-align: center; }
    .conf-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 8px; }
    .conf-value { font-size: 24px; font-weight: 700; color: var(--text-dark); }
    .conf-detail { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
    .conf-interpretation { font-size: 13px; color: var(--text); line-height: 1.5; padding: 12px; background: var(--bg); border-radius: 6px; }
    .chart-container { max-width: 600px; margin: 16px auto; }

    /* Common markets table */
    .markets-table-wrap { background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); overflow-x: auto; margin-bottom: 32px; }
    .markets-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .markets-table thead th {
      position: relative; padding: 0 16px 12px; text-align: left;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--text-muted);
      border-bottom: 1px solid var(--border); white-space: nowrap;
    }
    .markets-table thead th:first-child { padding-left: 20px; }
    .markets-table thead th:last-child { padding-right: 20px; }
    .markets-table tbody td {
      padding: 13px 16px; font-size: 13px; color: var(--text);
      border-bottom: 1px solid var(--border); vertical-align: middle;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .markets-table tbody td:first-child { padding-left: 20px; }
    .markets-table tbody td:last-child { padding-right: 20px; }
    .markets-table tbody tr:last-child td { border-bottom: none; }
    .markets-table tbody tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
    .markets-table tbody tr:hover td { background: var(--bg); }
    .markets-table .cell-wrap { white-space: normal; word-break: break-word; line-height: 1.5; }
    .col-resizer {
      position: absolute; right: -2px; top: 0; bottom: 0;
      width: 4px; cursor: col-resize; z-index: 1;
    }
    .col-resizer:hover, .col-resizer:active { background: var(--accent); opacity: 0.5; }

    /* Common Markets: expandable rows */
    .markets-table tbody tr.cm-summary { cursor: pointer; }
    .markets-table tbody tr.cm-summary .cm-chevron {
      display: inline-block; font-size: 10px; color: var(--text-muted);
      transition: transform 0.15s; transform: rotate(0deg);
    }
    .markets-table tbody tr.cm-summary.open .cm-chevron { transform: rotate(90deg); color: var(--accent); }
    .markets-table tbody tr.cm-details td {
      padding: 0 20px 16px; background: var(--bg);
      border-bottom: 1px solid var(--border);
    }
    .markets-table tbody tr.cm-details:hover td { background: var(--bg); }
    .markets-table tbody tr.cm-details .cm-details-inner {
      padding: 14px 16px; border-radius: 6px; background: var(--surface);
    }
    .markets-table .cm-positions { display: flex; gap: 6px; flex-wrap: wrap; }
    .markets-table .cm-pos-chip {
      display: inline-flex; align-items: baseline; gap: 4px;
      padding: 2px 8px; border-radius: 12px; font-size: 11px;
      background: var(--bg); border: 1px solid var(--border);
      max-width: 100%;
    }
    .markets-table .cm-pos-chip .cm-pos-label { font-weight: 700; }
    .markets-table .cm-pos-chip .cm-pos-answer {
      color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px;
    }

    .pill { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px; }
    .pill-style { background: var(--accent-light); color: var(--accent); }
    .pill-domain { background: var(--blue-bg); color: var(--blue); }

    .empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); }

    /* Pagination */
    .table-pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid var(--border); font-size: 13px; color: var(--text-muted); }
    .table-pagination button { background: transparent; border: 1px solid var(--border); color: var(--text-muted); padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .table-pagination button:hover:not(:disabled) { border-color: var(--accent); color: var(--text-dark); }
    .table-pagination button:disabled { opacity: 0.4; cursor: default; }
    .page-size-btns { display: flex; gap: 4px; align-items: center; }
    .page-size-btns span { margin-right: 6px; font-size: 12px; }
    .page-size-btn { background: transparent; border: 1px solid var(--border); color: var(--text-muted); padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; }
    .page-size-btn:hover { border-color: var(--accent); color: var(--text-dark); }
    .page-size-btn.active { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }

    /* Loading */
    .loading-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.5); z-index: 500; align-items: center; justify-content: center; }
    .loading-overlay.visible { display: flex; }
    .loading-box { background: var(--surface); border-radius: 8px; padding: 32px; text-align: center; box-shadow: var(--shadow); }
    .loading-spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <span class="topbar-wordmark">${PRODUCT_NAME}</span>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Cohort Analyzer</span>
    </div>
    <div class="topbar-right">
      ${themeToggleButton}
    </div>
  </div>

  <div class="nav-dropdown" id="nav-dropdown">
    <a href="/admin/dashboard" class="nav-item">Dashboard</a>
    <a href="/admin/studies" class="nav-item">Studies</a>
    <a href="/admin/directory" class="nav-item">Agents</a>
    <a href="/admin/markets" class="nav-item">Markets</a>
    <a href="/admin/schedule" class="nav-item">Schedule</a>
    <div class="nav-divider"></div>
    <a href="/admin/pool-analyzer" class="nav-item">Pool Analyzer</a>
    <a href="/admin/cohort-analyzer" class="nav-item active">Cohort Analyzer</a>
    <a href="/admin/markets/new" class="nav-item" style="color:var(--accent)">+ Create Market</a>
  </div>

  <!-- Sticky action bar: primary CTA + cohort feed summary + post-gen exports -->
  <div class="action-bar" id="action-bar">
    <div class="action-bar-inner">
      <div class="action-bar-top">
        <span class="action-bar-title">Comparison Report</span>
        <span class="action-bar-batch" id="action-bar-batch"></span>
      </div>
      <div class="action-bar-row">
        <div class="action-bar-feed">
          <span class="feed-label">Comparing:</span>
          <span id="action-bar-feed-chips"></span>
        </div>
        <div class="action-bar-cta">
          <button class="btn-generate-primary" id="btn-generate" onclick="generateReport()" disabled>
            <span class="btn-arrow">▶</span> Generate Comparison Report
          </button>
          <span class="action-bar-helper" id="action-bar-helper"></span>
        </div>
      </div>
      <div class="action-bar-exports" id="action-bar-exports">
        <span class="export-label">Download:</span>
        <button class="btn-export fmt-memo-pdf" onclick="downloadExport('memo-pdf')">Memo (PDF)</button>
        <button class="btn-export fmt-appendix-pdf" onclick="downloadExport('appendix-pdf')">Appendix (PDF)</button>
        <button class="btn-export fmt-memo" onclick="downloadExport('memo')">Memo (.md)</button>
        <button class="btn-export fmt-appendix" onclick="downloadExport('appendix')">Appendix (.md)</button>
        <button class="btn-export fmt-json" onclick="downloadExport('json')">JSON</button>
        <span class="action-bar-exports-note">PDFs open in a new tab — choose "Save as PDF" in the print dialog.</span>
      </div>
    </div>
  </div>

  <div class="main">
    <!-- Quick-load by batch — discovers batches from agent handles -->
    <details class="panel" id="batch-loader-panel" style="margin-bottom:24px">
      <summary class="panel-header">
        <span class="panel-title">Load a Batch</span>
        <span style="font-size:11px;color:var(--text-muted)">Pick a batch — its cohorts are auto-detected from agent handles.</span>
      </summary>
      <div class="panel-body">
        <div id="ql-loading" style="font-size:12px;color:var(--text-muted)">Loading batches…</div>

        <div id="ql-picker" style="display:none">
          <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px">
            <div class="control-group" style="flex:1;min-width:240px">
              <span class="control-label">Batch</span>
              <select class="control-select" id="ql-batch-select" onchange="onBatchPicked()" style="width:100%"></select>
            </div>
            <button class="btn-generate" id="ql-load-btn" style="height:auto;padding:7px 16px;font-size:13px" onclick="loadPickedBatch()" disabled>Load batch</button>
            <span id="ql-status" style="font-size:12px;color:var(--text-muted);align-self:center"></span>
          </div>
          <div id="ql-cohort-chips" style="display:none">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:8px">Cohorts in this batch — click to include / exclude</div>
            <div id="ql-cohort-chip-row" style="display:flex;gap:6px;flex-wrap:wrap"></div>
          </div>
        </div>

        <div id="ql-empty" style="display:none;font-size:13px;color:var(--text)">
          No batches detected yet. Agents need handles matching <code style="background:var(--bg);padding:1px 4px;border-radius:3px">{batch}-{LABEL}{number}</code> (e.g., <code style="background:var(--bg);padding:1px 4px;border-radius:3px">apr-A1</code>, <code style="background:var(--bg);padding:1px 4px;border-radius:3px">apr-B1</code>) for at least 2 cohorts.
          <a href="/admin/directory" style="color:var(--accent);margin-left:6px">Open Agent Directory →</a>
        </div>

        <details style="margin-top:12px">
          <summary style="cursor:pointer;font-size:12px;color:var(--text-muted)">Enter manually instead</summary>
          <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-top:10px">
            <div class="control-group" style="flex:0 0 140px">
              <span class="control-label">Batch tag</span>
              <input class="pool-search" id="ql-batch" type="text" placeholder="apr">
            </div>
            <div class="control-group" style="flex:0 0 200px">
              <span class="control-label">Cohort labels</span>
              <input class="pool-search" id="ql-labels" type="text" placeholder="A,B,C">
            </div>
            <button class="btn-generate" style="height:auto;padding:7px 16px;font-size:13px" onclick="quickLoadBatch()">Load batch</button>
          </div>
        </details>
      </div>
    </details>

    <!-- Setup -->
    <div class="setup-grid">
      <!-- Left: Agent Pool -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Agent Pool</span>
          <span id="pool-count" style="font-size:11px;color:var(--text-muted)"></span>
        </div>
        <div class="panel-body">
          <div class="pool-filters">
            <input type="text" class="pool-search" id="pool-search" placeholder="Search by handle...">
            <select class="pool-select" id="filter-style" title="Opinion style">
              <option value="">All styles</option>
              <option value="contrarian">Contrarian</option>
              <option value="consensus_seeker">Consensus</option>
              <option value="nuanced">Nuanced</option>
              <option value="decisive">Decisive</option>
              <option value="balanced">Balanced</option>
            </select>
            <select class="pool-select" id="filter-type" title="Agent type">
              <option value="">All types</option>
              <option value="personal_assistant">Personal Assistant</option>
              <option value="research_agent">Research Agent</option>
              <option value="lifecycle_system">Lifecycle System</option>
            </select>
          </div>
          <div class="pool-selection-strip" id="pool-selection-strip">
            <span class="pool-sel-count" id="pool-sel-count">0 selected</span>
            <button class="pool-sel-btn" onclick="clearAgentSelection()">Clear</button>
            <button class="pool-sel-btn" onclick="addSelectionToSelectedCohort()">Add to Cohort <span id="pool-sel-target">A</span></button>
            <span style="color:var(--text-muted);font-size:11px">or drag any checked row</span>
          </div>
          <div class="agent-list" id="agent-list"></div>
        </div>
      </div>

      <!-- Right: Cohort Groups -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Cohort Groups</span>
          <span id="cohort-summary" style="font-size:11px;color:var(--text-muted)"></span>
        </div>
        <div class="panel-body">
          <div class="cohorts-area" id="cohorts-area">
            <div class="cohort-box cohort-a" data-cohort="A" ondragover="onDragOver(event)" ondragleave="onDragLeave(event)" ondrop="onDrop(event, 'A')">
              <div class="cohort-box-header">
                <span class="cohort-label">Cohort A</span>
                <span class="cohort-count" id="count-A">0 agents</span>
              </div>
              <div class="cohort-chips" id="chips-A"></div>
              <div class="cohort-empty" id="empty-A">Click agents or drag here</div>
            </div>
            <div class="cohort-box cohort-b" data-cohort="B" ondragover="onDragOver(event)" ondragleave="onDragLeave(event)" ondrop="onDrop(event, 'B')">
              <div class="cohort-box-header">
                <span class="cohort-label">Cohort B</span>
                <span class="cohort-count" id="count-B">0 agents</span>
              </div>
              <div class="cohort-chips" id="chips-B"></div>
              <div class="cohort-empty" id="empty-B">Click agents or drag here</div>
            </div>
          </div>
          <button class="add-cohort-btn" id="add-cohort-btn" onclick="addCohort()">+ Add Cohort</button>
        </div>
      </div>
    </div>

    <!-- Results -->
    <div class="results" id="results">

      <!-- Headline -->
      <div class="panel" style="margin-bottom:24px">
        <div class="panel-header">
          <span class="panel-title">Headline</span>
          <span id="headline-meta" style="font-size:11px;color:var(--text-muted)"></span>
        </div>
        <div class="panel-body">
          <div id="headline-text" style="font-size:14px;color:var(--text-dark);margin-bottom:12px"></div>
          <ul id="headline-bullets" style="margin:0 0 0 18px;color:var(--text);font-size:13px"></ul>
        </div>
      </div>

      <!-- Cohort profiles -->
      <details class="collapsible-section">
        <summary class="section-title">Cohort Profiles <span class="section-subtitle">Agent backgrounds and context that shape their reasoning.</span></summary>
        <div class="profiles-grid" id="profiles-grid"></div>
      </details>

      <!-- Divergence highlights -->
      <details class="collapsible-section">
        <summary class="section-title">Key Divergences <span class="section-subtitle">Markets where cohorts disagreed most — sorted by divergence score. Click to expand full opinions.</span></summary>
        <div id="highlights-area"></div>
      </details>

      <!-- Confidence analysis -->
      <details class="collapsible-section">
        <summary class="section-title">Confidence Analysis <span class="section-subtitle">How confident each cohort is, and what that tells us.</span></summary>
        <div class="confidence-section" id="confidence-section"></div>
      </details>

      <!-- All common markets -->
      <details class="collapsible-section">
        <summary class="section-title">All Common Markets <span class="section-subtitle">Every market where 2+ cohorts participated.</span></summary>
        <div class="markets-table-wrap" id="common-markets-table"></div>
      </details>

      <!-- Provenance / Context grounding -->
      <details class="collapsible-section">
        <summary class="section-title">Context Grounding <span class="section-subtitle">How much each cohort's answers came from provided context vs LLM reasoning. Lower mean provenance = more drift from the knowledge_source policy.</span></summary>
        <div id="provenance-section"></div>
      </details>

      <!-- Statistical tests -->
      <details class="collapsible-section">
        <summary class="section-title">Statistical Tests <span class="section-subtitle">Per-market χ² on answer distributions and Kruskal–Wallis H on confidence. Small sample sizes — treat p-values as descriptive.</span></summary>
        <div id="stat-tests-section"></div>
      </details>

      <!-- Outliers -->
      <details class="collapsible-section">
        <summary class="section-title">Outlier Agents <span class="section-subtitle">Agents who departed most from their own cohort's majority — the within-cohort contrarians.</span></summary>
        <div id="outliers-section"></div>
      </details>
    </div>
  </div>

  <!-- Loading overlay -->
  <div class="loading-overlay" id="loading">
    <div class="loading-box">
      <div class="loading-spinner"></div>
      <div style="color:var(--text-dark);font-weight:600">Generating comparison report...</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Analyzing opinions across common markets</div>
    </div>
  </div>

  <script>
    ${themeScript}
    var allAgents = [];
    var cohorts = { A: [], B: [] };
    var activeCohorts = ['A', 'B'];
    var selectedCohort = 'A';
    var selectedAgents = new Set();
    var maxCohorts = 8;
    var cohortLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    var cohortColors = { A: 'var(--accent)', B: 'var(--blue)', C: 'var(--yellow)', D: 'var(--purple)', E: 'var(--red)', F: 'var(--green)', G: '#f472b6', H: '#38bdf8' };
    var confChart = null;
    var cmPageSize = 10;
    var cmCurrentPage = 1;
    var cmAllMarkets = [];

    // ── Nav ──────────────────────────────────────────────────────
    function toggleNav() {
      document.getElementById('nav-dropdown').classList.toggle('open');
    }
    document.addEventListener('click', function(e) {
      var dd = document.getElementById('nav-dropdown');
      var btn = document.querySelector('.hamburger-btn');
      if (!dd.contains(e.target) && !btn.contains(e.target)) dd.classList.remove('open');
    });

    // ── Load agents ──────────────────────────────────────────────
    async function loadAgents() {
      try {
        var res = await fetch('/admin/analytics/classifications?limit=500', {
          headers: {}
        });
        var data = await res.json();
        allAgents = data.agents || [];
        renderAgentList();
      } catch (e) {
        document.getElementById('agent-list').innerHTML = '<div class="empty-state">Failed to load agents</div>';
      }
    }

    function renderAgentList() {
      var search = document.getElementById('pool-search').value.toLowerCase();
      var style = document.getElementById('filter-style').value;
      var type = document.getElementById('filter-type').value;

      var assigned = new Set();
      for (var k of activeCohorts) {
        for (var id of cohorts[k]) assigned.add(id);
      }

      // Auto-prune: assigned agents shouldn't stay in the multi-selection.
      for (var sid of Array.from(selectedAgents)) {
        if (assigned.has(sid)) selectedAgents.delete(sid);
      }

      var filtered = allAgents.filter(function(a) {
        if (search && !a.handle.toLowerCase().includes(search)) return false;
        if (style && a.opinion_style !== style) return false;
        if (type && a.derived_agent_type !== type) return false;
        return true;
      });

      document.getElementById('pool-count').textContent = filtered.length + ' agents';

      var html = '';
      for (var a of filtered) {
        var inCohort = assigned.has(a.agent_id);
        var isSelected = selectedAgents.has(a.agent_id);
        var initials = a.handle.substring(0, 2).toUpperCase();
        var avatarHtml = a.avatar_url
          ? '<img src="' + a.avatar_url + '" alt="">'
          : initials;
        var stylePill = a.opinion_style !== 'unknown' ? ' <span class="pill pill-style">' + a.opinion_style.replace('_', ' ') + '</span>' : '';
        var domainPills = (a.domain_tags || []).slice(0, 2).map(function(d) { return '<span class="pill pill-domain">' + d + '</span>'; }).join(' ');

        var rowClasses = 'agent-row';
        if (inCohort) rowClasses += ' in-cohort';
        if (isSelected) rowClasses += ' selected';

        html += '<div class="' + rowClasses + '" draggable="true" ondragstart="onAgentDragStart(event, \\'' + a.agent_id + '\\')" onclick="addAgentToSelected(\\'' + a.agent_id + '\\')" data-agent-id="' + a.agent_id + '">';
        html += '<input type="checkbox" class="agent-checkbox" onclick="toggleAgentSelection(event, \\'' + a.agent_id + '\\')"' + (isSelected ? ' checked' : '') + (inCohort ? ' disabled' : '') + '>';
        html += '<div class="agent-avatar">' + avatarHtml + '</div>';
        html += '<div class="agent-info"><div class="agent-handle">@' + a.handle + '</div>';
        html += '<div class="agent-meta">' + a.total_opinions + ' opinions · ' + Math.round(a.participation_rate * 100) + '% ' + stylePill + ' ' + domainPills + '</div></div>';
        html += '<span class="agent-add-btn">+</span>';
        html += '</div>';
      }

      if (!html) html = '<div class="empty-state">No agents match filters</div>';
      document.getElementById('agent-list').innerHTML = html;
      updateSelectionStrip();
    }

    function toggleAgentSelection(event, agentId) {
      event.stopPropagation();
      if (selectedAgents.has(agentId)) {
        selectedAgents.delete(agentId);
      } else {
        selectedAgents.add(agentId);
      }
      var row = document.querySelector('.agent-row[data-agent-id="' + agentId + '"]');
      if (row) row.classList.toggle('selected', selectedAgents.has(agentId));
      updateSelectionStrip();
    }

    function updateSelectionStrip() {
      var strip = document.getElementById('pool-selection-strip');
      if (!strip) return;
      var n = selectedAgents.size;
      if (n === 0) { strip.classList.remove('visible'); return; }
      strip.classList.add('visible');
      document.getElementById('pool-sel-count').textContent = n + ' selected';
      document.getElementById('pool-sel-target').textContent = selectedCohort;
    }

    function clearAgentSelection() {
      selectedAgents.clear();
      renderAgentList();
    }

    function addSelectionToSelectedCohort() {
      var ids = Array.from(selectedAgents);
      for (var id of ids) addAgentToCohort(id, selectedCohort);
      selectedAgents.clear();
      updateSelectionStrip();
    }

    // ── Cohort management ────────────────────────────────────────

    function addAgentToSelected(agentId) {
      addAgentToCohort(agentId, selectedCohort);
    }

    function addAgentToCohort(agentId, cohortLabel) {
      // Check if already in any cohort
      for (var k of activeCohorts) {
        if (cohorts[k].includes(agentId)) return;
      }
      if (!cohorts[cohortLabel]) return;
      cohorts[cohortLabel].push(agentId);
      refreshCohortUI();
      renderAgentList();
      updateGenerateBtn();
    }

    function removeAgentFromCohort(agentId, cohortLabel) {
      cohorts[cohortLabel] = cohorts[cohortLabel].filter(function(id) { return id !== agentId; });
      refreshCohortUI();
      renderAgentList();
      updateGenerateBtn();
    }

    function refreshCohortUI() {
      for (var label of activeCohorts) {
        var chipsEl = document.getElementById('chips-' + label);
        var emptyEl = document.getElementById('empty-' + label);
        var countEl = document.getElementById('count-' + label);
        var ids = cohorts[label] || [];

        countEl.textContent = ids.length + ' agent' + (ids.length !== 1 ? 's' : '');
        emptyEl.style.display = ids.length === 0 ? 'block' : 'none';

        var html = '';
        for (var id of ids) {
          var agent = allAgents.find(function(a) { return a.agent_id === id; });
          if (!agent) continue;
          var initials = agent.handle.substring(0, 2).toUpperCase();
          var av = agent.avatar_url ? '<img src="' + agent.avatar_url + '" alt="">' : initials;
          html += '<span class="agent-chip" draggable="true" ondragstart="onChipDragStart(event, \\'' + id + '\\', \\'' + label + '\\')">';
          html += '<span class="chip-avatar">' + av + '</span>';
          html += '@' + agent.handle;
          html += '<span class="chip-remove" onclick="event.stopPropagation();removeAgentFromCohort(\\'' + id + '\\', \\'' + label + '\\')">&times;</span>';
          html += '</span>';
        }
        chipsEl.innerHTML = html;
      }

      // Update selected cohort indicator
      var totalAssigned = activeCohorts.reduce(function(s, k) { return s + cohorts[k].length; }, 0);
      document.getElementById('cohort-summary').textContent = totalAssigned + ' agents assigned';

      // Highlight selected cohort
      for (var l of activeCohorts) {
        var box = document.querySelector('[data-cohort="' + l + '"]');
        if (box) box.style.borderStyle = l === selectedCohort ? 'solid' : 'dashed';
      }
    }

    function selectCohort(label) {
      selectedCohort = label;
      refreshCohortUI();
      updateSelectionStrip();
    }

    function addCohort() {
      if (activeCohorts.length >= maxCohorts) return;
      var next = cohortLabels.find(function(l) { return !activeCohorts.includes(l); });
      if (!next) return;
      activeCohorts.push(next);
      cohorts[next] = [];

      var area = document.getElementById('cohorts-area');
      var div = document.createElement('div');
      div.className = 'cohort-box cohort-' + next.toLowerCase();
      div.setAttribute('data-cohort', next);
      div.setAttribute('ondragover', 'onDragOver(event)');
      div.setAttribute('ondragleave', 'onDragLeave(event)');
      div.setAttribute('ondrop', 'onDrop(event, "' + next + '")');
      div.onclick = function() { selectCohort(next); };
      div.innerHTML = '<div class="cohort-box-header"><span class="cohort-label">Cohort ' + next + '</span><span class="cohort-count" id="count-' + next + '">0 agents</span><button class="cohort-remove-btn" onclick="event.stopPropagation();removeCohort(\\'' + next + '\\')">remove</button></div><div class="cohort-chips" id="chips-' + next + '"></div><div class="cohort-empty" id="empty-' + next + '">Click agents or drag here</div>';
      area.appendChild(div);

      updateAddCohortBtn();
      refreshCohortUI();
    }

    function removeCohort(label) {
      if (activeCohorts.length <= 2) return;
      // Return agents to pool
      cohorts[label] = [];
      activeCohorts = activeCohorts.filter(function(l) { return l !== label; });
      var box = document.querySelector('[data-cohort="' + label + '"]');
      if (box) box.remove();
      if (selectedCohort === label) selectedCohort = activeCohorts[0];
      updateAddCohortBtn();
      refreshCohortUI();
      renderAgentList();
      updateGenerateBtn();
    }

    // ── Drag and drop ────────────────────────────────────────────

    var dragAgentId = null;
    var dragFromCohort = null;

    function onAgentDragStart(e, agentId) {
      // If the dragged agent is part of the multi-selection (with ≥ 2 picked),
      // carry the whole group. Otherwise carry just this agent.
      var payload = agentId;
      if (selectedAgents.has(agentId) && selectedAgents.size > 1) {
        payload = Array.from(selectedAgents).join(',');
      }
      dragAgentId = payload;
      dragFromCohort = null;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', payload);
    }

    function onChipDragStart(e, agentId, fromCohort) {
      dragAgentId = agentId;
      dragFromCohort = fromCohort;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', agentId);
    }

    function onDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      e.currentTarget.classList.add('drag-over');
    }

    function onDragLeave(e) {
      e.currentTarget.classList.remove('drag-over');
    }

    function onDrop(e, cohortLabel) {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');
      if (!dragAgentId) return;

      var ids = String(dragAgentId).split(',').filter(function(id) { return id.length > 0; });

      for (var aid of ids) {
        // If moving a chip between cohorts, remove from source first.
        if (dragFromCohort && dragFromCohort !== cohortLabel) {
          cohorts[dragFromCohort] = cohorts[dragFromCohort].filter(function(id) { return id !== aid; });
        }
        // Add if not already in target; remove from any other cohort first.
        if (!cohorts[cohortLabel].includes(aid)) {
          for (var k of activeCohorts) {
            if (k !== cohortLabel) {
              cohorts[k] = cohorts[k].filter(function(id) { return id !== aid; });
            }
          }
          cohorts[cohortLabel].push(aid);
        }
      }

      // A successful drop is a commit — clear the multi-selection.
      selectedAgents.clear();

      dragAgentId = null;
      dragFromCohort = null;
      refreshCohortUI();
      renderAgentList();
      updateGenerateBtn();
    }

    // ── Generate button state ────────────────────────────────────

    function updateGenerateBtn() {
      var cohortsWithAgents = activeCohorts.filter(function(k) { return cohorts[k].length > 0; });
      var canGenerate = cohortsWithAgents.length >= 2;
      document.getElementById('btn-generate').disabled = !canGenerate;

      // Feed chips — show what's being compared
      var chipsEl = document.getElementById('action-bar-feed-chips');
      if (chipsEl) {
        if (cohortsWithAgents.length === 0) {
          chipsEl.innerHTML = '<span class="feed-empty">No cohorts assigned yet.</span>';
        } else {
          var parts = [];
          for (var i = 0; i < cohortsWithAgents.length; i++) {
            var k = cohortsWithAgents[i];
            var count = cohorts[k].length;
            if (i > 0) parts.push('<span class="vs">vs</span>');
            parts.push(
              '<span class="cohort-chip-summary cs-' + k.toLowerCase() + '">' +
              '<span class="chip-dot"></span>' +
              'Cohort ' + k +
              '<span class="chip-count">· ' + count + ' agent' + (count !== 1 ? 's' : '') + '</span>' +
              '</span>'
            );
          }
          chipsEl.innerHTML = parts.join(' ');
        }
      }

      // Helper text next to the button
      var helper = document.getElementById('action-bar-helper');
      if (helper) {
        if (canGenerate) {
          helper.textContent = '';
        } else if (cohortsWithAgents.length === 0) {
          helper.textContent = 'Add agents to at least 2 cohorts to generate.';
        } else {
          helper.textContent = 'Add agents to at least one more cohort to generate.';
        }
      }

      // Batch tag indicator (top-right)
      var batchEl = document.getElementById('action-bar-batch');
      if (batchEl) {
        batchEl.innerHTML = lastBatchTag ? 'Batch: <strong>' + escapeHtml(lastBatchTag) + '</strong>' : '';
      }

      // If cohort membership changed after a previous report, that report's
      // export buttons no longer match the current selection — hide them until
      // the user generates again.
      var bar = document.getElementById('action-bar');
      if (bar && lastReport && lastCohortsPayload) {
        var currentSignature = cohortsWithAgents
          .map(function(k) { return k + ':' + cohorts[k].slice().sort().join(','); })
          .join('|');
        var reportSignature = lastCohortsPayload
          .map(function(c) { return c.label + ':' + c.agent_ids.slice().sort().join(','); })
          .join('|');
        if (currentSignature !== reportSignature) {
          bar.classList.remove('has-report');
        } else {
          bar.classList.add('has-report');
        }
      }
    }

    // ── Generate report ──────────────────────────────────────────

    var lastReport = null;
    var lastCohortsPayload = null;
    var lastBatchTag = null;

    async function generateReport() {
      var btn = document.getElementById('btn-generate');
      btn.disabled = true;
      document.getElementById('loading').classList.add('visible');
      document.getElementById('results').classList.remove('visible');

      var cohortsPayload = activeCohorts
        .filter(function(k) { return cohorts[k].length > 0; })
        .map(function(k) { return { label: k, agent_ids: cohorts[k] }; });
      lastCohortsPayload = cohortsPayload;

      try {
        var res = await fetch('/admin/cohort-analyzer/full-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cohorts: cohortsPayload,
          })
        });
        var report = await res.json();
        if (!res.ok) throw new Error(report.error || 'request failed');
        lastReport = report;
        renderResults(report);
      } catch (e) {
        alert('Failed to generate report: ' + e.message);
      } finally {
        document.getElementById('loading').classList.remove('visible');
        btn.disabled = false;
      }
    }

    // ── Batch discovery + quick-load ───────────────────────────

    var discoveredBatches = [];
    var pickedBatch = null;          // currently selected DiscoveredBatch
    var pickedLabels = new Set();    // labels included from the picked batch

    async function loadBatchPicker() {
      var loadingEl = document.getElementById('ql-loading');
      var pickerEl = document.getElementById('ql-picker');
      var emptyEl = document.getElementById('ql-empty');
      try {
        var res = await fetch('/admin/cohort-analyzer/batches', {
          headers: {}
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'failed');
        discoveredBatches = data.batches || [];
      } catch (e) {
        discoveredBatches = [];
      }
      loadingEl.style.display = 'none';

      if (discoveredBatches.length === 0) {
        emptyEl.style.display = 'block';
        return;
      }

      pickerEl.style.display = 'block';
      var sel = document.getElementById('ql-batch-select');
      var html = '<option value="">— Pick a batch —</option>';
      for (var i = 0; i < discoveredBatches.length; i++) {
        var b = discoveredBatches[i];
        html += '<option value="' + i + '">' + b.batch_tag +
                ' · ' + b.total_agents + ' agent' + (b.total_agents !== 1 ? 's' : '') +
                ' · ' + b.labels.length + ' cohort' + (b.labels.length !== 1 ? 's' : '') +
                ' (' + b.labels.map(function(l) { return l.label; }).join('/') + ')' +
                '</option>';
      }
      sel.innerHTML = html;
    }

    function onBatchPicked() {
      var sel = document.getElementById('ql-batch-select');
      var idx = sel.value;
      var chipsWrap = document.getElementById('ql-cohort-chips');
      var loadBtn = document.getElementById('ql-load-btn');
      var statusEl = document.getElementById('ql-status');
      statusEl.textContent = '';
      if (idx === '' || idx == null) {
        pickedBatch = null;
        pickedLabels = new Set();
        chipsWrap.style.display = 'none';
        loadBtn.disabled = true;
        return;
      }
      pickedBatch = discoveredBatches[Number(idx)];
      pickedLabels = new Set(pickedBatch.labels.map(function(l) { return l.label; }));
      renderPickedCohortChips();
      chipsWrap.style.display = 'block';
      loadBtn.disabled = false;
    }

    function renderPickedCohortChips() {
      var row = document.getElementById('ql-cohort-chip-row');
      var html = '';
      for (var i = 0; i < pickedBatch.labels.length; i++) {
        var l = pickedBatch.labels[i];
        var included = pickedLabels.has(l.label);
        var color = cohortColors[l.label] || 'var(--text-dark)';
        var style = 'border:1px solid ' + (included ? color : 'var(--border)') +
                    ';color:' + (included ? color : 'var(--text-muted)') +
                    ';background:' + (included ? 'transparent' : 'var(--bg)') +
                    ';padding:5px 10px;border-radius:14px;font-size:12px;cursor:pointer;user-select:none;' +
                    (included ? 'font-weight:600' : 'opacity:0.65');
        html += '<span style="' + style + '" onclick="togglePickedLabel(\\'' + l.label + '\\')">' +
                l.label + ' · ' + l.agent_count + (included ? '' : ' (excluded)') +
                '</span>';
      }
      row.innerHTML = html;
    }

    function togglePickedLabel(label) {
      if (pickedLabels.has(label)) {
        if (pickedLabels.size <= 2) {
          var s = document.getElementById('ql-status');
          s.textContent = 'Need at least 2 cohorts to compare.'; s.style.color = 'var(--red)';
          return;
        }
        pickedLabels.delete(label);
      } else {
        pickedLabels.add(label);
      }
      renderPickedCohortChips();
      document.getElementById('ql-load-btn').disabled = pickedLabels.size < 2;
    }

    async function loadPickedBatch() {
      if (!pickedBatch) return;
      var labels = pickedBatch.labels.map(function(l) { return l.label; }).filter(function(l) { return pickedLabels.has(l); });
      await runBatchLoad(pickedBatch.batch_tag, labels);
    }

    async function quickLoadBatch() {
      var batchTag = (document.getElementById('ql-batch').value || '').trim();
      var labelsRaw = (document.getElementById('ql-labels').value || '').trim();
      var status = document.getElementById('ql-status');
      if (!batchTag || !labelsRaw) { status.textContent = 'Batch tag and labels are both required.'; status.style.color = 'var(--red)'; return; }
      var labels = labelsRaw.split(',').map(function(s) { return s.trim().toUpperCase(); }).filter(function(s) { return s.length > 0; });
      if (labels.length < 2) { status.textContent = 'Enter at least 2 cohort labels (e.g. A,B).'; status.style.color = 'var(--red)'; return; }
      await runBatchLoad(batchTag, labels);
    }

    async function runBatchLoad(batchTag, labels) {
      var status = document.getElementById('ql-status');
      status.textContent = 'Resolving…'; status.style.color = 'var(--text-muted)';

      // Guard: cap labels to maxCohorts and warn rather than silently truncate.
      var truncated = false;
      if (labels.length > maxCohorts) {
        labels = labels.slice(0, maxCohorts);
        truncated = true;
      }

      try {
        var res = await fetch('/admin/cohort-analyzer/resolve-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch_tag: batchTag, cohort_labels: labels })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'resolve failed');

        // Keep only cohorts that actually matched agents.
        var withAgents = (data.resolved_cohorts || []).filter(function(rc) { return rc.agent_ids && rc.agent_ids.length > 0; });
        if (withAgents.length < 2) {
          status.textContent = 'Found fewer than 2 cohorts with agents for "' + batchTag + '". Check the batch tag and labels.';
          status.style.color = 'var(--red)';
          return;
        }

        // Use the actual labels (A/B/D, not positional) — cohort colors come
        // from the .cohort-{letter} CSS classes, defined A-H.
        var newActive = [];
        var newCohorts = {};
        var totalAgents = 0;
        for (var i = 0; i < withAgents.length; i++) {
          var rc = withAgents[i];
          var label = String(rc.label || '').toUpperCase();
          if (!label || cohortLabels.indexOf(label) === -1) {
            // Fall back to positional slot if the label is outside A-H.
            label = cohortLabels[i];
          }
          newActive.push(label);
          newCohorts[label] = rc.agent_ids.slice();
          totalAgents += rc.agent_ids.length;
        }
        cohorts = newCohorts;
        activeCohorts = newActive;
        selectedCohort = newActive[0];
        lastBatchTag = batchTag;

        // Re-render cohort boxes + chips.
        renderCohortBoxes();
        refreshCohortUI();
        renderAgentList();
        updateGenerateBtn();
        updateAddCohortBtn();

        var msg = 'Loaded ' + totalAgents + ' agents into ' + newActive.length + ' cohorts.';
        if (truncated) msg += ' (truncated to ' + maxCohorts + ' cohorts max.)';
        status.textContent = msg;
        status.style.color = 'var(--accent)';

        // Auto-collapse the picker now that the user has what they wanted.
        var batchPanel = document.getElementById('batch-loader-panel');
        if (batchPanel) batchPanel.open = false;
      } catch (e) {
        // Catch-all: surface a friendly message regardless of the underlying cause.
        status.textContent = 'Could not load that batch. ' + (e && e.message ? e.message : 'Please try again.');
        status.style.color = 'var(--red)';
      }
    }

    function updateAddCohortBtn() {
      var btn = document.getElementById('add-cohort-btn');
      if (!btn) return;
      if (activeCohorts.length >= maxCohorts) {
        btn.style.display = 'none';
      } else {
        btn.style.display = '';
        btn.textContent = '+ Add Cohort (' + activeCohorts.length + '/' + maxCohorts + ')';
      }
    }

    function renderCohortBoxes() {
      // Re-render the cohort container to match activeCohorts + cohorts state
      var area = document.getElementById('cohorts-area');
      area.innerHTML = '';
      for (var i = 0; i < activeCohorts.length; i++) {
        var label = activeCohorts[i];
        var lower = label.toLowerCase();
        var box = document.createElement('div');
        box.className = 'cohort-box cohort-' + lower;
        box.setAttribute('data-cohort', label);
        box.setAttribute('ondragover', 'onDragOver(event)');
        box.setAttribute('ondragleave', 'onDragLeave(event)');
        box.setAttribute('ondrop', "onDrop(event, '" + label + "')");
        var canRemove = activeCohorts.length > 2;
        var removeBtn = canRemove ? '<button class="cohort-remove-btn" onclick="event.stopPropagation();removeCohort(\\'' + label + '\\')">remove</button>' : '';
        box.innerHTML = '<div class="cohort-box-header"><span class="cohort-label">Cohort ' + label + '</span><span class="cohort-count" id="count-' + label + '">0 agents</span>' + removeBtn + '</div><div class="cohort-chips" id="chips-' + label + '"></div><div class="cohort-empty" id="empty-' + label + '">Click agents or drag here</div>';
        (function(lbl){ box.onclick = function() { selectCohort(lbl); }; })(label);
        area.appendChild(box);
      }
    }

    // ── Export downloads ───────────────────────────────────────

    async function downloadExport(format) {
      if (!lastCohortsPayload) { alert('Run the comparison first.'); return; }
      var isPdf = format === 'memo-pdf' || format === 'appendix-pdf';
      // For PDF, open the tab BEFORE the await so the browser counts it as a user gesture.
      var pdfTab = isPdf ? window.open('', '_blank') : null;
      try {
        var res = await fetch('/admin/cohort-analyzer/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cohorts: lastCohortsPayload,
            batch_tag: lastBatchTag || undefined,
            format: format,
          })
        });
        if (!res.ok) {
          var err = await res.json().catch(function() { return { error: 'request failed' }; });
          throw new Error(err.error || 'export failed');
        }
        var blob = await res.blob();
        var url = URL.createObjectURL(blob);
        if (isPdf) {
          if (pdfTab) {
            pdfTab.location = url;
          } else {
            // Popup blocked — fall back to assigning current window
            window.open(url, '_blank');
          }
          // Revoke later so the new tab finishes loading the blob first
          setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
        } else {
          var a = document.createElement('a');
          a.href = url;
          var disp = res.headers.get('Content-Disposition') || '';
          var match = disp.match(/filename="([^"]+)"/);
          a.download = match ? match[1] : ((lastBatchTag || 'cohort-report') + '-' + format + (format === 'json' ? '.json' : '.md'));
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        if (pdfTab) pdfTab.close();
        alert('Failed to export: ' + e.message);
      }
    }

    // ── Render results ───────────────────────────────────────────

    function renderResults(report) {
      var comparison = report.comparison;
      renderHeadline(report);
      renderProfiles(comparison.cohorts);
      renderHighlights(comparison.divergence_highlights, comparison.common_markets);
      renderConfidence(comparison.confidence_analysis);
      renderCommonMarkets(comparison.common_markets);
      renderProvenance(report.provenance_aggregates);
      renderStatTests(report.market_stat_tests);
      renderOutliers(report.outliers);
      document.getElementById('results').classList.add('visible');
      document.getElementById('action-bar').classList.add('has-report');
      document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }

    function renderHeadline(report) {
      var meta = document.getElementById('headline-meta');
      meta.textContent = 'Batch: ' + (report.meta.batch_tag || '(ad-hoc)') + ' · Generated ' + new Date(report.meta.generated_at).toLocaleString();
      document.getElementById('headline-text').textContent = report.headline.one_liner;
      var ul = document.getElementById('headline-bullets');
      ul.innerHTML = '';
      for (var b of (report.headline.bullets || [])) {
        var li = document.createElement('li');
        li.textContent = b;
        ul.appendChild(li);
      }
    }

    function renderProvenance(aggregates) {
      var el = document.getElementById('provenance-section');
      if (!aggregates || aggregates.length === 0) { el.innerHTML = '<p style="padding:12px;color:var(--text-muted)">No provenance data.</p>'; return; }
      var html = '<div class="markets-table-wrap"><table class="markets-table"><thead><tr>';
      html += '<th style="width:10%">Cohort</th>';
      html += '<th style="width:22%">Opinions w/ provenance</th>';
      html += '<th style="width:14%">Mean score</th>';
      html += '<th style="width:18%">% missing-expected</th>';
      html += '<th style="width:14%">% misaligned</th>';
      html += '<th style="width:22%">Basis↔context overlap</th>';
      html += '</tr></thead><tbody>';
      for (var p of aggregates) {
        html += '<tr><td><strong style="color:' + (cohortColors[p.cohort_label] || 'var(--text-dark)') + '">' + p.cohort_label + '</strong></td>';
        html += '<td>' + p.opinions_with_provenance + '/' + p.total_opinions + '</td>';
        html += '<td>' + p.mean_score.toFixed(2) + '</td>';
        html += '<td>' + p.pct_missing_expected + '%</td>';
        html += '<td>' + p.pct_misaligned + '%</td>';
        html += '<td>' + p.mean_basis_overlap.toFixed(2) + '</td></tr>';
      }
      html += '</tbody></table></div>';
      el.innerHTML = html;
    }

    function renderStatTests(tests) {
      var el = document.getElementById('stat-tests-section');
      if (!tests || tests.length === 0) { el.innerHTML = '<p style="padding:12px;color:var(--text-muted)">No common markets to test.</p>'; return; }
      var html = '<div class="markets-table-wrap"><table class="markets-table"><thead><tr>';
      html += '<th style="width:50%">Market</th>';
      html += '<th style="width:10%">χ²</th>';
      html += '<th style="width:8%">df</th>';
      html += '<th style="width:12%">p (χ²)</th>';
      html += '<th style="width:20%">KW H (confidence)</th>';
      html += '</tr></thead><tbody>';
      for (var s of tests) {
        var pColor = s.p_value_approx === 'ns' ? 'var(--text-muted)' : 'var(--accent)';
        html += '<tr><td class="cell-wrap">' + escapeHtml(s.question) + '</td>';
        html += '<td>' + s.chi_square.toFixed(2) + '</td>';
        html += '<td>' + s.df + '</td>';
        html += '<td style="color:' + pColor + '">' + s.p_value_approx + '</td>';
        html += '<td>' + (s.confidence_kruskal_h == null ? '—' : s.confidence_kruskal_h.toFixed(2) + (s.confidence_significant ? ' *' : '')) + '</td></tr>';
      }
      html += '</tbody></table></div>';
      el.innerHTML = html;
    }

    function renderOutliers(outliers) {
      var el = document.getElementById('outliers-section');
      if (!outliers || outliers.length === 0) { el.innerHTML = '<p style="padding:12px;color:var(--text-muted)">No outliers met the participation threshold.</p>'; return; }
      var top = outliers.slice(0, 10);
      var html = '<div class="markets-table-wrap"><table class="markets-table"><thead><tr>';
      html += '<th style="width:16%">Agent</th>';
      html += '<th style="width:10%">Cohort</th>';
      html += '<th style="width:18%">Participations</th>';
      html += '<th style="width:14%">Disagreements</th>';
      html += '<th style="width:12%">Deviation</th>';
      html += '<th style="width:30%">Example</th>';
      html += '</tr></thead><tbody>';
      for (var o of top) {
        html += '<tr><td><strong>@' + escapeHtml(o.handle) + '</strong></td>';
        html += '<td style="color:' + (cohortColors[o.cohort_label] || 'var(--text-dark)') + '">' + o.cohort_label + '</td>';
        html += '<td>' + o.participations_in_common_markets + '</td>';
        html += '<td>' + o.disagreements_with_own_cohort + '</td>';
        html += '<td>' + o.deviation_pct + '%</td>';
        html += '<td class="cell-wrap" style="font-size:12px;color:var(--text-muted)">' + (o.example_disagreement ? escapeHtml(o.example_disagreement) : '—') + '</td></tr>';
      }
      html += '</tbody></table></div>';
      el.innerHTML = html;
    }

    function renderProfiles(cohortData) {
      var grid = document.getElementById('profiles-grid');
      var html = '';
      for (var c of cohortData) {
        var cls = 'cohort-' + c.label.toLowerCase();
        html += '<div class="profile-card ' + cls + '">';
        html += '<div class="profile-label" style="color:' + (cohortColors[c.label] || 'var(--text-dark)') + '">Cohort ' + c.label + ' <span style="font-weight:400;font-size:12px;color:var(--text-muted)">(' + c.agent_count + ' agents)</span></div>';

        // Aggregate stats
        html += '<div class="profile-stat">Opinions: <strong>' + c.aggregate.total_opinions + '</strong> · Avg confidence: <strong>' + c.aggregate.avg_confidence + '</strong></div>';
        html += '<div class="profile-stat">Avg participation: <strong>' + c.aggregate.avg_participation_rate + '%</strong></div>';

        // Style distribution
        var styles = Object.entries(c.aggregate.style_distribution).filter(function(e) { return e[1] > 0; }).map(function(e) { return e[1] + ' ' + e[0].replace('_', ' '); });
        if (styles.length) html += '<div class="profile-stat">Styles: ' + styles.join(', ') + '</div>';

        // Domains
        if (c.aggregate.domain_coverage.length) {
          html += '<div class="profile-stat">Domains: ' + c.aggregate.domain_coverage.map(function(d) { return '<span class="pill pill-domain">' + d + '</span>'; }).join(' ') + '</div>';
        }

        // Agent details
        html += '<div class="profile-agents">';
        for (var agent of c.agents) {
          html += '<div class="profile-agent-row"><strong>@' + escapeHtml(agent.handle) + '</strong>';
          html += ' · ' + agent.total_opinions + ' opinions · ' + agent.participation_rate + '% participation';
          if (agent.opinion_style !== 'unknown') html += ' · <span class="pill pill-style">' + agent.opinion_style.replace('_', ' ') + '</span>';
          html += '</div>';

          // Show context (custom_instructions or custom_objective)
          if (agent.custom_instructions || agent.custom_objective) {
            html += '<div class="profile-context">';
            if (agent.custom_instructions) html += '<strong>Instructions:</strong> ' + escapeHtml(agent.custom_instructions.substring(0, 300)) + (agent.custom_instructions.length > 300 ? '...' : '') + '<br>';
            if (agent.custom_objective) html += '<strong>Objective:</strong> ' + escapeHtml(agent.custom_objective.substring(0, 200));
            html += '</div>';
          }

          // Profile answers
          var pkeys = Object.keys(agent.profile_answers || {});
          if (pkeys.length > 0) {
            html += '<div class="profile-context">';
            for (var pk of pkeys.slice(0, 3)) {
              html += '<strong>' + escapeHtml(pk.replace(/_/g, ' ')) + ':</strong> ' + escapeHtml((agent.profile_answers[pk] || '').substring(0, 150)) + '<br>';
            }
            html += '</div>';
          }
        }
        html += '</div></div>';
      }
      grid.innerHTML = html;
    }

    // Shared: render the full per-cohort opinion list for one market. Used by
    // both Divergence Highlights cards and the Common Markets expandable rows.
    function renderCohortOpinionsBlock(market) {
      if (!market) return '';
      var html = '';
      for (var pos of market.cohort_positions) {
        var color = cohortColors[pos.cohort_label] || 'var(--text-dark)';
        html += '<div class="cohort-opinions">';
        html += '<div class="cohort-opinions-header" style="color:' + color + '">Cohort ' + pos.cohort_label + ' — Majority: ' + escapeHtml(pos.majority_answer) + ' (avg confidence: ' + pos.avg_confidence + ')</div>';
        for (var op of pos.opinions) {
          html += '<div class="opinion-row">';
          html += '<div class="opinion-agent">@' + escapeHtml(op.agent_handle) + '</div>';
          html += '<div class="opinion-answer"><span class="answer-val">' + escapeHtml(op.answer) + '</span>';
          if (op.confidence != null) html += '<span class="conf-val">confidence: ' + op.confidence + '</span>';
          html += '</div>';
          if (op.basis) html += '<div class="opinion-basis">' + escapeHtml(op.basis) + '</div>';
          html += '</div>';
        }
        html += '</div>';
      }
      return html;
    }

    function renderHighlights(highlights, commonMarkets) {
      var area = document.getElementById('highlights-area');
      if (!highlights || highlights.length === 0) {
        area.innerHTML = '<div class="empty-state">No notable divergences found between cohorts.</div>';
        return;
      }

      var html = '';
      for (var i = 0; i < highlights.length; i++) {
        var h = highlights[i];
        var badgeClass = h.type === 'opposite_positions' ? 'badge-opposite' : h.type === 'confidence_gap' ? 'badge-confidence' : 'badge-unanimous';
        var badgeText = h.type.replace(/_/g, ' ');

        // Find the full market data for opinions
        var mkt = commonMarkets.find(function(m) { return m.market_id === h.market_id; });

        html += '<div class="highlight-card">';
        html += '<div class="highlight-header" onclick="toggleHighlight(' + i + ')">';
        html += '<span class="highlight-question">' + escapeHtml(h.market_question) + '</span>';
        html += '<span class="highlight-badge ' + badgeClass + '">' + badgeText + '</span>';
        if (mkt) {
          html += '<span class="highlight-positions">';
          for (var pos of mkt.cohort_positions) {
            var posColor = cohortColors[pos.cohort_label] || 'var(--text-dark)';
            html += '<span class="pos-tag" style="color:' + posColor + '">' + pos.cohort_label + ': ' + escapeHtml(pos.majority_answer) + '</span>';
          }
          html += '</span>';
        }
        html += '</div>';
        html += '<div class="highlight-body" id="highlight-body-' + i + '">';
        html += '<div class="highlight-desc">' + escapeHtml(h.description) + '</div>';
        html += renderCohortOpinionsBlock(mkt);
        html += '</div></div>';
      }
      area.innerHTML = html;
    }

    function toggleHighlight(index) {
      var body = document.getElementById('highlight-body-' + index);
      body.classList.toggle('open');
    }

    function renderConfidence(analysis) {
      var section = document.getElementById('confidence-section');
      if (!analysis || !analysis.per_cohort.length) {
        section.innerHTML = '<div class="empty-state">No confidence data available.</div>';
        return;
      }

      var html = '<div class="conf-grid">';
      for (var c of analysis.per_cohort) {
        var color = cohortColors[c.label] || 'var(--text-dark)';
        html += '<div class="conf-card">';
        html += '<div class="conf-label" style="color:' + color + '">Cohort ' + c.label + '</div>';
        html += '<div class="conf-value">' + c.mean + '</div>';
        html += '<div class="conf-detail">median ' + c.median + ' · std dev ' + c.std_dev + '</div>';
        html += '<div class="conf-detail">' + c.high_confidence_pct + '% high (>=80) · ' + c.low_confidence_pct + '% low (<=30)</div>';
        html += '<div class="conf-detail">' + c.total_with_confidence + ' opinions with confidence</div>';
        html += '</div>';
      }
      html += '</div>';
      html += '<div class="conf-interpretation">' + escapeHtml(analysis.interpretation) + '</div>';

      // Chart
      html += '<div class="chart-container"><canvas id="conf-chart"></canvas></div>';
      section.innerHTML = html;

      // Render chart
      var canvas = document.getElementById('conf-chart');
      if (confChart) confChart.destroy();
      confChart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: analysis.per_cohort.map(function(c) { return 'Cohort ' + c.label; }),
          datasets: [
            { label: 'Mean', data: analysis.per_cohort.map(function(c) { return c.mean; }), backgroundColor: analysis.per_cohort.map(function(c) { return getColor(c.label, 0.7); }) },
            { label: 'Median', data: analysis.per_cohort.map(function(c) { return c.median; }), backgroundColor: analysis.per_cohort.map(function(c) { return getColor(c.label, 0.4); }) },
          ]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Confidence', color: '#78716c' }, ticks: { color: '#78716c' }, grid: { color: '#3d3533' } }, x: { ticks: { color: '#78716c' }, grid: { display: false } } },
          plugins: { legend: { labels: { color: '#a8a29e' } } }
        }
      });
    }

    function getColor(label, alpha) {
      var colors = { A: '45,212,160', B: '96,165,250', C: '245,158,11', D: '167,139,250' };
      return 'rgba(' + (colors[label] || '168,162,158') + ',' + alpha + ')';
    }

    function renderCommonMarkets(markets) {
      cmAllMarkets = markets || [];
      cmCurrentPage = 1;
      renderCommonMarketsPage();
    }

    function renderCommonMarketsPage() {
      var wrap = document.getElementById('common-markets-table');
      var markets = cmAllMarkets;
      if (!markets || markets.length === 0) {
        wrap.innerHTML = '<div class="empty-state">No common markets found. The selected cohorts have not participated in the same markets.</div>';
        return;
      }

      var totalPages = Math.ceil(markets.length / cmPageSize);
      if (cmCurrentPage > totalPages) cmCurrentPage = totalPages;
      var start = (cmCurrentPage - 1) * cmPageSize;
      var end = Math.min(start + cmPageSize, markets.length);
      var pageMarkets = markets.slice(start, end);

      // 5 columns total. Position chips wrap to fit any number of cohorts.
      var html = '<table class="markets-table"><thead><tr>';
      html += '<th style="width:38%"><span>Question</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>';
      html += '<th style="width:11%"><span>Category</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>';
      html += '<th style="width:9%"><span>Status</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>';
      html += '<th style="width:38%"><span>Positions</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>';
      html += '<th style="width:4%"></th>';
      html += '</tr></thead><tbody>';

      for (var i = 0; i < pageMarkets.length; i++) {
        var m = pageMarkets[i];
        var rowIdx = start + i;

        // Compact summary row
        html += '<tr class="cm-summary" id="cm-summary-' + rowIdx + '" onclick="toggleCmRow(' + rowIdx + ')">';
        html += '<td class="cell-wrap" title="' + escapeAttr(m.question) + '">' + escapeHtml(m.question) + '</td>';
        html += '<td>' + m.category.replace(/_/g, ' ') + '</td>';
        html += '<td>' + m.status + '</td>';
        html += '<td><div class="cm-positions">';
        for (var pos of m.cohort_positions) {
          var posColor = cohortColors[pos.cohort_label] || 'var(--text-dark)';
          html += '<span class="cm-pos-chip" title="' + escapeAttr(pos.majority_answer) + '">';
          html += '<span class="cm-pos-label" style="color:' + posColor + '">' + pos.cohort_label + '</span>';
          html += '<span class="cm-pos-answer">' + escapeHtml(pos.majority_answer) + '</span>';
          html += '</span>';
        }
        html += '</div></td>';
        html += '<td style="text-align:center"><span class="cm-chevron">▶</span></td>';
        html += '</tr>';

        // Hidden detail row (toggled by clicking the summary)
        html += '<tr class="cm-details" id="cm-details-' + rowIdx + '" style="display:none">';
        html += '<td colspan="5"><div class="cm-details-inner">' + renderCohortOpinionsBlock(m) + '</div></td>';
        html += '</tr>';
      }

      html += '</tbody></table>';

      // Pagination controls
      html += '<div class="table-pagination">';
      html += '<div class="page-size-btns"><span>Rows:</span>';
      [10, 25, 50].forEach(function(size) {
        html += '<button class="page-size-btn' + (cmPageSize === size ? ' active' : '') + '" onclick="setCmPageSize(' + size + ')">' + size + '</button>';
      });
      html += '</div>';
      html += '<span>Showing ' + (start + 1) + '–' + end + ' of ' + markets.length + '</span>';
      html += '<div style="display:flex;gap:6px">';
      html += '<button onclick="cmPrevPage()"' + (cmCurrentPage <= 1 ? ' disabled' : '') + '>Prev</button>';
      html += '<button onclick="cmNextPage()"' + (cmCurrentPage >= totalPages ? ' disabled' : '') + '>Next</button>';
      html += '</div></div>';

      wrap.innerHTML = html;
    }

    function toggleCmRow(rowIdx) {
      var summary = document.getElementById('cm-summary-' + rowIdx);
      var details = document.getElementById('cm-details-' + rowIdx);
      if (!summary || !details) return;
      var open = summary.classList.toggle('open');
      details.style.display = open ? '' : 'none';
    }

    function setCmPageSize(size) {
      cmPageSize = size;
      cmCurrentPage = 1;
      renderCommonMarketsPage();
    }

    function cmPrevPage() {
      if (cmCurrentPage > 1) { cmCurrentPage--; renderCommonMarketsPage(); }
    }

    function cmNextPage() {
      var totalPages = Math.ceil(cmAllMarkets.length / cmPageSize);
      if (cmCurrentPage < totalPages) { cmCurrentPage++; renderCommonMarketsPage(); }
    }

    function escapeHtml(s) {
      if (!s) return '';
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function escapeAttr(s) {
      return escapeHtml(s).replace(/'/g, '&#39;');
    }

    function startResize(e, handle) {
      e.preventDefault();
      var th = handle.parentElement;
      var startX = e.pageX;
      var startW = th.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      function onMove(ev) {
        var newW = Math.max(60, startW + ev.pageX - startX);
        th.style.width = newW + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }

    // ── Init ─────────────────────────────────────────────────────
    document.getElementById('pool-search').addEventListener('input', function() { clearTimeout(this._t); this._t = setTimeout(renderAgentList, 300); });
    document.getElementById('filter-style').addEventListener('change', renderAgentList);
    document.getElementById('filter-type').addEventListener('change', renderAgentList);

    // Click cohort boxes to select
    document.querySelectorAll('.cohort-box').forEach(function(box) {
      box.addEventListener('click', function(e) {
        if (e.target.closest('.chip-remove') || e.target.closest('.cohort-remove-btn')) return;
        selectCohort(box.getAttribute('data-cohort'));
      });
    });

    loadAgents();
    refreshCohortUI();
    loadBatchPicker();
    updateAddCohortBtn();
    updateGenerateBtn();
  </script>
</body>
</html>`;
}
