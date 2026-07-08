import { adminNavCSS } from './admin-nav.js';
import { themeCSS } from './theme.js';

export const funnelFormStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --bg: #1a1816; --surface: #292524; --border: #3d3533;
    --shadow: 0 2px 8px rgba(0,0,0,.3), 0 1px 3px rgba(0,0,0,.2);
    --text: #a8a29e; --text-dark: #fafaf9; --text-muted: #78716c;
    --accent: #2dd4a0; --accent-light: rgba(45,212,160,.1);
    --green: #2dd4a0; --green-bg: rgba(45,212,160,.1);
    --red: #e87461; --red-bg: rgba(232,116,97,.1);
    --yellow: #f59e0b; --yellow-bg: rgba(245,158,11,.1);
  }
  ${themeCSS}
  ${adminNavCSS}
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  .topbar { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 32px; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
  .topbar-left { display: flex; align-items: center; gap: 16px; }
  .topbar-wordmark { font-size: 13px; font-weight: 700; color: var(--text-dark); letter-spacing: -0.01em; }
  .topbar-divider { width: 1px; height: 18px; background: var(--border); }
  .topbar-subtitle { font-size: 13px; color: var(--text-muted); }
  .back-link { font-size: 14px; color: var(--accent); text-decoration: none; font-weight: 600; padding: 8px 14px; border: 1px solid var(--border); border-radius: 8px; transition: background .15s, border-color .15s; }
  .back-link:hover { background: var(--accent-light); border-color: var(--accent); }
  .main { max-width: 760px; margin: 0 auto; padding: 32px 24px; }
  .card { background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); overflow: hidden; margin-bottom: 20px; }
  .card-header { padding: 16px 20px; border-bottom: 1px solid var(--border); }
  .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .card-body { padding: 20px; }
  .form-group { margin-bottom: 20px; }
  .form-group:last-child { margin-bottom: 0; }
  .form-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-dark); margin-bottom: 6px; }
  .form-hint { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
  .form-input, .form-textarea, .form-select { width: 100%; padding: 10px 12px; font-size: 14px; border: 1px solid var(--border); border-radius: 4px; color: var(--text-dark); background: var(--bg); outline: none; transition: border-color .15s, box-shadow .15s; font-family: inherit; }
  .form-input:focus, .form-textarea:focus, .form-select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(45,212,160,.15); }
  .form-input:disabled { opacity: 0.6; cursor: not-allowed; }
  .form-textarea { min-height: 80px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
  .form-textarea-large { min-height: 140px; }
  .btn-submit { padding: 11px 20px; background: var(--accent); color: #1a1816; border: none; border-radius: 4px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s; }
  .btn-submit:hover { background: #22b888; }
  .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-archive { padding: 11px 20px; background: transparent; color: var(--red); border: 1px solid var(--red); border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s; }
  .btn-archive:hover { background: var(--red-bg); }
  .button-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 24px; flex-wrap: wrap; }
  .alert { padding: 12px 16px; border-radius: 4px; font-size: 13px; margin-bottom: 20px; display: none; }
  .alert-error { background: var(--red-bg); border: 1px solid rgba(232,116,97,.2); color: var(--red); }
  .alert-success { background: var(--green-bg); border: 1px solid rgba(45,212,160,.2); color: var(--green); }
  .methodology-note { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 14px 16px; margin-bottom: 20px; font-size: 13px; color: var(--text-muted); line-height: 1.6; }
  .methodology-note strong { color: var(--text); }
  .phase-block { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 14px 16px; margin-bottom: 12px; }
  .phase-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); margin-bottom: 8px; }
`;

export const funnelFormFields = `
  <div class="form-group">
    <label class="form-label" for="id">Funnel ID *</label>
    <input id="id" class="form-input" type="text" placeholder="e.g. cost_of_living" required maxlength="40" pattern="[a-z][a-z0-9_]{2,40}" />
    <p class="form-hint">Lowercase identifier (a-z, 0-9, underscore). Used in URLs and market tags. Cannot be changed later.</p>
  </div>

  <div class="form-group">
    <label class="form-label" for="name">Internal Name *</label>
    <input id="name" class="form-input" type="text" placeholder="e.g. Cost of Living &amp; Economic Perception" required maxlength="200" />
    <p class="form-hint">Descriptive label used in admin views.</p>
  </div>

  <div class="form-group">
    <label class="form-label" for="display_insight_name">Public Insight Name *</label>
    <input id="display_insight_name" class="form-input" type="text" placeholder="e.g. Inflation Perceptibility" required maxlength="100" />
    <p class="form-hint">Shorter user-facing label shown on the funnel analytics page.</p>
  </div>

  <div class="form-group">
    <label class="form-label" for="description">Description *</label>
    <textarea id="description" class="form-textarea" placeholder="Lifestyle choices, daily routines, spending tradeoffs..." required maxlength="500"></textarea>
    <p class="form-hint">Domain context shown to the LLM during generation.</p>
  </div>

  <div class="form-group">
    <label class="form-label" for="insight_goal">Insight Goal *</label>
    <textarea id="insight_goal" class="form-textarea" placeholder="What hidden insight are we trying to surface? Never shown to agents." required maxlength="500"></textarea>
    <p class="form-hint">The hidden research question. Drives generation but is never shown to agents or users.</p>
  </div>

  <div class="form-group">
    <label class="form-label" for="example_topics">Example Topics</label>
    <textarea id="example_topics" class="form-textarea form-textarea-large" placeholder="One topic per line, e.g.&#10;cooking at home vs eating out frequency&#10;repair vs replace attitudes"></textarea>
    <p class="form-hint">Seed angles for the LLM (one per line, ≤ 50 entries).</p>
  </div>

  <div class="form-group">
    <label class="form-label">Generation Guidance — Phased Guidance *</label>
    <p class="form-hint" style="margin-top:0;margin-bottom:10px">Three phases of LLM guidance. Phase 1 runs first, then Phase 2, then Phase 3 — based on how many markets the funnel has produced.</p>
    <div class="phase-block">
      <div class="phase-label">Phase 1 &mdash; Peripheral</div>
      <textarea id="phase1" class="form-textarea form-textarea-large" placeholder="What questions and framing to use in the first ~15 markets..." required maxlength="2000"></textarea>
    </div>
    <div class="phase-block">
      <div class="phase-label">Phase 2 &mdash; Scenario</div>
      <textarea id="phase2" class="form-textarea form-textarea-large" placeholder="Mid-funnel scenarios that reveal latent attitudes..." required maxlength="2000"></textarea>
    </div>
    <div class="phase-block">
      <div class="phase-label">Phase 3 &mdash; Convergent</div>
      <textarea id="phase3" class="form-textarea form-textarea-large" placeholder="Final convergent questions narrowing toward the insight..." required maxlength="2000"></textarea>
    </div>
  </div>

  <div class="form-group">
    <label class="form-label" for="forbidden_terms">Forbidden Terms</label>
    <textarea id="forbidden_terms" class="form-textarea" placeholder="One term per line, e.g.&#10;inflation&#10;CPI&#10;Federal Reserve"></textarea>
    <p class="form-hint">Hard block: any generated question containing these terms is rejected (case-insensitive).</p>
  </div>

  <div class="form-group">
    <label class="form-label" for="camouflage_categories">Camouflage Categories</label>
    <textarea id="camouflage_categories" class="form-textarea" placeholder="One category per line, e.g.&#10;society_culture&#10;philosophy_ethics&#10;pure_opinion"></textarea>
    <p class="form-hint">Surface categories the LLM may pick from. Used to disguise the true research intent.</p>
  </div>

  <div class="form-group">
    <label class="form-label" for="target_resolved">Target Resolved Markets *</label>
    <input id="target_resolved" class="form-input" type="number" min="1" max="500" step="1" value="40" required inputmode="numeric" />
    <p class="form-hint">The scheduler stops generating new markets/drafts for this funnel once this many have resolved. Whole number between 1 and 500.</p>
  </div>

  <div class="form-group">
    <label class="form-label" for="markets_per_session">Markets Per Session *</label>
    <input id="markets_per_session" class="form-input" type="number" min="1" max="10" step="1" value="2" required inputmode="numeric" />
    <p class="form-hint">How many funnel markets the scheduler claims in each AM/PM session. Whole number between 1 and 10.</p>
  </div>

  <div class="form-group">
    <label class="form-label">Answer-Type Mix *</label>
    <p class="form-hint" style="margin-top:0;margin-bottom:10px">Share of generated questions per answer type. Values must sum to 1.00. Longform questions queue for admin review before scheduling.</p>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px">
      <div>
        <label class="form-label" for="mix_binary" style="font-size:12px">Binary</label>
        <input id="mix_binary" class="form-input" type="number" min="0" max="1" step="0.05" value="0.2" required inputmode="decimal" />
      </div>
      <div>
        <label class="form-label" for="mix_single_choice" style="font-size:12px">Single Choice</label>
        <input id="mix_single_choice" class="form-input" type="number" min="0" max="1" step="0.05" value="0.2" required inputmode="decimal" />
      </div>
      <div>
        <label class="form-label" for="mix_multi_choice" style="font-size:12px">Multi Choice</label>
        <input id="mix_multi_choice" class="form-input" type="number" min="0" max="1" step="0.05" value="0.2" required inputmode="decimal" />
      </div>
      <div>
        <label class="form-label" for="mix_longform" style="font-size:12px">Longform</label>
        <input id="mix_longform" class="form-input" type="number" min="0" max="1" step="0.05" value="0.4" required inputmode="decimal" />
      </div>
    </div>
    <p class="form-hint" id="mix_sum_hint">Current sum: 1.00</p>
  </div>
`;

export const funnelFormScript = `
  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function linesToArray(raw) {
    if (!raw) return [];
    return raw.split('\\n').map(function(s) { return s.trim(); }).filter(Boolean);
  }

  function arrayToLines(arr) {
    if (!Array.isArray(arr)) return '';
    return arr.join('\\n');
  }

  function parseRequiredInteger(elId, label, min, max) {
    var raw = document.getElementById(elId).value;
    var trimmed = String(raw).trim();
    if (trimmed === '') throw new Error(label + ' is required');
    if (!/^-?\\d+$/.test(trimmed)) throw new Error(label + ' must be a whole number');
    var n = parseInt(trimmed, 10);
    if (!isFinite(n)) throw new Error(label + ' must be a number');
    if (n < min || n > max) throw new Error(label + ' must be between ' + min + ' and ' + max);
    return n;
  }

  function parseRequiredFraction(elId, label) {
    var raw = document.getElementById(elId).value;
    var trimmed = String(raw).trim();
    if (trimmed === '') throw new Error(label + ' is required');
    var n = Number(trimmed);
    if (!isFinite(n)) throw new Error(label + ' must be a number');
    if (n < 0 || n > 1) throw new Error(label + ' must be between 0 and 1');
    return n;
  }

  function readForm() {
    var binary = parseRequiredFraction('mix_binary', 'Binary share');
    var single = parseRequiredFraction('mix_single_choice', 'Single-choice share');
    var multi = parseRequiredFraction('mix_multi_choice', 'Multi-choice share');
    var longform = parseRequiredFraction('mix_longform', 'Longform share');
    var sum = binary + single + multi + longform;
    if (Math.abs(sum - 1) > 0.01) {
      throw new Error('Mix shares must sum to 1.0 (current sum: ' + sum.toFixed(2) + ')');
    }
    return {
      id: document.getElementById('id').value.trim(),
      name: document.getElementById('name').value.trim(),
      display_insight_name: document.getElementById('display_insight_name').value.trim(),
      description: document.getElementById('description').value.trim(),
      insight_goal: document.getElementById('insight_goal').value.trim(),
      example_topics: linesToArray(document.getElementById('example_topics').value),
      generation_guidance: [
        { phase: 1, guidance: document.getElementById('phase1').value.trim() },
        { phase: 2, guidance: document.getElementById('phase2').value.trim() },
        { phase: 3, guidance: document.getElementById('phase3').value.trim() },
      ],
      forbidden_terms: linesToArray(document.getElementById('forbidden_terms').value),
      camouflage_categories: linesToArray(document.getElementById('camouflage_categories').value),
      target_resolved: parseRequiredInteger('target_resolved', 'Target resolved', 1, 500),
      markets_per_session: parseRequiredInteger('markets_per_session', 'Markets per session', 1, 10),
      mix: { binary: binary, single_choice: single, multi_choice: multi, longform: longform },
    };
  }

  function recomputeMixSum() {
    var hint = document.getElementById('mix_sum_hint');
    if (!hint) return;
    var b = Number(document.getElementById('mix_binary').value) || 0;
    var s = Number(document.getElementById('mix_single_choice').value) || 0;
    var m = Number(document.getElementById('mix_multi_choice').value) || 0;
    var l = Number(document.getElementById('mix_longform').value) || 0;
    var sum = b + s + m + l;
    hint.textContent = 'Current sum: ' + sum.toFixed(2);
    hint.style.color = Math.abs(sum - 1) <= 0.01 ? '' : 'var(--red)';
  }

  function attachMixListeners() {
    ['mix_binary','mix_single_choice','mix_multi_choice','mix_longform'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', recomputeMixSum);
    });
    recomputeMixSum();
  }

  function fillForm(funnel) {
    document.getElementById('id').value = funnel.id || '';
    document.getElementById('id').disabled = true;
    document.getElementById('name').value = funnel.name || '';
    document.getElementById('display_insight_name').value = funnel.display_insight_name || '';
    document.getElementById('description').value = funnel.description || '';
    document.getElementById('insight_goal').value = funnel.insight_goal || '';
    document.getElementById('example_topics').value = arrayToLines(funnel.example_topics);
    var g = Array.isArray(funnel.generation_guidance) ? funnel.generation_guidance : [];
    document.getElementById('phase1').value = (g.find(function(p){return p.phase===1;}) || {}).guidance || '';
    document.getElementById('phase2').value = (g.find(function(p){return p.phase===2;}) || {}).guidance || '';
    document.getElementById('phase3').value = (g.find(function(p){return p.phase===3;}) || {}).guidance || '';
    document.getElementById('forbidden_terms').value = arrayToLines(funnel.forbidden_terms);
    document.getElementById('camouflage_categories').value = arrayToLines(funnel.camouflage_categories);
    var statusEl = document.getElementById('status');
    if (statusEl) statusEl.value = funnel.status || 'active';
    if (typeof funnel.target_resolved === 'number') document.getElementById('target_resolved').value = funnel.target_resolved;
    if (typeof funnel.markets_per_session === 'number') document.getElementById('markets_per_session').value = funnel.markets_per_session;
    var mix = funnel.mix || {};
    if (typeof mix.binary === 'number') document.getElementById('mix_binary').value = mix.binary;
    if (typeof mix.single_choice === 'number') document.getElementById('mix_single_choice').value = mix.single_choice;
    if (typeof mix.multi_choice === 'number') document.getElementById('mix_multi_choice').value = mix.multi_choice;
    if (typeof mix.longform === 'number') document.getElementById('mix_longform').value = mix.longform;
    recomputeMixSum();
  }
`;
