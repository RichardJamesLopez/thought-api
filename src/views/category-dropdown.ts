// Shared category dropdown component with colored dot icons
// Pattern: exports CSS, HTML renderer, and JS — same as theme.ts

export interface DropdownOption {
  value: string;
  label: string;
  color?: string;
}

export const DOMAIN_OPTIONS: DropdownOption[] = [
  { value: 'tech', label: 'Tech', color: '#38bdf8' },
  { value: 'fashion', label: 'Fashion', color: '#fbbf24' },
  { value: 'policy', label: 'Policy', color: '#f97316' },
  { value: 'philosophy', label: 'Philosophy', color: '#a78bfa' },
  { value: 'economics', label: 'Economics', color: '#2dd4a0' },
  { value: 'culture', label: 'Culture', color: '#fb923c' },
  { value: 'ai-native', label: 'AI-Native', color: '#60a5fa' },
];

export const STYLE_OPTIONS: DropdownOption[] = [
  { value: 'contrarian', label: 'Contrarian' },
  { value: 'consensus_seeker', label: 'Consensus-Seeker' },
  { value: 'nuanced', label: 'Nuanced' },
  { value: 'decisive', label: 'Decisive' },
  { value: 'balanced', label: 'Balanced' },
];

export const TYPE_OPTIONS: DropdownOption[] = [
  { value: 'personal_assistant', label: 'Personal Assistant' },
  { value: 'research_agent', label: 'Research Agent' },
  { value: 'lifecycle_system', label: 'Lifecycle/System' },
  { value: 'unknown', label: 'Unknown' },
];

export const categoryDropdownCSS = `
    .cat-dropdown { position: relative; display: inline-block; }
    .cat-dropdown-trigger {
      display: flex; align-items: center; gap: 8px;
      background: var(--bg); color: var(--text); border: 1px solid var(--border);
      border-radius: 4px; padding: 6px 12px; font-size: 13px; cursor: pointer;
      transition: border-color .15s; min-width: 140px; justify-content: space-between;
    }
    .cat-dropdown-trigger:hover { border-color: var(--accent); }
    .cat-dropdown-trigger .chevron {
      width: 10px; height: 10px; flex-shrink: 0; transition: transform .2s;
    }
    .cat-dropdown.open .cat-dropdown-trigger .chevron { transform: rotate(180deg); }
    .cat-dropdown-menu {
      position: absolute; top: calc(100% + 4px); left: 0; min-width: 200px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,.3); z-index: 150;
      display: none; flex-direction: column; overflow: hidden;
    }
    .cat-dropdown.open .cat-dropdown-menu { display: flex; }
    .cat-dropdown-option {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 14px; cursor: pointer; transition: background .1s;
      font-size: 13px; color: var(--text); user-select: none;
    }
    .cat-dropdown-option:hover { background: var(--bg); }
    .cat-dropdown-option.selected { background: var(--accent-light); color: var(--text-dark); }
    .cat-dot {
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
    }
    .cat-check {
      margin-left: auto; font-size: 12px; color: var(--accent); opacity: 0;
    }
    .cat-dropdown-option.selected .cat-check { opacity: 1; }
    .cat-dropdown-sep { height: 1px; background: var(--border); margin: 2px 0; }
`;

export function renderCategoryDropdown(id: string, options: DropdownOption[], allLabel?: string): string {
  const label = allLabel || 'All Domains';
  const hasDots = options.some((o) => o.color);

  const optionItems = options
    .map(
      (o) =>
        `<div class="cat-dropdown-option" data-value="${o.value}" onclick="catSelect('${id}','${o.value}')">
        ${hasDots ? `<span class="cat-dot" style="background:${o.color}"></span>` : ''}
        <span>${o.label}</span>
        <span class="cat-check">&#10003;</span>
      </div>`
    )
    .join('\n');

  return `<div class="cat-dropdown" id="${id}-dropdown">
    <button class="cat-dropdown-trigger" onclick="catToggle('${id}')" type="button">
      <span id="${id}-trigger-text">${label}</span>
      <svg class="chevron" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,1 5,5 9,1"/></svg>
    </button>
    <div class="cat-dropdown-menu" id="${id}-menu">
      <div class="cat-dropdown-option selected" data-value="all" onclick="catSelect('${id}','all')">
        ${hasDots ? `<span class="cat-dot" style="background:var(--text-muted)"></span>` : ''}
        <span>${label}</span>
        <span class="cat-check">&#10003;</span>
      </div>
      <div class="cat-dropdown-sep"></div>
      ${optionItems}
    </div>
  </div>`;
}

export const categoryDropdownScript = `
    var catSelections = {};

    function catGetAllLabel(id) {
      var menu = document.getElementById(id + '-menu');
      var allOpt = menu.querySelector('[data-value="all"]');
      var spans = allOpt.querySelectorAll('span');
      for (var i = 0; i < spans.length; i++) {
        if (!spans[i].classList.contains('cat-dot') && !spans[i].classList.contains('cat-check')) {
          return spans[i].textContent;
        }
      }
      return 'All';
    }

    function catToggle(id) {
      var dd = document.getElementById(id + '-dropdown');
      dd.classList.toggle('open');
    }

    function catSelect(id, value) {
      if (!catSelections[id]) catSelections[id] = [];
      var menu = document.getElementById(id + '-menu');
      var opts = menu.querySelectorAll('.cat-dropdown-option');
      var allOpt = menu.querySelector('[data-value="all"]');

      if (value === 'all') {
        opts.forEach(function(o) { o.classList.remove('selected'); });
        allOpt.classList.add('selected');
        catSelections[id] = [];
      } else {
        allOpt.classList.remove('selected');
        var clicked = menu.querySelector('[data-value="' + value + '"]');
        clicked.classList.toggle('selected');

        catSelections[id] = [];
        menu.querySelectorAll('.cat-dropdown-option.selected').forEach(function(o) {
          var v = o.getAttribute('data-value');
          if (v !== 'all') catSelections[id].push(v);
        });

        if (catSelections[id].length === 0) {
          allOpt.classList.add('selected');
        }
      }

      // Keep legacy selectedDomains in sync
      if (id === 'domain') selectedDomains = catSelections[id];

      catUpdateTrigger(id);
      currentPage = 0;
      loadAgents();
    }

    function catUpdateTrigger(id) {
      var sel = catSelections[id] || [];
      var trigger = document.getElementById(id + '-trigger-text');
      var allLabel = catGetAllLabel(id);
      if (sel.length === 0) {
        trigger.textContent = allLabel;
      } else if (sel.length <= 2) {
        var menu = document.getElementById(id + '-menu');
        var names = sel.map(function(d) {
          var el = menu.querySelector('[data-value="' + d + '"]');
          if (!el) return d;
          var spans = el.querySelectorAll('span');
          for (var i = 0; i < spans.length; i++) {
            if (!spans[i].classList.contains('cat-dot') && !spans[i].classList.contains('cat-check')) {
              return spans[i].textContent;
            }
          }
          return d;
        });
        trigger.textContent = names.join(', ');
      } else {
        trigger.textContent = sel.length + ' selected';
      }
    }

    // Close dropdown on click outside
    document.addEventListener('click', function(e) {
      document.querySelectorAll('.cat-dropdown.open').forEach(function(dd) {
        if (!dd.contains(e.target)) dd.classList.remove('open');
      });
    });
`;
