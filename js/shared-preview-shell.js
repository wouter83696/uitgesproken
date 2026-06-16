(function(global){
  'use strict';

  var PK = global.PK = global.PK || {};

  function esc(value){
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function backArrowIconHtml(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  }

  function forwardArrowIconHtml(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
  }

  function homeIconHtml(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>';
  }

  function gridIconHtml(){
    return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 2.5v11M10.5 2.5v11M2.5 5.5h11M2.5 10.5h11"></path><rect x="2.5" y="2.5" width="11" height="11" rx="2"></rect></svg>';
  }

  function nightIconHtml(isNight){
    return isNight
      ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.9 1.8a5.8 5.8 0 1 0 3.3 10.7 6.2 6.2 0 1 1-3.3-10.7Z"></path></svg>'
      : '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.4"></circle><path d="M8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7 3.6 3.6"></path></svg>';
  }

  function flipGlyphHtml(){
    return '<span class="flipGlyph" aria-hidden="true">↻</span>';
  }

  function buildZoomControlHtml(options){
    options = options || {};
    var extraClass = options.className ? ' ' + options.className : '';
    var zoomPct = options.zoomPct != null ? options.zoomPct : 100;
    var resetTitle = options.resetTitle || 'Telefoon-formaat (100%)';
    return (
      '<div class="cvZoomControl' + extraClass + '">' +
        '<button class="cvZoomBtn" type="button"' + (options.zoomOutAttrText || '') + ' title="Uitzoomen">−</button>' +
        '<button class="cvZoomPct" type="button"' + (options.resetAttrText || '') + ' title="' + esc(resetTitle) + '">' + esc(String(zoomPct)) + '%</button>' +
        '<button class="cvZoomBtn" type="button"' + (options.zoomInAttrText || '') + ' title="Inzoomen">+</button>' +
      '</div>'
    );
  }

  function buildNavPillHtml(options){
    options = options || {};
    if (options.enabled === false) return options.placeholderHtml || '';
    var centerHtml = '';
    if (options.centerHtml) {
      centerHtml = options.centerHtml;
    } else if (options.centerMode === 'icon') {
      centerHtml = (
        '<button class="stijlCanvasNightBtn' + (options.centerClassName ? ' ' + options.centerClassName : '') + '" type="button" title="' + esc(options.centerTitle || '') + '"' + (options.centerAttrText || '') + '>' +
          (options.centerIconHtml || homeIconHtml()) +
        '</button>'
      );
    } else {
      centerHtml = (
        '<button class="stijlCanvasNightBtn previewNavPosBtn' + (options.centerClassName ? ' ' + options.centerClassName : '') + '" type="button"' +
          (options.centerTitle ? ' title="' + esc(options.centerTitle) + '"' : '') +
          (options.centerAttrText || '') + '>' +
          '<span class="previewNavPosText">' + esc(options.centerLabel || '') + '</span>' +
        '</button>'
      );
    }
    return (
      '<div class="previewTopPill previewNavPill">' +
        '<button class="stijlCanvasNightBtn" type="button" title="' + esc(options.backTitle || 'Vorige') + '"' + (options.backAttrText || '') + '>' +
          backArrowIconHtml() +
        '</button>' +
        centerHtml +
        '<button class="stijlCanvasNightBtn" type="button" title="' + esc(options.forwardTitle || 'Volgende') + '"' + (options.forwardAttrText || '') + '>' +
          forwardArrowIconHtml() +
        '</button>' +
      '</div>'
    );
  }

  function buildActionPillHtml(options){
    options = options || {};
    var html = '';
    if (options.showFlip) {
      html += (
        '<button class="stijlCanvasFlipBtn' + (options.flipSelected ? ' sel' : '') + '" type="button" aria-label="Kaart omdraaien" title="Kaart omdraaien"' + (options.flipAttrText || '') + '>' +
          flipGlyphHtml() +
        '</button>'
      );
      if (options.showGrid || options.showNight) {
        html += '<div class="previewTopPillSep" aria-hidden="true"></div>';
      }
    }
    if (options.showGrid) {
      html += (
        '<button class="stijlCanvasGridBtn' + (options.gridSelected ? ' sel' : '') + '" type="button" aria-label="' + esc(options.gridSelected ? 'Raster uitzetten' : 'Raster tonen') + '" title="' + esc(options.gridSelected ? 'Raster uitzetten' : 'Raster tonen') + '"' + (options.gridAttrText || '') + '>' +
          gridIconHtml() +
        '</button>'
      );
    }
    if (options.showNight) {
      html += (
        '<button class="stijlCanvasNightBtn' + (options.nightSelected ? ' sel' : '') + '" type="button" aria-label="' + esc(options.nightSelected ? 'Nachtmodus uitzetten' : 'Nachtmodus aanzetten') + '" title="' + esc(options.nightSelected ? 'Nachtmodus uitzetten' : 'Nachtmodus aanzetten') + '"' + (options.nightAttrText || '') + '>' +
          nightIconHtml(!!options.nightSelected) +
        '</button>'
      );
    }
    return '<div class="previewTopPill' + (options.className ? ' ' + options.className : '') + '">' + html + '</div>';
  }

  function buildTopbarHtml(options){
    options = options || {};
    if (options.hidden) return '';
    return (
      '<div class="stijlCanvasTopbar' + (options.className ? ' ' + options.className : '') + '">' +
        buildZoomControlHtml(options.zoom) +
        buildNavPillHtml(options.nav) +
        '<div class="stijlCanvasTopbarRight">' + buildActionPillHtml(options.actions) + '</div>' +
      '</div>'
    );
  }

  function buildBackbarHtml(options){
    options = options || {};
    if (!options.enabled) return '';
    var modes = Array.isArray(options.modes) ? options.modes : [];
    return (
      '<div class="stijlCanvasBackbar">' +
        '<div class="stijlCanvasBackbarLabel">' + esc(options.label || 'Achterkant') + '</div>' +
        '<div class="stijlCanvasBackbarGroup">' +
          modes.map(function(mode){
            var label = mode && mode.label ? mode.label : '';
            return '<button class="stijlBackModeBtn' + (mode && mode.selected ? ' sel' : '') + '" type="button"' + ((mode && mode.attrText) || '') + ' title="' + esc((mode && mode.title) || label) + '">' + esc(label) + '</button>';
          }).join('') +
        '</div>' +
        (options.extraHtml || '') +
      '</div>'
    );
  }

  function syncCanvasPreviewWindowLayout(win){
    if (!win || !win.getBoundingClientRect) return;
    var card = win.querySelector('.stijlCardPrevWrap');
    var visual = card && card.querySelector('.cardFaceOuter, .adminInfoSlide');
    if (!card) return;
    var winRect = win.getBoundingClientRect();
    if (!(winRect.width > 0 && winRect.height > 0)) return;
    var sideInset = 14;
    var contentTop = 34;
    var contentBottom = 70;
    var topbar = win.querySelector('.stijlCanvasTopbar');
    var backbar = win.querySelector('.stijlCanvasBackbar');
    if (topbar) {
      var topbarRect = topbar.getBoundingClientRect();
      sideInset = Math.max(8, Math.round(topbarRect.left - winRect.left));
      contentTop = Math.max(0, Math.round(topbarRect.bottom - winRect.top) + 8);
    }
    if (backbar) {
      var backbarRect = backbar.getBoundingClientRect();
      contentBottom = Math.max(0, Math.round(winRect.bottom - backbarRect.top) - 4);
    }
    var backbarExtra = win.querySelector('.previewEditSurfaceStack');
    if (backbarExtra && typeof backbarExtra.getBoundingClientRect === 'function') {
      var backbarExtraRect = backbarExtra.getBoundingClientRect();
      if (backbarExtraRect.width > 0 && backbarExtraRect.height > 0) {
        var reserveTop = backbarExtraRect.top;
        if (backbar && typeof backbar.getBoundingClientRect === 'function') {
          reserveTop = Math.min(reserveTop, backbar.getBoundingClientRect().top);
        }
        contentBottom = Math.max(contentBottom, Math.max(0, Math.round(winRect.bottom - reserveTop) - 4));
      }
    }
    win.style.setProperty('--preview-side-inset', sideInset + 'px');
    win.style.setProperty('--preview-content-top', contentTop + 'px');
    win.style.setProperty('--preview-content-bottom', contentBottom + 'px');
    if (win.classList.contains('info-preview')) {
      var previewSide = win.closest('.stijlCanvasSide.preview');
      var previewShellH = previewSide
        ? parseFloat(getComputedStyle(previewSide).getPropertyValue('--preview-shell-max-h')) || 0
        : 0;
      var basePreviewWindowH = previewShellH > 0 ? previewShellH : 720;
      var infoAvailH = Math.max(0, basePreviewWindowH - contentTop - contentBottom);
      var infoScale = parseFloat((visual && visual.style.zoom) || '') || 1;
      var infoCardFace = card.querySelector('.adminInfoSlideCard');
      var infoCardFaceRect = infoCardFace && infoCardFace.getBoundingClientRect ? infoCardFace.getBoundingClientRect() : null;
      var infoCardH = (infoCardFaceRect && infoCardFaceRect.height) ? infoCardFaceRect.height : 0;
      if (!(infoCardH > 0)) {
        var infoBaseCardW = parseFloat(getComputedStyle(card).getPropertyValue('--editor-preview-card-w')) || 320;
        infoCardH = Math.round((infoBaseCardW * (55 / 85)) * infoScale);
      }
      var infoCardStart = contentTop + Math.max(0, Math.round((infoAvailH - infoCardH) / 2));
      card.style.top = infoCardStart + 'px';
      card.style.bottom = 'auto';
      card.style.height = 'auto';
      card.style.transform = 'none';
      return;
    }
    card.style.top = contentTop + 'px';
    card.style.bottom = contentBottom + 'px';
    card.style.height = 'auto';
    card.style.transform = 'none';
  }

  function renderCanvasPreviewShell(options){
    options = options || {};
    var selectorHtml = options.selectorHtml
      ? '<div class="stijlPreviewPick" style="width:100%">' + options.selectorHtml + '</div>'
      : '';
    var stageStyleAttr = options.stageStyle ? ' style="' + esc(options.stageStyle) + '"' : '';
    var windowStyleAttr = options.windowStyle ? ' style="' + esc(options.windowStyle) + '"' : '';
    var innerClassName = 'stijlCanvasWindowInner' + (options.innerClassName ? ' ' + options.innerClassName : '');
    return (
      '<div class="' + esc(options.columnClassName || 'stijlPreviewCol stijlCanvasCenter') + '">' +
        '<div class="' + esc(options.stageClassName || 'stijlCanvasStage') + '"' + stageStyleAttr + '>' +
          '<div class="' + esc(options.cardWrapClassName || 'stijlCanvasCardWrap') + '">' +
            selectorHtml +
            '<div class="' + esc(options.windowClassName || 'stijlCanvasWindow') + '"' + ((options.windowAttrText || '') + windowStyleAttr) + '>' +
              (options.topbarHtml || '') +
              (options.varianceHtml || '') +
              '<div class="bgCanvas" id="' + esc(options.bgWrapId || 'bgWrap') + '"><canvas id="' + esc(options.bgCanvasId || 'bgCanvas') + '"></canvas></div>' +
              '<div class="' + innerClassName + '">' + (options.previewCoreHtml || '') + '</div>' +
              (options.backbarHtml || '') +
            '</div>' +
            (options.afterWindowHtml || '') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  PK.sharedPreviewShell = {
    buildZoomControlHtml: buildZoomControlHtml,
    buildTopbarHtml: buildTopbarHtml,
    buildBackbarHtml: buildBackbarHtml,
    syncCanvasPreviewWindowLayout: syncCanvasPreviewWindowLayout,
    renderCanvasPreviewShell: renderCanvasPreviewShell,
    icons: {
      backArrow: backArrowIconHtml,
      forwardArrow: forwardArrowIconHtml,
      home: homeIconHtml,
      grid: gridIconHtml,
      night: nightIconHtml,
      flip: flipGlyphHtml
    }
  };
  PK.syncCanvasPreviewWindowLayout = PK.syncCanvasPreviewWindowLayout || syncCanvasPreviewWindowLayout;
})(window);
