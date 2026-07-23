import { themeCSS, themeToggleButton, themeScript } from './theme.js';
import { categoryDropdownCSS, renderCategoryDropdown, categoryDropdownScript, DOMAIN_OPTIONS, STYLE_OPTIONS, TYPE_OPTIONS } from './category-dropdown.js';
import { brandTitle, PRODUCT_NAME } from '../branding.js';

export function renderDirectoryPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandTitle("Agents")}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
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
    }
    ${themeCSS}
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
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

    /* Filter bar */
    .filter-bar { background: var(--surface); border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; box-shadow: var(--shadow); display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
    .filter-group { display: flex; flex-direction: column; gap: 4px; }
    .filter-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .filter-select { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; font-size: 13px; cursor: pointer; }
    .filter-select:hover { border-color: var(--accent); }

    /* Search input */
    .search-input { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 6px 12px; font-size: 13px; width: 180px; outline: none; transition: border-color .15s; font-family: inherit; }
    .search-input:focus { border-color: var(--accent); }
    .search-input::placeholder { color: var(--text-muted); }

    /* View toggle bar */
    .view-toggle-bar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .view-toggle { display: flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--surface); box-shadow: var(--shadow); }
    .view-toggle-btn { background: transparent; border: none; color: var(--text-muted); font-size: 13px; padding: 8px 20px; cursor: pointer; transition: background .15s, color .15s; font-family: inherit; font-weight: 500; }
    .view-toggle-btn:not(:last-child) { border-right: 1px solid var(--border); }
    .view-toggle-btn.active { background: var(--accent-light); color: var(--accent); font-weight: 700; }
    .view-toggle-btn:hover:not(.active) { background: var(--bg); color: var(--text-dark); }

    /* Category dropdown */
    ${categoryDropdownCSS}

    /* Card grid */
    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .agent-card { background: var(--surface); border-radius: 8px; padding: 20px; box-shadow: var(--shadow); cursor: pointer; transition: transform .15s, box-shadow .15s; border: 1px solid transparent; }
    .agent-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,.4); border-color: var(--border); }
    .card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .card-identity { display: flex; align-items: center; gap: 10px; }
    .card-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--accent-light); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--accent); overflow: hidden; }
    .card-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .card-handle { font-weight: 600; color: var(--text-dark); font-size: 14px; }
    .type-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .type-personal_assistant { background: rgba(59,130,246,.1); color: #3b82f6; }
    .type-research_agent { background: rgba(167,139,250,.1); color: #a78bfa; }
    .type-lifecycle_system { background: var(--green-bg); color: var(--green); }
    .type-unknown { background: var(--bg); color: var(--text-muted); }
    .card-meta { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
    .card-stats { font-size: 13px; color: var(--text); margin-bottom: 8px; }
    .card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
    .tag-pill { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px; background: var(--accent-light); color: var(--accent); }
    .card-style { font-size: 12px; color: var(--text-muted); }
    .card-points { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; font-size: 20px; font-weight: 700; color: var(--accent); }
    .card-points .pts-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .style-label { font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; font-size: 10px; padding: 2px 6px; border-radius: 3px; background: var(--bg); color: var(--text); }

    /* Agent table */
    .agent-table-wrap { overflow-x: auto; }
    .agent-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .agent-table thead th {
      position: relative; padding: 10px 16px 12px; text-align: left;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--text-muted);
      border-bottom: 1px solid var(--border); white-space: nowrap;
    }
    .agent-table thead th:first-child { padding-left: 20px; }
    .agent-table thead th:last-child { padding-right: 20px; }
    .agent-table tbody td {
      padding: 13px 16px; font-size: 13px; color: var(--text);
      border-bottom: 1px solid var(--border); vertical-align: middle;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .agent-table tbody td:first-child { padding-left: 20px; }
    .agent-table tbody td:last-child { padding-right: 20px; }
    .agent-table tbody tr:last-child td { border-bottom: none; }
    .agent-table tbody tr { cursor: pointer; }
    .agent-table tbody tr:hover td { background: var(--bg); }
    .agent-table .cell-wrap { white-space: normal; word-break: break-word; line-height: 1.5; }
    .col-resizer {
      position: absolute; right: -2px; top: 0; bottom: 0;
      width: 4px; cursor: col-resize; z-index: 1;
    }
    .col-resizer:hover, .col-resizer:active { background: var(--accent); opacity: 0.5; }
    .td-mono { font-variant-numeric: tabular-nums; }

    /* Registration progress bar */
    .reg-bar { display: inline-flex; align-items: center; gap: 6px; }
    .reg-bar-track { width: 50px; height: 6px; background: rgba(255,255,255,.08); border-radius: 3px; overflow: hidden; }
    .reg-bar-fill { height: 100%; transition: width .2s ease, background .2s ease; }
    .reg-bar-label { font-size: 12px; color: var(--text-muted); min-width: 32px; font-variant-numeric: tabular-nums; }

    /* Date range inputs */
    .date-input { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 6px 8px; font-size: 12px; font-family: inherit; }
    .date-input:focus { outline: none; border-color: var(--accent); }
    .date-range { display: flex; align-items: center; gap: 6px; }
    .date-range .date-sep { font-size: 12px; color: var(--text-muted); }

    /* Pagination */
    .pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; font-size: 13px; color: var(--text-muted); }
    .pagination button { background: transparent; border: 1px solid var(--border); color: var(--text-muted); padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; }
    .pagination button:hover:not(:disabled) { border-color: var(--accent); color: var(--text-dark); }
    .pagination button:disabled { opacity: 0.4; cursor: default; }

    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); font-size: 14px; }
    .loading-text { color: var(--text-muted); font-size: 13px; text-align: center; padding: 40px; }

    /* Dashboard */
    .dashboard-section { margin-bottom: 24px; }
    .dashboard-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .dashboard-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .dashboard-subset { font-size: 12px; color: var(--text-muted); }
    .dashboard-subset strong { color: var(--text-dark); font-weight: 700; }
    .collapse-btn { background: transparent; border: 1px solid var(--border); color: var(--text-muted); padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-family: inherit; transition: border-color .15s, color .15s; }
    .collapse-btn:hover { border-color: var(--accent); color: var(--text-dark); }
    .dashboard-section.collapsed .dashboard-body { display: none; }

    .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 16px; }
    .kpi-cell { background: var(--surface); padding: 14px 16px; }
    .kpi-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 6px; }
    .kpi-value { font-size: 24px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
    .kpi-sub { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
    @media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 600px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }

    .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 900px) { .chart-grid { grid-template-columns: 1fr; } }
    .chart-card { background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); padding: 14px 18px 18px; }
    .chart-card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 8px; }
    .chart-canvas-wrap { position: relative; height: 220px; }
    .chart-canvas-wrap.tall { height: 260px; }

    @media (max-width: 768px) {
      .card-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
      .filter-bar { flex-direction: column; }
    }
    @media (max-width: 480px) {
      .card-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">${PRODUCT_NAME}</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Agents</span>
    </div>
    <div class="topbar-right">
      ${themeToggleButton}
    </div>
    <div class="nav-dropdown" id="nav-dropdown">
      <a href="/admin/dashboard" class="nav-item">Dashboard</a>
      <a href="/admin/studies" class="nav-item">Studies</a>
      <a href="/admin/directory" class="nav-item active">Agents</a>
      <a href="/admin/markets" class="nav-item">Markets</a>
      <a href="/admin/schedule" class="nav-item">Schedule</a>
      <div class="nav-divider"></div>
      <a href="/admin/pool-analyzer" class="nav-item">Pool Analyzer</a>
      <a href="/admin/cohort-analyzer" class="nav-item">Cohort Analyzer</a>
      <a href="/admin/markets/new" class="nav-item" style="color:var(--accent)">+ Create Market</a>
    </div>
  </div>

  <div class="main">
    <section id="agent-dashboard" class="dashboard-section">
      <div class="dashboard-header">
        <div style="display:flex;align-items:baseline;gap:14px">
          <span class="dashboard-title">Overview</span>
          <span class="dashboard-subset" id="dashboard-subset">Loading…</span>
        </div>
        <button class="collapse-btn" id="dashboard-collapse" onclick="toggleDashboard()">Hide stats</button>
      </div>
      <div class="dashboard-body">
        <div class="kpi-grid" id="kpi-grid">
          <div class="kpi-cell"><div class="kpi-label">Total agents</div><div class="kpi-value" id="kpi-total">&mdash;</div></div>
          <div class="kpi-cell"><div class="kpi-label">Fully registered</div><div class="kpi-value" id="kpi-registered">&mdash;</div><div class="kpi-sub" id="kpi-registered-pct"></div></div>
          <div class="kpi-cell"><div class="kpi-label">Active 24h</div><div class="kpi-value" id="kpi-24h">&mdash;</div></div>
          <div class="kpi-cell"><div class="kpi-label">Active 7d</div><div class="kpi-value" id="kpi-7d">&mdash;</div></div>
          <div class="kpi-cell"><div class="kpi-label">Median points</div><div class="kpi-value" id="kpi-med-points">&mdash;</div></div>
          <div class="kpi-cell"><div class="kpi-label">Median opinions</div><div class="kpi-value" id="kpi-med-opinions">&mdash;</div></div>
        </div>
        <div class="chart-grid">
          <div class="chart-card">
            <div class="chart-card-title">Registration status</div>
            <div class="chart-canvas-wrap"><canvas id="registration-chart"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-card-title">Agent type × registration</div>
            <div class="chart-canvas-wrap"><canvas id="type-reg-chart"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-card-title">Points balance distribution</div>
            <div class="chart-canvas-wrap"><canvas id="points-dist-chart"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-card-title">Top 10 agents by points</div>
            <div class="chart-canvas-wrap tall"><canvas id="top-points-chart"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-card-title">Activity (last 30 days)</div>
            <div class="chart-canvas-wrap"><canvas id="activity-chart"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-card-title">Opinions per agent</div>
            <div class="chart-canvas-wrap"><canvas id="opinions-dist-chart"></canvas></div>
          </div>
        </div>
      </div>
    </section>

    <div class="filter-bar">
      <div class="filter-group">
        <span class="filter-label">Search</span>
        <input class="search-input" id="filter-search" type="text" placeholder="Agent handle\u2026" oninput="onSearchInput()">
      </div>
      <div class="filter-group">
        <span class="filter-label">Domains</span>
        ${renderCategoryDropdown('domain', DOMAIN_OPTIONS)}
      </div>
      <div class="filter-group">
        <span class="filter-label">Opinion Style</span>
        ${renderCategoryDropdown('style', STYLE_OPTIONS, 'All Styles')}
      </div>
      <div class="filter-group">
        <span class="filter-label">Agent Type</span>
        ${renderCategoryDropdown('type', TYPE_OPTIONS, 'All Types')}
      </div>
      <div class="filter-group">
        <span class="filter-label">Country</span>
        <select class="filter-select" id="filter-country" onchange="applyFilters()">
          <option value="">All</option>
        </select>
      </div>
      <div class="filter-group">
        <span class="filter-label">Activity</span>
        <select class="filter-select" id="filter-activity" onchange="applyFilters()">
          <option value="">All</option>
          <option value="1">24h</option>
          <option value="7">7d</option>
          <option value="30">30d</option>
          <option value="90">90d</option>
        </select>
      </div>
      <div class="filter-group">
        <span class="filter-label">Joined</span>
        <div class="date-range">
          <input type="date" class="date-input" id="filter-joined-from" onchange="applyFilters()" aria-label="Joined from">
          <span class="date-sep">to</span>
          <input type="date" class="date-input" id="filter-joined-to" onchange="applyFilters()" aria-label="Joined to">
        </div>
      </div>
      <div class="filter-group">
        <span class="filter-label">Min Participation</span>
        <select class="filter-select" id="filter-participation" onchange="applyFilters()">
          <option value="">0%</option>
          <option value="0.1">10%</option>
          <option value="0.25">25%</option>
          <option value="0.5">50%</option>
        </select>
      </div>
      <div class="filter-group">
        <span class="filter-label">Sort</span>
        <select class="filter-select" id="filter-sort" onchange="applyFilters()">
          <option value="points_balance">Points</option>
          <option value="total_opinions">Opinions</option>
          <option value="participation_rate">Participation Rate</option>
          <option value="last_active_at">Last Active</option>
          <option value="member_since">Member Since (newest)</option>
          <option value="registration_completed_pct">Registration %</option>
        </select>
      </div>
    </div>

    <div class="view-toggle-bar">
      <div class="view-toggle">
        <button class="view-toggle-btn" data-view="cards" onclick="switchView(&quot;cards&quot;)">Cards</button>
        <button class="view-toggle-btn active" data-view="table" onclick="switchView(&quot;table&quot;)">Table</button>
      </div>
    </div>

    <div id="card-grid" class="card-grid" style="display:none">
      <p class="loading-text">Loading agents&hellip;</p>
    </div>

    <div id="agent-table-wrap" class="agent-table-wrap">
      <table class="agent-table">
        <thead><tr>
          <th style="width:16%"><span>Handle</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>
          <th style="width:9%"><span>Type</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>
          <th style="width:10%"><span>Reg %</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>
          <th style="width:9%"><span>Points</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>
          <th style="width:7%"><span>Opinions</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>
          <th style="width:8%"><span>Particip.</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>
          <th style="width:9%"><span>Style</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>
          <th style="width:13%"><span>Domains</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>
          <th style="width:9%"><span>Country</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>
          <th style="width:10%"><span>Last Active</span></th>
        </tr></thead>
        <tbody id="agent-table-body"></tbody>
      </table>
    </div>

    <div id="pagination" class="pagination" style="display:none"></div>
  </div>

  <script>    var headers = {}
    var allAgents = [];
    var currentPage = 0;
    var CARD_PAGE_SIZE = 12;
    var TABLE_PAGE_SIZE = 50;
    var selectedDomains = [];
    var currentView = 'table';
    var searchQuery = '';
    var searchTimeout = null;
    var totalAgents = 0;
    var countriesLoaded = false;

    function getPageSize() {
      return currentView === 'table' ? TABLE_PAGE_SIZE : CARD_PAGE_SIZE;
    }

    function toggleNav() {
      document.getElementById('nav-dropdown').classList.toggle('open');
    }
    document.addEventListener('click', function(e) {
      var dd = document.getElementById('nav-dropdown');
      var btn = document.querySelector('.hamburger-btn');
      if (dd && !dd.contains(e.target) && !btn.contains(e.target)) dd.classList.remove('open');
    });

    function escHtml(str) {
      var div = document.createElement('div');
      div.textContent = str || '';
      return div.innerHTML;
    }

    function timeAgo(dateStr) {
      if (!dateStr) return 'never';
      var diff = Date.now() - new Date(dateStr).getTime();
      var mins = Math.floor(diff / 60000);
      if (mins < 60) return mins + 'm ago';
      var hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + 'h ago';
      return Math.floor(hrs / 24) + 'd ago';
    }

    function formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }

    function initials(handle) {
      return (handle || '??').slice(0, 2).toUpperCase();
    }

    function typeLabel(t) {
      var map = { personal_assistant: 'Personal Asst', research_agent: 'Research', lifecycle_system: 'System', unknown: 'Unknown' };
      return map[t] || t;
    }

    function styleLabel(s) {
      var map = { contrarian: 'Contrarian', consensus_seeker: 'Consensus', nuanced: 'Nuanced', decisive: 'Decisive', balanced: 'Balanced', unknown: 'Unknown' };
      return map[s] || s;
    }

    function regBarHtml(pct, count, total) {
      var color = pct >= 100 ? 'var(--green)'
                : pct >= 67  ? 'var(--accent)'
                : pct >= 34  ? 'var(--yellow)'
                : 'var(--red)';
      var title = count + ' of ' + total + ' required profile questions answered';
      return '<div class="reg-bar" title="' + title + '">' +
               '<div class="reg-bar-track"><div class="reg-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
               '<span class="reg-bar-label">' + pct + '%</span>' +
             '</div>';
    }

    ${categoryDropdownScript}

    function onSearchInput() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function() {
        searchQuery = document.getElementById('filter-search').value.trim();
        currentPage = 0;
        loadAgents();
        loadDashboard();
      }, 300);
    }

    function switchView(view) {
      currentView = view;
      var btns = document.querySelectorAll('.view-toggle-btn');
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].getAttribute('data-view') === view) btns[i].classList.add('active');
        else btns[i].classList.remove('active');
      }
      currentPage = 0;
      loadAgents();
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

    function applyFilters() {
      currentPage = 0;
      loadAgents();
      loadDashboard();
    }

    function render() {
      var cardGrid = document.getElementById('card-grid');
      var tableWrap = document.getElementById('agent-table-wrap');
      if (currentView === 'cards') {
        cardGrid.style.display = '';
        tableWrap.style.display = 'none';
        renderCardView();
      } else {
        cardGrid.style.display = 'none';
        tableWrap.style.display = '';
        renderTableView();
      }
      renderPagination();
    }

    function renderCardView() {
      var grid = document.getElementById('card-grid');
      if (allAgents.length === 0) {
        grid.innerHTML = '<div class="empty-state">No agents match the current filters</div>';
        return;
      }
      var html = allAgents.map(function(a) {
        var avatarHtml = a.avatar_url
          ? '<img src="' + escHtml(a.avatar_url) + '" alt="" onerror="this.style.display=\\'none\\';this.nextElementSibling.style.display=\\'flex\\'">' +
            '<span style="display:none">' + initials(a.handle) + '</span>'
          : initials(a.handle);
        var tagsHtml = a.domain_tags.map(function(t) { return '<span class="tag-pill">' + escHtml(t) + '</span>'; }).join('');
        var partPct = Math.round(a.participation_rate * 100);

        return '<div class="agent-card" onclick="location.href=\\'/admin/agent/' + a.agent_id + '\\'">' +
          '<div class="card-top">' +
            '<div class="card-identity">' +
              '<div class="card-avatar">' + avatarHtml + '</div>' +
              '<span class="card-handle">' + escHtml(a.handle) + '</span>' +
            '</div>' +
            '<span class="type-pill type-' + a.derived_agent_type + '">' + typeLabel(a.derived_agent_type) + '</span>' +
          '</div>' +
          '<div class="card-points">' + (a.points_balance || 0).toLocaleString() + ' <span class="pts-label">pts</span></div>' +
          '<div class="card-meta">Member since ' + formatDate(a.member_since) + (a.location_country ? ' &middot; ' + escHtml(a.location_country) + (a.location_region ? ', ' + escHtml(a.location_region) : '') : '') + '</div>' +
          '<div class="card-stats">' + a.total_opinions + ' opinions &middot; ' + partPct + '% particip. &middot; ' + (a.registration_completed_pct || 0) + '% reg.</div>' +
          (tagsHtml ? '<div class="card-tags">' + tagsHtml + '</div>' : '') +
          '<div class="card-style">' +
            (a.opinion_style !== 'unknown' ? a.opinion_style_score + '% ' + a.opinion_style + ' &middot; ' : '') +
            '<span class="style-label">' + styleLabel(a.opinion_style) + '</span>' +
          '</div>' +
          '<div class="card-meta" style="margin-top:6px">Last active: ' + timeAgo(a.last_active_at) + '</div>' +
        '</div>';
      }).join('');
      grid.innerHTML = html;
    }

    function renderTableView() {
      var tbody = document.getElementById('agent-table-body');
      if (allAgents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted)">No agents match the current filters</td></tr>';
        return;
      }
      var html = allAgents.map(function(a) {
        var partPct = Math.round(a.participation_rate * 100);
        var tagsHtml = a.domain_tags.map(function(t) {
          return '<span class="tag-pill">' + escHtml(t) + '</span>';
        }).join(' ');
        var regPct = a.registration_completed_pct || 0;
        var regCount = a.registration_answers_count || 0;
        var regTotal = a.registration_total_questions || 0;
        return '<tr onclick="location.href=\\'/admin/agent/' + a.agent_id + '\\'">' +
          '<td><strong style="color:var(--text-dark)">' + escHtml(a.handle) + '</strong></td>' +
          '<td><span class="type-pill type-' + a.derived_agent_type + '">' + typeLabel(a.derived_agent_type) + '</span></td>' +
          '<td>' + regBarHtml(regPct, regCount, regTotal) + '</td>' +
          '<td class="td-mono">' + (a.points_balance || 0).toLocaleString() + '</td>' +
          '<td class="td-mono">' + a.total_opinions + '</td>' +
          '<td class="td-mono">' + partPct + '%</td>' +
          '<td><span class="style-label">' + styleLabel(a.opinion_style) + '</span></td>' +
          '<td class="cell-wrap">' + tagsHtml + '</td>' +
          '<td>' + escHtml(a.location_country || '') + '</td>' +
          '<td style="color:var(--text-muted)">' + timeAgo(a.last_active_at) + '</td>' +
        '</tr>';
      }).join('');
      tbody.innerHTML = html;
    }

    function renderPagination() {
      var pageSize = getPageSize();
      var totalPages = Math.ceil(totalAgents / pageSize);
      var pagEl = document.getElementById('pagination');
      if (totalPages <= 1) { pagEl.style.display = 'none'; return; }
      var start = currentPage * pageSize + 1;
      var end = Math.min((currentPage + 1) * pageSize, totalAgents);
      pagEl.style.display = 'flex';
      pagEl.innerHTML =
        '<span>Showing ' + start + '\\u2013' + end + ' of ' + totalAgents + '</span>' +
        '<div style="display:flex;gap:8px">' +
          '<button onclick="setPage(' + (currentPage - 1) + ')"' + (currentPage === 0 ? ' disabled' : '') + '>\\u2039 Prev</button>' +
          '<span style="padding:6px 0">Page ' + (currentPage + 1) + ' of ' + totalPages + '</span>' +
          '<button onclick="setPage(' + (currentPage + 1) + ')"' + (currentPage >= totalPages - 1 ? ' disabled' : '') + '>Next \\u203a</button>' +
        '</div>';
    }

    function setPage(page) {
      currentPage = page;
      loadAgents();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function getFilterParams() {
      var params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedDomains.length) params.set('domain', selectedDomains[0]);
      var styleSel = catSelections['style'] || [];
      if (styleSel.length) params.set('style', styleSel[0]);
      var typeSel = catSelections['type'] || [];
      if (typeSel.length) params.set('type', typeSel[0]);
      var country = document.getElementById('filter-country').value;
      if (country) params.set('country', country);
      var activity = document.getElementById('filter-activity').value;
      if (activity) params.set('active_days', activity);
      var minPart = document.getElementById('filter-participation').value;
      if (minPart) params.set('min_participation', minPart);
      var joinedFrom = document.getElementById('filter-joined-from').value;
      if (joinedFrom) params.set('member_since_from', joinedFrom);
      var joinedTo = document.getElementById('filter-joined-to').value;
      if (joinedTo) {
        // Make the "to" date exclusive of the next day so a user selecting May 31 includes all of May 31
        var d = new Date(joinedTo + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() + 1);
        params.set('member_since_to', d.toISOString().slice(0, 10));
      }
      return params;
    }

    async function loadAgents() {
      try {
        var params = getFilterParams();
        var sort = document.getElementById('filter-sort').value;
        if (sort) params.set('sort', sort);

        var pageSize = getPageSize();
        params.set('limit', String(pageSize));
        params.set('offset', String(currentPage * pageSize));

        var res = await fetch('/admin/analytics/classifications?' + params.toString(), { headers: headers });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();

        allAgents = data.agents || [];
        totalAgents = data.total || 0;

        // Populate country filter once
        if (!countriesLoaded && data.countries && data.countries.length) {
          var countrySelect = document.getElementById('filter-country');
          data.countries.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            countrySelect.appendChild(opt);
          });
          countriesLoaded = true;
        }

        render();
      } catch(e) {
        document.getElementById('card-grid').innerHTML = '<div class="empty-state">Failed to load agents: ' + e.message + '</div>';
      }
    }

    // ── Dashboard ──────────────────────────────────────────────────
    Chart.register(ChartDataLabels);
    var dashboardCharts = {};
    var dashboardLoadToken = 0;

    function getChartColors() {
      var s = getComputedStyle(document.documentElement);
      return {
        text: (s.getPropertyValue('--text-muted') || '#78716c').trim(),
        textDark: (s.getPropertyValue('--text-dark') || '#fafaf9').trim(),
        border: (s.getPropertyValue('--border') || '#3d3533').trim(),
        accent: (s.getPropertyValue('--accent') || '#2dd4a0').trim(),
        green: (s.getPropertyValue('--green') || '#2dd4a0').trim(),
        yellow: (s.getPropertyValue('--yellow') || '#f59e0b').trim(),
        red: (s.getPropertyValue('--red') || '#e87461').trim(),
        blue: '#60a5fa',
        purple: '#a78bfa',
      };
    }

    function destroyChart(key) {
      if (dashboardCharts[key]) { dashboardCharts[key].destroy(); dashboardCharts[key] = null; }
    }

    function fmtTypeLabel(t) { return typeLabel(t); }

    function renderRegistrationChart(reg) {
      destroyChart('registration');
      var c = getChartColors();
      var ctx = document.getElementById('registration-chart').getContext('2d');
      dashboardCharts.registration = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Fully registered', 'Partial', 'Not started'],
          datasets: [{
            data: [reg.full, reg.partial, reg.none],
            backgroundColor: [c.green, c.yellow, c.red],
            borderColor: 'transparent',
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '60%',
          plugins: {
            legend: { position: 'bottom', labels: { color: c.text, boxWidth: 12, padding: 12, font: { size: 11 } } },
            datalabels: {
              color: c.textDark,
              font: { size: 11, weight: 'bold' },
              formatter: function(value, ctx) {
                var total = ctx.dataset.data.reduce(function(a,b){return a+b;}, 0);
                if (!total || !value) return '';
                return Math.round(value/total*100) + '%';
              }
            }
          }
        }
      });
    }

    function renderTypeRegChart(rows) {
      destroyChart('typeReg');
      var c = getChartColors();
      var labels = rows.map(function(r) { return fmtTypeLabel(r.type); });
      var ctx = document.getElementById('type-reg-chart').getContext('2d');
      dashboardCharts.typeReg = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            { label: 'Fully registered', data: rows.map(function(r){return r.full;}), backgroundColor: c.green, stack: 's' },
            { label: 'Partial', data: rows.map(function(r){return r.partial;}), backgroundColor: c.yellow, stack: 's' },
            { label: 'Not started', data: rows.map(function(r){return r.none;}), backgroundColor: c.red, stack: 's' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { stacked: true, ticks: { color: c.text, font: { size: 10 } }, grid: { display: false }, border: { color: c.border } },
            y: { stacked: true, ticks: { color: c.text, font: { size: 10 }, precision: 0 }, grid: { color: c.border + '40' }, border: { display: false } }
          },
          plugins: {
            legend: { position: 'bottom', labels: { color: c.text, boxWidth: 12, padding: 12, font: { size: 11 } } },
            datalabels: { display: false }
          }
        }
      });
    }

    function renderBucketBar(canvasId, key, rows, color, formatLabel) {
      destroyChart(key);
      var c = getChartColors();
      var ctx = document.getElementById(canvasId).getContext('2d');
      dashboardCharts[key] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: rows.map(function(r) { return r.bucket; }),
          datasets: [{ data: rows.map(function(r) { return r.count; }), backgroundColor: color, borderRadius: 3 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: c.text, font: { size: 10 } }, grid: { display: false }, border: { color: c.border } },
            y: { ticks: { color: c.text, font: { size: 10 }, precision: 0 }, grid: { color: c.border + '40' }, border: { display: false } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: function(items) { return (formatLabel ? formatLabel(items[0].label) : items[0].label); },
                label: function(item) { return item.parsed.y + ' agents'; }
              }
            },
            datalabels: {
              color: c.textDark,
              anchor: 'end', align: 'end', offset: -2,
              font: { size: 10, weight: 'bold' },
              formatter: function(value) { return value > 0 ? value : ''; }
            }
          }
        }
      });
    }

    function renderTopPointsChart(rows) {
      destroyChart('topPoints');
      var c = getChartColors();
      var ctx = document.getElementById('top-points-chart').getContext('2d');
      dashboardCharts.topPoints = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: rows.map(function(r) { return r.handle; }),
          datasets: [{ data: rows.map(function(r) { return r.points_balance; }), backgroundColor: c.accent, borderRadius: 3 }]
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: c.text, font: { size: 10 }, precision: 0 }, grid: { color: c.border + '40' }, border: { display: false } },
            y: { ticks: { color: c.text, font: { size: 11 } }, grid: { display: false }, border: { color: c.border } }
          },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: function(item) { return item.parsed.x.toLocaleString() + ' pts'; } } },
            datalabels: {
              color: c.textDark, anchor: 'end', align: 'end', offset: 4,
              font: { size: 10, weight: 'bold' },
              formatter: function(value) { return value > 0 ? value.toLocaleString() : ''; }
            }
          }
        }
      });
    }

    function fillActivityGaps(rows, days) {
      var map = {};
      for (var i = 0; i < rows.length; i++) map[rows[i].day] = rows[i];
      var end = new Date(); end.setHours(0,0,0,0);
      var start = new Date(end); start.setDate(start.getDate() - (days - 1));
      var out = [];
      var d = new Date(start);
      while (d <= end) {
        var key = d.toISOString().slice(0, 10);
        out.push(map[key] || { day: key, new_agents: 0, returning_agents: 0 });
        d.setDate(d.getDate() + 1);
      }
      return out;
    }

    function renderActivityChart(rows) {
      destroyChart('activity');
      var c = getChartColors();
      var filled = fillActivityGaps(rows || [], 30);
      var labels = filled.map(function(r) {
        var parts = r.day.split('-');
        return parseInt(parts[1]) + '/' + parseInt(parts[2]);
      });
      var ctx = document.getElementById('activity-chart').getContext('2d');
      dashboardCharts.activity = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'New', data: filled.map(function(r){return r.new_agents;}), borderColor: c.blue, backgroundColor: c.blue + '33', tension: 0.3, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
            { label: 'Returning', data: filled.map(function(r){return r.returning_agents;}), borderColor: c.green, backgroundColor: c.green + '33', tension: 0.3, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { ticks: { color: c.text, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }, grid: { display: false }, border: { color: c.border } },
            y: { ticks: { color: c.text, font: { size: 10 }, precision: 0 }, grid: { color: c.border + '40' }, border: { display: false } }
          },
          plugins: {
            legend: { position: 'bottom', labels: { color: c.text, boxWidth: 12, padding: 12, font: { size: 11 } } },
            datalabels: { display: false }
          }
        }
      });
    }

    async function loadDashboard() {
      var myToken = ++dashboardLoadToken;
      try {
        var url = '/admin/analytics/agent-dashboard?' + getFilterParams().toString();
        var res = await fetch(url, { headers: headers });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var d = await res.json();
        // Drop stale responses
        if (myToken !== dashboardLoadToken) return;

        document.getElementById('kpi-total').textContent = d.kpis.total.toLocaleString();
        document.getElementById('kpi-registered').textContent = d.kpis.fully_registered.toLocaleString();
        document.getElementById('kpi-registered-pct').textContent = d.kpis.fully_registered_pct + '%';
        document.getElementById('kpi-24h').textContent = d.kpis.active_24h.toLocaleString();
        document.getElementById('kpi-7d').textContent = d.kpis.active_7d.toLocaleString();
        document.getElementById('kpi-med-points').textContent = d.kpis.median_points.toLocaleString();
        document.getElementById('kpi-med-opinions').textContent = d.kpis.median_opinions.toLocaleString();

        var subsetEl = document.getElementById('dashboard-subset');
        if (totalAgents && d.kpis.total !== totalAgents) {
          subsetEl.innerHTML = 'Showing stats for <strong>' + d.kpis.total + '</strong> of ' + totalAgents + ' agents matching current filters';
        } else {
          subsetEl.innerHTML = '<strong>' + d.kpis.total + '</strong> agents';
        }

        renderRegistrationChart(d.registration);
        renderTypeRegChart(d.type_by_registration);
        renderBucketBar('points-dist-chart', 'pointsDist', d.points_distribution, getChartColors().accent);
        renderTopPointsChart(d.top_points);
        renderActivityChart(d.activity_timeseries);
        renderBucketBar('opinions-dist-chart', 'opinionsDist', d.opinions_distribution, getChartColors().purple);
      } catch (e) {
        document.getElementById('dashboard-subset').textContent = 'Failed to load: ' + e.message;
      }
    }

    function toggleDashboard() {
      var section = document.getElementById('agent-dashboard');
      var btn = document.getElementById('dashboard-collapse');
      var collapsed = section.classList.toggle('collapsed');
      btn.textContent = collapsed ? 'Show stats' : 'Hide stats';
      try { localStorage.setItem('agent-dashboard-collapsed', collapsed ? '1' : '0'); } catch(e) {}
    }

    (function initDashboardCollapse() {
      try {
        if (localStorage.getItem('agent-dashboard-collapsed') === '1') {
          document.getElementById('agent-dashboard').classList.add('collapsed');
          document.getElementById('dashboard-collapse').textContent = 'Show stats';
        }
      } catch(e) {}
    })();

    loadAgents();
    loadDashboard();
    ${themeScript}
  </script>
</body>
</html>`;
}
