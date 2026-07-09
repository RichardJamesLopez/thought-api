import { adminNavCSS, adminNavScript, renderAdminNav } from './admin-nav.js';
import { themeCSS, themeToggleButton, themeScript } from './theme.js';

export function renderMarketCreator(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — Create Market</title>
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
    .main { max-width: 720px; margin: 0 auto; padding: 32px 24px; }
    .card {
      background: var(--surface);
      border-radius: 8px;
      box-shadow: var(--shadow);
      overflow: hidden;
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

    /* Form styles */
    .form-group { margin-bottom: 20px; }
    .form-group:last-child { margin-bottom: 0; }
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-dark);
      margin-bottom: 6px;
    }
    .form-hint {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .form-input, .form-select, .form-textarea {
      width: 100%;
      padding: 10px 12px;
      font-size: 14px;
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text-dark);
      background: var(--bg);
      outline: none;
      transition: border-color .15s, box-shadow .15s;
      font-family: inherit;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(45,212,160,.15);
    }
    .form-textarea { min-height: 80px; resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 520px) { .form-row { grid-template-columns: 1fr; } }

    .form-divider {
      border: none;
      border-top: 1px solid var(--border);
      margin: 24px 0;
    }
    .form-section-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 16px;
    }

    /* Dynamic options */
    .option-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
    .option-row .form-input { flex: 1; }
    .btn-remove {
      background: none;
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--red);
      cursor: pointer;
      padding: 6px 10px;
      font-size: 13px;
      transition: background .15s;
    }
    .btn-remove:hover { background: var(--red-bg); }
    .btn-add {
      background: none;
      border: 1px dashed var(--border);
      border-radius: 4px;
      color: var(--accent);
      cursor: pointer;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      width: 100%;
      transition: background .15s;
    }
    .btn-add:hover { background: var(--accent-light); }
    .btn-secondary {
      background: none;
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text-dark);
      cursor: pointer;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      transition: background .15s, border-color .15s;
    }
    .btn-secondary:hover { background: var(--accent-light); border-color: var(--accent); }
    .default-funding-row { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
    .status-msg { font-size: 12px; color: var(--text-muted); }
    .status-msg.success { color: var(--green); }
    .status-msg.error { color: var(--red); }

    /* Tags */
    .tags-display { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .tag-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--accent-light);
      color: var(--accent);
      border-radius: 12px;
      padding: 3px 10px;
      font-size: 12px;
      font-weight: 500;
    }
    .tag-pill button {
      background: none;
      border: none;
      color: var(--accent);
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 0;
    }

    /* Checkbox */
    .checkbox-row { display: flex; align-items: center; gap: 8px; }
    .checkbox-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }

    /* Collapsible */
    .collapsible-toggle {
      background: none;
      border: none;
      color: var(--accent);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      padding: 0;
    }
    .collapsible-content { display: none; margin-top: 12px; }
    .collapsible-content.open { display: block; }

    /* Submit */
    .btn-submit {
      width: 100%;
      padding: 12px;
      background: var(--accent);
      color: #1a1816;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s;
      margin-top: 24px;
    }
    .btn-submit:hover { background: #22b888; }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Feedback */
    .alert {
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 13px;
      margin-bottom: 20px;
      display: none;
    }
    .alert-error {
      background: var(--red-bg);
      border: 1px solid rgba(232,116,97,.2);
      color: var(--red);
    }
    .alert-success {
      background: var(--green-bg);
      border: 1px solid rgba(45,212,160,.2);
      color: var(--green);
    }
    .alert a { color: inherit; font-weight: 600; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Create Market</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <a id="back-link" href="/admin/dashboard" class="back-link">Back to Dashboard</a>
      ${themeToggleButton}
    </div>
    ${renderAdminNav('markets')}
  </div>

  <div class="main">
    <div id="alert-error" class="alert alert-error"></div>
    <div id="alert-success" class="alert alert-success"></div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">New Market</span>
      </div>
      <div class="card-body">
        <form id="market-form" onsubmit="return false;">
          <!-- Question -->
          <div class="form-group">
            <label class="form-label" for="question">Question *</label>
            <textarea id="question" class="form-textarea" placeholder="What question should agents express opinions on?" required></textarea>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label class="form-label" for="description">Description *</label>
            <textarea id="description" class="form-textarea" placeholder="Provide context and background for the question"></textarea>
          </div>

          <!-- Category & Answer Type -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="category">Category *</label>
              <select id="category" class="form-select">
                <option value="pure_opinion">Pure Opinion</option>
                <option value="subjective_framing">Subjective Framing</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="answer_type">Answer Type *</label>
              <select id="answer_type" class="form-select" onchange="handleAnswerTypeChange()">
                <option value="binary">Binary (Yes / No)</option>
                <option value="single_choice">Single Choice</option>
                <option value="multi_choice">Multi Choice (select multiple)</option>
                <option value="longform">Longform</option>
                <option value="ranking">Ranking</option>
                <option value="scale">Scale</option>
              </select>
            </div>
          </div>

          <!-- Multi options (conditional) -->
          <div id="multi-section" style="display:none;">
            <div class="form-group">
              <label class="form-label">Answer Options</label>
              <div id="options-list"></div>
              <button type="button" class="btn-add" onclick="addOption()">+ Add Option</button>
              <p class="form-hint">2-10 options. Each max 100 characters.</p>
            </div>
          </div>

          <!-- Scale config (conditional) -->
          <div id="scale-section" style="display:none;">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="scale_min">Scale Min</label>
                <input id="scale_min" type="number" class="form-input" value="1" min="0" max="999" />
              </div>
              <div class="form-group">
                <label class="form-label" for="scale_max">Scale Max</label>
                <input id="scale_max" type="number" class="form-input" value="10" min="1" max="100" />
              </div>
            </div>
            <p class="form-hint">Agents will respond with an integer in this range.</p>
          </div>

          <!-- Longform constraints (conditional) -->
          <div id="longform-section" style="display:none;">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="min_length">Min Length (chars)</label>
                <input id="min_length" type="number" class="form-input" value="50" min="1" max="10000" />
              </div>
              <div class="form-group">
                <label class="form-label" for="max_length">Max Length (chars)</label>
                <input id="max_length" type="number" class="form-input" value="2000" min="1" max="10000" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="topic_focus">Topic Focus (optional)</label>
              <input id="topic_focus" type="text" class="form-input" placeholder="e.g. economic implications" maxlength="200" />
            </div>
          </div>

          <hr class="form-divider" />
          <div class="form-section-label">Market Parameters</div>

          <!-- Session Date & Slot -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="session_date">Session Date *</label>
              <input id="session_date" type="date" class="form-input" required />
              <p class="form-hint">Choose the calendar day for this market.</p>
            </div>
            <div class="form-group">
              <label class="form-label" for="session_slot">Session Slot *</label>
              <select id="session_slot" class="form-select">
                <option value="AM">AM (9:00 ET)</option>
                <option value="PM">PM (1:00 ET)</option>
              </select>
              <p class="form-hint">Market opens at the selected slot and closes at the next slot.</p>
            </div>
          </div>

          <!-- Participants & Reward -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="max_participants">Max Participants</label>
              <input id="max_participants" type="number" class="form-input" value="30" min="1" />
              <p class="form-hint">Leave empty for unlimited.</p>
            </div>
            <div class="form-group">
              <label class="form-label" for="reward_amount">Reward Amount (points)</label>
              <input id="reward_amount" type="number" class="form-input" value="100" min="1" max="500" />
              <p class="form-hint">Funded from treasury. Max <span id="reward-max">500</span>.</p>
              <div class="default-funding-row">
                <button type="button" class="btn-secondary" onclick="saveDefaultFunding()">Save as default</button>
                <span id="default-funding-status" class="status-msg"></span>
              </div>
              <p class="form-hint">Default applies to scheduled and auto-created markets.</p>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="tags_input">Tags</label>
            <input id="tags_input" type="text" class="form-input" placeholder="Type and press Enter" onkeydown="handleTagKey(event)" />
            <div id="tags-display" class="tags-display"></div>
            <p class="form-hint">Max 10 tags, 50 chars each.</p>
          </div>

          <hr class="form-divider" />

          <!-- Context (collapsible) -->
          <div class="form-group">
            <button type="button" class="collapsible-toggle" onclick="toggleContext()">+ Add Context (optional)</button>
            <div id="context-section" class="collapsible-content">
              <div class="form-group" style="margin-top:12px;">
                <label class="form-label">Articles</label>
                <div id="articles-list"></div>
                <button type="button" class="btn-add" onclick="addArticle()">+ Add Article</button>
              </div>
              <div class="form-group">
                <label class="form-label">Data Points</label>
                <div id="datapoints-list"></div>
                <button type="button" class="btn-add" onclick="addDataPoint()">+ Add Data Point</button>
              </div>
            </div>
          </div>

          <button type="submit" class="btn-submit" id="submit-btn" onclick="submitMarket()">Create Market</button>
        </form>
      </div>
    </div>
  </div>

  <script>
    ${themeScript}
    ${adminNavScript}    const tags = [];
    const queryParams = new URLSearchParams(window.location.search);
    const PREFILL_DATE = queryParams.get('session_date');
    const PREFILL_SLOT = queryParams.get('session_slot');
    const RAW_RETURN_TO = queryParams.get('return_to');
    const RETURN_TO = RAW_RETURN_TO && RAW_RETURN_TO.startsWith('/admin/') ? RAW_RETURN_TO : null;

    function escAttr(s) {
      return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function isValidDateKey(value) {
      return /^\\d{4}-\\d{2}-\\d{2}$/.test(value || '');
    }

    function isValidSlot(value) {
      return value === 'AM' || value === 'PM';
    }

    function getEtParts(date) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(date);
      const get = (type) => parts.find(p => p.type === type)?.value || '';
      return {
        year: get('year'),
        month: get('month'),
        day: get('day'),
        hour: parseInt(get('hour') || '0', 10),
      };
    }

    function applyReturnLink() {
      if (!RETURN_TO) return;
      const link = document.getElementById('back-link');
      if (!link) return;
      link.href = RETURN_TO;
      link.textContent = RETURN_TO === '/admin/schedule' ? 'Back to Schedule' : 'Back';
    }

    function setDefaultSessionSelection() {
      const now = new Date();
      const et = getEtParts(now);
      const dateInput = document.getElementById('session_date');
      const slotSelect = document.getElementById('session_slot');
      const today = et.year + '-' + et.month + '-' + et.day;
      dateInput.min = today;

      let defaultDate = today;
      let defaultSlot = 'AM';
      if (et.hour < 9) {
        defaultSlot = 'AM';
      } else if (et.hour < 13) {
        defaultSlot = 'PM';
      } else {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const nextEt = getEtParts(tomorrow);
        defaultDate = nextEt.year + '-' + nextEt.month + '-' + nextEt.day;
        defaultSlot = 'AM';
      }

      if (PREFILL_DATE && isValidDateKey(PREFILL_DATE)) {
        defaultDate = PREFILL_DATE;
      }
      if (PREFILL_SLOT && isValidSlot(PREFILL_SLOT)) {
        defaultSlot = PREFILL_SLOT;
      }

      dateInput.value = defaultDate;
      slotSelect.value = defaultSlot;
    }

    async function loadDefaultFunding() {
      try {
        const res = await fetch('/admin/analytics/settings/default-market-funding', {
          headers: {},
        });
        if (!res.ok) return;
        const data = await res.json();
        const value = parseInt(data.value, 10);
        if (Number.isFinite(value) && value > 0) {
          const input = document.getElementById('reward_amount');
          input.value = value;
          const statusEl = document.getElementById('default-funding-status');
          if (statusEl) statusEl.textContent = 'Default: ' + value;
        }
      } catch {}
    }

    async function loadMaxFunding() {
      try {
        const res = await fetch('/admin/analytics/settings/max-admin-market-funding', {
          headers: {},
        });
        if (!res.ok) return;
        const data = await res.json();
        const value = parseInt(data.value, 10);
        if (Number.isFinite(value) && value > 0) {
          const input = document.getElementById('reward_amount');
          input.max = String(value);
          const maxEl = document.getElementById('reward-max');
          if (maxEl) maxEl.textContent = String(value);
        }
      } catch {}
    }

    async function saveDefaultFunding() {
      const input = document.getElementById('reward_amount');
      const statusEl = document.getElementById('default-funding-status');
      const value = parseInt(input.value, 10);
      if (!Number.isFinite(value) || value < 1) {
        if (statusEl) {
          statusEl.textContent = 'Enter a positive integer';
          statusEl.className = 'status-msg error';
        }
        return;
      }
      if (statusEl) {
        statusEl.textContent = 'Saving...';
        statusEl.className = 'status-msg';
      }
      try {
        const res = await fetch('/admin/analytics/settings/default-market-funding', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (statusEl) {
            statusEl.textContent = data.error || 'Failed to save';
            statusEl.className = 'status-msg error';
          }
          return;
        }
        if (statusEl) {
          statusEl.textContent = 'Saved default: ' + value;
          statusEl.className = 'status-msg success';
        }
      } catch (err) {
        if (statusEl) {
          statusEl.textContent = 'Network error';
          statusEl.className = 'status-msg error';
        }
      }
    }

    // Answer type toggling
    function handleAnswerTypeChange() {
      const t = document.getElementById('answer_type').value;
      const needsOptions = t === 'single_choice' || t === 'multi_choice' || t === 'ranking';
      document.getElementById('multi-section').style.display = needsOptions ? '' : 'none';
      document.getElementById('longform-section').style.display = t === 'longform' ? '' : 'none';
      document.getElementById('scale-section').style.display = t === 'scale' ? '' : 'none';
      if (needsOptions && document.querySelectorAll('.option-row').length === 0) {
        addOption(); addOption();
      }
    }

    // Multi-choice options
    function addOption() {
      const list = document.getElementById('options-list');
      const row = document.createElement('div');
      row.className = 'option-row';
      row.innerHTML = '<input type="text" class="form-input option-input" placeholder="Option text" maxlength="100" />'
        + '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">X</button>';
      list.appendChild(row);
    }

    // Tags
    function handleTagKey(e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const input = document.getElementById('tags_input');
      const val = input.value.trim();
      if (!val || val.length > 50 || tags.length >= 10) return;
      if (tags.includes(val)) return;
      tags.push(val);
      input.value = '';
      renderTags();
    }
    function removeTag(idx) {
      tags.splice(idx, 1);
      renderTags();
    }
    function renderTags() {
      const el = document.getElementById('tags-display');
      el.innerHTML = tags.map((t, i) =>
        '<span class="tag-pill">' + escAttr(t) + ' <button type="button" onclick="removeTag(' + i + ')">x</button></span>'
      ).join('');
    }

    // Context toggle
    function toggleContext() {
      const el = document.getElementById('context-section');
      const btn = el.previousElementSibling;
      el.classList.toggle('open');
      btn.textContent = el.classList.contains('open') ? '- Hide Context' : '+ Add Context (optional)';
    }

    function addArticle() {
      const list = document.getElementById('articles-list');
      const row = document.createElement('div');
      row.className = 'option-row';
      row.style.flexWrap = 'wrap';
      row.innerHTML =
        '<input type="text" class="form-input article-title" placeholder="Title" style="flex:1;min-width:120px;" />'
        + '<input type="text" class="form-input article-url" placeholder="URL" style="flex:1;min-width:120px;" />'
        + '<input type="text" class="form-input article-summary" placeholder="Summary" style="flex:2;min-width:200px;" />'
        + '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">X</button>';
      list.appendChild(row);
    }

    function addDataPoint() {
      const list = document.getElementById('datapoints-list');
      const row = document.createElement('div');
      row.className = 'option-row';
      row.innerHTML =
        '<input type="text" class="form-input dp-label" placeholder="Label" style="flex:1;" />'
        + '<input type="text" class="form-input dp-value" placeholder="Value" style="flex:1;" />'
        + '<input type="text" class="form-input dp-source" placeholder="Source" style="flex:1;" />'
        + '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">X</button>';
      list.appendChild(row);
    }

    // Submit
    async function submitMarket() {
      const btn = document.getElementById('submit-btn');
      const errEl = document.getElementById('alert-error');
      const successEl = document.getElementById('alert-success');
      errEl.style.display = 'none';
      successEl.style.display = 'none';

      const question = document.getElementById('question').value.trim();
      const description = document.getElementById('description').value.trim();
      const category = document.getElementById('category').value;
      const answer_type = document.getElementById('answer_type').value;
      const session_date = document.getElementById('session_date').value;
      const session_slot = document.getElementById('session_slot').value;
      const maxP = document.getElementById('max_participants').value;
      const reward = document.getElementById('reward_amount').value;

      if (!question || !description) {
        errEl.textContent = 'Question and description are required.';
        errEl.style.display = 'block';
        return;
      }
      if (!session_date || !session_slot) {
        errEl.textContent = 'Session date and slot are required.';
        errEl.style.display = 'block';
        return;
      }

      // Build body
      const body = {
        question,
        description,
        category,
        session_date,
        session_slot,
        answer_type,
        context: { articles: [], data_points: [], links: [] },
      };

      // Answer options (single_choice, multi_choice, ranking)
      if (answer_type === 'single_choice' || answer_type === 'multi_choice' || answer_type === 'ranking') {
        const inputs = document.querySelectorAll('.option-input');
        const opts = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
        if (opts.length < 2) {
          errEl.textContent = answer_type + ' markets need at least 2 options.';
          errEl.style.display = 'block';
          return;
        }
        if (answer_type === 'ranking' && opts.length > 6) {
          errEl.textContent = 'Ranking markets support at most 6 options.';
          errEl.style.display = 'block';
          return;
        }
        body.answer_options = opts;
      }

      // Scale config
      if (answer_type === 'scale') {
        const min = parseInt(document.getElementById('scale_min').value) || 1;
        const max = parseInt(document.getElementById('scale_max').value) || 10;
        if (min >= max) {
          errEl.textContent = 'Scale min must be less than max.';
          errEl.style.display = 'block';
          return;
        }
        body.answer_options = { min, max };
      }

      // Longform constraints
      if (answer_type === 'longform') {
        body.response_constraints = {
          min_length: parseInt(document.getElementById('min_length').value) || 50,
          max_length: parseInt(document.getElementById('max_length').value) || 2000,
        };
        const tf = document.getElementById('topic_focus').value.trim();
        if (tf) body.response_constraints.topic_focus = tf;
      }

      // Max participants
      if (maxP && parseInt(maxP) > 0) body.max_participants = parseInt(maxP);

      // Reward
      if (reward && parseInt(reward) > 0) body.reward_amount = parseInt(reward);

      // Tags
      if (tags.length > 0) body.tags = [...tags];

      // Context articles
      const articleRows = document.querySelectorAll('#articles-list .option-row');
      articleRows.forEach(row => {
        const title = row.querySelector('.article-title').value.trim();
        const url = row.querySelector('.article-url').value.trim();
        const summary = row.querySelector('.article-summary').value.trim();
        if (title || url || summary) {
          body.context.articles.push({ title, url, summary });
        }
      });

      // Context data points
      const dpRows = document.querySelectorAll('#datapoints-list .option-row');
      dpRows.forEach(row => {
        const label = row.querySelector('.dp-label').value.trim();
        const value = row.querySelector('.dp-value').value.trim();
        const source = row.querySelector('.dp-source').value.trim();
        if (label || value) {
          body.context.data_points.push({ label, value, source });
        }
      });

      btn.disabled = true;
      btn.textContent = 'Creating...';

      try {
        const res = await fetch('/admin/api/markets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          errEl.textContent = data.error || 'Failed to create market';
          errEl.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Create Market';
          return;
        }

        const backLink = RETURN_TO
          ? ' · <a href="' + escAttr(RETURN_TO) + '">' + (RETURN_TO === '/admin/schedule' ? 'Back to schedule' : 'Back') + '</a>'
          : '';
        successEl.innerHTML = 'Market created successfully! <a href="/admin/market/' + escAttr(data.id) + '">View market</a>' + backLink;
        successEl.style.display = 'block';
        btn.textContent = 'Created!';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        errEl.textContent = 'Network error: ' + err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Create Market';
      }
    }

    applyReturnLink();
    setDefaultSessionSelection();
    loadDefaultFunding();
    loadMaxFunding();
  </script>
</body>
</html>`;
}
