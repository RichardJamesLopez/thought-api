import { adminNavScript, renderAdminNav } from './admin-nav.js';
import { themeToggleButton, themeScript } from './theme.js';
import { funnelFormStyles, funnelFormFields, funnelFormScript } from './funnel-form.js';
import { brandTitle, PRODUCT_NAME } from '../branding.js';

export function renderFunnelCreator(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandTitle("New Research Funnel")}</title>
  <style>${funnelFormStyles}</style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">${PRODUCT_NAME}</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">New Research Funnel</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <a href="/admin/funnels/manage" class="back-link">&larr; Manage Funnels</a>
      ${themeToggleButton}
    </div>
    ${renderAdminNav('studies')}
  </div>

  <div class="main">
    <div id="alert-error" class="alert alert-error"></div>

    <div class="methodology-note">
      <strong>Research Funnels</strong> drive the autonomous market generator. Each funnel encodes a methodology: a hidden insight goal, three phases of LLM guidance, forbidden terms (hard-blocked from outputs), and camouflage categories. The generator runs hourly and rotates across active funnels.
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Define Research Funnel</span>
      </div>
      <div class="card-body">
        <form id="funnel-form" onsubmit="return false;">
          ${funnelFormFields}
          <div class="button-row">
            <a href="/admin/funnels/manage" class="back-link">Cancel</a>
            <button type="submit" class="btn-submit" id="submit-btn" onclick="submitFunnel()">Create Funnel</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <script>
    ${themeScript}
    ${adminNavScript}    ${funnelFormScript}

    async function submitFunnel() {
      var btn = document.getElementById('submit-btn');
      var errEl = document.getElementById('alert-error');
      errEl.style.display = 'none';

      var payload;
      try {
        payload = readForm();
      } catch (validationErr) {
        errEl.textContent = validationErr.message;
        errEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Creating...';

      try {
        var res = await fetch('/admin/analytics/funnels-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        var data = await res.json();
        if (!res.ok) {
          errEl.textContent = data.error || 'Failed to create funnel';
          errEl.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Create Funnel';
          return;
        }
        window.location.href = '/admin/funnels/manage/' + encodeURIComponent(data.funnel.id);
      } catch (err) {
        errEl.textContent = 'Network error: ' + err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Create Funnel';
      }
    }

    attachMixListeners();
  </script>
</body>
</html>`;
}
