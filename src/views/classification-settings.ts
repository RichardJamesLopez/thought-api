import { adminNavCSS, adminNavScript, renderAdminNav } from './admin-nav.js';
import { themeCSS, themeToggleButton, themeScript } from './theme.js';
import { brandTitle, PRODUCT_NAME } from '../branding.js';

export function renderClassificationSettings(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandTitle("Settings")}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #1a1816;
      --surface: #292524;
      --border: #3d3533;
      --shadow: 0 2px 8px rgba(0,0,0,.25);
      --text: #a8a29e;
      --text-dark: #fafaf9;
      --text-muted: #78716c;
      --accent: #2dd4a0;
      --accent-light: rgba(45,212,160,.08);
      --green: #2dd4a0;
      --green-bg: rgba(45,212,160,.08);
      --yellow: #d97706;
      --yellow-bg: rgba(217,119,6,.08);
      --red: #dc2626;
      --red-bg: rgba(220,38,38,.06);
    }
    ${themeCSS}
    ${adminNavCSS}
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; }
    .topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 32px; height: 56px; background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; }
    .topbar-left { display: flex; align-items: center; gap: 12px; }
    .topbar-wordmark { font-weight: 700; font-size: 14px; color: var(--text-dark); text-decoration: none; }
    .topbar-divider { width: 1px; height: 18px; background: var(--border); }
    .topbar-page { font-size: 13px; color: var(--text-muted); font-weight: 500; }
    .topbar-right { display: flex; align-items: center; gap: 12px; }

    .container { max-width: 900px; margin: 32px auto; padding: 0 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 22px; font-weight: 700; color: var(--text-dark); margin-bottom: 6px; }
    .page-header p { font-size: 14px; color: var(--text-muted); }

    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; box-shadow: var(--shadow); margin-bottom: 24px; }
    .card-header { padding: 16px 20px; border-bottom: 1px solid var(--border); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .card-body { padding: 20px; }

    .threshold-table { width: 100%; border-collapse: collapse; }
    .threshold-table th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); padding: 8px 12px; border-bottom: 1px solid var(--border); }
    .threshold-table td { padding: 12px; border-bottom: 1px solid var(--border); font-size: 14px; color: var(--text); vertical-align: middle; }
    .threshold-table tr:last-child td { border-bottom: none; }
    .threshold-table .label-cell { font-weight: 500; color: var(--text-dark); }
    .threshold-table .desc-cell { font-size: 13px; color: var(--text-muted); }
    .threshold-table .key-cell { font-family: monospace; font-size: 12px; color: var(--text-muted); }

    .threshold-input {
      width: 80px; padding: 6px 10px; font-size: 14px; border: 1px solid var(--border); border-radius: 4px;
      background: var(--bg); color: var(--text-dark); text-align: right; outline: none;
      transition: border-color .15s, box-shadow .15s;
    }
    .threshold-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(45,212,160,.15); }

    .btn { padding: 6px 14px; font-size: 13px; font-weight: 600; border: none; border-radius: 4px; cursor: pointer; transition: background .15s, opacity .15s; }
    .btn-save { background: var(--accent); color: #1a1816; }
    .btn-save:hover { opacity: 0.9; }
    .btn-save:disabled { opacity: 0.4; cursor: default; }
    .btn-recompute { background: var(--yellow); color: #1a1816; padding: 10px 20px; font-size: 14px; }
    .btn-recompute:hover { opacity: 0.9; }
    .btn-recompute:disabled { opacity: 0.4; cursor: default; }

    .status-msg { display: inline-block; margin-left: 12px; font-size: 13px; font-weight: 500; opacity: 0; transition: opacity .3s; }
    .status-msg.show { opacity: 1; }
    .status-msg.success { color: var(--green); }
    .status-msg.error { color: var(--red); }

    .recompute-section { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .recompute-result { font-size: 14px; color: var(--text); }

    .loading { text-align: center; padding: 40px; color: var(--text-muted); font-size: 14px; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">${PRODUCT_NAME}</a>
      <span class="topbar-divider"></span>
      <span class="topbar-page">Classification Settings</span>
    </div>
    <div class="topbar-right">
      ${themeToggleButton}
    </div>
    ${renderAdminNav('settings')}
  </div>

  <div class="container">
    <div class="page-header">
      <h1>Settings</h1>
      <p>Configure platform defaults and classification thresholds.</p>
    </div>

    <div class="card">
      <div class="card-header">Market Funding Defaults</div>
      <div class="card-body">
        <p style="font-size:14px;color:var(--text-muted);margin-bottom:12px;">Configure defaults applied to new markets and scheduled sessions.</p>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
          <label style="min-width:180px;color:var(--text-muted);font-size:13px;">Default reward pool</label>
          <input id="default-funding-input" class="threshold-input" type="number" min="1" max="500" step="1" />
          <button class="btn btn-save" onclick="saveDefaultFunding()">Save Default</button>
          <span class="status-msg" id="default-funding-status"></span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <label style="min-width:180px;color:var(--text-muted);font-size:13px;">Max admin funding</label>
          <input id="max-funding-input" class="threshold-input" type="number" min="1" max="5000" step="1" />
          <button class="btn btn-save" onclick="saveMaxFunding()">Save Max</button>
          <span class="status-msg" id="max-funding-status"></span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">Thresholds</div>
      <div class="card-body" id="thresholds-body">
        <div class="loading">Loading thresholds...</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">Recompute Classifications</div>
      <div class="card-body">
        <p style="font-size:14px;color:var(--text-muted);margin-bottom:16px;">
          Recompute all agent classifications using current threshold values. Only stale agents (with new opinions) will be updated.
        </p>
        <div class="recompute-section">
          <button class="btn btn-recompute" id="btn-recompute" onclick="recomputeAll()">Recompute All Classifications</button>
          <span id="recompute-result" class="recompute-result"></span>
        </div>
      </div>
    </div>
  </div>

  <script>
    ${themeScript}
    ${adminNavScript}
    var headers = { 'Content-Type': 'application/json' };

    function escHtml(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    async function loadThresholds() {
      try {
        var res = await fetch('/admin/analytics/thresholds', { headers: headers });
        var data = await res.json();
        renderThresholds(data.thresholds);
      } catch (e) {
        document.getElementById('thresholds-body').innerHTML = '<div class="loading" style="color:var(--red)">Failed to load thresholds</div>';
      }
    }

    function renderThresholds(thresholds) {
      var html = '<table class="threshold-table"><thead><tr><th>Label</th><th>Key</th><th>Value</th><th>Description</th><th></th><th></th></tr></thead><tbody>';
      for (var i = 0; i < thresholds.length; i++) {
        var t = thresholds[i];
        html += '<tr id="row-' + escHtml(t.key) + '">'
          + '<td class="label-cell">' + escHtml(t.label) + '</td>'
          + '<td class="key-cell">' + escHtml(t.key) + '</td>'
          + '<td><input class="threshold-input" type="number" min="0" max="100" step="1" value="' + escHtml(t.value) + '" data-key="' + escHtml(t.key) + '" data-original="' + escHtml(t.value) + '" /></td>'
          + '<td class="desc-cell">' + escHtml(t.description || '') + '</td>'
          + '<td><button class="btn btn-save" onclick="saveThreshold(\\'' + escHtml(t.key) + '\\')">Save</button></td>'
          + '<td><span class="status-msg" id="status-' + escHtml(t.key) + '"></span></td>'
          + '</tr>';
      }
      html += '</tbody></table>';
      document.getElementById('thresholds-body').innerHTML = html;
    }

    async function loadDefaultFunding() {
      try {
        var res = await fetch('/admin/analytics/settings/default-market-funding', { headers: headers });
        var data = await res.json();
        if (res.ok && data.value) {
          document.getElementById('default-funding-input').value = data.value;
        }
      } catch (e) {
        document.getElementById('default-funding-status').textContent = 'Failed to load';
        document.getElementById('default-funding-status').className = 'status-msg error show';
      }
    }

    async function loadMaxFunding() {
      try {
        var res = await fetch('/admin/analytics/settings/max-admin-market-funding', { headers: headers });
        var data = await res.json();
        if (res.ok && data.value) {
          document.getElementById('max-funding-input').value = data.value;
          document.getElementById('default-funding-input').max = data.value;
        }
      } catch (e) {
        document.getElementById('max-funding-status').textContent = 'Failed to load';
        document.getElementById('max-funding-status').className = 'status-msg error show';
      }
    }

    async function saveDefaultFunding() {
      var input = document.getElementById('default-funding-input');
      var statusEl = document.getElementById('default-funding-status');
      var value = parseInt(input.value);
      if (isNaN(value) || value < 1) {
        statusEl.textContent = 'Must be a positive integer';
        statusEl.className = 'status-msg error show';
        setTimeout(function() { statusEl.className = 'status-msg'; }, 3000);
        return;
      }
      try {
        var res = await fetch('/admin/analytics/settings/default-market-funding', {
          method: 'PATCH',
          headers: headers,
          body: JSON.stringify({ value: value })
        });
        var data = await res.json();
        if (data.ok) {
          statusEl.textContent = 'Saved';
          statusEl.className = 'status-msg success show';
        } else {
          statusEl.textContent = data.error || 'Failed';
          statusEl.className = 'status-msg error show';
        }
      } catch (e) {
        statusEl.textContent = 'Network error';
        statusEl.className = 'status-msg error show';
      }
      setTimeout(function() { statusEl.className = 'status-msg'; }, 3000);
    }

    async function saveMaxFunding() {
      var input = document.getElementById('max-funding-input');
      var statusEl = document.getElementById('max-funding-status');
      var value = parseInt(input.value);
      if (isNaN(value) || value < 1) {
        statusEl.textContent = 'Must be a positive integer';
        statusEl.className = 'status-msg error show';
        setTimeout(function() { statusEl.className = 'status-msg'; }, 3000);
        return;
      }
      try {
        var res = await fetch('/admin/analytics/settings/max-admin-market-funding', {
          method: 'PATCH',
          headers: headers,
          body: JSON.stringify({ value: value })
        });
        var data = await res.json();
        if (data.ok) {
          statusEl.textContent = 'Saved';
          statusEl.className = 'status-msg success show';
          document.getElementById('default-funding-input').max = value;
        } else {
          statusEl.textContent = data.error || 'Failed';
          statusEl.className = 'status-msg error show';
        }
      } catch (e) {
        statusEl.textContent = 'Network error';
        statusEl.className = 'status-msg error show';
      }
      setTimeout(function() { statusEl.className = 'status-msg'; }, 3000);
    }

    async function saveThreshold(key) {
      var input = document.querySelector('input[data-key="' + key + '"]');
      var statusEl = document.getElementById('status-' + key);
      var value = parseFloat(input.value);
      if (isNaN(value) || value < 0 || value > 100) {
        statusEl.textContent = 'Must be 0-100';
        statusEl.className = 'status-msg error show';
        setTimeout(function() { statusEl.className = 'status-msg error'; }, 3000);
        return;
      }
      try {
        var res = await fetch('/admin/analytics/thresholds/' + encodeURIComponent(key), {
          method: 'PATCH',
          headers: headers,
          body: JSON.stringify({ value: value })
        });
        var data = await res.json();
        if (data.ok) {
          statusEl.textContent = 'Saved';
          statusEl.className = 'status-msg success show';
          input.setAttribute('data-original', String(value));
        } else {
          statusEl.textContent = data.error || 'Failed';
          statusEl.className = 'status-msg error show';
        }
      } catch (e) {
        statusEl.textContent = 'Network error';
        statusEl.className = 'status-msg error show';
      }
      setTimeout(function() { statusEl.className = 'status-msg'; }, 3000);
    }

    async function recomputeAll() {
      var btn = document.getElementById('btn-recompute');
      var resultEl = document.getElementById('recompute-result');

      if (!confirm('Recompute all agent classifications? This may take a moment.')) return;

      btn.disabled = true;
      btn.textContent = 'Computing...';
      resultEl.textContent = '';

      try {
        var res = await fetch('/admin/analytics/classifications/recompute', {
          method: 'POST',
          headers: headers
        });
        var data = await res.json();
        if (data.ok) {
          resultEl.textContent = data.recomputed + ' updated, ' + data.skipped + ' unchanged';
          resultEl.style.color = 'var(--green)';
        } else {
          resultEl.textContent = 'Error: ' + (data.error || 'unknown');
          resultEl.style.color = 'var(--red)';
        }
      } catch (e) {
        resultEl.textContent = 'Network error';
        resultEl.style.color = 'var(--red)';
      }
      btn.disabled = false;
      btn.textContent = 'Recompute All Classifications';
    }

    loadDefaultFunding();
    loadMaxFunding();
    loadThresholds();
  </script>
</body>
</html>`;
}
