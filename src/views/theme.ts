// Shared light/dark theme CSS and toggle JS for all admin pages

export const themeCSS = `
    [data-theme="light"] {
      --bg: #f4f4f5;
      --surface: #ffffff;
      --border: #e4e4e7;
      --shadow: 0 2px 8px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04);
      --text: #52525b;
      --text-dark: #18181b;
      --text-muted: #a1a1aa;
      --accent: #10b981;
      --accent-light: rgba(16,185,129,.08);
      --green: #10b981;
      --green-bg: rgba(16,185,129,.08);
      --yellow: #d97706;
      --yellow-bg: rgba(217,119,6,.08);
      --red: #dc2626;
      --red-bg: rgba(220,38,38,.06);
    }
    .theme-toggle {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text-muted);
      transition: color .15s, border-color .15s;
    }
    .theme-toggle:hover { color: var(--text-dark); border-color: var(--text); }
    .theme-toggle svg { width: 20px; height: 20px; }
    .theme-toggle .icon-sun { display: none; }
    .theme-toggle .icon-moon { display: block; }
    [data-theme="light"] .theme-toggle .icon-sun { display: block; }
    [data-theme="light"] .theme-toggle .icon-moon { display: none; }
`;

export const themeToggleButton = `<button class="theme-toggle" onclick="toggleTheme()" title="Toggle light/dark mode">
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      </button>`;

export const themeScript = `
    function toggleTheme() {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch(e) {}
    }
    (function() {
      var saved = null;
      try { saved = localStorage.getItem('theme'); } catch(e) {}
      if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    })();
`;
