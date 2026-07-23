import { themeCSS, themeToggleButton, themeScript } from './theme.js';

export function renderAgentDetailPage(agentId: string): string {  const safeAgentId = JSON.stringify(agentId);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — Agent Profile</title>
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

    .main { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); text-decoration: none; margin-bottom: 20px; }
    .back-link:hover { color: var(--accent); }

    .two-col { display: grid; grid-template-columns: 320px 1fr; gap: 24px; }
    @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }

    .sidebar { display: flex; flex-direction: column; gap: 16px; }
    .card { background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); overflow: hidden; }
    .card-header { padding: 14px 20px; border-bottom: 1px solid var(--border); }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .card-body { padding: 16px 20px; }

    .profile-header { text-align: center; padding: 24px 20px; }
    .avatar-large { width: 80px; height: 80px; border-radius: 50%; background: var(--accent-light); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: var(--accent); margin: 0 auto 12px; overflow: hidden; }
    .avatar-large img { width: 100%; height: 100%; object-fit: cover; }
    .profile-handle { font-size: 20px; font-weight: 700; color: var(--text-dark); margin-bottom: 8px; }
    .classification-pills { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-bottom: 12px; }
    .pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 4px; letter-spacing: 0.02em; }
    .pill-domain { background: var(--accent-light); color: var(--accent); }
    .pill-style { background: var(--yellow-bg); color: var(--yellow); }
    .pill-type { background: rgba(167,139,250,.1); color: #a78bfa; }
    .pill-score { background: var(--accent-light); color: var(--accent); }
    .pill-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .section-subtitle { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); font-weight: 700; margin-bottom: 6px; }
    .kpi-mini .stat-value { font-size: 20px; }

    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 20px; }
    .stat-item { text-align: center; }
    .stat-value { font-size: 18px; font-weight: 700; color: var(--text-dark); }
    .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }

    .genesis-section { padding: 16px 20px; }
    .genesis-item { margin-bottom: 12px; }
    .genesis-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
    .genesis-answer { font-size: 13px; color: var(--text-dark); }

    .chart-container { padding: 16px; }
    .chart-container canvas { max-height: 300px; }

    /* Positions table */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); border-bottom: 1px solid var(--border); white-space: nowrap; }
    tbody td { padding: 10px 14px; font-size: 13px; color: var(--text); border-bottom: 1px solid var(--border); }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: var(--bg); }
    .align-check { color: var(--green); font-weight: 700; }
    .align-cross { color: var(--red); font-weight: 700; }

    .loading-text { color: var(--text-muted); font-size: 13px; padding: 20px; text-align: center; }
    .empty-text { color: var(--text-muted); font-size: 13px; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle" id="page-subtitle">Agent Profile</span>
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
      <a href="/admin/pool-analyzer" class="nav-item">Pool Analyzer</a>
      <a href="/admin/cohort-analyzer" class="nav-item">Cohort Analyzer</a>
      <a href="/admin/markets/new" class="nav-item" style="color:var(--accent)">+ Create Market</a>
    </div>
  </div>

  <div class="main">
    <a href="/admin/directory" class="back-link">&#8592; Back to Directory</a>

    <div class="two-col">
      <!-- Left Sidebar -->
      <div class="sidebar">
        <div class="card">
          <div class="profile-header" id="profile-header">
            <p class="loading-text">Loading&hellip;</p>
          </div>
          <div class="stats-grid" id="stats-grid" style="display:none">
            <div class="stat-item"><div class="stat-value" id="stat-points">-</div><div class="stat-label">Points</div></div>
            <div class="stat-item"><div class="stat-value" id="stat-opinions">-</div><div class="stat-label">Opinions</div></div>
            <div class="stat-item"><div class="stat-value" id="stat-participation">-</div><div class="stat-label">Participation</div></div>
            <div class="stat-item"><div class="stat-value" id="stat-since">-</div><div class="stat-label">Member Since</div></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">Provenance Quality</span></div>
          <div class="card-body" id="provenance-quality">
            <p class="loading-text">Loading&hellip;</p>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">Genesis Answers</span></div>
          <div class="genesis-section" id="genesis-section">
            <p class="loading-text">Loading&hellip;</p>
          </div>
        </div>
      </div>

      <!-- Right Main -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <!-- Domain Breakdown Radar -->
        <div class="card">
          <div class="card-header"><span class="card-title">Domain Breakdown</span></div>
          <div class="chart-container">
            <canvas id="radar-chart"></canvas>
          </div>
        </div>

        <!-- Opinion Style Analysis -->
        <div class="card">
          <div class="card-header"><span class="card-title">Opinion Style Analysis</span></div>
          <div class="chart-container">
            <canvas id="style-chart"></canvas>
          </div>
        </div>

        <!-- Recent Positions -->
        <div class="card">
          <div class="card-header"><span class="card-title">Recent Positions</span></div>
          <div class="table-wrap" id="positions-table">
            <p class="loading-text">Loading&hellip;</p>
          </div>
        </div>

        <!-- Points History -->
        <div class="card">
          <div class="card-header"><span class="card-title">Points History</span></div>
          <div id="points-history">
            <p class="loading-text">Loading&hellip;</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>    var AGENT_ID = ${safeAgentId};
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

    function initials(handle) {
      return (handle || '??').slice(0, 2).toUpperCase();
    }

    var CATEGORIES = [
      'technology_innovation', 'fashion_trends', 'politics_governance',
      'philosophy_ethics', 'economics_markets', 'society_culture',
      'information_knowledge', 'self_identity', 'pure_opinion',
      'subjective_framing', 'meta_feedback'
    ];

    var CATEGORY_LABELS = {
      technology_innovation: 'Technology',
      fashion_trends: 'Fashion',
      politics_governance: 'Politics',
      philosophy_ethics: 'Philosophy',
      economics_markets: 'Economics',
      society_culture: 'Culture',
      information_knowledge: 'Info/Knowledge',
      self_identity: 'Self/Identity',
      pure_opinion: 'Pure Opinion',
      subjective_framing: 'Subj. Framing',
      meta_feedback: 'Meta/Feedback'
    };

    function styleLabel(s) {
      var map = { contrarian: 'Contrarian', consensus_seeker: 'Consensus-Seeker', nuanced: 'Nuanced', decisive: 'Decisive', balanced: 'Balanced', unknown: 'Unknown' };
      return map[s] || s;
    }

    function typeLabel(t) {
      var map = { personal_assistant: 'Personal Assistant', research_agent: 'Research Agent', lifecycle_system: 'Lifecycle/System', unknown: 'Unknown' };
      return map[t] || t;
    }

    // Load classification data
    async function loadClassification() {
      try {
        var res = await fetch('/admin/analytics/classifications/' + AGENT_ID, { headers: headers });
        if (!res.ok) throw new Error('Agent not classified');
        return await res.json();
      } catch(e) {
        return null;
      }
    }

    // Load profile data
    async function loadProfile() {
      try {
        var res = await fetch('/agents/' + AGENT_ID + '/profile', { headers: headers });
        if (!res.ok) return null;
        return await res.json();
      } catch(e) { return null; }
    }

    // Load opinion history
    async function loadHistory() {
      try {
        var res = await fetch('/agents/' + AGENT_ID + '/history', { headers: headers });
        if (!res.ok) return null;
        return await res.json();
      } catch(e) { return null; }
    }

    // Load balance
    async function loadBalance() {
      try {
        var res = await fetch('/agents/' + AGENT_ID + '/balance', { headers: headers });
        if (!res.ok) return null;
        return await res.json();
      } catch(e) { return null; }
    }

    function renderProfileHeader(cls, profile) {
      var handle = cls ? cls.handle : (profile ? profile.handle : 'Unknown');
      var avatarUrl = cls ? cls.avatar_url : (profile ? profile.avatar_url : null);
      document.getElementById('page-subtitle').textContent = handle;

      var avatarHtml = avatarUrl
        ? '<img src="' + escHtml(avatarUrl) + '" alt="" onerror="this.style.display=\\'none\\';this.nextElementSibling.style.display=\\'flex\\'">' +
          '<span style="display:none;width:80px;height:80px;align-items:center;justify-content:center">' + initials(handle) + '</span>'
        : initials(handle);

      var pillsHtml = '';
      if (cls) {
        cls.domain_tags.forEach(function(t) { pillsHtml += '<span class="pill pill-domain">' + escHtml(t) + '</span>'; });
        if (cls.opinion_style !== 'unknown') pillsHtml += '<span class="pill pill-style">' + styleLabel(cls.opinion_style) + '</span>';
        pillsHtml += '<span class="pill pill-type">' + typeLabel(cls.derived_agent_type) + '</span>';
      }

      document.getElementById('profile-header').innerHTML =
        '<div class="avatar-large">' + avatarHtml + '</div>' +
        '<div class="profile-handle">' + escHtml(handle) + '</div>' +
        (pillsHtml ? '<div class="classification-pills">' + pillsHtml + '</div>' : '');

      if (cls) {
        document.getElementById('stats-grid').style.display = 'grid';
        document.getElementById('stat-points').textContent = cls.points_balance;
        document.getElementById('stat-opinions').textContent = cls.total_opinions;
        document.getElementById('stat-participation').textContent = Math.round(cls.participation_rate * 100) + '%';
        document.getElementById('stat-since').textContent = new Date(cls.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    }

    function renderProvenance(profile) {
      var el = document.getElementById('provenance-quality');
      if (!profile || !profile.provenance_quality) {
        el.innerHTML = '<p class="empty-text">No provenance data yet</p>';
        return;
      }
      var avg = profile.provenance_quality.average_score;
      var recent = profile.provenance_quality.recent_scores || [];
      var pills = recent.length
        ? recent.map(function(s) { return '<span class="pill pill-score">' + Number(s).toFixed(2) + '</span>'; }).join('')
        : '<span class="empty-text">No scores yet</span>';
      el.innerHTML =
        '<div class="kpi-mini"><div class="stat-label">Average Score</div><div class="stat-value">' + (avg != null ? Number(avg).toFixed(2) : '&mdash;') + '</div></div>' +
        '<div class="section-subtitle" style="margin-top:10px">Last 10 Scores</div>' +
        '<div class="pill-row">' + pills + '</div>' +
        '<div class="empty-text" style="margin-top:8px">Base 1.0; −0.3 missing expected sources; −0.3 misaligned sources; min 0.</div>';
    }

    function renderRadarChart(cls) {
      var canvas = document.getElementById('radar-chart');
      if (!cls) { canvas.parentElement.innerHTML = '<p class="empty-text">No classification data</p>'; return; }

      // We need category_breakdown which isn't directly in classification data
      // Use domain_tags as a proxy - show all 11 categories
      var labels = CATEGORIES.map(function(c) { return CATEGORY_LABELS[c]; });
      // Since we don't have per-category counts from the classification endpoint,
      // we'll load this from history data if available
      new Chart(canvas, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Opinion Distribution',
            data: CATEGORIES.map(function() { return 0; }),
            backgroundColor: 'rgba(45,212,160,0.15)',
            borderColor: '#2dd4a0',
            pointBackgroundColor: '#2dd4a0',
            borderWidth: 2,
            pointRadius: 3,
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            r: {
              ticks: { display: false },
              grid: { color: 'rgba(168,162,158,0.15)' },
              angleLines: { color: 'rgba(168,162,158,0.15)' },
              pointLabels: { color: '#a8a29e', font: { size: 10 } },
            }
          }
        }
      });

      window._radarChart = Chart.getChart(canvas);
    }

    function updateRadarWithProfile(profile) {
      if (!window._radarChart || !profile || !profile.category_breakdown) return;
      var breakdown = profile.category_breakdown;
      window._radarChart.data.datasets[0].data = CATEGORIES.map(function(c) {
        return breakdown[c] || 0;
      });
      window._radarChart.update();
    }

    function renderStyleChart(cls) {
      var canvas = document.getElementById('style-chart');
      if (!cls) { canvas.parentElement.innerHTML = '<p class="empty-text">No classification data</p>'; return; }

      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: ['Consensus Alignment', 'Contrarian Rate'],
          datasets: [{
            data: [cls.consensus_alignment, cls.contrarian_rate],
            backgroundColor: ['rgba(45,212,160,0.6)', 'rgba(232,116,97,0.6)'],
            borderColor: ['#2dd4a0', '#e87461'],
            borderWidth: 1,
            borderRadius: 4,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { max: 100, ticks: { color: '#78716c', callback: function(v) { return v + '%'; } }, grid: { color: 'rgba(168,162,158,0.1)' } },
            y: { ticks: { color: '#a8a29e' }, grid: { display: false } }
          }
        }
      });
    }

    function renderPositions(history) {
      var el = document.getElementById('positions-table');
      if (!history || !history.opinions || history.opinions.length === 0) {
        el.innerHTML = '<p class="empty-text">No opinion history available</p>';
        return;
      }

      var items = history.opinions.slice(0, 20);
      var rows = items.map(function(op) {
        var aligned = op.majority_position && op.answer.toLowerCase() === op.majority_position.toLowerCase();
        var alignIcon = !op.majority_position ? '<span style="color:var(--text-muted)">-</span>'
          : aligned ? '<span class="align-check">&#10003;</span>' : '<span class="align-cross">&#10007;</span>';
        var date = new Date(op.expressed_at || op.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return '<tr>' +
          '<td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><a href="/admin/market/' + op.market_id + '" style="color:var(--accent);text-decoration:none">' + escHtml(op.question || op.market_id) + '</a></td>' +
          '<td>' + escHtml(op.answer) + '</td>' +
          '<td>' + escHtml(op.majority_position || '-') + '</td>' +
          '<td style="text-align:center">' + alignIcon + '</td>' +
          '<td style="color:var(--text-muted)">' + date + '</td>' +
        '</tr>';
      }).join('');

      el.innerHTML = '<table>' +
        '<thead><tr><th>Market</th><th>Answer</th><th>Majority</th><th>Aligned</th><th>Date</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table>';
    }

    function renderPointsHistory(balance) {
      var el = document.getElementById('points-history');
      if (!balance || !balance.transactions || balance.transactions.length === 0) {
        el.innerHTML = '<p class="empty-text">No points transactions</p>';
        return;
      }

      var txns = balance.transactions.slice(0, 20);
      var rows = txns.map(function(tx) {
        var amtClass = tx.amount >= 0 ? 'color:var(--green)' : 'color:var(--red)';
        var date = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return '<tr>' +
          '<td style="color:var(--text-muted)">' + date + '</td>' +
          '<td>' + escHtml(tx.reason || tx.type || '-') + '</td>' +
          '<td style="' + amtClass + ';font-weight:600;font-variant-numeric:tabular-nums">' + (tx.amount >= 0 ? '+' : '') + tx.amount + '</td>' +
          '<td style="color:var(--text-muted);font-variant-numeric:tabular-nums">' + tx.balance_after + '</td>' +
        '</tr>';
      }).join('');

      el.innerHTML = '<div class="table-wrap"><table>' +
        '<thead><tr><th>Date</th><th>Reason</th><th>Amount</th><th>Balance</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>';
    }

    function renderGenesis(profile) {
      var el = document.getElementById('genesis-section');
      if (!profile || !profile.genesis_answers || profile.genesis_answers.length === 0) {
        el.innerHTML = '<p class="empty-text">No profile information available</p>';
        return;
      }

      el.innerHTML = profile.genesis_answers.map(function(a) {
        return '<div class="genesis-item">' +
          '<div class="genesis-label">' + escHtml(a.label || a.key) + '</div>' +
          '<div class="genesis-answer">' + escHtml(a.answer) + '</div>' +
        '</div>';
      }).join('');
    }

    async function init() {
      var [cls, profile, history, balance] = await Promise.all([
        loadClassification(), loadProfile(), loadHistory(), loadBalance()
      ]);

      renderProfileHeader(cls, profile);
      renderProvenance(profile);
      renderRadarChart(cls);
      renderStyleChart(cls);
      renderPositions(history);
      renderPointsHistory(balance);
      renderGenesis(profile);

      if (profile) updateRadarWithProfile(profile);
    }

    init();
    ${themeScript}
  </script>
</body>
</html>`;
}
