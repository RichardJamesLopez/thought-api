import { adminNavCSS, adminNavScript, renderAdminNav } from './admin-nav.js';
import { themeCSS, themeToggleButton, themeScript } from './theme.js';

export function renderSchedulePage(apiKey: string): string {
  const safeKey = JSON.stringify(apiKey);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thought — Schedule</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #1a1816;
      --surface: #292524;
      --border: #3d3533;
      --text: #a8a29e;
      --text-dark: #fafaf9;
      --text-muted: #78716c;
      --accent: #2dd4a0;
      --accent-light: rgba(45,212,160,.1);
      --red: #e87461;
      --red-bg: rgba(232,116,97,.1);
      --warn: #f5b55a;
      --warn-bg: rgba(245,181,90,.12);
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
    .topbar-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .topbar-wordmark { font-size: 13px; font-weight: 700; color: var(--text-dark); }
    .topbar-divider { width: 1px; height: 18px; background: var(--border); }
    .topbar-subtitle { font-size: 13px; color: var(--text-muted); }
    .topbar-actions { display:flex; align-items:center; gap:12px; }
    .main { max-width: 1400px; margin: 0 auto; padding: 28px 24px 40px; }
    .toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:20px; }
    .toolbar h1 { font-size: 20px; color: var(--text-dark); font-weight: 650; }
    .toolbar p { font-size: 13px; color: var(--text-muted); margin-top: 3px; }
    .btn, .link-btn {
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-dark);
      border-radius: 4px;
      padding: 8px 12px;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: border-color .15s, background .15s;
    }
    .btn:hover, .link-btn:hover { border-color: var(--accent); background: var(--accent-light); }
    .btn-primary { background: var(--accent); color: #1a1816; border-color: var(--accent); }
    .btn-danger { color: var(--red); }
    .alert {
      display:none;
      margin-bottom: 16px;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 10px 12px;
      color: var(--text-dark);
      background: var(--surface);
    }
    .board-wrap { overflow-x: auto; padding-bottom: 8px; }
    .board {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(220px, 1fr);
      gap: 16px;
      width: max-content;
    }
    .day-column {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .day-header { display: flex; flex-direction: column; gap: 2px; padding: 2px 2px 4px; }
    .day-title { color: var(--text-dark); font-weight: 700; font-size: 14px; }
    .day-subtitle { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
    .slot-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .slot-card.slot-empty { opacity: 0.6; }
    .slot-header {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:10px;
    }
    .slot-title { color: var(--text-dark); font-weight: 700; font-size: 13px; }
    .slot-meta { color: var(--text-muted); font-size: 11px; margin-top: 2px; }
    .pill {
      display:inline-flex;
      align-items:center;
      border:1px solid var(--border);
      border-radius: 999px;
      padding: 2px 8px;
      color: var(--text-muted);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .pill-scheduled { border-color: rgba(45,212,160,.35); color: var(--accent); background: rgba(45,212,160,.1); }
    .pill-active { border-color: rgba(245,181,90,.35); color: var(--warn); background: var(--warn-bg); }
    .pill-completed { border-color: rgba(232,116,97,.35); color: var(--red); background: var(--red-bg); }
    .slot-body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 10px; }
    .warning {
      background: var(--warn-bg);
      color: var(--warn);
      border: 1px solid rgba(245,181,90,.25);
      border-radius: 4px;
      padding: 6px 8px;
      font-size: 11px;
    }
    .market-list {
      display:flex;
      flex-direction:column;
      gap:8px;
      min-height: 24px;
      padding: 2px;
      border-radius: 6px;
    }
    .market-list.drag-over { outline: 2px dashed rgba(45,212,160,.5); background: rgba(45,212,160,.06); }
    .market-item {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      background: var(--surface);
      cursor: grab;
    }
    .market-item.dragging { opacity: .5; }
    .market-question { color: var(--text-dark); font-weight: 600; font-size: 13px; margin-bottom: 3px; }
    .market-meta { color: var(--text-muted); font-size: 12px; display:flex; justify-content:space-between; gap:10px; align-items:center; }
    .market-meta .btn { padding: 3px 8px; font-size: 12px; }
    .slot-actions { display:flex; justify-content:flex-end; padding-top: 4px; }
    .empty-state { padding: 32px; color: var(--text-muted); font-size: 13px; }
    @media (max-width: 720px) {
      .topbar { padding: 0 16px; }
      .toolbar { align-items:flex-start; flex-direction:column; }
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <button class="hamburger-btn" onclick="toggleNav()" aria-label="Menu">&#9776;</button>
      <a href="/admin/dashboard" class="topbar-wordmark" style="text-decoration:none;color:inherit">Thought</a>
      <span class="topbar-divider"></span>
      <span class="topbar-subtitle">Schedule</span>
    </div>
    <div class="topbar-actions">
      ${themeToggleButton}
    </div>
    ${renderAdminNav('schedule')}
  </div>

  <main class="main">
    <div class="toolbar">
      <div>
        <h1>Weekly Schedule</h1>
        <p>Drag and drop questions across AM/PM slots for the next 7 days.</p>
      </div>
    </div>
    <div id="alert" class="alert"></div>
    <div class="board-wrap">
      <section id="board" class="board"></section>
    </div>
  </main>

  <script>
    ${themeScript}
    ${adminNavScript}
    const API_KEY = ${safeKey};
    let draggedId = null;
    let draggedSessionId = null;

    function esc(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function showAlert(message) {
      const el = document.getElementById('alert');
      el.textContent = message;
      el.style.display = 'block';
    }

    async function api(path, options = {}) {
      const res = await fetch(path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + API_KEY,
          ...(options.headers || {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    }

    async function loadSchedule() {
      const data = await api('/admin/analytics/sessions?days=7');
      renderSchedule(data.sessions || []);
    }

    function renderSchedule(sessions) {
      const board = document.getElementById('board');
      if (!sessions.length) {
        board.innerHTML = '<div class="empty-state">No upcoming sessions found.</div>';
        return;
      }
      const days = {};
      const ordered = [];
      sessions.forEach((session) => {
        if (!days[session.local_date]) {
          days[session.local_date] = { slots: {} };
          ordered.push(session.local_date);
        }
        days[session.local_date].slots[session.slot_label] = session;
      });
      board.innerHTML = ordered.map(dateKey => renderDayColumn(dateKey, days[dateKey].slots)).join('');
    }

    function renderDayColumn(dateKey, slots) {
      const label = formatDateLabel(dateKey);
      return '<div class="day-column">'
        + '<div class="day-header">'
        + '<div class="day-title">' + esc(label) + '</div>'
        + '<div class="day-subtitle">' + esc(dateKey) + '</div>'
        + '</div>'
        + renderSlot(slots.AM, 'AM')
        + renderSlot(slots.PM, 'PM')
        + '</div>';
    }

    function renderSlot(session, slotLabel) {
      if (!session) {
        return '<article class="slot-card slot-empty">'
          + '<div class="slot-header">'
          + '<div><div class="slot-title">' + esc(slotLabel) + '</div>'
          + '<div class="slot-meta">No session scheduled</div></div>'
          + '<span class="pill">n/a</span>'
          + '</div>'
          + '</article>';
      }
      const marketHtml = session.markets.map(renderMarket).join('');
      const warning = session.markets.length === 0 ? '<div class="warning">Empty slot</div>' : '';
      const statusClass = 'pill-' + session.status;
      const deadlineText = new Date(session.deadline_utc).toLocaleString();
      const createUrl = '/admin/markets/new?session_date=' + encodeURIComponent(session.local_date)
        + '&session_slot=' + encodeURIComponent(slotLabel)
        + '&return_to=' + encodeURIComponent('/admin/schedule');
      return '<article class="slot-card" data-session-id="' + esc(session.id) + '">'
        + '<div class="slot-header">'
        + '<div><div class="slot-title">' + esc(slotLabel) + ' · ' + esc(session.local_time) + ' ET</div>'
        + '<div class="slot-meta">Deadline ' + esc(deadlineText) + '</div></div>'
        + '<span class="pill ' + esc(statusClass) + '">' + esc(session.status) + '</span>'
        + '</div>'
        + '<div class="slot-body">'
        + warning
        + '<div class="market-list" data-session-id="' + esc(session.id) + '" ondragover="handleDragOver(event)" ondragenter="handleDragEnter(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)">'
        + marketHtml
        + '</div>'
        + '<div class="slot-actions">'
        + '<a class="btn btn-primary" href="' + createUrl + '">Create market</a>'
        + '</div>'
        + '</div>'
        + '</article>';
    }

    function renderMarket(market) {
      return '<div class="market-item" draggable="true" data-market-id="' + esc(market.id) + '" ondragstart="handleDragStart(event)" ondragend="handleDragEnd(event)">'
        + '<div class="market-question">' + esc(market.question) + '</div>'
        + '<div class="market-meta"><span>' + esc(market.category) + ' · ' + esc(market.status) + '</span>'
        + '<a class="btn" href="/admin/market/' + esc(market.id) + '">Open market</a></div>'
        + '</div>';
    }

    function formatDateLabel(dateKey) {
      const date = new Date(dateKey + 'T00:00:00');
      return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
    }

    function handleDragStart(event) {
      draggedId = event.currentTarget.dataset.marketId;
      draggedSessionId = event.currentTarget.closest('.market-list')?.dataset.sessionId || null;
      event.currentTarget.classList.add('dragging');
    }

    function handleDragEnd(event) {
      event.currentTarget.classList.remove('dragging');
      clearDragOver();
      draggedId = null;
      draggedSessionId = null;
    }

    function handleDragEnter(event) {
      event.preventDefault();
      event.currentTarget.classList.add('drag-over');
    }

    function handleDragLeave(event) {
      const list = event.currentTarget;
      if (!list.contains(event.relatedTarget)) list.classList.remove('drag-over');
    }

    function handleDragOver(event) {
      event.preventDefault();
      const list = event.currentTarget;
      const after = getDragAfterElement(list, event.clientY);
      const dragged = document.querySelector('[data-market-id="' + draggedId + '"]');
      if (!dragged) return;
      if (after == null) list.appendChild(dragged);
      else list.insertBefore(dragged, after);
    }

    async function handleDrop(event) {
      event.preventDefault();
      const list = event.currentTarget;
      list.classList.remove('drag-over');
      const sessionId = list.dataset.sessionId;
      if (!sessionId || !draggedId) return;
      const marketIds = Array.from(list.querySelectorAll('.market-item')).map(el => el.dataset.marketId);
      if (draggedSessionId && draggedSessionId !== sessionId) {
        const sourceList = document.querySelector('.market-list[data-session-id="' + draggedSessionId + '"]');
        const sourceIds = sourceList ? Array.from(sourceList.querySelectorAll('.market-item')).map(el => el.dataset.marketId) : [];
        await api('/admin/analytics/sessions/' + encodeURIComponent(sessionId) + '/questions/reorder', {
          method: 'PATCH',
          body: JSON.stringify({ market_ids: marketIds }),
        });
        if (sourceList) {
          await api('/admin/analytics/sessions/' + encodeURIComponent(draggedSessionId) + '/questions/reorder', {
            method: 'PATCH',
            body: JSON.stringify({ market_ids: sourceIds }),
          });
        }
      } else {
        await api('/admin/analytics/sessions/' + encodeURIComponent(sessionId) + '/questions/reorder', {
          method: 'PATCH',
          body: JSON.stringify({ market_ids: marketIds }),
        });
      }
      await loadSchedule();
    }

    function clearDragOver() {
      document.querySelectorAll('.market-list.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    function getDragAfterElement(container, y) {
      const els = [...container.querySelectorAll('.market-item:not(.dragging)')];
      return els.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        return closest;
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    loadSchedule().catch(err => showAlert(err.message));
  </script>
</body>
</html>`;
}
