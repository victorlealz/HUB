const PATHS = {
  apps: '/data/apps.json',
  config: '/config/site.json',
  fallbackIcon: '/assets/app-placeholder.svg'
};

const state = {
  apps: [],
  filtered: [],
  query: '',
  commandQuery: '',
  activeIndex: 0,
  config: null
};

const els = {
  appGrid: document.querySelector('#appGrid'),
  appCount: document.querySelector('#appCount'),
  resultStatus: document.querySelector('#resultStatus'),
  emptyState: document.querySelector('#emptyState'),
  loadError: document.querySelector('#loadError'),
  clearSearch: document.querySelector('#clearSearch'),
  mainSearch: document.querySelector('#mainSearch'),
  searchForm: document.querySelector('#searchForm'),
  openSearch: document.querySelector('#openSearch'),
  commandPalette: document.querySelector('#commandPalette'),
  commandInput: document.querySelector('#commandInput'),
  commandResults: document.querySelector('#commandResults'),
  closeSearch: document.querySelector('#closeSearch'),
  shortcutMod: document.querySelector('.shortcut-mod'),
  eyebrow: document.querySelector('#eyebrow'),
  heroTitle: document.querySelector('#heroTitle'),
  heroCopy: document.querySelector('#heroCopy'),
  toast: document.querySelector('#toast')
};

init();

async function init() {
  setShortcutLabel();
  bindEvents();

  try {
    const [catalog, config] = await Promise.all([
      fetchJson(PATHS.apps),
      fetchJson(PATHS.config).catch(() => null)
    ]);

    state.config = config;
    applyConfig(config);
    state.apps = normalizeCatalog(catalog);
    state.filtered = [...state.apps];
    renderCatalog();
    renderCommandResults();
  } catch (error) {
    console.error('[HubWinZip144] Falha ao carregar o catálogo:', error);
    renderLoadError();
  }
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} em ${path}`);
  }
  return response.json();
}

function normalizeCatalog(catalog) {
  const source = Array.isArray(catalog) ? catalog : catalog?.apps;
  if (!Array.isArray(source)) {
    throw new TypeError('apps.json precisa conter um array ou um objeto com a chave "apps".');
  }

  return source
    .map((item, index) => normalizeApp(item, index))
    .filter(Boolean);
}

function normalizeApp(item, index) {
  if (!item || typeof item !== 'object') return null;

  const url = safeUrl(item.url);
  if (!url) {
    console.warn(`[HubWinZip144] Item ${index + 1} ignorado: URL ausente ou inválida.`);
    return null;
  }

  const name = cleanText(item.name) || deriveName(url);
  const icon = safeAssetUrl(item.icon) || PATHS.fallbackIcon;
  const description = cleanText(item.description);
  const category = cleanText(item.category);
  const badge = cleanText(item.badge);
  const keywords = Array.isArray(item.keywords)
    ? item.keywords.map(cleanText).filter(Boolean)
    : [];

  return {
    id: `app-${index}`,
    url,
    icon,
    name,
    description,
    category,
    badge,
    featured: Boolean(item.featured),
    keywords,
    host: formatHost(url)
  };
}

function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim(), window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function safeAssetUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim(), window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim().slice(0, 180) : '';
}

function deriveName(url) {
  const parsed = new URL(url);
  let raw = '';

  if (parsed.hostname === 'github.com') {
    raw = parsed.pathname.split('/').filter(Boolean).at(-1) || parsed.hostname;
  } else {
    const host = parsed.hostname.replace(/^www\./, '');
    raw = host.endsWith('.pages.dev')
      ? host.replace(/\.pages\.dev$/, '')
      : host.split('.')[0] || host;
  }

  return decodeURIComponent(raw)
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim() || 'Plataforma';
}

function formatHost(url) {
  const parsed = new URL(url);
  if (parsed.hostname === 'github.com') {
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.length >= 2 ? `github.com/${parts[0]}` : 'github.com';
  }
  return parsed.hostname.replace(/^www\./, '');
}

function applyConfig(config) {
  if (!config || typeof config !== 'object') return;

  if (cleanText(config.brand)) {
    document.title = config.brand;
    document.querySelectorAll('.brand__name, .footer__brand span').forEach((node) => {
      node.textContent = config.brand;
    });
  }

  if (cleanText(config.eyebrow)) els.eyebrow.textContent = config.eyebrow;
  if (cleanText(config.description)) els.heroCopy.textContent = config.description;
  if (cleanText(config.headline)) setHeadline(config.headline);
}

function setHeadline(text) {
  const normalized = cleanText(text);
  if (!normalized) return;

  const splitAt = normalized.indexOf('. ');
  els.heroTitle.replaceChildren();

  if (splitAt === -1) {
    els.heroTitle.textContent = normalized;
    return;
  }

  const first = normalized.slice(0, splitAt + 1);
  const second = normalized.slice(splitAt + 2);
  els.heroTitle.append(document.createTextNode(first), document.createElement('br'));
  const span = document.createElement('span');
  span.textContent = second;
  els.heroTitle.append(span);
}

function bindEvents() {
  els.mainSearch.addEventListener('input', (event) => {
    state.query = event.target.value;
    filterCatalog();
  });

  els.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const first = state.filtered[0];
    if (first) openApp(first);
  });

  els.clearSearch.addEventListener('click', () => {
    els.mainSearch.value = '';
    state.query = '';
    filterCatalog();
    els.mainSearch.focus();
  });

  els.openSearch.addEventListener('click', openCommandPalette);
  els.closeSearch.addEventListener('click', closeCommandPalette);

  els.commandPalette.addEventListener('click', (event) => {
    if (event.target === els.commandPalette) closeCommandPalette();
  });

  els.commandInput.addEventListener('input', (event) => {
    state.commandQuery = event.target.value;
    state.activeIndex = 0;
    renderCommandResults();
  });

  els.commandInput.addEventListener('keydown', handleCommandKeys);

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
    const commandShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';

    if (commandShortcut) {
      event.preventDefault();
      els.commandPalette.open ? closeCommandPalette() : openCommandPalette();
      return;
    }

    if (event.key === '/' && !typing && !els.commandPalette.open) {
      event.preventDefault();
      els.mainSearch.focus();
    }
  });
}

function filterCatalog() {
  const query = normalizeSearch(state.query);
  state.filtered = query
    ? state.apps.filter((app) => appMatches(app, query))
    : [...state.apps];
  renderCatalog();
}

function appMatches(app, normalizedQuery) {
  const haystack = [
    app.name,
    app.description,
    app.category,
    app.host,
    app.url,
    ...app.keywords
  ].join(' ');

  return normalizeSearch(haystack).includes(normalizedQuery);
}

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function renderCatalog() {
  els.appGrid.replaceChildren();
  els.appGrid.setAttribute('aria-busy', 'false');
  els.loadError.hidden = true;
  els.appCount.textContent = String(state.apps.length);

  const hasQuery = Boolean(normalizeSearch(state.query));
  const count = state.filtered.length;
  els.resultStatus.textContent = hasQuery
    ? `${count} resultado${count === 1 ? '' : 's'}`
    : `${state.apps.length} disponíveis`;

  if (!count) {
    els.appGrid.hidden = true;
    els.emptyState.hidden = false;
    return;
  }

  els.appGrid.hidden = false;
  els.emptyState.hidden = true;

  const fragment = document.createDocumentFragment();
  state.filtered.forEach((app) => fragment.append(createAppCard(app)));
  els.appGrid.append(fragment);
}

function createAppCard(app) {
  const article = document.createElement('article');
  article.className = 'app-card';

  const link = document.createElement('a');
  link.className = 'app-card__link';
  link.href = app.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `Abrir ${app.name}`);

  const top = document.createElement('div');
  top.className = 'app-card__top';

  const img = document.createElement('img');
  img.className = 'app-card__icon';
  img.src = app.icon;
  img.alt = '';
  img.width = 48;
  img.height = 48;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.addEventListener('error', () => {
    if (!img.src.endsWith(PATHS.fallbackIcon)) img.src = PATHS.fallbackIcon;
  }, { once: true });

  const arrow = document.createElement('span');
  arrow.className = 'app-card__arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';

  top.append(img, arrow);

  const name = document.createElement('h3');
  name.className = 'app-card__name';
  name.textContent = app.name;

  const meta = document.createElement('div');
  meta.className = 'app-card__meta';

  const metaText = document.createElement('span');
  metaText.textContent = app.description || app.category || app.host;
  meta.append(metaText);

  if (app.badge || app.featured) {
    const badge = document.createElement('small');
    badge.className = 'app-card__badge';
    badge.textContent = app.badge || 'destaque';
    meta.append(badge);
  }

  link.append(top, name, meta);
  article.append(link);
  return article;
}

function renderLoadError() {
  els.appGrid.hidden = true;
  els.emptyState.hidden = true;
  els.loadError.hidden = false;
  els.appGrid.setAttribute('aria-busy', 'false');
  els.appCount.textContent = '0';
  els.resultStatus.textContent = 'Catálogo indisponível';
}

function setShortcutLabel() {
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  els.shortcutMod.textContent = isMac ? '⌘' : 'Ctrl';
}

function openCommandPalette() {
  if (!state.apps.length) return;
  state.commandQuery = '';
  state.activeIndex = 0;
  els.commandInput.value = '';
  renderCommandResults();

  if (!els.commandPalette.open) els.commandPalette.showModal();
  requestAnimationFrame(() => els.commandInput.focus());
}

function closeCommandPalette() {
  if (els.commandPalette.open) els.commandPalette.close();
}

function commandMatches() {
  const query = normalizeSearch(state.commandQuery);
  const list = query ? state.apps.filter((app) => appMatches(app, query)) : state.apps;
  return list.slice(0, 10);
}

function renderCommandResults() {
  if (!els.commandResults) return;
  const matches = commandMatches();
  els.commandResults.replaceChildren();

  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'command-empty';
    empty.textContent = 'Nenhuma plataforma corresponde a essa pesquisa.';
    els.commandResults.append(empty);
    return;
  }

  if (state.activeIndex >= matches.length) state.activeIndex = matches.length - 1;

  const fragment = document.createDocumentFragment();
  matches.forEach((app, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'command-item';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(index === state.activeIndex));
    button.dataset.index = String(index);

    const img = document.createElement('img');
    img.src = app.icon;
    img.alt = '';
    img.width = 36;
    img.height = 36;
    img.addEventListener('error', () => { img.src = PATHS.fallbackIcon; }, { once: true });

    const text = document.createElement('span');
    text.className = 'command-item__text';

    const name = document.createElement('span');
    name.className = 'command-item__name';
    name.textContent = app.name;

    const host = document.createElement('span');
    host.className = 'command-item__host';
    host.textContent = app.description || app.host;

    const arrow = document.createElement('span');
    arrow.className = 'command-item__arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';

    text.append(name, host);
    button.append(img, text, arrow);

    button.addEventListener('mouseenter', () => {
      state.activeIndex = index;
      syncCommandSelection();
    });

    button.addEventListener('click', () => {
      openApp(app);
      closeCommandPalette();
    });

    fragment.append(button);
  });

  els.commandResults.append(fragment);
}

function handleCommandKeys(event) {
  const matches = commandMatches();
  if (!matches.length) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    state.activeIndex = (state.activeIndex + 1) % matches.length;
    syncCommandSelection(true);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    state.activeIndex = (state.activeIndex - 1 + matches.length) % matches.length;
    syncCommandSelection(true);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const app = matches[state.activeIndex];
    if (app) {
      openApp(app);
      closeCommandPalette();
    }
  }
}

function syncCommandSelection(scroll = false) {
  const items = [...els.commandResults.querySelectorAll('.command-item')];
  items.forEach((item, index) => {
    item.setAttribute('aria-selected', String(index === state.activeIndex));
  });
  if (scroll) items[state.activeIndex]?.scrollIntoView({ block: 'nearest' });
}

function openApp(app) {
  const opened = window.open(app.url, '_blank', 'noopener,noreferrer');
  if (!opened) showToast('O navegador bloqueou a nova aba. Libere pop-ups para abrir a plataforma.');
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  toastTimer = setTimeout(() => els.toast.classList.remove('is-visible'), 3200);
}