import { themeCSS, themeToggleButton, themeScript } from './theme.js';

export function renderLoginPage(error?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1a1816;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #a8a29e;
    }
    .login-wrap { width: 100%; max-width: 400px; padding: 24px; }
    .login-logo {
      text-align: center;
      margin-bottom: 24px;
      font-size: 13px;
      font-weight: 600;
      color: #78716c;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .login-card {
      background: #292524;
      border-radius: 8px;
      box-shadow: 0 7px 14px 0 rgba(0,0,0,.25), 0 3px 6px 0 rgba(0,0,0,.15);
      padding: 40px;
    }
    .login-card h1 { font-size: 20px; font-weight: 600; color: #fafaf9; margin-bottom: 6px; }
    .login-card p { font-size: 14px; color: #78716c; margin-bottom: 24px; }
    .error {
      background: rgba(232,116,97,.1);
      border: 1px solid rgba(232,116,97,.2);
      border-radius: 4px;
      color: #e87461;
      font-size: 13px;
      padding: 10px 12px;
      margin-bottom: 16px;
    }
    label { display: block; font-size: 13px; font-weight: 500; color: #a8a29e; margin-bottom: 6px; }
    input[type="password"] {
      width: 100%;
      padding: 10px 12px;
      font-size: 14px;
      border: 1px solid #3d3533;
      border-radius: 4px;
      color: #fafaf9;
      background: #1c1917;
      outline: none;
      transition: border-color .15s, box-shadow .15s;
      margin-bottom: 16px;
    }
    input[type="password"]:focus {
      border-color: #2dd4a0;
      box-shadow: 0 0 0 3px rgba(45,212,160,.15);
    }
    button[type="submit"] {
      width: 100%;
      padding: 10px;
      background: #2dd4a0;
      color: #18181b;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s;
    }
    button[type="submit"]:hover { background: #22b888; }
    [data-theme="light"] body { background: #f4f4f5; color: #52525b; }
    [data-theme="light"] .login-logo { color: #a1a1aa; }
    [data-theme="light"] .login-card { background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    [data-theme="light"] .login-card h1 { color: #18181b; }
    [data-theme="light"] .login-card p { color: #a1a1aa; }
    [data-theme="light"] label { color: #52525b; }
    [data-theme="light"] input[type="password"] { background: #f4f4f5; border-color: #e4e4e7; color: #18181b; }
    [data-theme="light"] input[type="password"]:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
    [data-theme="light"] button[type="submit"] { background: #10b981; }
    [data-theme="light"] button[type="submit"]:hover { background: #059669; }
    .theme-toggle-login {
      position: fixed; top: 16px; right: 16px;
      background: transparent; border: 1px solid #3d3533; border-radius: 6px;
      width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #78716c; transition: color .15s, border-color .15s;
    }
    .theme-toggle-login:hover { color: #fafaf9; border-color: #78716c; }
    [data-theme="light"] .theme-toggle-login { border-color: #e4e4e7; color: #a1a1aa; }
    [data-theme="light"] .theme-toggle-login:hover { color: #18181b; border-color: #52525b; }
    .theme-toggle-login svg { width: 18px; height: 18px; }
    .theme-toggle-login .icon-sun { display: none; }
    .theme-toggle-login .icon-moon { display: block; }
    [data-theme="light"] .theme-toggle-login .icon-sun { display: block; }
    [data-theme="light"] .theme-toggle-login .icon-moon { display: none; }
  </style>
</head>
<body>
  <button class="theme-toggle-login" onclick="toggleTheme()" title="Toggle light/dark mode">
    <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
  </button>
  <div class="login-wrap">
    <div class="login-logo">Thought Platform</div>
    <div class="login-card">
      <h1>Admin Dashboard</h1>
      <p>Sign in with your admin API key to continue.</p>
      ${error ? `<div class="error">${error}</div>` : ''}
      <form method="POST" action="/admin/dashboard">
        <label for="key">Admin API Key</label>
        <input type="password" id="key" name="key" placeholder="Enter your admin key" required autofocus />
        <button type="submit">Continue</button>
      </form>
    </div>
  </div>
  <script>
    function toggleTheme() {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch(e) {}
    }
    (function() {
      var saved = null;
      try { saved = localStorage.getItem('theme'); } catch(e) {}
      if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
    })();
  </script>
</body>
</html>`;
}

export function renderDashboard(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — Admin</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
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
      --yellow: #f59e0b;
      --yellow-bg: rgba(245,158,11,.1);
      --red: #e87461;
      --red-bg: rgba(232,116,97,.1);
    }
    ${themeCSS}
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* Topbar */
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
    .topbar-wordmark {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-dark);
      letter-spacing: -0.01em;
    }
    .topbar-divider { width: 1px; height: 18px; background: var(--border); }
    .topbar-subtitle { font-size: 13px; color: var(--text-muted); }
    .topbar-right { display: flex; align-items: center; gap: 16px; }
    .countdown { font-size: 12px; color: var(--text-muted); }
    .btn-refresh {
      background: var(--accent);
      color: #18181b;
      border: none;
      border-radius: 4px;
      padding: 7px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s;
    }
    .btn-refresh:hover { background: #22b888; }

    /* Main layout */
    .main { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }

    /* Cards */
    .card {
      background: var(--surface);
      border-radius: 8px;
      box-shadow: var(--shadow);
      overflow: hidden;
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

    /* Grid */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .grid-full { margin-bottom: 20px; }
    @media (max-width: 700px) { .grid-2 { grid-template-columns: 1fr; } }

    /* Funnel cards grid */
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    @media (max-width: 900px) { .grid-3 { grid-template-columns: 1fr; } }
    .funnel-card {
      background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 16px;
      text-decoration: none; color: inherit; transition: border-color .15s, box-shadow .15s; display: block;
    }
    .funnel-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(45,212,160,.12); }
    .funnel-name { font-size: 15px; font-weight: 600; color: var(--text-dark); margin-bottom: 4px; }
    .funnel-goal { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .progress-bar { background: var(--border); border-radius: 3px; height: 6px; overflow: hidden; margin-bottom: 8px; }
    .progress-fill { height: 100%; border-radius: 3px; transition: width .3s; }
    .progress-fill-p1 { background: var(--accent); }
    .progress-fill-p2 { background: var(--yellow); }
    .progress-fill-p3 { background: var(--green); }
    .funnel-stats { display: flex; gap: 12px; font-size: 12px; color: var(--text-muted); }
    .funnel-stat-value { font-weight: 700; color: var(--text-dark); }
    .pill-stage { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 3px; letter-spacing: 0.04em; }
    .pill-stage-1 { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
    .pill-stage-2 { background: var(--accent-light); color: var(--accent); }
    .pill-stage-3 { background: var(--yellow-bg); color: var(--yellow); }
    .pill-stage-4 { background: rgba(251,146,60,.1); color: #fb923c; }
    .pill-stage-5 { background: var(--green-bg); color: var(--green); }

    /* KPI stat grid inside Overview card */
    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
    .kpi-cell { background: var(--surface); padding: 16px 18px; }
    .kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 6px; }
    .kpi-value { font-size: 30px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.02em; line-height: 1; }
    .pills { display: flex; gap: 6px; margin-top: 16px; }
    .pill {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 4px;
      letter-spacing: 0.02em;
    }
    .pill-open { background: var(--green-bg); color: var(--green); }
    .pill-closed { background: var(--yellow-bg); color: var(--yellow); }
    .pill-resolved { background: var(--accent-light); color: var(--accent); }
    .pill-scheduled { background: rgba(167,139,250,.12); color: #a78bfa; }

    /* Mini-stat grids (Activity card) */
    .section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 12px; }
    .mini-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; }
    .mini-grid:last-child { margin-bottom: 0; }
    .mini-cell { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px; }
    .mini-value { font-size: 22px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.01em; line-height: 1; margin-bottom: 4px; }
    .mini-label { font-size: 11px; color: var(--text-muted); }

    /* Table */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      padding: 0 16px 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      transition: color .15s;
    }
    thead th:first-child { padding-left: 20px; }
    thead th:last-child { padding-right: 20px; }
    thead th:hover { color: var(--text-dark); }
    thead th.sorted { color: var(--accent); }
    tbody td {
      padding: 13px 16px;
      font-size: 13px;
      color: var(--text);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    tbody td:first-child { padding-left: 20px; }
    tbody td:last-child { padding-right: 20px; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: var(--bg); }
    .td-rank { color: var(--text-muted); font-size: 12px; }
    .td-handle { font-weight: 600; color: var(--text-dark); }
    .td-mono { font-variant-numeric: tabular-nums; }
    .td-muted { color: var(--text-muted); font-size: 12px; }
    .empty-row td { text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px; }
    .loading-text { color: var(--text-muted); font-size: 13px; padding: 20px 0; }
    .td-question { white-space: normal; max-width: 320px; font-weight: 500; color: var(--text-dark); }
    .td-majority { white-space: normal; max-width: 200px; font-size: 13px; }
    .td-truncate { cursor: help; }
    .pill-binary { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
    .pill-single_choice { background: rgba(45,212,160,.1); color: var(--accent); }
    .pill-multi_choice { background: rgba(59,130,246,.1); color: #3b82f6; }
    .pill-ranking { background: rgba(245,158,11,.1); color: #f59e0b; }
    .pill-scale { background: rgba(236,72,153,.1); color: #ec4899; }
    .pill-longform { background: rgba(167,139,250,.1); color: #a78bfa; }
    .pill-human { background: rgba(45,212,160,.1); color: var(--accent); }
    .pill-e2e { background: rgba(167,139,250,.1); color: #a78bfa; }
    .pill-system { background: var(--green-bg); color: var(--green); }
    .pill-untagged { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
    .pill-filter { border: 1px solid var(--border); background: transparent; color: var(--text-muted); transition: all .15s; }
    .pill-filter:hover { border-color: var(--text); color: var(--text); }
    .pill-filter-active { background: var(--accent-light); color: var(--accent); border-color: var(--accent); }
    .pill-filter-system.pill-filter-active { background: var(--green-bg); color: var(--green); border-color: var(--green); }
    .pill-filter-admin.pill-filter-active { background: var(--yellow-bg); color: var(--yellow); border-color: var(--yellow); }
    .pill-filter-agent.pill-filter-active { background: rgba(167,139,250,.12); color: #a78bfa; border-color: #a78bfa; }
    .type-select {
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px;
      border: 1px solid var(--border); background: var(--surface); color: var(--text-dark);
      cursor: pointer; appearance: none; -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%2378716c'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 6px center; padding-right: 18px;
    }
    .type-select:hover { border-color: var(--accent); }

    /* Hamburger nav */
    .hamburger-btn {
      background: none; border: none; color: var(--text-dark); font-size: 20px;
      cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background .15s; line-height: 1;
    }
    .hamburger-btn:hover { background: var(--bg); }
    .nav-dropdown {
      position: absolute; top: 56px; left: 0; background: var(--surface);
      border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 0;
      box-shadow: 0 8px 24px rgba(0,0,0,.4); min-width: 220px;
      display: none; flex-direction: column; z-index: 200;
    }
    .nav-dropdown.open { display: flex; }
    .nav-item {
      padding: 12px 20px; font-size: 14px; color: var(--text);
      text-decoration: none; transition: background .15s, color .15s;
    }
    .nav-item:hover { background: var(--bg); color: var(--text-dark); }
    .nav-item.active { color: var(--accent); font-weight: 600; }
    .nav-divider { height: 1px; background: var(--border); margin: 4px 0; }

    /* Collapsible sections */
    .card-header-collapsible { cursor: pointer; transition: background .15s; user-select: none; }
    .card-header-collapsible:hover { background: var(--bg); }
    .collapse-icon { display: inline-block; width: 16px; height: 16px; margin-left: 8px; transition: transform .25s ease; flex-shrink: 0; }
    .collapse-icon svg { display: block; }
    .card-collapsible .collapsible-content { max-height: 5000px; overflow: hidden; transition: max-height .3s ease, opacity .25s ease; opacity: 1; }
    .card-collapsible.collapsed .collapsible-content { max-height: 0; opacity: 0; }
    .card-collapsible.collapsed .card-header { border-bottom-color: transparent; }
    .card-collapsible.collapsed .collapse-icon { transform: rotate(-90deg); }

    /* Masonry grid */
    .masonry { columns: 3; column-gap: 16px; }
    @media (max-width: 900px) { .masonry { columns: 2; } }
    @media (max-width: 600px) { .masonry { columns: 1; } }
    .brick {
      break-inside: avoid;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 16px;
      display: block;
      text-decoration: none;
      color: inherit;
      transition: border-color .15s, box-shadow .15s;
    }
    .brick-open {
      background: var(--green-bg);
      border-color: rgba(45,212,160,.35);
    }
    .brick-scheduled {
      background: var(--yellow-bg);
      border-color: rgba(245,158,11,.35);
    }
    .brick:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(45,212,160,.12); }
    .brick-question { font-size: 14px; font-weight: 600; color: var(--text-dark); margin-bottom: 10px; line-height: 1.4; }
    .brick-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .brick-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .brick-participants { font-size: 12px; color: var(--text-muted); }
    .brick-participants strong { color: var(--text-dark); }
    .brick-progress-label { font-size: 11px; color: var(--text-muted); }
    .brick-theme { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 3px; background: rgba(167,139,250,.1); color: #a78bfa; }
    .brick-theme-bridge { background: rgba(245,158,11,.1); color: #f59e0b; }
    .brick-theme-fun { background: rgba(232,116,97,.1); color: #e87461; }
    .masonry-empty { text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px; }
    /* Review queue */
    .review-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .review-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .review-card-question { font-size: 14px; font-weight: 600; color: var(--text-dark); line-height: 1.4; flex: 1; }
    .review-card-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .review-card-desc { font-size: 13px; color: var(--text); margin-bottom: 12px; line-height: 1.4; }
    .review-card-footer { display: flex; justify-content: space-between; align-items: center; }
    .review-card-info { font-size: 12px; color: var(--text-muted); }
    .review-actions { display: flex; gap: 8px; }
    .btn-approve { background: var(--green-bg); color: var(--green); border: 1px solid var(--green); padding: 6px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-approve:hover { background: var(--green); color: #fff; }
    .btn-reject { background: var(--red-bg); color: var(--red); border: 1px solid var(--red); padding: 6px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-reject:hover { background: var(--red); color: #fff; }
    .review-empty { text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px; }
  </style>
</head>
<body>

  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Admin Dashboard</span>
    </div>
    <div class="topbar-right">
      <span class="countdown" id="countdown"></span>
      <button class="btn-refresh" onclick="refresh()">Refresh</button>
      ${themeToggleButton}
    </div>
    <div class="nav-dropdown" id="nav-dropdown">
      <a href="/admin/dashboard" class="nav-item active">Dashboard</a>
      <a href="/admin/studies" class="nav-item">Studies</a>
      <a href="/admin/directory" class="nav-item">Agents</a>
      <a href="/admin/markets" class="nav-item">Markets</a>
      <a href="/admin/schedule" class="nav-item">Schedule</a>
      <div class="nav-divider"></div>
      <a href="/admin/pool-analyzer" class="nav-item">Pool Analyzer</a>
      <a href="/admin/cohort-analyzer" class="nav-item">Cohort Analyzer</a>
      <div class="nav-divider"></div>
      <a href="/admin/longform-queue" class="nav-item">Longform Review</a>
      <a href="/admin/markets/new" class="nav-item" style="color:var(--accent)">+ Create Market</a>
    </div>
  </div>

  <div class="main">

    <div class="grid-2">
      <!-- Platform Overview -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Platform Overview</span>
        </div>
        <div class="card-body">
          <div id="overview"><p class="loading-text">Loading&hellip;</p></div>
        </div>
      </div>

      <!-- Activity & Retention -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Activity &amp; Retention</span>
        </div>
        <div class="card-body">
          <div id="activity"><p class="loading-text">Loading&hellip;</p></div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid-2">
      <!-- Points Distribution -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Points Distribution</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <label style="font-size:11px;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;gap:4px;">
              <input type="checkbox" id="points-labels-toggle"> Labels
            </label>
            <select id="points-range" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:4px;padding:2px 6px;font-size:11px;">
              <option value="7">7 days</option>
              <option value="30" selected>30 days</option>
              <option value="90">90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
        <div class="card-body" style="padding:12px;">
          <canvas id="points-chart" height="240"></canvas>
        </div>
      </div>

      <!-- Agent Activity -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Agent Activity</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <label style="font-size:11px;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;gap:4px;">
              <input type="checkbox" id="activity-labels-toggle"> Labels
            </label>
            <select id="activity-range" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:4px;padding:2px 6px;font-size:11px;">
              <option value="7">7 days</option>
              <option value="30" selected>30 days</option>
              <option value="90">90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
        <div class="card-body" style="padding:12px;">
          <canvas id="activity-chart" height="240"></canvas>
        </div>
      </div>
    </div>

    <!-- Review Queue -->
    <div class="grid-full" id="review-queue-section" style="display:none">
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;gap:12px">
          <span class="card-title">Review Queue</span>
          <span class="pill" style="background:var(--yellow-bg);color:var(--yellow)" id="review-count-pill">0 pending</span>
        </div>
        <div class="card-body">
          <div id="review-queue"><p class="loading-text">Loading&hellip;</p></div>
        </div>
      </div>
    </div>

    <!-- Current Markets (masonry) -->
    <div class="grid-full">
      <div class="card card-collapsible collapsed">
        <div class="card-header card-header-collapsible" onclick="toggleSection('current-markets-wrap')">
          <span class="card-title">Current Markets</span>
          <span class="collapse-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4,6 8,10 12,6"/></svg></span>
        </div>
        <div class="collapsible-content" id="current-markets-wrap">
          <div class="card-body">
            <div id="current-markets"><p class="loading-text">Loading&hellip;</p></div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <script>    const REFRESH_INTERVAL = 60;
    let countdown = REFRESH_INTERVAL;
    const headers = {}

    function toggleNav() {
      document.getElementById('nav-dropdown').classList.toggle('open');
    }
    document.addEventListener('click', function(e) {
      var dd = document.getElementById('nav-dropdown');
      var btn = document.querySelector('.hamburger-btn');
      if (dd && !dd.contains(e.target) && !btn.contains(e.target)) dd.classList.remove('open');
    });

    async function fetchData(endpoint) {
      const res = await fetch(endpoint, { headers });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }

    function renderOverview(data) {
      document.getElementById('overview').innerHTML =
        '<div class="kpi-grid">' +
          '<div class="kpi-cell"><div class="kpi-label">Agents</div><div class="kpi-value">' + data.total_agents + '</div></div>' +
          '<div class="kpi-cell"><div class="kpi-label">Markets</div><div class="kpi-value">' + data.total_markets.total + '</div></div>' +
          '<div class="kpi-cell"><div class="kpi-label">Opinions</div><div class="kpi-value">' + data.total_opinions + '</div></div>' +
          '<div class="kpi-cell"><div class="kpi-label">Points Out</div><div class="kpi-value">' + data.total_points_distributed + '</div></div>' +
        '</div>' +
        '<div class="pills">' +
          '<span class="pill pill-open">' + (data.total_markets.open || 0) + ' open</span>' +
          '<span class="pill pill-closed">' + (data.total_markets.closed || 0) + ' closed</span>' +
          '<span class="pill pill-resolved">' + (data.total_markets.resolved || 0) + ' resolved</span>' +
        '</div>';
    }

    function renderActivity(data) {
      var r = data.retention;
      var total = r.total || 1;
      var pct24h = Math.round(r.active_24h / total * 100);
      var pct7d = Math.round(r.active_7d / total * 100);
      var pctOlder = 100 - pct24h - pct7d;
      document.getElementById('activity').innerHTML =
        '<div class="section-label">Opinions</div>' +
        '<div class="mini-grid">' +
          '<div class="mini-cell"><div class="mini-value">' + data.recent_activity.opinions_24h + '</div><div class="mini-label">Last 24h</div></div>' +
          '<div class="mini-cell"><div class="mini-value">' + data.recent_activity.opinions_7d + '</div><div class="mini-label">Last 7 days</div></div>' +
          '<div class="mini-cell"><div class="mini-value">' + data.recent_activity.new_agents_7d + '</div><div class="mini-label">New agents (7d)</div></div>' +
        '</div>' +
        '<div class="section-label">Retention</div>' +
        '<div class="mini-grid">' +
          '<div class="mini-cell"><div class="mini-value">' + r.active_24h + '</div><div class="mini-label">Last 24h \u00b7 ' + pct24h + '%</div></div>' +
          '<div class="mini-cell"><div class="mini-value">' + r.active_7d + '</div><div class="mini-label">Last 7 days \u00b7 ' + pct7d + '%</div></div>' +
          '<div class="mini-cell"><div class="mini-value">' + r.older_or_inactive + '</div><div class="mini-label">7+ days \u00b7 ' + pctOlder + '%</div></div>' +
        '</div>';
    }

    function toggleSection(id) {
      var content = document.getElementById(id);
      if (content) content.closest('.card').classList.toggle('collapsed');
    }

    function escHtml(str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function renderCurrentMarkets(data) {
      var active = data.markets.filter(function(m) {
        return m.status === 'open' || m.status === 'scheduled';
      });
      if (!active.length) {
        document.getElementById('current-markets').innerHTML =
          '<div class="masonry-empty">No open or scheduled markets</div>';
        return;
      }
      active.sort(function(a, b) {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
        return (a.deadline || '').localeCompare(b.deadline || '');
      });
      var categoryColors = {
        technology_innovation: { bg: 'rgba(56,189,248,.1)', fg: '#38bdf8' },
        society_culture:       { bg: 'rgba(251,146,60,.1)', fg: '#fb923c' },
        economics_markets:     { bg: 'rgba(45,212,160,.1)', fg: '#2dd4a0' },
        philosophy_ethics:     { bg: 'rgba(167,139,250,.1)', fg: '#a78bfa' },
        self_identity:         { bg: 'rgba(244,114,182,.1)', fg: '#f472b6' },
        fashion_trends:        { bg: 'rgba(251,191,36,.1)', fg: '#fbbf24' },
        meta_feedback:         { bg: 'rgba(148,163,184,.1)', fg: '#94a3b8' },
        pure_opinion:          { bg: 'rgba(232,116,97,.1)', fg: '#e87461' },
        subjective_framing:    { bg: 'rgba(129,140,248,.1)', fg: '#818cf8' }
      };
      var themeLabels = {
        cost_of_living: 'Cost of Living',
        style_influence: 'Style Influence',
        leadership_landscape: 'Leadership'
      };
      var bricks = active.map(function(m) {
        var now = Date.now();
        var start = new Date(m.scheduled_start || m.created_at).getTime();
        var end = m.deadline ? new Date(m.deadline).getTime() : 0;
        var pct = 0;
        if (end > start) {
          pct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
        }
        var catColor = categoryColors[m.category] || { bg: 'rgba(148,163,184,.1)', fg: '#94a3b8' };
        var catLabel = (m.category || '').replace(/_/g, ' ');
        var catPill = '<span class="pill" style="background:' + catColor.bg + ';color:' + catColor.fg + '">' + catLabel + '</span>';
        var statusCls = m.status === 'open' ? 'pill-open' : 'pill-scheduled';
        var statusPill = '<span class="pill ' + statusCls + '">' + m.status + '</span>';
        var themePill = '';
        if (m.research_theme) {
          var isBridge = m.research_theme.indexOf('__bridge') === 0;
          var isFun = m.research_theme === '__fun__';
          var themeClass = isBridge ? 'brick-theme brick-theme-bridge' : isFun ? 'brick-theme brick-theme-fun' : 'brick-theme';
          var label = themeLabels[m.research_theme] || m.research_theme.replace(/__/g, '').replace(/_/g, ' ');
          themePill = '<span class="' + themeClass + '">' + escHtml(label) + '</span>';
        }
        var maxP = m.max_participants != null ? m.max_participants : null;
        var partLabel = m.participant_count + '/' + (maxP != null ? maxP : '\u221E');
        var barColor = pct < 50 ? 'var(--green)' : pct < 80 ? 'var(--yellow)' : 'var(--red)';
        var brickClass = 'brick' + (m.status === 'open' ? ' brick-open' : m.status === 'scheduled' ? ' brick-scheduled' : '');
        return '<a href="/admin/market/' + m.id + '" class="' + brickClass + '">' +
          '<div class="brick-meta">' + statusPill + catPill + themePill + '</div>' +
          '<div class="brick-question">' + escHtml(m.question) + '</div>' +
          '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;background:' + barColor + '"></div></div>' +
          '<div class="brick-footer">' +
            '<div class="brick-participants"><strong>' + partLabel + '</strong> participants</div>' +
            '<div class="brick-progress-label">' + pct + '% elapsed</div>' +
          '</div>' +
        '</a>';
      }).join('');
      document.getElementById('current-markets').innerHTML =
        '<div class="masonry">' + bricks + '</div>';
    }

    // ── Chart.js rendering ────────────────────────────────────────────
    Chart.register(ChartDataLabels);
    var pointsChartInstance = null;
    var activityChartInstance = null;
    var cachedPointsData = null;
    var cachedActivityData = null;

    function getChartColors() {
      var style = getComputedStyle(document.documentElement);
      return {
        text: style.getPropertyValue('--text-muted').trim() || '#78716c',
        border: style.getPropertyValue('--border').trim() || '#3d3533',
        green: style.getPropertyValue('--green').trim() || '#2dd4a0',
        yellow: style.getPropertyValue('--yellow').trim() || '#f59e0b',
        red: style.getPropertyValue('--red').trim() || '#e87461',
        blue: '#38bdf8',
      };
    }

    function fillDateGaps(rows, daysParam) {
      if (!rows.length) return rows;
      var map = {};
      for (var i = 0; i < rows.length; i++) map[rows[i].day] = rows[i];
      var startDate, endDate = new Date();
      endDate.setHours(0,0,0,0);
      if (daysParam === 'all') {
        startDate = new Date(rows[0].day);
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(daysParam));
        startDate.setHours(0,0,0,0);
      }
      var result = [];
      var d = new Date(startDate);
      while (d <= endDate) {
        var key = d.toISOString().slice(0, 10);
        result.push(map[key] || { day: key });
        d.setDate(d.getDate() + 1);
      }
      return result;
    }

    function formatDateLabel(dayStr) {
      var parts = dayStr.split('-');
      return parseInt(parts[1]) + '/' + parseInt(parts[2]);
    }

    function renderPointsChart(data, daysParam) {
      cachedPointsData = { data: data, days: daysParam };
      var showLabels = document.getElementById('points-labels-toggle').checked;
      var colors = getChartColors();
      var filled = fillDateGaps(data.days || [], daysParam);
      var labels = filled.map(function(r) { return formatDateLabel(r.day); });
      var participantData = filled.map(function(r) { return r.participant_points || 0; });
      var protocolData = filled.map(function(r) { return r.protocol_points || 0; });

      if (pointsChartInstance) pointsChartInstance.destroy();
      var ctx = document.getElementById('points-chart').getContext('2d');
      pointsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Participant',
              data: participantData,
              backgroundColor: colors.green + 'cc',
              borderRadius: 2,
            },
            {
              label: 'Protocol (Take Rate)',
              data: protocolData,
              backgroundColor: colors.yellow + 'cc',
              borderRadius: 2,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: {
              stacked: true,
              ticks: { color: colors.text, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 15 },
              grid: { display: false },
              border: { color: colors.border },
            },
            y: {
              stacked: true,
              ticks: { color: colors.text, font: { size: 10 } },
              grid: { color: colors.border + '40' },
              border: { display: false },
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: { color: colors.text, boxWidth: 12, padding: 12, font: { size: 11 } }
            },
            datalabels: {
              display: showLabels,
              color: colors.text,
              font: { size: 9, weight: 'bold' },
              anchor: 'end',
              align: 'end',
              offset: -2,
              formatter: function(value) { return value > 0 ? value : ''; }
            }
          }
        }
      });
    }

    function renderActivityChart(data, daysParam) {
      cachedActivityData = { data: data, days: daysParam };
      var showLabels = document.getElementById('activity-labels-toggle').checked;
      var colors = getChartColors();
      var filled = fillDateGaps(data.buckets || [], daysParam);
      var labels = filled.map(function(r) { return formatDateLabel(r.day); });
      var newData = filled.map(function(r) { return r.new_agents || 0; });
      var returningData = filled.map(function(r) { return r.returning_agents || 0; });
      var churnedData = filled.map(function(r) { return -(r.churned_agents || 0); });
      var netChange = filled.map(function(r) { return (r.new_agents || 0) - (r.churned_agents || 0); });

      if (activityChartInstance) activityChartInstance.destroy();
      var ctx = document.getElementById('activity-chart').getContext('2d');
      activityChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'New',
              data: newData,
              backgroundColor: colors.blue + 'cc',
              borderRadius: 2,
              stack: 'stack0',
            },
            {
              label: 'Returning',
              data: returningData,
              backgroundColor: colors.green + 'cc',
              borderRadius: 2,
              stack: 'stack0',
            },
            {
              label: 'Churned',
              data: churnedData,
              backgroundColor: colors.red + 'cc',
              borderRadius: 2,
              stack: 'stack0',
            },
            {
              label: 'Net Change',
              data: netChange,
              type: 'line',
              borderColor: colors.text,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              tension: 0.3,
              fill: false,
              datalabels: { display: false },
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: {
              stacked: true,
              ticks: { color: colors.text, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 15 },
              grid: { display: false },
              border: { color: colors.border },
            },
            y: {
              stacked: true,
              ticks: { color: colors.text, font: { size: 10 } },
              grid: { color: colors.border + '40' },
              border: { display: false },
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: { color: colors.text, boxWidth: 12, padding: 12, font: { size: 11 } }
            },
            datalabels: {
              display: showLabels,
              color: colors.text,
              font: { size: 9, weight: 'bold' },
              anchor: 'end',
              align: 'end',
              offset: -2,
              formatter: function(value) { return value !== 0 ? value : ''; }
            }
          }
        }
      });
    }

    // Chart controls
    document.getElementById('points-range').addEventListener('change', function() {
      fetchPointsChart(this.value);
    });
    document.getElementById('activity-range').addEventListener('change', function() {
      fetchActivityChart(this.value);
    });
    document.getElementById('points-labels-toggle').addEventListener('change', function() {
      if (cachedPointsData) renderPointsChart(cachedPointsData.data, cachedPointsData.days);
    });
    document.getElementById('activity-labels-toggle').addEventListener('change', function() {
      if (cachedActivityData) renderActivityChart(cachedActivityData.data, cachedActivityData.days);
    });

    async function fetchPointsChart(days) {
      try {
        var data = await fetchData('/admin/analytics/points-timeseries?days=' + days);
        renderPointsChart(data, days);
      } catch(e) { console.error('Points chart error:', e); }
    }
    async function fetchActivityChart(days) {
      try {
        var data = await fetchData('/admin/analytics/agent-activity?days=' + days);
        renderActivityChart(data, days);
      } catch(e) { console.error('Activity chart error:', e); }
    }

    // Re-render charts on theme change
    new MutationObserver(function() {
      setTimeout(function() {
        if (cachedPointsData) renderPointsChart(cachedPointsData.data, cachedPointsData.days);
        if (cachedActivityData) renderActivityChart(cachedActivityData.data, cachedActivityData.days);
      }, 50);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    function renderReviewQueue(data) {
      var section = document.getElementById('review-queue-section');
      var pill = document.getElementById('review-count-pill');
      if (!data.markets || data.markets.length === 0) {
        section.style.display = 'none';
        return;
      }
      section.style.display = '';
      pill.textContent = data.count + ' pending';
      var cards = data.markets.map(function(m) {
        var catLabel = (m.category || '').replace(/_/g, ' ');
        var timeAgo = Math.round((Date.now() - new Date(m.created_at).getTime()) / 60000);
        var timeLabel = timeAgo < 60 ? timeAgo + 'm ago' : Math.round(timeAgo / 60) + 'h ago';
        return '<div class="review-card" id="review-' + m.id + '">' +
          '<div class="review-card-header"><div class="review-card-question">' + escHtml(m.question) + '</div></div>' +
          '<div class="review-card-meta">' +
            '<span class="pill" style="background:var(--yellow-bg);color:var(--yellow)">pending</span>' +
            '<span class="pill" style="background:rgba(148,163,184,.1);color:#94a3b8">' + catLabel + '</span>' +
            '<span class="pill" style="background:rgba(148,163,184,.1);color:#94a3b8">' + (m.answer_type || 'binary') + '</span>' +
          '</div>' +
          '<div class="review-card-desc">' + escHtml(m.description) + '</div>' +
          '<div class="review-card-footer">' +
            '<div class="review-card-info">by agent · ' + timeLabel + (m.funded_amount ? ' · ' + m.funded_amount + ' pts' : '') + '</div>' +
            '<div class="review-actions">' +
              '<button class="btn-reject" onclick="rejectMarket(\\'' + m.id + '\\')">Reject</button>' +
              '<button class="btn-approve" onclick="approveMarket(\\'' + m.id + '\\')">Approve</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
      document.getElementById('review-queue').innerHTML = cards;
    }

    async function approveMarket(id) {
      try {
        var res = await fetch('/admin/api/markets/' + id + '/approve', { method: 'POST', headers: headers });
        if (!res.ok) { var err = await res.json(); alert('Approve failed: ' + (err.error || res.status)); return; }
        document.getElementById('review-' + id).style.display = 'none';
        var remaining = document.querySelectorAll('.review-card:not([style*="display: none"])').length;
        document.getElementById('review-count-pill').textContent = remaining + ' pending';
        if (remaining === 0) document.getElementById('review-queue-section').style.display = 'none';
        refresh();
      } catch(e) { alert('Error: ' + e.message); }
    }

    async function rejectMarket(id) {
      var reason = prompt('Rejection reason (optional):');
      try {
        var rejectHeaders = Object.assign({}, headers, { 'Content-Type': 'application/json' });
        var res = await fetch('/admin/api/markets/' + id + '/reject', {
          method: 'POST', headers: rejectHeaders,
          body: JSON.stringify({ reason: reason || undefined })
        });
        if (!res.ok) { var err = await res.json(); alert('Reject failed: ' + (err.error || res.status)); return; }
        document.getElementById('review-' + id).style.display = 'none';
        var remaining = document.querySelectorAll('.review-card:not([style*="display: none"])').length;
        document.getElementById('review-count-pill').textContent = remaining + ' pending';
        if (remaining === 0) document.getElementById('review-queue-section').style.display = 'none';
        refresh();
      } catch(e) { alert('Error: ' + e.message); }
    }

    async function refresh() {
      countdown = REFRESH_INTERVAL;
      try {
        var pointsDays = document.getElementById('points-range').value;
        var activityDays = document.getElementById('activity-range').value;
        var results = await Promise.all([
          fetchData('/admin/analytics/overview'),
          fetchData('/admin/analytics/agents?sort=points'),
          fetchData('/admin/analytics/markets'),
          fetchData('/admin/analytics/points-timeseries?days=' + pointsDays),
          fetchData('/admin/analytics/agent-activity?days=' + activityDays)
        ]);
        renderOverview(results[0]);
        renderActivity(results[1]);
        renderCurrentMarkets(results[2]);
        renderPointsChart(results[3], pointsDays);
        renderActivityChart(results[4], activityDays);

        // Review queue fetched independently — failure doesn't break the dashboard
        try {
          var pending = await fetchData('/admin/analytics/pending-markets');
          renderReviewQueue(pending);
        } catch(e) {
          console.warn('Review queue unavailable:', e);
          document.getElementById('review-queue-section').style.display = 'none';
        }
      } catch(e) {
        console.error('Dashboard error:', e);
      }
    }

    setInterval(function() {
      countdown--;
      document.getElementById('countdown').textContent = 'Refreshes in ' + countdown + 's';
      if (countdown <= 0) refresh();
    }, 1000);

    refresh();
    ${themeScript}
  </script>
</body>
</html>`;
}

export function renderMarketDetail(marketId: string): string {  const safeId = JSON.stringify(marketId);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — Market Detail</title>
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
      --yellow: #f59e0b;
      --yellow-bg: rgba(245,158,11,.1);
      --red: #e87461;
      --red-bg: rgba(232,116,97,.1);
    }
    ${themeCSS}
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
    .topbar-right { display: flex; align-items: center; gap: 16px; }
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
    .hamburger-btn {
      background: none; border: none; color: var(--text-dark); font-size: 20px;
      cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background .15s; line-height: 1;
    }
    .hamburger-btn:hover { background: var(--bg); }
    .nav-dropdown {
      position: absolute; top: 56px; left: 0; background: var(--surface);
      border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 0;
      box-shadow: 0 8px 24px rgba(0,0,0,.4); min-width: 220px;
      display: none; flex-direction: column; z-index: 200;
    }
    .nav-dropdown.open { display: flex; }
    .nav-item {
      padding: 12px 20px; font-size: 14px; color: var(--text);
      text-decoration: none; transition: background .15s, color .15s;
    }
    .nav-item:hover { background: var(--bg); color: var(--text-dark); }
    .nav-item.active { color: var(--accent); font-weight: 600; }
    .nav-divider { height: 1px; background: var(--border); margin: 4px 0; }
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
    .market-question { font-size: 20px; font-weight: 600; color: var(--text-dark); margin-bottom: 8px; }
    .market-desc { color: var(--text); margin-bottom: 16px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .meta-item {}
    .meta-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 2px; }
    .meta-value { font-size: 14px; color: var(--text-dark); font-weight: 500; }
    .pill {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 4px;
      letter-spacing: 0.02em;
      display: inline-block;
    }
    .pill-open { background: var(--green-bg); color: var(--green); }
    .pill-closed { background: var(--yellow-bg); color: var(--yellow); }
    .pill-resolved { background: var(--accent-light); color: var(--accent); }
    .pill-scheduled { background: rgba(167,139,250,.12); color: #a78bfa; }
    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
    .kpi-cell { background: var(--surface); padding: 14px 16px; }
    .kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 4px; }
    .kpi-value { font-size: 24px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.02em; line-height: 1; }
    .vote-bar-wrap { margin-bottom: 8px; }
    .vote-label { font-size: 13px; color: var(--text-dark); font-weight: 500; margin-bottom: 4px; display: flex; justify-content: space-between; }
    .vote-bar { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; height: 24px; overflow: hidden; }
    .vote-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width .3s; min-width: 2px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      padding: 0 16px 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    thead th:first-child { padding-left: 20px; }
    thead th:last-child { padding-right: 20px; }
    tbody td {
      padding: 13px 16px;
      font-size: 13px;
      color: var(--text);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    tbody td:first-child { padding-left: 20px; }
    tbody td:last-child { padding-right: 20px; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: var(--bg); }
    .td-handle { font-weight: 600; color: var(--text-dark); }
    .td-mono { font-variant-numeric: tabular-nums; }
    .td-muted { color: var(--text-muted); font-size: 12px; }
    .empty-row td { text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px; }
    .loading-text { color: var(--text-muted); font-size: 13px; padding: 20px 0; }
    .options-list { display: flex; gap: 6px; flex-wrap: wrap; }
    .option-tag { font-size: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 2px 8px; color: var(--text-dark); }
    .txn-positive { color: var(--green); font-weight: 600; }
    .txn-negative { color: var(--red); font-weight: 600; }
    .pill-binary { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
    .pill-single_choice { background: rgba(45,212,160,.1); color: var(--accent); }
    .pill-multi_choice { background: rgba(59,130,246,.1); color: #3b82f6; }
    .pill-ranking { background: rgba(245,158,11,.1); color: #f59e0b; }
    .pill-scale { background: rgba(236,72,153,.1); color: #ec4899; }
    .pill-longform { background: rgba(167,139,250,.1); color: #a78bfa; }
    .synthesis-block { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 16px; margin-bottom: 12px; }
    .synthesis-title { font-size: 14px; font-weight: 600; color: var(--text-dark); margin-bottom: 8px; }
    .synthesis-content { font-size: 13px; color: var(--text); white-space: pre-wrap; line-height: 1.6; }
    .longform-answer { white-space: normal; max-width: 500px; font-size: 13px; line-height: 1.5; }
    .expand-btn { font-size: 12px; color: var(--accent); cursor: pointer; border: none; background: none; font-weight: 600; }
    .masonry { column-count: 3; column-gap: 12px; }
    .opinion-card {
      break-inside: avoid;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      display: inline-block;
      width: 100%;
    }
    .opinion-card:hover { border-color: var(--text-muted); }
    .opinion-card.highlighted {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(45,212,160,.25), 0 0 12px rgba(45,212,160,.1);
    }
    .opinion-card-header {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-dark);
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }
    .opinion-card-header.hidden { display: none; }
    .opinion-card-body {
      font-size: 13px;
      color: var(--text);
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .opinion-card-time { font-size: 11px; color: var(--text-muted); margin-top: 8px; }
    .masonry-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .masonry-controls label {
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      user-select: none;
    }
    .masonry-controls input[type="checkbox"] { accent-color: var(--accent); }
    .view-toggle {
      display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden;
      margin-left: auto;
    }
    .view-toggle-btn {
      background: transparent; border: none; color: var(--text-muted);
      font-size: 12px; padding: 4px 12px; cursor: pointer;
      transition: background .15s, color .15s; font-family: inherit;
    }
    .view-toggle-btn:not(:last-child) { border-right: 1px solid var(--border); }
    .view-toggle-btn.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }
    .view-toggle-btn:hover:not(.active) { background: var(--bg); color: var(--text-dark); }
    .opinions-table-wrap { overflow-x: auto; }
    .opinions-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .opinions-table thead th {
      position: relative;
      padding: 0 16px 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    .opinions-table thead th:first-child { padding-left: 20px; }
    .opinions-table thead th:last-child { padding-right: 20px; }
    .opinions-table tbody td {
      padding: 13px 16px;
      font-size: 13px;
      color: var(--text);
      border-bottom: 1px solid var(--border);
      vertical-align: top;
      overflow: hidden;
    }
    .opinions-table tbody td:first-child { padding-left: 20px; }
    .opinions-table tbody td:last-child { padding-right: 20px; }
    .opinions-table tbody tr:last-child td { border-bottom: none; }
    .opinions-table tbody tr:hover td { background: var(--bg); }
    .opinions-table .cell-wrap { white-space: normal; word-break: break-word; line-height: 1.5; }
    .col-resizer {
      position: absolute; right: -2px; top: 0; bottom: 0;
      width: 4px; cursor: col-resize; z-index: 1;
    }
    .col-resizer:hover, .col-resizer:active { background: var(--accent); opacity: 0.5; }
    .agent-col-hidden .agent-col { display: none; }
    @media (max-width: 900px) and (min-width: 701px) {
      .masonry { column-count: 2; }
    }
    @media (max-width: 700px) {
      .meta-grid { grid-template-columns: 1fr; }
      .kpi-grid { grid-template-columns: 1fr 1fr; }
      .masonry { column-count: 1; }
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Market Detail</span>
    </div>
    <div class="topbar-right">
      <a class="back-link" href="/admin/markets">&larr; Markets</a>
      ${themeToggleButton}
    </div>
    <div class="nav-dropdown" id="nav-dropdown">
      <a href="/admin/dashboard" class="nav-item">Dashboard</a>
      <a href="/admin/studies" class="nav-item">Studies</a>
      <a href="/admin/directory" class="nav-item">Agents</a>
      <a href="/admin/markets" class="nav-item">Markets</a>
      <a href="/admin/schedule" class="nav-item">Schedule</a>
      <div class="nav-divider"></div>
      <a href="/admin/pool-analyzer" class="nav-item">Pool Analyzer</a>
      <a href="/admin/cohort-analyzer" class="nav-item">Cohort Analyzer</a>
      <div class="nav-divider"></div>
      <a href="/admin/longform-queue" class="nav-item">Longform Review</a>
      <a href="/admin/markets/new" class="nav-item" style="color:var(--accent)">+ Create Market</a>
    </div>
  </div>

  <div class="main">
    <div id="detail"><p class="loading-text">Loading&hellip;</p></div>
  </div>

  <script>
    ${themeScript}    var MARKET_ID = ${safeId};
    var headers = {}

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

    function fmtDate(dateStr) {
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleString();
    }

    function toggleHighlight(el) {
      el.classList.toggle('highlighted');
    }

    function toggleHeaders(show) {
      var headers = document.querySelectorAll('.opinion-card-header');
      for (var i = 0; i < headers.length; i++) {
        if (show) {
          headers[i].classList.remove('hidden');
        } else {
          headers[i].classList.add('hidden');
        }
      }
      var tbl = document.querySelector('.opinions-table');
      if (tbl) {
        if (show) tbl.classList.remove('agent-col-hidden');
        else tbl.classList.add('agent-col-hidden');
      }
    }

    function switchOpinionView(view) {
      var cards = document.getElementById('opinions-cards');
      var table = document.getElementById('opinions-table');
      if (!cards || !table) return;
      cards.style.display = view === 'cards' ? '' : 'none';
      table.style.display = view === 'table' ? '' : 'none';
      var btns = document.querySelectorAll('.view-toggle-btn');
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].getAttribute('data-view') === view) btns[i].classList.add('active');
        else btns[i].classList.remove('active');
      }
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

    function pillClass(status) {
      if (status === 'open') return 'pill-open';
      if (status === 'resolved') return 'pill-resolved';
      if (status === 'scheduled') return 'pill-scheduled';
      return 'pill-closed';
    }

    async function load() {
      try {
        var res = await fetch('/admin/analytics/markets/' + MARKET_ID, { headers: headers });
        if (!res.ok) {
          var statusLine = res.status + (res.statusText ? ' ' + res.statusText : '');
          var bodyText = '';
          try { bodyText = await res.text(); } catch(e) { bodyText = ''; }
          var bodyDisplay = bodyText && bodyText.trim().length ? bodyText.trim() : 'No response body.';
          if (bodyText && bodyText.trim().length) {
            try {
              var parsed = JSON.parse(bodyText);
              if (parsed && typeof parsed === 'object') {
                if (typeof parsed.error === 'string') bodyDisplay = parsed.error;
                else if (typeof parsed.message === 'string') bodyDisplay = parsed.message;
                else bodyDisplay = JSON.stringify(parsed, null, 2);
              } else if (typeof parsed === 'string') {
                bodyDisplay = parsed;
              }
            } catch(e) {}
          }
          document.getElementById('detail').innerHTML =
            '<p class="loading-text">Request failed: ' + escHtml(statusLine) + '</p>' +
            '<pre style="margin-top:12px;background:var(--surface);border:1px solid var(--border);padding:12px;border-radius:6px;white-space:pre-wrap;word-break:break-word;color:var(--text-muted);font-size:12px;line-height:1.5">' +
              escHtml(bodyDisplay) +
            '</pre>';
          return;
        }
        var data = await res.json();
        render(data);
      } catch(e) {
        console.error('Detail error:', e);
        document.getElementById('detail').innerHTML = '<p class="loading-text">Error loading market.</p>';
      }
    }

    function render(data) {
      var m = data.market;
      var html = '';

      // Market Info card
      var answerType = m.answer_type || 'binary';
      var typeCls = answerType === 'longform' ? 'pill-longform' : answerType === 'single_choice' ? 'pill-single_choice' : answerType === 'multi_choice' ? 'pill-multi_choice' : answerType === 'ranking' ? 'pill-ranking' : answerType === 'scale' ? 'pill-scale' : 'pill-binary';
      var optionsHtml = '';
      if (answerType === 'longform') {
        var rc = m.response_constraints;
        optionsHtml = '<div class="options-list"><span class="option-tag">Longform text (' + (rc ? rc.min_length + '-' + rc.max_length + ' chars' : 'open') + ')</span></div>';
        if (rc && rc.topic_focus) optionsHtml += '<div style="margin-top:6px;font-size:12px;color:var(--text-muted)">Topic: ' + escHtml(rc.topic_focus) + '</div>';
      } else if (m.answer_options && m.answer_options.length) {
        optionsHtml = '<div class="options-list">' + m.answer_options.map(function(o) {
          return '<span class="option-tag">' + escHtml(o) + '</span>';
        }).join('') + '</div>';
      } else {
        optionsHtml = '<div class="options-list"><span class="option-tag">Yes</span><span class="option-tag">No</span></div>';
      }

      var creatorText = m.created_by;
      if (data.creator_handle) creatorText = escHtml(data.creator_handle);
      else if (m.created_by === 'lifecycle') creatorText = 'System (lifecycle)';
      else if (m.created_by === 'admin') creatorText = 'Admin';

      html += '<div class="card">' +
        '<div class="card-header"><span class="card-title">Market Info</span></div>' +
        '<div class="card-body">' +
          '<div class="market-question">' + escHtml(m.question) + '</div>' +
          '<div class="market-desc">' + escHtml(m.description) + '</div>' +
          '<div class="meta-grid">' +
            '<div class="meta-item"><div class="meta-label">Status</div><div class="meta-value"><span class="pill ' + pillClass(m.status) + '">' + m.status + '</span></div></div>' +
            '<div class="meta-item"><div class="meta-label">Type</div><div class="meta-value"><span class="pill ' + typeCls + '">' + answerType + '</span></div></div>' +
            '<div class="meta-item"><div class="meta-label">Category</div><div class="meta-value">' + escHtml(m.category) + '</div></div>' +
            '<div class="meta-item"><div class="meta-label">Created By</div><div class="meta-value">' + creatorText + '</div></div>' +
            '<div class="meta-item"><div class="meta-label">Deadline</div><div class="meta-value">' + fmtDate(m.deadline) + '</div></div>' +
            '<div class="meta-item"><div class="meta-label">Created</div><div class="meta-value">' + fmtDate(m.created_at) + '</div></div>' +
            '<div class="meta-item"><div class="meta-label">Participants</div><div class="meta-value">' + data.participant_count + '</div></div>' +
          '</div>' +
          '<div style="margin-top:16px"><div class="meta-label">Answer Options</div><div style="margin-top:6px">' + optionsHtml + '</div></div>' +
          (m.majority_position ? '<div style="margin-top:16px"><div class="meta-label">Majority Position</div><div class="meta-value" style="margin-top:4px">' + escHtml(m.majority_position) + '</div></div>' : '') +
        '</div></div>';

      // Funding card
      if (m.funded_amount != null) {
        html += '<div class="card">' +
          '<div class="card-header"><span class="card-title">Funding</span></div>' +
          '<div class="card-body">' +
            '<div class="kpi-grid">' +
              '<div class="kpi-cell"><div class="kpi-label">Funded</div><div class="kpi-value">' + (m.funded_amount || 0) + '</div></div>' +
              '<div class="kpi-cell"><div class="kpi-label">Platform Fee</div><div class="kpi-value">' + (m.platform_fee || 0) + '</div></div>' +
              '<div class="kpi-cell"><div class="kpi-label">Reward Pool</div><div class="kpi-value">' + (m.reward_pool || 0) + '</div></div>' +
              '<div class="kpi-cell"><div class="kpi-label">Distributed</div><div class="kpi-value">' + (m.reward_distributed || 0) + '</div></div>' +
            '</div>' +
          '</div></div>';
      }

      // Vote Distribution / Synthesis card
      if (answerType === 'longform') {
        // Longform markets show response count instead of vote distribution
        html += '<div class="card">' +
          '<div class="card-header"><span class="card-title">Responses</span></div>' +
          '<div class="card-body"><p style="color:var(--text);font-size:13px">' + data.opinions.length + ' longform responses collected</p></div></div>';
      } else {
        var totalVotes = 0;
        var voteEntries = Object.keys(data.vote_counts).map(function(k) {
          totalVotes += data.vote_counts[k];
          return { answer: k, count: data.vote_counts[k] };
        });

        var voteBarsHtml = '';
        if (voteEntries.length) {
          voteBarsHtml = voteEntries.map(function(v) {
            var pct = totalVotes > 0 ? Math.round((v.count / totalVotes) * 100) : 0;
            return '<div class="vote-bar-wrap">' +
              '<div class="vote-label"><span>' + escHtml(v.answer) + '</span><span>' + v.count + ' (' + pct + '%)</span></div>' +
              '<div class="vote-bar"><div class="vote-fill" style="width:' + pct + '%"></div></div>' +
            '</div>';
          }).join('');
        } else {
          voteBarsHtml = '<p class="td-muted">No opinions yet</p>';
        }

        html += '<div class="card">' +
          '<div class="card-header"><span class="card-title">Vote Distribution</span></div>' +
          '<div class="card-body">' + voteBarsHtml + '</div></div>';
      }

      // Provenance quality
      var prov = data.provenance || {};
      var avgProv = prov.average_score != null ? Number(prov.average_score).toFixed(2) : '—';
      var dist = prov.score_distribution || {};
      var sourceCounts = prov.source_counts || {};
      var sourceKeys = Object.keys(sourceCounts);
      var sourcesHtml = sourceKeys.length
        ? sourceKeys.map(function(k) { return '<span class="option-tag">' + escHtml(k) + ': ' + sourceCounts[k] + '</span>'; }).join('')
        : '<span class="td-muted">No provenance data yet</span>';
      var distHtml = '<div class="meta-grid">' +
        '<div class="meta-item"><div class="meta-label">0-0.4</div><div class="meta-value">' + (dist['0-0.4'] || 0) + '</div></div>' +
        '<div class="meta-item"><div class="meta-label">0.4-0.7</div><div class="meta-value">' + (dist['0.4-0.7'] || 0) + '</div></div>' +
        '<div class="meta-item"><div class="meta-label">0.7-1.0</div><div class="meta-value">' + (dist['0.7-1.0'] || 0) + '</div></div>' +
        '<div class="meta-item"><div class="meta-label">Unknown</div><div class="meta-value">' + (dist.unknown || 0) + '</div></div>' +
      '</div>';

      html += '<div class="card">' +
        '<div class="card-header"><span class="card-title">Provenance Quality</span></div>' +
        '<div class="card-body">' +
          '<div class="meta-grid">' +
            '<div class="meta-item"><div class="meta-label">Average Score</div><div class="meta-value">' + avgProv + '</div></div>' +
            '<div class="meta-item"><div class="meta-label">Knowledge Source</div><div class="meta-value">' + escHtml(m.knowledge_source || 'any') + '</div></div>' +
            '<div class="meta-item"><div class="meta-label">Formula</div><div class="meta-value">Base 1.0; −0.3 missing expected; −0.3 misaligned; min 0</div></div>' +
          '</div>' +
          '<div style="margin-top:12px">' + distHtml + '</div>' +
          '<div style="margin-top:12px" class="meta-grid">' +
            '<div class="meta-item"><div class="meta-label">Aligned</div><div class="meta-value">' + ((prov.alignment_counts && prov.alignment_counts.aligned) || 0) + '</div></div>' +
            '<div class="meta-item"><div class="meta-label">Missing Expected</div><div class="meta-value">' + ((prov.alignment_counts && prov.alignment_counts.missing_expected) || 0) + '</div></div>' +
            '<div class="meta-item"><div class="meta-label">Misaligned</div><div class="meta-value">' + ((prov.alignment_counts && prov.alignment_counts.misaligned) || 0) + '</div></div>' +
          '</div>' +
          '<div style="margin-top:12px"><div class="meta-label">Source Counts</div><div class="options-list">' + sourcesHtml + '</div></div>' +
          '<div class="td-muted" style="margin-top:10px;font-size:12px">Score does not affect payouts or outcomes.</div>' +
        '</div></div>';

      // Opinions masonry + table
      var opinionsHtml = '';
      if (data.opinions.length) {
        opinionsHtml += '<div class="masonry-controls">' +
          '<label><input type="checkbox" id="toggle-headers" checked onchange="toggleHeaders(this.checked)"> Show agent names</label>' +
          '<div class="view-toggle">' +
            '<button class="view-toggle-btn active" data-view="cards" onclick="switchOpinionView(&quot;cards&quot;)">Cards</button>' +
            '<button class="view-toggle-btn" data-view="table" onclick="switchOpinionView(&quot;table&quot;)">Table</button>' +
          '</div>' +
          '</div>';

        // Cards view
        opinionsHtml += '<div id="opinions-cards" class="masonry">';
        opinionsHtml += data.opinions.map(function(o) {
          var agentName = escHtml(o.handle || o.agent_id.slice(0, 8));
          var provScore = o.provenance_score != null ? Number(o.provenance_score).toFixed(2) : '-';
          var provSources = Array.isArray(o.provenance && o.provenance.sources)
            ? o.provenance.sources.map(function(s) { return (s && typeof s.type === 'string') ? s.type : null; }).filter(Boolean).join(', ')
            : '-';
          if (!provSources) provSources = '-';
          return '<div class="opinion-card" onclick="toggleHighlight(this)">' +
            '<div class="opinion-card-header">' + agentName + '</div>' +
            '<div class="opinion-card-body">' + escHtml(o.answer) + '</div>' +
            '<div class="opinion-card-time">' + fmtDate(o.created_at) + '</div>' +
            '<div class="opinion-card-time">Prov: ' + provScore + (provSources !== '-' ? ' · ' + escHtml(provSources) : '') + '</div>' +
          '</div>';
        }).join('');
        opinionsHtml += '</div>';

        // Table view (hidden by default)
        opinionsHtml += '<div id="opinions-table" class="opinions-table-wrap" style="display:none">';
        opinionsHtml += '<table class="opinions-table"><thead><tr>' +
          '<th class="agent-col" style="width:15%"><span>Agent</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>' +
          '<th style="width:28%"><span>Answer</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>' +
          '<th style="width:10%"><span>Confidence</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>' +
          '<th style="width:18%"><span>Basis</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>' +
          '<th style="width:8%"><span>Prov.</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>' +
          '<th style="width:11%"><span>Sources</span><div class="col-resizer" onmousedown="startResize(event,this)"></div></th>' +
          '<th style="width:10%"><span>Time</span></th>' +
        '</tr></thead><tbody>';
        opinionsHtml += data.opinions.map(function(o) {
          var agentName = escHtml(o.handle || o.agent_id.slice(0, 8));
          var conf = o.confidence != null ? o.confidence + '%' : '-';
          var basisText = o.basis ? escHtml(o.basis) : '-';
          var provScore = o.provenance_score != null ? Number(o.provenance_score).toFixed(2) : '-';
          var provSources = Array.isArray(o.provenance && o.provenance.sources)
            ? o.provenance.sources.map(function(s) { return (s && typeof s.type === 'string') ? s.type : null; }).filter(Boolean).join(', ')
            : '-';
          if (!provSources) provSources = '-';
          return '<tr>' +
            '<td class="td-handle agent-col">' + agentName + '</td>' +
            '<td class="cell-wrap">' + escHtml(o.answer) + '</td>' +
            '<td class="td-mono">' + conf + '</td>' +
            '<td class="cell-wrap">' + basisText + '</td>' +
            '<td class="td-mono">' + provScore + '</td>' +
            '<td class="cell-wrap">' + escHtml(provSources) + '</td>' +
            '<td class="td-muted" style="white-space:nowrap">' + fmtDate(o.created_at) + '</td>' +
          '</tr>';
        }).join('');
        opinionsHtml += '</tbody></table></div>';
      } else {
        opinionsHtml = '<p class="td-muted" style="padding:20px">No opinions expressed yet</p>';
      }

      html += '<div class="card">' +
        '<div class="card-header"><span class="card-title">Opinions (' + data.opinions.length + ')</span></div>' +
        '<div class="card-body">' + opinionsHtml + '</div></div>';

      // Transactions table
      var txnHtml = '';
      if (data.transactions.length) {
        var tRows = data.transactions.map(function(t) {
          var amtCls = t.amount >= 0 ? 'txn-positive' : 'txn-negative';
          var amtStr = t.amount >= 0 ? '+' + t.amount : '' + t.amount;
          return '<tr>' +
            '<td class="td-handle">' + escHtml(t.handle || t.agent_id.slice(0,8)) + '</td>' +
            '<td class="td-mono ' + amtCls + '">' + amtStr + '</td>' +
            '<td class="td-muted">' + escHtml(t.type) + '</td>' +
            '<td class="td-muted">' + fmtDate(t.created_at) + '</td>' +
          '</tr>';
        }).join('');
        txnHtml = '<table><thead><tr><th style="padding-left:20px">Agent</th><th>Amount</th><th>Type</th><th style="padding-right:20px">Time</th></tr></thead><tbody>' + tRows + '</tbody></table>';
      } else {
        txnHtml = '<table><tbody><tr class="empty-row"><td colspan="4">No transactions yet</td></tr></tbody></table>';
      }

      html += '<div class="card">' +
        '<div class="card-header"><span class="card-title">Point Transactions</span></div>' +
        '<div class="table-wrap">' + txnHtml + '</div></div>';

      document.getElementById('detail').innerHTML = html;
    }

    load();
  </script>
</body>
</html>`;
}

export function renderFunnelDetail(funnelId: string): string {  const safeFunnelId = JSON.stringify(funnelId);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — Funnel Detail</title>
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
      --yellow: #f59e0b;
      --yellow-bg: rgba(245,158,11,.1);
      --red: #e87461;
      --red-bg: rgba(232,116,97,.1);
    }
    ${themeCSS}
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
    .topbar-right { display: flex; align-items: center; gap: 16px; }
    .topbar-wordmark { font-size: 13px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.01em; }
    .topbar-divider { width: 1px; height: 18px; background: var(--border); }
    .topbar-subtitle { font-size: 13px; color: var(--text-muted); }
    .back-link { font-size: 14px; color: var(--accent); text-decoration: none; font-weight: 600; padding: 8px 14px; border: 1px solid var(--border); border-radius: 8px; transition: background .15s, border-color .15s; }
    .back-link:hover { background: var(--accent-light); border-color: var(--accent); }
    .hamburger-btn {
      background: none; border: none; color: var(--text-dark); font-size: 20px;
      cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background .15s; line-height: 1;
    }
    .hamburger-btn:hover { background: var(--bg); }
    .nav-dropdown {
      position: absolute; top: 56px; left: 0; background: var(--surface);
      border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 0;
      box-shadow: 0 8px 24px rgba(0,0,0,.4); min-width: 220px;
      display: none; flex-direction: column; z-index: 200;
    }
    .nav-dropdown.open { display: flex; }
    .nav-item {
      padding: 12px 20px; font-size: 14px; color: var(--text);
      text-decoration: none; transition: background .15s, color .15s;
    }
    .nav-item:hover { background: var(--bg); color: var(--text-dark); }
    .nav-item.active { color: var(--accent); font-weight: 600; }
    .nav-divider { height: 1px; background: var(--border); margin: 4px 0; }
    .main { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
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
    .funnel-title { font-size: 22px; font-weight: 700; color: var(--text-dark); margin-bottom: 6px; }
    .funnel-subtitle { font-size: 14px; color: var(--text); margin-bottom: 16px; line-height: 1.6; }
    .pill {
      font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 4px;
      letter-spacing: 0.02em; display: inline-block;
    }
    .pill-open { background: var(--green-bg); color: var(--green); }
    .pill-closed { background: var(--yellow-bg); color: var(--yellow); }
    .pill-resolved { background: var(--accent-light); color: var(--accent); }
    .pill-bridge { background: rgba(167,139,250,.1); color: #a78bfa; }
    .pill-binary { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
    .pill-single_choice { background: rgba(45,212,160,.1); color: var(--accent); }
    .pill-multi_choice { background: rgba(59,130,246,.1); color: #3b82f6; }
    .pill-ranking { background: rgba(245,158,11,.1); color: #f59e0b; }
    .pill-scale { background: rgba(236,72,153,.1); color: #ec4899; }
    .pill-longform { background: rgba(167,139,250,.1); color: #a78bfa; }
    .pill-stage { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 4px; letter-spacing: 0.04em; }
    .pill-stage-1 { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
    .pill-stage-2 { background: var(--accent-light); color: var(--accent); }
    .pill-stage-3 { background: var(--yellow-bg); color: var(--yellow); }
    .pill-stage-4 { background: rgba(251,146,60,.1); color: #fb923c; }
    .pill-stage-5 { background: var(--green-bg); color: var(--green); }
    .progress-bar { background: var(--border); border-radius: 4px; height: 8px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 4px; transition: width .3s; }
    .progress-fill-p1 { background: var(--accent); }
    .progress-fill-p2 { background: var(--yellow); }
    .progress-fill-p3 { background: var(--green); }
    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
    .kpi-cell { background: var(--surface); padding: 14px 16px; }
    .kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 4px; }
    .kpi-value { font-size: 24px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.02em; line-height: 1; }
    .phase-steps { display: flex; align-items: flex-start; margin-bottom: 16px; position: relative; }
    .phase-step { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; }
    .phase-dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border); background: var(--surface); display: flex; align-items: center; justify-content: center; }
    .phase-step.completed .phase-dot { background: var(--green); border-color: var(--green); }
    .phase-step.active .phase-dot { border-color: var(--accent); background: var(--surface); box-shadow: 0 0 0 3px rgba(45,212,160,.15); }
    .phase-dot-check { display: none; color: #18181b; font-size: 11px; font-weight: 700; }
    .phase-step.completed .phase-dot-check { display: block; }
    .phase-dot-num { font-size: 10px; font-weight: 600; color: var(--text-muted); }
    .phase-step.completed .phase-dot-num { display: none; }
    .phase-step.active .phase-dot-num { color: var(--accent); }
    .phase-step-label { font-size: 12px; font-weight: 500; color: var(--text-dark); margin-top: 8px; text-align: center; }
    .phase-step-count { font-size: 11px; color: var(--text-muted); margin-top: 2px; text-align: center; }
    .phase-line { position: absolute; top: 10px; left: 0; right: 0; height: 2px; background: var(--border); z-index: 0; }
    .phase-line-fill { height: 100%; background: var(--green); transition: width 0.3s; }
    .confirm-synth-btn {
      background: var(--green); color: #18181b; border: none; border-radius: 6px;
      padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .confirm-synth-btn:hover { opacity: 0.9; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      padding: 0 16px 12px; text-align: left; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted);
      border-bottom: 1px solid var(--border); white-space: nowrap;
    }
    thead th:first-child { padding-left: 20px; }
    thead th:last-child { padding-right: 20px; }
    tbody td {
      padding: 13px 16px; font-size: 13px; color: var(--text);
      border-bottom: 1px solid var(--border); white-space: nowrap;
    }
    tbody td:first-child { padding-left: 20px; }
    tbody td:last-child { padding-right: 20px; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: var(--bg); }
    .td-question { white-space: normal; max-width: 360px; font-weight: 500; color: var(--text-dark); }
    .td-mono { font-variant-numeric: tabular-nums; }
    .td-muted { color: var(--text-muted); font-size: 12px; }
    .empty-row td { text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px; }
    .loading-text { color: var(--text-muted); font-size: 13px; padding: 20px 0; }
    .mini-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .mini-cell { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px; }
    .mini-value { font-size: 22px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.01em; line-height: 1; margin-bottom: 4px; }
    .mini-label { font-size: 11px; color: var(--text-muted); }
    .synthesis-block { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 16px; margin-bottom: 12px; }
    .synthesis-title { font-size: 14px; font-weight: 600; color: var(--text-dark); margin-bottom: 8px; }
    .synthesis-content { font-size: 13px; color: var(--text); white-space: pre-wrap; line-height: 1.6; }
    @media (max-width: 700px) {
      .kpi-grid { grid-template-columns: 1fr 1fr; }
      .phase-steps { flex-direction: column; align-items: stretch; }
      .phase-step { flex-direction: row; align-items: center; gap: 12px; }
      .phase-step-label, .phase-step-count { text-align: left; margin-top: 0; }
      .phase-line { display: none; }
      .mini-grid { grid-template-columns: 1fr; }
    }

    .card-header-collapsible { cursor: pointer; user-select: none; display: flex; align-items: center; justify-content: space-between; }
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
      <span class="topbar-subtitle">Funnel Detail</span>
    </div>
    <div class="topbar-right">
      <a class="back-link" href="/admin/funnels">&larr; Research Funnels</a>
      ${themeToggleButton}
    </div>
    <div class="nav-dropdown" id="nav-dropdown">
      <a href="/admin/dashboard" class="nav-item">Dashboard</a>
      <a href="/admin/studies" class="nav-item">Studies</a>
      <a href="/admin/directory" class="nav-item">Agents</a>
      <a href="/admin/markets" class="nav-item">Markets</a>
      <a href="/admin/schedule" class="nav-item">Schedule</a>
      <div class="nav-divider"></div>
      <a href="/admin/pool-analyzer" class="nav-item">Pool Analyzer</a>
      <a href="/admin/cohort-analyzer" class="nav-item">Cohort Analyzer</a>
      <div class="nav-divider"></div>
      <a href="/admin/longform-queue" class="nav-item">Longform Review</a>
      <a href="/admin/markets/new" class="nav-item" style="color:var(--accent)">+ Create Market</a>
    </div>
  </div>

  <div class="main">
    <div id="detail"><p class="loading-text">Loading&hellip;</p></div>
  </div>

  <script>
    ${themeScript}    var FUNNEL_ID = ${safeFunnelId};
    var headers = {}

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

    function fmtDate(dateStr) {
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleString();
    }

    function pillClass(status) {
      if (status === 'open') return 'pill-open';
      if (status === 'resolved') return 'pill-resolved';
      return 'pill-closed';
    }

    async function confirmSynthesized() {
      if (!confirm('Mark this topic as fully synthesized? This confirms the insight is complete and reviewed.')) return;
      try {
        var res = await fetch('/admin/analytics/funnels/' + FUNNEL_ID + '/confirm', {
          method: 'POST',
          headers: headers
        });
        if (res.ok) { load(); }
        else { alert('Failed to confirm synthesis'); }
      } catch(e) { alert('Error: ' + e.message); }
    }

    async function load() {
      try {
        var res = await fetch('/admin/analytics/funnels/' + FUNNEL_ID, { headers: headers });
        if (!res.ok) {
          document.getElementById('detail').innerHTML = '<p class="loading-text">Funnel not found.</p>';
          return;
        }
        var data = await res.json();
        render(data);
      } catch(e) {
        console.error('Funnel detail error:', e);
        document.getElementById('detail').innerHTML = '<p class="loading-text">Error loading funnel.</p>';
      }
    }

    function render(data) {
      var html = '';
      var targetResolved = data.target_resolved || 40;
      var pct = Math.min(100, Math.round((data.resolved_count / targetResolved) * 100));
      var stageNames = ['','Seeded','Gathering','Emerging','Converging','Synthesized'];
      var stageCls = 'pill-stage-' + data.current_stage;
      var fillCls = data.current_stage >= 5 ? 'progress-fill-p3' : data.current_stage >= 3 ? 'progress-fill-p2' : 'progress-fill-p1';

      // Card 1: Funnel Info
      html += '<div class="card">' +
        '<div class="card-header"><span class="card-title">Funnel Overview</span></div>' +
        '<div class="card-body">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">' +
            '<div class="funnel-title">' + escHtml(data.name) + '</div>' +
            '<span class="pill pill-stage ' + stageCls + '">' + stageNames[data.current_stage] + '</span>' +
          '</div>' +
          '<div class="funnel-subtitle">' + escHtml(data.insight_goal) + '</div>' +
          '<div style="margin-bottom:6px"><div class="progress-bar"><div class="progress-fill ' + fillCls + '" style="width:' + pct + '%"></div></div></div>' +
          '<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">' +
            data.resolved_count + ' / ' + targetResolved + ' resolved (' + pct + '%)' +
            (data.markets_to_full_insight > 0 ? ' &mdash; ' + data.markets_to_full_insight + ' more needed' : ' &mdash; Target reached') +
          '</div>' +
          '<div class="kpi-grid">' +
            '<div class="kpi-cell"><div class="kpi-label">Total Markets</div><div class="kpi-value">' + data.total_markets + '</div></div>' +
            '<div class="kpi-cell"><div class="kpi-label">Resolved</div><div class="kpi-value">' + data.resolved_count + '</div></div>' +
            '<div class="kpi-cell"><div class="kpi-label">Open</div><div class="kpi-value">' + data.open_count + '</div></div>' +
            '<div class="kpi-cell"><div class="kpi-label">Total Opinions</div><div class="kpi-value">' + data.total_opinions + '</div></div>' +
          '</div>' +
        '</div></div>';

      // Card 1b: Research Analysis (collapsible, LLM-generated — mirrors Surface Topic Analysis)
      html += '<div class="card card-collapsible collapsed" id="analysis-card">' +
        '<div class="card-header card-header-collapsible" onclick="toggleAnalysis()">' +
          '<span class="card-title">Research Analysis</span>' +
          '<span class="collapse-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4,6 8,10 12,6"/></svg></span>' +
        '</div>' +
        '<div class="collapsible-content">' +
          '<div class="card-body">' +
            '<div class="analysis-section">' +
              '<div class="analysis-heading">Consensus</div>' +
              '<p class="analysis-paragraph placeholder" id="analysis-consensus">Loading analysis...</p>' +
            '</div>' +
            '<div class="analysis-section">' +
              '<div class="analysis-heading">Outlier Opinions</div>' +
              '<p class="analysis-paragraph placeholder" id="analysis-outliers"></p>' +
            '</div>' +
            '<div class="analysis-section">' +
              '<div class="analysis-heading">Interesting Trends</div>' +
              '<p class="analysis-paragraph placeholder" id="analysis-trends"></p>' +
            '</div>' +
            '<div class="analysis-footer">' +
              '<div class="analysis-meta" id="analysis-meta"></div>' +
              '<button class="btn-regenerate" id="analysis-regen-btn" onclick="regenerateAnalysis()" style="display:none">Regenerate</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

      // Card 2: Insight Readiness (5-stage universal rubric)
      var completedStages = data.current_stage - 1;
      var linePct = Math.min(100, Math.round((completedStages / 4) * 100));

      var stageSteps = [1,2,3,4,5].map(function(num) {
        var cls = '';
        if (num < data.current_stage) cls = ' completed';
        else if (num === data.current_stage) cls = ' active';
        return '<div class="phase-step' + cls + '">' +
          '<div class="phase-dot"><span class="phase-dot-check">&#10003;</span><span class="phase-dot-num">' + num + '</span></div>' +
          '<div class="phase-step-label">' + stageNames[num] + '</div>' +
        '</div>';
      }).join('');

      var nextThresholdText = '';
      if (data.current_stage < 3 && data.resolved_count < 10) {
        nextThresholdText = '<div style="margin-top:12px;font-size:13px;color:var(--text)">' +
          (10 - data.resolved_count) + ' more resolved markets needed for Emerging (also requires 3+ avg participation)' +
        '</div>';
      } else if (data.current_stage < 3 && data.avg_participation < 3) {
        nextThresholdText = '<div style="margin-top:12px;font-size:13px;color:var(--text)">' +
          'Avg participation is ' + data.avg_participation + ' &mdash; need 3+ to reach Emerging' +
        '</div>';
      } else if (data.current_stage < 4 && data.resolved_count < 25) {
        nextThresholdText = '<div style="margin-top:12px;font-size:13px;color:var(--text)">' +
          (25 - data.resolved_count) + ' more resolved markets needed for Converging (also requires 50%+ consensus)' +
        '</div>';
      } else if (data.current_stage < 4 && data.consensus_rate < 50) {
        nextThresholdText = '<div style="margin-top:12px;font-size:13px;color:var(--text)">' +
          'Consensus rate is ' + data.consensus_rate + '% &mdash; need 50%+ to reach Converging' +
        '</div>';
      } else if (data.current_stage < 5 && data.resolved_count < 40) {
        nextThresholdText = '<div style="margin-top:12px;font-size:13px;color:var(--text)">' +
          (40 - data.resolved_count) + ' more resolved markets needed for Synthesized' +
        '</div>';
      } else if (data.current_stage < 5 && !data.admin_confirmed) {
        nextThresholdText = '<div style="margin-top:12px;font-size:13px;color:var(--text)">Awaiting admin confirmation to reach Synthesized</div>';
      } else if (data.current_stage >= 5) {
        nextThresholdText = '<div style="margin-top:12px;font-size:13px;color:var(--green)">All insight readiness targets met</div>';
      }

      // Stage 5 admin confirmation button
      var confirmBtn = '';
      if (data.current_stage === 4 && data.resolved_count >= 40) {
        confirmBtn = '<div style="margin-top:12px"><button class="confirm-synth-btn" onclick="confirmSynthesized()">Mark as Synthesized</button></div>';
      } else if (data.current_stage === 5 && data.admin_confirmed) {
        confirmBtn = '<div style="margin-top:12px;font-size:13px;color:var(--green)">&#10003; Confirmed synthesized by admin</div>';
      }

      html += '<div class="card">' +
        '<div class="card-header"><span class="card-title">Insight Readiness</span></div>' +
        '<div class="card-body">' +
          '<div class="phase-steps">' +
            '<div class="phase-line"><div class="phase-line-fill" style="width:' + linePct + '%"></div></div>' +
            stageSteps +
          '</div>' +
          nextThresholdText +
          confirmBtn +
        '</div></div>';

      // Card 3: Markets Table
      var marketsHtml = '';
      if (data.markets.length) {
        var mRows = data.markets.map(function(m) {
          var statusCls = pillClass(m.status);
          var typeCls = m.answer_type === 'longform' ? 'pill-longform' : m.answer_type === 'single_choice' ? 'pill-single_choice' : m.answer_type === 'multi_choice' ? 'pill-multi_choice' : m.answer_type === 'ranking' ? 'pill-ranking' : m.answer_type === 'scale' ? 'pill-scale' : 'pill-binary';
          var bridgePill = m.is_bridge ? '<span class="pill pill-bridge">bridge</span>' : '';
          var majorityRaw = m.majority_position || '';
          var majority = '';
          if (!majorityRaw) {
            majority = m.answer_type === 'longform' ? '<span class="td-muted">synthesis</span>' : '<span class="td-muted">-</span>';
          } else if (majorityRaw.length > 60) {
            majority = '<span title="' + escHtml(majorityRaw) + '">' + escHtml(majorityRaw.slice(0, 60)) + '&hellip;</span>';
          } else {
            majority = escHtml(majorityRaw);
          }
          return '<tr>' +
            '<td class="td-question"><a href="/admin/market/' + m.id + '" style="color:inherit;text-decoration:none;border-bottom:1px dashed var(--border)">' + escHtml(m.question) + '</a></td>' +
            '<td><span class="pill ' + typeCls + '">' + m.answer_type + '</span></td>' +
            '<td><span class="pill ' + statusCls + '">' + m.status + '</span></td>' +
            '<td>' + bridgePill + '</td>' +
            '<td class="td-mono">' + m.opinion_count + '</td>' +
            '<td class="td-mono">' + m.participant_count + '</td>' +
            '<td style="white-space:normal;max-width:200px">' + majority + '</td>' +
            '<td class="td-muted">' + fmtDate(m.created_at) + '</td>' +
          '</tr>';
        }).join('');

        marketsHtml = '<table>' +
          '<thead><tr>' +
            '<th style="padding-left:20px">Question</th>' +
            '<th>Type</th>' +
            '<th>Status</th>' +
            '<th>Bridge</th>' +
            '<th>Opinions</th>' +
            '<th>Participants</th>' +
            '<th>Majority</th>' +
            '<th style="padding-right:20px">Created</th>' +
          '</tr></thead>' +
          '<tbody>' + mRows + '</tbody></table>';
      } else {
        marketsHtml = '<table><tbody><tr class="empty-row"><td colspan="8">No markets in this funnel yet</td></tr></tbody></table>';
      }

      html += '<div class="card">' +
        '<div class="card-header"><span class="card-title">Markets (' + data.total_markets + ')</span></div>' +
        '<div class="table-wrap">' + marketsHtml + '</div></div>';

      // Card 4: Participation Stats
      var avgOpinions = data.total_markets > 0 ? (data.total_opinions / data.total_markets).toFixed(1) : '0';
      var zeroOpinions = data.markets.filter(function(m) { return m.opinion_count === 0; }).length;

      html += '<div class="card">' +
        '<div class="card-header"><span class="card-title">Participation</span></div>' +
        '<div class="card-body">' +
          '<div class="mini-grid">' +
            '<div class="mini-cell"><div class="mini-value">' + data.total_participants + '</div><div class="mini-label">Unique agents</div></div>' +
            '<div class="mini-cell"><div class="mini-value">' + avgOpinions + '</div><div class="mini-label">Avg opinions / market</div></div>' +
            '<div class="mini-cell"><div class="mini-value">' + zeroOpinions + '</div><div class="mini-label">Markets with no opinions</div></div>' +
          '</div>' +
        '</div></div>';

      // Card 5: Statistical Insights
      var dist = data.opinion_distribution || { yes: 0, no: 0, abstain: 0, other: 0 };
      var distTotal = dist.yes + dist.no + dist.abstain + dist.other;
      var distBar = '';
      if (distTotal > 0) {
        var yesPct = Math.round((dist.yes / distTotal) * 100);
        var noPct = Math.round((dist.no / distTotal) * 100);
        var abstainPct = Math.round((dist.abstain / distTotal) * 100);
        var otherPct = 100 - yesPct - noPct - abstainPct;
        distBar = '<div style="display:flex;height:24px;border-radius:6px;overflow:hidden;margin-bottom:8px">' +
          (yesPct > 0 ? '<div style="width:' + yesPct + '%;background:var(--green);display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff" title="Yes: ' + dist.yes + '">' + (yesPct >= 8 ? yesPct + '%' : '') + '</div>' : '') +
          (noPct > 0 ? '<div style="width:' + noPct + '%;background:#e74c3c;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff" title="No: ' + dist.no + '">' + (noPct >= 8 ? noPct + '%' : '') + '</div>' : '') +
          (abstainPct > 0 ? '<div style="width:' + abstainPct + '%;background:#7f8c8d;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff" title="Abstain: ' + dist.abstain + '">' + (abstainPct >= 8 ? abstainPct + '%' : '') + '</div>' : '') +
          (otherPct > 0 ? '<div style="width:' + otherPct + '%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff" title="Other: ' + dist.other + '">' + (otherPct >= 8 ? otherPct + '%' : '') + '</div>' : '') +
        '</div>' +
        '<div style="display:flex;gap:16px;font-size:12px;color:var(--text-muted);margin-bottom:12px">' +
          '<span style="color:var(--green)">&#9632; Yes: ' + dist.yes + '</span>' +
          '<span style="color:#e74c3c">&#9632; No: ' + dist.no + '</span>' +
          '<span style="color:#7f8c8d">&#9632; Abstain: ' + dist.abstain + '</span>' +
          (dist.other > 0 ? '<span style="color:var(--accent)">&#9632; Other: ' + dist.other + '</span>' : '') +
        '</div>';
      } else {
        distBar = '<p style="color:var(--text-muted);font-size:13px">No opinions recorded yet</p>';
      }

      var consensusHtml = '<div style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">' +
          '<span style="color:var(--text)">Consensus Rate</span>' +
          '<span style="color:var(--text)">' + data.consensus_rate + '% (' + data.consensus_count + ' of ' + data.resolved_count + ' markets)</span>' +
        '</div>' +
        '<div class="progress-bar"><div class="progress-fill" style="width:' + data.consensus_rate + '%;background:' + (data.consensus_rate >= 50 ? 'var(--green)' : 'var(--accent)') + '"></div></div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">Markets where top answer has &ge; 60% share</div>' +
      '</div>';

      var topPositions = data.top_majority_positions || [];
      var positionsHtml = '';
      if (topPositions.length > 0) {
        positionsHtml = '<div style="margin-top:12px">' +
          '<div style="font-size:13px;color:var(--text);margin-bottom:8px;font-weight:600">Top Majority Positions</div>' +
          '<table class="tbl" style="width:100%"><thead><tr><th>Position</th><th style="width:60px;text-align:right">Count</th></tr></thead><tbody>' +
          topPositions.map(function(p) {
            var label = p.position.length > 80 ? p.position.substring(0, 80) + '...' : p.position;
            return '<tr><td style="font-size:12px">' + escHtml(label) + '</td><td style="text-align:right;font-size:12px">' + p.count + '</td></tr>';
          }).join('') +
          '</tbody></table></div>';
      }

      html += '<div class="card">' +
        '<div class="card-header"><span class="card-title">Statistical Insights</span></div>' +
        '<div class="card-body">' +
          '<div style="font-size:13px;color:var(--text);margin-bottom:8px;font-weight:600">Opinion Distribution</div>' +
          distBar +
          consensusHtml +
          '<div style="font-size:13px;color:var(--text);margin-bottom:4px"><strong>Avg Participation:</strong> ' + data.avg_participation + ' opinions per resolved market</div>' +
          positionsHtml +
        '</div></div>';

      document.getElementById('detail').innerHTML = html;
      loadAnalysis();
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
      if (!consensusEl) return;

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
        var res = await fetch('/admin/analytics/funnels/' + FUNNEL_ID + '/analysis', { headers: headers });
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
        var res = await fetch('/admin/analytics/funnels/' + FUNNEL_ID + '/analysis/regenerate', {
          method: 'POST',
          headers: headers,
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

    load();
  </script>
</body>
</html>`;
}

export function renderSurfaceTopicsPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — Surface-Topics</title>
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
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
    .topbar { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 32px; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
    .topbar-left { display: flex; align-items: center; gap: 16px; }
    .topbar-wordmark { font-size: 13px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.01em; }
    .topbar-divider { width: 1px; height: 18px; background: var(--border); }
    .topbar-subtitle { font-size: 13px; color: var(--text-muted); }
    .topbar-right { display: flex; align-items: center; gap: 16px; }
    .countdown { font-size: 12px; color: var(--text-muted); }
    .btn-refresh { background: var(--accent); color: #1a1816; border: none; border-radius: 4px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s; }
    .btn-refresh:hover { background: #22b888; }
    .hamburger-btn { background: none; border: none; color: var(--text-dark); font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background .15s; line-height: 1; }
    .hamburger-btn:hover { background: var(--bg); }
    .nav-dropdown { position: absolute; top: 56px; left: 0; background: var(--surface); border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 0; box-shadow: 0 8px 24px rgba(0,0,0,.4); min-width: 220px; display: none; flex-direction: column; z-index: 200; }
    .nav-dropdown.open { display: flex; }
    .nav-item { padding: 12px 20px; font-size: 14px; color: var(--text); text-decoration: none; transition: background .15s, color .15s; }
    .nav-item:hover { background: var(--bg); color: var(--text-dark); }
    .nav-item.active { color: var(--accent); font-weight: 600; }
    .nav-divider { height: 1px; background: var(--border); margin: 4px 0; }
    .main { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    .card { background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); overflow: hidden; }
    .card-header { padding: 16px 20px; border-bottom: 1px solid var(--border); }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .card-body { padding: 20px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    @media (max-width: 900px) { .grid-3 { grid-template-columns: 1fr; } }
    .funnel-card { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 16px; text-decoration: none; color: inherit; transition: border-color .15s, box-shadow .15s; display: block; }
    .funnel-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(45,212,160,.12); }
    .funnel-name { font-size: 15px; font-weight: 600; color: var(--text-dark); margin-bottom: 4px; }
    .progress-bar { background: var(--border); border-radius: 3px; height: 6px; overflow: hidden; margin-bottom: 8px; }
    .progress-fill { height: 100%; border-radius: 3px; transition: width .3s; }
    .progress-fill-p1 { background: var(--accent); }
    .progress-fill-p2 { background: var(--yellow); }
    .progress-fill-p3 { background: var(--green); }
    .funnel-stats { display: flex; gap: 12px; font-size: 12px; color: var(--text-muted); }
    .funnel-stat-value { font-weight: 700; color: var(--text-dark); }
    .pill-stage { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 3px; letter-spacing: 0.04em; }
    .pill-stage-1 { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
    .pill-stage-2 { background: var(--accent-light); color: var(--accent); }
    .pill-stage-3 { background: var(--yellow-bg); color: var(--yellow); }
    .pill-stage-4 { background: rgba(251,146,60,.1); color: #fb923c; }
    .pill-stage-5 { background: var(--green-bg); color: var(--green); }
    .pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 4px; letter-spacing: 0.02em; }
    .loading-text { color: var(--text-muted); font-size: 13px; padding: 20px 0; }
    .td-muted { color: var(--text-muted); font-size: 12px; }
    ${themeCSS}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Surface-Topics</span>
    </div>
    <div class="topbar-right">
      <span class="countdown" id="countdown"></span>
      <button class="btn-refresh" onclick="refresh()">Refresh</button>
      ${themeToggleButton}
    </div>
    <div class="nav-dropdown" id="nav-dropdown">
      <a href="/admin/dashboard" class="nav-item">Dashboard</a>
      <a href="/admin/studies" class="nav-item active">Studies</a>
      <a href="/admin/directory" class="nav-item">Agents</a>
      <a href="/admin/markets" class="nav-item">Markets</a>
      <a href="/admin/schedule" class="nav-item">Schedule</a>
      <div class="nav-divider"></div>
      <a href="/admin/pool-analyzer" class="nav-item">Pool Analyzer</a>
      <a href="/admin/cohort-analyzer" class="nav-item">Cohort Analyzer</a>
      <div class="nav-divider"></div>
      <a href="/admin/longform-queue" class="nav-item">Longform Review</a>
      <a href="/admin/markets/new" class="nav-item" style="color:var(--accent)">+ Create Market</a>
    </div>
  </div>

  <div class="main">
    <div class="card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <span class="card-title">Latest</span>
        <a href="/admin/surface-topics/new" class="btn-refresh" style="text-decoration:none;font-size:12px">+ New Surface Topic</a>
      </div>
      <div class="card-body">
        <div id="custom-topics"><p class="loading-text">Loading&hellip;</p></div>
      </div>
    </div>
  </div>

  <script>    var REFRESH_INTERVAL = 60;
    var countdown = REFRESH_INTERVAL;
    var headers = {}

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

    async function fetchData(endpoint) {
      var res = await fetch(endpoint, { headers: headers });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }

    function renderCustomTopics(data) {
      var container = document.getElementById('custom-topics');
      if (!data || !data.topics || !data.topics.length) {
        container.innerHTML = '<p class="td-muted">No custom topics yet. <a href="/admin/surface-topics/new" style="color:var(--accent)">Create one</a></p>';
        return;
      }
      var cards = data.topics.map(function(t) {
        var statusCls = t.status === 'active' ? 'pill-stage-2' : 'pill-stage-1';
        return '<a class="funnel-card" href="/admin/surface-topics/' + t.id + '">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
            '<div class="funnel-name">' + escHtml(t.name) + '</div>' +
            '<span class="pill pill-stage ' + statusCls + '">' + escHtml(t.status) + '</span>' +
          '</div>' +
          '<div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">' + escHtml(t.description).slice(0, 120) + '</div>' +
          '<div class="funnel-stats">' +
            '<span style="font-size:12px;color:var(--text-muted)">Created ' + new Date(t.created_at).toLocaleDateString() + '</span>' +
          '</div>' +
        '</a>';
      }).join('');
      container.innerHTML = '<div class="grid-3">' + cards + '</div>';
    }

    async function refresh() {
      countdown = REFRESH_INTERVAL;
      try {
        var topicData = await fetchData('/admin/analytics/surface-topics');
        renderCustomTopics(topicData);
      } catch(e) {
        console.error('Surface-Topics error:', e);
      }
    }

    setInterval(function() {
      countdown--;
      document.getElementById('countdown').textContent = 'Refreshes in ' + countdown + 's';
      if (countdown <= 0) refresh();
    }, 1000);

    refresh();
    ${themeScript}
  </script>
</body>
</html>`;
}

const STUDIES_BASE_STYLES = `
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
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  .topbar { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 32px; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
  .topbar-left { display: flex; align-items: center; gap: 16px; }
  .topbar-wordmark { font-size: 13px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.01em; }
  .topbar-divider { width: 1px; height: 18px; background: var(--border); }
  .topbar-subtitle { font-size: 13px; color: var(--text-muted); }
  .topbar-right { display: flex; align-items: center; gap: 16px; }
  .countdown { font-size: 12px; color: var(--text-muted); }
  .btn-refresh { background: var(--accent); color: #1a1816; border: none; border-radius: 4px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s; text-decoration: none; display: inline-block; }
  .btn-refresh:hover { background: #22b888; }
  .btn-secondary { background: transparent; color: var(--text-dark); border: 1px solid var(--border); border-radius: 4px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; transition: background .15s, border-color .15s; }
  .btn-secondary:hover { background: var(--bg); border-color: var(--accent); }
  .hamburger-btn { background: none; border: none; color: var(--text-dark); font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background .15s; line-height: 1; }
  .hamburger-btn:hover { background: var(--bg); }
  .nav-dropdown { position: absolute; top: 56px; left: 0; background: var(--surface); border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 0; box-shadow: 0 8px 24px rgba(0,0,0,.4); min-width: 220px; display: none; flex-direction: column; z-index: 200; }
  .nav-dropdown.open { display: flex; }
  .nav-item { padding: 12px 20px; font-size: 14px; color: var(--text); text-decoration: none; transition: background .15s, color .15s; }
  .nav-item:hover { background: var(--bg); color: var(--text-dark); }
  .nav-item.active { color: var(--accent); font-weight: 600; }
  .nav-divider { height: 1px; background: var(--border); margin: 4px 0; }
  .main { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
  .card { background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); overflow: hidden; margin-bottom: 20px; }
  .card-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .card-body { padding: 20px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  @media (max-width: 900px) { .grid-3 { grid-template-columns: 1fr; } }
  .funnel-card { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 16px; text-decoration: none; color: inherit; transition: border-color .15s, box-shadow .15s; display: block; }
  .funnel-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(45,212,160,.12); }
  .funnel-name { font-size: 15px; font-weight: 600; color: var(--text-dark); margin-bottom: 4px; }
  .progress-bar { background: var(--border); border-radius: 3px; height: 6px; overflow: hidden; margin-bottom: 8px; }
  .progress-fill { height: 100%; border-radius: 3px; transition: width .3s; }
  .progress-fill-p1 { background: var(--accent); }
  .progress-fill-p2 { background: var(--yellow); }
  .progress-fill-p3 { background: var(--green); }
  .funnel-stats { display: flex; gap: 12px; font-size: 12px; color: var(--text-muted); }
  .funnel-stat-value { font-weight: 700; color: var(--text-dark); }
  .pill-stage { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 3px; letter-spacing: 0.04em; }
  .pill-stage-1 { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
  .pill-stage-2 { background: var(--accent-light); color: var(--accent); }
  .pill-stage-3 { background: var(--yellow-bg); color: var(--yellow); }
  .pill-stage-4 { background: rgba(251,146,60,.1); color: #fb923c; }
  .pill-stage-5 { background: var(--green-bg); color: var(--green); }
  .pill-archived { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
  .pill-paused { background: var(--yellow-bg); color: var(--yellow); }
  .pill-active { background: var(--accent-light); color: var(--accent); }
  .pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 4px; letter-spacing: 0.02em; }
  .loading-text { color: var(--text-muted); font-size: 13px; padding: 20px 0; }
  .td-muted { color: var(--text-muted); font-size: 12px; }
`;

const STUDIES_NAV = `
  <div class="nav-dropdown" id="nav-dropdown">
    <a href="/admin/dashboard" class="nav-item">Dashboard</a>
    <a href="/admin/studies" class="nav-item">Studies</a>
    <a href="/admin/directory" class="nav-item">Agents</a>
    <a href="/admin/markets" class="nav-item">Markets</a>
    <a href="/admin/schedule" class="nav-item">Schedule</a>
    <div class="nav-divider"></div>
    <a href="/admin/pool-analyzer" class="nav-item">Pool Analyzer</a>
    <a href="/admin/cohort-analyzer" class="nav-item">Cohort Analyzer</a>
    <a href="/admin/markets/new" class="nav-item" style="color:var(--accent)">+ Create Market</a>
  </div>
`;

const STUDIES_NAV_TOGGLE_SCRIPT = `
  function toggleNav() { document.getElementById('nav-dropdown').classList.toggle('open'); }
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
`;

export function renderStudiesLandingPage(): string {  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — Studies</title>
  <style>
    ${STUDIES_BASE_STYLES}
    .chooser-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 8px; }
    @media (max-width: 700px) { .chooser-grid { grid-template-columns: 1fr; } }
    .chooser-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 32px; text-decoration: none; color: inherit; transition: border-color .18s, box-shadow .18s, transform .18s; display: flex; flex-direction: column; min-height: 240px; }
    .chooser-card:hover { border-color: var(--accent); box-shadow: 0 8px 24px rgba(45,212,160,.12); transform: translateY(-2px); }
    .chooser-eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); margin-bottom: 10px; }
    .chooser-title { font-size: 22px; font-weight: 700; color: var(--text-dark); margin-bottom: 12px; letter-spacing: -0.01em; }
    .chooser-desc { font-size: 14px; color: var(--text); line-height: 1.6; flex: 1; }
    .chooser-cta { font-size: 13px; font-weight: 600; color: var(--accent); margin-top: 18px; }
    .page-intro { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }
    ${themeCSS}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Studies</span>
    </div>
    <div class="topbar-right">
      ${themeToggleButton}
    </div>
    ${STUDIES_NAV.replace('class="nav-item">Studies', 'class="nav-item active">Studies')}
  </div>

  <div class="main">
    <div class="page-intro">Choose a research instrument. Funnels run autonomously and indirectly; surface topics are admin-curated probes.</div>
    <div class="chooser-grid">
      <a class="chooser-card" href="/admin/funnels">
        <div class="chooser-eyebrow">Autonomous</div>
        <div class="chooser-title">Research Funnels</div>
        <div class="chooser-desc">Long-running instruments that probe sensitive topics indirectly. Funnels generate markets autonomously every hour using camouflage rules and phased question strategies.</div>
        <div class="chooser-cta">Open Research Funnels &rarr;</div>
      </a>
      <a class="chooser-card" href="/admin/surface-topics">
        <div class="chooser-eyebrow">Admin-curated</div>
        <div class="chooser-title">Surface Topics</div>
        <div class="chooser-desc">Ad-hoc probes for asking agents about a specific topic right now. The LLM drafts question candidates and you curate which go live &mdash; fast, hands-on, single-shot research.</div>
        <div class="chooser-cta">Open Surface Topics &rarr;</div>
      </a>
    </div>
  </div>

  <script>    ${STUDIES_NAV_TOGGLE_SCRIPT}
    ${themeScript}
  </script>
</body>
</html>`;
}

export function renderFunnelsOverviewPage(): string {  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — Research Funnels</title>
  <style>
    ${STUDIES_BASE_STYLES}
    .back-link { font-size: 13px; color: var(--accent); text-decoration: none; font-weight: 600; padding: 6px 12px; border: 1px solid var(--border); border-radius: 6px; transition: background .15s; }
    .back-link:hover { background: var(--accent-light); border-color: var(--accent); }
    ${themeCSS}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <a class="back-link" href="/admin/studies">&larr; Studies</a>
      <span class="topbar-subtitle">Research Funnels</span>
    </div>
    <div class="topbar-right">
      <span class="countdown" id="countdown"></span>
      <button class="btn-refresh" onclick="refresh()">Refresh</button>
      ${themeToggleButton}
    </div>
    ${STUDIES_NAV.replace('class="nav-item">Studies', 'class="nav-item active">Studies')}
  </div>

  <div class="main">
    <div class="card">
      <div class="card-header">
        <span class="card-title">Active Funnels</span>
        <a href="/admin/funnels/manage" class="btn-refresh" style="font-size:12px">Manage Funnels</a>
      </div>
      <div class="card-body">
        <div id="funnels"><p class="loading-text">Loading&hellip;</p></div>
      </div>
    </div>
  </div>

  <script>    var REFRESH_INTERVAL = 60;
    var countdown = REFRESH_INTERVAL;
    var headers = {}
    ${STUDIES_NAV_TOGGLE_SCRIPT}

    async function fetchData(endpoint) {
      var res = await fetch(endpoint, { headers: headers });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }

    function renderFunnels(data) {
      if (!data || !data.length) {
        document.getElementById('funnels').innerHTML = '<p class="td-muted">No active funnels. <a href="/admin/funnels/manage/new" style="color:var(--accent)">Create one</a>.</p>';
        return;
      }
      var stageNames = ['','Seeded','Gathering','Emerging','Converging','Synthesized'];
      var cards = data.map(function(f) {
        var target = f.target_resolved || 40;
        var pct = Math.min(100, Math.round((f.resolved_count / target) * 100));
        var stageCls = 'pill-stage-' + f.current_stage;
        var fillCls = f.current_stage >= 5 ? 'progress-fill-p3' : f.current_stage >= 3 ? 'progress-fill-p2' : 'progress-fill-p1';
        return '<a class="funnel-card" href="/admin/funnel/' + f.funnel_id + '">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
            '<div class="funnel-name">' + escHtml(f.name) + '</div>' +
            '<span class="pill pill-stage ' + stageCls + '">' + stageNames[f.current_stage] + '</span>' +
          '</div>' +
          '<div class="progress-bar"><div class="progress-fill ' + fillCls + '" style="width:' + pct + '%"></div></div>' +
          '<div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">' + f.resolved_count + ' / ' + target + ' resolved (' + pct + '%)</div>' +
          '<div class="funnel-stats">' +
            '<span><span class="funnel-stat-value">' + f.total_markets + '</span> markets</span>' +
            '<span><span class="funnel-stat-value">' + f.total_opinions + '</span> opinions</span>' +
            '<span style="font-size:12px;color:var(--text-muted)">' + f.avg_participation + ' avg opinions/market</span>' +
          '</div>' +
        '</a>';
      }).join('');
      document.getElementById('funnels').innerHTML = '<div class="grid-3">' + cards + '</div>';
    }

    async function refresh() {
      countdown = REFRESH_INTERVAL;
      try {
        var data = await fetchData('/admin/analytics/funnels');
        renderFunnels(data);
      } catch(e) {
        console.error('Funnels overview error:', e);
      }
    }

    setInterval(function() {
      countdown--;
      document.getElementById('countdown').textContent = 'Refreshes in ' + countdown + 's';
      if (countdown <= 0) refresh();
    }, 1000);

    refresh();
    ${themeScript}
  </script>
</body>
</html>`;
}

export function renderFunnelsManagePage(): string {  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — Manage Funnels</title>
  <style>
    ${STUDIES_BASE_STYLES}
    .back-link { font-size: 13px; color: var(--accent); text-decoration: none; font-weight: 600; padding: 6px 12px; border: 1px solid var(--border); border-radius: 6px; transition: background .15s; }
    .back-link:hover { background: var(--accent-light); border-color: var(--accent); }
    .funnel-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--text-muted); margin-top: 6px; }
    .funnel-desc { font-size: 13px; color: var(--text-muted); margin-top: 6px; line-height: 1.5; }
    ${themeCSS}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <a class="back-link" href="/admin/funnels">&larr; Research Funnels</a>
      <span class="topbar-subtitle">Manage</span>
    </div>
    <div class="topbar-right">
      ${themeToggleButton}
    </div>
    ${STUDIES_NAV.replace('class="nav-item">Studies', 'class="nav-item active">Studies')}
  </div>

  <div class="main">
    <div class="card">
      <div class="card-header">
        <span class="card-title">All Research Funnels</span>
        <a href="/admin/funnels/manage/new" class="btn-refresh" style="font-size:12px">+ Create New Funnel</a>
      </div>
      <div class="card-body">
        <div id="funnels-list"><p class="loading-text">Loading&hellip;</p></div>
      </div>
    </div>
  </div>

  <script>    var headers = {}
    ${STUDIES_NAV_TOGGLE_SCRIPT}

    async function fetchData(endpoint) {
      var res = await fetch(endpoint, { headers: headers });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }

    function renderList(data) {
      var funnels = (data && data.funnels) || [];
      var container = document.getElementById('funnels-list');
      if (!funnels.length) {
        container.innerHTML = '<p class="td-muted">No funnels yet. <a href="/admin/funnels/manage/new" style="color:var(--accent)">Create the first one</a>.</p>';
        return;
      }
      var cards = funnels.map(function(f) {
        var statusCls = 'pill-' + (f.status || 'active');
        return '<a class="funnel-card" href="/admin/funnels/manage/' + encodeURIComponent(f.id) + '">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">' +
            '<div class="funnel-name">' + escHtml(f.name) + '</div>' +
            '<span class="pill ' + statusCls + '">' + escHtml(f.status || 'active') + '</span>' +
          '</div>' +
          '<div class="funnel-id">' + escHtml(f.id) + '</div>' +
          '<div class="funnel-desc">' + escHtml((f.description || '').slice(0, 140)) + '</div>' +
        '</a>';
      }).join('');
      container.innerHTML = '<div class="grid-3">' + cards + '</div>';
    }

    async function refresh() {
      try {
        var data = await fetchData('/admin/analytics/funnels-admin');
        renderList(data);
      } catch(e) {
        console.error('Manage funnels error:', e);
        document.getElementById('funnels-list').innerHTML = '<p class="td-muted">Failed to load. ' + escHtml(e.message) + '</p>';
      }
    }

    refresh();
    ${themeScript}
  </script>
</body>
</html>`;
}

export function renderMarketsPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — Markets</title>
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
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
    .topbar { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 32px; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
    .topbar-left { display: flex; align-items: center; gap: 16px; }
    .topbar-wordmark { font-size: 13px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.01em; }
    .topbar-divider { width: 1px; height: 18px; background: var(--border); }
    .topbar-subtitle { font-size: 13px; color: var(--text-muted); }
    .topbar-right { display: flex; align-items: center; gap: 16px; }
    .countdown { font-size: 12px; color: var(--text-muted); }
    .btn-refresh { background: var(--accent); color: #1a1816; border: none; border-radius: 4px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s; }
    .btn-refresh:hover { background: #22b888; }
    .hamburger-btn { background: none; border: none; color: var(--text-dark); font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background .15s; line-height: 1; }
    .hamburger-btn:hover { background: var(--bg); }
    .nav-dropdown { position: absolute; top: 56px; left: 0; background: var(--surface); border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 0; box-shadow: 0 8px 24px rgba(0,0,0,.4); min-width: 220px; display: none; flex-direction: column; z-index: 200; }
    .nav-dropdown.open { display: flex; }
    .nav-item { padding: 12px 20px; font-size: 14px; color: var(--text); text-decoration: none; transition: background .15s, color .15s; }
    .nav-item:hover { background: var(--bg); color: var(--text-dark); }
    .nav-item.active { color: var(--accent); font-weight: 600; }
    .nav-divider { height: 1px; background: var(--border); margin: 4px 0; }
    .main { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    .card { background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); overflow: hidden; }
    .card-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 4px; letter-spacing: 0.02em; }
    .pill-open { background: var(--green-bg); color: var(--green); }
    .pill-closed { background: var(--yellow-bg); color: var(--yellow); }
    .pill-resolved { background: var(--accent-light); color: var(--accent); }
    .pill-scheduled { background: rgba(167,139,250,.12); color: #a78bfa; }
    .pill-binary { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
    .pill-single_choice { background: rgba(45,212,160,.1); color: var(--accent); }
    .pill-multi_choice { background: rgba(59,130,246,.1); color: #3b82f6; }
    .pill-ranking { background: rgba(245,158,11,.1); color: #f59e0b; }
    .pill-scale { background: rgba(236,72,153,.1); color: #ec4899; }
    .pill-longform { background: rgba(167,139,250,.1); color: #a78bfa; }
    .pill-filter { border: 1px solid var(--border); background: transparent; color: var(--text-muted); transition: all .15s; }
    .pill-filter:hover { border-color: var(--text); color: var(--text); }
    .pill-filter-active { background: var(--accent-light); color: var(--accent); border-color: var(--accent); }
    .pill-filter-system.pill-filter-active { background: var(--green-bg); color: var(--green); border-color: var(--green); }
    .pill-filter-admin.pill-filter-active { background: var(--yellow-bg); color: var(--yellow); border-color: var(--yellow); }
    .pill-filter-agent.pill-filter-active { background: rgba(167,139,250,.12); color: #a78bfa; border-color: #a78bfa; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 10px 16px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); border-bottom: 1px solid var(--border); cursor: pointer; user-select: none; white-space: nowrap; transition: color .15s; }
    thead th:first-child { padding-left: 20px; }
    thead th:last-child { padding-right: 20px; }
    thead th:hover { color: var(--text-dark); }
    thead th.sorted { color: var(--accent); }
    tbody td { padding: 13px 16px; font-size: 13px; color: var(--text); border-bottom: 1px solid var(--border); white-space: nowrap; }
    tbody td:first-child { padding-left: 20px; }
    tbody td:last-child { padding-right: 20px; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: var(--bg); }
    .td-question { white-space: normal; max-width: 320px; font-weight: 500; color: var(--text-dark); }
    .td-majority { white-space: normal; max-width: 200px; font-size: 13px; }
    .td-truncate { cursor: help; }
    .td-mono { font-variant-numeric: tabular-nums; }
    .td-muted { color: var(--text-muted); font-size: 12px; }
    .empty-row td { text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px; }
    .loading-text { color: var(--text-muted); font-size: 13px; padding: 20px 0; }
    ${themeCSS}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Markets</span>
    </div>
    <div class="topbar-right">
      <span class="countdown" id="countdown"></span>
      <a href="/admin/markets/new" class="btn-refresh" style="text-decoration:none;background:none;border:1px solid var(--accent);color:var(--accent);">+ Create Market</a>
      <button class="btn-refresh" onclick="refresh()">Refresh</button>
      ${themeToggleButton}
    </div>
    <div class="nav-dropdown" id="nav-dropdown">
      <a href="/admin/dashboard" class="nav-item">Dashboard</a>
      <a href="/admin/studies" class="nav-item">Studies</a>
      <a href="/admin/directory" class="nav-item">Agents</a>
      <a href="/admin/markets" class="nav-item active">Markets</a>
      <a href="/admin/schedule" class="nav-item">Schedule</a>
      <div class="nav-divider"></div>
      <a href="/admin/pool-analyzer" class="nav-item">Pool Analyzer</a>
      <a href="/admin/cohort-analyzer" class="nav-item">Cohort Analyzer</a>
      <div class="nav-divider"></div>
      <a href="/admin/longform-queue" class="nav-item">Longform Review</a>
      <a href="/admin/markets/new" class="nav-item" style="color:var(--accent)">+ Create Market</a>
    </div>
  </div>

  <div class="main">
    <div class="card">
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="card-title">Markets</span>
          <div style="display:flex;gap:6px">
            <button class="pill pill-filter pill-filter-active" style="cursor:pointer" onclick="setCreatorFilter('')" id="filter-all">All</button>
            <button class="pill pill-filter pill-filter-system" style="cursor:pointer" onclick="setCreatorFilter('system')" id="filter-system">System</button>
            <button class="pill pill-filter pill-filter-admin" style="cursor:pointer" onclick="setCreatorFilter('admin')" id="filter-admin">Admin</button>
            <button class="pill pill-filter pill-filter-agent" style="cursor:pointer" onclick="setCreatorFilter('agent')" id="filter-agent">Agent</button>
          </div>
        </div>
      </div>
      <div class="table-wrap">
        <div id="markets"><p class="loading-text" style="padding:20px">Loading&hellip;</p></div>
      </div>
    </div>
  </div>

  <script>    var REFRESH_INTERVAL = 60;
    var countdown = REFRESH_INTERVAL;
    var marketSort = 'created_at';
    var creatorFilter = '';
    var lastMarketsData = null;
    var marketsPage = 0;
    var PAGE_SIZE = 10;
    var headers = {}

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
      if (!dateStr) return '<span class="td-muted">never</span>';
      var diff = Date.now() - new Date(dateStr).getTime();
      var mins = Math.floor(diff / 60000);
      if (mins < 60) return '<span class="td-muted">' + mins + 'm ago</span>';
      var hrs = Math.floor(mins / 60);
      if (hrs < 24) return '<span class="td-muted">' + hrs + 'h ago</span>';
      return '<span class="td-muted">' + Math.floor(hrs / 24) + 'd ago</span>';
    }

    async function fetchData(endpoint) {
      var res = await fetch(endpoint, { headers: headers });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }

    function setCreatorFilter(filter) {
      creatorFilter = filter;
      marketsPage = 0;
      ['all','system','admin','agent'].forEach(function(f) {
        var el = document.getElementById('filter-' + f);
        if (el) {
          if (f === (filter || 'all')) {
            el.classList.add('pill-filter-active');
          } else {
            el.classList.remove('pill-filter-active');
          }
        }
      });
      refresh();
    }

    function sortMarketCol(key) {
      marketSort = key;
      marketsPage = 0;
      refresh();
    }

    function mth(label, key) {
      var cls = marketSort === key ? ' class="sorted"' : '';
      return '<th' + cls + ' onclick="sortMarketCol(\\'' + key + '\\')">' + label + '</th>';
    }

    function renderPagination(currentPage, totalItems, setPageFn) {
      var totalPages = Math.ceil(totalItems / PAGE_SIZE);
      if (totalPages <= 1) return '';
      var start = currentPage * PAGE_SIZE + 1;
      var end = Math.min((currentPage + 1) * PAGE_SIZE, totalItems);
      var prevDisabled = currentPage === 0 ? ' disabled' : '';
      var nextDisabled = currentPage >= totalPages - 1 ? ' disabled' : '';
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;font-size:13px;color:var(--text-muted);border-top:1px solid var(--border)">' +
        '<span>Showing ' + start + '\\u2013' + end + ' of ' + totalItems + '</span>' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<button onclick="' + setPageFn + '(' + (currentPage - 1) + ')" style="background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:4px 12px;border-radius:4px;cursor:pointer;font-size:13px"' + prevDisabled + '>\\u2039 Prev</button>' +
          '<span>Page ' + (currentPage + 1) + ' of ' + totalPages + '</span>' +
          '<button onclick="' + setPageFn + '(' + (currentPage + 1) + ')" style="background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:4px 12px;border-radius:4px;cursor:pointer;font-size:13px"' + nextDisabled + '>Next \\u203a</button>' +
        '</div>' +
      '</div>';
    }

    function setMarketsPage(page) {
      marketsPage = page;
      if (lastMarketsData) renderMarkets(lastMarketsData);
    }

    function renderMarkets(data) {
      lastMarketsData = data;
      if (!data.markets.length) {
        document.getElementById('markets').innerHTML =
          '<table><tbody><tr class="empty-row"><td colspan="9">No markets yet</td></tr></tbody></table>';
        return;
      }
      var totalItems = data.markets.length;
      var totalPages = Math.ceil(totalItems / PAGE_SIZE);
      if (marketsPage >= totalPages) marketsPage = totalPages - 1;
      var pageItems = data.markets.slice(marketsPage * PAGE_SIZE, (marketsPage + 1) * PAGE_SIZE);
      var rows = pageItems.map(function(m) {
        var statusCls = m.status === 'open' ? 'pill-open' : m.status === 'resolved' ? 'pill-resolved' : m.status === 'scheduled' ? 'pill-scheduled' : 'pill-closed';
        var answerType = m.answer_type || 'binary';
        var typeCls = answerType === 'longform' ? 'pill-longform' : answerType === 'single_choice' ? 'pill-single_choice' : answerType === 'multi_choice' ? 'pill-multi_choice' : answerType === 'ranking' ? 'pill-ranking' : answerType === 'scale' ? 'pill-scale' : 'pill-binary';
        var majorityRaw = m.majority_position || '';
        var majority = '';
        if (!majorityRaw) {
          majority = answerType === 'longform' ? '<span class="td-muted">synthesis</span>' : '<span class="td-muted">-</span>';
        } else if (majorityRaw.length > 60) {
          majority = '<span class="td-truncate" title="' + escHtml(majorityRaw) + '">' + escHtml(majorityRaw.slice(0, 60)) + '&hellip;</span>';
        } else {
          majority = escHtml(majorityRaw);
        }
        var dl = m.deadline ? new Date(m.deadline).toLocaleString() : '-';
        var created = new Date(m.created_at).toLocaleString();
        var creatorLabel = m.creator_type === 'system' ? 'System' : m.creator_type === 'admin' ? 'Admin' : m.creator_type === 'agent' ? 'Agent' : '<span class="td-muted">-</span>';
        return '<tr>' +
          '<td class="td-question"><a href="/admin/market/' + m.id + '" style="color:inherit;text-decoration:none;border-bottom:1px dashed #3d3533">' + escHtml(m.question) + '</a></td>' +
          '<td><span class="pill ' + typeCls + '">' + answerType + '</span></td>' +
          '<td><span class="pill ' + statusCls + '">' + m.status + '</span></td>' +
          '<td>' + creatorLabel + '</td>' +
          '<td class="td-mono">' + m.participant_count + '</td>' +
          '<td class="td-majority">' + majority + '</td>' +
          '<td class="td-muted">' + dl + '</td>' +
          '<td class="td-muted">' + created + '</td>' +
        '</tr>';
      }).join('');

      document.getElementById('markets').innerHTML =
        '<table>' +
          '<thead><tr>' +
            '<th style="padding-left:20px">Question</th>' +
            mth('Type', 'answer_type') +
            mth('Status', 'status') +
            '<th>Creator</th>' +
            mth('Participants', 'participants') +
            '<th>Majority</th>' +
            mth('Deadline', 'deadline') +
            mth('Created', 'created_at') +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
        renderPagination(marketsPage, totalItems, 'setMarketsPage');
    }

    async function refresh() {
      countdown = REFRESH_INTERVAL;
      try {
        var data = await fetchData('/admin/analytics/markets?sort=' + marketSort + (creatorFilter ? '&creator_type=' + creatorFilter : ''));
        renderMarkets(data);
      } catch(e) {
        console.error('Markets error:', e);
      }
    }

    setInterval(function() {
      countdown--;
      document.getElementById('countdown').textContent = 'Refreshes in ' + countdown + 's';
      if (countdown <= 0) refresh();
    }, 1000);

    refresh();
    ${themeScript}
  </script>
</body>
</html>`;
}
