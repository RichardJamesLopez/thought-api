/**
 * Admin page for the longform PII review queue.
 *
 * The page is a thin client of GET /admin/api/longform-queue and POST
 * /admin/api/longform/:id/{approve,reject}. Server only renders the shell;
 * the table is populated by client-side JS so admins can switch between
 * pending / approved / rejected without a full reload.
 */
import { themeCSS, themeToggleButton, themeScript } from './theme.js';
import { adminNavCSS, adminNavScript, renderAdminNav } from './admin-nav.js';
import { brandTitle, PRODUCT_NAME } from '../branding.js';

export function renderLongformQueuePage(): string {  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brandTitle("Longform Review")}</title>
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; margin: 0; background: var(--bg); color: var(--text); font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
    .topbar { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 32px; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
    .topbar-left { display: flex; align-items: center; gap: 16px; }
    .topbar-wordmark { font-size: 13px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.01em; }
    .topbar-divider { width: 1px; height: 18px; background: var(--border); }
    .topbar-subtitle { font-size: 13px; color: var(--text-muted); }
    .topbar-right { display: flex; align-items: center; gap: 16px; }
    ${adminNavCSS}
    main { padding: 24px 32px; max-width: 1280px; margin: 0 auto; }
    h1 { margin: 0 0 8px; font-size: 24px; font-weight: 700; color: var(--text-dark); }
    .sub { color: var(--text-muted); margin-bottom: 16px; font-size: 14px; }
    .filters { display: flex; gap: 8px; margin-bottom: 16px; }
    .filters button { padding: 6px 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 6px; cursor: pointer; font-size: 13px; font-family: inherit; transition: background .15s, border-color .15s, color .15s; }
    .filters button:hover { border-color: var(--accent); color: var(--text-dark); }
    .filters button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
    .tab-bar { display: flex; gap: 0; margin: 12px 0 16px; border-bottom: 1px solid var(--border); }
    .tab-bar button { padding: 10px 16px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 14px; font-weight: 600; font-family: inherit; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color .15s, border-color .15s; }
    .tab-bar button:hover { color: var(--text-dark); }
    .tab-bar button.active { color: var(--text-dark); border-bottom-color: var(--accent); }
    .question-cell { max-width: 540px; }
    .question-text { color: var(--text-dark); font-weight: 500; }
    .question-desc { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
    .funnel-cell { font-size: 12px; color: var(--accent); }
    table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px 12px; text-align: left; vertical-align: top; font-size: 13px; }
    th { background: var(--bg); border-bottom: 1px solid var(--border); font-weight: 600; color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
    tr + tr td { border-top: 1px solid var(--border); }
    .answer-cell { max-width: 480px; }
    .answer-raw { color: var(--text-dark); white-space: pre-wrap; word-break: break-word; }
    .answer-redacted { color: var(--accent); white-space: pre-wrap; word-break: break-word; margin-top: 4px; font-size: 12px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge-pending { background: var(--yellow-bg); color: var(--yellow); }
    .badge-approved { background: var(--green-bg); color: var(--green); }
    .badge-rejected { background: var(--red-bg); color: var(--red); }
    .findings { font-size: 11px; color: var(--text-muted); }
    .findings .cat { display: inline-block; margin-right: 4px; padding: 1px 6px; border-radius: 4px; background: var(--accent-light); color: var(--accent); }
    .actions { white-space: nowrap; }
    .actions button { padding: 4px 10px; margin-right: 4px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit; transition: opacity .15s; }
    .actions button:hover { opacity: 0.85; }
    .btn-approve { background: var(--green); color: #fff; }
    .btn-reject { background: var(--red); color: #fff; }
    .empty { padding: 32px; text-align: center; color: var(--text-muted); }
    .err { color: var(--red); padding: 12px; background: var(--red-bg); border: 1px solid var(--red); border-radius: 6px; margin-bottom: 12px; display: none; }
    tr.age-warn td { background: rgba(245,158,11,.06); }
    tr.age-stale td { background: rgba(232,116,97,.06); }
    .age-cell { font-variant-numeric: tabular-nums; white-space: nowrap; font-size: 12px; color: var(--text-muted); }
    tr.age-warn .age-cell { color: var(--yellow); font-weight: 600; }
    tr.age-stale .age-cell { color: var(--red); font-weight: 600; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">${PRODUCT_NAME}</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Longform Review</span>
    </div>
    <div class="topbar-right">
      ${themeToggleButton}
    </div>
    ${renderAdminNav('longform')}
  </div>
  <main>
    <h1>Longform Review</h1>
    <div class="tab-bar" id="tab-bar">
      <button data-tab="answers" class="active">Answer Review</button>
      <button data-tab="questions">Question Review</button>
    </div>
    <p class="sub" id="sub-answers">
      Longform answers with soft PII findings (LOCATION, ORG, OTHER) wait here before
      they count toward aggregate results. Hard PII (EMAIL, PHONE, SSN, CREDIT_CARD,
      PERSON) is rejected at submit and never reaches the queue.
    </p>
    <p class="sub" id="sub-questions" style="display:none">
      Longform questions auto-generated by research funnels wait here for editorial
      approval before they get scheduled into AM/PM sessions. Approved drafts are
      placed into the next under-filled session on the following scheduler tick.
    </p>
    <div class="err" id="err"></div>
    <div class="filters" id="filters">
      <button data-status="pending" class="active">Pending</button>
      <button data-status="approved">Approved</button>
      <button data-status="rejected">Rejected</button>
      <button data-status="all">All</button>
    </div>
    <div id="content">
      <div class="empty">Loading…</div>
    </div>
  </main>

  <script>
    ${adminNavScript}
    ${themeScript}

    async function api(path, opts) {
      const res = await fetch(path, {
        headers: { 'Content-Type': 'application/json' },
        ...opts,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error('HTTP ' + res.status + ': ' + text);
      }
      return res.json();
    }

    function escapeHtml(s) {
      return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function formatAge(createdAt) {
      if (!createdAt) return { label: '—', tier: 'fresh' };
      const ageMs = Date.now() - new Date(createdAt).getTime();
      if (!isFinite(ageMs) || ageMs < 0) return { label: '—', tier: 'fresh' };
      const mins = Math.floor(ageMs / 60000);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      let label;
      if (days >= 1) label = days + 'd ' + (hours - days * 24) + 'h';
      else if (hours >= 1) label = hours + 'h';
      else label = mins + 'm';
      const tier = ageMs >= 24 * 3600 * 1000 ? 'stale'
        : ageMs >= 6 * 3600 * 1000 ? 'warn'
        : 'fresh';
      return { label: label, tier: tier };
    }

    function renderRow(item) {
      const findings = (item.pii_findings && item.pii_findings.findings) || [];
      const findingsHtml = findings.length
        ? findings.map(f => '<span class="cat">' + escapeHtml(f.category) + '</span> ' + escapeHtml(f.span)).join(' · ')
        : '<em>no findings</em>';
      const stateClass = item.review_state === 'pending' ? 'badge-pending'
        : item.review_state === 'approved' ? 'badge-approved' : 'badge-rejected';
      const actions = item.review_state === 'pending'
        ? '<button class="btn-approve" data-action="approve" data-id="' + escapeHtml(item.opinion_id) + '">Approve</button>' +
          '<button class="btn-reject" data-action="reject" data-id="' + escapeHtml(item.opinion_id) + '">Reject</button>'
        : '<span style="color:var(--text-muted)">—</span>';
      const age = formatAge(item.created_at);
      // Only color-code pending rows by age — actioned rows don't need the signal.
      const rowClass = item.review_state === 'pending' && age.tier !== 'fresh' ? ' class="age-' + age.tier + '"' : '';
      return '<tr' + rowClass + '>' +
        '<td><span class="badge ' + stateClass + '">' + escapeHtml(item.review_state) + '</span></td>' +
        '<td class="age-cell">' + escapeHtml(age.label) + '</td>' +
        '<td>' + escapeHtml(item.market_question || item.market_id) + '</td>' +
        '<td>' + escapeHtml(item.agent_handle || item.agent_id) + ' <small style="color:var(--text-muted)">(' + escapeHtml(item.agent_type || 'untagged') + ')</small></td>' +
        '<td class="answer-cell">' +
          '<div class="answer-raw">' + escapeHtml(item.answer) + '</div>' +
          (item.redacted_answer ? '<div class="answer-redacted">redacted: ' + escapeHtml(item.redacted_answer) + '</div>' : '') +
          '<div class="findings">' + findingsHtml + '</div>' +
        '</td>' +
        '<td class="actions">' + actions + '</td>' +
        '</tr>';
    }

    function renderQuestionRow(item) {
      const stateClass = item.status === 'draft' ? 'badge-pending'
        : item.status === 'approved' ? 'badge-approved'
        : item.status === 'rejected' ? 'badge-rejected' : 'badge-approved';
      const actions = item.status === 'draft'
        ? '<button class="btn-approve" data-action="approve" data-id="' + escapeHtml(item.id) + '">Approve</button>' +
          '<button class="btn-reject" data-action="reject" data-id="' + escapeHtml(item.id) + '">Reject</button>'
        : '<span style="color:var(--text-muted)">—</span>';
      const age = formatAge(item.created_at);
      const rowClass = item.status === 'draft' && age.tier !== 'fresh' ? ' class="age-' + age.tier + '"' : '';
      return '<tr' + rowClass + '>' +
        '<td><span class="badge ' + stateClass + '">' + escapeHtml(item.status) + '</span></td>' +
        '<td class="age-cell">' + escapeHtml(age.label) + '</td>' +
        '<td class="funnel-cell">' + escapeHtml(item.funnel_name || item.funnel_id) + '</td>' +
        '<td class="question-cell">' +
          '<div class="question-text">' + escapeHtml(item.question) + '</div>' +
          '<div class="question-desc">' + escapeHtml(item.description) + '</div>' +
        '</td>' +
        '<td class="actions">' + actions + '</td>' +
        '</tr>';
    }

    // Map UI filter status to API status per tab. Answers use pending/approved/rejected/all;
    // questions use draft/approved/rejected/all (draft is the "pending" equivalent).
    function mapStatusForTab(tab, status) {
      if (tab === 'questions') {
        if (status === 'pending') return 'draft';
        return status;
      }
      return status;
    }

    async function load(tab, status) {
      const errEl = document.getElementById('err');
      errEl.style.display = 'none';
      const apiStatus = mapStatusForTab(tab, status);
      const endpoint = tab === 'questions'
        ? '/admin/api/longform-question-queue?status=' + encodeURIComponent(apiStatus)
        : '/admin/api/longform-queue?status=' + encodeURIComponent(apiStatus);
      try {
        const data = await api(endpoint);
        const root = document.getElementById('content');
        if (!data.items.length) {
          root.innerHTML = '<div class="empty">No items in this state.</div>';
          return;
        }
        if (tab === 'questions') {
          root.innerHTML =
            '<table><thead><tr>' +
              '<th>Status</th><th>Age</th><th>Funnel</th><th>Question</th><th>Actions</th>' +
            '</tr></thead><tbody>' +
              data.items.map(renderQuestionRow).join('') +
            '</tbody></table>';
        } else {
          root.innerHTML =
            '<table><thead><tr>' +
              '<th>State</th><th>Age</th><th>Market</th><th>Agent</th><th>Answer + Findings</th><th>Actions</th>' +
            '</tr></thead><tbody>' +
              data.items.map(renderRow).join('') +
            '</tbody></table>';
        }
      } catch (e) {
        errEl.textContent = String(e);
        errEl.style.display = 'block';
      }
    }

    let currentTab = 'answers';
    let currentStatus = 'pending';

    document.getElementById('tab-bar').addEventListener('click', e => {
      const btn = e.target.closest('button[data-tab]');
      if (!btn) return;
      currentTab = btn.dataset.tab;
      [...document.querySelectorAll('#tab-bar button')].forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('sub-answers').style.display = currentTab === 'answers' ? '' : 'none';
      document.getElementById('sub-questions').style.display = currentTab === 'questions' ? '' : 'none';
      load(currentTab, currentStatus);
    });

    document.getElementById('filters').addEventListener('click', e => {
      const btn = e.target.closest('button[data-status]');
      if (!btn) return;
      currentStatus = btn.dataset.status;
      [...document.querySelectorAll('#filters button')].forEach(b => b.classList.toggle('active', b === btn));
      load(currentTab, currentStatus);
    });

    document.getElementById('content').addEventListener('click', async e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      btn.disabled = true;
      try {
        const endpoint = currentTab === 'questions'
          ? '/admin/api/longform-question/' + encodeURIComponent(id) + '/' + action
          : '/admin/api/longform/' + encodeURIComponent(id) + '/' + action;
        await api(endpoint, { method: 'POST' });
        await load(currentTab, currentStatus);
      } catch (err) {
        const errEl = document.getElementById('err');
        errEl.textContent = String(err);
        errEl.style.display = 'block';
        btn.disabled = false;
      }
    });

    load(currentTab, currentStatus);
  </script>
</body>
</html>`;
}
