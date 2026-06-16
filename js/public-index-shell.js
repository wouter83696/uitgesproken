(function(global){
  function brandIconSrc(variant){
    var key=String(variant||'transparent');
    if(key==='squircle')return '/assets/logo-icons/masters/master-squircle.svg';
    if(key==='mint-bg')return '/assets/logo-icons/masters/master-mint.svg';
    if(key==='transparent-full'||key==='transparent')return '/assets/logo-icons/masters/master-transparent.svg';
    if(key==='gradient')return '/assets/logo-icons/masters/logo-ballon-gradient.svg';
    return '/assets/logo-icons/masters/master-transparent.svg';
  }
  function esc(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function themePillHtml(opts){
    opts=opts||{};
    var brandText=opts.brandText||'Uitgesproken';
    var iconSrc=opts.iconSrc||brandIconSrc(opts.iconVariant);
    return '<header class="topBar" aria-label="'+esc(opts.topBarAriaLabel||'Menu')+'">'+
      '<button id="themePill" class="themePill glassSurface" type="button" aria-haspopup="dialog" aria-expanded="false">'+
        '<span class="themePillMain" aria-hidden="true">'+
          '<span class="setCoverWrap">'+
            '<img id="setCoverIcon" class="setCoverIcon" src="'+esc(iconSrc)+'" alt="">'+
          '</span>'+
          '<span id="themePillBrand" class="themePillBrand">'+esc(brandText)+'</span>'+
        '</span>'+
        '<span class="themePillMenuIcon" aria-hidden="true">'+
          '<svg class="gmIcon" viewBox="0 0 24 24">'+
            '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>'+
          '</svg>'+
        '</span>'+
        '<span id="themePillText" class="srOnly">'+esc(opts.menuText||'Kaartensets')+'</span>'+
      '</button>'+
    '</header>';
  }

  function menuHeaderHtml(opts){
    opts=opts||{};
    return '<div class="menuHeaderRow">'+
      '<div id="menuHeaderTitle" class="menuHeader">'+esc(opts.title||'Kaartensets')+'</div>'+
      (opts.toolsHtml||'')+
    '</div>';
  }

  function menuToolsHtml(opts){
    opts=opts||{};
    var contrastId=opts.contrastId||'menuContrastToggle';
    var infoId=opts.infoId||'menuInfoBtn';
    var shuffleId=opts.shuffleId||'menuShuffleToggle';
    return '<div class="menuHeaderTools" aria-label="Acties">'+
      '<button id="'+esc(contrastId)+'" class="menuMiniBtn" type="button" aria-label="Contrastmodus" aria-pressed="false">'+
        '<svg class="gmIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18"></path><path d="M12 3v18"></path></svg>'+
      '</button>'+
      '<button id="'+esc(infoId)+'" class="menuMiniBtn" type="button" aria-label="Informatie">'+
        '<svg class="gmIcon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 10v7"></path><path d="M12 7h.01"></path></svg>'+
      '</button>'+
      '<button id="'+esc(shuffleId)+'" class="menuMiniBtn" type="button" aria-label="Shuffle" aria-pressed="false">'+
        '<svg class="gmIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5"></path><path d="M4 20l16-16"></path><path d="M4 4l8 8"></path><path d="M12 12l8 8"></path><path d="M21 16v5h-5"></path></svg>'+
      '</button>'+
    '</div>';
  }

  function menuFooterHtml(opts){
    opts=opts||{};
    return opts.showAllSets===false ? '' :
      '<div class="menuFooter"><button id="naarOverzicht" class="menuLink" type="button">'+esc(opts.label||'Alle kaartensets')+'</button></div>';
  }

  function menuShellHtml(opts){
    opts=opts||{};
    return '<div id="themeMenuOverlay" class="menuOverlay" hidden></div>'+
      '<section id="themeMenu" class="themeMenu" role="dialog" aria-label="'+esc(opts.title||'Kaartensets')+'" hidden>'+
        '<div class="menuCard glassSurface">'+
          menuHeaderHtml({title:opts.title,toolsHtml:opts.toolsHtml})+
          (opts.listHtml||'<div id="menuList" class="menuList"></div>')+
          menuFooterHtml({showAllSets:opts.showAllSets,label:opts.footerLabel})+
        '</div>'+
      '</section>';
  }

  function infoSheetCoverHtml(opts){
    opts=opts||{};
    return '<div class="indexInfoCover">'+
      '<img src="'+esc(opts.iconSrc||brandIconSrc(opts.iconVariant||'gradient'))+'" alt="" class="indexInfoBubbleIcon" aria-hidden="true">'+
      '<h2 class="indexInfoCoverTitle">'+esc(opts.title||'Uitgesproken')+'</h2>'+
      (opts.sub?'<p class="indexInfoCoverSub">'+esc(opts.sub)+'</p>':'')+
    '</div>';
  }

  function infoSheetTextHtml(opts){
    opts=opts||{};
    return '<div class="infoSlideText indexInfoSlideText" id="indexInfoSlideText">'+
      (opts.body?'<p class="infoTextIntro">'+esc(opts.body).replace(/\n/g,'<br>')+'</p>':'')+
    '</div>';
  }

  function infoSheetShellHtml(opts){
    opts=opts||{};
    var title=opts.title||'Uitgesproken';
    var sub=opts.sub||'';
    return '<div id="indexInfoOverlay" class="sheetOverlay indexInfoOverlay" hidden></div>'+
      '<section id="indexInfoSheet" class="infoSheet indexInfoSheet" role="dialog" aria-label="Over '+esc(sub||title)+'" hidden>'+
        '<div class="infoCard indexInfoCard" data-top="help" data-mode="help">'+
          '<div class="sheetHandle" aria-hidden="true"></div>'+
          '<button id="indexInfoClose" class="infoClose indexInfoClose menuMiniBtn" type="button" aria-label="Sluiten">'+
            '<svg class="gmIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="M6 6l12 12"></path></svg>'+
          '</button>'+
          '<div class="sheetViewport indexInfoViewport">'+
            '<div class="sheetStack"><div class="sheetPage sheetPageHelp"><div class="infoCarousel indexInfoCarousel" aria-label="Over '+esc(sub||title)+'"><div class="infoSlide"><div class="infoSlideInner indexInfoSlideInner"><div class="infoSlideCard indexInfoSlideCard">'+
              (opts.coverHtml||infoSheetCoverHtml({title:title,sub:sub,iconSrc:opts.iconSrc}))+
            '</div>'+
            (opts.textHtml||infoSheetTextHtml({body:opts.body||''}))+
            '</div></div></div></div></div>'+
        '</div>'+
      '</section>';
  }

  function setsHeroShellHtml(opts){
    opts=opts||{};
    return '<section class="setsHero" aria-label="Uitgelichte kaartensets">'+
      (opts.carouselHtml||'<div id="setsCarousel" class="setsHeroCarousel" aria-label="Kaartenset carrousel"></div>')+
      (opts.dotsHtml||'<div id="setsDots" class="setsDots" aria-hidden="true"></div>')+
    '</section>';
  }

  function setsGridShellHtml(opts){
    opts=opts||{};
    return '<section class="setsGridSection" aria-label="Alle kaartensets">'+
      (opts.gridHtml||'<div id="setsGrid" class="setsGrid"></div>')+
    '</section>';
  }

  function setsMainHtml(opts){
    opts=opts||{};
    return '<main class="setsIndexMain">'+
      (opts.heroHtml||'')+
      (opts.gridHtml||'')+
    '</main>';
  }

  function indexShellHtml(opts){
    opts=opts||{};
    return themePillHtml({brandText:opts.brandText,iconSrc:opts.iconSrc,menuText:opts.menuText,topBarAriaLabel:opts.topBarAriaLabel})+
      (opts.menuHtml||'')+
      (opts.infoSheetHtml||'')+
      (opts.mainHtml||'');
  }

  function cardsInfoSheetShellHtml(opts){
    opts=opts||{};
    var overlayId=opts.overlayId||'infoOverlay';
    var sheetId=opts.sheetId||'infoSheet';
    var closeId=opts.closeId||'infoClose';
    var carouselId=opts.carouselId||'infoCarousel';
    return '<div id="'+esc(overlayId)+'" class="sheetOverlay" hidden></div>'+
      '<section id="'+esc(sheetId)+'" class="infoSheet" role="dialog" aria-label="'+esc(opts.ariaLabel||'Kaarten & uitleg')+'" hidden>'+
        '<div class="infoCard" data-top="help">'+
          '<div class="sheetHandle" aria-hidden="true"></div>'+
          '<button id="'+esc(closeId)+'" class="infoClose menuMiniBtn" type="button" aria-label="Sluiten">'+
            '<svg class="gmIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="M6 6l12 12"></path></svg>'+
          '</button>'+
          '<div class="sheetViewport" aria-hidden="false">'+
            '<div id="sheetStack" class="sheetStack">'+
              '<div id="sheetPageHelp" class="sheetPage sheetPageHelp">'+
                '<div id="'+esc(carouselId)+'" class="infoCarousel" aria-label="'+esc(opts.carouselLabel||'Uitleg carrousel')+'"></div>'+
              '</div>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</section>';
  }

  function cardsPageShellHtml(opts){
    opts=opts||{};
    var carouselId=opts.carouselId||'mainCarousel';
    return '<main class="page">'+
      '<canvas id="indexBg" class="indexBg" aria-hidden="true"></canvas>'+
      '<div class="indexTint" aria-hidden="true"></div>'+
      '<div class="indexSoftBlob" aria-hidden="true"></div>'+
      '<div class="carouselStage" aria-label="'+esc(opts.stageLabel||'Kaarten')+'">'+
        '<div id="'+esc(carouselId)+'" class="cardsCarousel mainCarousel" aria-label="'+esc(opts.carouselLabel||'Kaarten carrousel')+'"></div>'+
      '</div>'+
    '</main>';
  }

  global.PublicIndexShell={
    brandIconSrc:brandIconSrc,
    esc:esc,
    themePillHtml:themePillHtml,
    menuHeaderHtml:menuHeaderHtml,
    menuToolsHtml:menuToolsHtml,
    menuFooterHtml:menuFooterHtml,
    menuShellHtml:menuShellHtml,
    infoSheetCoverHtml:infoSheetCoverHtml,
    infoSheetTextHtml:infoSheetTextHtml,
    infoSheetShellHtml:infoSheetShellHtml,
    setsHeroShellHtml:setsHeroShellHtml,
    setsGridShellHtml:setsGridShellHtml,
    setsMainHtml:setsMainHtml,
    indexShellHtml:indexShellHtml,
    cardsInfoSheetShellHtml:cardsInfoSheetShellHtml,
    cardsPageShellHtml:cardsPageShellHtml
  };
})(window);
