import { adminNavCSS, adminNavScript, renderAdminNav } from './admin-nav.js';
import { themeCSS, themeToggleButton, themeScript } from './theme.js';

export function renderTopicCreator(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — New Surface Topic</title>
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
    .form-input, .form-textarea {
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
    .form-input:focus, .form-textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(45,212,160,.15);
    }
    .form-textarea { min-height: 80px; resize: vertical; }
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
    .methodology-note {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 20px;
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .methodology-note strong { color: var(--text); }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">New Surface Topic</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <a href="/admin/surface-topics" class="back-link">&larr; Surface Topics</a>
      ${themeToggleButton}
    </div>
    ${renderAdminNav('studies')}
  </div>

  <div class="main">
    <div id="alert-error" class="alert alert-error"></div>

    <div class="methodology-note">
      <strong>How it works:</strong> Define a high-level research theme. The system generates 10-15 indirect questions
      that triangulate toward your insight without explicitly mentioning the topic. You review, edit, and approve
      questions before they become live markets. Questions use behavioral, preference, and scenario-based angles
      to reveal latent attitudes.
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Define Surface Topic</span>
      </div>
      <div class="card-body">
        <form id="topic-form" onsubmit="return false;">
          <div class="form-group">
            <label class="form-label" for="name">Topic Name *</label>
            <input id="name" class="form-input" type="text" placeholder="e.g. Inflation Perceptibility" required maxlength="200" />
            <p class="form-hint">A short, descriptive name for this research theme.</p>
          </div>

          <div class="form-group">
            <label class="form-label" for="description">Description *</label>
            <textarea id="description" class="form-textarea" placeholder="What does this topic explore? What areas of life or behavior does it touch?" required></textarea>
            <p class="form-hint">Describe the general domain — this helps the AI generate diverse angles.</p>
          </div>

          <div class="form-group">
            <label class="form-label" for="insight_goal">Insight Goal *</label>
            <textarea id="insight_goal" class="form-textarea" placeholder="What specific insight do you want to uncover? e.g. 'Determine whether inflation is perceptible in 2026 by measuring behavioral substitution and price sensitivity'" required></textarea>
            <p class="form-hint">The hidden research question. This is never shown to agents — it guides question generation.</p>
          </div>

          <div class="form-group">
            <label class="form-label" for="example_seeds">Seed Angles (optional)</label>
            <textarea id="example_seeds" class="form-textarea" placeholder="One per line, e.g.:\ncooking at home vs eating out\nrepair vs replace attitudes\nsubscription pruning behavior"></textarea>
            <p class="form-hint">Optional starting angles. One per line. Helps guide the AI but it will generate its own angles too.</p>
          </div>

          <button type="submit" class="btn-submit" id="submit-btn" onclick="submitTopic()">Create &amp; Generate Questions</button>
        </form>
      </div>
    </div>
  </div>

  <script>
    ${themeScript}
    ${adminNavScript}
    async function submitTopic() {
      var btn = document.getElementById('submit-btn');
      var errEl = document.getElementById('alert-error');
      errEl.style.display = 'none';

      var name = document.getElementById('name').value.trim();
      var description = document.getElementById('description').value.trim();
      var insight_goal = document.getElementById('insight_goal').value.trim();
      var seedsRaw = document.getElementById('example_seeds').value.trim();

      if (!name || !description || !insight_goal) {
        errEl.textContent = 'Name, description, and insight goal are required.';
        errEl.style.display = 'block';
        return;
      }

      var example_seeds = seedsRaw ? seedsRaw.split('\\n').map(function(s) { return s.trim(); }).filter(Boolean) : [];

      btn.disabled = true;
      btn.textContent = 'Generating questions...';

      try {
        var res = await fetch('/admin/analytics/surface-topics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: name, description: description, insight_goal: insight_goal, example_seeds: example_seeds }),
        });

        var data = await res.json();

        if (!res.ok) {
          errEl.textContent = data.error || 'Failed to create topic';
          errEl.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Create & Generate Questions';
          return;
        }

        window.location.href = '/admin/surface-topics/' + data.id;
      } catch (err) {
        errEl.textContent = 'Network error: ' + err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Create & Generate Questions';
      }
    }
  </script>
</body>
</html>`;
}
