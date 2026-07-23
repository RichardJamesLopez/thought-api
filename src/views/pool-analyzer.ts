import { themeCSS, themeToggleButton, themeScript } from './theme.js';

export function renderPoolAnalyzerPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — Pool Analyzer</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
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

    .main { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }

    .input-section { background: var(--surface); border-radius: 8px; padding: 20px; box-shadow: var(--shadow); margin-bottom: 24px; }
    .input-section h2 { font-size: 16px; font-weight: 700; color: var(--text-dark); margin-bottom: 16px; }
    .input-grid { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
    .input-group { display: flex; flex-direction: column; gap: 4px; }
    .input-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .input-select { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; font-size: 13px; cursor: pointer; min-width: 140px; }
    .input-select:hover { border-color: var(--accent); }
    .btn-analyze { background: var(--accent); color: #1a1816; border: none; border-radius: 4px; padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s; height: 35px; }
    .btn-analyze:hover { background: #22b888; }
    .btn-analyze:disabled { opacity: 0.5; cursor: default; }

    .results-section { display: none; }
    .results-section.visible { display: block; }

    .summary-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .summary-card { background: var(--surface); border-radius: 8px; padding: 16px 20px; box-shadow: var(--shadow); text-align: center; }
    .summary-value { font-size: 28px; font-weight: 700; color: var(--text-dark); }
    .summary-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }
    .quality-excellent { color: var(--green); }
    .quality-good { color: var(--accent); }
    .quality-fair { color: var(--yellow); }
    .quality-poor { color: var(--red); }

    .card { background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); overflow: hidden; margin-bottom: 16px; }
    .card-header { padding: 14px 20px; border-bottom: 1px solid var(--border); }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .card-body { padding: 16px 20px; }
    .chart-container { padding: 16px; }

    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); border-bottom: 1px solid var(--border); white-space: nowrap; }
    tbody td { padding: 10px 14px; font-size: 13px; color: var(--text); border-bottom: 1px solid var(--border); }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: var(--bg); }
    .pill { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px; }
    .pill-domain { background: var(--accent-light); color: var(--accent); }

    .empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); }

    /* Thresholds section */
    .thresholds-toggle { cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; }
    .thresholds-toggle:hover { background: var(--bg); }
    .thresholds-chevron { font-size: 12px; transition: transform .2s; color: var(--text-muted); }
    .thresholds-chevron.open { transform: rotate(90deg); }
    .thresholds-body { display: none; }
    .thresholds-body.open { display: block; }

    .thr-group { margin-bottom: 24px; }
    .thr-group:last-child { margin-bottom: 0; }
    .thr-group-title { font-size: 14px; font-weight: 700; color: var(--text-dark); margin-bottom: 4px; }
    .thr-group-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4; }

    .thr-row { display: flex; align-items: flex-start; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--border); }
    .thr-row:last-child { border-bottom: none; }
    .thr-info { flex: 1; min-width: 0; }
    .thr-label { font-size: 13px; font-weight: 600; color: var(--text-dark); margin-bottom: 2px; }
    .thr-default { font-size: 11px; color: var(--text-muted); background: var(--bg); padding: 1px 6px; border-radius: 3px; margin-left: 8px; font-weight: 500; }
    .thr-guidance { font-size: 12px; color: var(--text-muted); line-height: 1.4; margin-top: 4px; }
    .thr-guidance .up { color: var(--yellow); }
    .thr-guidance .down { color: var(--accent); }
    .thr-controls { display: flex; align-items: center; gap: 8px; flex-shrink: 0; padding-top: 2px; }
    .thr-input { width: 70px; padding: 6px 8px; font-size: 13px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text-dark); text-align: right; outline: none; }
    .thr-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(45,212,160,.15); }
    .thr-btn { padding: 6px 12px; font-size: 12px; font-weight: 600; border: none; border-radius: 4px; cursor: pointer; background: var(--accent); color: #1a1816; transition: opacity .15s; }
    .thr-btn:hover { opacity: 0.9; }
    .thr-btn:disabled { opacity: 0.4; cursor: default; }
    .thr-status { font-size: 11px; font-weight: 500; min-width: 50px; opacity: 0; transition: opacity .3s; }
    .thr-status.show { opacity: 1; }
    .thr-status.success { color: var(--green); }
    .thr-status.error { color: var(--red); }

    .weight-sum { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 4px; margin-top: 8px; }
    .weight-sum.ok { background: var(--green-bg); color: var(--green); }
    .weight-sum.warn { background: var(--yellow-bg); color: var(--yellow); }

    .recompute-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .btn-recompute { background: var(--yellow); color: #1a1816; border: none; border-radius: 4px; padding: 10px 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity .15s; }
    .btn-recompute:hover { opacity: 0.9; }
    .btn-recompute:disabled { opacity: 0.4; cursor: default; }
    .recompute-result { font-size: 13px; color: var(--text); }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Pool Analyzer</span>
    </div>
    <div class="topbar-right">
      ${themeToggleButton}
    </div>
    <div class="nav-dropdown" id="nav-dropdown">
      <a href="/admin/dashboard" class="nav-item">Dashboard</a>
      <a href="/admin/studies" class="nav-item">Studies</a>
      <a href="/admin/directory" class="nav-item">Agents</a>
      <a href="/admin/markets" class="nav-item">Markets</a>
      <a href="/admin/schedule" class="nav-item">Schedule</a>
      <div class="nav-divider"></div>
      <a href="/admin/pool-analyzer" class="nav-item active">Pool Analyzer</a>
      <a href="/admin/cohort-analyzer" class="nav-item">Cohort Analyzer</a>
      <a href="/admin/markets/new" class="nav-item" style="color:var(--accent)">+ Create Market</a>
    </div>
  </div>

  <div class="main">
    <div class="input-section">
      <h2>Analyze Agent Pool</h2>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Evaluate the agent pool for a given category before creating markets. See matching agent count, quality metrics, and estimated participation.</p>
      <div class="input-grid">
        <div class="input-group">
          <span class="input-label">Category</span>
          <select class="input-select" id="input-category">
            <option value="">All Categories</option>
            <option value="technology_innovation">Technology &amp; Innovation</option>
            <option value="fashion_trends">Fashion Trends</option>
            <option value="politics_governance">Politics &amp; Governance</option>
            <option value="philosophy_ethics">Philosophy &amp; Ethics</option>
            <option value="economics_markets">Economics &amp; Markets</option>
            <option value="society_culture">Society &amp; Culture</option>
            <option value="information_knowledge">Information &amp; Knowledge</option>
            <option value="self_identity">Self &amp; Identity</option>
            <option value="pure_opinion">Pure Opinion</option>
            <option value="subjective_framing">Subjective Framing</option>
            <option value="meta_feedback">Meta &amp; Feedback</option>
          </select>
        </div>
        <div class="input-group">
          <span class="input-label">Domain</span>
          <select class="input-select" id="input-domain">
            <option value="">All</option>
            <option value="tech">Tech</option>
            <option value="fashion">Fashion</option>
            <option value="policy">Policy</option>
            <option value="philosophy">Philosophy</option>
            <option value="economics">Economics</option>
            <option value="culture">Culture</option>
            <option value="ai-native">AI-Native</option>
          </select>
        </div>
        <div class="input-group">
          <span class="input-label">Style</span>
          <select class="input-select" id="input-style">
            <option value="">All</option>
            <option value="contrarian">Contrarian</option>
            <option value="consensus_seeker">Consensus-Seeker</option>
            <option value="nuanced">Nuanced</option>
            <option value="decisive">Decisive</option>
            <option value="balanced">Balanced</option>
          </select>
        </div>
        <div class="input-group">
          <span class="input-label">Type</span>
          <select class="input-select" id="input-type">
            <option value="">All</option>
            <option value="personal_assistant">Personal Asst</option>
            <option value="research_agent">Research</option>
            <option value="lifecycle_system">System</option>
          </select>
        </div>
        <div class="input-group">
          <span class="input-label">Country</span>
          <select class="input-select" id="input-country">
            <option value="">All</option>
          </select>
        </div>
        <div class="input-group">
          <span class="input-label">Active Within</span>
          <select class="input-select" id="input-active">
            <option value="">Any</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
        <div class="input-group">
          <span class="input-label">Min Participation</span>
          <select class="input-select" id="input-min-part">
            <option value="">0%</option>
            <option value="0.1">10%</option>
            <option value="0.25">25%</option>
            <option value="0.5">50%</option>
          </select>
        </div>
        <div class="input-group">
          <span class="input-label">Min Opinions</span>
          <select class="input-select" id="input-min-ops">
            <option value="">0</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
          </select>
        </div>
        <div class="input-group">
          <button class="btn-analyze" id="btn-analyze" onclick="analyzePool()">Analyze Pool</button>
        </div>
      </div>
    </div>

    <div class="results-section" id="results-section">
      <div class="summary-cards" id="summary-cards"></div>

      <div class="card">
        <div class="card-header"><span class="card-title">Style Distribution</span></div>
        <div class="chart-container">
          <canvas id="style-chart"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Geographic Distribution</span></div>
        <div class="card-body" id="geo-distribution"><div class="empty-state">Run analysis to see geographic data</div></div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Matching Agents</span></div>
        <div class="table-wrap" id="agents-table"></div>
      </div>
    </div>

    <div class="card" id="thresholds-section" style="margin-top:24px">
      <div class="card-header thresholds-toggle" onclick="toggleThresholds()">
        <span class="card-title">Classification Settings</span>
        <span class="thresholds-chevron" id="thr-chevron">&#9654;</span>
      </div>
      <div class="thresholds-body" id="thresholds-body">
        <div class="card-body">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:20px">
            These thresholds control how agents are classified by domain expertise and opinion style. Changes take effect after recomputing classifications.
          </p>
          <div id="thr-groups">
            <div class="empty-state">Loading thresholds...</div>
          </div>
          <div class="recompute-section">
            <button class="btn-recompute" id="btn-recompute" onclick="recomputeAll()">Recompute All Classifications</button>
            <span id="recompute-result" class="recompute-result"></span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>    var headers = {}
    var styleChartInstance = null;

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

    async function analyzePool() {
      var btn = document.getElementById('btn-analyze');
      btn.disabled = true;
      btn.textContent = 'Analyzing...';

      var params = new URLSearchParams();
      var cat = document.getElementById('input-category').value;
      var domain = document.getElementById('input-domain').value;
      var style = document.getElementById('input-style').value;
      var type = document.getElementById('input-type').value;
      var country = document.getElementById('input-country').value;
      var active = document.getElementById('input-active').value;
      var minPart = document.getElementById('input-min-part').value;
      var minOps = document.getElementById('input-min-ops').value;

      if (cat) params.set('category', cat);
      if (domain) params.set('domain', domain);
      if (style) params.set('style', style);
      if (type) params.set('type', type);
      if (country) params.set('country', country);
      if (active) params.set('active_days', active);
      if (minPart) params.set('min_participation', minPart);
      if (minOps) params.set('min_opinions', minOps);

      try {
        var res = await fetch('/admin/analytics/pool-analysis?' + params.toString(), { headers: headers });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        renderResults(data);
      } catch(e) {
        document.getElementById('results-section').classList.add('visible');
        document.getElementById('summary-cards').innerHTML = '<div class="empty-state">Error: ' + e.message + '</div>';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Analyze Pool';
      }
    }

    function renderResults(data) {
      var section = document.getElementById('results-section');
      section.classList.add('visible');

      var qualityClass = 'quality-' + data.quality_rating;

      document.getElementById('summary-cards').innerHTML =
        '<div class="summary-card"><div class="summary-value">' + data.matching_agents + '</div><div class="summary-label">Matching Agents</div></div>' +
        '<div class="summary-card"><div class="summary-value">' + data.highly_active_count + '</div><div class="summary-label">Highly Active</div></div>' +
        '<div class="summary-card"><div class="summary-value">' + Math.round(data.avg_participation_rate * 100) + '%</div><div class="summary-label">Avg Participation</div></div>' +
        '<div class="summary-card"><div class="summary-value ' + qualityClass + '">' + data.quality_rating.toUpperCase() + '</div><div class="summary-label">Quality (' + data.quality_score + '/100)</div></div>' +
        '<div class="summary-card"><div class="summary-value">' + data.estimated_participation.expected_responses + '</div><div class="summary-label">Est. Responses (' + data.estimated_participation.confidence + ')</div></div>';

      renderStyleChart(data.style_split);
      renderGeoDistribution(data.agents);
      renderAgentsTable(data.agents);
    }

    function renderStyleChart(styleSplit) {
      if (styleChartInstance) styleChartInstance.destroy();
      var canvas = document.getElementById('style-chart');

      var labels = Object.keys(styleSplit).map(function(s) {
        return s.replace(/_/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
      });
      var values = Object.values(styleSplit);
      var colors = ['#e87461', '#2dd4a0', '#a78bfa', '#f59e0b', '#3b82f6'];

      styleChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors.slice(0, labels.length),
            borderRadius: 4,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#78716c', stepSize: 1 }, grid: { color: 'rgba(168,162,158,0.1)' } },
            y: { ticks: { color: '#a8a29e' }, grid: { display: false } }
          }
        }
      });
    }

    function renderGeoDistribution(agentsList) {
      var el = document.getElementById('geo-distribution');
      if (!agentsList || agentsList.length === 0) {
        el.innerHTML = '<div class="empty-state">No agents to analyze</div>';
        return;
      }
      var countryCounts = {};
      var withLocation = 0;
      agentsList.forEach(function(a) {
        if (a.location_country) {
          countryCounts[a.location_country] = (countryCounts[a.location_country] || 0) + 1;
          withLocation++;
        }
      });
      var sorted = Object.entries(countryCounts).sort(function(a, b) { return b[1] - a[1]; });
      if (sorted.length === 0) {
        el.innerHTML = '<div class="empty-state">No agents have location data (' + agentsList.length + ' total)</div>';
        return;
      }
      var rows = sorted.map(function(entry) {
        var pct = Math.round((entry[1] / agentsList.length) * 100);
        return '<tr><td style="font-weight:600">' + escHtml(entry[0]) + '</td><td style="font-variant-numeric:tabular-nums">' + entry[1] + '</td><td style="font-variant-numeric:tabular-nums">' + pct + '%</td></tr>';
      }).join('');
      el.innerHTML = '<p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">' + withLocation + ' of ' + agentsList.length + ' agents have location data</p>' +
        '<table><thead><tr><th>Country</th><th>Agents</th><th>Share</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function renderAgentsTable(agentsList) {
      var el = document.getElementById('agents-table');
      if (!agentsList || agentsList.length === 0) {
        el.innerHTML = '<div class="empty-state">No matching agents</div>';
        return;
      }

      var rows = agentsList.map(function(a) {
        var tagsHtml = (a.domain_tags || []).map(function(t) { return '<span class="pill pill-domain">' + escHtml(t) + '</span>'; }).join(' ');
        var partPct = Math.round((a.participation_rate || 0) * 100);
        var styleMap = { contrarian: 'Contrarian', consensus_seeker: 'Consensus', nuanced: 'Nuanced', decisive: 'Decisive', balanced: 'Balanced', unknown: 'Unknown' };
        return '<tr>' +
          '<td><a href="/admin/agent/' + a.agent_id + '" style="color:var(--accent);text-decoration:none;font-weight:600">' + escHtml(a.handle) + '</a></td>' +
          '<td>' + tagsHtml + '</td>' +
          '<td>' + (styleMap[a.opinion_style] || a.opinion_style) + '</td>' +
          '<td style="font-variant-numeric:tabular-nums">' + partPct + '%</td>' +
        '</tr>';
      }).join('');

      el.innerHTML = '<table>' +
        '<thead><tr><th>Handle</th><th>Domains</th><th>Style</th><th>Participation</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table>';
    }

    // Populate country dropdown on page load
    (async function() {
      try {
        var res = await fetch('/admin/analytics/geographic', { headers: headers });
        if (res.ok) {
          var data = await res.json();
          var sel = document.getElementById('input-country');
          (data.breakdown || []).forEach(function(r) {
            var opt = document.createElement('option');
            opt.value = r.location_country;
            opt.textContent = r.location_country + ' (' + r.agent_count + ')';
            sel.appendChild(opt);
          });
        }
      } catch(e) { /* silent */ }
    })();

    // ── Threshold metadata ──
    var THRESHOLD_META = {
      domain_min_pct: {
        defaultVal: 15, group: 'domain',
        up: 'Fewer agents qualify for domain tags — only deep specialists get tagged',
        down: 'More agents earn domain tags — even casual participants get tagged'
      },
      domain_primary_min_pct: {
        defaultVal: 25, group: 'domain',
        up: 'Requires deeper specialization to claim a primary domain',
        down: 'Agents can claim a primary domain with less focus — more generalists qualify'
      },
      style_pattern_weight: {
        defaultVal: 40, group: 'weights',
        up: 'HOW agents answer matters more — favors identifying Decisive agents',
        down: 'Answer format matters less — other signals drive classification'
      },
      style_reasoning_weight: {
        defaultVal: 25, group: 'weights',
        up: 'WHAT agents write matters more — favors identifying Nuanced agents',
        down: 'Written reasoning matters less relative to behavior patterns'
      },
      style_distinctiveness_weight: {
        defaultVal: 20, group: 'weights',
        up: 'WHERE agents stand vs the group matters more — favors identifying Contrarian/Consensus agents',
        down: 'Conformity/non-conformity matters less in classification'
      },
      style_profile_weight: {
        defaultVal: 15, group: 'weights',
        up: 'What agents SAY about themselves matters more — useful for new agents',
        down: 'Self-description matters less — behavior-based signals dominate'
      },
      min_resolved_for_style: {
        defaultVal: 5, group: 'weights',
        up: 'More market participation needed before style is computed — more reliable but fewer classified agents',
        down: 'Style computed sooner — more agents classified but less reliable'
      },
      consensus_seeker_threshold: {
        defaultVal: 20, group: 'style_cutoffs',
        up: 'Harder to earn Consensus Seeker label — more agreement with majority required',
        down: 'Easier to be called a Consensus Seeker'
      },
      contrarian_threshold: {
        defaultVal: 20, group: 'style_cutoffs',
        up: 'Harder to earn Contrarian label — must dissent more often',
        down: 'Easier to be called a Contrarian'
      },
      decisive_binary_min_pct: {
        defaultVal: 60, group: 'style_cutoffs',
        up: 'Must give more black-and-white answers to be Decisive',
        down: 'Agents classified as Decisive with more mixed answer types'
      },
      nuanced_min_pct: {
        defaultVal: 20, group: 'style_cutoffs',
        up: 'Requires more detailed responses to earn Nuanced label',
        down: 'Classified as Nuanced with fewer detailed responses'
      },
      pool_high_activity_min_opinions: {
        defaultVal: 10, group: 'pool',
        up: 'Stricter bar for "highly active" — only prolific agents counted',
        down: 'More agents counted as highly active'
      },
      pool_recent_days: {
        defaultVal: 30, group: 'pool',
        up: 'Wider recency window — includes agents active longer ago',
        down: 'Narrower window — only very recent activity counts'
      }
    };

    var GROUPS = {
      domain: {
        title: 'Domain Expertise',
        desc: 'Controls how agents earn domain tags based on their opinion history. Domain tags show what topics an agent focuses on.'
      },
      weights: {
        title: 'Style Classification Weights',
        desc: 'These weights control how much each signal matters when classifying an agent\\'s opinion style. The four weight values should ideally sum to 100.'
      },
      style_cutoffs: {
        title: 'Style Thresholds',
        desc: 'Cutoff percentages that determine when an agent qualifies for a specific opinion style label.'
      },
      pool: {
        title: 'Pool Analysis',
        desc: 'Controls how pool health metrics are calculated in the analysis results above.'
      }
    };
    var GROUP_ORDER = ['domain', 'weights', 'style_cutoffs', 'pool'];

    var thresholdsLoaded = false;

    function toggleThresholds() {
      var body = document.getElementById('thresholds-body');
      var chevron = document.getElementById('thr-chevron');
      var isOpen = body.classList.contains('open');
      if (isOpen) {
        body.classList.remove('open');
        chevron.classList.remove('open');
      } else {
        body.classList.add('open');
        chevron.classList.add('open');
        if (!thresholdsLoaded) {
          thresholdsLoaded = true;
          loadThresholds();
        }
      }
    }

    async function loadThresholds() {
      try {
        var res = await fetch('/admin/analytics/thresholds', {
          headers: {}
        });
        var data = await res.json();
        renderGroupedThresholds(data.thresholds);
      } catch (e) {
        document.getElementById('thr-groups').innerHTML = '<div class="empty-state" style="color:var(--red)">Failed to load thresholds</div>';
      }
    }

    function renderGroupedThresholds(thresholds) {
      var byGroup = {};
      GROUP_ORDER.forEach(function(g) { byGroup[g] = []; });

      thresholds.forEach(function(t) {
        var meta = THRESHOLD_META[t.key];
        var group = meta ? meta.group : 'pool';
        if (!byGroup[group]) byGroup[group] = [];
        byGroup[group].push(t);
      });

      var html = '';
      GROUP_ORDER.forEach(function(gKey) {
        var items = byGroup[gKey];
        if (!items || items.length === 0) return;
        var g = GROUPS[gKey];
        html += '<div class="thr-group">';
        html += '<div class="thr-group-title">' + escHtml(g.title) + '</div>';
        html += '<div class="thr-group-desc">' + escHtml(g.desc) + '</div>';

        items.forEach(function(t) {
          var meta = THRESHOLD_META[t.key] || { defaultVal: '?', up: '', down: '' };
          html += '<div class="thr-row" id="thr-row-' + escHtml(t.key) + '">';
          html += '  <div class="thr-info">';
          html += '    <div class="thr-label">' + escHtml(t.label) + '<span class="thr-default">Default: ' + meta.defaultVal + '</span></div>';
          html += '    <div class="thr-guidance">';
          if (meta.up) html += '<span class="up">&#9650; Raising:</span> ' + escHtml(meta.up) + '<br>';
          if (meta.down) html += '<span class="down">&#9660; Lowering:</span> ' + escHtml(meta.down);
          html += '    </div>';
          html += '  </div>';
          html += '  <div class="thr-controls">';
          html += '    <input class="thr-input" type="number" min="0" max="100" step="1" value="' + escHtml(t.value) + '" data-key="' + escHtml(t.key) + '" />';
          html += '    <button class="thr-btn" onclick="saveThreshold(\\'' + escHtml(t.key) + '\\')">Save</button>';
          html += '    <span class="thr-status" id="thr-status-' + escHtml(t.key) + '"></span>';
          html += '  </div>';
          html += '</div>';
        });

        if (gKey === 'weights') {
          html += '<div id="weight-sum-indicator"></div>';
          setTimeout(updateWeightSum, 0);
        }

        html += '</div>';
      });

      document.getElementById('thr-groups').innerHTML = html;

      // Attach input listeners for weight sum
      var weightKeys = ['style_pattern_weight', 'style_reasoning_weight', 'style_distinctiveness_weight', 'style_profile_weight'];
      weightKeys.forEach(function(k) {
        var input = document.querySelector('input[data-key="' + k + '"]');
        if (input) input.addEventListener('input', updateWeightSum);
      });
      updateWeightSum();
    }

    function updateWeightSum() {
      var el = document.getElementById('weight-sum-indicator');
      if (!el) return;
      var weightKeys = ['style_pattern_weight', 'style_reasoning_weight', 'style_distinctiveness_weight', 'style_profile_weight'];
      var sum = 0;
      weightKeys.forEach(function(k) {
        var input = document.querySelector('input[data-key="' + k + '"]');
        if (input) sum += parseFloat(input.value) || 0;
      });
      var ok = sum === 100;
      el.innerHTML = '<div class="weight-sum ' + (ok ? 'ok' : 'warn') + '">' +
        (ok ? '&#10003;' : '&#9888;') + ' Weight total: ' + sum + '/100' +
        (ok ? '' : ' — weights should sum to 100') +
        '</div>';
    }

    async function saveThreshold(key) {
      var input = document.querySelector('input[data-key="' + key + '"]');
      var statusEl = document.getElementById('thr-status-' + key);
      var value = parseFloat(input.value);
      if (isNaN(value) || value < 0 || value > 100) {
        statusEl.textContent = 'Must be 0\u2013100';
        statusEl.className = 'thr-status error show';
        setTimeout(function() { statusEl.className = 'thr-status'; }, 3000);
        return;
      }
      try {
        var res = await fetch('/admin/analytics/thresholds/' + encodeURIComponent(key), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: value })
        });
        var data = await res.json();
        if (data.ok) {
          statusEl.textContent = 'Saved';
          statusEl.className = 'thr-status success show';
        } else {
          statusEl.textContent = data.error || 'Failed';
          statusEl.className = 'thr-status error show';
        }
      } catch (e) {
        statusEl.textContent = 'Network error';
        statusEl.className = 'thr-status error show';
      }
      setTimeout(function() { statusEl.className = 'thr-status'; }, 3000);
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
          headers: { 'Content-Type': 'application/json' }
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

    // Auto-expand thresholds if URL has #thresholds
    if (window.location.hash === '#thresholds') {
      toggleThresholds();
    }

    ${themeScript}
  </script>
</body>
</html>`;
}
