import { adminNavCSS, adminNavScript, renderAdminNav } from './admin-nav.js';
import { themeCSS, themeToggleButton, themeScript } from './theme.js';
import { sqlite } from '../db/index.js';

export function renderTopicDetail(apiKey: string, topicId: string): string {
  const safeKey = JSON.stringify(apiKey);

  const topic = sqlite.prepare('SELECT * FROM surface_topics WHERE id = ?').get(topicId) as any;
  if (!topic) {
    return `<!DOCTYPE html><html><body><h1>Topic not found</h1><a href="/admin/surface-topics">Back</a></body></html>`;
  }

  const drafts = sqlite.prepare(
    'SELECT * FROM draft_questions WHERE surface_topic_id = ? ORDER BY generation_round, created_at'
  ).all(topicId) as any[];

  const counts = {
    draft: drafts.filter(d => d.status === 'draft').length,
    approved: drafts.filter(d => d.status === 'approved').length,
    rejected: drafts.filter(d => d.status === 'rejected').length,
    deployed: drafts.filter(d => d.status === 'deployed').length,
    total: drafts.length,
  };

  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const draftRows = drafts.map(d => {
    const statusClass = d.status === 'approved' ? 'pill-approved' : d.status === 'rejected' ? 'pill-rejected' : d.status === 'deployed' ? 'pill-deployed' : 'pill-draft';
    const typeClass = d.answer_type === 'longform' ? 'pill-longform' : d.answer_type === 'single_choice' ? 'pill-single_choice' : d.answer_type === 'multi_choice' ? 'pill-multi_choice' : d.answer_type === 'ranking' ? 'pill-ranking' : d.answer_type === 'scale' ? 'pill-scale' : 'pill-binary';

    const actions = d.status === 'draft'
      ? `<button class="btn-action btn-approve" onclick="updateDraft('${d.id}','approved')">Approve</button>
         <button class="btn-action btn-reject" onclick="updateDraft('${d.id}','rejected')">Reject</button>`
      : d.status === 'approved'
      ? `<button class="btn-action btn-deploy" onclick="deployDraft('${d.id}')">Deploy</button>
         <button class="btn-action btn-reject" onclick="updateDraft('${d.id}','rejected')">Reject</button>`
      : d.status === 'rejected'
      ? `<button class="btn-action btn-approve" onclick="updateDraft('${d.id}','approved')">Restore</button>`
      : '';

    return `<div class="draft-row" id="draft-${d.id}">
      <div class="draft-header">
        <div class="draft-pills">
          <span class="pill ${typeClass}">${escHtml(d.answer_type)}</span>
          <span class="pill ${statusClass}">${escHtml(d.status)}</span>
          <span class="pill pill-round">R${d.generation_round}</span>
        </div>
        <div class="draft-actions">${actions}</div>
      </div>
      <div class="draft-question">${escHtml(d.question)}</div>
      <div class="draft-description">${escHtml(d.description)}</div>
      ${(d.answer_type === 'single_choice' || d.answer_type === 'multi_choice' || d.answer_type === 'ranking') && d.answer_options ? `<div class="draft-options">${JSON.parse(d.answer_options).map((o: string) => `<span class="option-chip">${escHtml(o)}</span>`).join('')}</div>` : ''}
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — ${escHtml(topic.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #1a1816;
      --surface: #292524;
      --border: #3d3533;
      --shadow: 0 2px 8px rgba(0,0,0,.3), 0 1px 3px rgba(0,0,0,.2);
      --text: #a8a29e;
      --text-dark: #fafaf9;
      --text-muted: #78716c;
      --accent: #2dd4a0;
      --accent-light: rgba(45,212,160,.1);
      --green: #2dd4a0;
      --green-bg: rgba(45,212,160,.1);
      --yellow: #f0c541;
      --yellow-bg: rgba(240,197,65,.1);
      --red: #e87461;
      --red-bg: rgba(232,116,97,.1);
      --purple: #a78bfa;
      --purple-bg: rgba(167,139,250,.1);
    }
    ${themeCSS}
    ${adminNavCSS}
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .topbar {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 0 32px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .topbar-left { display: flex; align-items: center; gap: 16px; }
    .topbar-wordmark { font-size: 13px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.01em; }
    .topbar-divider { width: 1px; height: 18px; background: var(--border); }
    .topbar-subtitle { font-size: 13px; color: var(--text-muted); }
    .back-link {
      font-size: 14px;
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
      padding: 8px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      transition: background .15s, border-color .15s;
    }
    .back-link:hover { background: var(--accent-light); border-color: var(--accent); }
    .main { max-width: 900px; margin: 0 auto; padding: 32px 24px; }

    .card {
      background: var(--surface);
      border-radius: 8px;
      box-shadow: var(--shadow);
      overflow: hidden;
      margin-bottom: 24px;
    }
    .card-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }
    .card-body { padding: 20px; }

    .topic-name { font-size: 20px; font-weight: 700; color: var(--text-dark); margin-bottom: 8px; }
    .topic-meta { font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
    .topic-meta strong { color: var(--text); }
    .topic-insight {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px 14px;
      margin-top: 12px;
      font-size: 13px;
      color: var(--text);
    }
    .topic-insight-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 4px; }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    @media (max-width: 600px) { .stats-row { grid-template-columns: repeat(3, 1fr); } }
    .stat-box {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 12px;
      text-align: center;
    }
    .stat-value { font-size: 20px; font-weight: 700; color: var(--text-dark); }
    .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }

    .pill {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 4px;
    }
    .pill-draft { background: var(--yellow-bg); color: var(--yellow); }
    .pill-approved { background: var(--green-bg); color: var(--green); }
    .pill-rejected { background: var(--red-bg); color: var(--red); }
    .pill-deployed { background: var(--accent-light); color: var(--accent); }
    .pill-binary { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
    .pill-single_choice { background: rgba(45,212,160,.1); color: var(--accent); }
    .pill-multi_choice { background: rgba(59,130,246,.1); color: #3b82f6; }
    .pill-ranking { background: rgba(245,158,11,.1); color: #f59e0b; }
    .pill-scale { background: rgba(236,72,153,.1); color: #ec4899; }
    .pill-longform { background: var(--purple-bg); color: var(--purple); }
    .pill-round { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }

    .draft-row {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 12px;
      transition: border-color .15s;
    }
    .draft-row:hover { border-color: var(--accent); }
    .draft-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .draft-pills { display: flex; gap: 6px; align-items: center; }
    .draft-actions { display: flex; gap: 6px; }
    .draft-question { font-size: 15px; font-weight: 600; color: var(--text-dark); margin-bottom: 4px; }
    .draft-description { font-size: 13px; color: var(--text-muted); }
    .draft-options { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .option-chip {
      font-size: 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 3px 10px;
      color: var(--text);
    }

    .btn-action {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 4px;
      border: 1px solid var(--border);
      cursor: pointer;
      background: none;
      transition: background .15s, border-color .15s;
    }
    .btn-approve { color: var(--green); }
    .btn-approve:hover { background: var(--green-bg); border-color: var(--green); }
    .btn-reject { color: var(--red); }
    .btn-reject:hover { background: var(--red-bg); border-color: var(--red); }
    .btn-deploy { color: var(--accent); }
    .btn-deploy:hover { background: var(--accent-light); border-color: var(--accent); }

    .btn-generate {
      background: var(--accent);
      color: #1a1816;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 16px;
      cursor: pointer;
      transition: background .15s;
    }
    .btn-generate:hover { background: #22b888; }
    .btn-generate:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-approve-all {
      background: none;
      color: var(--green);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      cursor: pointer;
      transition: background .15s;
    }
    .btn-approve-all:hover { background: var(--green-bg); }

    .filter-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .filter-btn {
      font-size: 12px;
      font-weight: 500;
      padding: 4px 12px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: none;
      color: var(--text);
      cursor: pointer;
      transition: background .15s, border-color .15s;
    }
    .filter-btn.active { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
    }
    .empty-state p { font-size: 14px; margin-bottom: 16px; }

    .card-header-collapsible { cursor: pointer; user-select: none; }
    .card-header-collapsible:hover .card-title { color: var(--text); }
    .collapse-icon { display: inline-block; width: 16px; height: 16px; margin-left: 8px; transition: transform .25s ease; flex-shrink: 0; color: var(--text-muted); }
    .card-collapsible .collapsible-content { max-height: 5000px; overflow: hidden; transition: max-height .3s ease, opacity .25s ease; opacity: 1; }
    .card-collapsible.collapsed .collapsible-content { max-height: 0; opacity: 0; }
    .card-collapsible.collapsed .card-header { border-bottom-color: transparent; }
    .card-collapsible.collapsed .collapse-icon { transform: rotate(-90deg); }

    .analysis-section { margin-bottom: 18px; }
    .analysis-section:last-of-type { margin-bottom: 0; }
    .analysis-heading {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .analysis-paragraph {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text);
    }
    .analysis-paragraph.placeholder { color: var(--text-muted); font-style: italic; }
    .analysis-footer {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .analysis-meta { font-size: 12px; color: var(--text-muted); }
    .analysis-meta .stale { color: var(--yellow); margin-left: 6px; }
    .btn-regenerate {
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: none;
      color: var(--text);
      cursor: pointer;
      transition: background .15s, border-color .15s;
    }
    .btn-regenerate:hover { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
    .btn-regenerate:disabled { opacity: 0.6; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Surface Topic</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <a href="/admin/surface-topics" class="back-link">&larr; Surface Topics</a>
      ${themeToggleButton}
    </div>
    ${renderAdminNav('studies')}
  </div>

  <div class="main">
    <!-- Topic overview card -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Topic Overview</span>
        <span class="pill pill-${topic.status === 'active' ? 'approved' : 'draft'}">${escHtml(topic.status)}</span>
      </div>
      <div class="card-body">
        <div class="topic-name">${escHtml(topic.name)}</div>
        <div class="topic-meta">${escHtml(topic.description)}</div>
        <div class="topic-insight">
          <div class="topic-insight-label">Insight Goal (hidden from agents)</div>
          ${escHtml(topic.insight_goal)}
        </div>
        <div class="stats-row">
          <div class="stat-box"><div class="stat-value">${counts.total}</div><div class="stat-label">Total</div></div>
          <div class="stat-box"><div class="stat-value">${counts.draft}</div><div class="stat-label">Draft</div></div>
          <div class="stat-box"><div class="stat-value">${counts.approved}</div><div class="stat-label">Approved</div></div>
          <div class="stat-box"><div class="stat-value">${counts.deployed}</div><div class="stat-label">Deployed</div></div>
          <div class="stat-box"><div class="stat-value">${counts.rejected}</div><div class="stat-label">Rejected</div></div>
        </div>
      </div>
    </div>

    <!-- Topic analysis card (collapsible) -->
    <div class="card card-collapsible collapsed" id="analysis-card">
      <div class="card-header card-header-collapsible" onclick="toggleAnalysis()">
        <span class="card-title">Topic Analysis</span>
        <span class="collapse-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4,6 8,10 12,6"/></svg></span>
      </div>
      <div class="collapsible-content">
        <div class="card-body">
          <div class="analysis-section">
            <div class="analysis-heading">Consensus</div>
            <p class="analysis-paragraph placeholder" id="analysis-consensus">Loading analysis...</p>
          </div>
          <div class="analysis-section">
            <div class="analysis-heading">Outlier Opinions</div>
            <p class="analysis-paragraph placeholder" id="analysis-outliers"></p>
          </div>
          <div class="analysis-section">
            <div class="analysis-heading">Interesting Trends</div>
            <p class="analysis-paragraph placeholder" id="analysis-trends"></p>
          </div>
          <div class="analysis-footer">
            <div class="analysis-meta" id="analysis-meta"></div>
            <button class="btn-regenerate" id="analysis-regen-btn" onclick="regenerateAnalysis()" style="display:none">Regenerate</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Draft questions card -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Generated Questions (${counts.total})</span>
        <div style="display:flex;gap:8px;align-items:center">
          ${counts.draft > 0 ? `<button class="btn-approve-all" onclick="approveAll()">Approve All Drafts</button>` : ''}
          <button class="btn-generate" id="gen-btn" onclick="generateMore()">+ Generate More</button>
        </div>
      </div>
      <div class="card-body">
        ${counts.total > 0 ? `
        <div class="filter-bar">
          <button class="filter-btn active" onclick="filterDrafts('all',this)">All (${counts.total})</button>
          <button class="filter-btn" onclick="filterDrafts('draft',this)">Draft (${counts.draft})</button>
          <button class="filter-btn" onclick="filterDrafts('approved',this)">Approved (${counts.approved})</button>
          <button class="filter-btn" onclick="filterDrafts('deployed',this)">Deployed (${counts.deployed})</button>
          <button class="filter-btn" onclick="filterDrafts('rejected',this)">Rejected (${counts.rejected})</button>
        </div>
        <div id="drafts-list">${draftRows}</div>
        ` : `
        <div class="empty-state">
          <p>No questions generated yet.</p>
          <button class="btn-generate" onclick="generateMore()">Generate Questions</button>
        </div>
        `}
      </div>
    </div>
  </div>

  <script>
    ${themeScript}
    ${adminNavScript}
    var API_KEY = ${safeKey};
    var TOPIC_ID = ${JSON.stringify(topicId)};

    function escHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    async function updateDraft(draftId, status) {
      try {
        var res = await fetch('/admin/analytics/draft-questions/' + draftId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },
          body: JSON.stringify({ status: status }),
        });
        if (res.ok) {
          window.location.reload();
        } else {
          var data = await res.json();
          alert(data.error || 'Failed to update draft');
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function deployDraft(draftId) {
      try {
        var res = await fetch('/admin/analytics/draft-questions/' + draftId + '/deploy', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + API_KEY },
        });
        if (res.ok) {
          window.location.reload();
        } else {
          var data = await res.json();
          alert(data.error || 'Failed to deploy draft');
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function approveAll() {
      var rows = document.querySelectorAll('.draft-row');
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var id = row.id.replace('draft-', '');
        var statusPill = row.querySelector('.pill-draft');
        if (statusPill) {
          await fetch('/admin/analytics/draft-questions/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },
            body: JSON.stringify({ status: 'approved' }),
          });
        }
      }
      window.location.reload();
    }

    async function generateMore() {
      var btn = document.getElementById('gen-btn');
      if (!btn) return;
      btn.disabled = true;
      btn.textContent = 'Generating...';

      try {
        var res = await fetch('/admin/analytics/surface-topics/' + TOPIC_ID + '/generate', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + API_KEY },
        });
        if (res.ok) {
          window.location.reload();
        } else {
          var data = await res.json();
          alert(data.error || 'Failed to generate questions');
          btn.disabled = false;
          btn.textContent = '+ Generate More';
        }
      } catch (err) {
        alert('Network error: ' + err.message);
        btn.disabled = false;
        btn.textContent = '+ Generate More';
      }
    }

    function toggleAnalysis() {
      var card = document.getElementById('analysis-card');
      if (card) card.classList.toggle('collapsed');
    }

    var PLACEHOLDER_TEXT = 'Analysis will appear once markets are resolved.';

    function formatTimestamp(iso) {
      try {
        var d = new Date(iso);
        return d.toLocaleString();
      } catch (e) { return iso; }
    }

    function renderAnalysis(data) {
      var consensusEl = document.getElementById('analysis-consensus');
      var outliersEl = document.getElementById('analysis-outliers');
      var trendsEl = document.getElementById('analysis-trends');
      var metaEl = document.getElementById('analysis-meta');
      var regenBtn = document.getElementById('analysis-regen-btn');

      if (data && data.empty) {
        consensusEl.textContent = PLACEHOLDER_TEXT;
        consensusEl.classList.add('placeholder');
        outliersEl.textContent = '';
        outliersEl.classList.add('placeholder');
        trendsEl.textContent = '';
        trendsEl.classList.add('placeholder');
        metaEl.textContent = '';
        regenBtn.style.display = 'none';
        return;
      }

      if (!data || !data.analysis) {
        consensusEl.textContent = 'Analysis unavailable.';
        outliersEl.textContent = '';
        trendsEl.textContent = '';
        metaEl.textContent = '';
        regenBtn.style.display = 'none';
        return;
      }

      consensusEl.textContent = data.analysis.consensus || '';
      consensusEl.classList.remove('placeholder');
      outliersEl.textContent = data.analysis.outliers || '';
      outliersEl.classList.remove('placeholder');
      trendsEl.textContent = data.analysis.trends || '';
      trendsEl.classList.remove('placeholder');

      var metaParts = [];
      if (data.generated_at) metaParts.push('Generated ' + formatTimestamp(data.generated_at));
      if (typeof data.resolved_count_at_generation === 'number') {
        metaParts.push(data.resolved_count_at_generation + ' resolved markets');
      }
      var metaHtml = metaParts.join(' \u00b7 ');
      var newSince = (data.current_resolved_count || 0) - (data.resolved_count_at_generation || 0);
      if (newSince > 0) {
        metaHtml += ' <span class="stale">\u00b7 ' + newSince + ' new market' + (newSince === 1 ? '' : 's') + ' since</span>';
      }
      metaEl.innerHTML = metaHtml;
      regenBtn.style.display = '';
    }

    async function loadAnalysis() {
      try {
        var res = await fetch('/admin/analytics/surface-topics/' + TOPIC_ID + '/analysis', {
          headers: { 'Authorization': 'Bearer ' + API_KEY },
        });
        if (!res.ok) {
          renderAnalysis(null);
          return;
        }
        var data = await res.json();
        renderAnalysis(data);
      } catch (err) {
        renderAnalysis(null);
      }
    }

    async function regenerateAnalysis() {
      var btn = document.getElementById('analysis-regen-btn');
      var consensusEl = document.getElementById('analysis-consensus');
      var outliersEl = document.getElementById('analysis-outliers');
      var trendsEl = document.getElementById('analysis-trends');
      if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
      consensusEl.textContent = 'Generating fresh analysis...';
      consensusEl.classList.add('placeholder');
      outliersEl.textContent = '';
      trendsEl.textContent = '';
      try {
        var res = await fetch('/admin/analytics/surface-topics/' + TOPIC_ID + '/analysis/regenerate', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + API_KEY },
        });
        var data = await res.json();
        if (!res.ok) {
          consensusEl.textContent = data.error || 'Regeneration failed.';
        } else {
          renderAnalysis(data);
        }
      } catch (err) {
        consensusEl.textContent = 'Network error: ' + err.message;
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Regenerate'; }
      }
    }

    document.addEventListener('DOMContentLoaded', loadAnalysis);

    function filterDrafts(status, btn) {
      var rows = document.querySelectorAll('.draft-row');
      rows.forEach(function(row) {
        if (status === 'all') {
          row.style.display = '';
        } else {
          var hasPill = row.querySelector('.pill-' + status);
          row.style.display = hasPill ? '' : 'none';
        }
      });
      document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    }
  </script>
</body>
</html>`;
}
