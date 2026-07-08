import { adminNavScript, renderAdminNav } from './admin-nav.js';
import { themeToggleButton, themeScript } from './theme.js';
import { funnelFormStyles, funnelFormFields, funnelFormScript } from './funnel-form.js';

export function renderFunnelEditor(apiKey: string, funnelId: string): string {
  const safeKey = JSON.stringify(apiKey);
  const safeFunnelId = JSON.stringify(funnelId);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — Edit Research Funnel</title>
  <style>${funnelFormStyles}</style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Edit Research Funnel</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <a href="/admin/funnels/manage" class="back-link">&larr; Manage Funnels</a>
      ${themeToggleButton}
    </div>
    ${renderAdminNav('studies')}
  </div>

  <div class="main">
    <div id="alert-error" class="alert alert-error"></div>
    <div id="alert-success" class="alert alert-success"></div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Edit Research Funnel</span>
      </div>
      <div class="card-body">
        <form id="funnel-form" onsubmit="return false;">
          ${funnelFormFields}

          <div class="form-group">
            <label class="form-label" for="status">Status</label>
            <select id="status" class="form-select">
              <option value="active">Active &mdash; included in autonomous generation</option>
              <option value="paused">Paused &mdash; not generated, but analytics still tracked</option>
              <option value="archived">Archived &mdash; hidden from overview, historical markets preserved</option>
            </select>
          </div>

          <div class="button-row">
            <button type="button" class="btn-archive" id="archive-btn" onclick="archiveFunnel()">Archive</button>
            <button type="submit" class="btn-submit" id="submit-btn" onclick="saveFunnel()">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <script>
    ${themeScript}
    ${adminNavScript}
    var API_KEY = ${safeKey};
    var FUNNEL_ID = ${safeFunnelId};
    var headers = { 'Authorization': 'Bearer ' + API_KEY };
    ${funnelFormScript}

    function showError(msg) {
      var errEl = document.getElementById('alert-error');
      errEl.textContent = msg;
      errEl.style.display = 'block';
      document.getElementById('alert-success').style.display = 'none';
    }
    function showSuccess(msg) {
      var ok = document.getElementById('alert-success');
      ok.textContent = msg;
      ok.style.display = 'block';
      document.getElementById('alert-error').style.display = 'none';
    }

    async function loadFunnel() {
      try {
        var res = await fetch('/admin/analytics/funnels-admin/' + encodeURIComponent(FUNNEL_ID), { headers: headers });
        if (!res.ok) {
          showError('Failed to load funnel: HTTP ' + res.status);
          return;
        }
        var data = await res.json();
        fillForm(data.funnel);
      } catch (err) {
        showError('Network error: ' + err.message);
      }
    }

    async function saveFunnel() {
      var btn = document.getElementById('submit-btn');
      var payload;
      try {
        payload = readForm();
      } catch (validationErr) {
        showError(validationErr.message);
        return;
      }
      delete payload.id; // immutable
      payload.status = document.getElementById('status').value;
      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        var res = await fetch('/admin/analytics/funnels-admin/' + encodeURIComponent(FUNNEL_ID), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },
          body: JSON.stringify(payload),
        });
        var data = await res.json();
        if (!res.ok) {
          showError(data.error || 'Failed to save');
          btn.disabled = false;
          btn.textContent = 'Save Changes';
          return;
        }
        showSuccess('Saved.');
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      } catch (err) {
        showError('Network error: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    }

    async function archiveFunnel() {
      if (!confirm('Archive this funnel? It will stop generating new markets but historical data is preserved. You can re-activate it later by editing the status.')) return;
      var btn = document.getElementById('archive-btn');
      btn.disabled = true;
      btn.textContent = 'Archiving...';
      try {
        var res = await fetch('/admin/analytics/funnels-admin/' + encodeURIComponent(FUNNEL_ID), {
          method: 'DELETE',
          headers: headers,
        });
        var data = await res.json();
        if (!res.ok) {
          showError(data.error || 'Failed to archive');
          btn.disabled = false;
          btn.textContent = 'Archive';
          return;
        }
        window.location.href = '/admin/funnels/manage';
      } catch (err) {
        showError('Network error: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Archive';
      }
    }

    attachMixListeners();
    loadFunnel();
  </script>
</body>
</html>`;
}
