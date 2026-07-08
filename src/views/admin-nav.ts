export const adminNavCSS = `
    .hamburger-btn { background: none; border: none; color: var(--text-dark); font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background .15s; line-height: 1; }
    .hamburger-btn:hover { background: var(--bg); }
    .nav-dropdown { position: absolute; top: 56px; left: 0; background: var(--surface); border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 0; box-shadow: 0 8px 24px rgba(0,0,0,.4); min-width: 220px; display: none; flex-direction: column; z-index: 200; }
    .nav-dropdown.open { display: flex; }
    .nav-item { padding: 12px 20px; font-size: 14px; color: var(--text); text-decoration: none; transition: background .15s, color .15s; }
    .nav-item:hover { background: var(--bg); color: var(--text-dark); }
    .nav-item.active { color: var(--accent); font-weight: 600; }
    .nav-divider { height: 1px; background: var(--border); margin: 4px 0; }
`;

export const adminNavScript = `
    function toggleNav() {
      var dd = document.getElementById('nav-dropdown');
      if (dd) dd.classList.toggle('open');
    }
    document.addEventListener('click', function(e) {
      var dd = document.getElementById('nav-dropdown');
      var btn = document.querySelector('.hamburger-btn');
      if (!dd || !btn) return;
      if (!dd.contains(e.target) && !btn.contains(e.target)) dd.classList.remove('open');
    });
`;

type NavItem = { key: string; label: string; href: string };

const PRIMARY_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin/dashboard' },
  { key: 'studies', label: 'Studies', href: '/admin/studies' },
  { key: 'agents', label: 'Agents', href: '/admin/directory' },
  { key: 'markets', label: 'Markets', href: '/admin/markets' },
  { key: 'schedule', label: 'Schedule', href: '/admin/schedule' },
];

const TOOL_ITEMS: NavItem[] = [
  { key: 'pool-analyzer', label: 'Pool Analyzer', href: '/admin/pool-analyzer' },
  { key: 'cohort-analyzer', label: 'Cohort Analyzer', href: '/admin/cohort-analyzer' },
  { key: 'longform', label: 'Longform Review', href: '/admin/longform-queue' },
  { key: 'settings', label: 'Settings', href: '/admin/settings/classifications' },
];

export function renderAdminNav(activeKey?: string): string {
  const link = (item: NavItem) =>
    `<a href="${item.href}" class="nav-item${activeKey === item.key ? ' active' : ''}">${item.label}</a>`;

  return `<div class="nav-dropdown" id="nav-dropdown">
      ${PRIMARY_ITEMS.map(link).join('')}
      <div class="nav-divider"></div>
      ${TOOL_ITEMS.map(link).join('')}
      <a href="/admin/markets/new" class="nav-item" style="color:var(--accent)">+ Create Market</a>
    </div>`;
}
