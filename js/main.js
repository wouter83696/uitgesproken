import { supabase } from './supabase-client.js';

const PAGE = document.body && document.body.dataset ? document.body.dataset.page : '';
const RESERVED_PUBLIC_SEGMENTS = {
  admin: 1,
  assets: 1,
  css: 1,
  dashboard: 1,
  js: 1,
  kaarten: 1,
  login: 1,
  scripts: 1,
  sets: 1,
  templates: 1,
  wizard: 1
};
const PUBLIC_ROUTE = parsePublicRoute();
const VIEW_IMAGE_FOLDER_ORDER = ['cards_rect', 'cards', 'cards_square'];
const THUMB_IMAGE_FOLDER_ORDER = ['thumbs', 'cards_rect', 'cards_square', 'cards'];
const ASSET_EXISTS_CACHE = new Map();

if (PAGE === 'grid') {
  void initSetsIndexPage();
}

if (PAGE === 'kaarten') {
  void initCardsPage();
}

if (PAGE === 'uitleg') {
  void initUitlegPage();
}

async function initSetsIndexPage() {
  const els = {
    pill: document.getElementById('themePill'),
    themePillText: document.getElementById('themePillText'),
    menu: document.getElementById('themeMenu'),
    menuOverlay: document.getElementById('themeMenuOverlay'),
    menuList: document.getElementById('menuList'),
    allSetsBtn: document.getElementById('naarOverzicht'),
    menuHeaderTitle: document.getElementById('menuHeaderTitle'),
    menuContrastToggle: document.getElementById('menuContrastToggle'),
    menuInfoBtn: document.getElementById('menuInfoBtn'),
    menuShuffleToggle: document.getElementById('menuShuffleToggle'),
    setsCarousel: document.getElementById('setsCarousel'),
    setsDots: document.getElementById('setsDots'),
    setsGrid: document.getElementById('setsGrid'),
    infoSheet: document.getElementById('indexInfoSheet'),
    infoOverlay: document.getElementById('indexInfoOverlay'),
    infoClose: document.getElementById('indexInfoClose'),
    infoText: document.getElementById('indexInfoSlideText')
  };

  const publicSpaceData = PUBLIC_ROUTE.spaceSlug
    ? await loadPublicSpaceIndex(PUBLIC_ROUTE.spaceSlug).catch(function(){ return null; })
    : null;
  const registry = publicSpaceData || await fetchJson(pagePath('sets/index.json')).catch(function(){ return null; });
  if (!registry || !Array.isArray(registry.sets)) return;

  const loadedSets = publicSpaceData
    ? registry.sets.slice()
    : await Promise.all(registry.sets.map(function(entry){
        return loadIndexSetRecord(entry);
      }));
  const sets = loadedSets.filter(Boolean);
  if (!sets.length) return;

  // Spacenaam in paginatitel en topbar-brand zetten als we een space-pagina laden
  if (publicSpaceData && publicSpaceData.spaceName) {
    document.title = publicSpaceData.spaceName;
    const brandEl = document.getElementById('themePillBrand');
    if (brandEl) brandEl.textContent = publicSpaceData.spaceName;
  }

  const defaultId = registry.default || (sets[0] && sets[0].id) || '';
  let order = sets.map(function(set){ return set.id; });
  let shuffled = false;
  let activeId = defaultId;
  let menuOpen = false;

  applyContrast(loadContrastMode());
  renderAll();
  bindEvents();

  function bindEvents() {
    if (els.pill) {
      els.pill.addEventListener('click', function(e){
        e.preventDefault();
        toggleMenu();
      });
    }
    if (els.menuOverlay) {
      els.menuOverlay.addEventListener('click', closeMenu);
    }
    if (els.menuContrastToggle) {
      els.menuContrastToggle.addEventListener('click', function(){
        const next = document.documentElement.getAttribute('data-contrast') === 'dark' ? 'light' : 'dark';
        persistContrast(next);
        applyContrast(next);
      });
    }
    if (els.menuInfoBtn) {
      els.menuInfoBtn.addEventListener('click', function(){
        openInfo();
        closeMenu();
      });
    }
    if (els.menuShuffleToggle) {
      els.menuShuffleToggle.addEventListener('click', function(){
        shuffled = !shuffled;
        els.menuShuffleToggle.setAttribute('aria-pressed', shuffled ? 'true' : 'false');
        order = shuffled ? shuffleArray(sets.map(function(set){ return set.id; })) : sets.map(function(set){ return set.id; });
        renderAll();
      });
    }
    if (els.infoOverlay) {
      els.infoOverlay.addEventListener('click', closeInfo);
    }
    if (els.infoClose) {
      els.infoClose.addEventListener('click', closeInfo);
    }
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') {
        closeMenu();
        closeInfo();
      }
    });
  }

  function renderAll() {
    const ordered = order
      .map(function(id){ return sets.find(function(set){ return set.id === id; }) || null; })
      .filter(Boolean);
    renderMenu(ordered);
    renderCarousel(ordered);
    renderGrid(ordered, registry.uiDefaults && registry.uiDefaults.index);
    updateInfoFromActive();
  }

  function renderMenu(list) {
    if (!els.menuList) return;
    els.menuList.innerHTML = list.map(function(set){
      return '' +
        '<button class="menuItem" type="button" data-set-id="' + esc(set.id) + '">' +
          '<span class="miLabel">' + esc(set.title) + '</span>' +
          '<span class="miThumbRight">' +
            '<span class="menuThumbCard">' +
              (set.menuThumb ? '<img src="' + esc(set.menuThumb) + '" alt="">' : '') +
            '</span>' +
          '</span>' +
        '</button>';
    }).join('');
    els.menuList.querySelectorAll('.menuItem').forEach(function(btn){
      btn.addEventListener('click', function(){
        const id = btn.getAttribute('data-set-id') || '';
        if (id) activeId = id;
        updateInfoFromActive();
        const set = sets.find(function(item){ return item.id === id; }) || null;
        if (set) location.href = cardsHrefForSet(set);
      });
    });
    if (els.menuHeaderTitle) els.menuHeaderTitle.textContent = 'Kaartensets';
  }

  function renderCarousel(list) {
    if (els.setsCarousel) {
      els.setsCarousel.innerHTML = list.map(function(set, idx){
        return '' +
          '<div class="setsHeroSlide" data-set-id="' + esc(set.id) + '" data-order="' + idx + '">' +
            '<div class="setsHeroSlideInner">' +
              '<a class="setsHeroCard" href="' + esc(cardsHrefForSet(set)) + '">' +
                '<div class="cardInner">' +
                  (set.cover ? '<img class="bg" src="' + esc(set.cover) + '" alt="' + esc(set.title) + '">' : '') +
                '</div>' +
              '</a>' +
            '</div>' +
          '</div>';
      }).join('');
    }
    if (els.setsDots) {
      els.setsDots.innerHTML = list.map(function(set, idx){
        const active = set.id === activeId || (!activeId && idx === 0);
        return '<span class="setsDot' + (active ? ' is-active' : '') + '" data-set-id="' + esc(set.id) + '"></span>';
      }).join('');
    }
  }

  function renderGrid(list, indexUi) {
    if (!els.setsGrid) return;
    const limit = indexUi && Number(indexUi.gridLimit) > 0 ? Number(indexUi.gridLimit) : 6;
    els.setsGrid.innerHTML = list.slice(0, limit).map(function(set, idx){
      return '' +
        '<a class="setGridCard" href="' + esc(cardsHrefForSet(set)) + '" style="--card-i:' + idx + '">' +
          '<div class="cardInner">' +
            (set.cover ? '<img class="bg" src="' + esc(set.cover) + '" alt="' + esc(set.title) + '">' : '') +
          '</div>' +
        '</a>';
    }).join('');
    const layout = resolveLayout(indexUi, list);
    document.body.setAttribute('data-index-layout', layout);
  }

  function updateInfoFromActive() {
    const active = sets.find(function(set){ return set.id === activeId; }) || sets[0] || null;
    if (!active) return;
    if (els.themePillText) els.themePillText.textContent = active.title || active.id;
    if (els.infoText) {
      els.infoText.innerHTML = formatInfoBodyHtml(active.infoText || '');
    }
  }

  function openInfo() {
    if (!els.infoSheet || !els.infoOverlay) return;
    els.infoSheet.hidden = false;
    els.infoOverlay.hidden = false;
    requestAnimationFrame(function(){
      els.infoSheet.classList.add('open');
      els.infoOverlay.classList.add('open');
    });
  }

  function closeInfo() {
    if (!els.infoSheet || !els.infoOverlay) return;
    els.infoSheet.classList.remove('open');
    els.infoOverlay.classList.remove('open');
    setTimeout(function(){
      els.infoSheet.hidden = true;
      els.infoOverlay.hidden = true;
    }, 220);
  }

  function openMenu() {
    if (!els.menu || !els.menuOverlay) return;
    closeInfo();
    els.menu.hidden = false;
    els.menuOverlay.hidden = false;
    els.menu.classList.remove('is-closing');
    if (els.pill) els.pill.setAttribute('aria-expanded', 'true');
    menuOpen = true;
  }

  function closeMenu() {
    if (!els.menu || !els.menuOverlay) return;
    els.menu.classList.add('is-closing');
    if (els.pill) els.pill.setAttribute('aria-expanded', 'false');
    menuOpen = false;
    setTimeout(function(){
      els.menu.hidden = true;
      els.menuOverlay.hidden = true;
      els.menu.classList.remove('is-closing');
    }, 220);
  }

  function toggleMenu() {
    if (menuOpen) closeMenu();
    else openMenu();
  }
}

async function initUitlegPage() {
  const els = {
    img: document.getElementById('uitlegImg'),
    theme: document.getElementById('kaartThema'),
    desc: document.getElementById('desc'),
    card: document.querySelector('.uitlegCardInner')
  };
  if (!els.img || !els.desc) return;

  const spaceSlug = readQueryParam('space');
  const setId = readQueryParam('set') || 'samenwerken';
  const set = spaceSlug
    ? await loadPublicCardsSet(spaceSlug, setId).catch(function(){ return null; })
    : await loadCardsSetRecord(setId, 'Samen onderzoeken', '').catch(function(){ return null; });
  if (!set) {
    els.desc.innerHTML = '<p class="infoTextSubhead"><strong>Deze kaartenset is nog niet publiek beschikbaar.</strong></p>' +
      '<p>Controleer in het dashboard of de set gepubliceerd is en zichtbaar staat.</p>';
    return;
  }

  const slides = set.infoSlides.length ? set.infoSlides : [{
    key: 'cover',
    title: set.title,
    body: set.infoText,
    img: set.cover,
    alt: set.title
  }];
  let index = 0;

  document.title = (set.title || 'Samen onderzoeken') + ' — Uitgesproken';
  render();

  if (els.card) {
    els.card.addEventListener('click', function(ev){
      const rect = els.card.getBoundingClientRect();
      const leftSide = ev.clientX - rect.left < rect.width / 2;
      index = Math.max(0, Math.min(slides.length - 1, index + (leftSide ? -1 : 1)));
      render();
    });
  }

  function render() {
    const slide = slides[index] || slides[0];
    if (!slide) return;
    els.img.src = slide.img || set.cover || '';
    els.img.alt = slide.alt || slide.title || set.title || '';
    if (els.theme) {
      const isCover = !slide.key || slide.key === 'cover';
      els.theme.style.display = isCover ? 'none' : 'block';
      els.theme.textContent = isCover ? '' : (slide.title || slide.alt || '');
    }
    els.desc.innerHTML =
      (slide.title ? '<p class="infoTextSubhead"><strong>' + esc(slide.title) + '</strong></p>' : '') +
      (slide.body ? formatInfoBodyHtml(slide.body) : '');
  }
}

async function initCardsPage() {
  const els = {
    pill: document.getElementById('themePill'),
    themePillText: document.getElementById('themePillText'),
    menu: document.getElementById('themeMenu'),
    menuOverlay: document.getElementById('themeMenuOverlay'),
    menuList: document.getElementById('menuList'),
    menuHeaderTitle: document.getElementById('menuHeaderTitle'),
    menuContrastToggle: document.getElementById('menuContrastToggle'),
    menuInfoBtn: document.getElementById('menuInfoBtn'),
    menuShuffleToggle: document.getElementById('menuShuffleToggle'),
    allSetsBtn: document.getElementById('naarOverzicht'),
    infoSheet: document.getElementById('infoSheet'),
    infoOverlay: document.getElementById('infoOverlay'),
    infoClose: document.getElementById('infoClose'),
    infoCarousel: document.getElementById('infoCarousel'),
    mainCarousel: document.getElementById('mainCarousel')
  };

  let set = null;
  if (PUBLIC_ROUTE.spaceSlug && PUBLIC_ROUTE.setSlug) {
    set = await loadPublicCardsSet(PUBLIC_ROUTE.spaceSlug, PUBLIC_ROUTE.setSlug).catch(function(){ return null; });
  }

  if (!set) {
    const registry = await fetchJson(pagePath('sets/index.json')).catch(function(){ return null; });
    if (!registry || !Array.isArray(registry.sets) || !registry.sets.length) return;
    const requestedId = readQueryParam('set');
    const activeId = requestedId || registry.default || registry.sets[0].id;
    const entry = await resolveRegistrySetEntry(registry.sets, activeId);
    if (!entry || !entry.id) return;
    set = await loadCardsSetRecord(entry.id, entry.title || entry.id, entry.slug || '');
  }
  if (!set) return;

  applyContrast(loadContrastMode());
  applySetTheme(set);
  renderCardsPage();
  bindEvents();

  function bindEvents() {
    if (els.pill) {
      els.pill.addEventListener('click', function(e){
        e.preventDefault();
        toggleMenu();
      });
    }
    if (els.menuOverlay) {
      els.menuOverlay.addEventListener('click', closeMenu);
    }
    if (els.menuContrastToggle) {
      els.menuContrastToggle.addEventListener('click', function(){
        const next = document.documentElement.getAttribute('data-contrast') === 'dark' ? 'light' : 'dark';
        persistContrast(next);
        applyContrast(next);
      });
    }
    if (els.menuInfoBtn) {
      els.menuInfoBtn.addEventListener('click', function(){
        openInfo();
        closeMenu();
      });
    }
    if (els.menuShuffleToggle) {
      els.menuShuffleToggle.addEventListener('click', function(){
        set.shuffled = !set.shuffled;
        els.menuShuffleToggle.setAttribute('aria-pressed', set.shuffled ? 'true' : 'false');
        renderMainCarousel();
      });
    }
    if (els.allSetsBtn) {
      els.allSetsBtn.addEventListener('click', function(){
        closeMenu();
        location.href = PUBLIC_ROUTE.spaceSlug ? spaceHref(PUBLIC_ROUTE.spaceSlug) : pagePath('');
      });
    }
    if (els.infoOverlay) {
      els.infoOverlay.addEventListener('click', closeInfo);
    }
    if (els.infoClose) {
      els.infoClose.addEventListener('click', closeInfo);
    }
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') {
        closeMenu();
        closeInfo();
      }
    });
  }

  function renderCardsPage() {
    document.title = set.title || 'Uitgesproken';
    if (els.themePillText) els.themePillText.textContent = set.title || set.id;
    if (els.menuHeaderTitle) els.menuHeaderTitle.textContent = set.title || set.id;
    renderThemeMenu();
    renderInfoSlides();
    renderMainCarousel();
  }

  function renderThemeMenu() {
    if (!els.menuList) return;
    els.menuList.innerHTML = set.themes.map(function(theme){
      return '' +
        '<button class="menuItem" type="button" data-theme-key="' + esc(theme.key) + '">' +
          '<span class="miLabel">' + esc(theme.label) + '</span>' +
          '<span class="miThumbRight">' +
            '<span class="menuThumbCard">' +
              (theme.thumb ? '<img src="' + esc(theme.thumb) + '" alt="">' : '') +
            '</span>' +
          '</span>' +
        '</button>';
    }).join('');
    els.menuList.querySelectorAll('.menuItem').forEach(function(btn){
      btn.addEventListener('click', function(){
        const key = btn.getAttribute('data-theme-key') || '';
        closeMenu();
        jumpToTheme(key);
      });
    });
  }

  function renderInfoSlides() {
    if (!els.infoCarousel) return;
    const slides = set.infoSlides.length ? set.infoSlides : [{
      key: 'cover',
      title: set.title,
      body: set.infoText,
      img: set.cover,
      alt: set.title
    }];
    els.infoCarousel.innerHTML = slides.map(function(slide){
      const imgHtml = slide.img
        ? '<div class="infoSlideCard"><img src="' + esc(slide.img) + '" alt="' + esc(slide.alt || slide.title || '') + '"></div>'
        : '';
      return '' +
        '<div class="infoSlide" data-slide-key="' + esc(slide.key || '') + '">' +
          '<div class="infoSlideInner">' +
            imgHtml +
            '<div class="infoSlideText">' +
              (slide.title ? '<p class="infoTextSubhead"><strong>' + esc(slide.title) + '</strong></p>' : '') +
              (slide.body ? formatInfoBodyHtml(slide.body) : '') +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function renderMainCarousel() {
    if (!els.mainCarousel) return;
    const cards = set.shuffled ? shuffleArray(set.cards) : set.cards.slice();
    const sharedRenderer = window.PK && window.PK.sharedCardRenderer && typeof window.PK.sharedCardRenderer.render === 'function'
      ? window.PK.sharedCardRenderer
      : null;
    els.mainCarousel.innerHTML = cards.map(function(card){
      const hasBack = !!String(card.backText || '').trim();
      let cardMarkup = '';
      if (sharedRenderer) {
        const previewKey = card.themeKey || 'algemeen';
        const mode = typeof sharedRenderer.cardBuildModeForKey === 'function'
          ? sharedRenderer.cardBuildModeForKey(set.meta || {}, previewKey)
          : 'image';
        cardMarkup = sharedRenderer.render({
          meta: set.meta || {},
          wrapClass: 'pkViewerCardWrap',
          imgSrc: card.img || '',
          forceNoImage: mode === 'self',
          previewKey: previewKey,
          themeKey: previewKey,
          frontTxt: card.frontText || '',
          backTxt: card.backText || '',
          backDesignKey: card.backDesignKey || '',
          suppressEmptyFrontHint: true
        });
      } else {
        const backModeClass = set.backMode === 'mirror' ? ' is-mirror' : '';
        cardMarkup = '' +
          '<div class="pkFlipInner">' +
            '<div class="pkFace pkFront">' +
              (card.img ? '<img class="bg" src="' + esc(card.img) + '" alt="">' : '') +
              '<div class="cardsSlideQ"><div class="cardsSlideQText">' + esc(card.frontText) + '</div></div>' +
            '</div>' +
            '<div class="pkFace pkBack">' +
              (card.img ? '<img class="pkBackImg' + backModeClass + '" src="' + esc(card.img) + '" alt="">' : '') +
              '<div class="cardsSlideBackText"><div class="cardsSlideBackTextInner">' + esc(card.backText || '') + '</div></div>' +
            '</div>' +
          '</div>';
      }
      return '' +
        '<div class="cardsSlide" data-theme-key="' + esc(card.themeKey) + '">' +
          '<div class="cardsSlideInner">' +
            '<div class="cardsSlideCard' + (hasBack ? '' : ' is-static') + '" tabindex="0" role="' + (hasBack ? 'button' : 'img') + '" aria-label="' + esc(card.frontText) + '" data-flippable="' + (hasBack ? '1' : '0') + '">' +
              cardMarkup +
            '</div>' +
            '<div class="cardsSlideCaption">' + esc(card.themeLabel) + '</div>' +
          '</div>' +
        '</div>';
    }).join('');

    els.mainCarousel.querySelectorAll('.cardsSlideCard[data-flippable="1"]').forEach(function(cardEl){
      function toggleCard() {
        const faceInner = cardEl.querySelector('.cardFaceInner');
        if (faceInner) {
          faceInner.classList.toggle('flipped');
          return;
        }
        cardEl.classList.toggle('is-flipped');
      }
      cardEl.addEventListener('click', function(){
        toggleCard();
      });
      cardEl.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleCard();
        }
      });
    });
  }

  function jumpToTheme(themeKey) {
    if (!els.mainCarousel || !themeKey) return;
    const target = els.mainCarousel.querySelector('.cardsSlide[data-theme-key="' + cssEscape(themeKey) + '"]');
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  let menuOpen = false;
  function openInfo() {
    if (!els.infoSheet || !els.infoOverlay) return;
    els.infoSheet.hidden = false;
    els.infoOverlay.hidden = false;
    requestAnimationFrame(function(){
      els.infoSheet.classList.add('open');
      els.infoOverlay.classList.add('open');
    });
  }

  function closeInfo() {
    if (!els.infoSheet || !els.infoOverlay) return;
    els.infoSheet.classList.remove('open');
    els.infoOverlay.classList.remove('open');
    setTimeout(function(){
      els.infoSheet.hidden = true;
      els.infoOverlay.hidden = true;
    }, 220);
  }

  function openMenu() {
    if (!els.menu || !els.menuOverlay) return;
    closeInfo();
    els.menu.hidden = false;
    els.menuOverlay.hidden = false;
    els.menu.classList.remove('is-closing');
    if (els.pill) els.pill.setAttribute('aria-expanded', 'true');
    menuOpen = true;
  }

  function closeMenu() {
    if (!els.menu || !els.menuOverlay) return;
    els.menu.classList.add('is-closing');
    if (els.pill) els.pill.setAttribute('aria-expanded', 'false');
    menuOpen = false;
    setTimeout(function(){
      els.menu.hidden = true;
      els.menuOverlay.hidden = true;
      els.menu.classList.remove('is-closing');
    }, 220);
  }

  function toggleMenu() {
    if (menuOpen) closeMenu();
    else openMenu();
  }
}

async function loadIndexSetRecord(entry) {
  const id = entry && entry.id;
  if (!id) return null;
  const [meta, uitleg] = await Promise.all([
    fetchJson(pagePath('sets/' + id + '/meta.json')).catch(function(){ return null; }),
    fetchJson(pagePath('sets/' + id + '/uitleg.json')).catch(function(){ return null; })
  ]);
  const title = (meta && meta.title) || entry.title || id;
  const base = 'sets/' + id + '/';
  const coverFile = (meta && meta.cover) || 'voorkant.svg';
  const [menuThumb, cover] = await Promise.all([
    resolveExistingSetAsset(base, 'voorkant-menu.svg', THUMB_IMAGE_FOLDER_ORDER).catch(function(){ return ''; }),
    resolveExistingSetAsset(base, coverFile, VIEW_IMAGE_FOLDER_ORDER).catch(function(){ return pagePath(base + 'cards/' + coverFile); })
  ]);
  const coverInfoEnabled = !Array.isArray(meta && meta.infoExcluded) || meta.infoExcluded.indexOf('cover') < 0;
  return {
    id: id,
    slug: normalizeSetSlug(entry && entry.slug, title, id),
    title: title,
    meta: meta || {},
    uitleg: uitleg || {},
    menuThumb: menuThumb || cover,
    cover: cover,
    infoText: coverInfoEnabled && uitleg && uitleg.cover ? uitleg.cover : ''
  };
}

async function loadCardsSetRecord(id, fallbackTitle, fallbackSlug) {
  const base = 'sets/' + id + '/';
  const [meta, uitleg, intro, questions] = await Promise.all([
    fetchJson(pagePath(base + 'meta.json')).catch(function(){ return null; }),
    fetchJson(pagePath(base + 'uitleg.json')).catch(function(){ return null; }),
    fetchJson(pagePath(base + 'intro.json')).catch(function(){ return null; }),
    fetchJson(pagePath(base + 'questions.json')).catch(function(){ return parseInlineQuestions(); })
  ]);
  if (!meta) return null;

  const themes = Array.isArray(meta.themes) ? await Promise.all(meta.themes.map(async function(theme){
    const file = theme.card || (theme.key + '.svg');
    const [thumb, card] = await Promise.all([
      resolveExistingSetAsset(base, file, THUMB_IMAGE_FOLDER_ORDER).catch(function(){ return pagePath(base + 'cards_rect/' + file); }),
      resolveExistingSetAsset(base, file, VIEW_IMAGE_FOLDER_ORDER).catch(function(){ return pagePath(base + 'cards/' + file); })
    ]);
    return {
      key: theme.key,
      label: theme.label || theme.key,
      thumb: thumb,
      card: card
    };
  })) : [];

  const cards = [];
  themes.forEach(function(theme){
    const questionsForTheme = Array.isArray(questions && questions[theme.key]) ? questions[theme.key] : [];
    questionsForTheme.forEach(function(item){
      cards.push({
        themeKey: theme.key,
        themeLabel: theme.label,
        frontText: item && (item.voorkant || item.q || '') || '',
        backText: item && (item.achterkant || item.back || '') || '',
        img: theme.card,
        backDesignKey: item && item._qid ? ('__back_card__:' + item._qid) : ''
      });
    });
  });

  const coverFile = meta.cover || 'voorkant.svg';
  const coverInfoEnabled = !Array.isArray(meta.infoExcluded) || meta.infoExcluded.indexOf('cover') < 0;
  const [cover, infoSlides] = await Promise.all([
    resolveExistingSetAsset(base, coverFile, VIEW_IMAGE_FOLDER_ORDER).catch(function(){ return pagePath(base + 'cards/' + coverFile); }),
    normalizeInfoSlides(id, base, intro, uitleg, themes, meta)
  ]);

  return {
    id: id,
    slug: normalizeSetSlug(fallbackSlug, meta.title || fallbackTitle || id, id),
    title: meta.title || fallbackTitle || id,
    meta: meta,
    uitleg: uitleg || {},
    intro: intro || {},
    questions: questions || {},
    themes: themes,
    cards: cards,
    cover: cover,
    infoText: coverInfoEnabled && uitleg && uitleg.cover ? uitleg.cover : '',
    infoSlides: infoSlides,
    backMode: meta.backMode || 'mirror',
    shuffled: false
  };
}

async function resolveRegistrySetEntry(entries, requestedValue) {
  const requested = String(requestedValue || '').trim();
  if (!requested) return (entries && entries[0]) || null;
  const direct = (entries || []).find(function(entry){
    return String(entry && entry.id || '') === requested || String(entry && entry.slug || '') === requested;
  });
  if (direct) return direct;
  const metaHits = await Promise.all((entries || []).map(async function(entry){
    if (!entry || !entry.id) return null;
    const meta = await fetchJson(pagePath('sets/' + entry.id + '/meta.json')).catch(function(){ return null; });
    const slug = normalizeSetSlug((meta && meta.slug) || entry.slug, (meta && meta.title) || entry.title || entry.id, entry.id);
    return slug === requested ? Object.assign({}, entry, { slug: slug, title: (meta && meta.title) || entry.title || entry.id }) : null;
  }));
  return metaHits.find(Boolean) || (entries && entries[0]) || null;
}

async function loadPublicSpaceIndex(spaceSlug) {
  const space = await loadPublicSpace(spaceSlug);
  if (!space || !space.id) return null;
  const setsRes = await supabase.from('sets')
    .select('id,slug,title,bundle,is_public,sort_order')
    .eq('space_id', space.id)
    .eq('is_public', true)
    .order('sort_order');
  if (setsRes.error) throw new Error(setsRes.error.message);
  const rows = Array.isArray(setsRes.data) ? setsRes.data : [];
  return {
    default: (rows[0] && rows[0].id) || '',
    spaceName: space.name || '',
    sets: rows.map(mapPublicIndexSet),
    uiDefaults: {
      index: {
        layout: readSpaceLayout(space),
        gridLimit: 6
      }
    }
  };
}

async function loadPublicCardsSet(spaceSlug, setSlug) {
  const space = await loadPublicSpace(spaceSlug);
  if (!space || !space.id) return null;
  let setRow = await loadPublicSetRow(space.id, setSlug);
  if (!setRow) return null;
  return mapPublicCardsSet(setRow);
}

async function loadPublicSpace(spaceSlug) {
  const res = await supabase.from('spaces')
    .select('id,slug,name,settings')
    .eq('slug', String(spaceSlug || '').trim())
    .limit(1);
  if (res.error) throw new Error(res.error.message);
  return (res.data && res.data[0]) || null;
}

async function loadPublicSetRow(spaceId, setSlug) {
  const requested = String(setSlug || '').trim();
  if (!requested) return null;
  let res = await supabase.from('sets')
    .select('id,slug,title,bundle,is_public')
    .eq('space_id', spaceId)
    .eq('is_public', true)
    .eq('slug', requested)
    .limit(1);
  if (res.error) throw new Error(res.error.message);
  let row = (res.data && res.data[0]) || null;
  if (row) return row;
  res = await supabase.from('sets')
    .select('id,slug,title,bundle,is_public')
    .eq('space_id', spaceId)
    .eq('is_public', true)
    .eq('id', requested)
    .limit(1);
  if (res.error) throw new Error(res.error.message);
  row = (res.data && res.data[0]) || null;
  return row;
}

function mapPublicIndexSet(row) {
  const bundle = row && row.bundle && typeof row.bundle === 'object' ? row.bundle : {};
  const meta = bundle.meta || {};
  const uitleg = bundle.uitleg || {};
  const title = (meta && meta.title) || row.title || row.slug || row.id;
  return {
    id: row.id,
    slug: normalizeSetSlug(row.slug, title, row.id),
    title: title,
    meta: meta,
    uitleg: uitleg,
    menuThumb: publicThemeImageDataUrl(bundle, firstThemeKey(meta), true),
    cover: publicSetCoverDataUrl(bundle),
    infoText: uitleg && uitleg.cover ? uitleg.cover : ''
  };
}

function mapPublicCardsSet(row) {
  const bundle = row && row.bundle && typeof row.bundle === 'object' ? row.bundle : {};
  const meta = bundle.meta || {};
  const uitleg = bundle.uitleg || {};
  const intro = bundle.intro || {};
  const questions = bundle.questions || {};
  const title = (meta && meta.title) || row.title || row.slug || row.id;
  const themes = Array.isArray(meta.themes) ? meta.themes.map(function(theme, idx){
    const key = theme && theme.key ? theme.key : ('thema-' + idx);
    return {
      key: key,
      label: theme && theme.label ? theme.label : key,
      thumb: publicThemeImageDataUrl(bundle, key, true),
      card: publicThemeImageDataUrl(bundle, key, false)
    };
  }) : [];
  const cards = [];
  themes.forEach(function(theme){
    const questionsForTheme = Array.isArray(questions && questions[theme.key]) ? questions[theme.key] : [];
    questionsForTheme.forEach(function(item){
      cards.push({
        themeKey: theme.key,
        themeLabel: theme.label,
        frontText: item && (item.voorkant || item.q || item.front || '') || '',
        backText: item && (item.achterkant || item.back || '') || '',
        img: theme.card,
        backDesignKey: item && item._qid ? ('__back_card__:' + item._qid) : ''
      });
    });
  });
  const infoSlides = normalizePublicInfoSlides(bundle, themes, title);
  return {
    id: row.id,
    slug: normalizeSetSlug(row.slug, title, row.id),
    title: title,
    meta: meta,
    uitleg: uitleg,
    intro: intro,
    questions: questions,
    themes: themes,
    cards: cards,
    cover: publicSetCoverDataUrl(bundle),
    infoText: uitleg && uitleg.cover ? uitleg.cover : '',
    infoSlides: infoSlides,
    backMode: meta.backMode || 'mirror',
    shuffled: false
  };
}

function normalizePublicInfoSlides(bundle, themes, title) {
  const intro = bundle && bundle.intro && typeof bundle.intro === 'object' ? bundle.intro : {};
  const meta = bundle && bundle.meta && typeof bundle.meta === 'object' ? bundle.meta : {};
  const uitleg = bundle && bundle.uitleg && typeof bundle.uitleg === 'object' ? bundle.uitleg : {};
  const excluded = Array.isArray(meta.infoExcluded) ? meta.infoExcluded : [];
  if (Array.isArray(intro.slides) && intro.slides.length) {
    return intro.slides.filter(function(slide, idx){
      const key = slide && slide.key ? slide.key : ('slide-' + idx);
      return excluded.indexOf(key) < 0;
    }).map(function(slide, idx){
      return {
        key: slide && slide.key ? slide.key : ('slide-' + idx),
        title: slide && slide.title ? slide.title : '',
        body: slide && slide.body ? slide.body : '',
        img: publicThemeImageDataUrl(bundle, firstThemeKey((bundle && bundle.meta) || {}), false),
        alt: slide && slide.alt ? slide.alt : title
      };
    });
  }
  const slides = [];
  if (excluded.indexOf('cover') < 0) {
    slides.push({
      key: 'cover',
      title: title,
      body: uitleg && uitleg.cover ? uitleg.cover : '',
      img: publicSetCoverDataUrl(bundle),
      alt: title
    });
  }
  themes.forEach(function(theme){
    if (excluded.indexOf(theme.key) >= 0) return;
    if (!uitleg || !uitleg[theme.key]) return;
    slides.push({
      key: theme.key,
      title: theme.label,
      body: uitleg[theme.key],
      img: theme.card,
      alt: theme.label
    });
  });
  return slides;
}

function firstThemeKey(meta) {
  const themes = meta && Array.isArray(meta.themes) ? meta.themes : [];
  return (themes[0] && themes[0].key) || 'algemeen';
}

function publicSetCoverDataUrl(bundle) {
  const meta = bundle && bundle.meta ? bundle.meta : {};
  const palette = publicTilePalette(meta, 'cover');
  return svgDataUrlFromMarkup(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 550" fill="none">' +
      '<rect width="850" height="550" rx="36" fill="' + esc(palette.paper) + '"/>' +
      '<rect x="38" y="34" width="774" height="482" rx="30" fill="' + esc(palette.accentSoft) + '"/>' +
      '<path d="M0 385C105 336 215 319 330 334C429 347 535 399 850 550H0V385Z" fill="' + esc(palette.accent) + '"/>' +
      '<rect x="508" y="72" width="272" height="154" rx="28" fill="' + esc(palette.accentDeep) + '" opacity="0.62"/>' +
      '<rect x="104" y="92" width="214" height="130" rx="28" fill="' + esc(palette.stroke) + '" opacity="0.38"/>' +
    '</svg>'
  );
}

function publicThemeImageDataUrl(bundle, key, subtle) {
  const meta = bundle && bundle.meta ? bundle.meta : {};
  const palette = publicTilePalette(meta, key);
  const bg = subtle ? palette.paper : palette.accentSoft;
  const primary = subtle ? palette.accent : palette.accentDeep;
  const secondary = subtle ? palette.accentSoft : palette.stroke;
  return svgDataUrlFromMarkup(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 550" fill="none">' +
      '<rect width="850" height="550" rx="36" fill="' + esc(bg) + '"/>' +
      '<rect x="54" y="58" width="298" height="218" rx="28" fill="' + esc(primary) + '" opacity="0.92"/>' +
      '<rect x="388" y="58" width="408" height="110" rx="24" fill="' + esc(secondary) + '" opacity="0.88"/>' +
      '<rect x="388" y="194" width="318" height="78" rx="22" fill="' + esc(palette.accent) + '" opacity="0.84"/>' +
      '<rect x="54" y="320" width="742" height="152" rx="30" fill="' + esc(palette.paper) + '" opacity="' + (subtle ? '0.94' : '0.72') + '"/>' +
    '</svg>'
  );
}

function publicTilePalette(meta, key) {
  const source = publicThemeBaseColor(meta, key);
  const tealBase = '#8FBFAF';
  const paper = '#FAFAF8';
  const accent = mixHex(source, tealBase, 0.72);
  return {
    paper: paper,
    accent: mixHex(accent, '#ffffff', 0.18),
    accentSoft: mixHex(accent, '#ffffff', 0.42),
    accentDeep: mixHex(accent, '#5e9ca5', 0.18),
    stroke: mixHex('#5e9ca5', '#ffffff', 0.12)
  };
}

function publicThemeBaseColor(meta, key) {
  const cssVars = meta && meta.cssVars && typeof meta.cssVars === 'object' ? meta.cssVars : {};
  const ui = meta && meta.ui && typeof meta.ui === 'object' ? meta.ui : {};
  const byKey = ui.cardBgBaseByKey && typeof ui.cardBgBaseByKey === 'object' ? ui.cardBgBaseByKey : {};
  return normalizeHexColor(byKey[key] || ui.cardBgBase || cssVars['--pk-set-card'] || cssVars['--pk-set-bg'] || cssVars['--pk-set-accent'] || '#A8E1DD');
}

async function normalizeInfoSlides(id, base, intro, uitleg, themes, meta) {
  const excluded = Array.isArray(meta && meta.infoExcluded) ? meta.infoExcluded : [];
  if (intro && Array.isArray(intro.slides) && intro.slides.length) {
    return Promise.all(intro.slides.filter(function(slide, idx){
      const key = slide && slide.key ? slide.key : ('slide-' + idx);
      return excluded.indexOf(key) < 0;
    }).map(async function(slide){
      const img = slide.img
        ? await resolveIntroSlideImage(base, String(slide.img).replace(/^\.?\//, ''))
        : '';
      return {
        key: slide.key || '',
        title: slide.title || '',
        body: slide.body || '',
        img: img,
        alt: slide.alt || slide.title || ''
      };
    }));
  }
  const cover = await resolveExistingSetAsset(base, 'voorkant.svg', VIEW_IMAGE_FOLDER_ORDER).catch(function(){
    return pagePath(base + 'cards/voorkant.svg');
  });
  const slides = [];
  if (excluded.indexOf('cover') < 0) {
    slides.push({
      key: 'cover',
      title: uitleg && uitleg.cover ? (themes[0] ? themes[0].label : '') : '',
      body: uitleg && uitleg.cover ? uitleg.cover : '',
      img: cover,
      alt: id
    });
  }
  themes.forEach(function(theme){
    if (excluded.indexOf(theme.key) >= 0) return;
    slides.push({
      key: theme.key,
      title: theme.label,
      body: uitleg && uitleg[theme.key] ? uitleg[theme.key] : '',
      img: theme.card,
      alt: theme.label
    });
  });
  return slides;
}

async function resolveIntroSlideImage(base, relativePath) {
  if (!relativePath) return '';
  var clean = relativePath.replace(/^\.?\//, '');
  var directPath = pagePath(base + clean);
  if (!/^(cards|cards_rect|cards_square|thumbs)\//.test(clean)) {
    if (await assetExists(directPath)) return directPath;
    return directPath;
  }
  var file = clean.replace(/^[^/]+\//, '');
  var preferredFolders = (clean.indexOf('cards_rect/') === 0 || clean.indexOf('thumbs/') === 0)
    ? THUMB_IMAGE_FOLDER_ORDER
    : VIEW_IMAGE_FOLDER_ORDER;
  return resolveExistingSetAsset(base, file, preferredFolders).catch(function(){
    return directPath;
  });
}

async function resolveExistingSetAsset(base, file, folders) {
  const searchFolders = Array.isArray(folders) && folders.length ? folders : VIEW_IMAGE_FOLDER_ORDER;
  for (const folder of searchFolders) {
    const rel = folder.indexOf('/') >= 0 ? folder : (folder + '/' + file);
    const fullPath = pagePath(base + rel);
    if (await assetExists(fullPath)) return fullPath;
  }
  return pagePath(base + 'cards/' + file);
}

async function assetExists(path) {
  if (ASSET_EXISTS_CACHE.has(path)) return ASSET_EXISTS_CACHE.get(path);
  const promise = fetch(path, { method: 'HEAD', cache: 'no-store' })
    .then(function(res){
      if (res.ok) return true;
      if (res.status === 405) {
        return fetch(path, { cache: 'no-store' }).then(function(getRes){ return getRes.ok; }).catch(function(){ return false; });
      }
      return false;
    })
    .catch(function(){ return false; });
  ASSET_EXISTS_CACHE.set(path, promise);
  return promise;
}

function applySetTheme(set) {
  const meta = set && set.meta ? set.meta : {};
  const cssVars = meta.cssVars || {};
  Object.keys(cssVars).forEach(function(key){
    document.documentElement.style.setProperty(key, cssVars[key]);
  });
  // Zet --cardsPageBg op basis van de set-accentkleur als die niet expliciet in cssVars staat.
  // Voor Supabase-sets bestaat theme.css niet; de achtergrond moet uit cssVars komen.
  if (!cssVars['--cardsPageBg']) {
    const accent = cssVars['--pk-set-accent'] || '';
    if (accent) {
      document.documentElement.style.setProperty('--cardsPageBg', mixHex(accent, '#ffffff', 0.62));
    }
  }
  if (meta.cardFormat) {
    const match = String(meta.cardFormat).match(/(\d+)[xX](\d+)/);
    if (match) document.documentElement.style.setProperty('--cardAspect', match[1] + '/' + match[2]);
  }
  const themeCss = meta.ui && meta.ui.themeCss ? pagePath('sets/' + set.id + '/' + meta.ui.themeCss) : '';
  syncThemeCss(themeCss);
}

function syncThemeCss(href) {
  const id = 'setThemeCss';
  let link = document.getElementById(id);
  if (!href) {
    if (link && link.parentNode) link.parentNode.removeChild(link);
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = href;
}

function parseInlineQuestions() {
  const script = document.getElementById('questions-json');
  if (!script || !script.textContent) return {};
  try {
    return JSON.parse(script.textContent);
  } catch (_err) {
    return {};
  }
}

function pagePath(path) {
  const clean = String(path || '').replace(/^\.?\//, '');
  return '/' + clean;
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error('Kon niet laden: ' + path);
  return res.json();
}

function readQueryParam(name) {
  try {
    return new URLSearchParams(location.search).get(name) || '';
  } catch (_err) {
    return '';
  }
}

function cardsHrefForSet(set) {
  if (PUBLIC_ROUTE.spaceSlug) {
    return rootPath(PUBLIC_ROUTE.spaceSlug + '/' + normalizeSetSlug(set && set.slug, set && set.title, set && set.id) + '/');
  }
  return pagePath('kaarten/?set=' + encodeURIComponent(set && set.id || ''));
}

function spaceHref(spaceSlug) {
  return rootPath(String(spaceSlug || '').trim() + '/');
}

function rootPath(path) {
  const clean = String(path || '').replace(/^\/+/, '');
  return '/' + clean;
}

function parsePublicRoute() {
  const parts = splitPublicPath(location.pathname || '/');
  if (PAGE === 'grid' && parts.length === 1 && !isReservedPublicSegment(parts[0])) {
    return { spaceSlug: parts[0], setSlug: '' };
  }
  if (PAGE === 'kaarten' && parts.length >= 2 && !isReservedPublicSegment(parts[0]) && !isReservedPublicSegment(parts[1])) {
    return { spaceSlug: parts[0], setSlug: parts[1] };
  }
  return { spaceSlug: '', setSlug: '' };
}

function splitPublicPath(pathname) {
  return String(pathname || '')
    .split('?')[0]
    .split('#')[0]
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
}

function isReservedPublicSegment(value) {
  return !!RESERVED_PUBLIC_SEGMENTS[String(value || '').toLowerCase()];
}

function normalizeSetSlug(explicitSlug, title, id) {
  return slugify(explicitSlug || title || id || 'set');
}

function slugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'set';
}

function readSpaceLayout(space) {
  const settings = space && space.settings && typeof space.settings === 'object' ? space.settings : {};
  const publicPage = settings.publicPage && typeof settings.publicPage === 'object' ? settings.publicPage : {};
  const value = String(publicPage.layout || '').toLowerCase();
  return value === 'grid' || value === 'hero-grid' || value === 'carousel' ? value : 'carousel';
}

function normalizeHexColor(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return '#A8E1DD';
  const hex = match[1];
  if (hex.length === 3) {
    return '#' + hex.split('').map(function(part){ return part + part; }).join('').toUpperCase();
  }
  return '#' + hex.toUpperCase();
}

function hexToRgb(hex) {
  const clean = normalizeHexColor(hex).slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  function part(value) {
    const out = Math.max(0, Math.min(255, Math.round(value))).toString(16).toUpperCase();
    return out.length < 2 ? '0' + out : out;
  }
  return '#' + part(r) + part(g) + part(b);
}

function mixHex(a, b, t) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return rgbToHex(
    ra.r + (rb.r - ra.r) * t,
    ra.g + (rb.g - ra.g) * t,
    ra.b + (rb.b - ra.b) * t
  );
}

function svgDataUrlFromMarkup(svg) {
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(String(svg || ''))));
}

function resolveLayout(indexUi, sets) {
  const fromUi = indexUi && typeof indexUi.layout === 'string' ? indexUi.layout : '';
  const fromSet = sets[0] && sets[0].meta && sets[0].meta.ui && sets[0].meta.ui.index && sets[0].meta.ui.index.layout;
  const value = String(fromUi || fromSet || 'carousel').toLowerCase();
  if (value === 'grid' || value === 'hero-grid' || value === 'carousel') return value;
  return 'carousel';
}

function loadContrastMode() {
  try {
    return sessionStorage.getItem('pk_contrast_session') === 'dark' ? 'dark' : 'light';
  } catch (_err) {
    return 'light';
  }
}

function persistContrast(mode) {
  try {
    sessionStorage.setItem('pk_contrast_session', mode === 'dark' ? 'dark' : 'light');
  } catch (_err) {}
}

function applyContrast(mode) {
  const dark = mode === 'dark';
  document.documentElement.setAttribute('data-contrast', dark ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('light', !dark);
}

function shuffleArray(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function formatTextHtml(value) {
  return esc(String(value || ''))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function formatInfoBodyHtml(value) {
  return String(value || '')
    .split(/\n{2,}/)
    .map(function(block){ return block.trim(); })
    .filter(Boolean)
    .map(function(block){ return '<p class="infoTextIntro">' + formatTextHtml(block) + '</p>'; })
    .join('');
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_\-]/g, '\\$&');
}
