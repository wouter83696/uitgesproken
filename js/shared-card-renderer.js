(function(global){
  'use strict';

  var PK = global.PK = global.PK || {};
  var BACK_STYLE_KEY = '__back__';
  var DEFAULT_CARD_SURFACE = '#FAFAF8';
  var FONT_SIZE_LEGACY = { sm: '10', md: '12', lg: '14', xl: '16' };

  function esc(value){
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeHexInput(value){
    var v = String(value || '').trim();
    if(/^#[0-9a-fA-F]{3}$/.test(v))v='#'+v[1]+v[1]+v[2]+v[2]+v[3]+v[3];
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '';
  }

  function hexToRgb(hex){
    var clean = normalizeHexInput(hex).slice(1);
    if(clean.length !== 6)return null;
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b){
    function part(value){
      var out = Math.max(0, Math.min(255, Math.round(value))).toString(16).toUpperCase();
      return out.length < 2 ? '0' + out : out;
    }
    return '#' + part(r) + part(g) + part(b);
  }

  function colorToneAdjust(baseHex, tone){
    var base = normalizeHexInput(baseHex);
    if(!base)return '';
    var n = Math.max(-100, Math.min(100, parseInt(tone, 10) || 0));
    if(n === 0)return base;
    var rgb = hexToRgb(base);
    if(!rgb)return base;

    var r = rgb.r / 255;
    var g = rgb.g / 255;
    var b = rgb.b / 255;
    var mx = Math.max(r, g, b);
    var mn = Math.min(r, g, b);
    var d = mx - mn;
    var h = 0;
    var s = 0;
    var l = (mx + mn) / 2;

    if(d > 0){
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if(mx === r)h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if(mx === g)h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }

    var t = n / 100;
    var newL;
    var newS;
    if(t > 0){
      newL = l + (0.84 - l) * t;
      newS = s * (1 - t * 0.60);
    }else{
      var dt = -t;
      newL = l - (l - 0.26) * dt;
      newS = Math.min(1, s + (0.45 - s) * dt * 0.35);
    }

    function hue2rgb(p, q, tv){
      var val = tv;
      if(val < 0)val += 1;
      if(val > 1)val -= 1;
      if(val < 1 / 6)return p + (q - p) * 6 * val;
      if(val < 0.5)return q;
      if(val < 2 / 3)return p + (q - p) * (2 / 3 - val) * 6;
      return p;
    }

    var nr, ng, nb;
    if(newS === 0){
      nr = ng = nb = newL;
    }else{
      var q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS;
      var p = 2 * newL - q;
      nr = hue2rgb(p, q, h + 1 / 3);
      ng = hue2rgb(p, q, h);
      nb = hue2rgb(p, q, h - 1 / 3);
    }
    return rgbToHex(nr * 255, ng * 255, nb * 255);
  }

  function normFontSize(value){
    return FONT_SIZE_LEGACY[value] || value || '12';
  }

  function fontSizeCss(value){
    var n = parseInt(normFontSize(value), 10) || 12;
    return n + 'pt';
  }

  function cardBgStyle(hex){
    return 'background:linear-gradient(180deg,rgba(255,255,255,0.013) 0%,rgba(0,0,0,0.013) 100%),' + hex;
  }

  function normalizedCardSurface(value){
    var hex = normalizeHexInput(value);
    if(hex === '#ffffff' || hex === '#fcfbf8')return DEFAULT_CARD_SURFACE;
    return value || DEFAULT_CARD_SURFACE;
  }

  function cardBuildModeForKey(meta, key){
    if(!key)return 'image';
    var ui = meta && meta.ui && typeof meta.ui === 'object' ? meta.ui : {};
    var store = ui.cardModes && typeof ui.cardModes === 'object' ? ui.cardModes : {};
    return store[key] === 'self' ? 'self' : 'image';
  }

  function backStyleUi(meta){
    var ui = meta && meta.ui && typeof meta.ui === 'object' ? meta.ui : {};
    return ui.backStyle && typeof ui.backStyle === 'object' ? ui.backStyle : {};
  }

  function backStyleCssVarStore(meta){
    var ui = backStyleUi(meta);
    return ui.cssVars && typeof ui.cssVars === 'object' ? ui.cssVars : {};
  }

  function backStyleCardStore(meta){
    var ui = backStyleUi(meta);
    return ui.cardEntries && typeof ui.cardEntries === 'object' ? ui.cardEntries : {};
  }

  function backStyleCardEntry(meta, key){
    var store = backStyleCardStore(meta);
    var entry = store[key];
    return entry && typeof entry === 'object' ? entry : { cssVars: {} };
  }

  function styleCssVarsForKey(meta, key){
    var front = meta && meta.cssVars && typeof meta.cssVars === 'object' ? meta.cssVars : {};
    if(key !== BACK_STYLE_KEY && String(key || '').indexOf('__back_card__:') !== 0)return front;
    var back = key === BACK_STYLE_KEY ? backStyleCssVarStore(meta) : backStyleCardEntry(meta, key).cssVars;
    return Object.assign({}, front, back || {});
  }

  function cardBgMaps(meta){
    var ui = meta && meta.ui && typeof meta.ui === 'object' ? meta.ui : {};
    return {
      base: ui.cardBgBaseByKey && typeof ui.cardBgBaseByKey === 'object' ? ui.cardBgBaseByKey : {},
      tone: ui.cardBgToneByKey && typeof ui.cardBgToneByKey === 'object' ? ui.cardBgToneByKey : {}
    };
  }

  function cardBgBaseForKey(meta, key){
    var maps = cardBgMaps(meta);
    var byKey = normalizeHexInput(maps.base[key || '']) || '';
    var isBackKey = key === BACK_STYLE_KEY || String(key || '').indexOf('__back_card__:') === 0;
    var backDefault = isBackKey ? (normalizeHexInput(meta && meta.blankBackColor) || '') : '';
    var ui = meta && meta.ui && typeof meta.ui === 'object' ? meta.ui : {};
    var legacy = normalizeHexInput(ui.cardBgBase || '') || '';
    var cssVars = meta && meta.cssVars && typeof meta.cssVars === 'object' ? meta.cssVars : {};
    var css = normalizeHexInput(cssVars['--pk-set-bg'] || '') || '';
    return normalizedCardSurface(byKey || backDefault || legacy || css || DEFAULT_CARD_SURFACE);
  }

  function cardBgToneForKey(meta, key){
    var maps = cardBgMaps(meta);
    if(Object.prototype.hasOwnProperty.call(maps.tone, key || ''))return Number(maps.tone[key || '']) || 0;
    var ui = meta && meta.ui && typeof meta.ui === 'object' ? meta.ui : {};
    return Number(ui.cardBgTone || 0) || 0;
  }

  function cardBgForKey(meta, key){
    return normalizedCardSurface(colorToneAdjust(cardBgBaseForKey(meta, key), cardBgToneForKey(meta, key)));
  }

  function backPreviewConfig(meta, themeKey, backDesignKey){
    var workMeta = meta || {};
    var mode = workMeta.backMode || 'mirror';
    var key = themeKey || 'algemeen';
    var blankColor = (workMeta.blankBackColors && workMeta.blankBackColors[key]) || workMeta.blankBackColor || '#F8E4D2';
    var custom = mode === 'blank';
    var styleKey = custom ? (backDesignKey || BACK_STYLE_KEY) : key;
    var bg = custom ? (cardBgForKey(workMeta, styleKey) || normalizedCardSurface(blankColor)) : 'transparent';
    return {
      mode: mode,
      custom: custom,
      reflect: mode === 'reflect',
      mirrorImage: mode === 'mirror' || mode === 'reflect',
      styleKey: styleKey,
      cssVars: styleCssVarsForKey(workMeta, styleKey),
      bg: bg,
      blankColor: normalizedCardSurface(blankColor)
    };
  }

  function shapeUsesStroke(type){
    return type === 'wave';
  }

  function isTextLayerItem(layer){
    return !!(layer && (layer.kind === 'text' || layer.type === 'text'));
  }

  function isGroupLayer(layer){
    return !!(layer && layer.type === 'group' && Array.isArray(layer.groupChildren) && layer.groupChildren.length);
  }

  function shapePathByType(type, layer){
    if(type === 'imported' && layer && layer.importMarkup)return layer.importMarkup;
    if(type === 'blob' && layer && typeof layer.deform === 'number')return '<path d="' + generateBlobSVGPath(layer.deform, layer.blobSeed || 42, 10) + '"></path>';
    if(type === 'circle')return '<circle cx="50" cy="50" r="42"></circle>';
    if(type === 'rounded')return '<rect x="20" y="20" width="60" height="60" rx="14" ry="14"></rect>';
    if(type === 'column')return '<rect x="28" y="6" width="44" height="88" rx="22" ry="22"></rect>';
    if(type === 'side')return '<path d="M24 18h27c23 0 41 14 41 32S74 82 51 82H24C14 82 8 68 8 50s6-32 16-32z"></path>';
    if(type === 'star')return '<path d="M50 8l10 24 26 2-20 17 6 25-22-13-22 13 6-25-20-17 26-2 10-24z"></path>';
    if(type === 'band')return '<path d="M0 34c12-4 24-6 36-6 14 0 26 4 38 8 10 3 18 5 26 4v22c-8 1-16-1-26-4-12-4-24-8-38-8-12 0-24 2-36 6V34z"></path>';
    if(type === 'slope')return '<path d="M0 73 100 28v72H0z"></path>';
    if(type === 'cornerwide')return '<path d="M0 0h100v34c-15 8-31 12-48 12C28 46 11 33 0 16z"></path>';
    if(type === 'hill')return '<path d="M0 100c6-24 18-42 36-50 8-4 17-6 26-6 22 0 38 14 46 56H0z"></path>';
    if(type === 'diamond')return '<path d="M50 8l34 42-34 42L16 50 50 8z"></path>';
    if(type === 'triangle')return '<path d="M50 12l38 74H12z"></path>';
    if(type === 'arrow')return '<path d="M10 42h44v-14l28 22-28 22v-14H10z"></path>';
    if(type === 'cloud')return '<path d="M26 71c-11 0-20-8-20-18 0-9 7-17 16-18 3-12 14-20 27-20 10 0 19 4 25 11 3-1 5-1 8-1 12 0 22 10 22 22s-10 24-22 24H26Z"></path>';
    if(type === 'bar')return '<rect x="16" y="34" width="68" height="32"></rect>';
    if(type === 'plus')return '<path d="M50 14v72M14 50h72"></path>';
    if(type === 'pill')return '<rect x="10" y="28" width="80" height="44" rx="22" ry="22"></rect>';
    if(type === 'spark')return '<path d="M50 8l8 24 24 8-24 8-8 24-8-24-24-8 24-8 8-24z"></path>';
    if(type === 'wave')return '<path d="M2 54c10-14 20-20 30-20 10 0 18 8 26 8 8 0 16-8 26-8 10 0 20 6 30 20"></path>';
    if(type === 'arch')return '<path d="M0 100c0-46 24-76 50-76s50 30 50 76z"></path>';
    if(type === 'leaf')return '<path d="M18 57c0-26 18-44 45-44 16 0 25 5 32 13 8 8 12 19 12 31 0 27-19 43-45 43S18 85 18 57z"></path>';
    if(type === 'corner')return '<path d="M0 0h100v64c-14 6-28 9-40 9C26 73 10 55 0 28z"></path>';
    if(type === 'crescent')return '<path d="M64 12c-7 4-16 15-16 35 0 23 13 37 29 41-6 3-12 4-18 4-25 0-45-20-45-45S34 2 59 2c2 0 4 0 5 .3z"></path>';
    if(type === 'burst')return '<path d="M50 8l8 17 18-8-8 18 17 8-17 8 8 18-18-8-8 17-8-17-18 8 8-18-17-8 17-8-8-18 18 8 8-17z"></path>';
    if(type === 'petal')return '<path d="M50 12c12 0 22 10 22 22 0 8-4 13-8 18-5 5-9 12-14 20-5-8-9-15-14-20-4-5-8-10-8-18 0-12 10-22 22-22z"></path>';
    if(type === 'drop')return '<path d="M50 8c15 19 26 33 26 47 0 16-12 29-26 29S24 71 24 55c0-14 11-28 26-47z"></path>';
    if(type === 'hexagon')return '<path d="M50 6L89 27v46L50 94 11 73V27z"></path>';
    if(type === 'octagon')return '<path d="M34 6h32l24 24v40L66 94H34L10 70V30z"></path>';
    if(type === 'heart')return '<path d="M50 88C25 70 4 52 4 34 4 20 14 10 28 10c9 0 17 5 22 12C55 15 63 10 72 10c14 0 24 10 24 24 0 18-21 36-46 54z"></path>';
    if(type === 'shield')return '<path d="M50 6C34 6 14 14 14 14v36c0 22 16 34 36 40 20-6 36-18 36-40V14S66 6 50 6z"></path>';
    if(type === 'oval')return '<ellipse cx="50" cy="50" rx="42" ry="30"></ellipse>';
    if(type === 'parallelogram')return '<path d="M22 20h64l-8 60H14z"></path>';
    return '<path d="M17 46c0-19 13-32 31-32 12 0 19 4 27 3 10-1 18 7 18 18 0 8-4 14-3 21 2 14-6 24-21 24-11 0-15-6-24-6-9 0-14 7-23 7-12 0-22-10-22-24 0-6 3-9 3-11z"></path>';
  }

  function shapeSvgTransform(type, context){
    var previewScaleMap = {
      wave: 0.9,
      slope: 0.92,
      hill: 0.9,
      band: 0.93,
      arch: 0.93,
      cornerwide: 0.92
    };
    var iconScaleMap = {
      leaf: 0.84,
      corner: 0.82,
      cloud: 0.88,
      wave: 0.84,
      slope: 0.86,
      hill: 0.86,
      band: 0.88,
      arch: 0.88,
      cornerwide: 0.88
    };
    var scaleMap = context === 'preview' ? previewScaleMap : iconScaleMap;
    var scale = scaleMap[type] || 1;
    if(scale === 1)return '';
    return 'translate(50 50) scale(' + scale + ') translate(-50 -50)';
  }

  function mulberry32(seed){
    var t = seed >>> 0;
    return function(){
      t += 0x6D2B79F5;
      var x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generateBlobSVGPath(deform, seed, inset){
    var amount = Math.max(0, Math.min(100, Number(deform) || 0));
    var rand = mulberry32((Number(seed) || 42) >>> 0);
    var steps = 18;
    var radius = 50 - Math.max(0, Number(inset) || 0);
    var points = [];
    for(var i = 0; i < steps; i += 1){
      var angle = (Math.PI * 2 * i) / steps;
      var wave = 1 + (rand() * 2 - 1) * (amount / 100) * 0.35;
      var r = radius * wave;
      var x = 50 + Math.cos(angle) * r;
      var y = 50 + Math.sin(angle) * r;
      points.push({ x: x, y: y });
    }
    if(!points.length)return '';
    var path = 'M' + points[0].x.toFixed(2) + ' ' + points[0].y.toFixed(2);
    for(var p = 0; p < points.length; p += 1){
      var cur = points[p];
      var next = points[(p + 1) % points.length];
      var cp1x = cur.x + (next.x - cur.x) / 3;
      var cp1y = cur.y + (next.y - cur.y) / 3;
      var cp2x = cur.x + ((next.x - cur.x) * 2) / 3;
      var cp2y = cur.y + ((next.y - cur.y) * 2) / 3;
      path += ' C' +
        cp1x.toFixed(2) + ' ' + cp1y.toFixed(2) + ' ' +
        cp2x.toFixed(2) + ' ' + cp2y.toFixed(2) + ' ' +
        next.x.toFixed(2) + ' ' + next.y.toFixed(2);
    }
    return path + ' Z';
  }

  function shapeLayerRenderMarkup(layer, context){
    if(!layer)return '';
    if(isGroupLayer(layer)){
      return layer.groupChildren.map(function(child){
        if(isTextLayerItem(child))return '';
        var size = Math.max(1, Number(child.size) || 42);
        var x = Number(child.x);
        if(!isFinite(x))x = 50;
        var y = Number(child.y);
        if(!isFinite(y))y = 50;
        var rot = Number(child.rotate) || 0;
        var tx = x - (size / 2);
        var ty = y - (size / 2);
        var outer = '<g transform="translate(' + tx + ' ' + ty + ') scale(' + (size / 100) + ')">';
        var inner = shapeLayerRenderMarkup(child, context);
        if(rot)inner = '<g transform="rotate(' + rot + ' 50 50)">' + inner + '</g>';
        return outer + inner + '</g>';
      }).join('');
    }
    if(isTextLayerItem(layer))return '';

    var fill = layer.fill || '#CFE6DF';
    var stroke = layer.stroke || 'transparent';
    var sw = Math.max(0, Number(layer.strokeWidth) || 0);
    var fillOpacity = Number(layer.fillOpacity);
    if(!isFinite(fillOpacity))fillOpacity = 1;
    fillOpacity = Math.max(0, Math.min(1, fillOpacity));
    var strokeOpacity = Number(layer.strokeOpacity);
    if(!isFinite(strokeOpacity))strokeOpacity = 1;
    strokeOpacity = Math.max(0, Math.min(1, strokeOpacity));
    var type = layer.type || 'circle';

    if(type === 'imported' && layer.importMarkup){
      var importedFill = layer.fill && layer.fill !== 'transparent' ? layer.fill : 'transparent';
      var importedStroke = layer.stroke && layer.stroke !== 'transparent' ? layer.stroke : 'transparent';
      var importedStrokeWidth = Math.max(0, Number(layer.strokeWidth) || 0);
      var importedStyle = '--shape-fill:' + esc(importedFill) +
        ';--shape-stroke:' + esc(importedStroke) +
        ';--shape-fill-opacity:' + fillOpacity +
        ';--shape-stroke-opacity:' + strokeOpacity +
        ';--shape-stroke-width:' + importedStrokeWidth + ';';
      return '<g' + (shapeSvgTransform(type, context) ? ' transform="' + shapeSvgTransform(type, context) + '"' : '') + ' style="' + importedStyle + '">' + shapePathByType(type, layer) + '</g>';
    }

    var strokeShape = shapeUsesStroke(type);
    var drawFill = strokeShape ? 'none' : fill;
    var drawFillOpacity = strokeShape ? 1 : fillOpacity;
    var drawStroke = strokeShape ? ((stroke && stroke !== 'transparent') ? stroke : fill) : (sw > 0 ? stroke : 'none');
    var drawStrokeOpacity = strokeShape ? ((stroke && stroke !== 'transparent') ? strokeOpacity : fillOpacity) : strokeOpacity;
    var drawStrokeWidth = strokeShape ? (sw > 0 ? sw : 2.2) : (sw > 0 ? sw : 0);
    var transform = shapeSvgTransform(type, context);
    return '<g' + (transform ? ' transform="' + transform + '"' : '') +
      ' fill="' + esc(drawFill) + '"' +
      ' fill-opacity="' + drawFillOpacity + '"' +
      ' stroke="' + esc(drawStroke) + '"' +
      ' stroke-opacity="' + drawStrokeOpacity + '"' +
      ' stroke-width="' + drawStrokeWidth + '"' +
      ' stroke-linejoin="round" stroke-linecap="round">' +
      shapePathByType(type, layer) +
    '</g>';
  }

  function renderGroupedTextItem(item, x, y){
    var align = item.align === 'center' || item.align === 'right' ? item.align : 'left';
    var tx = align === 'center' ? '-50%' : (align === 'right' ? '-100%' : '0');
    var bgHex = normalizeHexInput(item.bg) || '';
    var weight = item.weight === 'bold' ? '700' : item.weight === 'semibold' ? '600' : item.weight === 'medium' ? '500' : '400';
    return '<div class="cpTextBlock cpShapeText" style="left:' + x + '%;top:' + y + '%;transform:translate(' + tx + ',-50%);background:transparent;padding:0;border-color:transparent;pointer-events:none">' +
      '<span class="cpTextBlockText' + (bgHex ? ' hasBg' : '') + '" style="font-family:\'' + esc(item.font || 'IBM Plex Sans') + '\',sans-serif;color:' + esc(item.color || '#1a1a2e') + ';text-align:' + align + ';font-size:' + (Math.max(8, Math.min(48, parseInt(item.size, 10) || 12))) + 'pt;font-weight:' + weight + ';font-style:' + (item.italic ? 'italic' : 'normal') + ';text-decoration:' + (item.underline ? 'underline' : 'none') + ';' + (bgHex ? '--cp-text-bg:' + bgHex + ';' : '') + '">' + esc(item.text || '') + '</span>' +
    '</div>';
  }

  function getCardShapeLayers(meta, key){
    var ui = meta && meta.ui && typeof meta.ui === 'object' ? meta.ui : {};
    var store = ui.cardShapes && typeof ui.cardShapes === 'object' ? ui.cardShapes : {};
    return Array.isArray(store[key]) ? store[key] : [];
  }

  function cardShapeItemHtml(layer, idx, key){
    var safeKey = esc(key || 'algemeen');
    var roleAttr = layer && layer.role ? ' data-shape-role="' + esc(String(layer.role)) + '"' : '';
    var layerIdAttr = layer && layer.layerId ? ' data-layer-id="' + esc(String(layer.layerId)) + '"' : '';
    if(isGroupLayer(layer)){
      var gx = Number(layer.x) || 50;
      var gy = Number(layer.y) || 50;
      var gs = Math.max(1, Number(layer.size) || 42);
      var gr = Number(layer.rotate) || 0;
      return layer.groupChildren.map(function(child){
        if(isTextLayerItem(child)){
          var tcx = Number(child.x) || 50;
          var tcy = Number(child.y) || 50;
          var tax = gx + (tcx - 50) * gs / 100;
          var tay = gy + (tcy - 50) * gs / 100;
          return renderGroupedTextItem(child, Math.max(-25, Math.min(125, tax)), Math.max(-25, Math.min(125, tay)));
        }
        var cx = Number(child.x) || 50;
        var cy = Number(child.y) || 50;
        var cs = Math.max(1, Number(child.size) || 42);
        var ax = gx + (cx - 50) * gs / 100;
        var ay = gy + (cy - 50) * gs / 100;
        var as = cs * gs / 100;
        var ar = gr + (Number(child.rotate) || 0);
        var sx = Math.max(-25, Math.min(125, ax));
        var sy = Math.max(-25, Math.min(125, ay));
        var ss = Math.max(12, Math.min(240, as));
        var childRoleAttr = child && child.role ? ' data-shape-role="' + esc(String(child.role)) + '"' : roleAttr;
        var childLayerIdAttr = child && child.layerId ? ' data-layer-id="' + esc(String(child.layerId)) + '"' : layerIdAttr;
        return '<div class="cpShape" data-shape-idx="' + idx + '" data-shape-key="' + safeKey + '"' + childRoleAttr + childLayerIdAttr + ' style="left:' + sx + '%;top:' + sy + '%;width:' + ss + '%;height:' + ss + '%;transform:translate(-50%,-50%) rotate(' + ar + 'deg)">' +
          '<svg viewBox="0 0 100 100" aria-hidden="true">' + shapeLayerRenderMarkup(child, 'preview') + '</svg>' +
        '</div>';
      }).join('');
    }
    var size = Math.max(12, Math.min(120, Number(layer.size) || 42));
    var x = Math.max(-25, Math.min(125, Number(layer.x) || 50));
    var y = Math.max(-25, Math.min(125, Number(layer.y) || 50));
    var rot = Number(layer.rotate) || 0;
    return '<div class="cpShape" data-shape-idx="' + idx + '" data-shape-key="' + safeKey + '"' + roleAttr + layerIdAttr + ' style="left:' + x + '%;top:' + y + '%;width:' + size + '%;height:' + size + '%;transform:translate(-50%,-50%) rotate(' + rot + 'deg)">' +
      '<svg viewBox="0 0 100 100" aria-hidden="true">' + shapeLayerRenderMarkup(layer, 'preview') + '</svg>' +
    '</div>';
  }

  function cardShapesLayerHtml(meta, key){
    return getCardShapeLayers(meta, key).map(function(layer, idx){
      return cardShapeItemHtml(layer, idx, key);
    }).join('');
  }

  function render(options){
    var opts = options || {};
    var meta = opts.meta || {};
    var imgSrc = opts.forceNoImage ? '' : String(opts.imgSrc || '');
    var previewKey = opts.previewKey || 'algemeen';
    var cv = styleCssVarsForKey(meta, previewKey);
    var font = cv['--pk-font'] || 'IBM Plex Sans';
    var fs = fontSizeCss(cv['--pk-font-size'] || '12');
    var textColor = cv['--pk-set-text'] || 'rgba(48,96,136,0.95)';
    var halign = cv['--pk-text-align'] || 'center';
    var valign = cv['--pk-text-valign'] || 'center';
    var cardBg = normalizedCardSurface(opts.cardBg || cardBgForKey(meta, previewKey) || (cv['--pk-set-bg'] || DEFAULT_CARD_SURFACE));
    var emptyBg = normalizedCardSurface(opts.emptyBg || cardBg);
    var backCfg = backPreviewConfig(meta, opts.themeKey || previewKey, opts.backDesignKey || '');
    var backCv = backCfg.cssVars || cv;
    var backFont = backCv['--pk-font'] || font;
    var backFs = fontSizeCss(backCv['--pk-font-size'] || cv['--pk-font-size'] || '12');
    var backTextColor = backCv['--pk-set-text'] || textColor;
    var backHalign = backCv['--pk-text-align'] || halign;
    var backValign = backCv['--pk-text-valign'] || valign;
    var backAlignItems = backValign === 'top' ? 'flex-start' : backValign === 'bottom' ? 'flex-end' : 'center';
    var backJustifyContent = backHalign === 'left' ? 'flex-start' : backHalign === 'right' ? 'flex-end' : 'center';
    var backShapeKey = backCfg.styleKey || previewKey;
    var backBgHtml = backCfg.mirrorImage
      ? (imgSrc ? '<img class="cpBg' + (backCfg.reflect ? ' is-reflect' : '') + '" src="' + esc(imgSrc) + '" alt="">' : '<div class="cpBgEmpty" style="' + cardBgStyle(emptyBg) + ';position:absolute;inset:0"></div>')
      : '<div class="cpBgEmpty" style="' + cardBgStyle(backCfg.bg) + ';position:absolute;inset:0"></div>';
    var alignItems = valign === 'top' ? 'flex-start' : valign === 'bottom' ? 'flex-end' : 'center';
    var justifyContent = halign === 'left' ? 'flex-start' : halign === 'right' ? 'flex-end' : 'center';
    var wrapCls = opts.wrapClass || 'cardPrevWrap';
    var wrapStyle = opts.wrapStyle || '';
    var isCover = previewKey === 'cover' && !!opts.showCoverTexts;
    var isCoverPreview = previewKey === 'cover' && !opts.showCoverTexts;
    return '<div class="' + wrapCls + '"' +
      (opts.wrapId ? ' id="' + esc(opts.wrapId) + '"' : '') +
      (wrapStyle ? ' style="' + esc(wrapStyle) + '"' : '') + '>' +
      '<div class="cardFaceOuter">' +
        '<div class="cardFaceInner' + (opts.flipped ? ' flipped' : '') + '"' + (opts.faceId ? ' id="' + esc(opts.faceId) + '"' : '') + '>' +
          '<div class="cardFaceFront" style="' + cardBgStyle(cardBg) + '">' +
            (imgSrc ? '<img class="cpBg" src="' + esc(imgSrc) + '" alt="' + esc(opts.label || 'Kaartpreview') + '">' : '<div class="cpBgEmpty" style="' + cardBgStyle(emptyBg) + ';position:absolute;inset:0"></div>') +
            '<div class="cpShapeLayer" data-shape-key="' + esc(previewKey) + '">' + cardShapesLayerHtml(meta, previewKey) + '</div>' +
            (isCover ? '<div class="cpTextLayer" data-cover-texts="1">' + (opts.coverTextsHtml || '') + '</div>' : '') +
            '<div class="cpOverlay' + (isCoverPreview ? ' coverPreview' : '') + '" style="align-items:' + alignItems + ';justify-content:' + justifyContent + '">' +
              '<div class="cpFront' + (isCoverPreview ? ' coverPreviewText' : '') + '"' + (opts.frontId ? ' id="' + esc(opts.frontId) + '"' : '') + ' style="font-family:\'' + esc(font) + '\',sans-serif;font-size:' + (isCoverPreview ? 'clamp(15px,1.65vw,23px)' : esc(fs)) + ';color:' + esc(textColor) + ';text-align:' + halign + '">' +
                (isCover ? '' : '<span class="cpFrontInner">' + (opts.frontTxt ? esc(opts.frontTxt) : (opts.suppressEmptyFrontHint ? '' : '<span class="cpHint">Voorkant tekst</span>')) + '</span>') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="cardFaceBack' + (backCfg.reflect ? ' is-reflect' : '') + '"' + (opts.backId ? ' id="' + esc(opts.backId) + '"' : '') + ' style="background:' + (backCfg.custom ? esc(backCfg.bg) : 'transparent') + ';font-family:\'' + esc(backFont) + '\',sans-serif;font-size:' + esc(backFs) + ';color:' + esc(backTextColor) + '">' +
            backBgHtml +
            '<div class="cpShapeLayer' + (backCfg.reflect ? ' is-reflect' : '') + '" data-shape-key="' + esc(backShapeKey) + '">' + cardShapesLayerHtml(meta, backShapeKey) + '</div>' +
            '<div class="cpOverlay" style="position:absolute;inset:0;display:flex;align-items:' + backAlignItems + ';justify-content:' + backJustifyContent + ';padding:10px;text-align:' + backHalign + '">' + (opts.backTxt ? esc(opts.backTxt) : '') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      (opts.label ? '<div class="cpLabel">' + esc(opts.label) + '</div>' : '') +
    '</div>';
  }

  PK.sharedCardRenderer = {
    render: render,
    cardBuildModeForKey: cardBuildModeForKey,
    cardBgForKey: cardBgForKey,
    styleCssVarsForKey: styleCssVarsForKey,
    backPreviewConfig: backPreviewConfig,
    cardShapesLayerHtml: cardShapesLayerHtml,
    constants: {
      BACK_STYLE_KEY: BACK_STYLE_KEY,
      DEFAULT_CARD_SURFACE: DEFAULT_CARD_SURFACE
    }
  };
})(window);
