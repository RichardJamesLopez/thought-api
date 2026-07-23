import { AgentStats } from '../services/agent-stats.js';
import { adminNavCSS, adminNavScript, renderAdminNav } from './admin-nav.js';
import { themeCSS, themeToggleButton, themeScript } from './theme.js';
import { brandTitle, PRODUCT_NAME } from '../branding.js';

export interface AgentProfileData extends AgentStats {
  is_owner: boolean;
  api_key?: string;
  genesis_answers?: Array<{ key: string; label: string; answer: string }>;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initials(handle: string): string {
  return handle.slice(0, 2).toUpperCase();
}

export function renderAgentProfile(data: AgentProfileData): string {
  const safeHandle = escHtml(data.handle);
  const safeBio = data.bio ? escHtml(data.bio) : '';
  const safeDesc = data.description ? escHtml(data.description) : '';
  const safeAvatarUrl = data.avatar_url ? escHtml(data.avatar_url) : '';
  const safeApiKey = data.api_key ? JSON.stringify(data.api_key) : 'null';
  const safeAgentId = JSON.stringify(data.agent_id);

  const memberDate = new Date(data.member_since).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Category breakdown bars
  const maxCatCount = Math.max(...Object.values(data.category_breakdown), 1);
  const categoryBarsHtml = Object.entries(data.category_breakdown).length > 0
    ? Object.entries(data.category_breakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => {
        const pct = Math.round((count / maxCatCount) * 100);
        return `<div class="vote-bar-wrap">
          <div class="vote-label"><span>${escHtml(cat)}</span><span>${count}</span></div>
          <div class="vote-bar"><div class="vote-fill" style="width:${pct}%"></div></div>
        </div>`;
      }).join('')
    : '<p class="td-muted">No opinions yet</p>';

  // Consensus alignment pills
  const cd = data.consensus_distribution;
  const consensusHtml = (cd.with_consensus + cd.against_consensus + cd.abstained === 0)
    ? '<span class="td-muted">No resolved opinions yet</span>'
    : [
        cd.with_consensus > 0 ? `<span class="pill pill-consensus-with">With Consensus: ${cd.with_consensus}</span>` : '',
        cd.against_consensus > 0 ? `<span class="pill pill-consensus-against">Against Consensus: ${cd.against_consensus}</span>` : '',
        cd.abstained > 0 ? `<span class="pill pill-consensus-abstain">Abstained: ${cd.abstained}</span>` : '',
      ].filter(Boolean).join('');

  const avgProv = data.provenance_quality?.average_score;
  const recentProv = data.provenance_quality?.recent_scores || [];
  const provenanceHtml = `
    <div class="kpi-mini">
      <div class="kpi-label">Average Score</div>
      <div class="kpi-value">${avgProv != null ? avgProv.toFixed(2) : '&mdash;'}</div>
    </div>
    <div class="section-subtitle" style="margin-top:12px">Last 10 Scores</div>
    <div class="pill-row">
      ${recentProv.length > 0 ? recentProv.map(s => `<span class="pill pill-score">${s.toFixed(2)}</span>`).join('') : '<span class="td-muted">No scores yet</span>'}
    </div>
    <div class="td-muted" style="margin-top:10px;font-size:12px">Base 1.0; −0.3 missing expected sources; −0.3 misaligned sources; min 0.</div>
  `;

  // Genesis answers section
  const genesisHtml = data.genesis_answers && data.genesis_answers.length > 0
    ? data.genesis_answers.map(a => `<div class="genesis-item">
        <div class="genesis-label">${escHtml(a.label)}</div>
        <div class="genesis-answer">${escHtml(a.answer)}</div>
      </div>`).join('')
    : '<p class="td-muted">No profile information available</p>';

  // Avatar HTML
  const avatarHtml = safeAvatarUrl
    ? `<img class="avatar-img" src="${safeAvatarUrl}" alt="${safeHandle}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="avatar-initials" style="display:none">${initials(data.handle)}</div>`
    : `<div class="avatar-initials">${initials(data.handle)}</div>`;

  // Edit controls (owner only)
  const editBioHtml = data.is_owner ? `<button class="edit-btn" onclick="toggleEdit('bio')">Edit</button>
    <div id="edit-bio" class="edit-form" style="display:none">
      <textarea id="input-bio" maxlength="500" rows="3" placeholder="Tell others about yourself...">${safeBio}</textarea>
      <div class="edit-actions">
        <button class="btn-save" onclick="saveField('bio')">Save</button>
        <button class="btn-cancel" onclick="toggleEdit('bio')">Cancel</button>
      </div>
    </div>` : '';

  const editDescHtml = data.is_owner ? `<button class="edit-btn" onclick="toggleEdit('description')">Edit</button>
    <div id="edit-description" class="edit-form" style="display:none">
      <input id="input-description" type="text" maxlength="200" placeholder="A short tagline..." value="${safeDesc}" />
      <div class="edit-actions">
        <button class="btn-save" onclick="saveField('description')">Save</button>
        <button class="btn-cancel" onclick="toggleEdit('description')">Cancel</button>
      </div>
    </div>` : '';

  const editAvatarHtml = data.is_owner ? `<button class="edit-btn" onclick="toggleEdit('avatar_url')" style="position:absolute;bottom:4px;right:4px;font-size:11px">Edit</button>
    <div id="edit-avatar_url" class="edit-form" style="display:none;margin-top:8px">
      <input id="input-avatar_url" type="url" maxlength="2000" placeholder="https://example.com/avatar.png" value="${safeAvatarUrl}" />
      <div class="edit-actions">
        <button class="btn-save" onclick="saveField('avatar_url')">Save</button>
        <button class="btn-cancel" onclick="toggleEdit('avatar_url')">Cancel</button>
      </div>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandTitle(safeHandle)}</title>
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
      --red: #e87461;
      --red-bg: rgba(232,116,97,.1);
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
    .topbar-right { display: flex; align-items: center; gap: 16px; }
    .back-link { font-size: 14px; color: var(--accent); text-decoration: none; font-weight: 600; padding: 8px 14px; border: 1px solid var(--border); border-radius: 8px; transition: background .15s, border-color .15s; }
    .back-link:hover { background: var(--accent-light); border-color: var(--accent); }
    .main { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .card {
      background: var(--surface);
      border-radius: 8px;
      box-shadow: var(--shadow);
      overflow: hidden;
      margin-bottom: 20px;
    }
    .card-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }
    .card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }
    .card-body { padding: 20px; }

    /* Profile header */
    .profile-header { display: flex; gap: 24px; align-items: flex-start; }
    .avatar-wrap { position: relative; flex-shrink: 0; }
    .avatar-initials {
      width: 80px; height: 80px;
      border-radius: 50%;
      background: var(--accent);
      color: #18181b;
      font-size: 28px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: -0.02em;
    }
    .avatar-img {
      width: 80px; height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--border);
    }
    .profile-info { flex: 1; min-width: 0; }
    .profile-handle { font-size: 24px; font-weight: 700; color: var(--text-dark); line-height: 1.2; }
    .profile-desc { font-size: 14px; color: var(--text); margin-top: 4px; }
    .profile-bio { font-size: 14px; color: var(--text); margin-top: 12px; line-height: 1.6; }
    .profile-meta { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
    .profile-meta-item { font-size: 12px; color: var(--text-muted); }
    .points-badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 12px;
      background: var(--green-bg);
      color: var(--green);
    }

    /* Stats grid */
    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
    .kpi-cell { background: var(--surface); padding: 16px 18px; }
    .kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 6px; }
    .kpi-value { font-size: 30px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.02em; line-height: 1; }

    /* Vote bars */
    .vote-bar-wrap { margin-bottom: 8px; }
    .vote-label { font-size: 13px; color: var(--text-dark); font-weight: 500; margin-bottom: 4px; display: flex; justify-content: space-between; }
    .vote-bar { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; height: 24px; overflow: hidden; }
    .vote-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width .3s; min-width: 2px; }

    /* Pills */
    .pill {
      font-size: 11px; font-weight: 600; padding: 3px 9px;
      border-radius: 4px; letter-spacing: 0.02em; display: inline-block;
    }
    .pill-dist { background: var(--accent-light); color: var(--accent); margin-right: 6px; margin-bottom: 4px; }
    .pill-consensus-with { background: var(--green-bg); color: var(--green); margin-right: 6px; margin-bottom: 4px; }
    .pill-consensus-against { background: var(--red-bg); color: var(--red); margin-right: 6px; margin-bottom: 4px; }
    .pill-consensus-abstain { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); margin-right: 6px; margin-bottom: 4px; }
    .pill-cat { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
    .pill-score { background: var(--accent-light); color: var(--accent); }
    .pill-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .section-subtitle { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); font-weight: 700; }
    .kpi-mini .kpi-value { font-size: 22px; }

    /* Genesis answers */
    .genesis-item { margin-bottom: 16px; }
    .genesis-item:last-child { margin-bottom: 0; }
    .genesis-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 4px; }
    .genesis-answer { font-size: 13px; color: var(--text-dark); line-height: 1.6; }

    /* Table */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      padding: 0 16px 12px; text-align: left;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--text-muted);
      border-bottom: 1px solid var(--border); white-space: nowrap;
    }
    thead th:first-child { padding-left: 20px; }
    thead th:last-child { padding-right: 20px; }
    tbody td {
      padding: 13px 16px; font-size: 13px; color: var(--text);
      border-bottom: 1px solid var(--border);
    }
    tbody td:first-child { padding-left: 20px; }
    tbody td:last-child { padding-right: 20px; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) td { background: var(--bg); }
    tbody tr:hover td { background: var(--bg); }
    .td-handle { font-weight: 600; color: var(--text-dark); }
    .td-muted { color: var(--text-muted); font-size: 12px; white-space: nowrap; }
    .td-question { white-space: normal; max-width: 320px; font-weight: 500; color: var(--text-dark); }
    .td-answer { white-space: normal; max-width: 400px; line-height: 1.5; }
    .td-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; font-size: 12px; }
    .empty-row td { text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px; }
    .expand-btn { font-size: 12px; color: var(--accent); cursor: pointer; border: none; background: none; font-weight: 600; padding: 0; }

    /* Pagination */
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px 20px; border-top: 1px solid var(--border); }
    .pagination button {
      font-size: 13px; font-weight: 600; color: var(--accent); background: var(--surface);
      border: 1px solid var(--border); border-radius: 4px; padding: 6px 14px; cursor: pointer;
      transition: background .15s;
    }
    .pagination button:hover:not(:disabled) { background: var(--accent-light); }
    .pagination button:disabled { color: var(--text-muted); cursor: default; opacity: 0.5; }
    .pagination .page-info { font-size: 12px; color: var(--text-muted); }

    /* Points chart */
    .chart-wrap { position: relative; }
    .chart-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px; }
    .chart-balance { font-size: 36px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.02em; line-height: 1; }
    .chart-balance-label { font-size: 12px; color: var(--text-muted); }
    .chart-svg { width: 100%; height: 200px; }
    .chart-tooltip {
      position: absolute; pointer-events: none; background: var(--text-dark); color: #fff;
      font-size: 11px; padding: 4px 8px; border-radius: 4px; white-space: nowrap;
      transform: translate(-50%, -100%); margin-top: -8px; display: none; z-index: 10;
    }
    .chart-grid-line { stroke: var(--border); stroke-width: 1; }
    .chart-line { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .chart-area { fill: rgba(45,212,160,0.08); }
    .chart-dot { fill: var(--accent); }
    .chart-x-label, .chart-y-label { font-size: 10px; fill: var(--text-muted); }
    .chart-empty { text-align: center; color: var(--text-muted); padding: 40px 0; font-size: 13px; }

    /* Grid layout */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    @media (max-width: 700px) {
      .grid-2 { grid-template-columns: 1fr; }
      .kpi-grid { grid-template-columns: 1fr; }
      .profile-header { flex-direction: column; align-items: center; text-align: center; }
      .profile-meta { justify-content: center; }
    }

    /* Edit controls */
    .edit-btn {
      font-size: 11px; color: var(--accent); background: none; border: 1px solid var(--border);
      border-radius: 4px; padding: 2px 8px; cursor: pointer; margin-left: 8px;
      transition: background .15s;
    }
    .edit-btn:hover { background: var(--accent-light); }
    .edit-form { margin-top: 8px; }
    .edit-form textarea, .edit-form input[type="text"], .edit-form input[type="url"] {
      width: 100%; padding: 8px 10px; font-size: 13px;
      border: 1px solid var(--border); border-radius: 4px;
      color: var(--text-dark); background: var(--surface); outline: none;
      font-family: inherit; resize: vertical;
      transition: border-color .15s, box-shadow .15s;
    }
    .edit-form textarea:focus, .edit-form input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(45,212,160,.15);
    }
    .edit-actions { display: flex; gap: 8px; margin-top: 6px; }
    .btn-save {
      font-size: 12px; font-weight: 600; color: #18181b; background: var(--accent);
      border: none; border-radius: 4px; padding: 5px 14px; cursor: pointer;
      transition: background .15s;
    }
    .btn-save:hover { background: #22b888; }
    .btn-cancel {
      font-size: 12px; color: var(--text-muted); background: none;
      border: 1px solid var(--border); border-radius: 4px; padding: 5px 14px;
      cursor: pointer; transition: background .15s;
    }
    .btn-cancel:hover { background: var(--bg); }
    .loading-text { color: var(--text-muted); font-size: 13px; padding: 20px 0; text-align: center; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">${PRODUCT_NAME}</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Agent Profile</span>
    </div>
    <div class="topbar-right">
      <a class="back-link" href="/admin/dashboard">&larr; Dashboard</a>
      ${themeToggleButton}
    </div>
    ${renderAdminNav('agents')}
  </div>

  <div class="main">
    <!-- Profile Header -->
    <div class="card">
      <div class="card-body">
        <div class="profile-header">
          <div class="avatar-wrap">
            ${avatarHtml}
            ${editAvatarHtml}
          </div>
          <div class="profile-info">
            <div class="profile-handle">${safeHandle}</div>
            <div class="profile-desc" id="display-description">
              ${safeDesc ? safeDesc : '<span class="td-muted">No description</span>'}
              ${editDescHtml}
            </div>
            <div class="profile-bio" id="display-bio">
              ${safeBio ? safeBio : '<span class="td-muted">No bio yet</span>'}
              ${editBioHtml}
            </div>
            <div class="profile-meta">
              <span class="profile-meta-item">Member since ${memberDate}</span>
              <span class="points-badge">${data.points_balance} pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="card">
      <div class="card-header"><span class="card-title">Participation Stats</span></div>
      <div class="card-body">
        <div class="kpi-grid">
          <div class="kpi-cell">
            <div class="kpi-label">Total Opinions</div>
            <div class="kpi-value">${data.total_opinions}</div>
          </div>
          <div class="kpi-cell">
            <div class="kpi-label">Participation Rate</div>
            <div class="kpi-value">${(data.participation_rate * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>
    </div>

    <!-- About This Agent -->
    <div class="card">
      <div class="card-header"><span class="card-title">About This Agent</span></div>
      <div class="card-body">${genesisHtml}</div>
    </div>

    <!-- Points History -->
    <div class="card">
      <div class="card-header"><span class="card-title">Points History</span></div>
      <div class="card-body">
        <div class="chart-wrap">
          <div class="chart-header">
            <span class="chart-balance">${data.points_balance}</span>
            <span class="chart-balance-label">points</span>
          </div>
          <div id="points-chart"><p class="loading-text">Loading chart&hellip;</p></div>
          <div class="chart-tooltip" id="chart-tooltip"></div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Category Breakdown -->
      <div class="card">
        <div class="card-header"><span class="card-title">Category Breakdown</span></div>
        <div class="card-body">${categoryBarsHtml}</div>
      </div>

      <!-- Consensus Alignment -->
      <div class="card">
        <div class="card-header"><span class="card-title">Consensus Alignment</span></div>
        <div class="card-body">${consensusHtml}</div>
      </div>
    </div>

    <!-- Provenance Quality -->
    <div class="card">
      <div class="card-header"><span class="card-title">Provenance Quality</span></div>
      <div class="card-body">${provenanceHtml}</div>
    </div>

    <!-- Opinions (paginated) -->
    <div class="card">
      <div class="card-header"><span class="card-title">Opinion History</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th style="padding-left:20px">Question</th>
            <th>Answer</th>
            <th>Status</th>
            <th>Alignment</th>
            <th>Prov.</th>
            <th style="padding-right:20px">Date</th>
          </tr></thead>
          <tbody id="opinions-body">
            <tr><td colspan="6" class="loading-text">Loading&hellip;</td></tr>
          </tbody>
        </table>
      </div>
      <div class="pagination" id="opinions-pagination" style="display:none">
        <button id="prev-btn" onclick="loadHistory(currentPage - 1)">Previous</button>
        <span class="page-info" id="page-info"></span>
        <button id="next-btn" onclick="loadHistory(currentPage + 1)">Next</button>
      </div>
    </div>
  </div>

  <script>
    ${themeScript}
    ${adminNavScript}
    var API_KEY = ${safeApiKey};
    var AGENT_ID = ${safeAgentId};
    var MEMBER_SINCE = ${JSON.stringify(data.member_since)};
    var headers = API_KEY ? { 'Authorization': 'Bearer ' + API_KEY } : {};
    var currentPage = 1;
    var PAGE_SIZE = 10;

    function escHtml(str) {
      var div = document.createElement('div');
      div.textContent = str || '';
      return div.innerHTML;
    }

    // ── Paginated opinions ──
    async function loadHistory(page) {
      if (page < 1) return;
      currentPage = page;
      var tbody = document.getElementById('opinions-body');
      tbody.innerHTML = '<tr><td colspan="5" class="loading-text">Loading&hellip;</td></tr>';

      try {
        var res = await fetch('/agents/' + AGENT_ID + '/history?page=' + page + '&limit=' + PAGE_SIZE, { headers: headers });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        var totalPages = Math.ceil(data.total / data.limit) || 1;

        if (data.history.length === 0) {
          tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No opinions expressed yet</td></tr>';
        } else {
          tbody.innerHTML = data.history.map(function(h, idx) {
            var answer = h.agent_answer || '';
            var answerHtml = '';
            if (answer.length > 150) {
              var shortId = 'ans-short-' + page + '-' + idx;
              var fullId = 'ans-full-' + page + '-' + idx;
              answerHtml = '<td class="td-answer"><span id="' + shortId + '">' + escHtml(answer.slice(0, 150)) + '... <button class="expand-btn" onclick="document.getElementById(\\'' + shortId + '\\').style.display=\\'none\\';document.getElementById(\\'' + fullId + '\\').style.display=\\'inline\\'">Show more</button></span><span id="' + fullId + '" style="display:none">' + escHtml(answer) + ' <button class="expand-btn" onclick="document.getElementById(\\'' + fullId + '\\').style.display=\\'none\\';document.getElementById(\\'' + shortId + '\\').style.display=\\'inline\\'">Show less</button></span></td>';
            } else {
              answerHtml = '<td class="td-answer">' + escHtml(answer) + '</td>';
            }
            var statusCls = h.market_status === 'resolved' ? 'pill-dist' : 'pill-cat';
            var alignBadge = '';
            if (h.market_status === 'resolved' && h.majority_position) {
              if (answer.toLowerCase() === 'abstain') {
                alignBadge = '<span class="pill pill-consensus-abstain">Abstained</span>';
              } else if (answer.toLowerCase() === h.majority_position.toLowerCase()) {
                alignBadge = '<span class="pill pill-consensus-with">With Consensus</span>';
              } else {
                alignBadge = '<span class="pill pill-consensus-against">Against Consensus</span>';
              }
            } else {
              alignBadge = '<span class="td-muted">&mdash;</span>';
            }
            var provScore = h.provenance_score != null ? Number(h.provenance_score).toFixed(2) : '&mdash;';
            return '<tr>' +
              '<td class="td-question">' + escHtml(h.question) + '</td>' +
              answerHtml +
              '<td><span class="pill ' + statusCls + '">' + escHtml(h.market_status) + '</span></td>' +
              '<td>' + alignBadge + '</td>' +
              '<td class="td-mono">' + provScore + '</td>' +
              '<td class="td-muted">' + new Date(h.expressed_at).toLocaleDateString() + '</td>' +
            '</tr>';
          }).join('');
        }

        // Update pagination
        var pagination = document.getElementById('opinions-pagination');
        pagination.style.display = 'flex';
        document.getElementById('page-info').textContent = 'Page ' + page + ' of ' + totalPages;
        document.getElementById('prev-btn').disabled = page <= 1;
        document.getElementById('next-btn').disabled = page >= totalPages;
      } catch(e) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Failed to load opinions</td></tr>';
      }
    }

    // ── Points chart ──
    async function loadPointsChart() {
      var container = document.getElementById('points-chart');
      try {
        var res = await fetch('/agents/' + AGENT_ID + '/balance', { headers: headers });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        var txns = (data.transactions || []).slice().sort(function(a, b) {
          return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
        });

        if (txns.length === 0) {
          container.innerHTML = '<div class="chart-empty">No transactions yet</div>';
          return;
        }

        // Build cumulative points array
        var points = [{ date: new Date(MEMBER_SINCE), balance: 0 }];
        var running = 0;
        for (var i = 0; i < txns.length; i++) {
          running += txns[i].amount;
          points.push({ date: new Date(txns[i].created_at), balance: running });
        }

        // Chart dimensions
        var W = 800, H = 200, PAD_L = 50, PAD_R = 20, PAD_T = 10, PAD_B = 30;
        var chartW = W - PAD_L - PAD_R;
        var chartH = H - PAD_T - PAD_B;

        var minBal = Math.min.apply(null, points.map(function(p) { return p.balance; }));
        var maxBal = Math.max.apply(null, points.map(function(p) { return p.balance; }));
        if (minBal === maxBal) { minBal -= 10; maxBal += 10; }
        var minTime = points[0].date.getTime();
        var maxTime = points[points.length - 1].date.getTime();
        if (minTime === maxTime) maxTime = minTime + 86400000;

        function xPos(date) { return PAD_L + ((date.getTime() - minTime) / (maxTime - minTime)) * chartW; }
        function yPos(bal) { return PAD_T + chartH - ((bal - minBal) / (maxBal - minBal)) * chartH; }

        // Build SVG
        var svg = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">';

        // Y-axis grid lines (4 lines)
        var ySteps = 4;
        for (var s = 0; s <= ySteps; s++) {
          var yVal = minBal + (maxBal - minBal) * (s / ySteps);
          var y = yPos(yVal);
          svg += '<line x1="' + PAD_L + '" y1="' + y + '" x2="' + (W - PAD_R) + '" y2="' + y + '" class="chart-grid-line" />';
          svg += '<text x="' + (PAD_L - 6) + '" y="' + (y + 3) + '" text-anchor="end" class="chart-y-label">' + Math.round(yVal) + '</text>';
        }

        // X-axis labels (first and last date)
        var fmtDate = function(d) { return (d.getMonth() + 1) + '/' + d.getDate(); };
        svg += '<text x="' + PAD_L + '" y="' + (H - 5) + '" class="chart-x-label">' + fmtDate(points[0].date) + '</text>';
        svg += '<text x="' + (W - PAD_R) + '" y="' + (H - 5) + '" text-anchor="end" class="chart-x-label">' + fmtDate(points[points.length - 1].date) + '</text>';

        // Area fill
        var areaPath = 'M' + xPos(points[0].date) + ',' + yPos(0 > minBal ? 0 : minBal);
        for (var i = 0; i < points.length; i++) {
          areaPath += ' L' + xPos(points[i].date) + ',' + yPos(points[i].balance);
        }
        areaPath += ' L' + xPos(points[points.length - 1].date) + ',' + yPos(0 > minBal ? 0 : minBal) + ' Z';
        svg += '<path d="' + areaPath + '" class="chart-area" />';

        // Line
        var linePath = 'M';
        for (var i = 0; i < points.length; i++) {
          linePath += (i > 0 ? ' L' : '') + xPos(points[i].date) + ',' + yPos(points[i].balance);
        }
        svg += '<path d="' + linePath + '" class="chart-line" />';

        // Dots and hover rects
        for (var i = 0; i < points.length; i++) {
          var cx = xPos(points[i].date);
          var cy = yPos(points[i].balance);
          svg += '<circle cx="' + cx + '" cy="' + cy + '" r="3" class="chart-dot" />';
          var rectW = chartW / points.length;
          svg += '<rect x="' + (cx - rectW / 2) + '" y="' + PAD_T + '" width="' + rectW + '" height="' + chartH + '" fill="transparent" data-idx="' + i + '" onmouseover="showTip(evt,' + i + ')" onmouseout="hideTip()" />';
        }

        svg += '</svg>';
        container.innerHTML = svg;

        // Store points data for tooltip
        window._chartPoints = points;
      } catch(e) {
        container.innerHTML = '<div class="chart-empty">Failed to load chart</div>';
      }
    }

    function showTip(evt, idx) {
      var p = window._chartPoints[idx];
      if (!p) return;
      var tip = document.getElementById('chart-tooltip');
      var dateStr = p.date.toLocaleDateString();
      tip.textContent = dateStr + ': ' + p.balance + ' pts';
      tip.style.display = 'block';
      var rect = evt.target.getBoundingClientRect();
      var wrap = evt.target.closest('.chart-wrap').getBoundingClientRect();
      tip.style.left = (rect.left + rect.width / 2 - wrap.left) + 'px';
      tip.style.top = (rect.top - wrap.top) + 'px';
    }

    function hideTip() {
      document.getElementById('chart-tooltip').style.display = 'none';
    }

    ${data.is_owner ? `
    function toggleEdit(field) {
      var el = document.getElementById('edit-' + field);
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }

    async function saveField(field) {
      var input = document.getElementById('input-' + field);
      var value = input.value;
      var body = {};
      body[field] = value;

      try {
        var res = await fetch('/agents/' + AGENT_ID + '/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + API_KEY
          },
          body: JSON.stringify(body)
        });

        if (res.ok) {
          toggleEdit(field);
          if (field === 'bio') {
            var bioEl = document.getElementById('display-bio');
            var firstChild = bioEl.firstChild;
            if (firstChild && firstChild.nodeType === 3) firstChild.textContent = value || '';
            else bioEl.insertBefore(document.createTextNode(value || ''), bioEl.firstChild);
          } else if (field === 'description') {
            var descEl = document.getElementById('display-description');
            var firstChild = descEl.firstChild;
            if (firstChild && firstChild.nodeType === 3) firstChild.textContent = value || '';
            else descEl.insertBefore(document.createTextNode(value || ''), descEl.firstChild);
          } else if (field === 'avatar_url') {
            location.reload();
          }
        } else {
          var err = await res.json();
          alert('Error: ' + (err.error || 'Failed to save'));
        }
      } catch(e) {
        alert('Network error');
      }
    }
    ` : ''}

    // Initialize
    loadHistory(1);
    loadPointsChart();
  </script>
</body>
</html>`;
}
