'use strict';
// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
var S={repo:'',token:'',sets:[],indexSha:'',indexData:{},activeId:null,d:{},mode:'checklist',wizStep:0,clTab:'opmaken',opmPane:'vragen',infoSlideIdx:0,dirty:false,thumbsOpen:false,history:{past:[],future:[],lastSig:'',suspend:false}};
var CC={},KF={},SC={},bgTimer=null,asTimer=null,_lp=null,dragSrc=null;
var BG_AUTO_PREVIEW_SEED=((Date.now()^((Math.random()*0xffffffff)>>>0))>>>0);
var LIB_REFRESH_TOKEN=0;
var STYLE_PREVIEW_KEY=null;
var INFO_SLIDE_KEY='cover';
var STYLE_PAL_EXPANDED={};
var BG_ACTIVE_PAL_INDEX=0;
var STIJL_KLEUR_TAB='settc';
var Q_EDITOR_SIDE='front';
var SELECTED_LIB_PATH='';
var ACTIVE_TARGET_PATH='';
var PRELOAD={token:0,active:false,total:0,done:0};
var RT={target:null,seed:0,richCeTarget:null,savedRange:null,ceBlurTimer:null};
function activateRichCe(el){
  if(RT.ceBlurTimer){clearTimeout(RT.ceBlurTimer);RT.ceBlurTimer=null;}
  RT.richCeTarget=el;
  if(el&&el.dataset.richType!=='question'){
    document.querySelectorAll('.stijlCanvasToolbar').forEach(function(t){t.classList.add('richce-active');});
  }
}
function deactivateRichCe(){
  if(RT.ceBlurTimer)clearTimeout(RT.ceBlurTimer);
  RT.ceBlurTimer=setTimeout(function(){
    var active=document.activeElement;
    var inToolbar=!!(active&&active.closest&&active.closest('.stijlCanvasTopTools,.stijlCanvasToolbar,.textToolbarMenuPop'));
    if(!inToolbar){
      RT.richCeTarget=null;RT.savedRange=null;
      document.querySelectorAll('.stijlCanvasToolbar').forEach(function(t){t.classList.remove('richce-active');});
    }
    RT.ceBlurTimer=null;
  },80);
}
function restoreRichCeSelection(){
  if(!RT.richCeTarget)return false;
  try{RT.richCeTarget.focus();}catch(e){}
  if(RT.savedRange){try{var sel=window.getSelection();if(sel){sel.removeAllRanges();sel.addRange(RT.savedRange);}}catch(e2){}}
  return true;
}
function applyRichCeCmd(cmd,val){
  if(!restoreRichCeSelection())return;
  try{document.execCommand(cmd,false,val||null);}catch(e){}
  var el=RT.richCeTarget;if(!el)return;
  var etype=el.dataset.richType;
  if(etype==='question'){
    var qkey=el.dataset.richQkey,qi=parseInt(el.dataset.richQi,10),field=el.dataset.richField||'voorkant';
    if(qkey&&!isNaN(qi)){updQ(qkey,qi,field,htmlToMd(el.innerHTML));syncSelectedQuestionPreview(qkey);}
  }else{
    var skey=el.dataset.richKey;
    if(skey){
      S.d.uitleg=S.d.uitleg||{};S.d.uitleg[skey]=htmlToMd(el.innerHTML);markDirty();
      if(!el.classList.contains('infoRichCe')){
        document.querySelectorAll('.infoRichCe[data-rich-key="'+skey+'"]').forEach(function(p){
          if(document.activeElement!==p)p.innerHTML=el.innerHTML;
        });
      }else{
        var sideEl=document.getElementById('u_'+skey);
        if(sideEl&&document.activeElement!==sideEl)sideEl.innerHTML=el.innerHTML;
      }
    }
  }
}

var STEPS=[
  {id:'opmaken', label:'Opmaken',     fn:buildStijl},
  {id:'inst',    label:'Instellingen',fn:buildInst}
];

// ═══════════════════════════════════════════
// KAARTFORMATEN
// ═══════════════════════════════════════════
var CARD_FORMATS=[
  {id:'landscape-85x55', w:85,  h:55,  label:'Huidig (85×55mm)',    sub:'Huidig formaat, landscape'},
  {id:'portrait-63x88',  w:63,  h:88,  label:'Speelkaart (63×88mm)',sub:'Aanbevolen · meest gangbaar voor print'},
  {id:'square-88x88',    w:88,  h:88,  label:'Vierkant (88×88mm)',  sub:'Modern, symmetrisch'},
  {id:'portrait-70x120', w:70,  h:120, label:'Tarot (70×120mm)',    sub:'Meer ruimte voor tekst'},
];
var DEFAULT_CARD_FORMAT='landscape-85x55';
var CARD_EDITOR_SOURCE_FOLDER='cards';
var CARD_ASSET_FALLBACK_FOLDERS=['cards','cards_rect','cards_square'];
function getCardFormatIdForMeta(meta){
  return (meta&&meta.cardFormat)||DEFAULT_CARD_FORMAT;
}
function getCardFormatObjForMeta(meta){
  var id=getCardFormatIdForMeta(meta);
  return CARD_FORMATS.find(function(f){return f.id===id;})||CARD_FORMATS[0];
}
function getCardFormatId(){
  return getCardFormatIdForMeta(S.d&&S.d.meta);
}
function getCardFormatObj(){
  return getCardFormatObjForMeta(S.d&&S.d.meta);
}
function cardFormatDimensionsText(meta){
  var f=getCardFormatObjForMeta(meta);
  return f.w+'×'+f.h+'mm';
}
function cardFormatRatioText(meta){
  var f=getCardFormatObjForMeta(meta);
  return f.w+':'+f.h;
}
function cardEditorSourceFolder(){
  return CARD_EDITOR_SOURCE_FOLDER;
}
function cardAssetFolders(){
  return CARD_ASSET_FALLBACK_FOLDERS.slice();
}
function cardAssetPathForSet(id,file){
  return 'sets/'+id+'/'+cardEditorSourceFolder()+'/'+file;
}
function cardAssetCandidatePaths(id,file){
  return cardAssetFolders().map(function(folder){
    return 'sets/'+id+'/'+folder+'/'+file;
  });
}
function cardAssetSiblingPaths(path){
  var m=String(path||'').match(/^(sets\/[^/]+)\/(cards(?:_rect|_square)?)\/([^/]+)$/);
  if(!m)return[path];
  return cardAssetFolders().map(function(folder){
    return m[1]+'/'+folder+'/'+m[3];
  }).filter(function(p,idx,arr){return arr.indexOf(p)===idx;});
}
function cachedCardAssetForFile(id,file){
  var paths=cardAssetCandidatePaths(id,file);
  for(var i=0;i<paths.length;i++){
    var hit=CC[paths[i]];
    if(hit&&hit.dataUrl)return{path:paths[i],asset:hit};
  }
  return null;
}
function cachedCardAssetForPath(path){
  if(path&&CC[path]&&CC[path].dataUrl)return{path:path,asset:CC[path]};
  var siblings=cardAssetSiblingPaths(path);
  for(var i=0;i<siblings.length;i++){
    var hit=CC[siblings[i]];
    if(hit&&hit.dataUrl)return{path:siblings[i],asset:hit};
  }
  return null;
}
function applyCardFormat(){
  var f=getCardFormatObj();
  document.documentElement.style.setProperty('--cardAspect',f.w+'/'+f.h);
  // narrow = portret/vierkant/tarot: iconen passen niet in één rij op de thumbnail
  document.documentElement.classList.toggle('card-fmt-narrow',f.h>=f.w);
}
function setCardFormat(id){
  S.d.meta=S.d.meta||{};
  S.d.meta.cardFormat=id;
  applyCardFormat();
  markDirty();
  if(S.clTab==='opmaken')buildStijlPreserveBg(g('pw'));
  // sync tile sel state without full rebuild
  document.querySelectorAll('.fmtTile[data-fmt]').forEach(function(t){
    t.classList.toggle('sel',t.dataset.fmt===id);
  });
}
function pickNewFmt(id,el){
  var wrap=el.closest('.fmtStrip');
  if(wrap)wrap.querySelectorAll('.fmtTile').forEach(function(t){t.classList.remove('sel');});
  el.classList.add('sel');
  var inp=g('ns_fmt');if(inp)inp.value=id;
}
function fmtStripHtml(currentId,onclickFn){
  var maxW=52,maxH=68;
  return '<div class="fmtStrip">'+
    CARD_FORMATS.map(function(f){
      var sel=f.id===currentId;
      var ratio=f.w/f.h,tw,th;
      if(f.w/maxW > f.h/maxH){tw=maxW;th=Math.round(maxW/ratio);}
      else{th=maxH;tw=Math.round(maxH*ratio);}
      return '<button type="button" class="fmtTile'+(sel?' sel':'')+'" data-fmt="'+f.id+'" onclick="'+onclickFn+'(\''+f.id+'\',this)" title="'+esc(f.sub)+'">'+
        '<div class="fmtThumbWrap">'+
          '<div class="fmtThumb" style="width:'+tw+'px;height:'+th+'px"></div>'+
        '</div>'+
        '<div class="fmtName">'+esc(f.label.replace(/\s*\(.*\)/,''))+'</div>'+
        '<div class="fmtDim">'+f.w+'×'+f.h+'</div>'+
      '</button>';
    }).join('')+
  '</div>';
}
function adminNightMode(){
  return lsGet('pk_admin_night')==='1';
}
function applyAdminNightMode(){
  document.documentElement.classList.toggle('admin-night',adminNightMode());
}
function toggleAdminNight(){
  lsSet('pk_admin_night',adminNightMode()?'0':'1');
  applyAdminNightMode();
  if(g('mc')&&S.activeId)renderEditor();
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
(function(){
  applyAdminNightMode();
  // Als Supabase beschikbaar is, laat supabase-data.js de init afhandelen
  if(window._supa) return;
  // Legacy GitHub auth
  var cfg=parse(lsGet('pk_cfg'));
  if(cfg&&cfg.repo&&cfg.token){S.repo=cfg.repo;S.token=cfg.token;g('iRepo').value=S.repo;g('iToken').value=S.token;lbStart();loadIndex();}
})();

// ═══════════════════════════════════════════
// API
// ═══════════════════════════════════════════
function api(path,method,body){
  return fetch('https://api.github.com/repos/'+S.repo+path,{
    method:method||'GET',
    cache:'no-store',
    headers:{'Authorization':'token '+S.token,'Accept':'application/vnd.github.v3+json','Content-Type':'application/json'},
    body:body?JSON.stringify(body):undefined
  }).then(function(r){
    if(!r.ok)return r.json().then(function(e){throw new Error(e.message||'HTTP '+r.status);});
    return r.status===204?{}:r.json();
  });
}
function getLocalFile(path){
  var rel='../'+String(path||'').replace(/^\//,'');
  return fetch(rel,{cache:'no-store'})
    .then(function(r){
      if(!r.ok)throw new Error('HTTP '+r.status);
      return r.json();
    })
    .then(function(data){return{data:data,sha:null,local:true};});
}
function getFile(path){
  return api('/contents/'+path)
    .then(function(r){return{data:JSON.parse(decode(atob(r.content.replace(/\s/g,'')))),sha:r.sha};})
    .catch(function(err){
      return getLocalFile(path).catch(function(){ throw err; });
    });
}
function saveFile(path,data,sha,msg){
  var c=btoa(encode(JSON.stringify(data,null,2)));
  var b={message:msg||('Update '+path),content:c};if(sha)b.sha=sha;
  return api('/contents/'+path,'PUT',b);
}
function listFolder(fp){
  if(KF[fp])return Promise.resolve(KF[fp]);
  return api('/contents/'+fp).then(function(r){
    var f=Array.isArray(r)?r.filter(function(x){return x.type==='file'&&/\.(svg|png)$/i.test(x.name);}).map(function(x){return{name:x.name,sha:x.sha};}):[];
    KF[fp]=f;return f;
  }).catch(function(){return[];});
}
function clearFolderCache(path){
  // Clear KF for the folder containing this path, and all parent folders
  var parts=path.split('/');
  for(var i=1;i<=parts.length;i++){delete KF[parts.slice(0,i).join('/')];}
  // Also clear the exact path
  delete KF[path];
}
function ensureSha(path){
  // Always fetch fresh SHA from GitHub — never use cached SHA for uploads
  // (cached SHA goes stale after any previous upload)
  return api('/contents/'+path).then(function(r){
    CC[path]=CC[path]||{};CC[path].sha=r.sha;return r.sha;
  }).catch(function(){return null;}); // null = new file, no SHA needed
}
function decode(s){return decodeURIComponent(escape(s));}
function encode(s){return unescape(encodeURIComponent(s));}

// ═══════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════
function connect(){
  var repo=g('iRepo').value.trim(),token=g('iToken').value.trim();
  if(!repo||!token){toast('Vul beide velden in','red');return;}
  var btn=g('conBtn');btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Verbinden…';
  S.repo=repo;S.token=token;localStorage.setItem('pk_cfg',JSON.stringify({repo:repo,token:token}));
  lbStart();
  loadIndex().catch(function(e){
    btn.disabled=false;btn.innerHTML='Verbinden';
    var em=e.message||'';
    if(em.indexOf('401')>=0||em.toLowerCase().indexOf('unauthorized')>=0||em.toLowerCase().indexOf('bad cred')>=0)
      toast('Token ongeldig of verlopen — controleer je token','red');
    else if(em.indexOf('404')>=0)
      toast('Repository niet gevonden — controleer eigenaar/naam','red');
    else
      toast('Verbinding mislukt: '+em,'red');
    lbFail();show('setup');hide('app');
  });
}
function disconnect(){localStorage.removeItem('pk_cfg');location.reload();}


// ─── LOADING BAR ─────────────────────────────────────────────────────────────
var _lbTimer=null,_lbVal=0;
function lbStart(){
  var b=g('loadBar');if(!b)return;
  clearInterval(_lbTimer);_lbVal=0;
  b.style.background='rgba(79,142,158,.78)';
  b.style.transition='none';b.style.width='0%';b.classList.add('on');
  setTimeout(function(){
    b.style.transition='width .18s cubic-bezier(.33,1,.68,1),opacity .26s ease';
    _lbTimer=setInterval(function(){
      // Slow approach to 90% — never completes automatically
      var step=_lbVal<30?4:_lbVal<60?2:_lbVal<85?0.8:0.2;
      _lbVal=Math.min(_lbVal+step,90);
      b.style.width=_lbVal+'%';
    },100);
  },20);
}
function lbSet(pct){
  var b=g('loadBar');if(!b)return;
  clearInterval(_lbTimer);_lbTimer=null;
  _lbVal=Math.max(0,Math.min(100,Number(pct)||0));
  b.style.background='rgba(79,142,158,.78)';
  b.classList.add('on');
  b.style.transition='width .18s cubic-bezier(.33,1,.68,1),opacity .26s ease';
  b.style.width=_lbVal+'%';
}
function lbDone(){
  var b=g('loadBar');if(!b)return;
  clearInterval(_lbTimer);_lbTimer=null;_lbVal=100;
  b.style.width='100%';
  setTimeout(function(){b.classList.remove('on');setTimeout(function(){b.style.width='0%';},400);},280);
}
function lbFail(){var b=g('loadBar');if(!b)return;clearInterval(_lbTimer);b.style.background='var(--rd)';lbDone();setTimeout(function(){b.style.background='var(--tl)';},800);}

function cloneJson(v){
  return v==null ? v : JSON.parse(JSON.stringify(v));
}
function buildSetBundle(id,res){
  return {
    meta: res[0].data,
    metaSha: res[0].sha,
    questions: res[1].data,
    questionsSha: res[1].sha,
    uitleg: res[2].data,
    uitlegSha: res[2].sha,
    intro: res[3].data,
    introSha: res[3].sha
  };
}
function cloneSetBundle(bundle){
  return {
    meta: cloneJson(bundle.meta),
    metaSha: bundle.metaSha || null,
    questions: cloneJson(bundle.questions),
    questionsSha: bundle.questionsSha || null,
    uitleg: cloneJson(bundle.uitleg),
    uitlegSha: bundle.uitlegSha || null,
    intro: cloneJson(bundle.intro),
    introSha: bundle.introSha || null
  };
}
function hasCardPreviewForSet(id,file){
  if(!id||!file)return false;
  return !!cachedCardAssetForFile(id,file);
}
function cardBuildStore(meta){
  meta=meta||S.d.meta||{};
  meta.ui=meta.ui||{};
  meta.ui.cardModes=meta.ui.cardModes||{};
  return meta.ui.cardModes;
}
function cardBuildModeForKey(meta,key){
  if(!key)return 'image';
  var store=cardBuildStore(meta);
  return store[key]==='self'?'self':'image';
}
function setCardBuildMode(key,mode,ev){
  if(ev)ev.stopPropagation();
  if(!key)return;
  var store=cardBuildStore(S.d.meta||{});
  store[key]=mode==='self'?'self':'image';
  markDirty();
  refreshAdminPanel();
  updateStijlPreview();
}
function setCardBuildModeForPath(path,mode){
  if(!path)return;
  var fname=String(path.split('/').pop()||'');
  if(fname==='voorkant.svg'){setCardBuildMode('cover',mode);return;}
  var themes=((S.d||{}).meta||{}).themes||[];
  if(fname==='kaart.svg'){setCardBuildMode('algemeen',mode);return;}
  var th=themes.find(function(t){
    return fname===((t.card||(t.key+'.svg'))||'')||fname===String((t.key||'')+'.svg');
  });
  if(th)setCardBuildMode(th.key,mode);
}
function cardsStepDoneForState(id,meta){
  meta=meta||{};
  var themes=meta.themes||[];
  var coverReady=cardBuildModeForKey(meta,'cover')==='self' || hasCardPreviewForSet(id,'voorkant.svg');
  if(!coverReady)return false;
  if(!themes.length){
    return cardBuildModeForKey(meta,'algemeen')==='self' || hasCardPreviewForSet(id,'kaart.svg');
  }
  return themes.every(function(t){
    var file=t.card||(t.key?String(t.key)+'.svg':'');
    return cardBuildModeForKey(meta,t.key)==='self' || (!!file&&hasCardPreviewForSet(id,file));
  });
}
function calcPctFromBundle(bundle){
  var meta=(bundle&&bundle.meta)||{};
  var themes=meta.themes||[];
  var questions=(bundle&&bundle.questions)||{};
  var uitleg=(bundle&&bundle.uitleg)||{};
  var items=[
    !!(bundle&&bundle.meta&&bundle.meta.id&&cardsStepDoneForState(bundle.meta.id,meta)),
    Object.values(questions||{}).some(function(a){return Array.isArray(a)&&a.length>0;})||!themes.length,
    !!(uitleg&&uitleg.cover),
    true
  ];
  var done=items.filter(Boolean).length;
  return Math.round(done/items.length*100);
}
function cacheSetBundle(id,bundle){
  SC[id]=bundle;
  var idx=S.sets.findIndex(function(s){return s.id===id;});
  if(idx>=0)S.sets[idx]._pct=calcPctFromBundle(bundle);
}
function historyStateSig(bundle){
  try{return JSON.stringify(bundle||{});}catch(_){return '';}
}
function currentHistorySnapshot(){
  return cloneSetBundle(S.d||{meta:{},questions:{},uitleg:{},intro:{}});
}
function savedHistorySnapshot(){
  return S.activeId&&SC[S.activeId]?cloneSetBundle(SC[S.activeId]):null;
}
function updateDirtyUi(){
  var db=g('dirtyBadge');
  if(db)db.classList.toggle('on',!!S.dirty);
}
function refreshTopBarControls(){
  updateDirtyUi();
  var ub=g('undoBtn');
  if(ub)ub.disabled=!canUndo();
  var rb=g('redoBtn');
  if(rb)rb.disabled=!canRedo();
}
function syncDirtyFromSnapshot(){
  var saved=savedHistorySnapshot();
  S.dirty=!saved||historyStateSig(currentHistorySnapshot())!==historyStateSig(saved);
  refreshTopBarControls();
}
function resetHistory(snapshot){
  var snap=cloneSetBundle(snapshot||currentHistorySnapshot());
  S.history={past:[snap],future:[],lastSig:historyStateSig(snap),suspend:false};
  refreshTopBarControls();
}
function pushHistorySnapshot(force){
  if(!S.history||S.history.suspend)return;
  var snap=currentHistorySnapshot();
  var sig=historyStateSig(snap);
  if(!force&&sig===S.history.lastSig)return;
  S.history.past.push(snap);
  if(S.history.past.length>80)S.history.past.shift();
  S.history.future=[];
  S.history.lastSig=sig;
}
function captureHistoryBeforeChange(){
  if(!S.history||S.history.suspend)return;
  var sig=historyStateSig(currentHistorySnapshot());
  if(sig===S.history.lastSig)return;
  pushHistorySnapshot(true);
}
function canUndo(){return !!(S.history&&S.history.past&&S.history.past.length>1);}
function canRedo(){return !!(S.history&&S.history.future&&S.history.future.length);}
function applyHistorySnapshot(snapshot){
  if(!snapshot)return;
  S.history.suspend=true;
  S.d=cloneSetBundle(snapshot);
  S.history.suspend=false;
  S.history.lastSig=historyStateSig(snapshot);
  syncDirtyFromSnapshot();
  renderSidebar();
  renderEditor();
}
function undoSetChanges(){
  if(!canUndo())return;
  var current=currentHistorySnapshot();
  var prev=S.history.past[S.history.past.length-2];
  S.history.future.unshift(current);
  S.history.past.pop();
  applyHistorySnapshot(prev);
  refreshTopBarControls();
  toast('Stap ongedaan','amber');
}
function redoSetChanges(){
  if(!canRedo())return;
  var next=S.history.future.shift();
  S.history.past.push(cloneSetBundle(next));
  applyHistorySnapshot(next);
  refreshTopBarControls();
  toast('Opnieuw toegepast','green');
}
function clearSetClientState(id){
  if(!id)return;
  delete SC[id];
  lsDel('pk_draft_'+id);
  lsDel('pk_mode_'+id);
  Object.keys(CC).forEach(function(path){
    if(path.indexOf('sets/'+id+'/')===0)delete CC[path];
  });
  Object.keys(KF).forEach(function(path){
    if(path.indexOf('sets/'+id+'/')===0)delete KF[path];
  });
  if(S.activeId===id){
    SELECTED_LIB_PATH='';
    ACTIVE_TARGET_PATH='';
  }
  delete STYLE_SHAPE_SELECTED[id];
}
function loadSetFiles(id){
  return Promise.all([
    getFile('sets/'+id+'/meta.json').catch(function(){return{data:mkMeta(id),sha:null};}),
    getFile('sets/'+id+'/questions.json').catch(function(){return{data:{},sha:null};}),
    getFile('sets/'+id+'/uitleg.json').catch(function(){return{data:{},sha:null};}),
    getFile('sets/'+id+'/intro.json').catch(function(){return{data:{slides:[],hint:'← → swipe'},sha:null};})
  ]).then(function(res){
    return buildSetBundle(id,res);
  });
}
function preloadPreviewAsset(path){
  if(!path||CC[path]) return Promise.resolve(CC[path]||null);
  return api('/contents/'+path).then(function(res){
    var content=String((res&&res.content)||'').replace(/\s/g,'');
    if(!content) return null;
    var isSvg=/\.svg$/i.test(path);
    var dataUrl=isSvg
      ? 'data:image/svg+xml;base64,'+btoa(encode(atob(content)))
      : 'data:image/png;base64,'+content;
    CC[path]={sha:res.sha,dataUrl:dataUrl};
    return CC[path];
  }).catch(function(){ return null; });
}
function preloadSetAssets(id,bundle){
  var meta=(bundle&&bundle.meta)||{};
  var themes=meta.themes||[];
  var files=cardAssetCandidatePaths(id,'voorkant.svg');
  if(!themes.length){
    files=files.concat(cardAssetCandidatePaths(id,'kaart.svg'));
  }
  themes.forEach(function(t){
    var file=t.card||(t.key+'.svg');
    files=files.concat(cardAssetCandidatePaths(id,file));
  });
  var seen={};
  files=files.filter(function(path){
    if(!path||seen[path]) return false;
    seen[path]=true;
    return true;
  });
  return Promise.all(files.map(preloadPreviewAsset));
}
function preloadAllSets(){
  var sets=(S.sets||[]).slice();
  if(!sets.length){lbDone();return Promise.resolve();}
  var token=++PRELOAD.token;
  PRELOAD.active=true;
  PRELOAD.total=sets.length+1;
  PRELOAD.done=1;
  lbSet((PRELOAD.done/PRELOAD.total)*100);
  var chain=Promise.resolve();
  sets.forEach(function(set){
    chain=chain.then(function(){
      return loadSetFiles(set.id)
        .then(function(bundle){
          cacheSetBundle(set.id,bundle);
          return preloadSetAssets(set.id,bundle);
        })
        .catch(function(){ return null; })
        .then(function(){
          if(token!==PRELOAD.token) return;
          PRELOAD.done+=1;
          renderSidebar();
          lbSet((PRELOAD.done/PRELOAD.total)*100);
        });
    });
  });
  return chain.then(function(){
    if(token!==PRELOAD.token) return;
    PRELOAD.active=false;
    lbDone();
  }).catch(function(){
    if(token!==PRELOAD.token) return;
    PRELOAD.active=false;
    lbDone();
  });
}
function renderLoadedWelcome(){
  var count=(S.sets||[]).length;
  var label=count===1?'kaartenset':'kaartensets';
  hideFloatingTextBar(true);
  g('mc').innerHTML='<div class="welcome" style="gap:12px">'+
    '<img src="../assets/logo-icons/masters/master-squircle.svg" style="width:56px;height:56px" alt="Uitgesproken">'+
    '<h2>Alle kaartensets zijn geladen</h2>'+
    '<p>Kies links een set om verder te werken.</p>'+
    '<div class="welcomeStat">✓ '+count+' '+label+' en previews staan klaar in de editor</div>'+
  '</div>';
}
// ═══════════════════════════════════════════
// INDEX
// ═══════════════════════════════════════════
function loadIndex(){
  show('app');hide('setup');g('sbRepo').textContent=S.repo;
  if(g('sbQ'))g('sbQ').value='';
  g('mc').innerHTML='<div class="welcome" style="opacity:.4"><p style="font-size:12px;color:var(--k3)">Sets laden…</p></div>';
  return getFile('sets/index.json').then(function(r){
    S.sets=r.data.sets||[];
    S.indexSha=r.sha;
    S.indexData=r.data;
    renderSidebar();
    if(!S.sets.length){
      g('mc').innerHTML='<div class="welcome"><h2>Selecteer een set</h2><p>Kies een kaartenset in de zijbalk of maak een nieuwe aan.</p></div>';
      return Promise.resolve();
    }
    var preferredId=(S.indexData&&S.indexData.default)||((S.sets[0]||{}).id)||null;
    return preloadAllSets()
      .catch(function(){ return null; })
      .then(function(){
        renderSidebar();
        if(preferredId&&S.sets.some(function(s){return s.id===preferredId;})){
          return loadSet(preferredId,{silent:true}).catch(function(){
            renderSidebar();
            renderLoadedWelcome();
          });
        }
        renderLoadedWelcome();
      });
  });
}
function refreshIndexSha(){
  return api('/contents/sets/index.json').then(function(r){
    S.indexSha=r.sha;
  }).catch(function(){});
}
function saveIndex(msg){S.indexData.sets=S.sets;return saveFile('sets/index.json',S.indexData,S.indexSha,msg||'Update index').then(function(r){S.indexSha=(r.content||{}).sha||S.indexSha;});}

// ═══════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════
function renderSidebar(){
  var sbQ=g('sbQ'),setList=g('setList');
  if(!setList)return;
  var q=String(sbQ&&sbQ.value||'').toLowerCase();
  var list=(Array.isArray(S.sets)?S.sets:[]).filter(function(s){
    var title=String((s&&s.title)||'').toLowerCase();
    var id=String((s&&s.id)||'').toLowerCase();
    return !q||title.indexOf(q)>=0||id.indexOf(q)>=0;
  });
  setList.innerHTML=list.map(function(s){
    var sid=String((s&&s.id)||'');
    var pct=calcPct(sid),isDirty=sid===S.activeId&&S.dirty;
    return '<button class="sItem'+(sid===S.activeId?' active':'')+(isDirty?' dirty':'')+'" draggable="true" data-sid="'+esc(sid)+'" onclick="reqLoad(\''+esc(sid)+'\')">'+
      '<span class="sDot"></span><span class="sNm">'+esc((s&&s.title)||sid)+'</span>'+
      '<span class="sDirty" title="Niet opgeslagen"></span><span class="sPct">'+pct+'%</span></button>';
  }).join('');
  if(!list.length&&Array.isArray(S.sets)&&S.sets.length&&!q){
    setList.innerHTML='<div class="empty" style="padding:10px 0;color:var(--k3)">Er ging iets mis bij het tonen van de sets.</div>';
  }
  initSbDrag();
}
function calcPct(id){
  if(id!==S.activeId){
    var cached=S.sets.find(function(s){return s.id===id;});
    return cached&&typeof cached._pct==='number'?cached._pct:0;
  }
  var n=STEPS.filter(function(s){return stepDone(s.id);}).length;
  var pct=Math.round(n/STEPS.length*100);
  var idx=S.sets.findIndex(function(s){return s.id===id;});
  if(idx>=0)S.sets[idx]._pct=pct;
  return pct;
}
function initSbDrag(){
  g('setList').querySelectorAll('.sItem').forEach(function(btn){
    btn.addEventListener('dragstart',function(e){dragSrc=this;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',this.dataset.sid);this.style.opacity='.5';});
    btn.addEventListener('dragend',function(){this.style.opacity='';g('setList').querySelectorAll('.sItem').forEach(function(b){b.style.boxShadow='';});});
    btn.addEventListener('dragover',function(e){e.preventDefault();this.style.boxShadow='0 0 0 2px var(--tl)';});
    btn.addEventListener('dragleave',function(){this.style.boxShadow='';});
    btn.addEventListener('drop',function(e){
      e.preventDefault();this.style.boxShadow='';
      var fromId=e.dataTransfer.getData('text/plain'),toId=this.dataset.sid;
      if(fromId===toId)return;
      var fi=S.sets.findIndex(function(s){return s.id===fromId;}),ti=S.sets.findIndex(function(s){return s.id===toId;});
      if(fi<0||ti<0)return;
      var item=S.sets.splice(fi,1)[0];S.sets.splice(ti,0,item);
      saveIndex('Reorder sets').then(function(){renderSidebar();}).catch(function(){renderSidebar();});
    });
  });
}

// ═══════════════════════════════════════════
// LOAD SET
// ═══════════════════════════════════════════
function reqLoad(id){
  if(id===S.activeId)return;
  if(S.dirty){
    showModal('<h3>Niet opgeslagen wijzigingen</h3><p>Wat wil je doen met de wijzigingen in <strong>'+esc(S.activeId)+'</strong>?</p>'+
      '<div class="mAct">'+
      '<button class="mCa" onclick="closeModal();loadSet(\''+esc(id)+'\')">Weggooien</button>'+
      '<button class="mOk" onclick="closeModal();saveSet(function(){loadSet(\''+esc(id)+'\');})">Eerst opslaan</button>'+
      '</div>');
    return;
  }
  loadSet(id);
}
function loadSet(id,opts){
  opts=opts||{};
  S.activeId=id;S.dirty=false;S.wizStep=0;S.clTab='opmaken';S.opmPane='vragen';S.infoSlideIdx=0;
  STYLE_PREVIEW_KEY=null;
  COVER_TEXT_SELECTED_MULTI=[];
  if(!opts.silent){
    lbStart();
    g('mc').innerHTML='<div class="welcome" style="opacity:.3"><p style="font-size:11.5px;color:var(--k3)">Laden…</p></div>';
  }
  renderSidebar();
  var loader=SC[id]
    ? Promise.resolve(cloneSetBundle(SC[id]))
    : loadSetFiles(id).then(function(bundle){
        cacheSetBundle(id,bundle);
        return cloneSetBundle(bundle);
      });
  return loader.then(function(bundle){
    S.d=bundle;
    normalizeLegacyCardSurfaceMeta(S.d.meta);
    cacheSetBundle(id,cloneSetBundle(S.d));
    var draft=parse(lsGet('pk_draft_'+id));
    if(draft&&draft.ts&&draft.ts>Date.now()-86400000){
      g('mc').innerHTML='<div class="welcome" style="gap:12px">'+
        '<p style="font-size:13px;color:var(--k2);max-width:340px;line-height:1.6">Er is een lokaal concept van <strong>'+esc(id)+'</strong>.<br>Opgeslagen '+timeAgo(draft.ts)+'</p>'+
        '<div style="display:flex;gap:8px">'+
        '<button class="btnS" onclick="discardDraft()">Weggooien</button>'+
        '<button class="btn" onclick="restoreDraft()">Concept herstellen</button>'+
        '</div></div>';
      window._pd=draft;return;
    }
    afterLoad(id);
  }).catch(function(e){lbFail();toast('Laden mislukt: '+e.message,'red');});
}
function restoreDraft(){S.d=window._pd.data;normalizeLegacyCardSurfaceMeta(S.d.meta);resetHistory(S.d);lsDel('pk_draft_'+S.activeId);afterLoad(S.activeId);}
function discardDraft(){lsDel('pk_draft_'+S.activeId);afterLoad(S.activeId);}
function afterLoad(id){
  lbDone();
  applyCardFormat();
  S.mode='checklist';
  lsSet('pk_mode_'+id,'checklist');
  resetHistory(S.d);
  syncDirtyFromSnapshot();
  startAutoSave();
  // Start preloading card images immediately in background
  setTimeout(loadCardPreviews,100);
  renderEditor();
}
function startAutoSave(){
  clearInterval(asTimer);
  asTimer=setInterval(function(){
    if(!S.dirty||!S.activeId)return;
    localStorage.setItem('pk_draft_'+S.activeId,JSON.stringify({ts:Date.now(),data:S.d}));
    var b=g('asBanner');if(b){b.classList.add('on');setTimeout(function(){b.classList.remove('on');},2200);}
  },15000);
}

// ═══════════════════════════════════════════
// MODE CHOICE
// ═══════════════════════════════════════════
function showModeChoice(){
  renderEditor();
}
function goWizard(){goChecklist();}
function goChecklist(){S.mode='checklist';S.clTab='opmaken';S.opmPane='vragen';S.infoSlideIdx=0;lsSet('pk_mode_'+S.activeId,'checklist');renderEditor();}
function closeInstPage(){
  switchTab(S.prevMainTab||'opmaken');
}

// ═══════════════════════════════════════════
// RENDER EDITOR
// ═══════════════════════════════════════════
function renderEditor(){
  hideFloatingTextBar(true);
  var adminNight=adminNightMode();
  var adminNightIcon=adminNight
    ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.9 1.8a5.8 5.8 0 1 0 3.3 10.7 6.2 6.2 0 1 1-3.3-10.7Z"></path></svg>'
    : '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.4"></circle><path d="M8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7 3.6 3.6"></path></svg>';
  var settingsBtn='<button class="btnIcon'+(S.clTab==='inst'?' is-active':'')+'" type="button" title="Instellingen" aria-label="Instellingen" onclick="switchTab(\'inst\')"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>';
  var backToStyleBtn=S.clTab==='inst'
    ? '<button class="btnS clBackBtn" type="button" onclick="closeInstPage()" title="Terug naar Opmaak">← Opmaak</button>'
    : '';
  var setTitle=esc((S.d&&S.d.meta&&S.d.meta.title)||S.activeId||'');
  var headTitle='<div class="clHeadTitle">'+
    '<input id="editorSetTitle" class="clHeadTitleInput" type="text" value="'+setTitle+'" placeholder="Setnaam" oninput="updateStyleSetName(this.value)">'+
    '<span class="clHeadThemeSep" id="editorThemeSep" style="display:none"></span>'+
    '<input id="editorThemeTitle" class="clHeadThemeInput" type="text" value="" placeholder="Thema" style="display:none" oninput="updateActiveHeaderThemeName(this.value)">'+
  '</div>';
  var headActions='<div class="tbR">'+
    '<button class="btnS" type="button" onclick="showLivePreview()" style="font-size:11.5px" title="Bekijk set in telefoonweergave">↗ Live</button>'+
    '<button class="btnIcon" id="undoBtn" type="button" onclick="undoSetChanges()"'+(canUndo()?'':' disabled')+' title="Ongedaan" aria-label="Ongedaan"><svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 1 1 0 12h-2"/></svg></button>'+
    '<button class="btnIcon" id="redoBtn" type="button" onclick="redoSetChanges()"'+(canRedo()?'':' disabled')+' title="Opnieuw" aria-label="Opnieuw"><svg viewBox="0 0 24 24"><path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 1 0 0 12h2"/></svg></button>'+
    '<button class="btnIcon'+(adminNight?' is-active':'')+'" type="button" onclick="toggleAdminNight()" title="'+(adminNight?'Nachtmodus uitzetten':'Nachtmodus aanzetten')+'" aria-label="'+(adminNight?'Nachtmodus uitzetten':'Nachtmodus aanzetten')+'">'+adminNightIcon+'</button>'+
    backToStyleBtn+
    settingsBtn+
    '<button class="btnIconDanger" type="button" onclick="doDelete()" title="Verwijder" aria-label="Verwijder"><svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12h10l1-12"/><path d="M9 7V4h6v3"/></svg></button>'+
    '<button class="btn" id="saveBtn" onclick="saveSet()">Opslaan</button>'+
  '</div>';
  g('mc').innerHTML='<div class="clHead">'+headTitle+headActions+'</div><div class="clBody" id="pw"></div>';
  updateEditorHeaderTheme();
  renderClPanel();
  afterRender();
}

function afterRender(){
  var id=S.clTab;
  if(id==='opmaken'||id==='inst')setTimeout(loadCardPreviews,80);
  if(id==='opmaken'){setTimeout(renderBgPreview,80);setTimeout(updateStijlPreview,120);}
}
function switchMode(){goChecklist();}
function wizJump(i){collectCurrent();S.wizStep=i;renderEditor();}
function wizNext(){collectCurrent();S.wizStep=Math.min(S.wizStep+1,STEPS.length-1);renderEditor();}
function wizBack(){collectCurrent();S.wizStep=Math.max(S.wizStep-1,0);renderEditor();}
function switchTab(id){
  collectCurrent();
  if(id==='inst'){
    S.prevMainTab=(S.clTab&&S.clTab!=='inst')?S.clTab:(S.prevMainTab||'opmaken');
  }
  S.clTab=id;
  // Update tab visual state without full re-render
  document.querySelectorAll('.clTab').forEach(function(tab){
    var tid=tab.dataset.tabid;
    var isActive=tid===id;
    var done=stepDone(tid);
    tab.classList.toggle('active',isActive);
    var dot=tab.querySelector('.clDot');
    if(dot)dot.style.background=done?'var(--gn)':'var(--am)';
  });
  refreshChecklistChrome();
  renderClPanel();
  updateEditorHeaderTheme();
  afterRender();
}
function renderClPanel(){
  var pw=g('pw');if(!pw)return;
  var step=STEPS.find(function(s){return s.id===S.clTab;});
  pw.innerHTML='';
  var b=document.createElement('div');pw.appendChild(b);
  if(step)step.fn(b);
}
function stepDone(id){
  if(id==='opmaken'){
    return cardsStepDoneForState(S.activeId,(S.d&&S.d.meta)||{}) &&
      (Object.values(S.d.questions||{}).some(function(a){return Array.isArray(a)&&a.length>0;})||!(S.d.meta&&S.d.meta.themes&&S.d.meta.themes.length)) &&
      !!(S.d.uitleg&&S.d.uitleg.cover);
  }
  return true;
}
function buildClWidget(){
  var items=[
    {id:'kaart',label:'Kaart',done:cardsStepDoneForState(S.activeId,(S.d&&S.d.meta)||{})},
    {id:'vragen',label:'Vragen',done:Object.values(S.d.questions||{}).some(function(a){return Array.isArray(a)&&a.length>0;})||!(S.d.meta&&S.d.meta.themes&&S.d.meta.themes.length)},
    {id:'info',label:'Infosheet',done:!!(S.d.uitleg&&S.d.uitleg.cover)},
    {id:'inst',label:'Instellingen',done:true}
  ];
  var n=items.filter(function(x){return x.done;}).length,pct=Math.round(n/items.length*100);
  var missing=items.filter(function(item){return !item.done;});
  var title=pct===100?'Alle stappen ingevuld':(missing.length+' open');
  var msg=pct===100
    ? '<span class="clMsg done">✓ Alles ingevuld</span>'
    : '<span class="clMsg">'+missing.length+' open</span>';
  return '<div class="clW">'+
    '<div class="clMeta"><h4>Voortgang</h4><span class="clCount">'+n+'/'+items.length+'</span></div>'+
    '<div class="clGrow"><div class="pBar"><div class="pFill" style="width:'+pct+'%"></div></div>'+msg+'</div>'+
  '</div>';
}
function buildClNav(){
  var idx=STEPS.findIndex(function(s){return s.id===S.clTab;});
  if(idx<0)idx=0;
  var prev=STEPS[idx-1]||null;
  var next=STEPS[idx+1]||null;
  var meta='Stap '+(idx+1)+' van '+STEPS.length;
  return '<div class="clNavMeta">'+meta+'</div>'+
    '<div class="clNavBtns">'+
      (prev?'<button class="btnS" type="button" onclick="switchTab(\''+prev.id+'\')">← '+esc(prev.label)+'</button>':'<span></span>')+
      (next?'<button class="btn" type="button" onclick="switchTab(\''+next.id+'\')">'+esc(next.label)+' →</button>':'<button class="btn" type="button" onclick="saveSet()">Opslaan</button>')+
    '</div>';
}
function refreshChecklistChrome(){
  var wrap=g('clStatusWrap');
  if(wrap)wrap.innerHTML=buildClWidget();
  var nav=g('clNavWrap');
  if(nav)nav.innerHTML=buildClNav();
  document.querySelectorAll('.clTab').forEach(function(tab){
    var tid=tab.dataset.tabid;
    var isActive=tid===S.clTab;
    var done=stepDone(tid);
    var step=STEPS.find(function(item){return item.id===tid;});
    var label=step?step.label:tid;
    tab.classList.toggle('active',isActive);
    tab.title=(done?label+' afgerond':label+' nog open');
    var dot=tab.querySelector('.clDot');
    if(dot)dot.style.background=done?'var(--gn)':'var(--am)';
  });
}
function buildStijlPreserveBg(target){
  var oldCanvas=g('bgCanvas');
  var savedW=oldCanvas?oldCanvas.width:0,savedH=oldCanvas?oldCanvas.height:0;
  var savedSW=oldCanvas?oldCanvas.style.width:'',savedSH=oldCanvas?oldCanvas.style.height:'';
  var offCopy=null;
  if(oldCanvas&&savedW>0&&savedH>0){
    try{offCopy=document.createElement('canvas');offCopy.width=savedW;offCopy.height=savedH;offCopy.getContext('2d').drawImage(oldCanvas,0,0);}catch(e){offCopy=null;}
  }
  buildStijl(target);
  if(offCopy){
    var newCanvas=g('bgCanvas');
    if(newCanvas&&newCanvas!==oldCanvas){
      newCanvas.width=savedW;newCanvas.height=savedH;
      newCanvas.style.width=savedSW;newCanvas.style.height=savedSH;
      newCanvas.getContext('2d').drawImage(offCopy,0,0);
    }
  }
  scheduleBg();
}
function setOpmakenPane(pane){
  S.opmPane=(pane==='info')?'info':'vragen';
  var meta=S.d&&S.d.meta||{};
  if(S.opmPane==='vragen'){
    var qOpts=stylePreviewOptions(meta);
    var qKeys=qOpts.map(function(opt){return opt.key;});
    if(qKeys.indexOf(STYLE_PREVIEW_KEY)<0){
      var firstTheme=qOpts.find(function(opt){return opt.key!=='cover'&&opt.key!=='algemeen';});
      STYLE_PREVIEW_KEY=(firstTheme||qOpts[0]||{}).key||'cover';
    }
  }else{
    var iOpts=infoSlideOptions(meta).filter(function(opt){return !opt.excluded;});
    var iKeys=iOpts.map(function(opt){return opt.key;});
    if(iKeys.indexOf(INFO_SLIDE_KEY)<0)INFO_SLIDE_KEY=(iOpts[0]||{}).key||'cover';
  }
  if(S.clTab==='opmaken'){
    buildStijlPreserveBg(g('pw'));
    updateEditorHeaderTheme();
    setTimeout(loadCardPreviews,50);
  }
}
function opmakenPaneTabsHtml(active){
  var panes=[
    {id:'vragen', label:'Vragen',     desc:'Kaartinhoud'},
    {id:'info',   label:'Infosheet',  desc:'Uitleg per thema'}
  ];
  return '<div class="paneModeSwitcher">'+panes.map(function(item){
    return '<button class="paneMode'+(active===item.id?' sel':'')+'" type="button" onclick="setOpmakenPane(\''+item.id+'\')">'
      +'<span class="paneModeLabel">'+esc(item.label)+'</span>'
      +'</button>';
  }).join('')+'</div>';
}
function setInfoSlideFocus(idx){
  var slides=ensureIntroSlides();
  if(!slides.length)return;
  S.infoSlideIdx=Math.max(0,Math.min(slides.length-1,parseInt(idx,10)||0));
  if(S.clTab==='opmaken'&&S.opmPane==='info')buildStijlPreserveBg(g('pw'));
}
function deleteInfoCustomPage(key){
  var meta=S.d.meta||{};
  meta.infoPages=(meta.infoPages||[]).filter(function(p){return p.key!==key;});
  meta.infoExcluded=(meta.infoExcluded||[]).filter(function(k){return k!==key;});
  if(S.d.uitleg)delete S.d.uitleg[key];
  markDirty();
  if(INFO_SLIDE_KEY===key){
    var opts=infoSlideOptions(meta).filter(function(o){return !o.excluded;});
    INFO_SLIDE_KEY=(opts[0]||{}).key||'cover';
  }
  buildStijlPreserveBg(g('pw'));
}
function updateInfoCustomPageLabel(key,val){
  var meta=S.d.meta||{};
  var page=(meta.infoPages||[]).find(function(p){return p.key===key;});
  if(page){
    page.label=val;
    markDirty();
    Array.prototype.slice.call(document.querySelectorAll('.infoSlideCard')).forEach(function(card){
      if(card.dataset.infoKey!==key)return;
      var labelEl=card.querySelector('.stijlSlideNameLabel');
      if(labelEl)labelEl.textContent=val||'Pagina';
      var inputEl=card.querySelector('.stijlSlideNameInput');
      if(inputEl&&document.activeElement!==inputEl)inputEl.value=val||'';
    });
    if(INFO_SLIDE_KEY===key)updateEditorHeaderTheme();
  }
}
function includeAllInfoThemes(){
  var meta=S.d.meta||{};
  meta.infoExcluded=[];
  markDirty();
  buildStijlPreserveBg(g('pw'));
}
function excludeAllInfoThemes(){
  var meta=S.d.meta||{};
  var themes=meta.themes||[];
  var infoPages=meta.infoPages||[];
  // Exclude all themes + custom pages (cover stays; can be toggled separately)
  meta.infoExcluded=themes.map(function(t){return t.key;}).concat(infoPages.map(function(p){return p.key;}));
  markDirty();
  INFO_SLIDE_KEY='cover';
  buildStijlPreserveBg(g('pw'));
}
function addInfoCustomPage(){
  S.d.meta=S.d.meta||{};
  S.d.meta.infoPages=S.d.meta.infoPages||[];
  var n=S.d.meta.infoPages.length+1;
  var key='custom_p'+n+'_'+(Date.now()%10000);
  S.d.meta.infoPages.push({key:key,label:'Pagina '+n});
  S.d.uitleg=S.d.uitleg||{};
  S.d.uitleg[key]='';
  markDirty();
  INFO_SLIDE_KEY=key;
  buildStijlPreserveBg(g('pw'));
}
function fillAllThemeInfo(){
  var themes=S.d.meta.themes||[];
  S.d.uitleg=S.d.uitleg||{};
  themes.forEach(function(thm){
    if(!String(S.d.uitleg[thm.key]||'').trim()){
      S.d.uitleg[thm.key]=thm.label||thm.key;
    }
  });
  markDirty();
  var sp=g('stijlSidePaneBody');
  if(sp)buildInfoPane(sp);
  buildStijlPreserveBg(g('pw'));
}
function infoMidTitleText(key){
  if(!key||key==='cover')return '';
  var meta=S.d.meta||{};
  var themes=meta.themes||[];
  var th=themes.find(function(t){return t.key===key;});
  var pages=meta.infoPages||[];
  var cp=!th?pages.find(function(p){return p.key===key;}):null;
  if(!th&&!cp)return '';
  var ui=meta.ui=meta.ui||{};
  var titles=ui.infoMidTitles=ui.infoMidTitles||{};
  var base=String((th?th.label:cp.label)||(th?th.key:cp.key)||'');
  if(Object.prototype.hasOwnProperty.call(titles,key)){
    var custom=String(titles[key]||'').trim();
    return custom||base;
  }
  return base;
}
function syncInfoMidTitleEls(key){
  var txt=infoMidTitleText(key);
  document.querySelectorAll('.infoSlideMidTitle[data-info-mid-title-key="'+key+'"]').forEach(function(el){
    if(document.activeElement!==el)el.textContent=txt;
    el.style.display=txt?'block':'none';
  });
}
function setInfoMidTitleText(key,val){
  if(!key||key==='cover')return;
  var meta=S.d.meta||{};
  var themes=meta.themes||[];
  var th=themes.find(function(t){return t.key===key;});
  var pages=meta.infoPages||[];
  var cp=!th?pages.find(function(p){return p.key===key;}):null;
  if(!th&&!cp)return;
  var ui=meta.ui=meta.ui||{};
  var titles=ui.infoMidTitles=ui.infoMidTitles||{};
  var txt=String(val||'');
  var base=String((th?th.label:cp.label)||(th?th.key:cp.key)||'');
  if(txt===base)delete titles[key];
  else titles[key]=txt;
  markDirty();
  syncInfoMidTitleEls(key);
}
function infoMidTitleInput(el){
  if(!el)return;
  var key=el.dataset.infoMidTitleKey||'';
  setInfoMidTitleText(key,el.textContent||'');
}
function syncInfoPreviewExtent(){
  var needsBgRerender=false;
  document.querySelectorAll('.infoPreviewSingle').forEach(function(wrap){
    var slide=wrap.querySelector('.adminInfoSlide');
    var text=wrap.querySelector('.adminInfoSlideText');
    if(!slide||!text)return;
    var measured=Math.ceil(text.offsetHeight||0);
    var baseline=Number(wrap.dataset.infoBaseHeight||0);
    if(!baseline||baseline<1){
      baseline=measured;
      wrap.dataset.infoBaseHeight=String(baseline);
    }
    var extra=Math.max(0,measured-baseline);
    wrap.style.setProperty('--info-preview-extra',extra+'px');
    slide.style.setProperty('--info-preview-extra',extra+'px');
    var win=wrap.closest('.stijlCanvasWindow.info-preview');
    if(win)win.style.setProperty('--info-preview-extra',extra+'px');
    var stage=wrap.closest('.stijlCanvasStage.info-preview-stage');
    if(stage)stage.style.setProperty('--info-preview-extra',extra+'px');
    var inner=wrap.closest('.stijlCanvasWindowInner');
    if(inner)inner.style.setProperty('--info-preview-extra',extra+'px');
    needsBgRerender=true;
  });
  if(needsBgRerender)requestAnimationFrame(renderBgPreview);
}
function buildInfoPane(target){
  var key=INFO_SLIDE_KEY||'cover';
  var themes=S.d.meta.themes||[];
  var infoPages=S.d.meta.infoPages||[];
  var u=S.d.uitleg||{};
  var isCover=key==='cover';
  var th=isCover?null:themes.find(function(t){return t.key===key;});
  var cp=(!isCover&&!th)?infoPages.find(function(p){return p.key===key;}):null;
  var label=isCover?'Cover':(th?esc(th.label||th.key):(cp?esc(cp.label||cp.key):''));
  var emptyHint='<p class="infoFieldHint">Laat leeg als je geen infopagina voor je kaartenset wilt.</p>';
  var fieldHtml='';
  if(isCover){
    fieldHtml=buildRichTextarea('u_cover',u.cover||'',9,'Omschrijf de set — doel, gebruik, context')+emptyHint;
  }else if(th){
    fieldHtml=buildRichTextarea('u_'+th.key,u[th.key]||'',9,'Toelichting bij '+(th.label||th.key))+emptyHint;
  }else if(cp){
    fieldHtml=buildRichTextarea('u_'+cp.key,u[cp.key]||'',9,'Tekst voor '+(cp.label||cp.key))+emptyHint;
  }else{
    fieldHtml='<p class="emptyHint">Kies een kaart in de slider hierboven.</p>';
  }
  if(th||cp){
    fieldHtml+='<hr class="sep">'+
      fR('Titel op kaart','text','info_mid_title',infoMidTitleText((th||cp).key),'Leeg laten om de titel te verbergen');
  }
  target.innerHTML=
    '<div class="infoTopBar">'+(label?'<span class="fLbl">'+label+'</span>':'')+'</div>'+
    '<div class="infoContent">'+fieldHtml+'</div>';
  function wireRichCe(el,storeKey){
    if(!el)return;
    el.oninput=function(){
      S.d.uitleg=S.d.uitleg||{};S.d.uitleg[storeKey]=htmlToMd(this.innerHTML);markDirty();
      document.querySelectorAll('.infoRichCe[data-rich-key="'+storeKey+'"]').forEach(function(previewEl){
        if(document.activeElement!==previewEl)previewEl.innerHTML=el.innerHTML;
      });
      syncInfoPreviewExtent();
    };
    // keyboard shortcuts handled globally; focus tracking also global
  }
  wireRichCe(g('u_cover'),'cover');
  themes.forEach(function(thm){wireRichCe(g('u_'+thm.key),thm.key);});
  infoPages.forEach(function(p){wireRichCe(g('u_'+p.key),p.key);});
  if(th||cp){
    var mt=g('info_mid_title');
    if(mt)mt.oninput=function(){setInfoMidTitleText((th||cp).key,this.value);};
  }
  setTimeout(syncInfoPreviewExtent,0);
}

function focusOpmakenSideContent(){
  if(S.opmPane==='vragen'){
    var key=STYLE_PREVIEW_KEY||'cover';
    var target=(key==='cover')?g('vraag-sec-algemeen'):g('vraag-sec-'+key);
    if(target)target.scrollIntoView({block:'nearest'});
    return;
  }
  var slideEl=document.querySelector('.infoSlideCard.sel');
  if(slideEl)slideEl.scrollIntoView({block:'nearest'});
}

// ═══════════════════════════════════════════
// COLLECT CURRENT
// ═══════════════════════════════════════════
function collectCurrent(){
  var id=S.clTab;
  if(id==='opmaken'&&S.opmPane==='info'){
    var uc=g('u_cover');if(uc)S.d.uitleg.cover=uc.value;
    (S.d.meta.themes||[]).forEach(function(th){var i2=g('u_'+th.key);if(i2)S.d.uitleg[th.key]=i2.value;});
  }
}

// ═══════════════════════════════════════════
// STEP: BASIS
// ═══════════════════════════════════════════
function buildBasis(target){
  var m=S.d.meta||{};
  var themes=m.themes||[];
  var rows=themes.map(function(th,i){
    return '<div class="thRow" draggable="true" data-i="'+i+'" id="thr'+i+'">'+
      '<span class="thHandle" ondragstart="event.stopPropagation()">⠿</span>'+
      '<input class="thLb" type="text" value="'+esc(th.label||th.key||'')+'" placeholder="Naam van dit thema" oninput="updThLabel('+i+',this.value)">'+
      '<button class="bs rd" data-action="delth" data-i="'+i+'">✕</button></div>';
  }).join('');
  target.innerHTML='<div class="panel">'+
    fR('Naam van de set','text','b_title',m.title||'','bijv. "Samen onderzoeken"')+
    '<hr class="sep">'+
    '<div class="sLbl" style="margin-top:0">Thema\'s <span style="font-weight:400;color:var(--k3);font-size:11px">(optioneel)</span></div>'+
    '<p style="font-size:12px;color:var(--k2);margin-bottom:10px;line-height:1.6">Groepeer je kaarten in thema\'s. Heb je maar één kaartenset? Dan hoef je geen thema\'s toe te voegen.</p>'+
    '<div class="thList" id="thList">'+rows+'</div>'+
    '<button class="bs tl" onclick="addTh()" style="margin-top:9px">+ Thema toevoegen</button>'+
    '</div>';
  g('b_title').oninput=function(){S.d.meta.title=this.value;markDirty();};
  initThDrag();
}
function setCV(k,v){S.d.meta.cssVars=S.d.meta.cssVars||{};S.d.meta.cssVars[k]=v;markDirty();}

// ═══════════════════════════════════════════
// STEP: THEMA'S
// ═══════════════════════════════════════════
function buildThemas(target){
  var themes=S.d.meta.themes||[];
  var rows=themes.map(function(th,i){
    return '<div class="thRow" draggable="true" data-i="'+i+'" id="thr'+i+'">'+
      '<span class="thHandle" ondragstart="event.stopPropagation()">⠿</span>'+
      '<input class="thLb" type="text" value="'+esc(th.label||th.key||'')+'" placeholder="Naam van dit thema" oninput="updThLabel('+i+',this.value)">'+
      '<button class="bs rd" data-action="delth" data-i="'+i+'">✕</button></div>';
  }).join('');
  target.innerHTML='<div class="panel">'+
    '<p style="font-size:12.5px;color:var(--k2);margin-bottom:12px;line-height:1.6">Geef je set thema\'s als je meerdere kaarten wilt groeperen. Heb je maar één kaartenset? Dan hoef je geen thema\'s toe te voegen.</p>'+
    '<div class="thList" id="thList">'+rows+'</div>'+
    '<button class="bs tl" onclick="addTh()" style="margin-top:9px">+ Thema toevoegen</button></div>';
  initThDrag();
}
function updThLabel(i,v){
  if(!S.d.meta.themes[i])return;
  S.d.meta.themes[i].label=v;
  // auto-key: slugify label
  var key=v.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'')||'thema-'+(i+1);
  S.d.meta.themes[i].key=key;
  markDirty();
}
function addTh(){
  S.d.meta.themes=S.d.meta.themes||[];
  var idx=S.d.meta.themes.length+1;
  var key='thema-'+idx;
  S.d.meta.themes.push({key:key,label:'',card:key+'.svg'});
  markDirty();
  rebuildThemas();
}
function delTh(i){S.d.meta.themes.splice(i,1);markDirty();rebuildThemas();}
function updTh(i,f,v){if(S.d.meta.themes[i])S.d.meta.themes[i][f]=v;markDirty();}
function rebuildThemas(){var pw=g('pw');if(pw)renderClPanel();}
function initThDrag(){
  var list=g('thList');if(!list)return;
  list.querySelectorAll('.thRow').forEach(function(row){
    row.addEventListener('dragstart',function(e){dragSrc=this;this.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',this.dataset.i);});
    row.addEventListener('dragend',function(){this.classList.remove('dragging');list.querySelectorAll('.thRow').forEach(function(r){r.classList.remove('dragover');});});
    row.addEventListener('dragover',function(e){e.preventDefault();this.classList.add('dragover');});
    row.addEventListener('dragleave',function(){this.classList.remove('dragover');});
    row.addEventListener('drop',function(e){e.preventDefault();this.classList.remove('dragover');var from=parseInt(e.dataTransfer.getData('text/plain'),10),to=parseInt(this.dataset.i,10);if(from===to)return;var arr=S.d.meta.themes,item=arr.splice(from,1)[0];arr.splice(to,0,item);markDirty();rebuildThemas();});
  });
}

// ═══════════════════════════════════════════
// STEP: KAARTEN
// ═══════════════════════════════════════════
function buildKaarten(target){
  var themes=S.d.meta.themes||[],id=S.activeId;
  SELECTED_LIB_PATH='';
  ACTIVE_TARGET_PATH='';
  var targetCards=[{
    label:'Cover',
    sub:'De voorkant van de set',
    path:cardAssetPathForSet(id,'voorkant.svg'),
    ic:true,
    modeKey:'cover',
    mode:cardBuildModeForKey(S.d.meta,'cover')
  }];
  if(themes.length){
    themes.forEach(function(t,i){
      targetCards.push({
        label:t.label||t.key,
        sub:'Kaartbeeld voor dit thema',
        path:cardAssetPathForSet(id,(t.card||(t.key+'.svg'))),
        ti:i,
        modeKey:t.key,
        mode:cardBuildModeForKey(S.d.meta,t.key)
      });
    });
  } else {
    targetCards.push({
      label:'Kaartafbeelding',
      sub:'Algemene kaartachtergrond voor de set',
      path:cardAssetPathForSet(id,'kaart.svg'),
      ti:-1,
      modeKey:'algemeen',
      mode:cardBuildModeForKey(S.d.meta,'algemeen')
    });
  }
  var hero=
    '<div class="kuHero">'+
      '<div class="kuDrop" id="kUploadZone">'+
        '<div class="kuDropIcon"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.4"/><path d="M4 16l4.5-4.5 3.2 3.2 2.6-2.6L20 17"/></svg></div>'+
        '<div class="kuDropText">'+
          '<div class="kuDropTitle" id="kUploadTitle">Sleep je afbeeldingen voor de kaartenset hierheen</div>'+
          '<div class="kuDropSub" id="kUploadSub">Of <label class="kuFileLink" style="pointer-events:all;cursor:pointer">kies je bestanden'+
            '<input type="file" accept=".svg,.png,image/svg+xml,image/png" id="looseFileIn" multiple style="display:none" onchange="uploadLooseFile(this,\'cards\')">'+
          '</label></div>'+
          '<div class="kuDropHint">SVG werkt het mooist. De editor bewaart kaartbeelden centraal in <code>cards/</code>; dit formaat gebruikt nu '+esc(cardFormatDimensionsText(S.d.meta))+' in verhouding '+esc(cardFormatRatioText(S.d.meta))+'.</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  var library=
    '<div class="kuLibrary">'+
      '<div class="kuLibraryTitle">Bestandenbibliotheek</div>'+
      '<div class="kuUploadRail" id="libGrid"><div class="kuUploadRailEmpty" id="libEmpty">Nog geen bestanden</div></div>'+
    '</div>';
  var targets=
    '<div class="kuPanel">'+
      '<div class="kuPanelHead">'+
        '<div>'+
          '<div class="kuPanelTitle">Kaartafbeeldingen</div>'+
        '</div>'+
      '</div>'+
      '<div class="kuTargetListGrid">'+
        targetCards.map(function(card){return buildCTile(card,'cards',card.path);}).join('')+
      '</div>'+
    '</div>';

  target.innerHTML='<div class="panel"><div class="kuShell">'+hero+library+'<div class="kuStack">'+targets+'</div></div></div>';
  initUploadZoneDrag(id);
  refreshLibGrid(id);
  paintActiveTarget();
}

function initUploadZoneDrag(id){
  var zone=g('kUploadZone');if(!zone)return;
  var dragDepth=0;
  var titleEl=g('kUploadTitle');
  var subEl=g('kUploadSub');
  var defaultTitle='Sleep je afbeeldingen voor de kaartenset hierheen';
  var defaultSub='Of <label class="kuFileLink" style="pointer-events:all;cursor:pointer">kies je bestanden'+
    '<input type="file" accept=".svg,.png,image/svg+xml,image/png" id="looseFileIn" multiple style="display:none" onchange="uploadLooseFile(this,\'cards\')">'+
  '</label>';
  function setUploadCopy(count){
    if(!titleEl||!subEl)return;
    if(count>0){
      titleEl.textContent=(count===1?'1 afbeelding klaar om te uploaden':count+' afbeeldingen klaar om te uploaden');
      subEl.textContent='Laat los om ze aan deze kaartenset toe te voegen';
      return;
    }
    titleEl.textContent=defaultTitle;
    subEl.innerHTML=defaultSub;
  }
  setUploadCopy(0);
  // Click on zone (not the button) → trigger file input
  zone.addEventListener('click',function(e){
    if(e.target.closest('label'))return; // already handled by label
    var fi=g('looseFileIn');if(fi)fi.click();
  });
  zone.addEventListener('dragenter',function(e){
    e.preventDefault();
    dragDepth+=1;
    this.classList.add('dragover');
    var count=(e.dataTransfer&&((e.dataTransfer.items&&e.dataTransfer.items.length)||e.dataTransfer.files&&e.dataTransfer.files.length))||0;
    setUploadCopy(count);
  });
  zone.addEventListener('dragover',function(e){
    e.preventDefault();
    this.classList.add('dragover');
    var count=(e.dataTransfer&&((e.dataTransfer.items&&e.dataTransfer.items.length)||e.dataTransfer.files&&e.dataTransfer.files.length))||0;
    setUploadCopy(count);
  });
  zone.addEventListener('dragleave',function(e){
    e.preventDefault();
    dragDepth=Math.max(0,dragDepth-1);
    if(!dragDepth){
      this.classList.remove('dragover');
      setUploadCopy(0);
    }
  });
  zone.addEventListener('drop',function(e){
    e.preventDefault();
    dragDepth=0;
    this.classList.remove('dragover');
    setUploadCopy(0);
    queueLooseUploads(e.dataTransfer.files,'cards');
  });
}

function refreshLibGrid(id){
  var fp='sets/'+id+'/'+cardEditorSourceFolder();
  var grid=g('libGrid');
  if(!grid)return; // Not on kaarten tab, skip silently
  var refreshToken=++LIB_REFRESH_TOKEN;
  grid.innerHTML='';
  var linked=new Set((S.d.meta.themes||[]).map(function(t){return t.card||(t.key+'.svg');}));
  linked.add('voorkant.svg');

  function addLibItem(fname,sha,dataUrl){
    if(!fname)return;
    var path=fp+'/'+fname;
    var exists=Array.from(grid.querySelectorAll('.kuAsset')).some(function(item){return item.dataset.path===path;});
    if(exists)return;
    if(!CC[path])CC[path]={};
    if(sha&&!CC[path].sha)CC[path].sha=sha;
    if(dataUrl&&!CC[path].dataUrl)CC[path].dataUrl=dataUrl;
    var isLinked=linked.has(fname);
    var el=document.createElement('div');
    el.className='kuAsset'+(isLinked?' is-linked':'');
    el.dataset.fname=fname;el.dataset.path=path;
    el.draggable=true;
    el.innerHTML=
      '<div class="kuAssetThumb">'+
        (CC[path].dataUrl
          ?'<img src="'+CC[path].dataUrl+'" draggable="false">'
          :'<span class="spinner" style="width:12px;height:12px;border-width:1.5px;border-color:rgba(0,0,0,.1);border-top-color:var(--tl)"></span>')+
      '</div>'+
      '<div class="kuAssetMeta">'+
        '<div class="kuAssetName">'+esc(fname)+'</div>'+
        '<div class="kuAssetHint">'+(isLinked?'In gebruik':'Klik om te koppelen')+'</div>'+
      '</div>'+
      '<button class="kuAssetRemove" data-action="dellib" data-path="'+esc(path)+'" title="Verwijder">✕</button>';

    el.addEventListener('click',function(e){
      if(e.target.closest('[data-action="dellib"]'))return;
      setSelectedLibraryPath(path);
    });
    el.addEventListener('dragstart',function(e){
      setSelectedLibraryPath(path);
      e.dataTransfer.setData('text/plain',fname);
      e.dataTransfer.setData('libpath',path);
      e.dataTransfer.effectAllowed='move';
    });

    grid.appendChild(el);

    if(!CC[path].dataUrl&&CC[path].sha){
      api('/contents/'+path).then(function(res){
        var isSvg=/\.svg$/i.test(fname);
        var du=isSvg?'data:image/svg+xml;base64,'+btoa(encode(atob(res.content.replace(/\s/g,'')))):'data:image/png;base64,'+res.content.replace(/\s/g,'');
        CC[path]={sha:res.sha,dataUrl:du};
        var th=el.querySelector('.kuAssetThumb');
        if(th){th.innerHTML='<img src="'+du+'" draggable="false">';}
      }).catch(function(){});
    }
  }

  Object.keys(CC).forEach(function(p){
    if(p.indexOf(fp+'/')===0){var fn=p.slice(fp.length+1);if(fn&&fn.indexOf('/')===-1)addLibItem(fn,CC[p].sha,CC[p].dataUrl);}
  });
  listFolder(fp).then(function(files){
    if(refreshToken!==LIB_REFRESH_TOKEN)return;
    files.forEach(function(f){addLibItem(f.name,f.sha,null);});
    updateLibCount();
    paintLibrarySelection();
  });
}

function updateLibCount(){
  var grid=g('libGrid');var c=g('kLibCount');var empty=g('libEmpty');
  if(grid&&c){
    var n=grid.querySelectorAll('.kuAsset').length;
    c.textContent=n;
    if(!n){
      if(!empty){
        empty=document.createElement('div');
        empty.className='kuUploadRailEmpty';
        empty.id='libEmpty';
        empty.textContent='Nog geen bestanden';
      }
      if(!empty.parentNode)grid.appendChild(empty);
      empty.style.display='';
    }else if(empty){
      empty.style.display='none';
    }
  }
}
function setSelectedLibraryPath(path){
  SELECTED_LIB_PATH=(SELECTED_LIB_PATH===path?'':path);
  paintLibrarySelection();
}
function paintLibrarySelection(){
  var grid=g('libGrid');if(!grid)return;
  grid.querySelectorAll('.kuAsset').forEach(function(el){
    el.classList.toggle('is-selected',el.dataset.path===SELECTED_LIB_PATH);
  });
}
function setActiveTargetPath(path){
  ACTIVE_TARGET_PATH=(ACTIVE_TARGET_PATH===path?'':path);
  paintActiveTarget();
}
function paintActiveTarget(){
  document.querySelectorAll('.kuTarget').forEach(function(el){
    el.classList.toggle('is-active',el.dataset.path===ACTIVE_TARGET_PATH);
  });
}
function assignLibraryPathToTile(tile,path){
  if(!tile||!path)return;
  var fname=path.split('/').pop();
  var ti=tile.dataset.ti!==undefined&&tile.dataset.ti!==''?parseInt(tile.dataset.ti,10):-1;
  var isCover=tile.dataset.ic==='1';
  if(isCover){
    moveLibraryFileToTarget(path,cardAssetPathForSet(S.activeId,'voorkant.svg'),'Cover bijgewerkt');
  } else if(ti<0){
    moveLibraryFileToTarget(path,cardAssetPathForSet(S.activeId,'kaart.svg'),'Kaartafbeelding ingesteld');
  } else {
    assignToTheme(ti,fname);
  }
  setCardBuildModeForPath(tile.dataset.path||'', 'image');
  SELECTED_LIB_PATH='';
  paintLibrarySelection();
}
function ensureAssetData(path){
  if(CC[path]&&CC[path].dataUrl)return Promise.resolve(CC[path]);
  return api('/contents/'+path).then(function(res){
    var isSvg=/\.svg$/i.test(path);
    var dataUrl=isSvg
      ? 'data:image/svg+xml;base64,'+btoa(encode(atob(String(res.content||'').replace(/\s/g,''))))
      : 'data:image/png;base64,'+String(res.content||'').replace(/\s/g,'');
    CC[path]={sha:res.sha,dataUrl:dataUrl};
    return CC[path];
  });
}
function moveLibraryFileToTarget(srcPath,destPath,successMsg){
  if(!srcPath||!destPath)return;
  if(srcPath===destPath){toast(successMsg||'Bijgewerkt','green');return;}
  ensureAssetData(srcPath).then(function(asset){
    var body={message:'Move asset: '+destPath.split('/').pop(),content:(asset.dataUrl.split(',')[1]||'')};
    return ensureSha(destPath).then(function(destSha){
      if(destSha)body.sha=destSha;
      return api('/contents/'+destPath,'PUT',body);
    }).then(function(res){
      CC[destPath]={sha:(res.content||{}).sha,dataUrl:asset.dataUrl,cropSource:asset.cropSource||asset.dataUrl,cropState:asset.cropState||null};
      return deleteGhFile(srcPath,'Remove moved source: '+srcPath).catch(function(err){
        if(err&&String(err.message||'').indexOf('404')>=0)return null;
        throw err;
      });
    }).then(function(){
      setCardBuildModeForPath(destPath,'image');
      if(CC[srcPath]){delete CC[srcPath].cropSource;delete CC[srcPath].cropState;}
      delete CC[srcPath];
      clearFolderCache(srcPath);
      clearFolderCache(destPath);
      refreshLibGrid(S.activeId);
      refreshAdminPanel();
      setTimeout(loadCardPreviews,50);
      toast(successMsg||'Bijgewerkt','green');
    });
  }).catch(function(err){toast('Fout: '+err.message,'red');});
}

function showLibAssignPopup(fname,path,fromEl){
  var themes=S.d.meta.themes||[],id=S.activeId;
  var ca=CC[path];
  var preview=ca&&ca.dataUrl?'<div style="margin-bottom:10px"><img src="'+ca.dataUrl+'" style="max-width:100%;border-radius:6px;border:1px solid var(--br)"></div>':'';
  var opts=['<button class="bs gh" style="display:flex;align-items:center;width:100%;text-align:left;margin-bottom:4px" onclick="assignCover(\''+esc(path)+'\');closeModal()">Cover</button>'].concat(themes.map(function(t,i){
    var cur=(t.card||t.key+'.svg')===fname;
    return '<button class="bs '+(cur?'tl':'gh')+'" style="display:flex;align-items:center;gap:7px;width:100%;text-align:left;margin-bottom:4px" onclick="assignToTheme('+i+',\''+esc(fname)+'\');closeModal()">'+
      '<span style="flex:1">'+esc(t.label||t.key)+'</span>'+(cur?'<span style="font-size:9.5px">✓ huidig</span>':'')+
      '</button>';
  }));
  if(!themes.length){
    opts.push('<button class="bs gh" style="display:flex;align-items:center;width:100%;text-align:left;margin-bottom:4px" onclick="assignToTheme(-1,\''+esc(fname)+'\');closeModal()">Kaartafbeelding</button>');
  }
  showModal(
    '<p style="font-size:11px;font-weight:600;color:var(--k3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Koppel bestand</p>'+
    preview+
    '<p style="font-size:12px;font-weight:500;margin-bottom:10px">'+esc(fname)+'</p>'+
    opts.join('')+
    '<div class="mAct"><button class="mCa" onclick="closeModal()">Annuleren</button></div>'
  );
}

function wireCardTileDrops(id){
  // Visual droptarget is handled by global dragover/dragleave handlers
  // Actual drop logic is in the global drop handler
  // Nothing needed here anymore - keep for future use
}
function assignToTheme(ti,fname){
  if(ti<0){
    // No themes — assign as generic kaart.svg by copying
    var id=S.activeId;
    var src=cardAssetPathForSet(id,fname);
    var dest=cardAssetPathForSet(id,'kaart.svg');
    var ca=CC[src];
    if(!ca||!ca.dataUrl){toast('Bestand niet geladen','amber');return;}
    var b64=ca.dataUrl.split(',')[1];
    var body={message:'Set kaart: kaart.svg',content:b64};
    ensureSha(dest).then(function(sha){
      if(sha)body.sha=sha;
      return api('/contents/'+dest,'PUT',body);
    }).then(function(res){
      CC[dest]={sha:(res.content||{}).sha,dataUrl:ca.dataUrl};
      cardBuildStore(S.d.meta||{}).algemeen='image';
      markDirty();
      toast('Kaartafbeelding ingesteld: '+fname,'green');
      var pw=g('pw');if(pw)renderClPanel();
      setTimeout(loadCardPreviews,50);
    }).catch(function(e){toast('Fout: '+e.message,'red');});
    return;
  }
  var t=S.d.meta.themes[ti];if(!t)return;
  t.card=fname;markDirty();
  cardBuildStore(S.d.meta||{})[t.key]='image';
  var pw=g('pw');if(pw)renderClPanel();
  setTimeout(loadCardPreviews,50);toast('Gekoppeld: '+fname,'green');
}
function assignCover(srcPath){
  // Copy file to voorkant.svg (or just reuse same name if already voorkant.svg)
  var id=S.activeId;
  var destPath=cardAssetPathForSet(id,'voorkant.svg');
  if(srcPath===destPath){toast('Al de cover');return;}
  var ca=CC[srcPath];if(!ca||!ca.dataUrl){toast('Bestand niet geladen','amber');return;}
  var b64=ca.dataUrl.split(',')[1];
  var body={message:'Set cover: voorkant.svg',content:b64};
  ensureSha(destPath).then(function(sha){
    if(sha)body.sha=sha;
    return api('/contents/'+destPath,'PUT',body);
  }).then(function(res){
    CC[destPath]={sha:(res.content||{}).sha,dataUrl:ca.dataUrl};
    toast('Cover bijgewerkt','green');
    var pw=g('pw');if(pw)renderClPanel();
    setTimeout(loadCardPreviews,50);
  }).catch(function(e){toast('Fout: '+e.message,'red');});
}
function deleteGhFile(path,message){
  return api('/contents/'+path).then(function(info){
    return api('/contents/'+path,'DELETE',{message:message||('Remove: '+path),sha:info.sha});
  });
}
function toggleThumbAdv(){
  S.thumbsOpen=!S.thumbsOpen;
  var adv=g('thumbAdv'),body=g('thumbBody');
  if(adv)adv.classList.toggle('open',S.thumbsOpen);
  if(body)body.classList.toggle('hidden',!S.thumbsOpen);
}
function uploadLooseFile(input,forcedFolder){
  var files=input.files;if(!files||!files.length){return;}
  var folderName=forcedFolder||(input&&input.dataset&&input.dataset.folder)||(input&&input.closest('[data-folder]')&&input.closest('[data-folder]').dataset.folder)||cardEditorSourceFolder();
  input.value='';
  if(ACTIVE_TARGET_PATH){
    var arr=Array.from(files);
    if(arr[0])uploadFile(arr[0],ACTIVE_TARGET_PATH,safeid(ACTIVE_TARGET_PATH));
    if(arr.length>1)queueLooseUploads(arr.slice(1),folderName);
    return;
  }
  queueLooseUploads(files,folderName);
}
var _uploadQueue=[],_uploadBusy=false;
function queueLooseUploads(fileList,folderName){
  var files=Array.from(fileList||[]).filter(function(file){return !!(file&&/\.(svg|png)$/i.test(file.name||''));});
  if(!files.length){toast('Alleen SVG of PNG','red');return Promise.resolve();}
  files.forEach(function(file){_uploadQueue.push({file:file,folderName:folderName});});
  toast(files.length===1?'1 bestand toegevoegd':(files.length+' bestanden toegevoegd'),'green');
  return pumpUploadQueue();
}
function pumpUploadQueue(){
  if(_uploadBusy)return Promise.resolve();
  var job=_uploadQueue.shift();
  if(!job)return Promise.resolve();
  _uploadBusy=true;
  return Promise.resolve(startLooseUpload(job.file,job.folderName)).catch(function(err){
      toast('Fout: '+((err&&err.message)||'upload mislukt'),'red');
    })
    .then(function(){
      _uploadBusy=false;
      return pumpUploadQueue();
    });
}
var _cropQueue=[];
function enqueueCropJob(job){
  _cropQueue.push(job);
  if(g('cropModal'))return;
  openNextCropJob();
}
function openNextCropJob(){
  if(g('cropModal'))return;
  var next=_cropQueue.shift();
  if(!next)return;
  showCropModal(next.dataUrl,next.path,next.sid,next.isSq,next.meta);
}
function uploadDataUrlToPath(path,dataUrl,message,onDone){
  var b64=(dataUrl.split(',')[1]||'');
  if(!path||!b64){toast('Upload mislukt','red');return Promise.reject(new Error('Missing upload data')); }
  var body={message:message||('Upload: '+path.split('/').pop()),content:b64};
  return ensureSha(path).then(function(sha){
    if(sha)body.sha=sha;
    return api('/contents/'+path,'PUT',body);
  }).then(function(res){
    CC[path]={sha:(res.content||{}).sha,dataUrl:dataUrl};
    clearFolderCache(path);
    if(typeof onDone==='function')onDone(res);
    return res;
  });
}
function refreshAdminPanel(){
  var pw=g('pw');
  if(!pw)return;
  renderClPanel();
}
function startLooseUpload(file,folderName){
  if(!file)return;
  var id=S.activeId,fn=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
  var path='sets/'+id+'/'+folderName+'/'+fn;
  var isPng=/\.png$/i.test(file.name);
  if(isPng){
    return new Promise(function(resolve){
      var reader=new FileReader();
      reader.onload=function(e){
        enqueueCropJob({
          dataUrl:e.target.result,
          path:path,
          sid:safeid(path),
          isSq:false,
          meta:{name:fn,folderName:folderName}
        });
        resolve();
      };
      reader.readAsDataURL(file);
    });
  } else {
    return new Promise(function(resolve,reject){
      var reader2=new FileReader();
      reader2.onload=function(e){
        var raw=e.target.result,b64=btoa(encode(raw));
        var dataUrl='data:image/svg+xml;base64,'+b64;
        uploadDataUrlToPath(path,dataUrl,'Upload: '+fn,function(){
          refreshLibGrid(id);
          refreshAdminPanel();
          setTimeout(loadCardPreviews,80);
        }).then(function(){
          resolve();
        }).catch(function(err){
          reject(err);
        });
      };
      reader2.onerror=reject;
      reader2.readAsText(file);
    });
  }
}
function buildCTile(card,folder,path){
  var sid=safeid(path),cached=(cachedCardAssetForPath(path)||{}).asset||CC[path];
  var hasPreview=!!(cached&&cached.dataUrl);
  var fname=path.split('/').pop();
  var mode=card.mode||'image';
  var tiAttr=(typeof card.ti==='number')?' data-ti="'+card.ti+'"':'';
  var icAttr=card.ic?' data-ic="1"':'';
  var modeKeyAttr=card.modeKey?' data-mode-key="'+esc(card.modeKey)+'"':'';
  var uploadIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v10"/><path d="M8.5 9 12 5.5 15.5 9"/><path d="M7 18.5h10"/></svg>';
  var importIcon='<svg viewBox="0 0 24 24"><rect x="4" y="5" width="7" height="14" rx="1.5"/><rect x="13" y="5" width="7" height="14" rx="1.5"/><path d="M8 9h0"/><path d="M16 9h0"/></svg>';
  var cropIcon='<svg viewBox="0 0 24 24"><path d="M6 3v12a3 3 0 0 0 3 3h12"/><path d="M8 16L16 8"/><path d="M9 8h8v8"/></svg>';
  var deleteIcon='<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12h10l1-12"/><path d="M9 7V4h6v3"/></svg>';
  var toolActions=
      '<div class="kuTargetActions">'+
      '<label class="kuIconBtn" title="Uploaden">'+uploadIcon+'<input class="kuTargetInput" type="file" accept=".svg,.png,image/svg+xml,image/png" multiple data-action="targetupload" data-path="'+esc(path)+'" data-sid="'+sid+'"></label>'+
      (hasPreview?'<button class="kuIconBtn" type="button" data-action="recrop" data-path="'+esc(path)+'" data-sid="'+sid+'" title="Bijsnijden">'+cropIcon+'</button>':'')+
      (hasPreview?'<button class="kuIconBtn danger" type="button" data-action="delfile" data-path="'+esc(path)+'" data-sid="'+sid+'" title="Verwijderen">'+deleteIcon+'</button>':'')+
    '</div>';
  var modeHtml=card.modeKey
    ?'<div class="kuTargetMode">'+
      '<button class="kuModeBtn'+(mode==='image'?' sel':'')+'" type="button" onclick="setCardBuildMode(\''+esc(card.modeKey)+'\',\'image\',event)">Afbeelding</button>'+
      '<button class="kuModeBtn'+(mode==='self'?' sel':'')+'" type="button" onclick="setCardBuildMode(\''+esc(card.modeKey)+'\',\'self\',event)">Zelf opbouwen</button>'+
    '</div>'
    : '';
  var preview=hasPreview
    ?'<div class="kuTargetPreview"><div class="kuTargetCanvas"><img src="'+cached.dataUrl+'" alt="'+esc(card.label)+'"></div></div>'
    :'<div class="kuTargetPreview"><div class="kuTargetCanvas"><div class="kuTargetPlaceholder">'+(mode==='self'?'Bouw deze kaart verder op in Stijl':'Nog geen afbeelding')+'</div></div></div>';
  return '<div class="kuTarget cTile" id="ct-'+sid+'" data-path="'+esc(path)+'" data-sid="'+sid+'"'+tiAttr+icAttr+modeKeyAttr+'>'+
    preview+
    '<div class="kuTargetMeta">'+
      '<div class="kuTargetMetaMain"><div class="kuTargetTitle">'+esc(card.label)+'</div><div class="kuTargetFile">'+esc(fname)+'</div></div>'+
      modeHtml+
      (card.modeKey?'<div class="kuModeHint">'+(mode==='self'?'Geen upload nodig. Werk deze kaart verder uit in Stijl.':'Gebruik een afbeelding of schakel over naar zelf opbouwen.')+'</div>':'')+
      toolActions+
    '</div>'+
  '</div>';
}
function loadCardPreviews(){
  var id=S.activeId,themes=S.d.meta.themes||[];
  var toLoad=stylePreviewCandidates(S.d.meta).reduce(function(list,file){
    cardAssetFolders().forEach(function(folder){
      list.push({f:folder,n:file});
    });
    return list;
  },[]);
  var seen={};
  var pending=0;
  toLoad.filter(function(x){var k=x.f+'/'+x.n;if(seen[k])return false;seen[k]=true;return true;}).forEach(function(item){
    var path='sets/'+id+'/'+item.f+'/'+item.n;if(CC[path])return;
    pending++;
    api('/contents/'+path).then(function(res){
      var isSvg=/\.svg$/i.test(item.n);
      var dataUrl=isSvg?('data:image/svg+xml;base64,'+btoa(encode(atob(res.content.replace(/\s/g,''))))):('data:image/png;base64,'+res.content.replace(/\s/g,''));
      CC[path]={sha:res.sha,dataUrl:dataUrl};
      updateTile(path,dataUrl);
      updateInfoThumb(path,dataUrl);
      // Update Vragen card previews
      themes.forEach(function(t){
        if((t.card||(t.key+'.svg'))===item.n){
          var face=g('cpface-'+t.key);
          if(face){var old2=face.querySelector('.cpBg,.cpBgEmpty');if(old2){var img=document.createElement('img');img.className='cpBg';img.src=dataUrl;img.alt=t.label||t.key;old2.replaceWith(img);}}
        }
      });
      // No-theme fallback: update cpface-algemeen when kaart.svg loads
      if(!themes.length&&item.n==='kaart.svg'){
        var faceA=g('cpface-algemeen');
        if(faceA){var oldA=faceA.querySelector('.cpBg,.cpBgEmpty');if(oldA){var imgA=document.createElement('img');imgA.className='cpBg';imgA.src=dataUrl;imgA.alt='kaart';oldA.replaceWith(imgA);}}
      }
      var activeStylePreview=stylePreviewAsset(S.d.meta);
      if(activeStylePreview.file===item.n){
        var si2=g('stijlCardImg');
        if(si2)si2.src=dataUrl;
        else{
          var prev2=g('stijlCardPrev');
          if(prev2){
            var img2=document.createElement('img');
            img2.id='stijlCardImg';
            img2.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block';
            img2.src=dataUrl;
            prev2.insertBefore(img2,prev2.firstChild);
          }
        }
      }
      pending--;if(pending<=0)lbDone();
    }).catch(function(){pending--;if(pending<=0)lbDone();});
  });
  if(pending>0)lbStart();
}
function updateTile(path,dataUrl){
  var sid=safeid(path),tile=g('ct-'+sid);if(!tile)return;
  var titleEl=tile.querySelector('.kuTargetTitle');
  var card={
    label:titleEl?titleEl.textContent:(path.split('/').pop()||'Afbeelding')
  };
  if(tile.dataset.ti!==undefined&&tile.dataset.ti!=='')card.ti=parseInt(tile.dataset.ti,10);
  if(tile.dataset.ic)card.ic=1;
  if(tile.dataset.modeKey){
    card.modeKey=tile.dataset.modeKey;
    card.mode=cardBuildModeForKey(S.d.meta,tile.dataset.modeKey);
  }
  var wr=document.createElement('div');
  wr.innerHTML=buildCTile(card,'cards',path);
  var next=wr.firstChild;
  if(next&&tile.parentNode){
    tile.parentNode.replaceChild(next,tile);
    return;
  }
  refreshAdminPanel();
}
function appendLooseFiles(id,allCards){
  var fp='sets/'+id+'/cards';
  var known=allCards.map(function(c){return c.cf;});
  var wrap=g('cg-extra-cards');if(!wrap)return;
  wrap.innerHTML='';
  var hdr=null,egrid=null;
  function addExtraTile(fname,sha,dataUrl){
    if(known.indexOf(fname)>=0)return;
    var path=fp+'/'+fname;
    if(g('ct-'+safeid(path)))return;
    if(!CC[path])CC[path]={};
    if(sha&&!CC[path].sha)CC[path].sha=sha;
    if(dataUrl&&!CC[path].dataUrl)CC[path].dataUrl=dataUrl;
    if(!hdr){
      hdr=document.createElement('div');hdr.className='folH';hdr.style.marginTop='14px';hdr.textContent='📁 Overige bestanden in map';
      wrap.appendChild(hdr);
      egrid=document.createElement('div');egrid.className='cGrid';wrap.appendChild(egrid);
    }
    var card={key:safeid(fname),label:fname,cf:fname};
    var wr=document.createElement('div');wr.innerHTML=buildCTile(card,'cards',path);
    var tile=wr.firstChild;if(!tile)return;
    egrid.appendChild(tile);
    if(CC[path].dataUrl)updateTile(path,CC[path].dataUrl);
    else if(CC[path].sha){api('/contents/'+path).then(function(res){
      var isSvg=/\.svg$/i.test(fname);
      var du=isSvg?'data:image/svg+xml;base64,'+btoa(encode(atob(res.content.replace(/\s/g,'')))):'data:image/png;base64,'+res.content.replace(/\s/g,'');
      CC[path]={sha:res.sha,dataUrl:du};updateTile(path,du);
    }).catch(function(){});}
  }
  // Immediate: show files already in CC cache (e.g. just uploaded)
  Object.keys(CC).forEach(function(p){
    if(p.indexOf(fp+'/')===0){var fname=p.slice(fp.length+1);if(fname&&fname.indexOf('/')===-1)addExtraTile(fname,CC[p].sha,CC[p].dataUrl);}
  });
  // Async: also show files on GitHub not yet in cache
  listFolder(fp).then(function(files){files.forEach(function(f){addExtraTile(f.name,f.sha,null);});});
}
function uploadFile(file,path,sid){
  if(!file)return;
  // SVG: upload directly
  var tile=g('ct-'+sid);
  var ld=document.createElement('div');ld.className='cLoading';ld.innerHTML='<span class="spinner" style="border-color:rgba(79,142,158,.3);border-top-color:var(--tl)"></span> Uploaden…';
  if(tile)tile.appendChild(ld);
  var reader2=new FileReader();
  reader2.onload=function(e){
    var raw=e.target.result,b64=btoa(encode(raw));
    var dataUrl='data:image/svg+xml;base64,'+b64;
    var body={message:'Upload: '+path.split('/').pop(),content:b64};
    ensureSha(path).then(function(sha){if(sha)body.sha=sha;return api('/contents/'+path,'PUT',body);}).then(function(res){
      CC[path]={sha:(res.content||{}).sha,dataUrl:dataUrl};
      setCardBuildModeForPath(path,'image');
      clearFolderCache(path);
      if(ld.parentNode)ld.remove();
      refreshLibGrid(S.activeId);
      refreshAdminPanel();
      toast('✓ '+path.split('/').pop(),'green');
      renderSidebar();
    }).catch(function(err){toast('Fout: '+err.message,'red');if(ld.parentNode)ld.remove();});
  };
  reader2.readAsText(file);
}
// ─── CROP MODAL ────────────────────────────────────────────────────────────
var _crop={};
function clampCropPosition(){
  if(!_crop||!_crop.img)return;
  var w=_crop.img.width*_crop.zoom;
  var h=_crop.img.height*_crop.zoom;
  if(w<=_crop.PW){
    _crop.dx=(_crop.PW-w)/2;
  }else{
    var minDx=_crop.PW-w;
    _crop.dx=Math.min(0,Math.max(minDx,_crop.dx));
  }
  if(h<=_crop.PH){
    _crop.dy=(_crop.PH-h)/2;
  }else{
    var minDy=_crop.PH-h;
    _crop.dy=Math.min(0,Math.max(minDy,_crop.dy));
  }
}
function showCropModal(dataUrl,path,sid,isSq,meta){
  // Admin crop must match the real kaarten/index previews exactly.
  var _cf=getCardFormatObj();var AR=_cf.w/_cf.h;
  var PREVIEW_W=380,PREVIEW_H=Math.round(PREVIEW_W/AR);
  var modal=document.createElement('div');modal.className='cropModal';modal.id='cropModal';
  modal.innerHTML='<div class="cropBox">'+
    '<h3>Afbeelding bijsnijden — '+esc(path.split('/').pop())+'</h3>'+
    '<canvas class="cropCanvas" id="cropCanvas" width="'+PREVIEW_W+'" height="'+PREVIEW_H+'"></canvas>'+
    '<div class="cropTools"><button class="cropToolBtn" type="button" onclick="resetCropView()">Reset</button><button class="cropToolBtn" type="button" onclick="centerCropView()">Centreer</button><button class="cropToolBtn" type="button" onclick="fillCropView()">Vul precies</button></div>'+
    '<div class="cropControls"><span>Zoom</span><input type="range" id="cropZoom" min="0.5" max="3" step="0.05" value="1"><span id="cropZoomV">1×</span></div>'+
    '<div style="font-size:11.5px;color:var(--k2);margin-top:4px;line-height:1.5">Sleep om te positioneren. Zoom met de slider of scroll. SVG werkt het mooist. Dit kaartformaat gebruikt nu '+esc(cardFormatDimensionsText(S.d.meta))+' in verhouding '+esc(cardFormatRatioText(S.d.meta))+'.</div>'+
    '<div class="cropAct">'+
      '<button class="btnS" onclick="closeCropModal()">Annuleren</button>'+
      '<button class="btn" onclick="confirmCrop()">Bijsnijden &amp; uploaden</button>'+
    '</div>'+
  '</div>';
  document.body.appendChild(modal);
  _crop={path:path,sid:sid,AR:AR,PW:PREVIEW_W,PH:PREVIEW_H,zoom:1,dx:0,dy:0,img:null,drag:false,lx:0,ly:0,meta:meta||{},sourceDataUrl:(meta&&meta.sourceDataUrl)||dataUrl,minZoom:1,fillHintUntil:0,fillHintArmed:true};
  var img=new Image();
  img.onload=function(){
    _crop.img=img;
    var scaleToFill=Math.max(PREVIEW_W/img.width,PREVIEW_H/img.height);
    _crop.minZoom=scaleToFill;
    var saved=(meta&&meta.cropState)||null;
    if(saved&&saved.imgW===img.width&&saved.imgH===img.height&&saved.PW===PREVIEW_W&&saved.PH===PREVIEW_H){
      _crop.zoom=saved.zoom;
      _crop.dx=saved.dx;
      _crop.dy=saved.dy;
    }else{
      _crop.zoom=scaleToFill;
      _crop.dx=(PREVIEW_W-img.width*scaleToFill)/2;
      _crop.dy=(PREVIEW_H-img.height*scaleToFill)/2;
    }
    clampCropPosition();
    var zEl=g('cropZoom');if(zEl){zEl.min=scaleToFill*0.5;zEl.max=Math.max(scaleToFill*3,3);zEl.value=_crop.zoom;}
    var zv=g('cropZoomV');if(zv)zv.textContent=_crop.zoom.toFixed(2)+'×';
    drawCropCanvas();
  };
  img.src=dataUrl;
  // Zoom slider
  var zs=g('cropZoom');if(zs)zs.oninput=function(){_crop.zoom=parseFloat(this.value)||1;clampCropPosition();updateCropFillHint();g('cropZoomV').textContent=_crop.zoom.toFixed(2)+'×';drawCropCanvas();};
  // Drag
  var cv=g('cropCanvas');
  function getXY(e){var r=cv.getBoundingClientRect(),ts=e.touches;if(ts&&ts[0])return{x:ts[0].clientX-r.left,y:ts[0].clientY-r.top};return{x:e.clientX-r.left,y:e.clientY-r.top};}
  cv.addEventListener('mousedown',function(e){_crop.drag=true;var p=getXY(e);_crop.lx=p.x;_crop.ly=p.y;e.preventDefault();});
  cv.addEventListener('touchstart',function(e){_crop.drag=true;var p=getXY(e);_crop.lx=p.x;_crop.ly=p.y;},{passive:true});
  function onMove(e){if(!_crop.drag)return;var p=getXY(e);_crop.dx+=p.x-_crop.lx;_crop.dy+=p.y-_crop.ly;_crop.lx=p.x;_crop.ly=p.y;clampCropPosition();updateCropFillHint();drawCropCanvas();}
  cv.addEventListener('mousemove',onMove);cv.addEventListener('touchmove',onMove,{passive:true});
  function onUp(){_crop.drag=false;}
  cv.addEventListener('mouseup',onUp);cv.addEventListener('touchend',onUp);
  cv.addEventListener('wheel',function(e){e.preventDefault();var delta=e.deltaY>0?-0.08:0.08;_crop.zoom=Math.max(0.5,Math.min(4,_crop.zoom+delta));clampCropPosition();updateCropFillHint();var zEl2=g('cropZoom');if(zEl2){zEl2.value=_crop.zoom;g('cropZoomV').textContent=_crop.zoom.toFixed(2)+'×';}drawCropCanvas();},{passive:false});
  modal.addEventListener('click',function(e){if(e.target===modal)closeCropModal();});
  document.addEventListener('keydown',onCropEsc);
}
function syncCropZoomUi(){
  var zEl=g('cropZoom');
  if(zEl)zEl.value=_crop.zoom;
  var zv=g('cropZoomV');
  if(zv)zv.textContent=_crop.zoom.toFixed(2)+'×';
}
function centerCropView(){
  if(!_crop||!_crop.img)return;
  var w=_crop.img.width*_crop.zoom,h=_crop.img.height*_crop.zoom;
  _crop.dx=(_crop.PW-w)/2;
  _crop.dy=(_crop.PH-h)/2;
  clampCropPosition();
  drawCropCanvas();
}
function fillCropView(){
  if(!_crop||!_crop.img)return;
  _crop.zoom=_crop.minZoom;
  centerCropView();
  updateCropFillHint();
  syncCropZoomUi();
}
function resetCropView(){
  if(!_crop||!_crop.img)return;
  var saved=_crop.meta&&_crop.meta.cropState;
  if(saved&&saved.imgW===_crop.img.width&&saved.imgH===_crop.img.height&&saved.PW===_crop.PW&&saved.PH===_crop.PH){
    _crop.zoom=saved.zoom;
    _crop.dx=saved.dx;
    _crop.dy=saved.dy;
    clampCropPosition();
    syncCropZoomUi();
    drawCropCanvas();
    return;
  }
  fillCropView();
}
function updateCropFillHint(){
  if(!_crop||!_crop.img)return;
  var atFill=Math.abs((_crop.zoom||0)-(_crop.minZoom||0))<0.025;
  if(atFill&&_crop.fillHintArmed){
    _crop.fillHintUntil=Date.now()+700;
    _crop.fillHintArmed=false;
  }else if(!atFill){
    _crop.fillHintArmed=true;
  }
}
function drawCropCanvas(){
  var cv=g('cropCanvas');if(!cv||!_crop.img)return;
  var ctx=cv.getContext('2d');ctx.clearRect(0,0,_crop.PW,_crop.PH);
  ctx.fillStyle='#e8f0f2';ctx.fillRect(0,0,_crop.PW,_crop.PH);
  var w=_crop.img.width*_crop.zoom,h=_crop.img.height*_crop.zoom;
  ctx.drawImage(_crop.img,_crop.dx,_crop.dy,w,h);
  if((_crop.fillHintUntil||0)>Date.now()){
    cv.classList.add('fillHint');
    requestAnimationFrame(drawCropCanvas);
  }else{
    cv.classList.remove('fillHint');
  }
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,.7)';
  ctx.lineWidth=1;
  ctx.setLineDash([5,5]);
  ctx.beginPath();
  ctx.moveTo(Math.round(_crop.PW/2)+0.5,0);
  ctx.lineTo(Math.round(_crop.PW/2)+0.5,_crop.PH);
  ctx.moveTo(0,Math.round(_crop.PH/2)+0.5);
  ctx.lineTo(_crop.PW,Math.round(_crop.PH/2)+0.5);
  ctx.stroke();
  ctx.restore();
}
function isSvgDataUrl(dataUrl){
  return /^data:image\/svg\+xml/i.test(String(dataUrl||''));
}
function decodeSvgDataUrl(dataUrl){
  var raw=String(dataUrl||'');
  var idx=raw.indexOf(',');
  if(idx<0)return '';
  var head=raw.slice(0,idx);
  var body=raw.slice(idx+1);
  if(/;base64/i.test(head))return decodeURIComponent(escape(atob(body)));
  return decodeURIComponent(body);
}
function parseSvgMetrics(svgText,fallbackW,fallbackH){
  var doc=(new DOMParser()).parseFromString(svgText,'image/svg+xml');
  var root=doc.documentElement;
  var vb=String(root.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
  if(vb.length===4&&vb.every(function(v){return Number.isFinite(v);})){
    return {minX:vb[0],minY:vb[1],width:vb[2],height:vb[3],inner:root.innerHTML};
  }
  function numAttr(name,fallback){
    var raw=String(root.getAttribute(name)||'').trim();
    if(!raw)return fallback;
    var num=parseFloat(raw.replace(/[a-z%]+$/i,''));
    return Number.isFinite(num)&&num>0?num:fallback;
  }
  return {
    minX:0,
    minY:0,
    width:numAttr('width',fallbackW||100),
    height:numAttr('height',fallbackH||100),
    inner:root.innerHTML
  };
}
function buildCroppedSvgDataUrl(sourceDataUrl,transform,outW,outH){
  var svgText=decodeSvgDataUrl(sourceDataUrl);
  var metrics=parseSvgMetrics(svgText,transform.imgW,transform.imgH);
  var scale=outW/transform.PW;
  var x=transform.dx*scale;
  var y=transform.dy*scale;
  var width=transform.imgW*transform.zoom*scale;
  var height=transform.imgH*transform.zoom*scale;
  var outSvg=
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+outW+' '+outH+'" width="'+outW+'" height="'+outH+'">'+
      '<clipPath id="cropClip"><rect width="'+outW+'" height="'+outH+'" rx="0" ry="0"/></clipPath>'+
      '<svg x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" viewBox="'+metrics.minX+' '+metrics.minY+' '+metrics.width+' '+metrics.height+'" preserveAspectRatio="none" clip-path="url(#cropClip)">'+
        metrics.inner+
      '</svg>'+
    '</svg>';
  return 'data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(outSvg)));
}
function onCropEsc(e){if(e.key==='Escape')closeCropModal();}
function closeCropModal(){
  var m=g('cropModal');if(m)m.remove();
  document.removeEventListener('keydown',onCropEsc);
  _crop={};
  setTimeout(openNextCropJob,0);
}
function confirmCrop(){
  if(!_crop.img)return;
  var cv=g('cropCanvas');if(!cv)return;
  var cropState={
    path:_crop.path||'',
    sid:_crop.sid||'',
    folderName:(_crop.meta&&_crop.meta.folderName)||'cards',
    fileName:(_crop.meta&&_crop.meta.name)||((_crop.path||'').split('/').pop()||'afbeelding.png'),
    sourceDataUrl:_crop.sourceDataUrl,
    transform:{zoom:_crop.zoom,dx:_crop.dx,dy:_crop.dy,imgW:_crop.img.width,imgH:_crop.img.height,PW:_crop.PW,PH:_crop.PH}
  };
  var isSvgSource=isSvgDataUrl(cropState.sourceDataUrl);
  var path=cropState.path,sid=cropState.sid;
  if(isSvgSource){
    var svgDataUrl=buildCroppedSvgDataUrl(cropState.sourceDataUrl,cropState.transform,850,550);
    closeCropModal();
    var tileSvg=g('ct-'+sid);
    var ldSvg=document.createElement('div');ldSvg.className='cLoading';ldSvg.innerHTML='<span class="spinner" style="border-color:rgba(79,142,158,.3);border-top-color:var(--tl)"></span> Uploaden…';
    if(tileSvg)tileSvg.appendChild(ldSvg);
    uploadDataUrlToPath(path,svgDataUrl,'Upload: '+cropState.fileName,function(){
      CC[path]=CC[path]||{};
      CC[path].cropSource=cropState.sourceDataUrl;
      CC[path].cropState=cropState.transform;
      setCardBuildModeForPath(path,'image');
      if(ldSvg.parentNode)ldSvg.remove();
      updateTile(path,svgDataUrl);
      toast('✓ SVG bijgewerkt','green');
      renderSidebar();
      refreshLibGrid(S.activeId);
      refreshAdminPanel();
      setTimeout(loadCardPreviews,50);
    }).catch(function(err){toast('Fout: '+err.message,'red');if(ldSvg.parentNode)ldSvg.remove();});
    return;
  }
  // Render at 2× for HiDPI
  var OUT_W=Math.round(_crop.PW*2),OUT_H=Math.round(_crop.PH*2);
  var out=document.createElement('canvas');out.width=OUT_W;out.height=OUT_H;
  var ctx=out.getContext('2d');ctx.fillStyle='#f8fafa';ctx.fillRect(0,0,OUT_W,OUT_H);
  ctx.drawImage(_crop.img,_crop.dx*2,_crop.dy*2,_crop.img.width*_crop.zoom*2,_crop.img.height*_crop.zoom*2);
  out.toBlob(function(blob){
    var reader=new FileReader();
    reader.onload=function(e){
      var raw=e.target.result,b64=btoa(raw);
      var dataUrl='data:image/png;base64,'+b64;
      closeCropModal();
      var tile=g('ct-'+sid);
      var ld=document.createElement('div');ld.className='cLoading';ld.innerHTML='<span class="spinner" style="border-color:rgba(79,142,158,.3);border-top-color:var(--tl)"></span> Uploaden…';
      if(tile)tile.appendChild(ld);
      uploadDataUrlToPath(path,dataUrl,'Upload: '+cropState.fileName,function(){
        CC[path]=CC[path]||{};
        CC[path].cropSource=cropState.sourceDataUrl;
        CC[path].cropState=cropState.transform;
        setCardBuildModeForPath(path,'image');
        if(ld.parentNode)ld.remove();updateTile(path,dataUrl);toast('✓ Bijgesneden en geüpload','green');renderSidebar();
        refreshLibGrid(S.activeId);
        refreshAdminPanel();
        setTimeout(loadCardPreviews,50);
      }).catch(function(err){toast('Fout: '+err.message,'red');if(ld.parentNode)ld.remove();});
    };
    reader.readAsBinaryString(blob);
  },'image/png',0.92);
}
// Link popup
function closeLp(){if(_lp){_lp.remove();_lp=null;}document.removeEventListener('click',closeLpOut);}
function closeLpOut(e){if(_lp&&!_lp.contains(e.target))closeLp();}
function closeTileMenus(exceptTile){
  document.querySelectorAll('.cTile.menuopen').forEach(function(tile){
    if(tile!==exceptTile)tile.classList.remove('menuopen');
  });
}
function openTilePicker(tile){
  if(!tile)return;
  var id2=S.activeId;
  var ti3=tile.dataset.ti!==undefined?parseInt(tile.dataset.ti,10):-1;
  var isCover3=tile.dataset.ic==='1';
  var fp3='sets/'+id2+'/cards';
  listFolder(fp3).then(function(files){
    if(!files.length){toast('Geen bestanden — upload eerst een afbeelding','amber');return;}
    var tileLabel=isCover3?'Cover':(ti3>=0?(S.d.meta.themes[ti3]||{}).label||'thema':'Kaartafbeelding');
    var items=files.map(function(f){
      var p=fp3+'/'+f.name,ca3=CC[p];
      var curFile=isCover3?'voorkant.svg':(ti3>=0?(S.d.meta.themes[ti3]||{}).card||(S.d.meta.themes[ti3]||{}).key+'.svg':'kaart.svg');
      var cur=f.name===curFile;
      var thumb=ca3&&ca3.dataUrl
        ?'<img src="'+ca3.dataUrl+'" style="width:44px;height:28px;object-fit:cover;border-radius:3px;flex-shrink:0">'
        :'<div style="width:44px;height:28px;border-radius:3px;background:var(--bg);flex-shrink:0;border:1px solid var(--br)"></div>';
      var action=isCover3?'assignCover(\''+esc(p)+'\')':(ti3>=0?'assignToTheme('+ti3+',\''+esc(f.name)+'\')':'assignToTheme(-1,\''+esc(f.name)+'\')');
      return '<button class="bs '+(cur?'tl':'gh')+'" style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;margin-bottom:4px" onclick="'+action+';closeModal()">'+
        thumb+'<span style="flex:1;font-size:12px">'+esc(f.name)+'</span>'+(cur?'<span style="font-size:9.5px">✓</span>':'')+
        '</button>';
    }).join('');
    showModal('<p style="font-size:11px;color:var(--k3);text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:10px">'+esc(tileLabel)+'</p>'+items+
      '<div class="mAct"><button class="mCa" onclick="closeModal()">Annuleren</button></div>');
  });
}
function openLinkPopup(ev,ti,folder){
  closeLp();var id=S.activeId,theme=S.d.meta.themes[ti];if(!theme)return;
  var cur=theme.card||(theme.key+'.svg'),fp='sets/'+id+'/'+folder;
  var pop=document.createElement('div');pop.className='lPop';
  pop.innerHTML='<div class="lPopT">Koppel aan: '+esc(theme.label||theme.key)+'</div><div class="lList" id="ll">Laden…</div><div class="lFoot"><label class="bs tl" style="cursor:pointer;display:block;text-align:center;padding:4px">+ Nieuw uploaden<input type="file" accept=".svg,.png" multiple data-action="ulink" data-ti="'+ti+'" data-folder="'+folder+'"></label></div>';
  var rect=ev.target.getBoundingClientRect();
  pop.style.position='fixed';pop.style.top=Math.min(rect.bottom+4,window.innerHeight-250)+'px';pop.style.left=Math.max(4,Math.min(rect.left-44,window.innerWidth-250))+'px';
  document.body.appendChild(pop);_lp=pop;
  listFolder(fp).then(function(files){
    var ll=g('ll');if(!ll)return;
    if(!files.length){ll.innerHTML='<div style="padding:5px 6px;font-size:11px;color:var(--k3)">Nog geen bestanden.</div>';return;}
    ll.innerHTML=files.map(function(f){var act=f.name===cur;return '<button class="lIt'+(act?' active':'')+'" data-action="lcard" data-ti="'+ti+'" data-folder="'+folder+'" data-file="'+esc(f.name)+'"><span class="lNm">'+esc(f.name)+'</span>'+(act?'<span style="color:var(--tl);font-size:9.5px;margin-left:auto">✓</span>':'')+'</button>';}).join('');
  });
  setTimeout(function(){document.addEventListener('click',closeLpOut);},10);
}
function linkCard(ti,folder,fn){var theme=S.d.meta.themes[ti];if(!theme)return;theme.card=fn;markDirty();closeLp();var pw=g('pw');if(pw)renderClPanel();setTimeout(loadCardPreviews,50);toast('Gekoppeld: '+fn);}
function uploadAndLink(input,ti,folder){
  var files=Array.from(input.files||[]);if(!files.length)return;
  closeLp();
  queueLooseUploads(files,folder);
  var last=files[files.length-1];
  var theme=S.d.meta.themes[ti];
  if(theme&&last){
    theme.card=last.name.replace(/[^a-zA-Z0-9._-]/g,'-');
    markDirty();
    refreshAdminPanel();
    setTimeout(loadCardPreviews,50);
    toast('Bestanden toegevoegd — laatste upload gekoppeld','green');
  }
  input.value='';
}

// ═══════════════════════════════════════════
// STEP: VRAGEN
// ═══════════════════════════════════════════
function buildVragen(target,opts){
  opts=opts||{};
  var filterKey=opts.filterKey||'';
  var themeKeys=((S.d.meta||{}).themes||[]).map(function(t){return t.key;});
  if(filterKey&&filterKey!=='cover'&&filterKey!=='algemeen'&&themeKeys.indexOf(filterKey)<0){
    filterKey=themeKeys[0]||'cover';
  }
  var meta=questionGroupMeta(filterKey);
  var theme=meta.themes[0]||null;
  var html='';
  if(meta.useDefaultGroup){
    // No hint needed — default group behaviour is self-explanatory
  }
  if(meta.isCover&&meta.hasThemes){
    target.innerHTML='<div class="questionsPanel"><div class="questionsEmptyState">Kies een thema in de slider om de bijbehorende vragen te bewerken.</div></div>';
    return;
  }
  if(!theme){
    target.innerHTML='<div class="questionsPanel"><div class="questionsEmptyState">Geen vragen gevonden voor deze selectie.</div></div>';
    return;
  }
  var key=theme.key;
  var qs=(S.d.questions[key]||[]);
  var selectedIdx=ensureQuestionSelection(key);
  var selected=qs[selectedIdx]||null;
  var isBackOpen=!!QUESTION_EDITOR_BACK_OPEN[key];
  html+='<div class="questionsPanel">';
  var showBacks=!!QUESTION_BACKS_EDITOR_OPEN[key];
  var iconBulk='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v10"/><path d="M8.5 9 12 5.5 15.5 9"/><path d="M7 18.5h10"/></svg>';
  var iconBacks='<svg class="flipIconStd" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 6.5h6a4.75 4.75 0 0 1 0 9.5H6.75"/><path d="M9 4 5.25 6.75 9 9.5"/></svg>';
  var iconAdd='<svg viewBox="0 0 16 16"><path d="M8 2.5v11M2.5 8h11"/></svg>';
  var themeIdxQ=(S.d.meta.themes||[]).map(function(t){return t.key;}).indexOf(theme.key);
  var themeNameHtml=(themeIdxQ>=0&&theme.key!=='algemeen')
    ?'<input class="questionsTheme questionsThemeInput" type="text" value="'+esc(theme.label||theme.key)+'" placeholder="Naam van het thema" oninput="updateStyleThemeName('+themeIdxQ+',this.value)">'
    :'<div class="questionsTheme">'+esc(theme.label||theme.key)+'</div>';
  html+='<div class="questionsPanelShell">'+
    '<div class="questionsPanelHead">'+
      '<div class="questionsMeta">'+themeNameHtml+'<div class="questionsCount">'+qs.length+' '+(qs.length===1?'vraag':'vragen')+'</div></div>'+
      '<div class="questionsHeadActions">'+
        '<button class="qHeadBtn" type="button" onclick="showBulkImport(\''+esc(key)+'\')" title="Vragen in bulk importeren" aria-label="Vragen in bulk importeren">'+iconBulk+'</button>'+
        '<button class="qHeadBtn'+(showBacks?' sel':'')+'" type="button" onclick="toggleBacksEditor(\''+esc(key)+'\')" title="Achterkanten tonen/verbergen">'+iconBacks+'</button>'+
        '<button class="qHeadBtn qHeadBtnAdd" type="button" onclick="addQ(\''+esc(key)+'\')" title="Vraag toevoegen">'+iconAdd+'</button>'+
      '</div>'+
    '</div>'+
    '<div class="questionListShell">';
  html+='<div class="questionList">';
  if(!qs.length){
    html+='<div class="questionListEmpty">Nog geen vragen. Voeg er eentje toe of gebruik bulk.</div>';
  }else{
    html+=qs.map(function(card,qi){
      var line=(card.voorkant||card.q||'').trim()||'Lege vraag';
      var back=card.achterkant||card.back||'';
      if(qi===selectedIdx){
        return '<div class="questionListItem active editing">'+
          '<span class="questionListNum">'+(qi+1)+'</span>'+
          '<div class="questionItemFields">'+
            '<div class="richCe questionRichCe" contenteditable="true" data-rich-type="question" data-rich-field="voorkant" data-rich-qkey="'+esc(key)+'" data-rich-qi="'+qi+'" data-placeholder="Voorkant…" spellcheck="false" oninput="richCeQuestionInput(this)" onfocus="syncSelectedQuestionPreview(\''+esc(key)+'\')">'+mdToHtml(line)+'</div>'+
            (showBacks?'<textarea class="questionListBack" rows="1" placeholder="Achterkant…" oninput="updQ(\''+esc(key)+'\','+qi+',\'achterkant\',this.value);autoH(this)">'+esc(back)+'</textarea>':'')+
          '</div>'+
          '<div class="questionItemActions">'+
            '<button class="questionItemBtn" type="button" title="Dupliceren" onclick="duplicateQ(\''+esc(key)+'\','+qi+')">⧉</button>'+
            '<button class="questionItemBtn danger" type="button" title="Verwijderen" onclick="delQ(\''+esc(key)+'\','+qi+')"><svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12h10l1-12"/><path d="M9 7V4h6v3"/></svg></button>'+
          '</div>'+
        '</div>';
      }
      return '<div class="questionListItem" onclick="setSelectedQuestion(\''+esc(key)+'\','+qi+')">'+
        '<span class="questionListNum">'+(qi+1)+'</span>'+
        '<div class="questionItemFields">'+
          '<span class="questionListText">'+esc(line)+'</span>'+
          (showBacks?'<textarea class="questionListBack" rows="1" placeholder="Achterkant…" oninput="updQ(\''+esc(key)+'\','+qi+',\'achterkant\',this.value);autoH(this)">'+esc(back)+'</textarea>':'')+
        '</div>'+
      '</div>';
    }).join('');
  }
  html+='</div></div></div>';
  html+='<div class="questionEditor">';
  if(!selected){
    html+='<div class="questionsEmptyState">Selecteer of voeg een vraag toe om rechts te bewerken.</div>';
  }else{
    var back=selected.achterkant||selected.back||'';
    var MAX=90;
    html+='<div class="questionEditorHead"><div class="questionEditorTitle">Vraag '+(selectedIdx+1)+'</div><div class="questionEditorActions"><button class="iconAction" type="button" title="Dupliceren" onclick="duplicateQ(\''+esc(key)+'\','+selectedIdx+')">⧉</button><button class="iconAction danger" type="button" title="Verwijderen" onclick="delQ(\''+esc(key)+'\','+selectedIdx+')">✕</button></div></div>';
    html+='<div class="questionCounter top" id="cc-f-'+key+'-'+selectedIdx+'">'+(selected.voorkant||selected.q||'').length+'/'+MAX+'</div>';
    html+='<div class="questionBackToggle"><button class="ghostToggle'+(isBackOpen?' open':'')+'" type="button" onclick="toggleQuestionBackEditor(\''+esc(key)+'\')">'+(isBackOpen?'Achterkant verbergen':'Achterkant bewerken')+'</button></div>';
    if(isBackOpen){
      html+='<label class="questionFieldLabel">Achterkant</label>'+
        '<div class="richCe questionRichCe questionRichCeBack" contenteditable="true" data-rich-type="question" data-rich-field="achterkant" data-rich-qkey="'+esc(key)+'" data-rich-qi="'+selectedIdx+'" data-placeholder="Optionele achterkant of toelichting" spellcheck="false" oninput="richCeQuestionInput(this)" onfocus="syncSelectedQuestionPreview(\''+esc(key)+'\')">'+mdToHtml(back)+'</div>'+
        '<div class="questionCounter" id="cc-b-'+key+'-'+selectedIdx+'">'+back.length+'/'+MAX+'</div>';
    }
  }
  html+='</div></div>';
  target.innerHTML=html;
  target.querySelectorAll('.questionListBack').forEach(function(t){setTimeout(function(){autoH(t);},0);});
  if(theme)syncSelectedQuestionPreview(theme.key);
}
function toggleBacksEditor(key){
  QUESTION_BACKS_EDITOR_OPEN[key]=!QUESTION_BACKS_EDITOR_OPEN[key];
  var sp=g('stijlSidePaneBody');
  if(sp)buildVragen(sp,{filterKey:key});
}
function saveBacksFromEditor(key,val){
  var lines=val.split('\n');
  var qs=S.d.questions[key]||[];
  qs.forEach(function(q,i){q.achterkant=lines[i]!==undefined?lines[i]:'';});
  markDirty();
}
function cpSetSide(key,side,btn){
  var wrap=g('cpw-'+key);if(!wrap)return;
  wrap.querySelectorAll('.cpBtn').forEach(function(b){b.classList.toggle('sel',b===btn);});
  // Flip the card
  var inner=g('cpface-'+key);if(!inner)return;
  inner.classList.toggle('flipped',side==='back');
  // Find focused or first question
  var ql=g('ql-'+key),q2=null;
  if(ql){
    var focused=ql.querySelector('.qIn:focus,.qInBack:focus');
    if(focused){var row=focused.closest('.qRow');if(row){var num=row.querySelector('.qNum');if(num)q2=S.d.questions[key]&&S.d.questions[key][parseInt(num.textContent,10)-1];}}
    if(!q2)q2=S.d.questions[key]&&S.d.questions[key][0];
  }
  if(!q2)q2={voorkant:'',achterkant:''};
  // Update front text
  var frontEl=g('cpfront-'+key);
  if(frontEl)frontEl.innerHTML=q2.voorkant?esc(q2.voorkant):'<span class="cpHint">Voorkant tekst</span>';
  // Update back text
  var backEl=g('cpback-'+key);
  if(backEl){
    var backMode=S.d.meta.backMode||'mirror';
    var blankColor=(S.d.meta.blankBackColors&&S.d.meta.blankBackColors[key])||S.d.meta.blankBackColor||'#F8E4D2';
    backEl.style.background=backMode==='blank'?blankColor:'transparent';
    var backOverlay=backEl.querySelector('.cpOverlay');
    if(backOverlay)backOverlay.innerHTML=q2.achterkant?esc(q2.achterkant):'';
  }
}
function updateCardPreview(key,frontTxt,backTxt){
  var inner=g('cpface-'+key);if(!inner)return;
  var wrap=g('cpw-'+key);if(!wrap)return;
  var cv=(S.d.meta||{}).cssVars||{};
  var font="'"+(cv['--pk-font']||'IBM Plex Sans')+"',sans-serif";
  var fs=fontSizeCss(cv['--pk-font-size']||'12');
  var color=cv['--pk-set-text']||'#1a1a2e';
  var halign=cv['--pk-text-align']||'center';
  var valign=cv['--pk-text-valign']||'center';
  var frontEl=g('cpfront-'+key);
  if(frontEl){
    frontEl.innerHTML=frontTxt?esc(frontTxt):'<span class="cpHint">Voorkant tekst</span>';
    frontEl.style.fontFamily=font;
    frontEl.style.fontSize=fs;
    frontEl.style.color=color;
    frontEl.style.textAlign=halign;
    var ov=frontEl.parentElement;
    if(ov){
      ov.style.alignItems=valign==='top'?'flex-start':valign==='bottom'?'flex-end':'center';
      ov.style.justifyContent=halign==='left'?'flex-start':halign==='right'?'flex-end':'center';
    }
  }
  var backEl=g('cpback-'+key);
  if(backEl){
    var backMode=S.d.meta.backMode||'mirror';
    var blankColor=(S.d.meta.blankBackColors&&S.d.meta.blankBackColors[key])||S.d.meta.blankBackColor||'#F8E4D2';
    backEl.style.background=backMode==='blank'?blankColor:'transparent';
    backEl.style.fontFamily=font;
    backEl.style.fontSize=fs;
    backEl.style.color=color;
    var bov=backEl.querySelector('.cpOverlay');
    if(bov){bov.style.alignItems=valign==='top'?'flex-start':valign==='bottom'?'flex-end':'center';bov.style.justifyContent=halign==='left'?'flex-start':halign==='right'?'flex-end':'center';}
    backEl.querySelector('.cpOverlay').innerHTML=backTxt?esc(backTxt):'';
  }
}
function findThemeCardMeta(key){
  var themes=S.d.meta.themes||[];
  var th=themes.find(function(t){return t.key===key;});
  if(th)return {key:th.key,label:th.label||th.key,file:th.card||(th.key+'.svg')};
  return {key:key,label:key==='algemeen'?'Algemeen':key,file:'kaart.svg'};
}
function cardBgStyle(hex){
  return 'background:linear-gradient(180deg,rgba(255,255,255,0.013) 0%,rgba(0,0,0,0.013) 100%),'+hex;
}
function cardBgValue(hex){
  return String(cardBgStyle(hex)).replace(/^background:/,'');
}
var DEFAULT_CARD_SURFACE = '#FAFAF8';
var ADMIN_PREVIEW_CARD_BG = DEFAULT_CARD_SURFACE;
var EMPTY_QUESTION_CARD_BG = '#EEF1F2';
var QUESTION_SELECTION={};
var QUESTION_EDITOR_BACK_OPEN={};
var QUESTION_BACKS_EDITOR_OPEN={};
function normalizedCardSurface(v){
  var hex=normalizeHexInput(v);
  if(hex==='#ffffff'||hex==='#fcfbf8')return DEFAULT_CARD_SURFACE;
  return v||DEFAULT_CARD_SURFACE;
}
function cardBgMaps(meta){
  meta=meta||{};
  meta.ui=meta.ui||{};
  meta.ui.cardBgBaseByKey=meta.ui.cardBgBaseByKey||{};
  meta.ui.cardBgToneByKey=meta.ui.cardBgToneByKey||{};
  return {base:meta.ui.cardBgBaseByKey,tone:meta.ui.cardBgToneByKey};
}
function cardBgBaseForKey(meta,key){
  meta=meta||{};
  var maps=cardBgMaps(meta);
  var byKey=normalizeHexInput(maps.base[key||''])||'';
  var legacy=normalizeHexInput((((meta.ui||{}).cardBgBase)||''))||'';
  var css=normalizeHexInput((((meta.cssVars||{})['--pk-set-bg'])||''))||'';
  return normalizedCardSurface(byKey||legacy||css||DEFAULT_CARD_SURFACE);
}
function cardBgToneForKey(meta,key){
  meta=meta||{};
  var maps=cardBgMaps(meta);
  if(Object.prototype.hasOwnProperty.call(maps.tone,key||''))return Number(maps.tone[key||''])||0;
  return Number((((meta.ui||{}).cardBgTone)||0))||0;
}
function cardBgForKey(meta,key){
  return normalizedCardSurface(colorToneAdjust(cardBgBaseForKey(meta,key),cardBgToneForKey(meta,key)));
}
function sharedCardPreviewHtml(opts){
  opts=opts||{};
  var cached=opts.file?(((cachedCardAssetForFile(S.activeId,opts.file)||{}).asset)||null):null;
  var imgSrc=cached&&cached.dataUrl?cached.dataUrl:'';
  if(opts.forceNoImage)imgSrc='';
  var cv=(S.d.meta.cssVars||{});
  var font=cv['--pk-font']||'IBM Plex Sans';
  var fs=fontSizeCss(cv['--pk-font-size']||'12');
  var baseFontPt=parseInt(normFontSize(cv['--pk-font-size']||'12'),10)||12;
  var titleFontSize=Math.max(22,Math.round(baseFontPt*2.2))+'pt';
  var textColor=cv['--pk-set-text']||'rgba(48,96,136,0.95)';
  var halign=cv['--pk-text-align']||'center';
  var valign=cv['--pk-text-valign']||'center';
  var accentColor=cv['--pk-set-accent']||'#CFE6DF';
  var cardBg=normalizedCardSurface(opts.cardBg||cardBgForKey(S.d.meta,opts.previewKey)||(cv['--pk-set-bg']||DEFAULT_CARD_SURFACE));
  var emptyBg=normalizedCardSurface(opts.emptyBg||cardBg);
  var backMode=opts.backMode||S.d.meta.backMode||'mirror';
  var blankColor=(S.d.meta.blankBackColors&&S.d.meta.blankBackColors[opts.themeKey])||S.d.meta.blankBackColor||'#F8E4D2';
  var alignItems=valign==='top'?'flex-start':valign==='bottom'?'flex-end':'center';
  var justifyContent=halign==='left'?'flex-start':halign==='right'?'flex-end':'center';
  var wrapCls=opts.wrapClass||'cardPrevWrap';
  var wrapStyle=opts.wrapStyle||'';
  // In infoRichCe mode we always render the richCe text area, even on the cover slide
  var isCover=!opts.infoRichCe&&opts.previewKey==='cover'&&!!opts.showCoverTexts;
  var isCoverPreview=!opts.infoRichCe&&opts.previewKey==='cover'&&!opts.showCoverTexts;
  // Info mode: use a single sheet-like card on the same footprint as the question preview.
  if(opts.infoRichCe){
    var previewLabel=opts.label||'Infosheet';
    var previewTitle=esc(previewLabel);
    var midTitleText=String(opts.infoMidTitleText!=null?opts.infoMidTitleText:(opts.label||'')).trim();
    var mediaHtml=(imgSrc?'<img class="adminInfoCardImg" src="'+imgSrc+'" alt="'+previewTitle+'">':'<div class="adminInfoCardFill" style="'+cardBgStyle(emptyBg)+'"></div>')+
      '<div class="cpShapeLayer" data-shape-key="'+esc(opts.previewKey||'algemeen')+'">'+cardShapesLayerHtml(opts.previewKey||'algemeen')+'</div>'+
      (opts.showInfoMidTitle
        ?'<div class="infoSlideMidTitle" contenteditable="true" spellcheck="false" data-info-mid-title-key="'+esc(opts.infoMidTitleKey||'')+'" oninput="infoMidTitleInput(this)" style="font-family:\''+esc(font)+'\',sans-serif;color:'+esc(textColor)+';font-size:'+esc(titleFontSize)+';font-weight:700">'+esc(midTitleText)+'</div>'
        :'');
    return '<div class="'+wrapCls+' infoPreviewSingle"'+(opts.wrapId?' id="'+esc(opts.wrapId)+'"':'')+(wrapStyle?' style="'+esc(wrapStyle)+'"':'')+'>'+
      '<div class="infoSlide adminInfoSlide adminInfoSlideSingle">'+
        '<div class="infoSlideInner adminInfoSlideInner">'+
          '<div class="adminInfoSlideCard"'+(opts.faceId?' id="'+esc(opts.faceId)+'"':'')+' style="'+cardBgStyle(cardBg)+'">'+mediaHtml+'</div>'+
          '<div class="infoSlideText adminInfoSlideText adminInfoSlideTextEdit"'+(opts.frontId?' id="'+esc(opts.frontId)+'"':'')+'>'+
            '<div class="richCe infoRichCe" contenteditable="true" data-rich-type="info" data-rich-key="'+esc(opts.infoRichCeKey||'')+'" data-placeholder="Typ hier de infotekst..." spellcheck="false" oninput="richCeInfoInput(this)">'+(opts.frontTxt||'')+'</div>'+
          '</div>'+
        '</div>'+
      '</div>'+
      (opts.sideButtonsHtml||'')+
    '</div>';
  }
  return '<div class="'+wrapCls+'"'+(opts.wrapId?' id="'+esc(opts.wrapId)+'"':'')+(wrapStyle?' style="'+esc(wrapStyle)+'"':'')+'>'+
    '<div class="cardFaceOuter">'+
      '<div class="cardFaceInner'+(opts.flipped?' flipped':'')+'"'+(opts.faceId?' id="'+esc(opts.faceId)+'"':'')+'>'+
        '<div class="cardFaceFront" style="'+cardBgStyle(cardBg)+'">'+
          (imgSrc?'<img class="cpBg" src="'+imgSrc+'" alt="'+esc(opts.label||'Kaartpreview')+'">':'<div class="cpBgEmpty" style="'+cardBgStyle(emptyBg)+';position:absolute;inset:0"></div>')+
          '<div class="cpShapeLayer" data-shape-key="'+esc(opts.previewKey||'algemeen')+'">'+cardShapesLayerHtml(opts.previewKey||'algemeen')+'</div>'+
          (isCover?'<div class="cpTextLayer" data-cover-texts="1">'+coverTextLayerHtml()+'</div>':'')+
          '<div class="cpOverlay'+(isCoverPreview?' coverPreview':'')+'" style="align-items:'+alignItems+';justify-content:'+justifyContent+'">'+
            '<div class="cpFront'+(isCoverPreview?' coverPreviewText':'')+'"'+(opts.frontId?' id="'+esc(opts.frontId)+'"':'')+' style="font-family:\''+esc(font)+'\',sans-serif;font-size:'+(isCoverPreview?'clamp(15px,1.65vw,23px)':esc(fs))+';color:'+esc(textColor)+';text-align:'+halign+'">'+
              (isCover?'':(opts.infoRichCe
                ?'<div class="richCe infoRichCe" contenteditable="true" data-rich-type="info" data-rich-key="'+esc(opts.infoRichCeKey||'')+'" data-placeholder="Typ hier de tekst voor de infopagina..." spellcheck="false" oninput="richCeInfoInput(this)">'+(opts.frontTxt||'')+'</div>'
                :'<span class="cpFrontInner">'+(opts.frontTxt?esc(opts.frontTxt):(opts.suppressEmptyFrontHint?'':'<span class="cpHint">Voorkant tekst</span>'))+'</span>'))+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="cardFaceBack'+(backMode==='reflect'?' is-reflect':'')+'"'+(opts.backId?' id="'+esc(opts.backId)+'"':'')+' style="background:'+(backMode==='blank'?esc(blankColor):'transparent')+';font-family:\''+esc(font)+'\',sans-serif;font-size:'+esc(fs)+';color:'+esc(textColor)+'">'+
          ((backMode==='mirror'||backMode==='reflect')?(imgSrc?'<img class="cpBg'+(backMode==='reflect'?' is-reflect':'')+'" src="'+imgSrc+'" alt="">':'<div style="position:absolute;inset:0;background:'+esc(emptyBg)+'"></div>'):'')+
          '<div class="cpShapeLayer'+(backMode==='reflect'?' is-reflect':'')+'" data-shape-key="'+esc(opts.previewKey||'algemeen')+'">'+cardShapesLayerHtml(opts.previewKey||'algemeen')+'</div>'+
          '<div class="cpOverlay" style="position:absolute;inset:0;display:flex;align-items:'+alignItems+';justify-content:'+justifyContent+';padding:10px;text-align:'+halign+'">'+(opts.backTxt?esc(opts.backTxt):'')+'</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
    (opts.label?'<div class="cpLabel">'+esc(opts.label)+'</div>':'')+
    (opts.sideButtonsHtml||'')+
  '</div>';
}
function questionGroupMeta(filterKey){
  var themes=S.d.meta.themes||[];
  var useDefaultGroup=!themes.length;
  var workThemes=useDefaultGroup?[{key:'algemeen',label:'Algemeen',card:'kaart.svg'}]:themes.slice();
  if(filterKey&&filterKey!=='cover'){
    workThemes=workThemes.filter(function(th){return th.key===filterKey;});
  }
  return {
    themes:workThemes,
    useDefaultGroup:useDefaultGroup,
    isCover:filterKey==='cover',
    hasThemes:!!themes.length
  };
}
function ensureQuestionSelection(key){
  var qs=(S.d.questions&&S.d.questions[key])||[];
  if(!qs.length){QUESTION_SELECTION[key]=0;return 0;}
  var idx=parseInt(QUESTION_SELECTION[key],10);
  if(isNaN(idx)||idx<0||idx>=qs.length)idx=0;
  QUESTION_SELECTION[key]=idx;
  return idx;
}
function selectedQuestionIndex(key){
  return ensureQuestionSelection(key);
}
function selectedQuestionCard(key){
  var qs=(S.d.questions&&S.d.questions[key])||[];
  return qs[selectedQuestionIndex(key)]||null;
}
function setSelectedQuestion(key,qi){
  QUESTION_SELECTION[key]=Math.max(0,parseInt(qi,10)||0);
  rebuildVragen();
}
function toggleQuestionBackEditor(key){
  QUESTION_EDITOR_BACK_OPEN[key]=!QUESTION_EDITOR_BACK_OPEN[key];
  rebuildVragen();
}
function duplicateQ(key,qi){
  var list=S.d.questions[key]||[];
  var src=list[qi];
  if(!src)return;
  list.splice(qi+1,0,cloneJson(src));
  QUESTION_SELECTION[key]=qi+1;
  markDirty();
  rebuildVragen();
  toast('Vraag gedupliceerd','green');
}
function questionPreviewFrontText(key){
  var q=selectedQuestionCard(key);
  return q?(q.voorkant||q.q||''):'';
}
function syncSelectedQuestionPreview(key){
  var q=selectedQuestionCard(key)||{voorkant:'',achterkant:''};
  var front=g('stijlCardTxt');
  if(front)front.innerHTML=q.voorkant?('<span class="cpFrontInner">'+mdToHtml(q.voorkant)+'</span>'):'';
  var back=g('stijlCardBack');
  if(back){
    var ov=back.querySelector('.cpOverlay');
    if(ov)ov.innerHTML=q.achterkant?mdToHtml(q.achterkant):'';
  }
  updateStijlPreview();
}
function showQEditor(key,qi){
  Q_EDITOR_SIDE='front';
  var flipState=Q_EDITOR_SIDE;
  var q2=S.d.questions[key]&&S.d.questions[key][qi];
  if(!q2)return;
  var meta=findThemeCardMeta(key);
  showModal(
    '<div class="qEditorGrid">'+
      '<div class="stijlSectionTitle">Kaart opmaken</div>'+
      buildSharedCardEditor({
        wrapId:'qedCardPrevWrap',
        wrapClass:'stijlCardPrevWrap',
        faceId:'qedCardFace',
        frontId:'qedCardTxt',
        backId:'qedCardBack',
        previewFile:meta.file,
        previewKey:key,
        emptyBg:EMPTY_QUESTION_CARD_BG,
        sampleTxt:q2.voorkant||meta.label,
        backTxt:q2.achterkant||'',
        previewHint:meta.file,
        flipped:flipState==='back',
        wrapStyle:'cursor:pointer'
      })+
      '<div class="qEditorFields">'+
        '<div><label class="fLbl">Voorkant</label><textarea class="fTa" id="qed-front-in" rows="4" onfocus="qEditorSetSide(\'front\')" oninput="syncQEditorField(\''+esc(key)+'\','+qi+',\'voorkant\',this.value)">'+esc(q2.voorkant||'')+'</textarea></div>'+
        '<div><label class="fLbl">Achterkant</label><textarea class="fTa" id="qed-back-in" rows="4" onfocus="qEditorSetSide(\'back\')" oninput="syncQEditorField(\''+esc(key)+'\','+qi+',\'achterkant\',this.value)">'+esc(q2.achterkant||'')+'</textarea></div>'+
      '</div>'+
      '<div class="qEditorClose"><button class="mCa" type="button" onclick="closeQEditor()">Sluiten</button></div>'+
    '</div>',
    'qEditorModal'
  );
  var prev=g('qedCardPrevWrap');
  if(prev)prev.onclick=function(){qEditorSetSide(Q_EDITOR_SIDE==='front'?'back':'front');};
}
function syncQEditorField(key,qi,field,val){
  updQ(key,qi,field,val);
  var q2=S.d.questions[key]&&S.d.questions[key][qi];
  if(!q2)return;
  updateQuestionEditorPreview(q2.voorkant||'',q2.achterkant||'');
}
function updateQuestionEditorPreview(frontTxt,backTxt){
  var frontEl=g('qedCardTxt');
  if(frontEl)frontEl.innerHTML=frontTxt?esc(frontTxt):'<span class="cpHint">Voorkant tekst</span>';
  var backWrap=g('qedCardBack');
  if(backWrap){
    var ov=backWrap.querySelector('.cpOverlay');
    if(ov)ov.innerHTML=backTxt?esc(backTxt):'';
  }
}
function qEditorSetSide(side){
  Q_EDITOR_SIDE=(side==='back')?'back':'front';
  var face=g('qedCardFace');
  if(face)face.classList.toggle('flipped',Q_EDITOR_SIDE==='back');
}
function closeQEditor(){
  closeModal();
  rebuildVragen();
}
function buildQRow(key,qi,card){
  var front=card.voorkant||card.q||'', back=card.achterkant||card.back||'';
  var MAX=90;
  var fc=front.length, bc=back.length;
  var fcCls=fc>MAX?'over':fc>MAX*.8?'warn':'', bcCls=bc>MAX?'over':bc>MAX*.8?'warn':'';
  return '<div class="qRow"><span class="qNum">'+(qi+1)+'</span>'+
    '<div class="qFields">'+
      '<textarea class="qIn" rows="1" placeholder="Voorkant — de vraag" oninput="updQ(\''+esc(key)+'\','+qi+',\'voorkant\',this.value);autoH(this);updCC(this,'+MAX+');liveQ(\''+esc(key)+'\','+qi+',true,this.value)">'+esc(front)+'</textarea>'+
      '<div class="charCount'+(fcCls?' '+fcCls:'')+'" id="cc-f-'+key+'-'+qi+'">'+fc+'/'+MAX+'</div>'+
      '<textarea class="qInBack" rows="1" placeholder="Achterkant — toelichting of antwoord (optioneel)" oninput="updQ(\''+esc(key)+'\','+qi+',\'achterkant\',this.value);autoH(this);updCC(this,'+MAX+');liveQ(\''+esc(key)+'\','+qi+',false,this.value)">'+esc(back)+'</textarea>'+
      (back?'<div class="charCount'+(bcCls?' '+bcCls:'')+'" id="cc-b-'+key+'-'+qi+'">'+bc+'/'+MAX+'</div>':'')+
    '</div>'+
    '<button class="qEdit" type="button" onclick="showQEditor(\''+esc(key)+'\','+qi+')" title="Kaarteditor">□</button>'+
    '<button class="qDel" data-action="delq" data-key="'+esc(key)+'" data-qi="'+qi+'" title="Vraag verwijderen">✕</button></div>';
}
function showBulkImport(key){
  var th=S.d.meta.themes.find(function(t){return t.key===key;})||{};
  showModal('<h3>Bulk importeren — '+esc(th.label||key)+'</h3>'+
    '<p>Plak je vragen hieronder. Elke regel = één vraag op de voorkant.<br>Voorkant en achterkant scheiden met een <code>|</code> (pipe): <em>Vraag | Antwoord</em></p>'+
    '<textarea class="bulkArea" id="bulkTa" placeholder="Wat neem jij mee uit dit gesprek?\nWat doet dit met jou? | Ruimte voor reflectie\n…"></textarea>'+
    '<div class="mAct"><button class="mCa" onclick="closeModal()">Annuleren</button><button class="mOk" onclick="execBulk(\''+esc(key)+'\')">Importeren</button></div>');
  setTimeout(function(){var ta=g('bulkTa');if(ta)ta.focus();},50);
}
function execBulk(key){
  var ta=g('bulkTa');if(!ta)return;
  var lines=ta.value.split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length>0;});
  if(!lines.length){toast('Geen regels gevonden','red');return;}
  if(!S.d.questions[key])S.d.questions[key]=[];
  lines.forEach(function(line){
    var parts=line.split('|');
    S.d.questions[key].push({voorkant:parts[0].trim(),achterkant:(parts[1]||'').trim(),q:parts[0].trim(),back:(parts[1]||'').trim()});
  });
  markDirty();closeModal();rebuildVragen();toast(lines.length+' vragen toegevoegd','green');
}
function addQ(key){
  if(!S.d.questions[key])S.d.questions[key]=[];
  S.d.questions[key].push({voorkant:'',achterkant:'',q:'',back:''});
  QUESTION_SELECTION[key]=S.d.questions[key].length-1;
  QUESTION_EDITOR_BACK_OPEN[key]=false;
  markDirty();
  rebuildVragen();
}
function delQ(key,qi){
  if(!S.d.questions[key])return;
  S.d.questions[key].splice(qi,1);
  QUESTION_SELECTION[key]=Math.max(0,Math.min(qi,S.d.questions[key].length-1));
  markDirty();
  rebuildVragen();
}
function updQ(key,qi,field,val){var c=S.d.questions[key]&&S.d.questions[key][qi];if(c){c[field]=val;if(field==='voorkant')c.q=val;if(field==='achterkant')c.back=val;}markDirty();}
function richCeInfoInput(el){
  var key=el.dataset.richKey||'';if(!key)return;
  S.d.uitleg=S.d.uitleg||{};
  S.d.uitleg[key]=htmlToMd(el.innerHTML);
  markDirty();
  // Sync to sidebar textarea if it's not the active element
  var sideEl=g('u_'+key);
  if(sideEl&&document.activeElement!==sideEl)sideEl.innerHTML=el.innerHTML;
  syncInfoPreviewExtent();
}
function richCeQuestionInput(el){
  var qkey=el.dataset.richQkey,qi=parseInt(el.dataset.richQi,10),field=el.dataset.richField||'voorkant';
  if(!qkey||isNaN(qi))return;
  var md=htmlToMd(el.innerHTML);
  updQ(qkey,qi,field,md);
  var q2=S.d.questions[qkey]&&S.d.questions[qkey][qi];
  if(q2){
    var front=field==='voorkant'?md:(q2.voorkant||q2.q||'');
    var back=field==='achterkant'?md:(q2.achterkant||q2.back||'');
    if(typeof updateCardPreview==='function')try{updateCardPreview(qkey,front,back);}catch(e){}
    if((STYLE_PREVIEW_KEY||'cover')===qkey)syncSelectedQuestionPreview(qkey);
  }
  var cc=g('cc-'+(field==='voorkant'?'f':'b')+'-'+qkey+'-'+qi);
  if(cc)cc.textContent=(el.textContent||'').length+'/90';
}
function liveQ(key,qi,isFront,val){
  QUESTION_SELECTION[key]=qi;
  var q2=S.d.questions[key]&&S.d.questions[key][qi];
  if(q2)updateCardPreview(key,isFront?val:(q2.voorkant||''),isFront?(q2.achterkant||''):val);
  if((STYLE_PREVIEW_KEY||'cover')===key)syncSelectedQuestionPreview(key);
}
function updCC(el,max){var n=el.value.length,p=el.nextElementSibling;if(p&&p.classList.contains('charCount')){p.textContent=n+'/'+max;p.className='charCount'+(n>max?' over':n>max*.8?' warn':'');}}
function rebuildVragen(){var pw=g('pw');if(pw)renderClPanel();setTimeout(loadCardPreviews,50);}
function autoH(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}
function editorSkin(){
  var cv=(S.d&&S.d.meta&&S.d.meta.cssVars)||{};
  return {
    font:cv['--pk-font']||'IBM Plex Sans',
    size:fontSizeCss(cv['--pk-font-size']||'12'),
    color:cv['--pk-set-text']||'#1a1a2e',
    bg:cv['--pk-set-bg']||DEFAULT_CARD_SURFACE
  };
}
function normalizeLegacyCardSurfaceMeta(meta){
  if(!meta)return;
  meta.cssVars=meta.cssVars||{};
  meta.ui=meta.ui||{};
  var maps=cardBgMaps(meta);
  var bgHex=normalizeHexInput(meta.cssVars['--pk-set-bg']);
  var cardRaw=String(meta.cssVars['--pk-set-card']||'').replace(/\s/g,'').toLowerCase();
  var baseHex=normalizeHexInput(meta.ui.cardBgBase);
  if(bgHex==='#ffffff'||bgHex==='#fcfbf8')meta.cssVars['--pk-set-bg']=DEFAULT_CARD_SURFACE;
  if(cardRaw==='#ffffff'||cardRaw==='#fcfbf8'||cardRaw==='rgba(255,255,255,1)'||cardRaw==='rgb(255,255,255)')meta.cssVars['--pk-set-card']=DEFAULT_CARD_SURFACE;
  if(baseHex==='#ffffff'||baseHex==='#fcfbf8')meta.ui.cardBgBase=DEFAULT_CARD_SURFACE;
  Object.keys(maps.base).forEach(function(key){
    var hex=normalizeHexInput(maps.base[key]);
    if(hex==='#ffffff'||hex==='#fcfbf8')maps.base[key]=DEFAULT_CARD_SURFACE;
  });
}
function editorSkinVars(){
  var sk=editorSkin();
  return '--rt-font:\''+esc(sk.font)+'\';--rt-size:'+esc(sk.size)+';--rt-color:'+esc(sk.color)+';--rt-bg:'+esc(sk.bg)+';';
}
function buildInfoThumb(path,small){
  var cached=(cachedCardAssetForPath(path)||{}).asset||CC[path];
  return '<div class="infoThumb'+(small?' sm':'')+'" data-info-thumb="'+esc(path)+'">'+(cached&&cached.dataUrl?'<img src="'+cached.dataUrl+'" alt="">':'')+'</div>';
}
function updateInfoThumb(path,dataUrl){
  if(!path||!dataUrl)return;
  cardAssetSiblingPaths(path).forEach(function(candidate){
    document.querySelectorAll('[data-info-thumb="'+candidate.replace(/"/g,'&quot;')+'"]').forEach(function(node){
      if(!node.querySelector('img'))node.innerHTML='<img src="'+dataUrl+'" alt="">';
    });
  });
}
function mdToHtml(md){
  if(!md)return '';
  return md
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/\n/g,'<br>');
}
function htmlToMd(html){
  if(!html)return '';
  return html
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<b>([\s\S]*?)<\/b>/gi,'**$1**')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi,'**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/gi,'*$1*')
    .replace(/<i>([\s\S]*?)<\/i>/gi,'*$1*')
    .replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function buildRichTextarea(id,value,rows,placeholder){
  var html=mdToHtml(value||'');
  var richKey=id.indexOf('u_')===0?id.slice(2):id;
  return '<div class="infoEditor">'
    +'<div class="richCe" id="'+id+'" data-rich-key="'+esc(richKey)+'" data-rich-type="info" contenteditable="true" data-placeholder="'+esc(placeholder)+'" spellcheck="false">'+html+'</div>'
    +'</div>';
}
function infoThemes(){return ((S.d||{}).meta||{}).themes||[];}
function infoThemeCardPath(key){
  var th=infoThemes().find(function(t){return t&&t.key===key;});
  return th?cardAssetPathForSet(S.activeId,(th.card||(th.key+'.svg'))):'';
}
function infoThemeLabel(key){
  var th=infoThemes().find(function(t){return t&&t.key===key;});
  return th?(th.label||th.key):key;
}
function infoSafePart(str){
  return String(str||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-');
}
function normalizeInfoSlide(slide,i){
  var themes=infoThemes();
  var fallbackKey='page-'+(i+1);
  var out=cloneJson(slide)||{};
  if(!out.key)out.key=fallbackKey;
  if(!out.title&&out.key==='cover')out.title=S.d.meta&&S.d.meta.title||'';
  if(out.body==null)out.body='';
  if(out.alt==null)out.alt='';
  var themeMatch=null;
  if(out.themeKey)themeMatch=themes.find(function(t){return t&&t.key===out.themeKey;})||null;
  if(!themeMatch&&out.key){
    themeMatch=themes.find(function(t){return t&&t.key===out.key;})||null;
  }
  if(!out.source){
    if(out.key==='cover'||out.img==='cards/voorkant.svg')out.source='cover';
    else if(themeMatch)out.source='theme';
    else out.source='custom';
  }
  if(out.source==='theme'&&!out.themeKey&&themeMatch)out.themeKey=themeMatch.key;
  if(out.source==='cover'){
    out.key=out.key||'cover';
    if(!out.img||/^cards\//.test(out.img))out.img='cards/voorkant.svg';
  }else if(out.source==='theme'){
    if(!out.themeKey&&themes[0])out.themeKey=themes[0].key;
    if(out.themeKey&&(!out.img||/^cards\//.test(out.img))){
      var th=themes.find(function(t){return t&&t.key===out.themeKey;});
      out.img=th?('cards/'+(th.card||(th.key+'.svg'))):out.img;
    }
  }else{
    if(!out.img||/^cards\//.test(out.img))out.img='';
  }
  return out;
}
function ensureIntroSlides(){
  S.d.intro=S.d.intro||{};
  if(!Array.isArray(S.d.intro.slides))S.d.intro.slides=[];
  if(!S.d.intro.slides.length){
    S.d.intro.slides.push({
      key:'cover',
      source:'cover',
      title:(S.d.meta&&S.d.meta.title)||'',
      body:((S.d.uitleg||{}).cover)||'',
      img:'cards/voorkant.svg',
      alt:(S.d.meta&&S.d.meta.title)||''
    });
  }
  S.d.intro.slides=S.d.intro.slides.map(function(sl,i){return normalizeInfoSlide(sl,i);});
  var coverIdx=S.d.intro.slides.findIndex(function(sl){return sl&&(sl.source==='cover'||sl.key==='cover');});
  if(coverIdx>0){
    var coverSlide=S.d.intro.slides.splice(coverIdx,1)[0];
    S.d.intro.slides.unshift(coverSlide);
  }
  if(S.d.intro.slides[0]){
    S.d.intro.slides[0].source='cover';
    S.d.intro.slides[0].key='cover';
    S.d.intro.slides[0].img='cards/voorkant.svg';
    if((S.d.uitleg||{}).cover!=null)S.d.intro.slides[0].body=(S.d.uitleg||{}).cover||'';
    if(!S.d.intro.slides[0].alt)S.d.intro.slides[0].alt=(S.d.meta&&S.d.meta.title)||'';
  }
  return S.d.intro.slides;
}
function getInfoAdminMode(){
  var intro=(S.d&&S.d.intro)||{};
  if(intro.mode==='slides'||intro.mode==='single')return intro.mode;
  return (Array.isArray(intro.slides)&&intro.slides.length>1)?'slides':'single';
}
function getInfoSlidePreviewPath(slide){
  var sl=normalizeInfoSlide(slide,0);
  if(sl.source==='cover')return cardAssetPathForSet(S.activeId,'voorkant.svg');
  if(sl.source==='theme'&&sl.themeKey)return infoThemeCardPath(sl.themeKey);
  if(!sl.img)return '';
  if(/^sets\//.test(sl.img))return sl.img;
  if(/^cards\//.test(sl.img))return 'sets/'+S.activeId+'/'+sl.img;
  return sl.img;
}
function getInfoSlideSourceLabel(slide){
  var sl=normalizeInfoSlide(slide,0);
  if(sl.source==='cover')return 'Koppeling: cover';
  if(sl.source==='theme'&&sl.themeKey)return 'Koppeling: '+infoThemeLabel(sl.themeKey);
  return sl.img?'Eigen afbeelding':'Klik of sleep afbeelding';
}
function getInfoSlideUploadTarget(slide,i,fileName){
  var ext=((String(fileName||'').match(/\.[a-z0-9]+$/i)||['.png'])[0]||'.png').toLowerCase();
  var base=infoSafePart((slide&&slide.key)||'')||infoSafePart((slide&&slide.title)||'')||('pagina-'+(i+1));
  return 'sets/'+S.activeId+'/info/'+base+ext;
}
function setInfoMode(mode){
  S.d.intro=S.d.intro||{};
  S.d.intro.mode=(mode==='slides')?'slides':'single';
  if(S.d.intro.mode==='slides')ensureIntroSlides();
  markDirty();
  rebuildInfo();
}
function setInfoSlideSource(i,source){
  var slides=ensureIntroSlides(),sl=slides[i],themes=infoThemes();
  if(!sl)return;
  sl.source=source;
  if(source==='cover'){
    sl.themeKey='';
    sl.img='cards/voorkant.svg';
    if(!sl.key||/^page-/.test(sl.key))sl.key='cover';
    if(!sl.alt)sl.alt=(S.d.meta&&S.d.meta.title)||'';
  }else if(source==='theme'){
    sl.themeKey=sl.themeKey||((themes[0]&&themes[0].key)||'');
    if(sl.themeKey){
      sl.img='cards/'+(((themes.find(function(t){return t.key===sl.themeKey;})||{}).card)||((sl.themeKey||'')+'.svg'));
      if(!sl.alt)sl.alt=infoThemeLabel(sl.themeKey);
    }
  }else{
    sl.themeKey='';
    if(/^cards\//.test(sl.img||''))sl.img='';
    if(sl.key==='cover'||themes.some(function(t){return t&&t.key===sl.key;}))sl.key='page-'+(i+1);
  }
  markDirty();
  rebuildInfo();
}
function setInfoSlideTheme(i,key){
  var slides=ensureIntroSlides(),sl=slides[i];
  if(!sl)return;
  sl.source='theme';
  sl.themeKey=key||'';
  if(sl.themeKey){
    var th=infoThemes().find(function(t){return t&&t.key===sl.themeKey;});
    sl.img='cards/'+((th&&th.card)||(sl.themeKey+'.svg'));
    if(!sl.alt)sl.alt=(th&&th.label)||sl.themeKey;
  }
  markDirty();
  rebuildInfo();
}
function setInfoSlideImage(i,path){
  var slides=ensureIntroSlides(),sl=slides[i];
  if(!sl)return;
  sl.source='custom';
  sl.themeKey='';
  sl.img=path;
  if(!sl.key||sl.key==='cover')sl.key='page-'+(i+1);
  markDirty();
}
function uploadInfoSlide(input,i){
  var file=input&&input.files&&input.files[0];
  if(!file)return;
  var slides=ensureIntroSlides(),sl=slides[i];
  if(!sl)return;
  var path=getInfoSlideUploadTarget(sl,i,file.name);
  setInfoSlideImage(i,path);
  if(/\.png$/i.test(file.name)){
    var reader=new FileReader();
    reader.onload=function(e){
      showCropModal(e.target.result,path,safeid(path),false,{folderName:'info',name:file.name,sourceDataUrl:e.target.result});
    };
    reader.readAsDataURL(file);
  }else if(/\.svg$/i.test(file.name)){
    uploadFile(file,path,safeid(path));
  }else{
    toast('Alleen SVG of PNG','red');
  }
  input.value='';
  rebuildInfo();
}
function dropInfoSlideFile(i,file){
  if(!file)return;
  var fake={files:[file],value:''};
  uploadInfoSlide(fake,i);
}
function buildInfoSlideSourceOptions(slide){
  var sl=normalizeInfoSlide(slide,0);
  var html='<option value="custom"'+(sl.source==='custom'?' selected':'')+'>Eigen afbeelding</option>'+
    '<option value="cover"'+(sl.source==='cover'?' selected':'')+'>Cover gebruiken</option>'+
    '<option value="theme"'+(sl.source==='theme'?' selected':'')+'>Thema koppelen</option>';
  return html;
}
function buildInfoSlideThumb(slide,i){
  var path=getInfoSlidePreviewPath(slide);
  var inputId='sl_file_'+i;
  var inner=path
    ? buildInfoThumb(path,false)
    : '<div class="slThumbPh"><svg viewBox="0 0 24 24"><path d="M7 7h10a2 2 0 0 1 2 2v6"/><path d="M7 17H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1"/><path d="m9 13 2-2 4 4 2-2 3 3"/><circle cx="14.5" cy="9.5" r="1.1"/></svg><span>Klik of sleep hier</span></div>';
  return '<label class="slThumbDrop" data-info-drop="'+i+'" for="'+inputId+'" title="Klik of sleep een SVG of PNG">'+inner+
    '<input type="file" id="'+inputId+'" accept=".svg,.png,image/svg+xml,image/png" onchange="uploadInfoSlide(this,'+i+')"></label>';
}
function buildInfoSlideCard(slide,i){
  var sl=normalizeInfoSlide(slide,i);sl._i=i;
  var linkSelect='<select class="fIn" id="sl_source_'+i+'" onchange="setInfoSlideSource('+i+',this.value)">'+buildInfoSlideSourceOptions(sl)+'</select>';
  var themeSelect=(sl.source==='theme'&&infoThemes().length)
    ? '<select class="fIn" id="sl_theme_'+i+'" style="margin-top:7px" onchange="setInfoSlideTheme('+i+',this.value)">'+
        infoThemes().map(function(th){return '<option value="'+esc(th.key)+'"'+(sl.themeKey===th.key?' selected':'')+'>'+esc(th.label||th.key)+'</option>';}).join('')+
      '</select>'
    : '';
  return '<div class="slCard" draggable="true" data-i="'+i+'">'+
    '<div class="slHead"><div class="slHdl">⋮⋮</div><div class="slNum">'+(i+1)+'</div><div class="slKey">'+esc(sl.key||('page-'+(i+1)))+'</div><div class="slImg">'+esc(getInfoSlideSourceLabel(sl))+'</div></div>'+
    '<div class="slThumbField">'+buildInfoSlideThumb(sl,i)+'<div>'+
      fR('','text','sl_title_'+i,sl.title||'','Titel')+
      '<div class="fRow"><label class="fLbl">Afbeelding</label>'+linkSelect+themeSelect+'<div class="slFieldNote">Gebruik cover, koppel een thema, of upload je eigen afbeelding via het kaartvlak.</div></div>'+
      fR('Alt-tekst','text','sl_alt_'+i,sl.alt||'','bijv. illustratie van gesprek')+
    '</div></div>'+
    '<div class="fRow" style="margin-top:8px"><label class="fLbl">Tekst</label>'+buildRichTextarea('sl_body_'+i,sl.body||'',4,'Omschrijf deze infosheetpagina')+'</div>'+
    '<div class="slActions"><div class="slFieldNote">Sleep de pagina om de volgorde te wijzigen.</div><button class="btnD" type="button" onclick="delSl('+i+')">Verwijder pagina</button></div>'+
  '</div>';
}
function buildInfoModeSwitch(mode){
  return '<div class="radioGroup" style="margin:2px 0 14px">'+
    '<button class="radioOpt'+(mode==='single'?' sel':'')+'" type="button" data-action="setIntroMode" data-v="single">Een pagina</button>'+
    '<button class="radioOpt'+(mode==='slides'?' sel':'')+'" type="button" data-action="setIntroMode" data-v="slides">Meerdere pagina&apos;s</button>'+
  '</div>';
}
function applyTextFormat(id,fmt){
  var ta=g(id);if(!ta)return;
  var val=ta.value,start=ta.selectionStart||0,end=ta.selectionEnd||0,sel=val.slice(start,end),next=val,ns=start,ne=end;
  if(fmt==='bold'||fmt==='italic'){
    var marks=fmt==='bold'?['**','**','vette tekst']:['*','*','schuine tekst'];
    var inner=sel||marks[2];
    next=val.slice(0,start)+marks[0]+inner+marks[1]+val.slice(end);
    ns=start+marks[0].length;ne=ns+inner.length;
  }else if(fmt==='bullets'){
    var blockStart=val.lastIndexOf('\n',Math.max(0,start-1))+1;
    var blockEnd=val.indexOf('\n',end);
    if(blockEnd<0)blockEnd=val.length;
    var block=val.slice(blockStart,blockEnd);
    if(!block){
      next=val.slice(0,start)+'- '+val.slice(end);
      ns=ne=start+2;
    }else{
      var lines=block.split('\n').map(function(line){
        return line.trim()?(/^\s*[-•]\s/.test(line)?line:'- '+line):line;
      }).join('\n');
      next=val.slice(0,blockStart)+lines+val.slice(blockEnd);
      ns=blockStart;ne=blockStart+lines.length;
    }
  }else if(fmt==='numbered'){
    var blockStart2=val.lastIndexOf('\n',Math.max(0,start-1))+1;
    var blockEnd2=val.indexOf('\n',end);
    if(blockEnd2<0)blockEnd2=val.length;
    var block2=val.slice(blockStart2,blockEnd2);
    if(!block2){
      next=val.slice(0,start)+'1. '+val.slice(end);
      ns=ne=start+3;
    }else{
      var idx=0;
      var lines2=block2.split('\n').map(function(line){
        if(!line.trim()) return line;
        idx+=1;
        return line.replace(/^\s*(?:[-•]|\d+\.)\s*/,'').replace(/^\s+/,'').replace(/^/ ,idx+'. ');
      }).join('\n');
      next=val.slice(0,blockStart2)+lines2+val.slice(blockEnd2);
      ns=blockStart2;ne=blockStart2+lines2.length;
    }
  }
  ta.value=next;
  ta.focus();
  ta.setSelectionRange(ns,ne);
  autoH(ta);
  ta.dispatchEvent(new Event('input',{bubbles:true}));
  syncFloatingTextBar();
}
function isTextToolbarTarget(el){
  return !!(el&&el.matches&&el.matches('textarea.richTa, textarea.bulkArea'));
}
function ensureTextTargetId(el){
  if(!el.id){RT.seed+=1;el.id='rt_auto_'+RT.seed;}
  return el.id;
}
function getFloatingTextBar(){return g('floatingTextBar');}
function syncFloatingTextBar(){
  var bar=getFloatingTextBar();
  var ta=RT.target;
  if(!bar||!ta||!isTextToolbarTarget(ta)) return;
  var id=ensureTextTargetId(ta);
  bar.querySelectorAll('[data-action="fmt"]').forEach(function(btn){btn.dataset.target=id;});
  var rect=ta.getBoundingClientRect();
  var bw=bar.offsetWidth||170,bh=bar.offsetHeight||42;
  var top=Math.max(12,rect.top-bh-10);
  if(top<16)top=Math.min(window.innerHeight-bh-12,rect.top+10);
  var left=Math.min(window.innerWidth-bw-12,Math.max(12,rect.left));
  bar.style.top=top+'px';
  bar.style.left=left+'px';
  bar.classList.remove('hidden');
}
function showFloatingTextBar(ta){
  if(!isTextToolbarTarget(ta)) return;
  RT.target=ta;
  syncFloatingTextBar();
}
function hideFloatingTextBar(force){
  var bar=getFloatingTextBar();
  if(force)RT.target=null;
  if(bar)bar.classList.add('hidden');
}


function updSl(i,f,v){var sl=S.d.intro&&S.d.intro.slides&&S.d.intro.slides[i];if(sl){sl[f]=v;markDirty();}}
function addSlide(){var slides=ensureIntroSlides();slides.push(normalizeInfoSlide({key:'page-'+(slides.length+1),source:'custom',title:'',body:'',img:'',alt:''},slides.length));S.d.intro.mode='slides';markDirty();rebuildInfo();}
function addSlFromTheme(){
  var themes=S.d.meta.themes||[];if(!themes.length){toast('Maak eerst thema\'s aan');return;}
  var slides=ensureIntroSlides();
  var ex=slides.filter(function(s){return s&&s.source==='theme';}).map(function(s){return s.themeKey||s.key;}),added=0;
  themes.forEach(function(th){if(ex.indexOf(th.key)>=0)return;slides.push(normalizeInfoSlide({key:th.key,source:'theme',themeKey:th.key,title:th.label||th.key,body:(S.d.uitleg&&S.d.uitleg[th.key])||'',img:'cards/'+(th.card||th.key+'.svg'),alt:th.label||th.key},slides.length));added++;});
  S.d.intro.mode='slides';
  if(added>0){markDirty();rebuildInfo();toast(added+' slide'+(added!==1?'s':'')+' toegevoegd');}
  else toast('Alle thema\'s hebben al een slide','amber');
}
function delSl(i){
  if(!(S.d.intro&&S.d.intro.slides))return;
  S.d.intro.slides.splice(i,1);
  if(!S.d.intro.slides.length)S.d.intro.slides=ensureIntroSlides().slice(0,1);
  S.d.intro.slides=S.d.intro.slides.map(function(sl,idx){return normalizeInfoSlide(sl,idx);});
  markDirty();rebuildInfo();
}
function rebuildInfo(){var pw=g('pw');if(pw)renderClPanel();}
// Keep alias for any lingering refs
function rebuildWelkomst(){rebuildInfo();}
function initSlDrag(){
  var list=g('slList');if(!list)return;
  list.querySelectorAll('.slCard').forEach(function(row){
    row.addEventListener('dragstart',function(e){dragSrc=this;this.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',this.dataset.i);});
    row.addEventListener('dragend',function(){this.classList.remove('dragging');list.querySelectorAll('.slCard').forEach(function(r){r.classList.remove('dragover');});});
    row.addEventListener('dragover',function(e){e.preventDefault();this.classList.add('dragover');});
    row.addEventListener('dragleave',function(){this.classList.remove('dragover');});
    row.addEventListener('drop',function(e){e.preventDefault();this.classList.remove('dragover');var from=parseInt(e.dataTransfer.getData('text/plain'),10),to=parseInt(this.dataset.i,10);if(from===to)return;var arr=S.d.intro.slides,item=arr.splice(from,1)[0];arr.splice(to,0,item);markDirty();rebuildInfo();});
  });
}

// ═══════════════════════════════════════════
// STEP: STIJL
// ═══════════════════════════════════════════
var LTPL=[
  {id:'carousel',nm:'Carrousel',ds:'Horizontale scroll.',t:'<svg viewBox="0 0 155 116" fill="none"><rect width="155" height="116" fill="#f3f6f7"/><rect x="6" y="6" width="143" height="11" rx="3.5" fill="#e8f4f6"/><rect x="6" y="24" width="24" height="76" rx="4.5" fill="#d8ecf0" opacity=".5"/><rect x="36" y="20" width="83" height="88" rx="7" fill="white" stroke="#b0d8e0" stroke-width="1.5"/><rect x="50" y="40" width="55" height="4.5" rx="2.25" fill="#4f8e9e" opacity=".45"/><rect x="56" y="50" width="43" height="2.5" rx="1.25" fill="#b0ccd4" opacity=".6"/><rect x="125" y="24" width="24" height="76" rx="4.5" fill="#d8ecf0" opacity=".5"/></svg>'},
  {id:'hero-grid',nm:'Hero + Grid',ds:'Grote kaart + grid.',t:'<svg viewBox="0 0 155 116" fill="none"><rect width="155" height="116" fill="#f3f6f7"/><rect x="6" y="6" width="143" height="9.5" rx="3.5" fill="#e8f4f6"/><rect x="6" y="21" width="143" height="46" rx="6" fill="white" stroke="#b0d8e0" stroke-width="1.5"/><rect x="17" y="33" width="56" height="4" rx="2" fill="#4f8e9e" opacity=".38"/><rect x="6" y="74" width="42" height="32" rx="4.5" fill="white" stroke="#b0d8e0"/><rect x="56" y="74" width="42" height="32" rx="4.5" fill="white" stroke="#b0d8e0"/><rect x="107" y="74" width="42" height="32" rx="4.5" fill="white" stroke="#b0d8e0"/></svg>'},
  {id:'grid',nm:'Puur Grid',ds:'Gelijkwaardig raster.',t:'<svg viewBox="0 0 155 116" fill="none"><rect width="155" height="116" fill="#f3f6f7"/><rect x="6" y="6" width="143" height="9.5" rx="3.5" fill="#e8f4f6"/><rect x="6" y="23" width="68" height="42" rx="5.5" fill="white" stroke="#b0d8e0" stroke-width="1.2"/><rect x="81" y="23" width="68" height="42" rx="5.5" fill="white" stroke="#b0d8e0" stroke-width="1.2"/><rect x="6" y="71" width="68" height="39" rx="5.5" fill="white" stroke="#b0d8e0" stroke-width="1.2"/><rect x="81" y="71" width="68" height="39" rx="5.5" fill="white" stroke="#b0d8e0" stroke-width="1.2"/></svg>'}
];
var VTPL=[
  {id:'classic',nm:'Klassiek',ds:'Flip, menu, uitleg.',t:'<svg viewBox="0 0 155 116" fill="none"><rect width="155" height="116" fill="#f3f6f7"/><rect x="36" y="4" width="83" height="15" rx="7.5" fill="white" stroke="#b0d8e0"/><rect x="48" y="8" width="38" height="3.5" rx="1.75" fill="#4f8e9e" opacity=".4"/><rect x="17" y="24" width="121" height="79" rx="8.5" fill="white" stroke="#b0d8e0" stroke-width="1.5"/><rect x="44" y="50" width="67" height="5" rx="2.5" fill="#4f8e9e" opacity=".37"/><rect x="52" y="61" width="51" height="3" rx="1.5" fill="#b0ccd4" opacity=".5"/></svg>'},
  {id:'compact',nm:'Compact',ds:'Kleinere kaarten.',t:'<svg viewBox="0 0 155 116" fill="none"><rect width="155" height="116" fill="#f3f6f7"/><rect x="36" y="4" width="83" height="15" rx="7.5" fill="white" stroke="#b0d8e0"/><rect x="6" y="26" width="72" height="54" rx="6.5" fill="white" stroke="#b0d8e0"/><rect x="86" y="26" width="63" height="54" rx="6.5" fill="#e8f4f6" stroke="#b0d8e0" opacity=".7"/><rect x="17" y="46" width="32" height="3.5" rx="1.75" fill="#4f8e9e" opacity=".33"/></svg>'}
];
var _stijlSubInit='layout'; // legacy placeholder

// Full pastel palette — base row only (all soft, airy tones)
var FULL_PAL=[
  // Row 1 — licht (9 kleuren)
  {n:'Zand licht',a:'#F7F4EF'},{n:'Groen licht',a:'#F2F7F4'},{n:'Paars licht',a:'#F4F1F8'},
  {n:'Roze licht',a:'#FAEEF2'},{n:'Oranje licht',a:'#FBEFE5'},{n:'Salie licht',a:'#EEF3E7'},
  {n:'Mint licht',a:'#ECF5F4'},{n:'Beige licht',a:'#F8EFE8'},{n:'Grijs licht',a:'#F3F4F8'},
  // Row 2 — basis pastels (18 kleuren)
  {n:'Saliegroen',a:'#CFE6DF'},{n:'Ijsblauw',a:'#DDE8F6'},{n:'Lavendel',a:'#E7E1F5'},
  {n:'Roze',a:'#F3DCE4'},{n:'Abrikoos',a:'#F8E4D2'},{n:'Olijf',a:'#E3E9D5'},
  {n:'Aqua',a:'#D6ECEA'},{n:'Warm zand',a:'#F3E6D8'},{n:'Leisteen',a:'#EEEFF4'},
  {n:'Lichtgeel',a:'#F7F3D0'},{n:'Lila',a:'#EBD9F5'},{n:'Poederroze',a:'#FADADD'},
  {n:'Salie',a:'#D4EAD0'},{n:'Hemelblauw',a:'#C8E4F8'},{n:'Koraal licht',a:'#FBDDD4'},
  {n:'Pistache',a:'#D8EDD4'},{n:'Botergeel',a:'#F9F0C8'},{n:'Lichtgroen',a:'#D5ECD5'},
  // Row 3 — diep/verzadigd (18 kleuren)
  {n:'Saliegroen diep',a:'#6FAE9A'},{n:'Koningsblauw',a:'#4C7FB8'},{n:'Indigo',a:'#6A63C2'},
  {n:'Framboos',a:'#C9657A'},{n:'Terra',a:'#C96A24'},{n:'Woud',a:'#6F9E4E'},
  {n:'Petrol',a:'#2F5F63'},{n:'Bruin',a:'#8E5E3B'},{n:'Grijsblauw',a:'#7A7F99'},
  {n:'Okergeel',a:'#C9A227'},{n:'Violet',a:'#7B5EA7'},{n:'Koraal',a:'#E06B5A'},
  {n:'Zeegroen',a:'#3A8C7A'},{n:'Leisteen diep',a:'#5A6478'},{n:'Bosbessen',a:'#6B4E8B'},
  {n:'Olijf diep',a:'#7A8C3A'},{n:'Koper',a:'#A0522D'},{n:'Nacht',a:'#2C3E6B'}
];
// Color families from kleuren.json — all 42 families, light/base/deep per family
// Correct 3-tier structure fixes Kleurtoon slider accuracy
var BRAND_FAMILIES=[
  // Greens and Mints
  {n:'Sage',        light:'#F7F4EF',base:'#CFE6DF',deep:'#6FAE9A'},
  {n:'Mint',        light:'#EFF7F1',base:'#CFE8D7',deep:'#67B38C'},
  {n:'Olijf',       light:'#EEF3E7',base:'#E3E9D5',deep:'#6F9E4E'},
  {n:'Mos',         light:'#EEF2E8',base:'#D5DFC9',deep:'#6E8E58'},
  // Blues and Aquas
  {n:'Blauw',       light:'#F2F7F4',base:'#DDE8F6',deep:'#4C7FB8'},
  {n:'Aqua',        light:'#EEF8F7',base:'#CFEDEA',deep:'#56AFA7'},
  {n:'Teal',        light:'#ECF5F4',base:'#D6ECEA',deep:'#2F5F63'},
  {n:'Inkt',        light:'#EEF1F8',base:'#CAD2E5',deep:'#32476B'},
  // Purples and Roses
  {n:'Violet',      light:'#F4F1F8',base:'#E7E1F5',deep:'#6A63C2'},
  {n:'Indigo',      light:'#F1F2FA',base:'#D9DDF2',deep:'#4F5FB2'},
  {n:'Roze',        light:'#FAEEF2',base:'#F3DCE4',deep:'#C9657A'},
  {n:'Berry',       light:'#F9EEF4',base:'#EFD4E0',deep:'#B45B82'},
  // Warm Neutrals
  {n:'Crème',       light:'#FCF7EA',base:'#F2E6C4',deep:'#D2AE58'},
  {n:'Tarwe',       light:'#F8F0D8',base:'#E9D39C',deep:'#C9A757'},
  {n:'Zand',        light:'#F8F4EA',base:'#E8DDC5',deep:'#C2A77A'},
  {n:'Warm grijs',  light:'#F6F2EE',base:'#DED6CF',deep:'#8F8177'},
  // Yellows and Golds
  {n:'Mosterd',     light:'#F6ECC8',base:'#DFC16D',deep:'#B28727'},
  {n:'Goud',        light:'#FBF1D9',base:'#E8C97A',deep:'#C99A2E'},
  {n:'Honing',      light:'#FBF3DE',base:'#E6C97A',deep:'#B98C2E'},
  {n:'Oker',        light:'#F7ECD2',base:'#D9B85F',deep:'#A88733'},
  {n:'Boter',       light:'#FFF7D9',base:'#F3E39B',deep:'#D2BB58'},
  {n:'Vanille',     light:'#FFF8E8',base:'#F4E8BE',deep:'#D7BC72'},
  {n:'Zacht citroen',light:'#FFF9D8',base:'#F0E58F',deep:'#C9B14C'},
  // Apricot and Earth
  {n:'Abrikoos',    light:'#FBEFE5',base:'#F8E4D2',deep:'#C96A24'},
  {n:'Terracotta',  light:'#FCF0EA',base:'#F1D6C8',deep:'#BF6E43'},
  {n:'Klei',        light:'#FBEEE8',base:'#E8C1AF',deep:'#B96D4F'},
  {n:'Tan',         light:'#F8EFE8',base:'#F3E6D8',deep:'#8E5E3B'},
  {n:'Perzik',      light:'#FFF1EA',base:'#F6D3C2',deep:'#D89273'},
  {n:'Blush',       light:'#FDF0F4',base:'#F2CEDA',deep:'#C87E96'},
  {n:'Zacht koraal',light:'#FDEEE8',base:'#F3C7B9',deep:'#D97F66'},
  // Soft Contrasts
  {n:'Slate',       light:'#F3F4F8',base:'#EEEFF4',deep:'#7A7F99'},
  {n:'Steen',       light:'#F5F3F1',base:'#DFD9D2',deep:'#9A8F84'},
  {n:'Rook',        light:'#F2F4F7',base:'#D8DEE7',deep:'#75839A'},
  {n:'Navy',        light:'#EFF2F8',base:'#C9D3E6',deep:'#2C3E63'},
  {n:'Koel grijs',  light:'#F2F5F8',base:'#D4DCE5',deep:'#7B8797'},
  {n:'Mist',        light:'#F5F8FA',base:'#D9E3EA',deep:'#8194A3'},
  {n:'Zilverblauw', light:'#F1F5F9',base:'#CED9E5',deep:'#6F849D'},
  // Deep Accents
  {n:'Houtskool',   light:'#EFF1F3',base:'#C8CDD2',deep:'#3C4650'},
  {n:'Pruim',       light:'#F4EFF7',base:'#DCCFE5',deep:'#6F4F7E'},
  {n:'Woud',        light:'#EEF4EF',base:'#C8D9CC',deep:'#365C45'},
  {n:'Aubergine',   light:'#F5EFF4',base:'#D9CBD7',deep:'#5B4456'},
  {n:'Zacht rood',  light:'#FDEEEE',base:'#F2C7C7',deep:'#C96868'}
];
function paletteFromFamilies(tones){
  var out=[];
  BRAND_FAMILIES.forEach(function(f){
    tones.forEach(function(t){
      if(f[t])out.push({n:f.n+' '+t,a:f[t]});
    });
  });
  return out;
}
var STYLE_ACCENT_PAL=paletteFromFamilies(['light','base']);
// Background palette rows — derived from BRAND_FAMILIES (all 42 families)
var BP_LIGHT=BRAND_FAMILIES.map(function(f){return {n:f.n+' licht',a:f.light};});
var BP_BASE=BRAND_FAMILIES.map(function(f){return {n:f.n,a:f.base};});
var BP_DEEP=BRAND_FAMILIES.map(function(f){return {n:f.n+' diep',a:f.deep};});
// Category names (matching JSON group order) — used for palette labels
var BRAND_CAT_NAMES=['Groenen & Mints','Blauw & Aqua','Paars & Roze','Warm Neutraal','Gelen & Goud','Abrikoos & Aarde','Zachte Contrasten','Diepe Accenten'];
// Background picker: 7 quick + 8 × 3 rows (licht/basis/diep per JSON category)
var BRAND_FAM_BG=(function(){
  var fam=BRAND_FAMILIES;
  var quick=[
    {n:'Wit',          a:'#FFFFFF'},
    {n:'Mintgroen',    a:'#CFE6D8'},
    {n:'Hemelblauw',   a:'#CAD6EF'},
    {n:'Lavendel',     a:'#E7E1F5'},
    {n:'Perzik',       a:'#F8E4D2'},
    {n:'Teal',         a:'#A8D8D6'},
    {n:'Botergeel',    a:'#F4E2A5'},
    {n:'Roze',         a:'#F2C8D2'}
  ];
  var bounds=[0,4,8,12,16,23,30,37,42];
  var rows=[quick];
  for(var b=0;b<bounds.length-1;b++){
    var g=fam.slice(bounds[b],bounds[b+1]);
    rows.push(g.map(function(f){return {n:f.n+' licht',a:f.light};}));
    rows.push(g.map(function(f){return {n:f.n,a:f.base};}));
    rows.push(g.map(function(f){return {n:f.n+' diep',a:f.deep};}));
  }
  return rows;
})();
// Generate expanded family shades (light → deep) from a base deep color
function famShades(deepHex,name){
  var sh=[];
  [0.90,0.78,0.64,0.50,0.35,0.18].forEach(function(t,i){sh.push({n:name+' '+(i+1),a:mixHexAdmin(deepHex,'#ffffff',t)});});
  sh.push({n:name,a:deepHex});
  [0.20,0.40,0.58].forEach(function(t,i){sh.push({n:name+' diep '+(i+1),a:mixHexAdmin(deepHex,'#1a1a2e',t)});});
  return sh;
}
// Map each deep color to its family name for expand support
var BP_DEEP_NAMES=['Mint','Blauw','Lavendel','Roze','Oranje','Groen','Petrol','Bruin','Grijs'];
function hexToRgbAdmin(hex){
  var h=String(hex||'').replace('#','').trim();
  if(h.length===3)h=h.split('').map(function(ch){return ch+ch;}).join('');
  if(!/^[0-9a-fA-F]{6}$/.test(h))return null;
  return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};
}
function rgbToHexAdmin(r,g,b){
  function part(v){var s=Math.max(0,Math.min(255,Math.round(v))).toString(16);return s.length<2?'0'+s:s;}
  return '#'+part(r)+part(g)+part(b);
}
function mixHexAdmin(a,b,t){
  var ra=hexToRgbAdmin(a),rb=hexToRgbAdmin(b);
  if(!ra||!rb)return a||b||'#000000';
  return rgbToHexAdmin(
    ra.r+(rb.r-ra.r)*t,
    ra.g+(rb.g-ra.g)*t,
    ra.b+(rb.b-ra.b)*t
  );
}
function uniquePaletteItems(items){
  var seen={};
  return items.filter(function(item){
    var key=String(item.a||'').toLowerCase();
    if(!key||seen[key])return false;
    seen[key]=1;
    return true;
  });
}
function buildExpandedPalette(baseItems){
  var variants=[];
  baseItems.forEach(function(item){
    var base=item.a;
    [0.08,0.16,0.24,0.34,0.46].forEach(function(t,i){
      variants.push({n:item.n+' licht '+(i+1),a:mixHexAdmin(base,'#ffffff',t)});
    });
    variants.push({n:item.n,a:base});
    [0.10,0.20,0.32,0.44,0.58].forEach(function(t,i){
      variants.push({n:item.n+' diep '+(i+1),a:mixHexAdmin(base,'#1a1a2e',t)});
    });
  });
  return uniquePaletteItems(variants);
}
// Replaced by BRAND_PAL_ROWS_TC / BRAND_PAL_ROWS_BG
function stylePreviewCandidates(meta){
  var themes=(meta&&meta.themes)||[];
  var files=['kaart.svg'];
  themes.forEach(function(t){
    var file=t.card||(t.key+'.svg');
    if(file&&files.indexOf(file)===-1)files.push(file);
  });
  if(files.indexOf('voorkant.svg')===-1)files.push('voorkant.svg');
  return files;
}
function stylePreviewAsset(meta){
  var opts=stylePreviewOptions(meta);
  var sel=opts.find(function(o){return o.key===STYLE_PREVIEW_KEY;})||opts[0]||{file:'voorkant.svg'};
  var files=[sel.file].concat(opts.map(function(o){return o.file;}));
  var seen={};
  files=files.filter(function(file){if(!file||seen[file])return false;seen[file]=1;return true;});
  for(var i=0;i<files.length;i++){
    var file=files[i];
    var cached=cachedCardAssetForFile(S.activeId,file);
    if(cached&&cached.asset&&cached.asset.dataUrl)return {file:file,asset:cached.asset};
  }
  return {file:files[0]||'voorkant.svg',asset:null};
}
function stylePreviewDisplayFile(file){
  return file==='voorkant.svg'?'cover.svg':(file||'kaart.svg');
}
function stylePreviewOptions(meta){
  var themes=(meta&&meta.themes)||[];
  var opts=[{key:'cover',label:'Cover',file:'voorkant.svg'}];
  if(!themes.length){
    opts.push({key:'algemeen',label:'Kaart',file:'kaart.svg'});
    return opts;
  }
  themes.forEach(function(t,i){
    opts.push({key:t.key,label:t.label||('Thema '+(i+1)),file:t.card||(t.key+'.svg')});
  });
  return opts;
}
function infoSlideOptions(meta){
  // All possible slides: cover + themes + custom pages
  var themes=(meta&&meta.themes)||[];
  var infoPages=(meta&&meta.infoPages)||[];
  var excluded=(meta&&meta.infoExcluded)||[];
  var all=[{key:'cover',label:'Cover',file:'voorkant.svg',isCustom:false}];
  themes.forEach(function(t,i){
    all.push({key:t.key,label:t.label||('Thema '+(i+1)),file:t.card||(t.key+'.svg'),isCustom:false});
  });
  infoPages.forEach(function(p){
    all.push({key:p.key,label:p.label||'Pagina',file:'info_'+p.key+'.svg',isCustom:true});
  });
  return all.map(function(o){return Object.assign({},o,{excluded:excluded.indexOf(o.key)>=0});});
}
function removeInfoSlide(key){
  var meta=S.d.meta||{};
  meta.infoExcluded=meta.infoExcluded||[];
  if(meta.infoExcluded.indexOf(key)<0)meta.infoExcluded.push(key);
  markDirty();
  if(INFO_SLIDE_KEY===key){
    var opts=infoSlideOptions(meta).filter(function(o){return !o.excluded;});
    INFO_SLIDE_KEY=(opts[0]||{}).key||'cover';
  }
  buildStijlPreserveBg(g('pw'));
}
function addInfoSlide(key){
  var meta=S.d.meta||{};
  meta.infoExcluded=(meta.infoExcluded||[]).filter(function(k){return k!==key;});
  markDirty();
  INFO_SLIDE_KEY=key;
  buildStijlPreserveBg(g('pw'));
}
function infoSlideCardHtml(opt,selectedKey){
  var isSelected=opt.key===selectedKey;
  var u=S.d.uitleg||{};
  var hasText=String(u[opt.key]||'').trim().length>0;
  // Icons (matching styleSlideCardHtml)
  var excludeIcon='<svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';
  var uploadIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v10"/><path d="M8.5 9 12 5.5 15.5 9"/><path d="M7 18.5h10"/></svg>';
  var cropIcon='<svg viewBox="0 0 24 24"><path d="M6 3v12a3 3 0 0 0 3 3h12"/><path d="M8 16L16 8"/><path d="M9 8h8v8"/></svg>';
  var deleteIcon='<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12h10l1-12"/><path d="M9 7V4h6v3"/></svg>';
  var pictureIcon='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.3"/><path d="M5 16l4.5-4.5 3 3 2.8-2.8L19 16"/></svg>';
  var isCover=opt.key==='cover';
  var isTheme=!isCover&&!opt.isCustom;
  var cardPath=opt.isCustom?cardAssetPathForSet(S.activeId,'info_'+opt.key+'.svg'):(!isCover?styleCardPathForKey(opt.key):styleCardPathForKey('cover'));
  var cardSid=safeid(cardPath);
  var hit=((cachedCardAssetForFile(S.activeId,opt.file)||{}).asset)||null;
  var cardLabel=isCover?'Cover':(opt.label||'Pagina');
  var customInputValue=opt.isCustom
    ?((opt.label&& !/^Pagina(?:\s+\d+)?$/i.test(String(opt.label).trim()))?String(opt.label):'')
    :'';
  // Thumbnail
  var thumbContent=hit&&hit.dataUrl
    ?'<img src="'+hit.dataUrl+'" alt="'+esc(cardLabel)+'">'
    :'<div class="stijlSlidePlaceholder">'+pictureIcon+'<span>'+(isCover||opt.isCustom?'Achtergrond toevoegen':'Afbeelding kiezen')+'</span></div>';
  var isDraggable=!opt.excluded&&!isCover;
  // Actions – identical to styleSlideCardHtml + include/exclude toggle
  var uploadLbl='<label class="stijlSlideUpload" title="SVG kiezen" onclick="event.stopPropagation()">'+uploadIcon+'<input type="file" accept=".svg,image/svg+xml" onclick="event.stopPropagation()" onchange="if(this.files&&this.files[0])uploadFile(this.files[0],\''+esc(cardPath)+'\',\''+cardSid+'\');this.value=\'\'"></label>';
  var cropBtn=hit&&hit.dataUrl?'<button class="stijlSlideMiniBtn" type="button" title="Bijsnijden" onclick="event.stopPropagation();recropStyleSlide(\''+esc(cardPath)+'\',\''+cardSid+'\')">'+cropIcon+'</button>':'';
  // Delete: cover image → delete file; custom page → delete page; themes are only excluded (not deleted) from info slider
  var deleteBtn=
    (isCover&&hit&&hit.dataUrl?'<button class="stijlSlideMiniBtn danger" type="button" title="Afbeelding verwijderen" onclick="event.stopPropagation();deleteStyleSlideFile(\''+esc(cardPath)+'\',\''+cardSid+'\')">'+deleteIcon+'</button>':'')
    +(opt.isCustom?'<button class="stijlSlideMiniBtn danger" type="button" title="Pagina verwijderen" onclick="event.stopPropagation();deleteInfoCustomPage(\''+esc(opt.key)+'\')">'+deleteIcon+'</button>':'');
  // Include/exclude toggle
  var toggleBtn=opt.excluded
    ?'<button class="infoSlideToggle add" type="button" title="Toevoegen aan infosheet" onclick="event.stopPropagation();addInfoSlide(\''+esc(opt.key)+'\')">+</button>'
    :'<button class="stijlSlideMiniBtn" type="button" title="Verbergen in infosheet" onclick="event.stopPropagation();removeInfoSlide(\''+esc(opt.key)+'\')">'+excludeIcon+'</button>';
  var actionsHtml='<div class="stijlSlideActions">'+uploadLbl+cropBtn+deleteBtn+toggleBtn+'</div>';
  // Tile body: editable name for themes and custom pages
  var nameHtml=isTheme
    ?'<div class="stijlSlideNameEditWrap"><div class="stijlSlideName stijlSlideNameLabel" title="Naam wijzigen" onmousedown="event.stopPropagation()" onclick="event.stopPropagation();beginStyleSlideNameEdit(\''+esc(opt.key)+'\',true)">'+esc(cardLabel)+'</div><input class="stijlSlideName stijlSlideNameInput" type="text" value="'+esc(cardLabel)+'" placeholder="Thema" title="Naam wijzigen" draggable="false" onmousedown="event.stopPropagation()" onclick="event.stopPropagation()" onblur="endStyleSlideNameEdit(this)" onkeydown="event.stopPropagation();if(event.key===\'Enter\'){event.preventDefault();this.blur();}if(event.key===\'Escape\'){event.preventDefault();this.blur();}" oninput="event.stopPropagation();updateStyleThemeNameByKey(\''+esc(opt.key)+'\',this.value)"></div>'
    :opt.isCustom
      ?'<div class="stijlSlideNameEditWrap"><div class="stijlSlideName stijlSlideNameLabel" title="Naam wijzigen" onmousedown="event.stopPropagation()" onclick="event.stopPropagation();beginStyleSlideNameEdit(\''+esc(opt.key)+'\',true)">'+esc(cardLabel)+'</div><input class="stijlSlideName stijlSlideNameInput" type="text" value="'+esc(customInputValue)+'" placeholder="Naam" title="Naam wijzigen" draggable="false" onmousedown="event.stopPropagation()" onclick="event.stopPropagation()" onblur="endStyleSlideNameEdit(this)" onkeydown="event.stopPropagation();if(event.key===\'Enter\'){event.preventDefault();this.blur();}if(event.key===\'Escape\'){event.preventDefault();this.blur();}" oninput="event.stopPropagation();updateInfoCustomPageLabel(\''+esc(opt.key)+'\',this.value)"></div>'
      :'<div class="stijlSlideName">'+esc(cardLabel)+'</div>';
  return '<div class="stijlSlideCard infoSlideCard'+(isSelected?' sel':'')+(opt.excluded?' info-excluded':'')+(hasText?' has-info':'')+'" data-info-key="'+esc(opt.key)+'"'
    +(isDraggable?' draggable="true"':'')
    +' onclick="setInfoPreviewKey(\''+esc(opt.key)+'\')" title="'+esc(cardLabel)+'">'
    +'<div class="stijlSlideThumb">'+thumbContent+actionsHtml+'</div>'
    +'<div class="stijlSlideBody">'+nameHtml+'<div class="stijlSlideInfoDot" title="'+(hasText?'Heeft infotekst':'Nog geen infotekst')+'"></div></div>'
  +'</div>';
}
function stylePreviewState(meta){
  var opts=stylePreviewOptions(meta);
  var sel=opts.find(function(o){return o.key===STYLE_PREVIEW_KEY;})||opts[0]||{key:'cover',label:'Cover',file:'voorkant.svg'};
  STYLE_PREVIEW_KEY=sel.key;
  var hit=((cachedCardAssetForFile(S.activeId,sel.file)||{}).asset)||null;
  var previews=((((meta||{}).ui||{}).previewTexts)||{});
  if(sel.key==='cover'&&cardBuildModeForKey(meta,'cover')==='self')hit=null;
  if(sel.key==='algemeen'&&cardBuildModeForKey(meta,'algemeen')==='self')hit=null;
  return {
    options:opts,
    selected:sel,
    file:sel.file,
    displayFile:stylePreviewDisplayFile(sel.file),
    asset:hit&&hit.dataUrl?hit:null,
    sampleTxt:sel.key==='cover'?'':String(previews[sel.key]==='Voorkant tekst'?'':(previews[sel.key]||''))
  };
}
function previewTextStore(){
  var meta=S.d.meta||{};
  meta.ui=meta.ui||{};
  meta.ui.previewTexts=meta.ui.previewTexts||{};
  return meta.ui.previewTexts;
}
function updateStylePreviewText(key,val){
  var store=previewTextStore();
  store[key]=val;
  markDirty();
  if(STYLE_PREVIEW_KEY===key){
    var front=g('stijlCardTxt');
    if(front)front.innerHTML=val?esc(val):'';
  }
}
function styleThemeIndexByKey(key){
  var themes=((S.d||{}).meta||{}).themes||[];
  for(var i=0;i<themes.length;i++){if(themes[i].key===key)return i;}
  return -1;
}
function styleCardPathForKey(key){
  if(key==='cover')return cardAssetPathForSet(S.activeId,'voorkant.svg');
  if(key==='algemeen')return cardAssetPathForSet(S.activeId,'kaart.svg');
  var idx=styleThemeIndexByKey(key);
  var th=idx>=0?(((S.d||{}).meta||{}).themes||[])[idx]:null;
  return th?cardAssetPathForSet(S.activeId,(th.card||(th.key+'.svg'))):'';
}
function assignStyleFiles(files,startKey){
  var svgFiles=Array.from(files||[]).filter(function(file){return !!(file&&/\.svg$/i.test(file.name||''));});
  if(!svgFiles.length){toast('Alleen SVG','red');return;}
  var keys=stylePreviewOptions((S.d||{}).meta||{}).map(function(opt){return opt.key;});
  var startIdx=Math.max(0,keys.indexOf(startKey||STYLE_PREVIEW_KEY||'cover'));
  svgFiles.forEach(function(file,idx){
    var key=keys[startIdx+idx];
    if(!key){
      addTh();
      var themes=(((S.d||{}).meta||{}).themes)||[];
      var th=themes[themes.length-1];
      if(!th)return;
      key=th.key;
      keys=stylePreviewOptions((S.d||{}).meta||{}).map(function(opt){return opt.key;});
    }
    var path=styleCardPathForKey(key);
    if(!path)return;
    if(idx===0)STYLE_PREVIEW_KEY=key;
    uploadFile(file,path,safeid(path));
  });
}
var COVER_PRESET_LIBRARY=[
  {id:'split',label:'Split'},
  {id:'badge',label:'Badge'},
  {id:'wave-band',label:'Wave'},
  {id:'corner-fold',label:'Hoek'},
  {id:'orbit',label:'Orbit'},
  {id:'band',label:'Band'}
];
function svgDataUrlFromMarkup(svg){
  return 'data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(String(svg||''))));
}
function cardPresetPalette(baseHex,accentHex){
  var bgBase=normalizeHexInput(baseHex)||'#F8F9F9';
  var accent=normalizeHexInput(accentHex)||'#67C5BB';
  return {
    bg:bgBase,
    paper:mixHexAdmin(bgBase,'#ffffff',0.52),
    accent:accent,
    accentSoft:mixHexAdmin(accent,'#ffffff',0.24),
    accentMist:mixHexAdmin(accent,'#ffffff',0.52),
    accentDeep:mixHexAdmin(accent,'#1a1a2e',0.18),
    ink:mixHexAdmin(accent,'#1a1a2e',0.56),
    shadow:mixHexAdmin(accent,'#1a1a2e',0.34)
  };
}
function cardPresetSvg(id,baseHex,accentHex){
  var p=cardPresetPalette(baseHex,accentHex);
  if(id==='split')return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 550" fill="none"><rect width="850" height="550" rx="36" fill="'+p.bg+'"/><path d="M0 550V194l292-88 264 44v400H0Z" fill="'+p.accent+'"/><path d="M556 550V150l294-56v456H556Z" fill="'+p.accentDeep+'"/><path d="M0 270 292 182l264 44v42l-264-40L0 312v-42Z" fill="'+p.accentSoft+'"/></svg>';
  if(id==='badge')return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 550" fill="none"><rect width="850" height="550" rx="36" fill="'+p.paper+'"/><rect x="72" y="96" width="706" height="358" rx="42" fill="'+p.bg+'"/><circle cx="620" cy="217" r="126" fill="'+p.accent+'"/><circle cx="686" cy="274" r="48" fill="'+p.ink+'"/><path d="M122 418c50-56 98-79 151-79 45 0 83 12 116 37 18 14 34 29 70 29 30 0 54-11 80-23 31-14 63-29 106-29 62 0 106 30 132 94H122v-29Z" fill="'+p.accentMist+'"/></svg>';
  if(id==='wave-band')return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 550" fill="none"><rect width="850" height="550" rx="36" fill="'+p.bg+'"/><path d="M0 148c105-44 209-67 328-67 154 0 246 38 356 81 55 22 106 36 166 43v111c-58-9-111-25-169-47-108-41-195-76-351-76-126 0-224 22-330 68V148Z" fill="'+p.accentMist+'"/><path d="M0 324c78-17 149-38 242-38 115 0 193 30 279 56 79 24 138 37 213 37 39 0 78-5 116-15v186H0V324Z" fill="'+p.accent+'"/><path d="M0 437c75-18 140-28 221-28 96 0 166 18 250 43 86 25 153 39 245 39 45 0 89-3 134-12v71H0v-113Z" fill="'+p.accentDeep+'"/></svg>';
  if(id==='corner-fold')return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 550" fill="none"><rect width="850" height="550" rx="36" fill="'+p.paper+'"/><path d="M0 0h322l-74 116c-43 66-72 132-72 199 0 64 24 119 72 170L332 550H0V0Z" fill="'+p.accent+'"/><path d="M850 0v226l-76-43c-53-30-105-46-160-46-91 0-168 45-236 124L292 352H0V0h850Z" fill="'+p.accentMist+'"/><path d="M850 550H486l91-105c47-55 71-110 71-168 0-67-31-127-93-182L463 0h387v550Z" fill="'+p.accentDeep+'"/></svg>';
  if(id==='orbit')return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 550" fill="none"><rect width="850" height="550" rx="36" fill="'+p.bg+'"/><ellipse cx="256" cy="408" rx="195" ry="104" fill="'+p.accentMist+'"/><circle cx="639" cy="180" r="137" fill="'+p.accent+'"/><circle cx="696" cy="233" r="46" fill="'+p.ink+'"/><circle cx="190" cy="161" r="38" fill="'+p.shadow+'"/><circle cx="286" cy="139" r="21" fill="'+p.accentSoft+'"/><path d="M70 451c58-30 124-46 197-46 88 0 154 20 231 44 78 24 140 38 223 38 41 0 84-4 129-12v75H70v-99Z" fill="'+p.accent+'"/></svg>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 550" fill="none"><rect width="850" height="550" rx="36" fill="'+p.paper+'"/><rect x="0" y="118" width="850" height="112" fill="'+p.accent+'"/><rect x="0" y="230" width="850" height="68" fill="'+p.accentDeep+'"/><rect x="0" y="298" width="850" height="100" fill="'+p.accentSoft+'"/><path d="M514 0h336v140c-68 24-123 35-176 35-76 0-131-20-160-66V0Z" fill="'+p.accentMist+'"/></svg>';
}
function cardPresetLibraryHtml(previewKey,baseHex,accentHex){
  if(previewKey!=='cover')return '';
  return '<div class="stijlPresetWrap">'+
    '<div class="stijlPresetHead"><div class="stijlPresetTitle"><div class="sLbl">Cover presets</div><strong>Kies een uitgesproken start voor je cover</strong></div><div class="stijlPresetNote">Sterkere basisbeelden die meebewegen met je kleuren.</div></div>'+
    '<div class="stijlPresetGrid">'+COVER_PRESET_LIBRARY.map(function(item){
      var dataUrl=svgDataUrlFromMarkup(cardPresetSvg(item.id,baseHex,accentHex));
      return '<button class="stijlPresetBtn" type="button" title="'+esc(item.label)+'" onclick="applyCardPreset(\''+esc(item.id)+'\',\''+esc(previewKey)+'\',\''+esc(baseHex)+'\',\''+esc(accentHex||'')+'\')"><span class="stijlPresetThumb"><img src="'+dataUrl+'" alt=""></span><span class="stijlPresetName">'+esc(item.label)+'</span></button>';
    }).join('')+'</div>'+
  '</div>';
}
function applyCardPreset(presetId,key,baseHex,accentHex){
  var previewKey=key||STYLE_PREVIEW_KEY||'cover';
  var path=styleCardPathForKey(previewKey);
  if(!path){toast('Geen kaart geselecteerd','amber');return;}
  var base=normalizeHexInput(baseHex)||cardBgBaseForKey(S.d.meta,previewKey)||'#F8F9F9';
  var accent=normalizeHexInput(accentHex)||(((S.d.meta||{}).cssVars||{})['--pk-set-accent'])||'#67C5BB';
  var preset=(COVER_PRESET_LIBRARY.find(function(item){return item.id===presetId;})||{}).label||'Preset';
  var dataUrl=svgDataUrlFromMarkup(cardPresetSvg(presetId,base,accent));
  STYLE_PREVIEW_KEY=previewKey;
  uploadDataUrlToPath(path,dataUrl,'Preset: '+preset,function(){
    setCardBuildMode(previewKey,'image');
    setTimeout(function(){loadCardPreviews();},50);
  }).then(function(){
    toast('Preset toegevoegd','green');
  }).catch(function(err){
    toast('Fout: '+err.message,'red');
  });
}
function updateStyleSetName(val){
  S.d.meta.title=val;
  var idx=S.sets.findIndex(function(s){return s.id===S.activeId;});
  if(idx>=0)S.sets[idx].title=val;
  markDirty();
  var titleEl=g('editorSetTitle');
  if(titleEl){if(titleEl.tagName==='INPUT')titleEl.value=val||S.activeId;else titleEl.textContent=val||S.activeId;}
  syncEditorHeaderWidths();
}
function updateStyleThemeName(idx,val){
  if(idx<0)return;
  var meta=S.d.meta||{};
  var key=S.d.meta.themes[idx].key;
  S.d.meta.themes[idx].label=val;
  markDirty();
  Array.prototype.slice.call(document.querySelectorAll('.stijlSlideCard[data-style-preview-key]')).forEach(function(card){
    if(card.dataset.stylePreviewKey!==key)return;
    card.dataset.stylePreviewKey=key;
    card.setAttribute('onclick','setStylePreviewKey(\''+esc(key)+'\')');
    var newLabel=val||('Thema '+(idx+1));
    var labelEl=card.querySelector('.stijlSlideNameLabel');
    if(labelEl)labelEl.textContent=newLabel;
    Array.prototype.slice.call(card.querySelectorAll('.stijlSlideNameInput')).forEach(function(nameEl){
      if(document.activeElement!==nameEl)nameEl.value=newLabel;
    });
    Array.prototype.slice.call(card.querySelectorAll('.stijlSlideName:not(.stijlSlideNameInput):not(.stijlSlideNameLabel)')).forEach(function(nameEl){
      nameEl.textContent=newLabel;
    });
  });
  var stijlInput=g('stijlThemeInput');
  if(stijlInput&&document.activeElement!==stijlInput)stijlInput.value=val;
  var qInput=document.querySelector('.questionsThemeInput');
  if(qInput&&document.activeElement!==qInput)qInput.value=val;
  var thEl=g('editorThemeTitle');
  if(thEl){if(thEl.tagName==='INPUT'){if(document.activeElement!==thEl)thEl.value=val||('Thema '+(idx+1));}else if(thEl.textContent)thEl.textContent=val||('Thema '+(idx+1));}
  var titles=((meta.ui||{}).infoMidTitles)||{};
  if(!Object.prototype.hasOwnProperty.call(titles,key))syncInfoMidTitleEls(key);
  if(STYLE_PREVIEW_KEY===key||INFO_SLIDE_KEY===key)updateEditorHeaderTheme();
  syncEditorHeaderWidths();
}
function updateStyleThemeNameByKey(key,val){
  var meta=S.d.meta||{};
  var idx=(meta.themes||[]).map(function(t){return t.key;}).indexOf(key);
  if(idx>=0)updateStyleThemeName(idx,val);
}
function beginStyleSlideNameEdit(key,isInfo){
  var selector=isInfo?'.infoSlideCard[data-info-key="'+key+'"]':'.stijlSlideCard[data-theme-key="'+key+'"]';
  var card=document.querySelector(selector);
  if(!card)return;
  if(!card.classList.contains('sel')){
    if(isInfo)setInfoPreviewKey(key);
    else setStylePreviewKey(key);
    return;
  }
  card.classList.add('editing-name');
  var input=card.querySelector('.stijlSlideNameInput');
  if(input){
    setTimeout(function(){
      input.focus();
      input.select();
    },0);
  }
}
function endStyleSlideNameEdit(input){
  if(!input)return;
  var card=input.closest('.stijlSlideCard');
  if(card)card.classList.remove('editing-name');
}
function addThemeFromStyle(){
  addTh();
  var themes=S.d.meta.themes||[];
  var th=themes[themes.length-1];
  if(th){
    var previews=previewTextStore();
    previews[th.key]='';
  }
  if(th)STYLE_PREVIEW_KEY=th.key;
  buildStijlPreserveBg(g('pw'));
  setTimeout(function(){
    var input=g('stijlThemeInput');
    if(input){input.focus();input.select();}
  },40);
}
function recropStyleSlide(path,sid){
  var ca=CC[path];
  if(ca&&ca.dataUrl)showCropModal(ca.cropSource||ca.dataUrl,path,sid,false,{sourceDataUrl:ca.cropSource||ca.dataUrl,cropState:ca.cropState||null,name:path.split('/').pop(),folderName:'cards'});
}
function deleteStyleSlideFile(path,sid){
  deleteCardFile(path,sid);
}
function uniqueThemeKey(base){
  var themes=((S.d||{}).meta||{}).themes||[];
  var key=(String(base||'thema').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,''))||'thema';
  var next=key,n=2;
  while(themes.some(function(t){return t&&t.key===next;}))next=key+'-'+n++;
  return next;
}
function promoteAlgemeenToTheme(label){
  label=(label||'').trim();
  if(!label)return;
  var meta=S.d.meta||{};
  meta.themes=meta.themes||{};
  if(!Array.isArray(meta.themes))meta.themes=[];
  var key=uniqueThemeKey(label);
  var newTheme={key:key,label:label,card:key+'.svg'};
  meta.themes.unshift(newTheme);
  S.d.questions=S.d.questions||{};
  S.d.questions[key]=cloneJson(S.d.questions['algemeen']||[]);
  S.d.uitleg=S.d.uitleg||{};
  S.d.uitleg[key]=String(S.d.uitleg['algemeen']||'');
  var previews=previewTextStore();
  previews[key]=String(previews['algemeen']||'');
  var shapes=meta.shapes||{};
  if(shapes['algemeen'])shapes[key]=cloneJson(shapes['algemeen']);
  STYLE_PREVIEW_KEY=key;
  markDirty();
  buildStijlPreserveBg(g('pw'));
  toast('Thema aangemaakt: '+label,'green');
}
function duplicateThemeFromStyle(key){
  var meta=S.d.meta||{};
  var themes=meta.themes||[];
  var idx=themes.map(function(t){return t.key;}).indexOf(key);
  if(idx<0)return;
  var src=themes[idx];
  var nextKey=uniqueThemeKey((src.label||src.key||'thema')+'-kopie');
  var nextLabel=(src.label||src.key||'Thema')+' kopie';
  var nextTheme=cloneJson(src)||{};
  nextTheme.key=nextKey;
  nextTheme.label=nextLabel;
  nextTheme.card=nextKey+'.svg';
  themes.splice(idx+1,0,nextTheme);
  S.d.questions=S.d.questions||{};
  S.d.questions[nextKey]=cloneJson(S.d.questions[key]||[]);
  S.d.uitleg=S.d.uitleg||{};
  S.d.uitleg[nextKey]=String(S.d.uitleg[key]||'');
  var previews=previewTextStore();
  previews[nextKey]=String(previews[key]||'');
  STYLE_PREVIEW_KEY=nextKey;
  markDirty();
  var srcPath=styleCardPathForKey(key);
  var destPath=styleCardPathForKey(nextKey);
  var jobs=[];
  var srcAsset=(cachedCardAssetForPath(srcPath)||{}).asset||null;
  if(srcPath&&destPath&&srcAsset&&srcAsset.dataUrl)jobs.push(uploadDataUrlToPath(destPath,srcAsset.dataUrl,'Duplicate theme card: '+destPath));
  Promise.all(jobs).catch(function(){});
  buildStijlPreserveBg(g('pw'));
  toast('Thema gedupliceerd','green');
}
function deleteThemeFromStyle(key){
  var idx=styleThemeIndexByKey(key);
  if(idx<0)return;
  if(!confirm('Thema verwijderen?'))return;
  var previews=previewTextStore();
  delete previews[key];
  delTh(idx);
  STYLE_PREVIEW_KEY='cover';
  buildStijlPreserveBg(g('pw'));
}
function reorderInfoSlides(fromKey,toKey,before){
  if(!fromKey||!toKey||fromKey===toKey)return;
  var meta=S.d.meta||{};
  var themes=meta.themes||[];
  var pages=meta.infoPages||[];
  // Build ordered key list: themes first, then pages
  var allKeys=themes.map(function(t){return t.key;}).concat(pages.map(function(p){return p.key;}));
  var fi=allKeys.indexOf(fromKey);var ti=allKeys.indexOf(toKey);
  if(fi<0||ti<0)return;
  // Reorder themes array if both are themes
  var fInThemes=fi<themes.length;var tInThemes=ti<themes.length;
  if(fInThemes&&tInThemes){reorderStyleThemes(fromKey,toKey,before);return;}
  // Reorder pages if both are pages
  if(!fInThemes&&!tInThemes){
    var pi=fi-themes.length,qi=ti-themes.length;
    var moved=pages.splice(pi,1)[0];
    if(pi<qi)qi-=1;
    if(before===false)qi+=1;
    qi=Math.max(0,Math.min(pages.length,qi));
    pages.splice(qi,0,moved);
    markDirty();buildStijlPreserveBg(g('pw'));return;
  }
}
function reorderStyleThemes(fromKey,toKey,before){
  if(!fromKey||!toKey||fromKey===toKey)return;
  var themes=S.d.meta.themes||[];
  var fromIdx=styleThemeIndexByKey(fromKey);
  var toIdx=styleThemeIndexByKey(toKey);
  if(fromIdx<0||toIdx<0||fromIdx===toIdx)return;
  var moved=themes.splice(fromIdx,1)[0];
  if(fromIdx<toIdx)toIdx-=1;
  if(before===false)toIdx+=1;
  toIdx=Math.max(0,Math.min(themes.length,toIdx));
  themes.splice(toIdx,0,moved);
  markDirty();
  buildStijlPreserveBg(g('pw'));
}
function styleSlideCardHtml(opt,selectedKey){
  var path=styleCardPathForKey(opt.key);
  var sid=safeid(path);
  var hit=((cachedCardAssetForFile(S.activeId,opt.file)||{}).asset)||null;
  var mode=cardBuildModeForKey(S.d.meta||{},opt.key);
  var isTheme=opt.key!=='cover'&&opt.key!=='algemeen';
  var isAlgemeen=opt.key==='algemeen';
  var infoMode=S.opmPane==='info';
  var infoText=String((S.d.uitleg||{})[opt.key]||'').trim();
  var hasInfo=infoMode&&infoText.length>0;
  var uploadIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v10"/><path d="M8.5 9 12 5.5 15.5 9"/><path d="M7 18.5h10"/></svg>';
  var duplicateIcon='<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>';
  var cropIcon='<svg viewBox="0 0 24 24"><path d="M6 3v12a3 3 0 0 0 3 3h12"/><path d="M8 16L16 8"/><path d="M9 8h8v8"/></svg>';
  var deleteIcon='<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12h10l1-12"/><path d="M9 7V4h6v3"/></svg>';
  var pictureIcon='<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.3"/><path d="M5 16l4.5-4.5 3 3 2.8-2.8L19 16"/></svg>';
  var cardLabel=opt.key==='cover'?'Cover':(opt.key==='algemeen'?'Kaart':(opt.label||'Thema'));
  return '<div class="stijlSlideCard'+(opt.key===selectedKey?' sel':'')+(isTheme?' is-theme':'')+(isAlgemeen?' is-algemeen':'')+(infoMode?' info-mode':'')+(hasInfo?' has-info':'')+'" data-style-preview-key="'+esc(opt.key)+'" data-path="'+esc(path)+'" data-sid="'+sid+'"'+(isTheme?' draggable="true" data-theme-key="'+esc(opt.key)+'"':'')+(isAlgemeen?' data-theme-key="algemeen"':'')+' onclick="setStylePreviewKey(\''+esc(opt.key)+'\')">'+
    '<div class="stijlSlideThumb">'+
      (hit&&hit.dataUrl
        ?'<img src="'+hit.dataUrl+'" alt="'+esc(opt.label)+'">'
        :'<div class="stijlSlidePlaceholder">'+pictureIcon+'<span>'+((opt.key==='cover'||opt.key==='algemeen')?'Achtergrond toevoegen':(mode==='self'?'Zelf maken':'Afbeelding kiezen'))+'</span></div>')+
      '<div class="stijlSlideActions">'+
        ((opt.key==='cover')
          ?'<button class="stijlSlideMiniBtn" type="button" title="Set dupliceren" onclick="event.stopPropagation();dupSet()">'+duplicateIcon+'</button>'
          :(isTheme?'<button class="stijlSlideMiniBtn" type="button" title="Thema dupliceren" onclick="event.stopPropagation();duplicateThemeFromStyle(\''+esc(opt.key)+'\')">'+duplicateIcon+'</button>':''))+
        '<label class="stijlSlideUpload" title="SVG kiezen" onclick="event.stopPropagation()">'+uploadIcon+'<input type="file" accept=".svg,image/svg+xml" onclick="event.stopPropagation()" onchange="if(this.files&&this.files[0])uploadFile(this.files[0],\''+esc(path)+'\',\''+sid+'\');this.value=\'\'"></label>'+
        (hit&&hit.dataUrl?'<button class="stijlSlideMiniBtn" type="button" title="Bijsnijden" onclick="event.stopPropagation();recropStyleSlide(\''+esc(path)+'\',\''+sid+'\')">'+cropIcon+'</button>':'')+
        (isTheme?'<button class="stijlSlideMiniBtn danger" type="button" title="Thema verwijderen" onclick="event.stopPropagation();deleteThemeFromStyle(\''+esc(opt.key)+'\')">'+deleteIcon+'</button>':(hit&&hit.dataUrl?'<button class="stijlSlideMiniBtn danger" type="button" title="Verwijderen" onclick="event.stopPropagation();deleteStyleSlideFile(\''+esc(path)+'\',\''+sid+'\')">'+deleteIcon+'</button>':''))+
      '</div>'+
    '</div>'+
    '<div class="stijlSlideBody">'+
      (isTheme
        ?'<div class="stijlSlideNameEditWrap"><div class="stijlSlideName stijlSlideNameLabel" title="Naam wijzigen" onmousedown="event.stopPropagation()" onclick="event.stopPropagation();beginStyleSlideNameEdit(\''+esc(opt.key)+'\',false)">'+esc(cardLabel)+'</div><input class="stijlSlideName stijlSlideNameInput" type="text" value="'+esc(cardLabel)+'" placeholder="Thema" title="Naam wijzigen" draggable="false" onmousedown="event.stopPropagation()" onclick="event.stopPropagation()" onblur="endStyleSlideNameEdit(this)" onkeydown="event.stopPropagation();if(event.key===\'Enter\'){event.preventDefault();this.blur();}if(event.key===\'Escape\'){event.preventDefault();this.blur();}" oninput="event.stopPropagation();updateStyleThemeNameByKey(\''+esc(opt.key)+'\',this.value)"></div>'
        :isAlgemeen
          ?'<div class="stijlSlideNameEditWrap"><div class="stijlSlideName stijlSlideNameLabel" title="Naam geven → maakt thema aan" onmousedown="event.stopPropagation()" onclick="event.stopPropagation();beginStyleSlideNameEdit(\'algemeen\',false)">'+esc(cardLabel)+'</div><input class="stijlSlideName stijlSlideNameInput" type="text" value="" placeholder="Naam geven…" title="Naam geven → maakt thema aan" draggable="false" onmousedown="event.stopPropagation()" onclick="event.stopPropagation()" onblur="var _v=(this.value||\'\').trim();endStyleSlideNameEdit(this);if(_v){this.value=\'\';promoteAlgemeenToTheme(_v);}" onkeydown="event.stopPropagation();if(event.key===\'Enter\'){event.preventDefault();this.blur();}if(event.key===\'Escape\'){event.preventDefault();this.value=\'\';this.blur();}" oninput="event.stopPropagation()"></div>'
          :'<div class="stijlSlideName">'+esc(cardLabel)+'</div>')+
      (infoMode?'<div class="stijlSlideInfoDot" title="'+(hasInfo?'Heeft infotekst':'Nog geen infotekst')+'"></div>':'')+
    '</div>'+
  '</div>';
}
function previewVarianceHint(previewKey){
  var meta=S.d.meta||{};
  if(meta.doubleSided===false)return '';
  if(!previewKey||previewKey==='cover'||previewKey==='algemeen')return '';
  var list=(S.d.questions&&S.d.questions[previewKey])||[];
  if(list.length<2)return '';
  var withBack=list.filter(function(item){
    return !!String((item&&item.achterkant)||'').trim();
  }).length;
  if(withBack>0&&withBack<list.length)return 'Niet elke kaart heeft achterkanttekst';
  return '';
}
function wireStyleComposer(){
  var _lastHintCard=null,_lastHintBefore=null;
  function clearStyleDragHints(){
    _lastHintCard=null;_lastHintBefore=null;
    Array.prototype.slice.call(document.querySelectorAll('.stijlSlideRail.reordering')).forEach(function(rail){rail.classList.remove('reordering');});
    Array.prototype.slice.call(document.querySelectorAll('.stijlSlideCard.drop-before,.stijlSlideCard.drop-after,.infoSlideCard.drop-before,.infoSlideCard.drop-after')).forEach(function(el){
      el.classList.remove('drop-before','drop-after');
    });
  }
  function setStyleDragHint(card,before){
    clearStyleDragHints();
    if(!card)return;
    var rail=card.closest('.stijlSlideRail');
    if(rail)rail.classList.add('reordering');
    card.classList.add(before?'drop-before':'drop-after');
  }
  var previewDrop=document.querySelector('[data-style-drop-preview]');
  if(previewDrop){
    var previewDepth=0;
    previewDrop.addEventListener('dragenter',function(e){
      if(!(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length))return;
      e.preventDefault();
      previewDepth+=1;
      previewDrop.classList.add('styleDropTarget');
    });
    previewDrop.addEventListener('dragover',function(e){
      if(!(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length))return;
      e.preventDefault();
      previewDrop.classList.add('styleDropTarget');
    });
    previewDrop.addEventListener('dragleave',function(e){
      e.preventDefault();
      previewDepth=Math.max(0,previewDepth-1);
      if(!previewDepth)previewDrop.classList.remove('styleDropTarget');
    });
    previewDrop.addEventListener('drop',function(e){
      e.preventDefault();
      previewDepth=0;
      previewDrop.classList.remove('styleDropTarget');
      assignStyleFiles((e.dataTransfer||{}).files,previewDrop.dataset.stylePreviewKey||STYLE_PREVIEW_KEY);
      setTimeout(function(){buildStijlPreserveBg(g('pw'));},40);
    });
  }
  Array.prototype.slice.call(document.querySelectorAll('.stijlSlideCard[data-path], .infoSlideCard[data-info-key]')).forEach(function(card){
    var depth=0;
    if(card.dataset.infoKey){
      card.addEventListener('dragstart',function(e){
        if(!card.classList.contains('sel')){
          if(e&&e.preventDefault)e.preventDefault();
          setInfoPreviewKey(card.dataset.infoKey);
          return false;
        }
        card.classList.add('dragging');
        clearStyleDragHints();
        var rail=card.closest('.stijlSlideRail'); if(rail)rail.classList.add('reordering');
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('text/plain',card.dataset.infoKey);
      });
      card.addEventListener('dragend',function(){card.classList.remove('dragging');clearStyleDragHints();});
    }
    if(card.dataset.themeKey){
      card.addEventListener('dragstart',function(e){
        if(!card.classList.contains('sel')){
          if(e&&e.preventDefault)e.preventDefault();
          setStylePreviewKey(card.dataset.themeKey);
          return false;
        }
        card.classList.add('dragging');
        clearStyleDragHints();
        var rail=card.closest('.stijlSlideRail'); if(rail)rail.classList.add('reordering');
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('text/plain',card.dataset.themeKey);
      });
      card.addEventListener('dragend',function(){
        card.classList.remove('dragging');
        Array.prototype.slice.call(document.querySelectorAll('.stijlSlideCard.dragover,.infoSlideCard.dragover')).forEach(function(el){el.classList.remove('dragover');});
        clearStyleDragHints();
      });
    }
    card.addEventListener('dragenter',function(e){
      e.preventDefault();
      depth+=1;
      card.classList.add('dragover');
      var rect=card.getBoundingClientRect();
      setStyleDragHint(card,(e.clientX-rect.left)<rect.width/2);
    });
    card.addEventListener('dragover',function(e){
      e.preventDefault();
      card.classList.add('dragover');
      var rect=card.getBoundingClientRect();
      var before=(e.clientX-rect.left)<rect.width/2;
      if(card!==_lastHintCard||before!==_lastHintBefore){_lastHintCard=card;_lastHintBefore=before;setStyleDragHint(card,before);}
    });
    card.addEventListener('dragleave',function(e){
      e.preventDefault();
      depth=Math.max(0,depth-1);
      if(!depth){
        card.classList.remove('dragover');
        clearStyleDragHints();
      }
    });
    card.addEventListener('drop',function(e){
      e.preventDefault();
      depth=0;
      card.classList.remove('dragover');
      var rect=card.getBoundingClientRect();
      var before=(e.clientX-rect.left)<rect.width/2;
      clearStyleDragHints();
      var dragKey=e.dataTransfer&&e.dataTransfer.getData('text/plain');
      if(dragKey&&card.dataset.infoKey){
        reorderInfoSlides(dragKey,card.dataset.infoKey,before);
        return;
      }
      if(dragKey&&card.dataset.themeKey){
        reorderStyleThemes(dragKey,card.dataset.themeKey,before);
        return;
      }
      var files=e.dataTransfer&&e.dataTransfer.files;
      if(!(files&&files.length))return;
      assignStyleFiles(files,card.dataset.stylePreviewKey||STYLE_PREVIEW_KEY);
      setTimeout(function(){buildStijlPreserveBg(g('pw'));},30);
    });
  });
}
function makeCoverTextBlock(seed){
  var meta=S.d.meta||{};
  var baseFont=((meta.cssVars||{})['--pk-font']||'IBM Plex Sans');
  var baseColor=((meta.cssVars||{})['--pk-set-text']||'#1a1a2e');
  var presets=[
    {x:12,y:24,size:18,valign:'top'},
    {x:12,y:50,size:14,valign:'center'},
    {x:12,y:76,size:12,valign:'bottom'}
  ];
  var preset=presets[Math.min(seed||0,presets.length-1)]||presets[1];
  return {text:'',x:preset.x,y:preset.y,valign:preset.valign,size:preset.size,align:'left',weight:'regular',italic:false,underline:false,font:baseFont,color:baseColor,bg:''};
}
function coverTextStore(){
  var meta=S.d.meta||{};
  meta.ui=meta.ui||{};
  meta.ui.coverTexts=Array.isArray(meta.ui.coverTexts)?meta.ui.coverTexts:[];
  meta.ui.coverTexts=meta.ui.coverTexts.slice(0,6).map(function(item,idx){
    item.size=Math.max(8,Math.min(48,parseInt(item.size,10)|| (idx===0?18:12)));
    item.align=(item.align==='center'||item.align==='right')?item.align:'left';
    item.valign=(item.valign==='top'||item.valign==='bottom')?item.valign:'center';
    item.weight=(item.weight==='medium'||item.weight==='semibold'||item.weight==='bold')?item.weight:'regular';
    item.italic=!!item.italic;
    item.underline=!!item.underline;
    item.font=String(item.font||((meta.cssVars||{})['--pk-font']||'IBM Plex Sans'));
    item.color=normalizeHexInput(item.color)||normalizeHexInput((meta.cssVars||{})['--pk-set-text'])||'#1a1a2e';
    item.bg=normalizeHexInput(item.bg)||'';
    return item;
  });
  return meta.ui.coverTexts;
}
var COVER_TEXT_DRAG=null;
var COVER_TEXT_ACTIVE=0;
var COVER_TEXT_LAST_FOCUSED=0;
var COVER_TEXT_SELECTED_MULTI=[];
var COVER_TEXT_SUPPRESS_CLICK_UNTIL=0;
function currentCoverTextIdx(){
  var blocks=coverTextStore();
  if(!blocks.length)return -1;
  var active=Number(COVER_TEXT_ACTIVE);
  if(active>=0&&active<blocks.length)return active;
  var last=Number(COVER_TEXT_LAST_FOCUSED);
  if(last>=0&&last<blocks.length)return last;
  return 0;
}
function cloneCoverTextBlock(block){
  return JSON.parse(JSON.stringify(block||{}));
}
function textIconSvg(){
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>';
}
function normalizeCoverTextSelectedMulti(){
  var blocks=coverTextStore();
  COVER_TEXT_SELECTED_MULTI=(Array.isArray(COVER_TEXT_SELECTED_MULTI)?COVER_TEXT_SELECTED_MULTI:[]).map(function(v){return Number(v);}).filter(function(v,i,arr){
    return v>=0&&v<blocks.length&&arr.indexOf(v)===i;
  }).sort(function(a,b){return a-b;});
  return COVER_TEXT_SELECTED_MULTI.slice();
}
function getCoverTextSelectedIndices(){
  var list=normalizeCoverTextSelectedMulti();
  if(list.length)return list.slice();
  var idx=currentCoverTextIdx();
  return idx>=0?[idx]:[];
}
function isCoverTextSelected(idx){
  return getCoverTextSelectedIndices().indexOf(Number(idx))>=0;
}
function hasCoverMixedSelection(){
  return getCoverTextSelectedIndices().length>0&&getShapeSelectedIndices('cover').length>0;
}
function setCoverTextSelection(indices,activeIdx){
  var blocks=coverTextStore();
  var list=(Array.isArray(indices)?indices:[indices]).map(function(v){return Number(v);}).filter(function(v,i,arr){
    return v>=0&&v<blocks.length&&arr.indexOf(v)===i;
  }).sort(function(a,b){return a-b;});
  COVER_TEXT_SELECTED_MULTI=list;
  if(list.length){
    setCoverTextActiveState(typeof activeIdx==='number'&&list.indexOf(activeIdx)>=0?activeIdx:list[list.length-1]);
  }
}
function toggleCoverTextSelection(idx){
  idx=Number(idx);
  var list=normalizeCoverTextSelectedMulti();
  var at=list.indexOf(idx);
  if(at>=0)list.splice(at,1);
  else list.push(idx);
  list.sort(function(a,b){return a-b;});
  setCoverTextSelection(list,list.length?idx:-1);
}
function clearCoverTextSelection(){
  if(!normalizeCoverTextSelectedMulti().length)return false;
  COVER_TEXT_SELECTED_MULTI=[];
  patchCoverTextTargets();
  refreshShapeEditors('cover');
  return true;
}
function estimateCoverTextBounds(item){
  var text=String((item&&item.text)||'').trim()||'Nieuwe tekst';
  var size=Math.max(8,Math.min(48,parseInt(item&&item.size,10)||12));
  var width=Math.max(10,Math.min(52,Math.round(text.length*Math.max(3.2,size*0.36))));
  var height=Math.max(8,Math.round(size*1.9));
  var widthPct=Math.max(6,Math.min(92,width/3.4));
  var heightPct=Math.max(4,Math.min(26,height/3.4));
  var x=Number(item&&item.x);if(!isFinite(x))x=50;
  var y=Number(item&&item.y);if(!isFinite(y))y=50;
  return {left:x-widthPct/2,top:y-heightPct/2,right:x+widthPct/2,bottom:y+heightPct/2};
}
function coverTextBounds(idx){
  var blocks=coverTextStore();
  var item=blocks[idx];
  if(!item)return {left:0,top:0,right:0,bottom:0};
  var node=coverEditorQuery('.cpTextLayer[data-cover-texts="1"] .cpTextBlock[data-cover-text-idx="'+idx+'"]');
  var layer=coverEditorQuery('.cpTextLayer[data-cover-texts="1"]');
  if(node&&layer){
    var nr=node.getBoundingClientRect(),lr=layer.getBoundingClientRect();
    if(lr.width&&lr.height){
      return {
        left:(nr.left-lr.left)/lr.width*100,
        top:(nr.top-lr.top)/lr.height*100,
        right:(nr.right-lr.left)/lr.width*100,
        bottom:(nr.bottom-lr.top)/lr.height*100
      };
    }
  }
  return estimateCoverTextBounds(item);
}
function coverTextItemFromBlock(block){
  return {
    kind:'text',
    type:'text',
    text:String(block.text||''),
    x:Number(block.x)||50,
    y:Number(block.y)||50,
    size:Math.max(8,Math.min(48,parseInt(block.size,10)||12)),
    align:block.align||'left',
    valign:block.valign||'center',
    weight:block.weight||'regular',
    italic:!!block.italic,
    underline:!!block.underline,
    font:block.font||'IBM Plex Sans',
    color:block.color||'#1a1a2e',
    bg:normalizeHexInput(block.bg)||''
  };
}
function renderGroupedTextItem(item,x,y,selCls,key,idx){
  var align=(item.align==='center'||item.align==='right')?item.align:'left';
  var tx=align==='center'?'-50%':(align==='right'?'-100%':'0');
  var bgHex=normalizeHexInput(item.bg)||'';
  var weight=item.weight==='bold'?'700':item.weight==='semibold'?'600':item.weight==='medium'?'500':'400';
  var textCls='cpTextBlockText'+(bgHex?' hasBg':'');
  var selClass=String(selCls||'').indexOf('sel')>=0?' active':'';
  return '<div class="cpTextBlock cpShapeText'+selClass+'" data-shape-idx="'+idx+'" data-shape-key="'+esc(key||'cover')+'" onmousedown="startShapeDrag(event,\''+esc(key||'cover')+'\','+idx+')" oncontextmenu="return openShapeContextMenu(event,\''+esc(key||'cover')+'\','+idx+')" style="left:'+x+'%;top:'+y+'%;transform:translate('+tx+',-50%);background:transparent;padding:0">'+
    '<span class="'+textCls+'" style="font-family:\''+esc(item.font||'IBM Plex Sans')+'\',sans-serif;color:'+esc(item.color||'#1a1a2e')+';text-align:'+align+';font-size:'+(Math.max(8,Math.min(48,parseInt(item.size,10)||12)))+'pt;font-weight:'+weight+';font-style:'+(item.italic?'italic':'normal')+';text-decoration:'+(item.underline?'underline':'none')+';'+(bgHex?'--cp-text-bg:'+bgHex+';':'')+'">'+esc(item.text||'Tekst')+'</span>'+
  '</div>';
}
function coverEditorRoot(){
  return g('stijl-kaart')||g('pw')||document;
}
function coverEditorQuery(sel){
  var root=coverEditorRoot();
  return root&&root.querySelector?root.querySelector(sel):document.querySelector(sel);
}
function coverEditorQueryAll(sel){
  var root=coverEditorRoot();
  return Array.prototype.slice.call(root&&root.querySelectorAll?root.querySelectorAll(sel):document.querySelectorAll(sel));
}
function setCoverTextActiveState(idx){
  var max=Math.max(0,coverTextStore().length-1);
  idx=Math.max(0,Math.min(max,Number(idx)||0));
  COVER_TEXT_ACTIVE=idx;
  COVER_TEXT_LAST_FOCUSED=idx;
  return idx;
}
function syncCoverTextInputs(){
  return;
}
function syncActiveCoverTextControls(){
  if(STYLE_PREVIEW_KEY!=='cover')return;
  if(!coverTextStore().length)return;
  var activeIdx=currentCoverTextIdx();
  setCoverTextActiveState(activeIdx);
  var block=coverTextStore()[activeIdx]||coverTextStore()[0];
  if(!block)return;
  var syncFont=String(block.font||'IBM Plex Sans');
  coverEditorQueryAll('[data-font-menu-btn]').forEach(function(btn){
    var lbl=btn.querySelector('.fontMenuLabel');
    if(lbl)lbl.textContent=syncFont;
    btn.style.fontFamily=syncFont;
  });
  coverEditorQueryAll('[data-font-option]').forEach(function(btn){
    btn.classList.toggle('sel',btn.dataset.fontOption===syncFont);
  });
  coverEditorQueryAll('[data-cover-picker]').forEach(function(btn){
    btn.classList.toggle('sel',String(btn.dataset.coverPicker||'')===String(activeIdx));
  });
  coverEditorQueryAll('[data-cover-input-idx]').forEach(function(input){
    var idx=Number(input.dataset.coverInputIdx||0);
    var item=coverTextStore()[idx]||{text:''};
    if(document.activeElement!==input)input.value=String(item.text||'');
  });
  coverEditorQueryAll('.fontSizeSel[data-cover-size="1"]').forEach(function(sel){
    sel.value=String(block.size||12);
  });
  coverEditorQueryAll('[data-font-size-btn]').forEach(function(btn){
    btn.innerHTML=fontSizeButtonLabel(block.size||12);
  });
  coverEditorQueryAll('[data-font-size-option]').forEach(function(btn){
    btn.classList.toggle('sel',String(btn.dataset.fontSizeOption||'')===String(block.size||12));
  });
  coverEditorQueryAll('[data-align]').forEach(function(btn){
    btn.classList.toggle('sel',btn.dataset.align===String(block.align||'left'));
  });
  coverEditorQueryAll('[data-valign]').forEach(function(btn){
    btn.classList.toggle('sel',btn.dataset.valign===String(block.valign||'center'));
  });
  coverEditorQueryAll('[data-text-bold]').forEach(function(btn){
    btn.classList.toggle('sel',String(block.weight||'regular')!=='regular');
  });
  coverEditorQueryAll('[data-text-weight-btn]').forEach(function(btn){
    btn.classList.toggle('sel',String(block.weight||'regular')!=='regular');
  });
  coverEditorQueryAll('[data-text-weight-option]').forEach(function(btn){
    btn.classList.toggle('sel',btn.dataset.textWeightOption===String(block.weight||'regular'));
  });
  coverEditorQueryAll('[data-text-italic]').forEach(function(btn){
    btn.classList.toggle('sel',!!block.italic);
  });
  coverEditorQueryAll('[data-text-underline]').forEach(function(btn){
    btn.classList.toggle('sel',!!block.underline);
  });
  coverEditorQueryAll('.textBgSel[data-cover-bg="1"]').forEach(function(sel){
    sel.value=String(block.bg||'');
  });
  coverEditorQueryAll('[data-text-bg-option]').forEach(function(btn){
    var val=normalizeHexInput(block.bg)||'none';
    btn.classList.toggle('sel',btn.dataset.textBgOption===val);
  });
  coverEditorQueryAll('[data-text-bg-btn]').forEach(function(btn){
    btn.classList.remove('sel');
    btn.innerHTML=textBgButtonIcon(block.bg||'none')+'<span class="textToolbarCaret">▾</span>';
  });
  coverEditorQueryAll('[data-action="settc"]').forEach(function(btn){
    btn.classList.toggle('sel',String(btn.dataset.hex||'').toLowerCase()===String(block.color||'').toLowerCase());
  });
  coverEditorQueryAll('[data-cur-target="settc"]').forEach(function(swatch){
    swatch.style.background=block.color||'#1a1a2e';
  });
  coverEditorQueryAll('[data-text-color-btn]').forEach(function(btn){
    btn.innerHTML=textColorButtonIcon(block.color||'#1a1a2e')+'<span class="textToolbarCaret">▾</span>';
  });
  coverEditorQueryAll('[data-cover-text-menu]').forEach(function(btn){
    btn.classList.remove('sel');
  });
}
function updateActiveCoverTextField(val){
  updateCoverTextField(currentCoverTextIdx(),val);
}
function setActiveCoverText(idx,opts){
  opts=opts||{};
  setShapeSelection('cover',[],-1);
  setCoverTextSelection([Number(idx)],Number(idx));
  var activeIdx=currentCoverTextIdx();
  patchCoverTextTargets();
  coverEditorQueryAll('.coverTextCard').forEach(function(card){
    card.classList.toggle('active',String(card.dataset.coverTextIdx||'')===String(activeIdx));
  });
  coverEditorQueryAll('.coverTextFieldLabel').forEach(function(label){
    var card=label.closest('.coverTextCard');
    label.classList.toggle('active',!!card&&String(card.dataset.coverTextIdx||'')===String(activeIdx));
  });
  syncActiveCoverTextControls();
}
function selectCoverTextItem(idx,ev){
  if(Date.now()<COVER_TEXT_SUPPRESS_CLICK_UNTIL){
    if(ev){ev.preventDefault();ev.stopPropagation();}
    return;
  }
  if(ev&&(ev.shiftKey||ev.metaKey||ev.ctrlKey))toggleCoverTextSelection(idx);
  else{
    setShapeSelection('cover',[],-1);
    setCoverTextSelection([Number(idx)],Number(idx));
  }
  patchCoverTextTargets();
  syncActiveCoverTextControls();
  refreshShapeEditors('cover');
}
function openCoverTextContextMenu(ev,idx){
  if(ev)ev.preventDefault();
  if(getCoverTextSelectedIndices().indexOf(Number(idx))<0){
    setShapeSelection('cover',[],-1);
    setCoverTextSelection([Number(idx)],Number(idx));
  }
  else setCoverTextSelection(getCoverTextSelectedIndices(),Number(idx));
  patchCoverTextTargets();
  refreshShapeEditors('cover');
  return openShapeContextMenu(ev,'cover',getShapeActiveIndex('cover',false));
}
function coverTextLayerHtml(){
  var activeIdx=currentCoverTextIdx();
  var mixedSelection=hasCoverMixedSelection();
  return coverTextStore().map(function(item,idx){
    var isEmpty=!String(item.text||'').trim();
    var displayText=isEmpty?'Nieuwe tekst':String(item.text||'');
    var x=Math.max(-10,Math.min(110,Number(item.x)||50));
    var y=Math.max(-10,Math.min(110,Number(item.y)||50));
    var align=(item.align==='center'||item.align==='right')?item.align:'left';
    var tx=align==='center'?'-50%':(align==='right'?'-100%':'0');
    return '<div class="cpTextBlock'+((isCoverTextSelected(idx)||idx===activeIdx)?' active':'')+((mixedSelection&&isCoverTextSelected(idx))?' mixed':'')+(isEmpty?' cpTextEmpty':'')+'" data-cover-text-idx="'+idx+'" style="left:'+x+'%;top:'+y+'%;transform:translate('+tx+',-50%)" onmousedown="startCoverTextDrag(event,'+idx+')" onclick="selectCoverTextItem('+idx+',event)" oncontextmenu="return openCoverTextContextMenu(event,'+idx+')" ondblclick="startCoverTextInlineEdit(event,'+idx+')">'+
      '<span class="cpTextBlockText'+(isEmpty?' cpTextBlockHint':'')+'">'+esc(displayText)+'</span>'+
    '</div>';
  }).join('');
}
function patchCoverTextTargets(){
  var layer=coverEditorQuery('.cpTextLayer[data-cover-texts="1"]');
  if(!layer)return;
  var blocks=coverTextStore();
  var activeIdx=currentCoverTextIdx();
  var mixedSelection=hasCoverMixedSelection();
  Array.prototype.slice.call(layer.querySelectorAll('.cpTextBlock')).forEach(function(node){
    var idx=Number(node.dataset.coverTextIdx||-1);
    if(idx<0||idx>=blocks.length)node.remove();
  });
  blocks.forEach(function(item,idx){
    var item=blocks[idx]||{text:''};
    var text=String(item.text||'').trim();
    var node=layer.querySelector('.cpTextBlock[data-cover-text-idx="'+idx+'"]');
    if(!node){
      node=document.createElement('div');
      node.className='cpTextBlock';
      node.dataset.coverTextIdx=String(idx);
      node.onmousedown=function(event){startCoverTextDrag(event,idx);};
      node.onclick=function(event){selectCoverTextItem(idx,event);};
      node.oncontextmenu=function(event){return openCoverTextContextMenu(event,idx);};
      node.ondblclick=function(event){startCoverTextInlineEdit(event,idx);};
      node.innerHTML='<span class="cpTextBlockText"></span>';
      layer.appendChild(node);
    }
    var x=Math.max(-10,Math.min(110,Number(item.x)||50));
    var y=Math.max(-10,Math.min(110,Number(item.y)||50));
    var align=(item.align==='center'||item.align==='right')?item.align:'left';
    var tx=align==='center'?'-50%':(align==='right'?'-100%':'0');
    node.classList.toggle('active',isCoverTextSelected(idx)||idx===activeIdx);
    node.classList.toggle('mixed',mixedSelection&&isCoverTextSelected(idx));
    node.classList.toggle('cpTextEmpty',!text);
    node.style.left=x+'%';
    node.style.top=y+'%';
    node.style.transform='translate('+tx+',-50%)';
    var span=node.querySelector('.cpTextBlockText');
    if(span){
      span.textContent=text||'Nieuwe tekst';
      span.classList.toggle('cpTextBlockHint',!text);
    }
  });
  requestAnimationFrame(adjustCoverTextWrapping);
}
function renderCoverTextTargets(){
  coverEditorQueryAll('.cpTextLayer[data-cover-texts="1"]').forEach(function(el){
    el.innerHTML=coverTextLayerHtml();
  });
  requestAnimationFrame(adjustCoverTextWrapping);
}
function adjustCoverTextWrapping(){
  coverEditorQueryAll('.cpTextLayer[data-cover-texts="1"] .cpTextBlock').forEach(function(block){
    var text=block.querySelector('.cpTextBlockText');
    if(!text)return;
    text.style.whiteSpace='nowrap';
    text.style.overflowWrap='normal';
    var needsWrap=block.scrollWidth>block.clientWidth+1;
    if(needsWrap){
      text.style.whiteSpace='normal';
      text.style.overflowWrap='break-word';
    }
  });
}
function updateCoverTextPosition(idx,x,y){
  var blocks=coverTextStore();
  if(!blocks[idx])return;
  blocks[idx].x=Math.max(-10,Math.min(110,Math.round(x)));
  blocks[idx].y=Math.max(-10,Math.min(110,Math.round(y)));
  blocks[idx].valign=blocks[idx].y<=34?'top':(blocks[idx].y>=66?'bottom':'center');
  markDirty();
  patchCoverTextTargets();
}
function showCoverTextGuides(layerEl,guides){
  // Remove old guide divs
  Array.prototype.slice.call(layerEl.querySelectorAll('.coverTextGuide')).forEach(function(g){g.remove();});
  guides.forEach(function(g){
    var div=document.createElement('div');
    div.className='coverTextGuide '+(g.type==='h'?'h':'v');
    div.style[g.type==='h'?'top':'left']=g.pos+'%';
    layerEl.appendChild(div);
  });
}
function clearCoverTextGuides(layerEl){
  Array.prototype.slice.call(layerEl.querySelectorAll('.coverTextGuide')).forEach(function(g){g.remove();});
}
function focusCoverTextInput(idx){
  var input=coverEditorQuery('.coverTextFieldInput[data-cover-input-idx="'+idx+'"]');
  if(!input)return;
  try{
    input.focus();
    var len=(input.value||'').length;
    if(input.setSelectionRange)input.setSelectionRange(len,len);
  }catch(_e){}
}
function dragCoverTextTo(clientX,clientY){
  if(!COVER_TEXT_DRAG||!COVER_TEXT_DRAG.layerEl)return;
  var layerEl=COVER_TEXT_DRAG.layerEl;
  var rect=layerEl.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  var rawX=((clientX-(COVER_TEXT_DRAG.offsetX||0))-rect.left)/rect.width*100;
  var rawY=((clientY-(COVER_TEXT_DRAG.offsetY||0))-rect.top)/rect.height*100;
  var blocks=coverTextStore();
  var dragIdx=COVER_TEXT_DRAG.idx;
  var otherIdx=1-dragIdx;
  var otherBlock=blocks[otherIdx];
  var snappedX=rawX,snappedY=rawY;
  var guides=[];
  var SNAP=5;
  var dragEl=layerEl.querySelector('[data-cover-text-idx="'+dragIdx+'"]');
  if(otherBlock){
    var otherEl=layerEl.querySelector('[data-cover-text-idx="'+otherIdx+'"]');
    var dW=dragEl?(dragEl.offsetWidth/rect.width)*100:0;
    var dH=dragEl?(dragEl.offsetHeight/rect.height)*100:0;
    var oW=otherEl?(otherEl.offsetWidth/rect.width)*100:0;
    var oH=otherEl?(otherEl.offsetHeight/rect.height)*100:0;
    // Positions are block centers (transform:-50%,-50%)
    var oX=otherBlock.x, oY=otherBlock.y;
    // --- Vertical snap (X axis): left-left, center-center, right-right ---
    var xCandidates=[
      {dragEdge:rawX-dW/2, otherEdge:oX-oW/2, snapCenter:oX-oW/2+dW/2},
      {dragEdge:rawX,       otherEdge:oX,       snapCenter:oX},
      {dragEdge:rawX+dW/2, otherEdge:oX+oW/2, snapCenter:oX+oW/2-dW/2}
    ];
    var bestX=SNAP,bestXSnap=null,bestXGuide=null;
    xCandidates.forEach(function(c){
      var d=Math.abs(c.dragEdge-c.otherEdge);
      if(d<bestX){bestX=d;bestXSnap=c.snapCenter;bestXGuide=c.otherEdge;}
    });
    if(bestXSnap!==null){snappedX=bestXSnap;guides.push({type:'v',pos:bestXGuide});}
    // --- Horizontal snap (Y axis): top-top, center-center, bottom-bottom ---
    var yCandidates=[
      {dragEdge:rawY-dH/2, otherEdge:oY-oH/2, snapCenter:oY-oH/2+dH/2},
      {dragEdge:rawY,       otherEdge:oY,       snapCenter:oY},
      {dragEdge:rawY+dH/2, otherEdge:oY+oH/2, snapCenter:oY+oH/2-dH/2}
    ];
    var bestY=SNAP,bestYSnap=null,bestYGuide=null;
    yCandidates.forEach(function(c){
      var d=Math.abs(c.dragEdge-c.otherEdge);
      if(d<bestY){bestY=d;bestYSnap=c.snapCenter;bestYGuide=c.otherEdge;}
    });
    if(bestYSnap!==null){snappedY=bestYSnap;guides.push({type:'h',pos:bestYGuide});}
  }
  // Update store
  if(blocks[dragIdx]){
    blocks[dragIdx].x=Math.max(-10,Math.min(110,Math.round(snappedX)));
    blocks[dragIdx].y=Math.max(-10,Math.min(110,Math.round(snappedY)));
    blocks[dragIdx].valign=blocks[dragIdx].y<=34?'top':(blocks[dragIdx].y>=66?'bottom':'center');
    markDirty();
  }
  // Directly move the dragging element for smooth feedback
  if(dragEl&&blocks[dragIdx]){
    var align2=(blocks[dragIdx].align==='center'||blocks[dragIdx].align==='right')?blocks[dragIdx].align:'left';
    var tx2=align2==='center'?'-50%':(align2==='right'?'-100%':'0');
    dragEl.style.left=snappedX+'%';
    dragEl.style.top=snappedY+'%';
    dragEl.style.transform='translate('+tx2+',-50%)';
  }
  if(guides.length) showCoverTextGuides(layerEl,guides);
  else clearCoverTextGuides(layerEl);
}
function finishCoverTextInlineEdit(idx){
  var blockEl=coverEditorQuery('.cpTextBlock[data-cover-text-idx="'+idx+'"]');
  if(!blockEl||!blockEl.classList.contains('editing'))return;
  var span=blockEl.querySelector('.cpTextBlockText');
  var blocks=coverTextStore();
  if(span){
    var rawText=String(span.textContent||'');
    var saveText=(span.classList.contains('cpTextBlockHint')&&rawText.trim()==='Nieuwe tekst')?'':rawText;
    if(blocks[idx])blocks[idx].text=saveText;
    span.contentEditable='false';
    span.oninput=null;
    span.onblur=null;
    span.onkeydown=null;
  }
  blockEl.classList.remove('editing');
  blockEl.style.cursor='';
  markDirty();
  updateStijlPreview();
  patchCoverTextTargets();
  refreshShapeEditors('cover');
}
function currentEditingCoverTextIdx(){
  var node=coverEditorQuery('.cpTextBlock.editing[data-cover-text-idx]');
  if(!node)return -1;
  var idx=Number(node.dataset.coverTextIdx||-1);
  return idx>=0?idx:-1;
}
function startCoverTextInlineEdit(ev,idx){
  var blockEl=ev?(ev.currentTarget||ev.target.closest('.cpTextBlock')):null;
  if(!blockEl)blockEl=coverEditorQuery('.cpTextBlock[data-cover-text-idx="'+idx+'"]');
  if(!blockEl)return;
  if(blockEl.classList.contains('editing'))return;
  if(ev){ev.preventDefault();ev.stopPropagation();}
  setCoverTextActiveState(idx);
  blockEl.classList.add('editing');
  blockEl.style.cursor='text';
  var span=blockEl.querySelector('.cpTextBlockText');
  if(!span)return;
  var blocks=coverTextStore();
  var isEmpty=!(blocks[idx]&&String(blocks[idx].text||'').trim());
  if(isEmpty){
    span.textContent='Nieuwe tekst';
    span.classList.add('cpTextBlockHint');
  }
  span.contentEditable='true';
  span.focus();
  var range=document.createRange();
  range.selectNodeContents(span);
  var sel=window.getSelection();
  if(sel){sel.removeAllRanges();sel.addRange(range);}
  span.oninput=function(){
    var blocks=coverTextStore();
    if(!blocks[idx])return;
    blocks[idx].text=span.textContent||'';
    markDirty();
    var inp=coverEditorQuery('.coverTextFieldInput[data-cover-input-idx="'+idx+'"]');
    if(inp)inp.value=blocks[idx].text;
    blockEl.classList.toggle('cpTextEmpty',!String(blocks[idx].text||'').trim());
    span.classList.toggle('cpTextBlockHint',!String(blocks[idx].text||'').trim());
    adjustCoverTextWrapping();
  };
  span.onblur=function(){
    finishCoverTextInlineEdit(idx);
  };
  span.onkeydown=function(e){
    if(e.key==='Escape'){span.blur();}
  };
}
function startCoverTextDrag(ev,idx){
  var blockEl=ev.currentTarget||ev.target.closest('.cpTextBlock');
  if(ev.target&&ev.target.closest&&ev.target.closest('.cpTextBlockDel'))return;
  var spanEl=blockEl&&blockEl.querySelector('.cpTextBlockText');
  if(blockEl&&blockEl.classList.contains('editing')){
    if(ev.target&&spanEl&&spanEl.contains(ev.target))return;
    finishCoverTextInlineEdit(idx);
    blockEl=coverEditorQuery('.cpTextBlock[data-cover-text-idx="'+idx+'"]');
  }
  var layerEl=blockEl&&blockEl.closest('.cpTextLayer');
  if(!blockEl||!layerEl)return;
  if(ev&&ev.button===2){
    if(getCoverTextSelectedIndices().indexOf(Number(idx))<0){
      setShapeSelection('cover',[],-1);
      setCoverTextSelection([Number(idx)],Number(idx));
    }
    patchCoverTextTargets();
    refreshShapeEditors('cover');
    ev.preventDefault();
    ev.stopPropagation();
    return;
  }
  if(ev&&ev.button!==0)return;
  if(ev&&(ev.shiftKey||ev.metaKey||ev.ctrlKey)){
    toggleCoverTextSelection(idx);
    patchCoverTextTargets();
    refreshShapeEditors('cover');
    ev.preventDefault();
    ev.stopPropagation();
    return;
  }
  setShapeSelection('cover',[],-1);
  setCoverTextSelection([Number(idx)],Number(idx));
  patchCoverTextTargets();
  syncActiveCoverTextControls();
  var rect=layerEl.getBoundingClientRect();
  var blocks=coverTextStore();
  var item=blocks[idx]||{x:50,y:50};
  var bx=rect.left+(Number(item.x)||50)/100*rect.width;
  var by=rect.top+(Number(item.y)||50)/100*rect.height;
  COVER_TEXT_DRAG={idx:idx,layerEl:layerEl,blockEl:blockEl,startX:ev.clientX,startY:ev.clientY,offsetX:ev.clientX-bx,offsetY:ev.clientY-by,moved:false};
  blockEl.classList.add('dragging');
  ev.preventDefault();
  ev.stopPropagation();
}
function updateCoverTextField(idx,val){
  var blocks=coverTextStore();
  if(!blocks[idx])return;
  var prevActive=COVER_TEXT_ACTIVE;
  blocks[idx].text=val;
  setCoverTextActiveState(idx);
  markDirty();
  patchCoverTextTargets();
  refreshShapeEditors('cover');
  // Only full-sync controls when the ACTIVE BLOCK switches — not on every keystroke
  if(prevActive!==idx)syncActiveCoverTextControls();
}
function updateCoverTextSize(idx,val){
  var blocks=coverTextStore();
  if(!blocks[idx])return;
  blocks[idx].size=Math.max(8,Math.min(48,parseInt(val,10)||12));
  setCoverTextActiveState(idx);
  markDirty();
  updateStijlPreview();
  syncActiveCoverTextControls();
}
function updateCoverTextAlign(idx,val){
  var blocks=coverTextStore();
  if(!blocks[idx])return;
  blocks[idx].align=(val==='center'||val==='right')?val:'left';
  setCoverTextActiveState(idx);
  markDirty();
  updateStijlPreview();
  syncActiveCoverTextControls();
}
function updateCoverTextValign(idx,val){
  var blocks=coverTextStore();
  if(!blocks[idx])return;
  blocks[idx].valign=(val==='top'||val==='bottom')?val:'center';
  blocks[idx].y=val==='top'?24:(val==='bottom'?76:50);
  setCoverTextActiveState(idx);
  markDirty();
  updateStijlPreview();
  syncActiveCoverTextControls();
}
function updateCoverTextBg(idx,val){
  var blocks=coverTextStore();
  if(!blocks[idx])return;
  blocks[idx].bg=normalizeHexInput(val)||'';
  setCoverTextActiveState(idx);
  markDirty();
  updateStijlPreview();
  syncActiveCoverTextControls();
}
function setTextBgMode(val){
  val=normalizeHexInput(val)||'';
  if(activeStyleEditKey()==='cover'){
    updateCoverTextBg(currentCoverTextIdx(),val);
  }else{
    setCV('--pk-text-bg-color',val);markDirty();updateStijlPreview();
  }
  document.querySelectorAll('[data-text-bg-option]').forEach(function(btn){
    btn.classList.toggle('sel',btn.dataset.textBgOption===(val||'none'));
  });
  document.querySelectorAll('[data-text-bg-btn]').forEach(function(btn){
    btn.classList.remove('sel');
  });
}
function closeTextMenu(el){
  var details=el&&el.closest?el.closest('details'):null;
  if(details)details.open=false;
}
function setBackMode(mode){
  var m=S.d.meta=S.d.meta||{};
  m.backMode=(mode==='blank'||mode==='reflect')?mode:'mirror';
  markDirty();
  buildStijlPreserveBg(g('pw'));
}
function setTextWeight(val){
  val=(val==='medium'||val==='semibold'||val==='bold')?val:'regular';
  if(RT.richCeTarget&&RT.richCeTarget.dataset.richType!=='question'){applyRichCeCmd('bold');return;}
  if(activeStyleEditKey()==='cover'){
    var blocks=coverTextStore();
    var block=blocks[currentCoverTextIdx()];
    if(!block)return;
    block.weight=val;
    markDirty();
    updateStijlPreview();
  }else{
    setCV('--pk-font-weight',val);markDirty();updateStijlPreview();
  }
  document.querySelectorAll('[data-text-bold],[data-text-weight-btn]').forEach(function(b){
    b.classList.toggle('sel',val!=='regular');
  });
  document.querySelectorAll('[data-text-weight-option]').forEach(function(b){
    b.classList.toggle('sel',b.dataset.textWeightOption===val);
  });
}
function toggleTextItalic(){
  if(RT.richCeTarget&&RT.richCeTarget.dataset.richType!=='question'){applyRichCeCmd('italic');return;}
  var isItalic=false;
  if(activeStyleEditKey()==='cover'){
    var blocks=coverTextStore();
    var block=blocks[currentCoverTextIdx()];
    if(!block)return;
    block.italic=!block.italic;
    isItalic=block.italic;
    markDirty();
    updateStijlPreview();
  }else{
    isItalic=((S.d.meta||{}).cssVars||{})['--pk-font-italic']==='1'?false:true;
    setCV('--pk-font-italic',isItalic?'1':'0');markDirty();updateStijlPreview();
  }
  document.querySelectorAll('[data-text-italic]').forEach(function(b){
    b.classList.toggle('sel',isItalic);
  });
}
function toggleTextUnderline(){
  if(RT.richCeTarget&&RT.richCeTarget.dataset.richType!=='question'){applyRichCeCmd('underline');return;}
  var isUnder=false;
  if(activeStyleEditKey()==='cover'){
    var blocks=coverTextStore();
    var block=blocks[currentCoverTextIdx()];
    if(!block)return;
    block.underline=!block.underline;
    isUnder=block.underline;
    markDirty();
    updateStijlPreview();
  }else{
    isUnder=((S.d.meta||{}).cssVars||{})['--pk-font-underline']==='1'?false:true;
    setCV('--pk-font-underline',isUnder?'1':'0');markDirty();updateStijlPreview();
  }
  document.querySelectorAll('[data-text-underline]').forEach(function(b){
    b.classList.toggle('sel',isUnder);
  });
}
function buildCoverTextEditorHtml(){
  var blocks=coverTextStore();
  var activeIdx=currentCoverTextIdx();
  return '<div class="coverTextEditor">'+
    '<div class="coverTextMeta"><strong>Tekstvakken</strong><button class="coverTextAddBtn" type="button" onclick="addCoverTextBlock()">+ Tekstvak</button></div>'+
    (blocks.length?'<div class="coverTextGrid">'+
      blocks.map(function(item,idx){
        var item=blocks[idx]||{text:''};
        var active=idx===activeIdx;
        return '<label class="coverTextCard'+(active?' active':'')+'" data-cover-text-idx="'+idx+'" onclick="setActiveCoverText('+idx+')">'+
          '<span class="coverTextFieldLabel'+(active?' active':'')+'">Tekstvak '+(idx+1)+'</span>'+
          '<div class="coverTextFieldHead"><input class="coverTextFieldInput" data-cover-input-idx="'+idx+'" type="text" value="'+esc(item.text||'')+'" placeholder="Nieuwe tekst" onfocus="setActiveCoverText('+idx+')" oninput="updateCoverTextField('+idx+',this.value)"><div class="coverTextFieldActions"><button class="coverTextMiniBtn danger" type="button" onclick="event.preventDefault();event.stopPropagation();removeCoverTextBlock('+idx+')"><svg viewBox=\"0 0 24 24\"><path d=\"M4 7h16\"/><path d=\"M10 11v6\"/><path d=\"M14 11v6\"/><path d=\"M6 7l1 12h10l1-12\"/><path d=\"M9 7V4h6v3\"/></svg></button></div></div>'+
        '</label>';
      }).join('')+
    '</div>':'<div class="stijlNote" style="margin-top:0">Voeg een tekstvak toe om tekst direct op de kaart te plaatsen.</div>')+
  '</div>';
}
function buildCoverTextDropdownContent(){
  var blocks=coverTextStore();
  var activeIdx=currentCoverTextIdx();
  var trashSvg='<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12h10l1-12"/><path d="M9 7V4h6v3"/></svg>';
  var addBtn='<button class="textToolbarMenuItem" type="button" onclick="addCoverTextBlock()"><span style="display:inline-flex;align-items:center;gap:6px"><span style="font-size:16px;line-height:1;font-weight:500">+</span><span>Tekstvak toevoegen</span></span></button>';
  var rows=!blocks.length
    ?'<div style="display:flex;flex-direction:column;align-items:stretch;gap:6px;padding:4px 0 2px">'+
        addBtn+
        '<div style="font-size:11.5px;line-height:1.4;color:var(--k3);text-align:center;padding:2px 4px 0">Nog geen tekstvak</div>'+
      '</div>'
    :blocks.map(function(item,idx){
      var active=idx===activeIdx;
      return '<div class="coverTextCard coverTextDropRow'+(active?' active':'')+'" data-cover-text-idx="'+idx+'">'+
        '<input class="coverTextDropInput coverTextFieldInput" data-cover-input-idx="'+idx+'" type="text" value="'+esc(item.text||'')+'" placeholder="Nieuwe tekst" onfocus="setActiveCoverText('+idx+')" oninput="updateCoverTextField('+idx+',this.value)" onclick="event.stopPropagation()">'+
        '<button class="coverTextMiniBtn danger" type="button" onclick="event.preventDefault();event.stopPropagation();removeCoverTextBlock('+idx+')">'+trashSvg+'</button>'+
      '</div>';
    }).join('');
  return '<div class="textToolbarMenuLabel">Tekstvakken</div>'+rows+
    (blocks.length?'<div class="textToolbarMenuSep" style="margin:6px 0"></div>'+addBtn:'');
}
function refreshCoverTextDropdown(){
  var menu=document.getElementById('coverTextToolbarMenu');
  if(!menu)return;
  var pop=menu.querySelector('.coverTextDropdown');
  if(pop)pop.innerHTML=buildCoverTextDropdownContent();
}
function refreshCoverTextCard(){
  var card=document.getElementById('coverTextEditorCard');
  if(!card)return;
  card.innerHTML=buildCoverTextEditorHtml();
}
function addCoverTextBlock(){
  var blocks=coverTextStore();
  if(blocks.length>=6){toast('Maximaal 6 tekstvakken','amber');return;}
  blocks.push(makeCoverTextBlock(blocks.length));
  setCoverTextActiveState(blocks.length-1);
  markDirty();
  updateStijlPreview();
  refreshCoverTextCard();
  refreshCoverTextDropdown();
  refreshShapeEditors('cover');
  var newIdx=currentCoverTextIdx();
  setTimeout(function(){startCoverTextInlineEdit(null,newIdx);},60);
}
function removeCoverTextBlock(idx){
  var blocks=coverTextStore();
  if(idx<0||idx>=blocks.length)return;
  blocks.splice(idx,1);
  if(!blocks.length)COVER_TEXT_ACTIVE=0;
  else setCoverTextActiveState(Math.min(idx,blocks.length-1));
  markDirty();
  updateStijlPreview();
  refreshCoverTextCard();
  refreshCoverTextDropdown();
  refreshShapeEditors('cover');
}
function buildPreviewTextEditorHtml(previewKey){
  if(previewKey==='cover'){
    return buildCoverTextEditorHtml();
  }
  return '<div class="coverTextEditor">'+
    '<div class="coverTextGrid" style="grid-template-columns:1fr">'+
      '<label class="coverTextCard"><span class="coverTextFieldLabel">Voorbeeldtekst</span><input class="coverTextFieldInput" type="text" value="'+esc((previewTextStore()[previewKey]||''))+'" placeholder="Typ een voorbeeldtekst" oninput="updateStylePreviewText(\''+esc(previewKey)+'\',this.value)"></label>'+
    '</div>'+
  '</div>';
}
function textColorButtonIcon(hex){
  return '<span class="textToolbarIcon textColorIcon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="M4.6 13h6.8" stroke="'+esc(hex||'#1a1a2e')+'" stroke-width="2.2" stroke-linecap="round"/><path d="M8 2.7l2.6 6.4M8 2.7L5.4 9.1M6.2 7.1h3.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
}
function textBgButtonIcon(mode){
  var sw=normalizeHexInput(mode)||(mode==='accent'?'#cfe6df':(mode==='light'?'#ffffff':'#eef5f7'));
  return '<span class="textToolbarIcon textBgIcon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><rect x="1.7" y="2" width="12.6" height="11.6" rx="2.2" fill="'+sw+'" opacity=".98"/><path d="M8 4.25l2.1 5M8 4.25l-2.1 5M6.55 7.35h2.9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
}
function buildFontMenuHtml(curFont){
  var f=curFont||'IBM Plex Sans';
  return '<details class="textToolbarMenu">'+
    '<summary class="textToolbarMenuBtn fontMenuBtn" title="Lettertype" data-font-menu-btn="1" style="font-family:'+esc(f)+'">'+
      '<span class="fontMenuLabel">'+esc(f)+'</span>'+
      '<span class="textToolbarCaret" style="font-family:\'IBM Plex Sans\',sans-serif">▾</span>'+
    '</summary>'+
    '<div class="textToolbarMenuPop fontMenuPop">'+
      '<div class="textToolbarMenuLabel">Lettertype</div>'+
      '<div class="textToolbarMenuGrid">'+
        FONT_LIST.map(function(fn){
          return '<button class="textToolbarMenuItem'+(fn===f?' sel':'')+'" type="button" '+
            'data-font-option="'+esc(fn)+'" '+
            'style="font-family:'+esc(fn)+';font-size:12px" '+
            'onclick="setFontLive(\''+esc(fn)+'\');closeTextMenu(this)">'+
            '<span>'+esc(fn)+'</span>'+
          '</button>';
        }).join('')+
      '</div>'+
    '</div>'+
  '</details>';
}
function fontSizeButtonLabel(val){
  return '<span class="fontSizeLabelText">'+(String(val||'12'))+' pt</span><span class="textToolbarCaret">▾</span>';
}
function buildFontSizeMenuHtml(curSize){
  return '<details class="textToolbarMenu">'+
    '<summary class="textToolbarMenuBtn sizeMenuBtn" title="Tekstgrootte" data-font-size-btn="1">'+fontSizeButtonLabel(curSize)+'</summary>'+
    '<div class="textToolbarMenuPop">'+
      '<div class="textToolbarMenuLabel">Tekstgrootte</div>'+
      '<div class="textToolbarMenuGrid">'+
        FONT_SIZE_PRESETS.map(function(v){return '<button class="textToolbarMenuItem'+(String(curSize)===String(v)?' sel':'')+'" type="button" data-font-size-option="'+v+'" onclick="setFontSizeLive(\''+v+'\');closeTextMenu(this)"><span>'+v+'pt</span></button>';}).join('')+
      '</div>'+
    '</div>'+
  '</details>';
}
function buildTextColorMenuHtml(action,currentColor){
  var hex=normalizeHexInput(currentColor)||'#1a1a2e';
  var meta=stylePaletteMeta(action);
  var tcRows=[meta.quick.slice(0,8)].concat(BRAND_FAM_BG.slice(1));
  return '<details class="textToolbarMenu">'+
    '<summary class="textToolbarMenuBtn" title="Tekstkleur" data-text-color-btn="1">'+textColorButtonIcon(hex)+'<span class="textToolbarCaret">▾</span></summary>'+
    '<div class="textToolbarMenuPop brandPopPop">'+
      brandPaletteHtml(action,hex,tcRows)+
    '</div>'+
  '</details>';
}
function buildTextBgMenuHtml(color){
  var hex=normalizeHexInput(color)||'';
  var tbRows=BRAND_FAM_BG;
  var noSw='<button class="brandSw brandNoColorSw'+(hex?'':' sel')+'" type="button" title="Geen vlak" onclick="setTextBgMode(\'\')">'+
    '<svg viewBox="0 0 18 18" width="18" height="18"><line x1="3" y1="15" x2="15" y2="3" stroke="#d05050" stroke-width="1.5" stroke-linecap="round"/></svg>'+
  '</button>';
  return '<details class="textToolbarMenu">'+
    '<summary class="textToolbarMenuBtn" title="Tekstvlak" data-text-bg-btn="1">'+textBgButtonIcon(hex||'none')+'<span class="textToolbarCaret">▾</span></summary>'+
    '<div class="textToolbarMenuPop brandPopPop">'+
      brandPaletteHtml('settb',hex||'',tbRows,{prefixHtml:noSw})+
    '</div>'+
  '</details>';
}
var STYLE_SHAPE_ACTIVE={};
var STYLE_SHAPE_SELECTED={};
var STYLE_SHAPE_SELECTED_MULTI={};
var STYLE_SHAPE_COLOR_TARGET={};
var SHAPE_DRAG=null;
var SHAPE_MARQUEE=null;
var SHAPE_CONTEXT_MENU=null;
var SHAPE_SEL_TIMER=null;
var SHAPE_SEL_KEY=null;
function startShapeSelTimer(key){
  SHAPE_SEL_KEY=key||activeStyleEditKey();
  if(SHAPE_SEL_TIMER){clearTimeout(SHAPE_SEL_TIMER);SHAPE_SEL_TIMER=null;}
  SHAPE_SEL_TIMER=setTimeout(function(){
    SHAPE_SEL_TIMER=null;
    clearActiveShapeSelection(SHAPE_SEL_KEY);
  },6500);
}
function resetShapeSelTimer(){
  SHAPE_SEL_KEY=SHAPE_SEL_KEY||activeStyleEditKey();
}
var SHAPE_SWATCHES=[
  '#FFFFFF','#F7F4EF','#ECF5F4','#E7E1F5','#F2E6C4','#CFEDEA',
  '#D6ECEA','#CFE6DF','#6FAE9A','#56AFA7','#2F5F63','#6A63C2',
  '#4F5FB2','#C99A2E','#E9D39C','#C8CDD2','#3C4650','#2C3E63'
];
var SHAPE_TYPES=[
  {id:'circle',label:'Cirkel'},
  {id:'rounded',label:'Afgerond'},
  {id:'column',label:'Kolom'},
  {id:'side',label:'Zijde'},
  {id:'blob',label:'Blob'},
  {id:'band',label:'Band'},
  {id:'slope',label:'Diagonaal'},
  {id:'cornerwide',label:'Hoekvlak'},
  {id:'hill',label:'Heuvel'},
  {id:'star',label:'Ster'},
  {id:'diamond',label:'Ruit'},
  {id:'triangle',label:'Driehoek'},
  {id:'arrow',label:'Pijl'},
  {id:'cloud',label:'Wolk'},
  {id:'bar',label:'Balk'},
  {id:'pill',label:'Pil'},
  {id:'spark',label:'Spark'},
  {id:'wave',label:'Golf'},
  {id:'arch',label:'Boog'},
  {id:'leaf',label:'Blad'},
  {id:'corner',label:'Hoek'},
  {id:'crescent',label:'Maan'},
  {id:'burst',label:'Burst'},
  {id:'petal',label:'Bloemblad'},
  {id:'drop',label:'Druppel'},
  {id:'hexagon',label:'Zeshoek'},
  {id:'octagon',label:'Achthoek'},
  {id:'heart',label:'Hart'},
  {id:'shield',label:'Schild'},
  {id:'oval',label:'Ovaal'},
  {id:'parallelogram',label:'Parallellogram'}
];
function stripImportedSvgAttrs(node){
  if(!node||!node.getAttributeNames)return;
  ['id','class','style','opacity','vector-effect','color'].forEach(function(attr){
    if(node.hasAttribute(attr))node.removeAttribute(attr);
  });
}
function importedSvgDrawableNodes(root){
  if(!root||!root.querySelectorAll)return [];
  return Array.prototype.slice.call(root.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line'));
}
function inspectImportedSvgPaint(root){
  var nodes=importedSvgDrawableNodes(root);
  var meta={hasFill:false,hasStroke:false,strokeWidth:0};
  nodes.forEach(function(node){
    var fill=parseImportedSvgColor(node.getAttribute('fill'),'#CFE6DF');
    var stroke=parseImportedSvgColor(node.getAttribute('stroke'),'transparent');
    var sw=parseFloat(node.getAttribute('stroke-width')||0);
    if(fill&&fill!=='transparent')meta.hasFill=true;
    if(stroke&&stroke!=='transparent'){
      meta.hasStroke=true;
      if(isFinite(sw)&&sw>0)meta.strokeWidth=Math.max(meta.strokeWidth,sw);
    }
  });
  if(!meta.hasFill&&!meta.hasStroke){
    meta.hasStroke=true;
    meta.strokeWidth=meta.strokeWidth||1.8;
  }
  if(!meta.strokeWidth)meta.strokeWidth=1.8;
  return meta;
}
function sanitizeImportedSvgNode(node){
  if(!node||node.nodeType!==1)return;
  stripImportedSvgAttrs(node);
  var tag=String(node.tagName||'').toLowerCase();
  var isDrawable=/^(path|rect|circle|ellipse|polygon|polyline|line)$/.test(tag);
  if(isDrawable){
    var fill=parseImportedSvgColor(node.getAttribute('fill'),'#CFE6DF');
    var stroke=parseImportedSvgColor(node.getAttribute('stroke'),'transparent');
    var strokeWidth=parseFloat(node.getAttribute('stroke-width')||0);
    var fillVisible=!!(fill&&fill!=='transparent');
    var strokeVisible=!!(stroke&&stroke!=='transparent');
    if(!fillVisible&&!strokeVisible){
      strokeVisible=true;
      strokeWidth=strokeWidth||1.8;
    }
    node.setAttribute('fill',fillVisible?'var(--shape-fill, currentColor)':'none');
    if(fillVisible)node.setAttribute('fill-opacity','var(--shape-fill-opacity, 1)');
    else node.removeAttribute('fill-opacity');
    node.setAttribute('stroke',strokeVisible?'var(--shape-stroke, currentColor)':'none');
    if(strokeVisible){
      node.setAttribute('stroke-width','var(--shape-stroke-width, '+((isFinite(strokeWidth)&&strokeWidth>0)?strokeWidth:1.8)+')');
      node.setAttribute('stroke-opacity','var(--shape-stroke-opacity, 1)');
      node.setAttribute('stroke-linecap',node.getAttribute('stroke-linecap')||'round');
      node.setAttribute('stroke-linejoin',node.getAttribute('stroke-linejoin')||'round');
    }else{
      node.removeAttribute('stroke-width');
      node.removeAttribute('stroke-opacity');
      node.removeAttribute('stroke-linecap');
      node.removeAttribute('stroke-linejoin');
    }
  }
  Array.prototype.slice.call(node.children||[]).forEach(sanitizeImportedSvgNode);
}
function serializeImportedSvgNode(node,viewBox){
  if(!node)return '';
  var clone=node.cloneNode(true);
  sanitizeImportedSvgNode(clone);
  var serializer=new XMLSerializer();
  var markup=serializer.serializeToString(clone);
  var vb=viewBox||{minX:0,minY:0,width:100,height:100};
  var sx=100/(Number(vb.width)||100);
  var sy=100/(Number(vb.height)||100);
  var tx=-(Number(vb.minX)||0)*sx;
  var ty=-(Number(vb.minY)||0)*sy;
  return '<g transform="matrix('+sx+' 0 0 '+sy+' '+tx+' '+ty+')">'+markup+'</g>';
}
function serializeImportedSvgRoot(root,viewBox){
  if(!root)return '';
  var clone=root.cloneNode(true);
  sanitizeImportedSvgNode(clone);
  var markup=Array.prototype.slice.call(clone.childNodes||[]).map(function(node){
    return (new XMLSerializer()).serializeToString(node);
  }).join('');
  var vb=viewBox||{minX:0,minY:0,width:100,height:100};
  var sx=100/(Number(vb.width)||100);
  var sy=100/(Number(vb.height)||100);
  var tx=-(Number(vb.minX)||0)*sx;
  var ty=-(Number(vb.minY)||0)*sy;
  return '<g transform="matrix('+sx+' 0 0 '+sy+' '+tx+' '+ty+')">'+markup+'</g>';
}
function parseSvgViewBox(root){
  if(!root)return {minX:0,minY:0,width:100,height:100};
  var vb=String(root.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
  if(vb.length===4&&vb.every(function(n){return isFinite(n);})){
    return {minX:vb[0],minY:vb[1],width:vb[2]||100,height:vb[3]||100};
  }
  var w=parseFloat(root.getAttribute('width')||100);
  var h=parseFloat(root.getAttribute('height')||100);
  return {minX:0,minY:0,width:isFinite(w)&&w>0?w:100,height:isFinite(h)&&h>0?h:100};
}
function parseImportedSvgColor(val,fallback){
  var raw=String(val||'').trim();
  if(!raw||raw==='none')return raw==='none'?'transparent':fallback;
  var hex=normalizeHexInput(raw);
  if(hex)return hex;
  if(/^rgba?\(/i.test(raw)||/^hsla?\(/i.test(raw))return raw;
  if(/^currentColor$/i.test(raw))return fallback;
  return fallback;
}
function extractImportedSvgLayers(dataUrl){
  var svgText=decodeSvgDataUrl(dataUrl);
  if(!svgText)return [];
  var doc=(new DOMParser()).parseFromString(svgText,'image/svg+xml');
  var root=doc.documentElement;
  if(!root||root.nodeName.toLowerCase()==='parsererror')return [];
  var viewBox=parseSvgViewBox(root);
  var drawableTags={path:1,rect:1,circle:1,ellipse:1,polygon:1,polyline:1,line:1};
  var nodes=Array.prototype.slice.call(root.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line'));
  return nodes.map(function(node){
    var fill=parseImportedSvgColor(node.getAttribute('fill'),'#CFE6DF');
    var stroke=parseImportedSvgColor(node.getAttribute('stroke'),'transparent');
    var strokeWidth=parseFloat(node.getAttribute('stroke-width')||0);
    var fillOpacity=parseFloat(node.getAttribute('fill-opacity'));
    var strokeOpacity=parseFloat(node.getAttribute('stroke-opacity'));
    if(!isFinite(fillOpacity))fillOpacity=1;
    if(!isFinite(strokeOpacity))strokeOpacity=1;
    if((!fill||fill==='transparent')&&stroke==='transparent'){
      stroke='#4f7d8b';
      strokeWidth=strokeWidth||1;
    }
    if(stroke!=='transparent'){
      stroke='#5f8894';
      strokeWidth=strokeWidth||1;
    }
    if(fill!== 'transparent' && (!fill || /^rgba?\(/i.test(String(fill)) || /^hsla?\(/i.test(String(fill)))){
      fill='#CFE6DF';
    }
    return {
      type:'imported',
      label:'SVG',
      importMarkup:serializeImportedSvgNode(node,viewBox),
      fill:fill==='transparent'?'transparent':fill,
      stroke:stroke,
      fillOpacity:Math.max(0,Math.min(1,fillOpacity)),
      strokeOpacity:Math.max(0,Math.min(1,strokeOpacity)),
      strokeWidth:isFinite(strokeWidth)?strokeWidth:0,
      size:100,
      x:50,
      y:50,
      rotate:0
    };
  }).filter(function(layer){return !!layer.importMarkup;});
}
function extractImportedSvgAsSingleLayer(dataUrl){
  var svgText=decodeSvgDataUrl(dataUrl);
  if(!svgText)return null;
  var doc=(new DOMParser()).parseFromString(svgText,'image/svg+xml');
  var root=doc.documentElement;
  if(!root||root.nodeName.toLowerCase()==='parsererror')return null;
  var viewBox=parseSvgViewBox(root);
  var paint=inspectImportedSvgPaint(root);
  var markup=serializeImportedSvgRoot(root,viewBox);
  if(!markup)return null;
  return {
    type:'imported',
    label:'SVG',
    importMarkup:markup,
    importedHasFill:!!paint.hasFill,
    importedHasStroke:!!paint.hasStroke,
    fill:paint.hasFill?'#CFE6DF':'transparent',
    stroke:paint.hasStroke?'#5f8894':'transparent',
    fillOpacity:1,
    strokeOpacity:1,
    strokeWidth:paint.hasStroke?paint.strokeWidth:0,
    size:42,
    x:50,
    y:50,
    rotate:0
  };
}
function cloneShapeLayer(layer){
  return JSON.parse(JSON.stringify(layer||{}));
}
function isTextLayerItem(layer){
  return !!(layer&&(layer.kind==='text'||layer.type==='text'));
}
function isGroupLayer(layer){
  return !!(layer&&layer.type==='group'&&Array.isArray(layer.groupChildren)&&layer.groupChildren.length);
}
function shapeLayerLabel(layer){
  if(isTextLayerItem(layer))return 'Tekst';
  if(isGroupLayer(layer))return 'Groep';
  if(layer&&layer.type==='imported')return layer.label||'SVG';
  var type=layer&&layer.type||'circle';
  return ((SHAPE_TYPES.find(function(t){return t.id===type;})||{}).label)||'Vorm';
}
function shapeLayerRenderMarkup(layer,context){
  if(!layer)return '';
  if(isGroupLayer(layer)){
    return layer.groupChildren.map(function(child){
      if(isTextLayerItem(child))return '';
      var size=Math.max(1,Number(child.size)||42);
      var x=Number(child.x); if(!isFinite(x))x=50;
      var y=Number(child.y); if(!isFinite(y))y=50;
      var rot=Number(child.rotate)||0;
      var tx=x-(size/2);
      var ty=y-(size/2);
      var outer='<g transform="translate('+tx+' '+ty+') scale('+(size/100)+')">';
      var inner=shapeLayerRenderMarkup(child,context);
      if(rot)inner='<g transform="rotate('+rot+' 50 50)">'+inner+'</g>';
      return outer+inner+'</g>';
    }).join('');
  }
  if(isTextLayerItem(layer))return '';
  var fill=layer.fill||'#CFE6DF';
  var stroke=layer.stroke||'transparent';
  var sw=Math.max(0,Number(layer.strokeWidth)||0);
  var fillOpacity=Number(layer.fillOpacity);
  if(!isFinite(fillOpacity))fillOpacity=1;
  fillOpacity=Math.max(0,Math.min(1,fillOpacity));
  var strokeOpacity=Number(layer.strokeOpacity);
  if(!isFinite(strokeOpacity))strokeOpacity=1;
  strokeOpacity=Math.max(0,Math.min(1,strokeOpacity));
  var type=layer.type||'circle';
  if(type==='imported'&&layer.importMarkup){
    var importedFill=(layer.fill&&layer.fill!=='transparent')?layer.fill:'transparent';
    var importedStroke=(layer.stroke&&layer.stroke!=='transparent')?layer.stroke:'transparent';
    var importedStrokeWidth=Math.max(0,Number(layer.strokeWidth)||0);
    var importedStyle='--shape-fill:'+esc(importedFill)+';--shape-stroke:'+esc(importedStroke)+';--shape-fill-opacity:'+fillOpacity+';--shape-stroke-opacity:'+strokeOpacity+';--shape-stroke-width:'+importedStrokeWidth+';';
    return '<g'+(shapeSvgTransform(type,context)?' transform="'+shapeSvgTransform(type,context)+'"':'')+' style="'+importedStyle+'">'+shapePathByType(type,layer)+'</g>';
  }
  var strokeShape=shapeUsesStroke(type);
  var drawFill=strokeShape?'none':fill;
  var drawFillOpacity=strokeShape?1:fillOpacity;
  var drawStroke=strokeShape?((stroke&&stroke!=='transparent')?stroke:fill):(sw>0?stroke:'none');
  var drawStrokeOpacity=strokeShape?((stroke&&stroke!=='transparent')?strokeOpacity:fillOpacity):strokeOpacity;
  var drawStrokeWidth=strokeShape?(sw>0?sw:2.2):(sw>0?sw:0);
  return '<g'+(shapeSvgTransform(type,context)?' transform="'+shapeSvgTransform(type,context)+'"':'')+' fill="'+esc(drawFill)+'" fill-opacity="'+drawFillOpacity+'" stroke="'+esc(drawStroke)+'" stroke-opacity="'+drawStrokeOpacity+'" stroke-width="'+drawStrokeWidth+'" stroke-linejoin="round" stroke-linecap="round">'+
      shapePathByType(type,layer)+
    '</g>';
}
function shapeLayerBounds(layer){
  if(!layer)return {left:0,top:0,right:0,bottom:0};
  if(isTextLayerItem(layer))return estimateCoverTextBounds(layer);
  var size=Math.max(1,Number(layer.size)||42);
  var x=Number(layer.x); if(!isFinite(x))x=50;
  var y=Number(layer.y); if(!isFinite(y))y=50;
  return {left:x-(size/2),top:y-(size/2),right:x+(size/2),bottom:y+(size/2)};
}
function cardShapeStore(){
  var m=S.d.meta;
  m.ui=m.ui||{};
  m.ui.cardShapes=m.ui.cardShapes||{};
  return m.ui.cardShapes;
}
function getCardShapeLayers(key){
  var store=cardShapeStore();
  store[key]=Array.isArray(store[key])?store[key]:[];
  return store[key];
}
function ensureShapeActiveIndex(key){
  var layers=getCardShapeLayers(key);
  if(!layers.length)return -1;
  var idx=STYLE_SHAPE_ACTIVE[key];
  if(typeof idx!=='number'||idx<0||idx>=layers.length)idx=0;
  STYLE_SHAPE_ACTIVE[key]=idx;
  return idx;
}
function getShapeActiveIndex(key,autoInit){
  var layers=getCardShapeLayers(key);
  if(!layers.length)return -1;
  var idx=STYLE_SHAPE_ACTIVE[key];
  if(typeof idx==='number'&&idx>=0&&idx<layers.length)return idx;
  if(idx===-1)return -1;
  if(autoInit===false)return -1;
  STYLE_SHAPE_ACTIVE[key]=0;
  return 0;
}
function getShapeSelectedIndex(key){
  var layers=getCardShapeLayers(key);
  if(!layers.length)return -1;
  var idx=STYLE_SHAPE_SELECTED[key];
  if(typeof idx==='number'&&idx>=0&&idx<layers.length)return idx;
  return -1;
}
function normalizeShapeSelectedMulti(key){
  var layers=getCardShapeLayers(key);
  var list=Array.isArray(STYLE_SHAPE_SELECTED_MULTI[key])?STYLE_SHAPE_SELECTED_MULTI[key].map(function(v){return Number(v);}).filter(function(v,i,arr){
    return v>=0&&v<layers.length&&arr.indexOf(v)===i;
  }).sort(function(a,b){return a-b;}):[];
  STYLE_SHAPE_SELECTED_MULTI[key]=list;
  return list;
}
function getShapeSelectedIndices(key){
  var list=normalizeShapeSelectedMulti(key);
  if(list.length)return list.slice();
  var idx=getShapeSelectedIndex(key);
  return idx>=0?[idx]:[];
}
function isShapeSelected(key,idx){
  return getShapeSelectedIndices(key).indexOf(Number(idx))>=0;
}
function setShapeSelection(key,indices,activeIdx){
  var layers=getCardShapeLayers(key);
  var list=(Array.isArray(indices)?indices:[indices]).map(function(v){return Number(v);}).filter(function(v,i,arr){
    return v>=0&&v<layers.length&&arr.indexOf(v)===i;
  }).sort(function(a,b){return a-b;});
  STYLE_SHAPE_SELECTED_MULTI[key]=list;
  STYLE_SHAPE_SELECTED[key]=list.length?(typeof activeIdx==='number'&&list.indexOf(activeIdx)>=0?activeIdx:list[list.length-1]):-1;
  STYLE_SHAPE_ACTIVE[key]=STYLE_SHAPE_SELECTED[key];
}
function toggleShapeSelection(key,idx){
  idx=Number(idx);
  var list=normalizeShapeSelectedMulti(key).slice();
  var at=list.indexOf(idx);
  if(at>=0)list.splice(at,1);
  else list.push(idx);
  list.sort(function(a,b){return a-b;});
  setShapeSelection(key,list,list.length?idx:-1);
}
function ensureShapeColorTarget(key){
  var target=STYLE_SHAPE_COLOR_TARGET[key];
  if(target!=='stroke')target='fill';
  STYLE_SHAPE_COLOR_TARGET[key]=target;
  return target;
}
function syncShapeColorTargetForLayer(key,layer){
  if(!layer)return ensureShapeColorTarget(key);
  var hasFill=!!(layer.fill&&layer.fill!=='transparent');
  var hasStroke=!!(layer.stroke&&layer.stroke!=='transparent'&&(Number(layer.strokeWidth)||0)>0);
  if(layer.type==='imported'){
    if(layer.importedHasFill===false&&layer.importedHasStroke!==false)hasFill=false;
    if(layer.importedHasStroke===false)hasStroke=false;
  }
  if(hasStroke&&!hasFill)STYLE_SHAPE_COLOR_TARGET[key]='stroke';
  else if(hasFill)STYLE_SHAPE_COLOR_TARGET[key]='fill';
  return ensureShapeColorTarget(key);
}
function generateBlobSVGPath(deform,seed,pts){
  var irr=(deform/100)*0.65;
  var cx=50,cy=50,r=40,rnd=prng(seed||42);
  var step=(Math.PI*2)/pts,d='';
  for(var i=0;i<=pts;i++){
    var a=i*step,rr=r*(1-irr/2+rnd()*irr);
    var x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
    if(i===0){d='M'+x.toFixed(1)+' '+y.toFixed(1);}
    else{var ca=a-step/2,cr=r*(1-irr/2+rnd()*irr);d+=' Q'+(cx+Math.cos(ca)*cr).toFixed(1)+' '+(cy+Math.sin(ca)*cr).toFixed(1)+' '+x.toFixed(1)+' '+y.toFixed(1);}
  }
  return d+'Z';
}
function shapeDeformValue(layer){
  var v=Number(layer&&layer.deform);
  if(!isFinite(v))v=0;
  return Math.max(0,Math.min(100,v));
}
function shapeUsesStroke(type){
  return type==='wave';
}
function shapePathByType(type,layer){
  if(type==='imported'&&layer&&layer.importMarkup)return layer.importMarkup;
  if(type==='blob'&&layer&&typeof layer.deform==='number')return '<path d="'+generateBlobSVGPath(layer.deform,layer.blobSeed||42,10)+'"></path>';
  if(type==='circle')return '<circle cx="50" cy="50" r="42"></circle>';
  if(type==='rounded')return '<rect x="20" y="20" width="60" height="60" rx="14" ry="14"></rect>';
  if(type==='column')return '<rect x="28" y="6" width="44" height="88" rx="22" ry="22"></rect>';
  if(type==='side')return '<path d="M24 18h27c23 0 41 14 41 32S74 82 51 82H24C14 82 8 68 8 50s6-32 16-32z"></path>';
  if(type==='star')return '<path d="M50 8l10 24 26 2-20 17 6 25-22-13-22 13 6-25-20-17 26-2 10-24z"></path>';
  if(type==='band')return '<path d="M0 34c12-4 24-6 36-6 14 0 26 4 38 8 10 3 18 5 26 4v22c-8 1-16-1-26-4-12-4-24-8-38-8-12 0-24 2-36 6V34z"></path>';
  if(type==='slope')return '<path d="M0 73 100 28v72H0z"></path>';
  if(type==='cornerwide')return '<path d="M0 0h100v34c-15 8-31 12-48 12C28 46 11 33 0 16z"></path>';
  if(type==='hill')return '<path d="M0 100c6-24 18-42 36-50 8-4 17-6 26-6 22 0 38 14 46 56H0z"></path>';
  if(type==='diamond')return '<path d="M50 8l34 42-34 42L16 50 50 8z"></path>';
  if(type==='triangle')return '<path d="M50 12l38 74H12z"></path>';
  if(type==='arrow')return '<path d="M10 42h44v-14l28 22-28 22v-14H10z"></path>';
  if(type==='cloud')return '<path d="M26 71c-11 0-20-8-20-18 0-9 7-17 16-18 3-12 14-20 27-20 10 0 19 4 25 11 3-1 5-1 8-1 12 0 22 10 22 22s-10 24-22 24H26Z"></path>';
  if(type==='bar')return '<rect x="16" y="34" width="68" height="32"></rect>';
  if(type==='plus')return '<path d="M50 14v72M14 50h72"></path>';
  if(type==='pill')return '<rect x="10" y="28" width="80" height="44" rx="22" ry="22"></rect>';
  if(type==='spark')return '<path d="M50 8l8 24 24 8-24 8-8 24-8-24-24-8 24-8 8-24z"></path>';
  if(type==='wave')return '<path d="M2 54c10-14 20-20 30-20 10 0 18 8 26 8 8 0 16-8 26-8 10 0 20 6 30 20"></path>';
  if(type==='arch')return '<path d="M0 100c0-46 24-76 50-76s50 30 50 76z"></path>';
  if(type==='leaf')return '<path d="M18 57c0-26 18-44 45-44 16 0 25 5 32 13 8 8 12 19 12 31 0 27-19 43-45 43S18 85 18 57z"></path>';
  if(type==='corner')return '<path d="M0 0h100v64c-14 6-28 9-40 9C26 73 10 55 0 28z"></path>';
  if(type==='crescent')return '<path d="M64 12c-7 4-16 15-16 35 0 23 13 37 29 41-6 3-12 4-18 4-25 0-45-20-45-45S34 2 59 2c2 0 4 0 5 .3z"></path>';
  if(type==='burst')return '<path d="M50 8l8 17 18-8-8 18 17 8-17 8 8 18-18-8-8 17-8-17-18 8 8-18-17-8 17-8-8-18 18 8 8-17z"></path>';
  if(type==='petal')return '<path d="M50 12c12 0 22 10 22 22 0 8-4 13-8 18-5 5-9 12-14 20-5-8-9-15-14-20-4-5-8-10-8-18 0-12 10-22 22-22z"></path>';
  if(type==='drop')return '<path d="M50 8c15 19 26 33 26 47 0 16-12 29-26 29S24 71 24 55c0-14 11-28 26-47z"></path>';
  if(type==='hexagon')return '<path d="M50 6L89 27v46L50 94 11 73V27z"></path>';
  if(type==='octagon')return '<path d="M34 6h32l24 24v40L66 94H34L10 70V30z"></path>';
  if(type==='heart')return '<path d="M50 88C25 70 4 52 4 34 4 20 14 10 28 10c9 0 17 5 22 12C55 15 63 10 72 10c14 0 24 10 24 24 0 18-21 36-46 54z"></path>';
  if(type==='shield')return '<path d="M50 6C34 6 14 14 14 14v36c0 22 16 34 36 40 20-6 36-18 36-40V14S66 6 50 6z"></path>';
  if(type==='oval')return '<ellipse cx="50" cy="50" rx="42" ry="30"></ellipse>';
  if(type==='parallelogram')return '<path d="M22 20h64l-8 60H14z"></path>';
  return '<path d="M17 46c0-19 13-32 31-32 12 0 19 4 27 3 10-1 18 7 18 18 0 8-4 14-3 21 2 14-6 24-21 24-11 0-15-6-24-6-9 0-14 7-23 7-12 0-22-10-22-24 0-6 3-9 3-11z"></path>';
}
function shapeSvgTransform(type,context){
  var iconScaleMap={
    leaf:.84,
    corner:.82,
    cloud:.88,
    wave:.84,
    slope:.86,
    hill:.86,
    band:.88,
    arch:.88,
    cornerwide:.88
  };
  var previewScaleMap={
    wave:.9,
    slope:.92,
    hill:.9,
    band:.93,
    arch:.93,
    cornerwide:.92
  };
  var scaleMap=context==='preview'?previewScaleMap:iconScaleMap;
  var scale=scaleMap[type]||1;
  if(scale===1)return '';
  return 'translate(50 50) scale('+scale+') translate(-50 -50)';
}
function shapeIconSvg(type){
  var transform=shapeSvgTransform(type,'icon');
  var transformAttr=transform?' transform="'+transform+'"':'';
  return '<svg viewBox="0 0 100 100" aria-hidden="true"><g'+transformAttr+'>'+(shapePathByType(type)||'')+'</g></svg>';
}
function sliderPercent(val,min,max){
  var lo=Number(min),hi=Number(max),cur=Number(val);
  if(!isFinite(lo)||!isFinite(hi)||hi<=lo)return 0;
  if(!isFinite(cur))cur=lo;
  return Math.max(0,Math.min(100,((cur-lo)/(hi-lo))*100));
}
function paintShapeSlider(input){
  if(!input)return;
  var min=Number(input.min||0),max=Number(input.max||100),val=Number(input.value||0);
  input.style.setProperty('--pct',sliderPercent(val,min,max)+'%');
}
function shapeTypeSelectHtml(key,idx,currentType){
  var current=(SHAPE_TYPES.find(function(t){return t.id===currentType;})||null);
  return '<details class="shapeTypeSelect">'+
    '<summary>'+
      '<span class="shapeTypeCurrent">'+(current?shapeIconSvg(current.id):'<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="22"></circle></svg>')+'<span>'+esc(current?current.label:'Kies vorm')+'</span></span>'+
      '<span class="shapeTypeCaret">▾</span>'+
    '</summary>'+
    '<div class="shapeTypeMenu"><div class="shapeTypeMenuGrid">'+
      SHAPE_TYPES.map(function(opt){
        return '<button class="shapeTypeItem'+(current&&opt.id===current.id?' sel':'')+'" type="button" onclick="selectShapeType(\''+esc(key)+'\','+idx+',\''+opt.id+'\');this.closest(\'details\').removeAttribute(\'open\')">'+shapeIconSvg(opt.id)+'<span>'+esc(opt.label)+'</span></button>';
      }).join('')+
    '</div></div>'+
  '</details>';
}
function cardShapeItemHtml(layer,idx,key){
  var selected=isShapeSelected(key,idx);
  var selCls=selected?' sel':'';
  var ke=esc(key||'algemeen');
  var md='onmousedown="startShapeDrag(event,\''+ke+'\','+idx+')"';
  var cm='oncontextmenu="return openShapeContextMenu(event,\''+ke+'\','+idx+')"';
  if(isGroupLayer(layer)){
    // Render each child at its absolute card position — avoids SVG coordinate distortion
    var gx=Number(layer.x)||50;
    var gy=Number(layer.y)||50;
    var gs=Math.max(1,Number(layer.size)||42);
    var gr=Number(layer.rotate)||0;
    return layer.groupChildren.map(function(child){
      if(isTextLayerItem(child)){
        var tcx=Number(child.x)||50;
        var tcy=Number(child.y)||50;
        var tax=gx+(tcx-50)*gs/100;
        var tay=gy+(tcy-50)*gs/100;
        return renderGroupedTextItem(child,Math.max(-25,Math.min(125,tax)),Math.max(-25,Math.min(125,tay)),selCls,ke,idx);
      }
      var cx=Number(child.x)||50;
      var cy=Number(child.y)||50;
      var cs=Math.max(1,Number(child.size)||42);
      // Inverse of grouping transform: back to absolute card %
      var ax=gx+(cx-50)*gs/100;
      var ay=gy+(cy-50)*gs/100;
      var as=cs*gs/100;
      var ar=gr+(Number(child.rotate)||0);
      var sx=Math.max(-25,Math.min(125,ax));
      var sy=Math.max(-25,Math.min(125,ay));
      var ss=Math.max(12,Math.min(240,as));
      return '<div class="cpShape'+selCls+'" data-shape-idx="'+idx+'" data-shape-key="'+ke+'" '+md+' '+cm+' style="left:'+sx+'%;top:'+sy+'%;width:'+ss+'%;height:'+ss+'%;transform:translate(-50%,-50%) rotate('+ar+'deg)">'+
        '<svg viewBox="0 0 100 100" aria-hidden="true">'+shapeLayerRenderMarkup(child,'preview')+'</svg>'+
      '</div>';
    }).join('');
  }
  var size=Math.max(12,Math.min(120,Number(layer.size)||42));
  var x=Math.max(-25,Math.min(125,Number(layer.x)||50));
  var y=Math.max(-25,Math.min(125,Number(layer.y)||50));
  var rot=Number(layer.rotate)||0;
  return '<div class="cpShape'+selCls+'" data-shape-idx="'+idx+'" data-shape-key="'+ke+'" '+md+' '+cm+' style="left:'+x+'%;top:'+y+'%;width:'+size+'%;height:'+size+'%;transform:translate(-50%,-50%) rotate('+rot+'deg)">'+
    '<svg viewBox="0 0 100 100" aria-hidden="true">'+shapeLayerRenderMarkup(layer,'preview')+'</svg>'+
  '</div>';
}
function cardShapesLayerHtml(key){
  return getCardShapeLayers(key).map(function(layer,idx){return cardShapeItemHtml(layer,idx,key);}).join('');
}
function previewGridAccentKey(){
  if(SHAPE_DRAG&&SHAPE_DRAG.key)return SHAPE_DRAG.key;
  var key=activeStyleEditKey();
  if(!key)return '';
  if(getShapeSelectedIndices(key).length)return key;
  if(key==='cover'&&getCoverTextSelectedIndices().length)return key;
  return '';
}
function syncPreviewGridAccentState(){
  var activeKey=previewGridAccentKey();
  Array.prototype.slice.call(document.querySelectorAll('.stijlCanvasWindow.grid-on[data-style-preview-key]')).forEach(function(win){
    var key=win.getAttribute('data-style-preview-key')||'';
    var isActive=!!activeKey&&key===activeKey;
    win.classList.toggle('grid-accent',isActive);
    win.classList.toggle('grid-dragging',isActive&&!!SHAPE_DRAG);
  });
}
function renderCardShapeTargets(){
  Array.prototype.slice.call(document.querySelectorAll('.cpShapeLayer')).forEach(function(el){
    el.innerHTML=cardShapesLayerHtml(el.dataset.shapeKey||'algemeen');
  });
  syncPreviewGridAccentState();
}
function previewNightMode(){
  var meta=((S.d||{}).meta=S.d.meta||{});
  meta.ui=meta.ui||{};
  return !!meta.ui.previewNight;
}
function previewGridMode(){
  var meta=((S.d||{}).meta=S.d.meta||{});
  meta.ui=meta.ui||{};
  return !!meta.ui.previewGrid;
}
function togglePreviewNight(){
  var meta=((S.d||{}).meta=S.d.meta||{});
  meta.ui=meta.ui||{};
  meta.ui.previewNight=!meta.ui.previewNight;
  markDirty();
  if(S.clTab==='opmaken')buildStijlPreserveBg(g('pw'));
}
function togglePreviewGrid(){
  var meta=((S.d||{}).meta=S.d.meta||{});
  meta.ui=meta.ui||{};
  meta.ui.previewGrid=!meta.ui.previewGrid;
  markDirty();
  if(S.clTab==='opmaken')buildStijlPreserveBg(g('pw'));
}
var CANVAS_CARD_FLIPPED=false;
var CANVAS_ZOOM_PCT=100;
var PHONE_CARD_W=340;
function applyCanvasZoom(){
  var scale=CANVAS_ZOOM_PCT/100;
  document.querySelectorAll('.stijlCanvasCardWrap .cardFaceOuter, .stijlCanvasCardWrap .adminInfoSlide').forEach(function(el){
    el.style.zoom=scale;
  });
  document.querySelectorAll('.cvZoomPct').forEach(function(el){el.textContent=CANVAS_ZOOM_PCT+'%';});
}
function setCanvasZoom(pct){
  CANVAS_ZOOM_PCT=Math.max(40,Math.min(300,Math.round(pct/25)*25));
  applyCanvasZoom();
}
function stepCanvasZoom(delta){
  var prev=CANVAS_ZOOM_PCT;
  setCanvasZoom(CANVAS_ZOOM_PCT+delta);
  if(CANVAS_ZOOM_PCT===prev){
    var ctrl=document.querySelector('.cvZoomControl');
    if(ctrl){ctrl.classList.remove('at-limit');void ctrl.offsetWidth;ctrl.classList.add('at-limit');setTimeout(function(){ctrl.classList.remove('at-limit');},500);}
  }
}
function resetCanvasZoom(){setCanvasZoom(100);}
function toggleCanvasFlip(){
  CANVAS_CARD_FLIPPED=!CANVAS_CARD_FLIPPED;
  var inner=document.querySelector('.stijlCanvasWindow .cardFaceInner');
  if(inner)inner.classList.toggle('flipped',CANVAS_CARD_FLIPPED);
  var btn=document.querySelector('.stijlCanvasFlipBtn');
  if(btn)btn.classList.toggle('sel',CANVAS_CARD_FLIPPED);
}
function focusShapeEditor(key){
  var sel='.shapeEditor[data-shape-key="'+String(key||'').replace(/"/g,'&quot;')+'"]';
  var el=document.querySelector(sel);
  if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'start'});
}
function syncShapeFieldInputs(key,idx){
  var layer=getCardShapeLayers(key)[idx];
  if(!layer)return;
  Array.prototype.slice.call(document.querySelectorAll('[data-shape-input="'+key+':'+idx+'"]')).forEach(function(input){
    var field=input.dataset.field;
    if(field&&field in layer)input.value=layer[field];
  });
}
function updateShapePosition(key,idx,x,y){
  var layer=getCardShapeLayers(key)[idx];
  if(!layer)return;
  captureHistoryBeforeChange();
  layer.x=Math.max(-25,Math.min(125,Math.round(x)));
  layer.y=Math.max(-25,Math.min(125,Math.round(y)));
  markDirty();
  renderCardShapeTargets();
  syncShapeFieldInputs(key,idx);
}
function clearActiveShapeSelection(key){
  key=key||activeStyleEditKey();
  if(SHAPE_SEL_TIMER){clearTimeout(SHAPE_SEL_TIMER);SHAPE_SEL_TIMER=null;}
  if(!getShapeSelectedIndices(key).length)return false;
  STYLE_SHAPE_SELECTED_MULTI[key]=[];
  STYLE_SHAPE_SELECTED[key]=-1;
  renderCardShapeTargets();
  refreshShapeEditors(key);
  syncPreviewGridAccentState();
  return true;
}
function nudgeActiveShapeLayer(dx,dy){
  var key=activeStyleEditKey();
  var idx=getShapeActiveIndex(key,false);
  if(idx<0)return false;
  var layer=getCardShapeLayers(key)[idx];
  if(!layer)return false;
  var nextX=(Number(layer.x)||50)+Number(dx||0);
  var nextY=(Number(layer.y)||50)+Number(dy||0);
  updateShapePosition(key,idx,nextX,nextY);
  return true;
}
function dragShapeTo(clientX,clientY){
  if(!SHAPE_DRAG||!SHAPE_DRAG.layerEl)return;
  var rect=SHAPE_DRAG.layerEl.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  var zoom=CANVAS_ZOOM_PCT/100;
  var x=((clientX-rect.left)/rect.width*zoom)*100-(SHAPE_DRAG.offsetX||0);
  var y=((clientY-rect.top)/rect.height*zoom)*100-(SHAPE_DRAG.offsetY||0);
  updateShapePosition(SHAPE_DRAG.key,SHAPE_DRAG.idx,x,y);
}
function getShapeLayerSelectionFromRect(layerEl,rect){
  if(!layerEl||!rect)return [];
  return Array.prototype.slice.call(layerEl.querySelectorAll('.cpShape,.cpShapeText')).map(function(el){
    var r=el.getBoundingClientRect();
    var overlap=!(r.right<rect.left||r.left>rect.right||r.bottom<rect.top||r.top>rect.bottom);
    return overlap?Number(el.dataset.shapeIdx):-1;
  }).filter(function(idx){return idx>=0;}).sort(function(a,b){return a-b;});
}
function clearShapeMarquee(){
  if(SHAPE_MARQUEE&&SHAPE_MARQUEE.boxEl&&SHAPE_MARQUEE.boxEl.parentNode)SHAPE_MARQUEE.boxEl.parentNode.removeChild(SHAPE_MARQUEE.boxEl);
  SHAPE_MARQUEE=null;
}
function updateShapeMarquee(clientX,clientY){
  if(!SHAPE_MARQUEE||!SHAPE_MARQUEE.hostEl||!SHAPE_MARQUEE.boxEl)return;
  var hostRect=SHAPE_MARQUEE.hostEl.getBoundingClientRect();
  var x1=Math.max(0,Math.min(hostRect.width,SHAPE_MARQUEE.startX-hostRect.left));
  var y1=Math.max(0,Math.min(hostRect.height,SHAPE_MARQUEE.startY-hostRect.top));
  var x2=Math.max(0,Math.min(hostRect.width,clientX-hostRect.left));
  var y2=Math.max(0,Math.min(hostRect.height,clientY-hostRect.top));
  var left=Math.min(x1,x2),top=Math.min(y1,y2),width=Math.abs(x2-x1),height=Math.abs(y2-y1);
  SHAPE_MARQUEE.boxEl.style.left=left+'px';
  SHAPE_MARQUEE.boxEl.style.top=top+'px';
  SHAPE_MARQUEE.boxEl.style.width=width+'px';
  SHAPE_MARQUEE.boxEl.style.height=height+'px';
}
function finishShapeMarquee(clientX,clientY){
  if(!SHAPE_MARQUEE)return false;
  updateShapeMarquee(clientX,clientY);
  var box=SHAPE_MARQUEE.boxEl.getBoundingClientRect();
  var minArea=6;
  var didSelect=false;
  if(box.width>minArea&&box.height>minArea){
    var picked=getShapeLayerSelectionFromRect(SHAPE_MARQUEE.layerEl,box);
    setShapeSelection(SHAPE_MARQUEE.key,picked,picked.length?picked[picked.length-1]:-1);
    refreshShapeEditors(SHAPE_MARQUEE.key);
    renderCardShapeTargets();
    startShapeSelTimer(SHAPE_MARQUEE.key);
    didSelect=true;
  }
  clearShapeMarquee();
  return didSelect;
}
function startShapeMarquee(ev,key,hostEl,layerEl){
  if(!hostEl||!layerEl)return false;
  clearShapeContextMenu();
  clearShapeMarquee();
  var box=document.createElement('div');
  box.className='shapeMarqueeBox';
  hostEl.appendChild(box);
  SHAPE_MARQUEE={key:key,hostEl:hostEl,layerEl:layerEl,boxEl:box,startX:ev.clientX,startY:ev.clientY};
  updateShapeMarquee(ev.clientX,ev.clientY);
  return true;
}
function startShapeDrag(ev,key,idx){
  var shapeEl=ev.currentTarget||ev.target.closest('.cpShape,.cpShapeText');
  var layerEl=shapeEl&&shapeEl.closest('.cpShapeLayer');
  if(!shapeEl||!layerEl)return;
  clearShapeContextMenu();
  if(ev&&ev.button===2){
    var selectedNow=getShapeSelectedIndices(key);
    if(selectedNow.indexOf(Number(idx))<0){
      setShapeSelection(key,[Number(idx)],Number(idx));
    }else{
      setShapeSelection(key,selectedNow,Number(idx));
    }
    refreshShapeEditors(key);
    renderCardShapeTargets();
    startShapeSelTimer(key);
    ev.preventDefault();
    ev.stopPropagation();
    return;
  }
  if(ev&&ev.button!==0)return;
  if(ev.shiftKey||ev.metaKey||ev.ctrlKey){
    toggleShapeSelection(key,idx);
    refreshShapeEditors(key);
    setTimeout(function(){focusShapeEditor(key);},20);
    startShapeSelTimer(key);
    ev.preventDefault();
    ev.stopPropagation();
    return;
  }
  if(key==='cover')COVER_TEXT_SELECTED_MULTI=[];
  setShapeSelection(key,[Number(idx)],Number(idx));
  refreshShapeEditors(key);
  setTimeout(function(){focusShapeEditor(key);},20);
  startShapeSelTimer(key);
  var _layer=getCardShapeLayers(key)[idx];
  var _rect=layerEl.getBoundingClientRect();
  var _zoom=CANVAS_ZOOM_PCT/100;
  var _mouseX=((_rect.width>0)?((ev.clientX-_rect.left)/_rect.width*_zoom*100):50);
  var _mouseY=((_rect.height>0)?((ev.clientY-_rect.top)/_rect.height*_zoom*100):50);
  var _offX=_mouseX-(Number((_layer&&_layer.x))||50);
  var _offY=_mouseY-(Number((_layer&&_layer.y))||50);
  SHAPE_DRAG={key:key,idx:idx,layerEl:layerEl,shapeEl:shapeEl,offsetX:_offX,offsetY:_offY};
  shapeEl.classList.add('dragging');
  syncPreviewGridAccentState();
  ev.preventDefault();
  ev.stopPropagation();
}
function getShapeContextMenu(){
  if(SHAPE_CONTEXT_MENU&&document.body.contains(SHAPE_CONTEXT_MENU))return SHAPE_CONTEXT_MENU;
  var el=document.createElement('div');
  el.className='shapeContextMenu hidden';
  var icFront='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="5.5" width="8" height="6" rx="1.2"></rect><rect x="10.5" y="12.5" width="8" height="6" rx="1.2" opacity=".35"></rect></svg>';
  var icBack='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="10" y="5.5" width="8" height="6" rx="1.2" opacity=".35"></rect><rect x="5.5" y="12.5" width="8" height="6" rx="1.2"></rect></svg>';
  var icGroup='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="7" width="8" height="8" rx="1.5"></rect><rect x="12" y="9" width="8" height="8" rx="1.5"></rect></svg>';
  var icUngroup='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="7" width="8" height="8" rx="1.5"></rect><rect x="12" y="9" width="8" height="8" rx="1.5"></rect><path d="M13 12h5"></path></svg>';
  var icDelete='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12h10l1-12"/><path d="M9 7V4h6v3"/></svg>';
  var sep='<div class="shapeContextSep" role="separator"></div>';
  el.innerHTML=
    '<button type="button" data-shape-menu-action="front">'+icFront+'Naar voren</button>'+
    '<button type="button" data-shape-menu-action="back">'+icBack+'Naar achter</button>'+
    sep+
    '<button type="button" data-shape-menu-action="group">'+icGroup+'Groeperen</button>'+
    '<button type="button" data-shape-menu-action="ungroup">'+icUngroup+'Degroepeer</button>'+
    sep+
    '<button type="button" data-shape-menu-action="delete" class="is-danger">'+icDelete+'Verwijderen</button>';
  el.addEventListener('mousedown',function(ev){ev.preventDefault();ev.stopPropagation();});
  el.addEventListener('contextmenu',function(ev){ev.preventDefault();ev.stopPropagation();});
  el.addEventListener('click',function(ev){
    var btn=ev.target.closest('[data-shape-menu-action]');
    if(!btn)return;
    if(btn.disabled||btn.classList.contains('is-disabled'))return;
    var action=btn.dataset.shapeMenuAction;
    var key=el.dataset.shapeKey||activeStyleEditKey();
    if(action==='back')moveSelectedShapeLayers(key,-1);
    else if(action==='front')moveSelectedShapeLayers(key,1);
    else if(action==='group')groupSelectedShapeLayers(key);
    else if(action==='ungroup')ungroupSelectedShapeLayers(key);
    else if(action==='delete')removeSelectedShapeLayers(key);
    clearShapeContextMenu();
  });
  document.body.appendChild(el);
  SHAPE_CONTEXT_MENU=el;
  return el;
}
function clearShapeContextMenu(){
  var menu=getShapeContextMenu();
  menu.classList.add('hidden');
  menu.style.left='-9999px';
  menu.style.top='-9999px';
  menu.dataset.shapeKey='';
}
function openShapeContextMenu(ev,key,idx){
  if(ev)ev.preventDefault();
  if(typeof idx==='number'&&idx>=0){
    var selectedNow=getShapeSelectedIndices(key);
    if(selectedNow.indexOf(Number(idx))<0){
      setShapeSelection(key,[Number(idx)],Number(idx));
    }else{
      setShapeSelection(key,selectedNow,Number(idx));
    }
  }
  refreshShapeEditors(key);
  renderCardShapeTargets();
  startShapeSelTimer(key);
  var menu=getShapeContextMenu();
  var layers=getCardShapeLayers(key);
  var selected=getShapeSelectedIndices(key);
  var textSelected=(key==='cover'?getCoverTextSelectedIndices():[]);
  var canGroup=(selected.length+textSelected.length)>1;
  var canUngroup=selected.some(function(selIdx){return isGroupLayer(layers[selIdx]);});
  Array.prototype.slice.call(menu.querySelectorAll('[data-shape-menu-action]')).forEach(function(btn){
    var action=btn.dataset.shapeMenuAction;
    var disabled=(action==='group'&&!canGroup)||(action==='ungroup'&&!canUngroup);
    btn.disabled=!!disabled;
    btn.classList.toggle('is-disabled',!!disabled);
  });
  menu.dataset.shapeKey=key;
  menu.classList.remove('hidden');
  menu.style.left=Math.round(ev.clientX+8)+'px';
  menu.style.top=Math.round(ev.clientY+8)+'px';
  return false;
}
// Shape palette: built from BRAND_FAMILIES — quick row + full base/deep/light rows
// Shape palette: one base tone per family + Kleurtoon for lighter/darker
var SHAPE_PAL_ROWS=(function(){
  var fam=BRAND_FAMILIES;
  var quick=[
    {a:'#FFFFFF',n:'Wit'},
    {a:'#CFE6D8',n:'Mintgroen'},
    {a:'#CAD6EF',n:'Hemelblauw'},
    {a:'#E7E1F5',n:'Lavendel'},
    {a:'#F8E4D2',n:'Perzik'},
    {a:'#A8D8D6',n:'Teal'},
    {a:'#F4E2A5',n:'Botergeel'},
    {a:'#F2C8D2',n:'Roze'}
  ];
  // Expanded: grouped by natural color category (greens/blues/purples/warm/yellows/apricot/contrasts/deep)
  // Boundaries match BRAND_FAMILIES order: 0-3, 4-7, 8-11, 12-15, 16-22, 23-29, 30-36, 37-41
  var bounds=[0,4,8,12,16,23,30,37,42];
  var rows=[quick];
  for(var b=0;b<bounds.length-1;b++){
    var g=fam.slice(bounds[b],bounds[b+1]);
    rows.push(g.map(function(f){return {a:f.light,n:f.n+' licht'};}));
    rows.push(g.map(function(f){return {a:f.base,n:f.n};}));
    rows.push(g.map(function(f){return {a:f.deep,n:f.n+' diep'};}));
  }
  return rows;
})();
var STYLE_ICON_QUERY={};
var STYLE_ICON_SELECTED={};
var STYLE_ICON_OPEN={};
var STIJL_SHAPES_OPEN={}; // collapsed per key; default open (undefined = open)
var STYLE_ICON_RESULTS={};
var STYLE_ICON_LOADING={};
var STYLE_ICON_REQ={};
var STYLE_ICON_TIMER={};
var STYLE_ICON_ROW_LIMIT=8;
var ICON_LIBRARY=[
  {id:'lightbulb',label:'Idee',tags:'idee lamp inzicht brainwave denk',external:false},
  {id:'eye',label:'Observatie',tags:'oog zien observeren kijken waarnemen',external:false},
  {id:'chat',label:'Gesprek',tags:'gesprek praten dialoog chat spraak',external:false},
  {id:'check',label:'Akkoord',tags:'vinkje check klaar akkoord bevestig',external:false},
  {id:'key',label:'Inzicht',tags:'sleutel inzicht oplossing antwoord',external:false},
  {id:'magnifier',label:'Onderzoek',tags:'zoeken onderzoek vergrootglas ontdekken',external:false},
  {id:'clock',label:'Tijd',tags:'klok tijd moment planning wacht',external:false},
  {id:'pencil',label:'Notitie',tags:'potlood schrijven notitie aantekening',external:false},
  {id:'people',label:'Groep',tags:'mensen groep samenwerking team persoon',external:false},
  {id:'plus',label:'Plus',tags:'kruis plus toevoegen meer optellen cross',external:false},
  {id:'sun',label:'Energie',tags:'zon warmte energie licht positief',external:false},
  {id:'star4',label:'Highlight',tags:'ster vierpunts glans accent highlight',external:false},
  {id:'book',label:'Kennis',tags:'boek lezen kennis informatie',external:false},
];
function iconLibrarySvg(id){
  var map={
    spark:'<svg viewBox="0 0 24 24"><path d="M12 3 13.8 9.2 20 11 13.8 12.8 12 19 10.2 12.8 4 11 10.2 9.2Z"/></svg>',
    heart:'<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.35-7-9.1C5 8.2 6.9 6.5 9.2 6.5c1.4 0 2.3.6 2.8 1.5.5-.9 1.4-1.5 2.8-1.5 2.3 0 4.2 1.7 4.2 4.4 0 4.75-7 9.1-7 9.1Z"/></svg>',
    leaf:'<svg viewBox="0 0 24 24"><path d="M19 5c-7 0-12 4.5-12 11 0 1.1.2 2.1.5 3 7.2-.8 11.8-5.4 11.5-14Z"/><path d="M8 16c2.5-2.5 5.3-4.5 8.5-6"/></svg>',
    sun:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.3M12 18.9v2.3M21.2 12h-2.3M5.1 12H2.8M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6 17 17M7 7 5.4 5.4"/></svg>',
    cloud:'<svg viewBox="0 0 24 24"><path d="M7 18h9.5a4 4 0 0 0 .2-8 5.5 5.5 0 0 0-10.4 1.6A3.5 3.5 0 0 0 7 18Z"/></svg>',
    drop:'<svg viewBox="0 0 24 24"><path d="M12 4.5c3.2 4.2 5 6.8 5 9.2a5 5 0 1 1-10 0c0-2.4 1.8-5 5-9.2Z"/></svg>',
    pin:'<svg viewBox="0 0 24 24"><path d="M12 20c-3.6-4-5.4-6.8-5.4-9a5.4 5.4 0 1 1 10.8 0c0 2.2-1.8 5-5.4 9Z"/><circle cx="12" cy="11" r="1.5"/></svg>',
    chat:'<svg viewBox="0 0 24 24"><path d="M6.5 7.5h11a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5H9l-3.5 3V10a2.5 2.5 0 0 1 2.5-2.5Z"/><path d="M9.2 11.2h5.8"/></svg>',
    bookmark:'<svg viewBox="0 0 24 24"><path d="M8 5.5h8a1.5 1.5 0 0 1 1.5 1.5v11.5L12 16l-5.5 2.5V7A1.5 1.5 0 0 1 8 5.5Z"/></svg>',
    book:'<svg viewBox="0 0 24 24"><path d="M7 6.5h8.5a2.5 2.5 0 0 1 2.5 2.5v8.5H9.5A2.5 2.5 0 0 0 7 20Z"/><path d="M7 6.5V20"/></svg>',
    star4:'<svg viewBox="0 0 24 24"><path d="m12 4 1.7 6.3L20 12l-6.3 1.7L12 20l-1.7-6.3L4 12l6.3-1.7Z"/></svg>',
    flower:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.2"/><path d="M12 4.5c1.8-2 5 .2 4 2.8-.5 1.4-2 2.1-4 2.1-2 0-3.5-.7-4-2.1-1-2.6 2.2-4.8 4-2.8Z"/><path d="M19.5 12c2-1.8-.2-5-2.8-4-1.4.5-2.1 2-2.1 4 0 2 .7 3.5 2.1 4 2.6 1 4.8-2.2 2.8-4Z"/><path d="M12 19.5c-1.8 2-5-.2-4-2.8.5-1.4 2-2.1 4-2.1 2 0 3.5.7 4 2.1 1 2.6-2.2 4.8-4 2.8Z"/><path d="M4.5 12c-2 1.8.2 5 2.8 4 1.4-.5 2.1-2 2.1-4 0-2-.7-3.5-2.1-4-2.6-1-4.8 2.2-2.8 4Z"/></svg>',
    lightbulb:'<svg viewBox="0 0 24 24"><path d="M9.5 17.5h5M10 20h4M12 3a5.5 5.5 0 0 1 3.5 9.7c-.6.5-1 1.3-1 2.1V16h-5v-1.2c0-.8-.4-1.6-1-2.1A5.5 5.5 0 0 1 12 3Z"/></svg>',
    eye:'<svg viewBox="0 0 24 24"><path d="M3 12c2.5-4.5 5.5-7 9-7s6.5 2.5 9 7c-2.5 4.5-5.5 7-9 7s-6.5-2.5-9-7Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    check:'<svg viewBox="0 0 24 24"><path d="M5 12.5 9.5 17 19 7.5"/></svg>',
    key:'<svg viewBox="0 0 24 24"><circle cx="9" cy="12" r="4"/><path d="M13 12h6.5M17 12v2.5"/></svg>',
    magnifier:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M15.5 15.5 20 20"/></svg>',
    clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>',
    pencil:'<svg viewBox="0 0 24 24"><path d="M16 4.5 19.5 8 8.5 19 4 20l.5-4.5Z"/><path d="M14 6.5 17.5 10"/></svg>',
    people:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="8.5" r="2.5"/><path d="M20.5 19.5c0-2.5-1.6-4.3-3.5-5"/></svg>',
    plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
  };
  return map[id]||map.spark;
}
function iconLibraryItemById(id){
  id=String(id||'').trim();
  if(!id)return null;
  var local=ICON_LIBRARY.find(function(item){return item.id===id;});
  if(local)return local;
  if(id.indexOf(':')>=0)return normalizeIconifyResult(id);
  return null;
}
function svgTextToDataUrl(svgText){
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(String(svgText||''));
}
function normalizeIconSvgForImport(svgText){
  var raw=String(svgText||'').trim();
  if(!raw)return '';
  var doc=(new DOMParser()).parseFromString(raw,'image/svg+xml');
  var root=doc.documentElement;
  if(!root||String(root.nodeName||'').toLowerCase()==='parsererror')return '';
  if(!root.getAttribute('xmlns'))root.setAttribute('xmlns','http://www.w3.org/2000/svg');
  Array.prototype.slice.call(root.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line')).forEach(function(node){
    if(!node.getAttribute('fill'))node.setAttribute('fill','none');
    if(!node.getAttribute('stroke'))node.setAttribute('stroke','#5f8894');
    if(!node.getAttribute('stroke-width'))node.setAttribute('stroke-width','1');
    if(!node.getAttribute('stroke-linecap'))node.setAttribute('stroke-linecap','round');
    if(!node.getAttribute('stroke-linejoin'))node.setAttribute('stroke-linejoin','round');
  });
  return new XMLSerializer().serializeToString(root);
}
function filteredIconLibrary(key){
  var q=String(STYLE_ICON_QUERY[key]||'').trim().toLowerCase();
  var remote=STYLE_ICON_RESULTS[key];
  if(q&&Array.isArray(remote))return remote.slice(0,18);
  if(!q)return ICON_LIBRARY.slice(0,6);
  return ICON_LIBRARY.filter(function(item){
    var hay=(item.label+' '+item.tags+' '+item.id).toLowerCase();
    return hay.indexOf(q)>=0;
  }).slice(0,12);
}
function iconifySvgUrl(name){
  return 'https://api.iconify.design/'+encodeURIComponent(name)+'.svg';
}
function iconifySearchUrl(query){
  return 'https://api.iconify.design/search?query='+encodeURIComponent(query)+'&limit=18';
}
function normalizeIconifyResult(name){
  var full=String(name||'').trim();
  if(!full||full.indexOf(':')<0)return null;
  var short=full.split(':')[1]||full;
  return {id:full,label:short,tags:short.replace(/[-_]+/g,' '),svgUrl:iconifySvgUrl(full),external:true};
}
function fetchStyleIcons(key){
  var q=String(STYLE_ICON_QUERY[key]||'').trim();
  if(q.length<2){
    STYLE_ICON_LOADING[key]=false;
    delete STYLE_ICON_RESULTS[key];
    refreshShapeEditors(key);
    return;
  }
  var reqId=(STYLE_ICON_REQ[key]||0)+1;
  STYLE_ICON_REQ[key]=reqId;
  STYLE_ICON_LOADING[key]=true;
  refreshShapeEditors(key);
  fetch(iconifySearchUrl(q),{cache:'no-store'})
    .then(function(r){
      if(!r.ok)throw new Error('Zoeken mislukt');
      return r.json();
    })
    .then(function(data){
      if(STYLE_ICON_REQ[key]!==reqId)return;
      var names=(data&&data.icons)||[];
      STYLE_ICON_RESULTS[key]=names.map(normalizeIconifyResult).filter(Boolean);
      STYLE_ICON_LOADING[key]=false;
      refreshShapeEditors(key);
    })
    .catch(function(){
      if(STYLE_ICON_REQ[key]!==reqId)return;
      STYLE_ICON_RESULTS[key]=[];
      STYLE_ICON_LOADING[key]=false;
      refreshShapeEditors(key);
    });
}
function buildIconLibraryHtml(key){
  var items=filteredIconLibrary(key);
  var selected=STYLE_ICON_SELECTED[key]||'';
  var isOpen=!!STYLE_ICON_OPEN[key];
  var q=String(STYLE_ICON_QUERY[key]||'').trim();
  var isLoading=!!STYLE_ICON_LOADING[key];
  var iconButtonHtml=function(item){
    var iconHtml=item.external
      ? '<span class="iconGlyph" aria-hidden="true" style="--icon-url:url(&quot;'+esc(item.svgUrl)+'&quot;)"></span>'
      : iconLibrarySvg(item.id);
    return '<button class="iconChip'+(selected===item.id?' sel':'')+'" type="button" title="'+esc(item.label)+'" onclick="addStyleIconShape(\''+esc(key)+'\',\''+esc(item.id)+'\')">'+iconHtml+'</button>';
  };
  return '<div class="iconLibrary">'+
    '<div class="iconLibraryHead"><div class="stijlSectionLabel">Iconen</div><button type="button" aria-label="Icoon toevoegen" title="'+(isOpen?'Sluiten':'Icoon toevoegen')+'" onclick="toggleStyleIconLibrary(\''+esc(key)+'\')" style="border:none;background:transparent;color:#5c8f9f;font:inherit;font-size:21px;font-weight:300;line-height:1;cursor:pointer;padding:0 1px;box-shadow:none;opacity:.88">'+(isOpen?'−':'+')+'</button></div>'+
    (isOpen
      ? '<div class="iconGridMini">'+ICON_LIBRARY.slice(0,STYLE_ICON_ROW_LIMIT).map(iconButtonHtml).join('')+'</div>'+
        '<input class="iconSearch" type="search" value="'+esc(STYLE_ICON_QUERY[key]||'')+'" placeholder="Zoek in het Engels, bv. arrow of heart" oninput="setStyleIconQuery(\''+esc(key)+'\',this.value)">'+
        (isLoading
          ? '<div class="iconLoading">Iconen laden…</div>'
          : q.length>=2
          ? (items.length
              ? '<div class="iconGridMini">'+items.slice(0,STYLE_ICON_ROW_LIMIT).map(iconButtonHtml).join('')+'</div>'
              : '<div class="iconEmpty">Geen iconen gevonden.</div>')
          : '')
      : '')+
  '</div>';
}
function toggleStyleIconLibrary(key){
  STYLE_ICON_OPEN[key]=!STYLE_ICON_OPEN[key];
  refreshShapeEditors(key);
}
function toggleShapesSection(key){
  // undefined/false = open, true = collapsed
  STIJL_SHAPES_OPEN[key]=STIJL_SHAPES_OPEN[key]===true?false:true;
  refreshShapeEditors(key);
}
function setStyleIconQuery(key,val){
  STYLE_ICON_QUERY[key]=String(val||'');
  clearTimeout(STYLE_ICON_TIMER[key]);
  STYLE_ICON_TIMER[key]=setTimeout(function(){fetchStyleIcons(key);},180);
}
function selectStyleIconDraft(key,id){
  STYLE_ICON_SELECTED[key]=STYLE_ICON_SELECTED[key]===id?'':id;
  refreshShapeEditors(key);
}
function addStyleIconShape(key,id){
  key=key||activeStyleEditKey();
  var item=iconLibraryItemById(id);
  if(!item)return;
  STYLE_ICON_SELECTED[key]=item.id;
  if(item.external&&item.svgUrl){
    fetch(item.svgUrl,{cache:'no-store'})
      .then(function(r){
        if(!r.ok)throw new Error('svg');
        return r.text();
      })
      .then(function(svgText){
        var normalized=normalizeIconSvgForImport(svgText);
        if(!normalized)throw new Error('parse');
        appendImportedSvgShapes(key,svgTextToDataUrl(normalized));
      })
      .catch(function(){
        toast('Icoon kon niet worden toegevoegd','amber');
      });
    return;
  }
  var localSvg=normalizeIconSvgForImport(iconLibrarySvg(item.id));
  if(!localSvg){
    toast('Icoon kon niet worden toegevoegd','amber');
    return;
  }
  appendImportedSvgShapes(key,svgTextToDataUrl(localSvg));
}
function shapeColorPaletteHtml(key,idx,field,current){
  var cur=String(current||'').toLowerCase();
  var hexNorm=normalizeHexInput(current)||'#ffffff';
  var palKey='sp_'+key+'_'+idx+'_'+field;
  var isExpanded=!!STYLE_PAL_EXPANDED[palKey];
  var gridIcon='<svg viewBox="0 0 14 14" width="11" height="11" fill="currentColor" opacity=".75"><rect x="1.5" y="1.5" width="3" height="3" rx=".8"/><rect x="5.5" y="1.5" width="3" height="3" rx=".8"/><rect x="9.5" y="1.5" width="3" height="3" rx=".8"/><rect x="1.5" y="5.5" width="3" height="3" rx=".8"/><rect x="5.5" y="5.5" width="3" height="3" rx=".8"/><rect x="9.5" y="5.5" width="3" height="3" rx=".8"/><rect x="1.5" y="9.5" width="3" height="3" rx=".8"/><rect x="5.5" y="9.5" width="3" height="3" rx=".8"/><rect x="9.5" y="9.5" width="3" height="3" rx=".8"/></svg>';
  var swBtn=function(p){
    var hex=String(p.a||'').toLowerCase();
    var isLight=hex==='#ffffff'||hex==='ffffff';
    return '<button class="brandSw'+(isLight?' brandSwLight':'')+(cur===hex?' sel':'')+'" type="button" title="'+esc(p.n)+'" style="background:'+esc(p.a)+'" onclick="updateShapeField(\''+esc(key)+'\','+idx+',\''+field+'\',\''+esc(p.a)+'\')"></button>';
  };
  var applyInline='updateShapeField(\''+esc(key)+'\','+idx+',\''+field+'\',this.value)';
  var shapeQuick=SHAPE_PAL_ROWS[0].slice();
  (function(){var ext=BRAND_FAMILIES;for(var _qi=0;_qi<ext.length&&shapeQuick.length<24;_qi+=2){var _fc=ext[_qi];if(_fc&&!shapeQuick.some(function(q){return q.a===_fc.base;}))shapeQuick.push({n:_fc.n,a:_fc.base});}})();
  var html='<div class="brandCompact">'+
    '<div class="brandQSection">'+
      '<div class="brandQuickRow">'+
        '<div class="brandSwsGroup">'+
          shapeQuick.map(swBtn).join('')+
        '</div>'+
        '<div class="brandQuickActions">'+
          '<button class="brandExpandBtn'+(isExpanded?' on':'')+'" type="button" data-action="expandpicker" data-target="'+esc(palKey)+'" data-shape-key="'+esc(key)+'" title="'+(isExpanded?'Minder':'Meer kleuren')+'">'+gridIcon+'</button>'+
          '<span class="brandQSep"></span>'+
          '<label class="brandCurrentSw" style="background:'+esc(hexNorm)+'">'+
            '<input type="color" value="'+esc(hexNorm)+'" oninput="'+applyInline+';this.parentElement.style.background=this.value">'+
          '</label>'+
        '</div>'+
      '</div>'+
    '</div>';
  if(isExpanded){
    html+='<div class="brandExpandedWrap">';
    var shapeRows=SHAPE_PAL_ROWS.slice(1);
    if(shapeRows.length>=3){
      var swFams=[];
      for(var si=0;si<Math.floor(shapeRows.length/3);si++){
        var sr0=shapeRows[si*3]||[];
        var sr1=shapeRows[si*3+1]||[];
        var sr2=shapeRows[si*3+2]||[];
        for(var sfi=0;sfi<sr0.length;sfi++){
          var spL=sr0[sfi],spB=sr1[sfi]||sr0[sfi],spD=sr2[sfi]||sr0[sfi];
          if(!spL)continue;
          swFams.push([spL,spB,spD]);
        }
      }
      var swLabels=['Rustig & fris','Warm & zacht','Neutraal & donker'];
      html+='<div class="brandWordBlocks">';
      [0,14,28].forEach(function(start,bi){
        var sgrp=swFams.slice(start,start+14);
        if(!sgrp.length)return;
        html+='<div class="brandWordSection">'+
          '<div class="brandWordLabel">'+swLabels[bi]+'</div>'+
          '<div class="brandWordBlock">';
        sgrp.forEach(function(fam){
          fam.forEach(function(p){html+=swBtn(p);});
        });
        html+='</div></div>';
      });
      html+='</div>';
    }
    html+='<label class="brandCustomBtn" style="--pick:'+esc(hexNorm)+'">'+
      '<span class="brandCustomSw"></span>Eigen kleur…'+
      '<input type="color" value="'+esc(hexNorm)+'" oninput="'+applyInline+';this.parentElement.style.setProperty(\'--pick\',this.value)">'+
    '</label></div>';
  }
  html+='</div>';
  return html;
}
function shapeColorRowHtml(key,idx,field,current){
  return '<div class="shapeSwRow">'+SHAPE_SWATCHES.map(function(hex){
    return '<button class="shapeSw'+(String(current||'').toLowerCase()===hex.toLowerCase()?' sel':'')+'" type="button" title="'+hex+'" style="background:'+hex+'" onclick="updateShapeField(\''+esc(key)+'\','+idx+',\''+field+'\',\''+hex+'\')"></button>';
  }).join('')+
  '<button class="shapeMiniPick clear" type="button" title="Transparant" onclick="updateShapeField(\''+esc(key)+'\','+idx+',\''+field+'\',\'transparent\')"></button>'+
  '<label class="shapeCustomBtn" style="--pick:'+esc(normalizeHexInput(current)||'#ffffff')+'"><span class="shapeCustomSw"></span><span>Kleur</span><input type="color" value="'+esc(normalizeHexInput(current)||'#ffffff')+'" oninput="updateShapeField(\''+esc(key)+'\','+idx+',\''+field+'\',this.value);this.parentNode.style.setProperty(&quot;--pick&quot;,this.value)"></label>'+
  '</div>';
}
function colorToneAdjust(baseHex,tone){
  var base=normalizeHexInput(baseHex);
  if(!base)return '';
  var n=Math.max(-100,Math.min(100,parseInt(tone,10)||0));
  if(n===0)return base;
  var rgb=hexToRgbAdmin(base);
  if(!rgb)return base;
  // Convert to HSL
  var r=rgb.r/255,g=rgb.g/255,b=rgb.b/255;
  var mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  var h=0,s=0,l=(mx+mn)/2;
  if(d>0){
    s=l>0.5?d/(2-mx-mn):d/(mx+mn);
    if(mx===r)h=((g-b)/d+(g<b?6:0))/6;
    else if(mx===g)h=((b-r)/d+2)/6;
    else h=((r-g)/d+4)/6;
  }
  var amt=Math.abs(n)/100;
  var newL,newS;
  if(n>0){
    // Lighten: stays within family range — max L=0.93 (light pastel, not white)
    newL=l+(0.93-l)*Math.sqrt(amt);
    newS=s*Math.pow(1-amt,0.7);
  }else{
    // Darken: stays within family range — min L=0.25 (dark but recognisable hue, not near-black)
    newL=l*(1-amt)+0.25*amt;
    newS=Math.min(1,s+s*(amt*0.4));
  }
  // HSL → RGB
  function hue2rgb(p,q,t){t=t<0?t+1:t>1?t-1:t;if(t<1/6)return p+(q-p)*6*t;if(t<0.5)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;}
  var nr,ng,nb;
  if(newS===0){nr=ng=nb=newL;}
  else{var q=newL<0.5?newL*(1+newS):newL+newS-newL*newS,p=2*newL-q;nr=hue2rgb(p,q,h+1/3);ng=hue2rgb(p,q,h);nb=hue2rgb(p,q,h-1/3);}
  return rgbToHexAdmin(nr*255,ng*255,nb*255);
}
function shapeColorToneValue(layer,target){
  return Number(layer&&layer[target+'Tone'])||0;
}
function setShapeColorTone(key,idx,target,val,dragging){
  var layers=getCardShapeLayers(key),layer=layers[idx];
  if(!layer)return;
  var tone=Math.max(-100,Math.min(100,parseInt(val,10)||0));
  var baseField=target+'Base';
  var colorField=target;
  var base=normalizeHexInput(layer[baseField])||normalizeHexInput(layer[colorField])||'#CFE6DF';
  layer[baseField]=base;
  layer[target+'Tone']=tone;
  layer[colorField]=colorToneAdjust(base,tone);
  markDirty();
  renderCardShapeTargets();
  if(!dragging)refreshShapeEditors(key);
}
function cardBgToneValue(){
  return cardBgToneForKey(((S.d||{}).meta||{}),activeStyleEditKey());
}
function setCardBgTone(val){
  var meta=(S.d||{}).meta=S.d.meta||{};
  var tone=Math.max(-100,Math.min(100,parseInt(val,10)||0));
  var key=activeStyleEditKey();
  var maps=cardBgMaps(meta);
  var base=cardBgBaseForKey(meta,key);
  maps.base[key]=base;
  maps.tone[key]=tone;
  setCardBuildMode(key,'self');
  markDirty();
  updateStijlPreview();
}
function shapeChipIconHtml(layer){
  if(isTextLayerItem(layer))return textIconSvg();
  if(layer&&layer.type==='imported'&&layer.importMarkup){
    return '<svg viewBox="0 0 100 100" aria-hidden="true">'+shapeLayerRenderMarkup(layer,'icon')+'</svg>';
  }
  return shapeIconSvg((layer&&layer.type)||'circle');
}
function buildCoverTextShapeChips(key){
  if(key!=='cover')return '';
  return coverTextStore().map(function(item,idx){
    var label=String(item.text||'').trim()||('Tekstvak '+(idx+1));
    var isSel=isCoverTextSelected(idx);
    var isAct=currentCoverTextIdx()===idx;
    return '<button class="shapeChip shapeChipText'+(isSel?' sel':'')+(isAct?' active':'')+'" type="button" title="'+esc(label)+'" aria-label="'+esc(label)+'" onclick="selectCoverTextItem('+idx+',event)" oncontextmenu="return openCoverTextContextMenu(event,'+idx+')"><span class="shapeChipTextNum">'+(idx+1)+'</span>'+textIconSvg()+'</button>';
  }).join('');
}
function buildShapeEditorHtml(key){
  var layers=getCardShapeLayers(key);
  var active=getShapeActiveIndex(key);
  var layer=layers[active];
  var target=ensureShapeColorTarget(key);
  var shapesCollapsed=STIJL_SHAPES_OPEN[key]===true;
  var shapeToggleBtn='<button type="button" aria-label="'+(shapesCollapsed?'Vormen tonen':'Vormen inklappen')+'" title="'+(shapesCollapsed?'Tonen':'Inklappen')+'" onclick="toggleShapesSection(\''+esc(key)+'\')" style="border:none;background:transparent;color:#5c8f9f;font:inherit;font-size:21px;font-weight:300;line-height:1;cursor:pointer;padding:0 1px;box-shadow:none;opacity:.88">'+(shapesCollapsed?'+':'−')+'</button>';
  var sectionHead='<div class="stijlSectionLabel" style="display:flex;align-items:center;justify-content:space-between">Vormen'+shapeToggleBtn+'</div>';
  if(!layers.length||!layer){
    var emptyContent=
      ((layers.length||buildCoverTextShapeChips(key))
        ? '<div class="shapeLayerBar">'+
            layers.map(function(item,i){var shape=shapeLayerLabel(item);return '<button class="shapeChip'+(i===active?' sel':'')+'" type="button" title="'+esc(shape+' '+(i+1))+'" aria-label="'+esc(shape+' '+(i+1))+'" onclick="setShapeLayerActive(\''+esc(key)+'\','+i+')">'+shapeChipIconHtml(item)+'</button>';}).join('')+
            buildCoverTextShapeChips(key)+
          '</div>'+
          '<div class="shapeGhost">'+(layers.length?'Klik een vormlaag of tekstlaag om verder te werken.':'Klik een tekstlaag om verder te werken.')+'</div>'
        : '<div class="shapeGhost">Kies een vorm of tekst om te beginnen.</div>')+
      '<div class="shapeGrid">'+
        '<div class="shapeField"><div class="shapeTypeBar">'+
          SHAPE_TYPES.map(function(opt){return '<button class="shapeTypeBtn" type="button" title="'+esc(opt.label)+'" aria-label="'+esc(opt.label)+'" onclick="addShapeLayer(\''+esc(key)+'\',\''+opt.id+'\')">'+shapeIconSvg(opt.id)+'</button>';}).join('')+
          '<label class="shapeTypeImportBtn" title="SVG vorm toevoegen" aria-label="SVG vorm toevoegen"><span>+</span><input type="file" accept=".svg,image/svg+xml" onchange="importShapeSvgFile(\''+esc(key)+'\',this)"></label>'+
        '</div></div>'+
      '</div>'+
      buildIconLibraryHtml(key)+
      '<div class="shapeEmptyState"></div>';
    return '<div class="stijlShapes">'+sectionHead+(shapesCollapsed?'':emptyContent)+'</div>';
  }
  var fillColor=layer?(layer.fill||'#CFE6DF'):'#CFE6DF';
  var strokeColor=layer?(layer.stroke||'#ffffff'):'#ffffff';
  var fillTone=layer?shapeColorToneValue(layer,'fill'):0;
  var strokeTone=layer?shapeColorToneValue(layer,'stroke'):0;
  var currentOpacity=layer?Math.round((Number(layer[target==='stroke'?'strokeOpacity':'fillOpacity'])||1)*100):100;
  var sizeValue=layer?(layer.size||42):42;
  var rotateValue=layer?(layer.rotate||0):0;
  var selectedIndices=getShapeSelectedIndices(key);
  var selectedTextIndices=(key==='cover'?getCoverTextSelectedIndices():[]);
  var multiSelected=selectedIndices.length>1;
  var hasGroupSelection=selectedIndices.some(function(idx){return isGroupLayer(layers[idx]);});
  var hasTextSelection=!!selectedTextIndices.length;
  var deleteBtn=layer?'<button class="shapeLayerDelete" type="button" title="'+(multiSelected?'Geselecteerde vormen verwijderen':'Vorm verwijderen')+'" aria-label="'+(multiSelected?'Geselecteerde vormen verwijderen':'Vorm verwijderen')+'" onclick="removeSelectedShapeLayers(\''+esc(key)+'\')"><svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12h10l1-12"/><path d="M9 7V4h6v3"/></svg></button>':'';
  var layerContent=
    '<div class="shapeActiveWrap">'+
      '<div class="shapeActiveLabel">Actieve vormen</div>'+
      (hasGroupSelection?'<div class="shapeGhost" style="margin:4px 0 0">Kleur en type pas je aan na degroeperen.</div>':'')+
      '<div class="shapeLayerBar">'+
        layers.map(function(item,i){
          var shape=shapeLayerLabel(item);
          var isGroup=isGroupLayer(item);
          var isSel=isShapeSelected(key,i);
          var isAct=i===active;
          if(isGroup&&item.groupChildren&&item.groupChildren.length){
            var childChips=item.groupChildren.map(function(child,j){
              return '<button class="shapeChip shapeChipChild'+(isSel?' sel':'')+'" type="button" draggable="true" title="'+esc(shapeLayerLabel(child)+' '+(j+1))+'" aria-label="'+esc(shapeLayerLabel(child)+' '+(j+1))+'" ondragstart="dragGroupChild(event,\'start\',\''+esc(key)+'\','+i+','+j+')" ondragover="dragGroupChild(event,\'over\',\''+esc(key)+'\','+i+','+j+')" ondrop="dragGroupChild(event,\'drop\',\''+esc(key)+'\','+i+','+j+')" ondragend="dragGroupChild(event,\'end\',\''+esc(key)+'\','+i+','+j+')" onclick="setShapeLayerActive(\''+esc(key)+'\','+i+',event)">'+shapeChipIconHtml(child)+'</button>';
            }).join('');
            return '<span class="shapeChipGroupWrap'+(isSel?' sel':'')+'" draggable="true" ondragstart="dragShapeChip(event,\'start\',\''+esc(key)+'\','+i+')" ondragover="dragShapeChip(event,\'over\',\''+esc(key)+'\','+i+')" ondrop="dragShapeChip(event,\'drop\',\''+esc(key)+'\','+i+')" ondragend="dragShapeChip(event,\'end\',\''+esc(key)+'\','+i+')" onclick="setShapeLayerActive(\''+esc(key)+'\','+i+',event)">'+childChips+'</span>';
          }
          return '<button class="shapeChip'+(isSel?' sel':'')+(isAct?' active':'')+'" type="button" draggable="true" title="'+esc(shape+' '+(i+1))+'" aria-label="'+esc(shape+' '+(i+1))+'" ondragstart="dragShapeChip(event,\'start\',\''+esc(key)+'\','+i+')" ondragover="dragShapeChip(event,\'over\',\''+esc(key)+'\','+i+')" ondrop="dragShapeChip(event,\'drop\',\''+esc(key)+'\','+i+')" ondragend="dragShapeChip(event,\'end\',\''+esc(key)+'\','+i+')" onclick="setShapeLayerActive(\''+esc(key)+'\','+i+',event)">'+shapeChipIconHtml(item)+'</button>';
        }).join('')+
        buildCoverTextShapeChips(key)+
        (layers.length<6?'<button class="shapeLayerAdd" type="button" title="Vormlaag toevoegen" aria-label="Vormlaag toevoegen" onclick="addShapeLayer(\''+esc(key)+'\',\''+esc(layer.type||'circle')+'\')">+</button>':'')+
        deleteBtn+
      '</div>'+
    '</div>'+
    '<div class="shapeGrid">'+
      '<div class="shapeField"><div class="shapeTypeBar">'+
        SHAPE_TYPES.map(function(opt){return '<button class="shapeTypeBtn'+(layer&&opt.id===layer.type?' sel':'')+'" type="button" title="'+esc(opt.label)+'" aria-label="'+esc(opt.label)+'" onclick="selectShapeType(\''+esc(key)+'\','+active+',\''+opt.id+'\')">'+shapeIconSvg(opt.id)+'</button>';}).join('')+
        '<label class="shapeTypeImportBtn" title="SVG vorm toevoegen" aria-label="SVG vorm toevoegen"><span>+</span><input type="file" accept=".svg,image/svg+xml" onchange="importShapeSvgFile(\''+esc(key)+'\',this)"></label>'+
      '</div></div>'+
      (layer&&!hasGroupSelection?
        '<div class="shapePaintRow" style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'+
          '<div class="shapePaintTabs">'+
            '<button class="shapePaintBtn fill'+(target==='fill'?' sel':'')+'" type="button" title="Vulling" aria-label="Vulling" onclick="setShapeColorTarget(\''+esc(key)+'\',\'fill\')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 12 12 21 4 12Z"/></svg></button>'+
            '<button class="shapePaintBtn stroke'+(target==='stroke'?' sel':'')+'" type="button" title="Outline" aria-label="Outline" onclick="setShapeColorTarget(\''+esc(key)+'\',\'stroke\')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 12 12 21 4 12Z"/></svg></button>'+
          '</div>'+
          (target==='stroke'
            ? '<select class="fontSizeSel shapeOutlineSel" aria-label="Dikte" onchange="updateShapeField(\''+esc(key)+'\','+active+',\'strokeWidth\',this.value)">'+
                ['0','1','2','3','4','6','8'].map(function(v){return '<option value="'+v+'"'+(String(layer.strokeWidth||0)===v?' selected':'')+'>'+v+'px</option>';}).join('')+
              '</select>'
            : '')+
        '</div>'+
        shapeColorPaletteHtml(key,active,target,target==='stroke'?strokeColor:fillColor)+
        '<div class="shapeSliderRow" style="margin-top:12px">'+
          '<div class="shapeSliderHRow"><span class="shapeSliderHLbl">Kleurtoon</span><input class="shapeSlider" style="flex:1;--pct:'+sliderPercent(target==='stroke'?strokeTone:fillTone,-100,100)+'%" type="range" min="-100" max="100" step="1" value="'+(target==='stroke'?strokeTone:fillTone)+'" oninput="paintShapeSlider(this);this.nextElementSibling.innerHTML=sliderValueHtml((this.value>0?\'+\':\'\')+this.value,\'\');setShapeColorTone(\''+esc(key)+'\','+active+',\''+target+'\',this.value,true)" onchange="setShapeColorTone(\''+esc(key)+'\','+active+',\''+target+'\',this.value)"><span class="shapeSliderValPill">'+sliderValueHtml(((target==='stroke'?strokeTone:fillTone)>0?'+':'')+(target==='stroke'?strokeTone:fillTone),'')+'</span></div>'+
          '<div class="shapeSliderHRow"><span class="shapeSliderHLbl">Opacity</span><input class="shapeSlider" style="flex:1;--pct:'+sliderPercent(currentOpacity,0,100)+'%" type="range" min="0" max="100" step="1" value="'+currentOpacity+'" oninput="paintShapeSlider(this);this.nextElementSibling.innerHTML=sliderValueHtml(this.value,\'%\');updateShapeField(\''+esc(key)+'\','+active+',\''+(target==='stroke'?'strokeOpacity':'fillOpacity')+'\',this.value/100)"><span class="shapeSliderValPill">'+sliderValueHtml(currentOpacity,'%')+'</span></div>'+
          '<div class="shapeSliderHRow"><span class="shapeSliderHLbl">Grootte</span><input class="shapeSlider" style="flex:1;--pct:'+sliderPercent(sizeValue,12,120)+'%" type="range" min="12" max="120" step="1" value="'+sizeValue+'" oninput="paintShapeSlider(this);this.nextElementSibling.innerHTML=sliderValueHtml(this.value,\'\');updateShapeField(\''+esc(key)+'\','+active+',\'size\',this.value)"><span class="shapeSliderValPill">'+sliderValueHtml(sizeValue,'')+'</span></div>'+
          '<div class="shapeSliderHRow"><span class="shapeSliderHLbl">Rotatie</span><input class="shapeSlider" style="flex:1;--pct:'+sliderPercent(rotateValue,-180,180)+'%" type="range" min="-180" max="180" step="1" value="'+rotateValue+'" oninput="paintShapeSlider(this);this.nextElementSibling.innerHTML=sliderValueHtml(this.value,\'°\');updateShapeField(\''+esc(key)+'\','+active+',\'rotate\',this.value)"><span class="shapeSliderValPill">'+sliderValueHtml(rotateValue,'°')+'</span></div>'+
        '</div>'
      :'')+
    '</div>'+
    buildIconLibraryHtml(key);
  return '<div class="stijlShapes">'+sectionHead+(shapesCollapsed?'':layerContent)+'</div>';
}
function refreshShapeEditors(key){
  Array.prototype.slice.call(document.querySelectorAll('.shapeEditor[data-shape-key="'+key.replace(/"/g,'&quot;')+'"]')).forEach(function(el){
    el.innerHTML=buildShapeEditorHtml(key);
  });
  renderCardShapeTargets();
}
function addShapeLayer(key,type){
  var layers=getCardShapeLayers(key);
  if(layers.length>=6){toast('Maximaal 6 vormen','amber');return;}
  captureHistoryBeforeChange();
  layers.push({type:type||'circle',fill:'#CFE6DF',stroke:'#FFFFFF',fillOpacity:1,strokeOpacity:1,strokeWidth:0,size:42,x:74,y:24,rotate:0});
  setShapeSelection(key,[layers.length-1],layers.length-1);
  markDirty();
  refreshShapeEditors(key);
  setTimeout(function(){focusShapeEditor(key);},20);
}
function removeShapeLayer(key,idx){
  var layers=getCardShapeLayers(key);
  captureHistoryBeforeChange();
  layers.splice(idx,1);
  setShapeSelection(key,layers.length?[Math.max(0,Math.min(idx,layers.length-1))]:[],layers.length?Math.max(0,Math.min(idx,layers.length-1)):-1);
  markDirty();
  refreshShapeEditors(key);
}
function removeSelectedShapeLayers(key){
  key=key||activeStyleEditKey();
  var layers=getCardShapeLayers(key);
  var selected=getShapeSelectedIndices(key);
  var textSelected=(key==='cover'?getCoverTextSelectedIndices():[]);
  if(!selected.length&&!textSelected.length)return;
  captureHistoryBeforeChange();
  selected.slice().sort(function(a,b){return b-a;}).forEach(function(idx){
    if(idx>=0&&idx<layers.length)layers.splice(idx,1);
  });
  if(key==='cover'&&textSelected.length){
    var blocks=coverTextStore();
    textSelected.slice().sort(function(a,b){return b-a;}).forEach(function(idx){
      if(idx>=0&&idx<blocks.length)blocks.splice(idx,1);
    });
    COVER_TEXT_SELECTED_MULTI=[];
    if(blocks.length)setCoverTextActiveState(Math.min(currentCoverTextIdx(),blocks.length-1));
  }
  var baseIdx=selected.length?selected[0]:0;
  var next=layers.length?[Math.max(0,Math.min(baseIdx,layers.length-1))]:[];
  setShapeSelection(key,next,next.length?next[0]:-1);
  markDirty();
  patchCoverTextTargets();
  refreshShapeEditors(key);
  toast((selected.length+textSelected.length)>1?'Items verwijderd':'Item verwijderd','green');
}
function deleteActiveShapeLayer(key){
  key=key||activeStyleEditKey();
  var selected=getShapeSelectedIndices(key);
  var textSelected=(key==='cover'?getCoverTextSelectedIndices():[]);
  if(!selected.length){
    var active=getShapeActiveIndex(key,false);
    if(active>=0)selected=[active];
  }
  if(!selected.length&&!textSelected.length){toast('Geen actief item','amber');return false;}
  setShapeSelection(key,selected,selected[selected.length-1]);
  removeSelectedShapeLayers(key);
  return true;
}
function setShapeLayerActive(key,idx,ev){
  if(ev&&(ev.shiftKey||ev.metaKey||ev.ctrlKey)){
    toggleShapeSelection(key,idx);
  }else{
    if(key==='cover'){
      COVER_TEXT_SELECTED_MULTI=[];
      COVER_TEXT_ACTIVE=-1;
    }
    setShapeSelection(key,[Number(idx)],Number(idx));
  }
  syncShapeColorTargetForLayer(key,getCardShapeLayers(key)[Number(idx)]);
  startShapeSelTimer(key);
  if(key==='cover')patchCoverTextTargets();
  refreshShapeEditors(key);
  setTimeout(function(){focusShapeEditor(key);},20);
}
function selectShapeType(key,idx,type){
  if(idx<0){addShapeLayer(key,type);return;}
  setShapeSelection(key,[Number(idx)],Number(idx));
  updateShapeField(key,idx,'type',type);
  syncShapeColorTargetForLayer(key,getCardShapeLayers(key)[Number(idx)]);
  setTimeout(function(){focusShapeEditor(key);},20);
}
function moveSelectedShapeLayers(key,dir){
  key=key||activeStyleEditKey();
  dir=Number(dir)||0;
  if(!dir)return;
  var layers=getCardShapeLayers(key);
  var selected=getShapeSelectedIndices(key);
  if(!layers.length||!selected.length)return;
  captureHistoryBeforeChange();
  selected=selected.slice().sort(function(a,b){return a-b;});
  if(dir<0){
    selected.forEach(function(idx){
      var selectedSet=new Set(selected);
      if(idx>0&&!selectedSet.has(idx-1)){
        var tmp=layers[idx-1];
        layers[idx-1]=layers[idx];
        layers[idx]=tmp;
        selected[selected.indexOf(idx)]=idx-1;
      }
    });
  }else{
    selected.slice().sort(function(a,b){return b-a;}).forEach(function(idx){
      var selectedSet=new Set(selected);
      if(idx<layers.length-1&&!selectedSet.has(idx+1)){
        var tmp=layers[idx+1];
        layers[idx+1]=layers[idx];
        layers[idx]=tmp;
        selected[selected.indexOf(idx)]=idx+1;
      }
    });
  }
  selected=selected.filter(function(v,i,arr){return arr.indexOf(v)===i;}).sort(function(a,b){return a-b;});
  setShapeSelection(key,selected,selected[selected.length-1]);
  markDirty();
  refreshShapeEditors(key);
  startShapeSelTimer(key);
  setTimeout(function(){focusShapeEditor(key);},20);
}
var _shapeDrag=null;
function dragShapeChip(ev,phase,key,idx){
  if(phase==='start'){
    _shapeDrag={key:key,idx:idx};
    ev.dataTransfer.effectAllowed='move';
    ev.dataTransfer.setData('text/plain',String(idx));
    ev.currentTarget.classList.add('dragging');
  }else if(phase==='over'){
    if(!_shapeDrag||_shapeDrag.key!==key||_shapeDrag.idx===idx)return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect='move';
    document.querySelectorAll('.shapeChip,.shapeChipGroupWrap').forEach(function(c){c.classList.remove('drag-over');});
    ev.currentTarget.classList.add('drag-over');
  }else if(phase==='drop'){
    ev.preventDefault();
    document.querySelectorAll('.shapeChip,.shapeChipGroupWrap').forEach(function(c){c.classList.remove('drag-over','dragging');});
    if(!_shapeDrag||_shapeDrag.key!==key||_shapeDrag.idx===idx){_shapeDrag=null;return;}
    reorderShapeLayer(key,_shapeDrag.idx,idx);
    _shapeDrag=null;
  }else if(phase==='end'){
    document.querySelectorAll('.shapeChip,.shapeChipGroupWrap').forEach(function(c){c.classList.remove('drag-over','dragging');});
    _shapeDrag=null;
  }
}
function reorderShapeLayer(key,fromIdx,toIdx){
  if(fromIdx===toIdx)return;
  var layers=getCardShapeLayers(key);
  if(fromIdx<0||fromIdx>=layers.length||toIdx<0||toIdx>=layers.length)return;
  captureHistoryBeforeChange();
  var moved=layers.splice(fromIdx,1)[0];
  layers.splice(toIdx,0,moved);
  setShapeSelection(key,[toIdx],toIdx);
  markDirty();
  refreshShapeEditors(key);
  renderCardShapeTargets();
}
var _groupChildDrag=null;
function dragGroupChild(ev,phase,key,groupIdx,childIdx){
  ev.stopPropagation();
  if(phase==='start'){
    _groupChildDrag={key:key,groupIdx:groupIdx,childIdx:childIdx};
    ev.dataTransfer.effectAllowed='move';
    ev.dataTransfer.setData('text/plain',String(childIdx));
    ev.currentTarget.classList.add('dragging');
  }else if(phase==='over'){
    if(!_groupChildDrag||_groupChildDrag.key!==key||_groupChildDrag.groupIdx!==groupIdx)return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect='move';
    document.querySelectorAll('.shapeChipChild').forEach(function(c){c.classList.remove('drag-over');});
    ev.currentTarget.classList.add('drag-over');
  }else if(phase==='drop'){
    ev.preventDefault();
    document.querySelectorAll('.shapeChipChild').forEach(function(c){c.classList.remove('drag-over','dragging');});
    if(!_groupChildDrag||_groupChildDrag.key!==key||_groupChildDrag.groupIdx!==groupIdx||_groupChildDrag.childIdx===childIdx){_groupChildDrag=null;return;}
    reorderGroupChild(key,groupIdx,_groupChildDrag.childIdx,childIdx);
    _groupChildDrag=null;
  }else if(phase==='end'){
    document.querySelectorAll('.shapeChipChild').forEach(function(c){c.classList.remove('drag-over','dragging');});
    _groupChildDrag=null;
  }
}
function reorderGroupChild(key,groupIdx,fromChildIdx,toChildIdx){
  if(fromChildIdx===toChildIdx)return;
  var layers=getCardShapeLayers(key);
  var group=layers[groupIdx];
  if(!group||!group.groupChildren)return;
  captureHistoryBeforeChange();
  var moved=group.groupChildren.splice(fromChildIdx,1)[0];
  group.groupChildren.splice(toChildIdx,0,moved);
  markDirty();
  refreshShapeEditors(key);
  renderCardShapeTargets();
}
function groupSelectedShapeLayers(key){
  key=key||activeStyleEditKey();
  var layers=getCardShapeLayers(key);
  var selected=getShapeSelectedIndices(key).slice().sort(function(a,b){return a-b;});
  var textSelected=(key==='cover'?getCoverTextSelectedIndices().slice().sort(function(a,b){return a-b;}):[]);
  if(selected.length+textSelected.length<2){toast('Selecteer minstens 2 items','amber');return false;}
  var picked=selected.map(function(idx){
    return {kind:'shape',index:idx,layer:cloneShapeLayer(layers[idx]),bounds:shapeLayerBounds(layers[idx])};
  }).concat(textSelected.map(function(idx){
    var block=coverTextStore()[idx];
    return {kind:'text',index:idx,layer:coverTextItemFromBlock(cloneCoverTextBlock(block)),bounds:coverTextBounds(idx)};
  }));
  var bounds=picked.reduce(function(acc,layer){
    var b=layer.bounds;
    acc.left=Math.min(acc.left,b.left);
    acc.top=Math.min(acc.top,b.top);
    acc.right=Math.max(acc.right,b.right);
    acc.bottom=Math.max(acc.bottom,b.bottom);
    return acc;
  },{left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity});
  var groupSize=Math.max(1,bounds.right-bounds.left,bounds.bottom-bounds.top);
  var groupX=(bounds.left+bounds.right)/2;
  var groupY=(bounds.top+bounds.bottom)/2;
  var children=picked.map(function(item){
    var copy=cloneShapeLayer(item.layer);
    copy.x=((Number(item.layer.x)||50)-groupX)/groupSize*100+50;
    copy.y=((Number(item.layer.y)||50)-groupY)/groupSize*100+50;
    if(!isTextLayerItem(copy))copy.size=(Math.max(1,Number(item.layer.size)||42)/groupSize)*100;
    return copy;
  });
  var insertAt=selected.length?selected[0]:layers.length;
  var grouped={
    type:'group',
    label:'Groep',
    groupChildren:children,
    fill:'transparent',
    stroke:'transparent',
    fillOpacity:1,
    strokeOpacity:1,
    strokeWidth:0,
    size:groupSize,
    x:groupX,
    y:groupY,
    rotate:0
  };
  captureHistoryBeforeChange();
  selected.slice().sort(function(a,b){return b-a;}).forEach(function(idx){layers.splice(idx,1);});
  if(key==='cover'&&textSelected.length){
    var blocks=coverTextStore();
    textSelected.slice().sort(function(a,b){return b-a;}).forEach(function(idx){blocks.splice(idx,1);});
    COVER_TEXT_SELECTED_MULTI=[];
  }
  layers.splice(insertAt,0,grouped);
  setShapeSelection(key,[insertAt],insertAt);
  markDirty();
  patchCoverTextTargets();
  refreshShapeEditors(key);
  toast('Items gegroepeerd','green');
  return true;
}
function ungroupSelectedShapeLayers(key){
  key=key||activeStyleEditKey();
  var layers=getCardShapeLayers(key);
  var selected=getShapeSelectedIndices(key).slice().sort(function(a,b){return a-b;});
  if(!selected.length){toast('Geen groep geselecteerd','amber');return false;}
  var changed=false;
  captureHistoryBeforeChange();
  selected.slice().sort(function(a,b){return b-a;}).forEach(function(idx){
    var layer=layers[idx];
    if(!isGroupLayer(layer))return;
    var groupSize=Math.max(1,Number(layer.size)||42);
    var groupX=Number(layer.x)||50;
    var groupY=Number(layer.y)||50;
    var restoredTexts=[];
    var children=(layer.groupChildren||[]).map(function(child){
      var copy=cloneShapeLayer(child);
      if(isTextLayerItem(copy)){
        copy.x=groupX+((Number(child.x)||50)-50)*groupSize/100;
        copy.y=groupY+((Number(child.y)||50)-50)*groupSize/100;
        restoredTexts.push(copy);
        return null;
      }
      copy.x=groupX+((Number(child.x)||50)-50)*groupSize/100;
      copy.y=groupY+((Number(child.y)||50)-50)*groupSize/100;
      copy.size=Math.max(1,Number(child.size)||42)*groupSize/100;
      return copy;
    }).filter(Boolean);
    layers.splice.apply(layers,[idx,1].concat(children));
    if(key==='cover'&&restoredTexts.length){
      var blocks=coverTextStore();
      restoredTexts.forEach(function(textItem){
        blocks.push(coverTextItemFromBlock(textItem));
      });
    }
    changed=true;
  });
  if(!changed){toast('Selecteer een gegroepeerde vorm','amber');return false;}
  var next=[];
  selected.forEach(function(idx){
    if(idx<layers.length)next.push(idx);
  });
  setShapeSelection(key,next,next.length?next[0]:-1);
  markDirty();
  patchCoverTextTargets();
  refreshShapeEditors(key);
  toast('Groep opgeheven','green');
  return true;
}
function setShapeColorTarget(key,target){
  STYLE_SHAPE_COLOR_TARGET[key]=target==='stroke'?'stroke':'fill';
  refreshShapeEditors(key);
}
function randomizeBlobSeed(key,idx){
  var layers=getCardShapeLayers(key),layer=layers[idx];
  if(!layer)return;
  captureHistoryBeforeChange();
  layer.blobSeed=Math.floor(Math.random()*99999)+1;
  if(typeof layer.deform!=='number')layer.deform=35;
  markDirty();
  refreshShapeEditors(key);
}
function updateShapeField(key,idx,field,val){
  var layers=getCardShapeLayers(key),layer=layers[idx];
  if(!layer)return;
  resetShapeSelTimer();
  captureHistoryBeforeChange();
  layer[field]=(field==='type'||field==='fill'||field==='stroke')?val:Number(val);
  if(field==='fill'||field==='stroke'){
    var norm=normalizeHexInput(val);
    layer[field+'Base']=norm||'';
    layer[field+'Tone']=0;
  }
  if(field==='type'){
    if(typeof layer.deform!=='number')layer.deform=(val==='blob'?35:0);
    if(!layer.blobSeed)layer.blobSeed=Math.floor(Math.random()*99999)+1;
    if(shapeUsesStroke(val)){
      if(!layer.stroke||layer.stroke==='transparent')layer.stroke=(layer.fill&&layer.fill!=='transparent'?layer.fill:'#4f7d8b');
      if(!isFinite(Number(layer.strokeOpacity)))layer.strokeOpacity=isFinite(Number(layer.fillOpacity))?Number(layer.fillOpacity):1;
      layer.fill='transparent';
      layer.fillBase='';
      layer.fillTone=0;
    }else if(layer.fill==='transparent'){
      layer.fill=(layer.stroke&&layer.stroke!=='transparent'?layer.stroke:'#CFE6DF');
      layer.fillBase=normalizeHexInput(layer.fill)||'';
      layer.fillTone=0;
    }
  }
  markDirty();
  if(field==='size'||field==='rotate'||field==='fillOpacity'||field==='strokeOpacity'||field==='x'||field==='y'){
    renderCardShapeTargets();
    return;
  }
  if(field==='deform'||field==='blobSeed'){renderCardShapeTargets();return;}
  refreshShapeEditors(key);
}
function buildListMenuHtml(){
  var btnIcon='<svg viewBox="0 0 16 16" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;display:block" aria-hidden="true"><circle cx="3.2" cy="5" r=".9" fill="currentColor" stroke="none"/><line x1="6" y1="5" x2="13.5" y2="5"/><circle cx="3.2" cy="8.5" r=".9" fill="currentColor" stroke="none"/><line x1="6" y1="8.5" x2="13.5" y2="8.5"/><circle cx="3.2" cy="12" r=".9" fill="currentColor" stroke="none"/><line x1="6" y1="12" x2="10.5" y2="12"/></svg>';
  var ulIcon='<svg viewBox="0 0 16 16" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;flex-shrink:0;display:block" aria-hidden="true"><circle cx="3" cy="5" r=".85" fill="currentColor" stroke="none"/><line x1="6" y1="5" x2="13.5" y2="5"/><circle cx="3" cy="8.5" r=".85" fill="currentColor" stroke="none"/><line x1="6" y1="8.5" x2="13.5" y2="8.5"/><circle cx="3" cy="12" r=".85" fill="currentColor" stroke="none"/><line x1="6" y1="12" x2="10.5" y2="12"/></svg>';
  var olIcon='<svg viewBox="0 0 16 16" style="width:13px;height:13px;stroke:none;fill:currentColor;flex-shrink:0;display:block" aria-hidden="true"><text x="1" y="5.8" style="font-size:4.5px;font-weight:700;font-family:sans-serif;fill:currentColor">1.</text><text x="1" y="9.8" style="font-size:4.5px;font-weight:700;font-family:sans-serif;fill:currentColor">2.</text><text x="1" y="13.5" style="font-size:4.5px;font-weight:700;font-family:sans-serif;fill:currentColor">3.</text><rect x="6.5" y="3.2" width="8" height="1.1" rx=".5"/><rect x="6.5" y="7.2" width="7" height="1.1" rx=".5"/><rect x="6.5" y="11.2" width="6" height="1.1" rx=".5"/></svg>';
  return '<details class="textToolbarMenu">'+
    '<summary class="textToolbarMenuBtn" title="Opsomming" data-list-btn="1">'+btnIcon+'<span class="textToolbarCaret">▾</span></summary>'+
    '<div class="textToolbarMenuPop" style="min-width:130px">'+
      '<div class="textToolbarMenuLabel">Opsomming</div>'+
      '<div class="textToolbarMenuGrid">'+
        '<button class="textToolbarMenuItem" type="button" data-list-opt="ul" onclick="toggleList(\'ul\');closeTextMenu(this)">'+ulIcon+'<span>Bullets</span></button>'+
        '<button class="textToolbarMenuItem" type="button" data-list-opt="ol" onclick="toggleList(\'ol\');closeTextMenu(this)">'+olIcon+'<span>Nummering</span></button>'+
      '</div>'+
    '</div>'+
  '</details>';
}
function buildLetterSpacingMenuHtml(cur){
  cur=String(cur||'0');
  var icon='<svg viewBox="0 0 14 14" style="width:13px;height:13px;flex-shrink:0;stroke:currentColor;fill:none;stroke-linecap:round;stroke-linejoin:round;display:block" aria-hidden="true"><line x1="2" y1="2.5" x2="2" y2="11.5" stroke-width="1.5"/><line x1="12" y1="2.5" x2="12" y2="11.5" stroke-width="1.5"/><line x1="4" y1="7" x2="10" y2="7" stroke-width="1.5"/><path d="M5 5.5L3 7L5 8.5" stroke-width="1.3"/><path d="M9 5.5L11 7L9 8.5" stroke-width="1.3"/></svg>';
  var presets=[['0','Normaal'],['0.5','0.5 px'],['1','1 px'],['1.5','1.5 px'],['2','2 px'],['3','3 px']];
  return '<details class="textToolbarMenu">'+
    '<summary class="textToolbarMenuBtn" title="Letterafstand" data-ls-btn="1">'+icon+'<span class="textToolbarCaret">▾</span></summary>'+
    '<div class="textToolbarMenuPop" style="min-width:140px">'+
      '<div class="textToolbarMenuLabel">Letterafstand</div>'+
      '<div class="textToolbarMenuGrid">'+
      presets.map(function(p){return '<button class="textToolbarMenuItem'+(cur===p[0]?' sel':'')+'" type="button" data-letter-spacing-val="'+p[0]+'" onclick="setLetterSpacing(\''+p[0]+'\');closeTextMenu(this)"><span>'+p[1]+'</span></button>';}).join('')+
      '</div>'+
    '</div>'+
  '</details>';
}
function buildLineHeightMenuHtml(cur){
  cur=String(cur||'1.4');
  var icon='<svg viewBox="0 0 14 14" style="width:13px;height:13px;flex-shrink:0;stroke:currentColor;fill:none;stroke-linecap:round;stroke-linejoin:round;display:block" aria-hidden="true"><line x1="1.5" y1="2.5" x2="7.5" y2="2.5" stroke-width="1.5"/><line x1="1.5" y1="7" x2="6.5" y2="7" stroke-width="1.5"/><line x1="1.5" y1="11.5" x2="7.5" y2="11.5" stroke-width="1.5"/><line x1="11" y1="3.5" x2="11" y2="10.5" stroke-width="1.5"/><path d="M9.5 5L11 3L12.5 5" stroke-width="1.3"/><path d="M9.5 9L11 11L12.5 9" stroke-width="1.3"/></svg>';
  var presets=[['1.2','Krap'],['1.4','Normaal'],['1.5','Ruim'],['1.6','Breed'],['1.8','Extra ruim'],['2.0','Dubbel']];
  return '<details class="textToolbarMenu">'+
    '<summary class="textToolbarMenuBtn" title="Regelafstand" data-lh-btn="1">'+icon+'<span class="textToolbarCaret">▾</span></summary>'+
    '<div class="textToolbarMenuPop" style="min-width:140px">'+
      '<div class="textToolbarMenuLabel">Regelafstand</div>'+
      '<div class="textToolbarMenuGrid">'+
      presets.map(function(p){return '<button class="textToolbarMenuItem'+(cur===p[0]?' sel':'')+'" type="button" data-line-height-val="'+p[0]+'" onclick="setLineHeight(\''+p[0]+'\');closeTextMenu(this)"><span>'+p[1]+'</span></button>';}).join('')+
      '</div>'+
    '</div>'+
  '</details>';
}
function buildSharedCardEditor(opts){
  opts=opts||{};
  var m=S.d.meta||{};
  var previewKey=opts.previewKey||'algemeen';
  var layoutMode=opts.layoutMode||'stack';
  // Use a local copy so the while-loop fill never mutates the real store
  var coverBlocks=coverTextStore().slice();
  if(previewKey==='cover'){
    while(coverBlocks.length<2){
      var block=makeCoverTextBlock(coverBlocks.length);
      if(coverBlocks.length===0)block.text=String(m.title||'');
      if(coverBlocks.length===1)block.text='';
      coverBlocks.push(block);
    }
  }
  var activeCoverBlock=previewKey==='cover'?(coverBlocks[currentCoverTextIdx()]||coverBlocks[0]||null):null;
  var curFont=previewKey==='cover'&&activeCoverBlock?(activeCoverBlock.font||'IBM Plex Sans'):((m.cssVars||{})['--pk-font']||'IBM Plex Sans');
  var curFontSize=previewKey==='cover'&&activeCoverBlock?String(activeCoverBlock.size||12):normFontSize((m.cssVars||{})['--pk-font-size']||'12');
  var textColor=previewKey==='cover'&&activeCoverBlock?(activeCoverBlock.color||'#1a1a2e'):((m.cssVars||{})['--pk-set-text']||'#1a1a2e');
  var cardBg=cardBgForKey(m,previewKey);
  var align=previewKey==='cover'&&activeCoverBlock?(activeCoverBlock.align||'left'):((m.cssVars||{})['--pk-text-align']||(opts.infoRichCe?'left':'center'));
  var valign=previewKey==='cover'&&activeCoverBlock?(activeCoverBlock.valign||'center'):((m.cssVars||{})['--pk-text-valign']||'center');
  var textWeight=opts.forceBold?'bold':(previewKey==='cover'&&activeCoverBlock?(activeCoverBlock.weight||'regular'):(((m.cssVars||{})['--pk-font-weight'])||'regular'));
  var textItalic=previewKey==='cover'&&activeCoverBlock?!!activeCoverBlock.italic:(((m.cssVars||{})['--pk-font-italic'])==='1');
  var textUnderline=previewKey==='cover'&&activeCoverBlock?!!activeCoverBlock.underline:(((m.cssVars||{})['--pk-font-underline'])==='1');
  var textBgMode=previewKey==='cover'&&activeCoverBlock?(activeCoverBlock.bg||''):(((m.cssVars||{})['--pk-text-bg-color'])||'');
  var letterSpacing=String((m.cssVars||{})['--pk-letter-spacing']||'0');
  var lineHeight=String((m.cssVars||{})['--pk-line-height']||'1.4');
  var accentColor=((m.cssVars||{})['--pk-set-accent']||'#CFE6DF');
  var doubleSided=(m.doubleSided!==false);
  var backMode=(m.backMode||'mirror');
  var mode=cardBuildModeForKey(m,previewKey);
  var alignIcons={
    left:'<svg viewBox="0 0 16 16"><line x1="2.5" y1="4" x2="13.5" y2="4"/><line x1="2.5" y1="8" x2="10" y2="8"/><line x1="2.5" y1="12" x2="12" y2="12"/></svg>',
    center:'<svg viewBox="0 0 16 16"><line x1="2.5" y1="4" x2="13.5" y2="4"/><line x1="4" y1="8" x2="12" y2="8"/><line x1="3" y1="12" x2="13" y2="12"/></svg>',
    right:'<svg viewBox="0 0 16 16"><line x1="2.5" y1="4" x2="13.5" y2="4"/><line x1="6" y1="8" x2="13.5" y2="8"/><line x1="4" y1="12" x2="13.5" y2="12"/></svg>'
  };
  var valignIcons={
    top:'<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="1.5" fill="none" opacity=".35"/><line x1="4.5" y1="4.5" x2="11.5" y2="4.5"/><line x1="4.5" y1="7" x2="9.5" y2="7" opacity=".45"/></svg>',
    center:'<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="1.5" fill="none" opacity=".35"/><line x1="4.5" y1="7" x2="11.5" y2="7"/><line x1="4.5" y1="9.5" x2="9.5" y2="9.5" opacity=".45"/></svg>',
    bottom:'<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="1.5" fill="none" opacity=".35"/><line x1="4.5" y1="9.5" x2="11.5" y2="9.5"/><line x1="4.5" y1="12" x2="9.5" y2="12" opacity=".45"/></svg>'
  };
  var previewCore=sharedCardPreviewHtml({
        wrapId:opts.wrapId||'stijlCardPrevWrap',
        wrapClass:opts.wrapClass||'stijlCardPrevWrap',
        faceId:opts.faceId||'stijlCardFace',
        frontId:opts.frontId||'stijlCardTxt',
        backId:opts.backId||'stijlCardBack',
        file:opts.previewFile||'kaart.svg',
        themeKey:previewKey,
        previewKey:previewKey,
        frontTxt:(opts.frontTxt!=null?opts.frontTxt:(opts.sampleTxt||'')),
        backTxt:opts.backTxt||'',
        flipped:!!opts.flipped,
        cardBg:cardBg,
        emptyBg:(opts.emptyBg||cardBg),
        forceNoImage:mode==='self',
        showCoverTexts:previewKey==='cover',
        suppressEmptyFrontHint:!!opts.suppressEmptyFrontHint,
        infoRichCe:!!opts.infoRichCe,
        infoRichCeKey:opts.infoRichCeKey||'',
        showInfoMidTitle:!!opts.showInfoMidTitle,
        infoMidTitleKey:opts.infoMidTitleKey||'',
        infoMidTitleText:opts.infoMidTitleText!=null?opts.infoMidTitleText:'',
        wrapStyle:opts.wrapStyle||''
      });
  var previewHintHtml=(opts.previewHint===false?'':'<div class="stijlPreviewHint">'+esc(stylePreviewDisplayFile(opts.previewHint||opts.previewFile||'kaart.svg'))+'</div>');
  var nightMode=previewNightMode()||adminNightMode();
  var gridMode=previewGridMode();
  var nightIcon=nightMode
    ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.9 1.8a5.8 5.8 0 1 0 3.3 10.7 6.2 6.2 0 1 1-3.3-10.7Z"></path></svg>'
    : '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.4"></circle><path d="M8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7 3.6 3.6"></path></svg>';
  var gridIcon='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 2.5v11M10.5 2.5v11M2.5 5.5h11M2.5 10.5h11"></path><rect x="2.5" y="2.5" width="11" height="11" rx="2"></rect></svg>';
  var flipIcon='<svg class="flipIconStd" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 6.5h6a4.75 4.75 0 0 1 0 9.5H6.75"/><path d="M9 4 5.25 6.75 9 9.5"/></svg>';
  var zoomCtrl='<div class="cvZoomControl">'+
    '<button class="cvZoomBtn" type="button" onclick="stepCanvasZoom(-25)" title="Uitzoomen">−</button>'+
    '<button class="cvZoomPct" type="button" onclick="resetCanvasZoom()" title="Telefoon-formaat (100%)">'+CANVAS_ZOOM_PCT+'%</button>'+
    '<button class="cvZoomBtn" type="button" onclick="stepCanvasZoom(25)" title="Inzoomen">+</button>'+
  '</div>';
  var nightToggleHtml='<div class="stijlCanvasTopbar">'+
    zoomCtrl+
    '<div class="stijlCanvasTopbarRight">'+
      '<button class="stijlCanvasFlipBtn'+(CANVAS_CARD_FLIPPED?' sel':'')+'" type="button" aria-label="Kaart omdraaien" title="Kaart omdraaien" onclick="toggleCanvasFlip()">'+flipIcon+'</button>'+
      '<button class="stijlCanvasGridBtn'+(gridMode?' sel':'')+'" type="button" aria-label="'+(gridMode?'Raster uitzetten':'Raster tonen')+'" title="'+(gridMode?'Raster uitzetten':'Raster tonen')+'" onclick="togglePreviewGrid()">'+gridIcon+'</button>'+
      '<button class="stijlCanvasNightBtn'+(nightMode?' sel':'')+'" type="button" aria-label="'+(nightMode?'Nachtmodus uitzetten':'Nachtmodus aanzetten')+'" title="'+(nightMode?'Nachtmodus uitzetten':'Nachtmodus aanzetten')+'" onclick="togglePreviewNight()">'+nightIcon+'</button>'+
    '</div>'+
  '</div>';
  var previewBackToolbarHtml=(!opts.infoRichCe&&doubleSided)
    ?'<div class="stijlCanvasBackbar">'+
        '<div class="stijlCanvasBackbarLabel">Achterkant</div>'+
        '<div class="stijlCanvasBackbarGroup">'+
          '<button class="stijlBackModeBtn'+(backMode==='mirror'?' sel':'')+'" type="button" onclick="setBackMode(\'mirror\')" title="Zelfde ontwerp">Zelfde</button>'+
          '<button class="stijlBackModeBtn'+(backMode==='reflect'?' sel':'')+'" type="button" onclick="setBackMode(\'reflect\')" title="Zelfde ontwerp gespiegeld">Gespiegeld</button>'+
          '<button class="stijlBackModeBtn'+(backMode==='blank'?' sel':'')+'" type="button" onclick="setBackMode(\'blank\')" title="Aparte achterkant">Apart</button>'+
        '</div>'+
      '</div>'
    :'';
  var varianceHint=(!opts.infoRichCe)?previewVarianceHint(previewKey):'';
  var previewVarianceHtml=varianceHint
    ?'<div class="stijlCanvasVarianceHint" title="'+esc(varianceHint)+'">'+esc(varianceHint)+'</div>'
    :'';
  var previewCol=(layoutMode==='canvas'
      ?'<div class="stijlPreviewCol stijlCanvasCenter"><div class="stijlCanvasStage'+(opts.infoRichCe?' info-preview-stage':'')+'">'+
        '<div class="stijlCanvasCardWrap">'+
          (opts.selectorHtml?'<div class="stijlPreviewPick" style="width:100%">'+opts.selectorHtml+'</div>':'')+
          '<div class="stijlCanvasWindow'+(nightMode?' night':'')+(gridMode?' grid-on':'')+(opts.infoRichCe?' info-preview':'')+'" data-style-drop-preview="1" data-style-preview-key="'+esc(previewKey)+'">'+nightToggleHtml+previewBackToolbarHtml+previewVarianceHtml+'<div class="bgCanvas" id="bgWrap"><canvas id="bgCanvas"></canvas></div><div class="stijlCanvasWindowInner">'+previewCore+'</div></div>'+
        '</div>'+
      '</div></div>'
      :'<div class="stijlPreviewCol">'+
        (opts.selectorHtml?'<div class="stijlPreviewPick">'+opts.selectorHtml+'</div>':'')+
        previewCore+
        previewHintHtml+
      '</div>');
  var addTextBtn=(previewKey==='cover'
    ?'<details class="textToolbarMenu" id="coverTextToolbarMenu"><summary class="textToolbarMenuBtn" title="Tekstvakken beheren" data-cover-text-menu="1"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;display:block"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg><span class="textToolbarCaret">▾</span></summary><div class="textToolbarMenuPop coverTextDropdown" style="min-width:210px;right:0;left:auto">'+buildCoverTextDropdownContent()+'</div></details>'
    :'');
  var typoCard='<div class="stijlMiniCard span2">'+
            '<div class="stijlEditorSection">'+
              '<div class="stijlSectionLabel">Typografie</div>'+
              '<div class="stijlTypoControlRow">'+
                '<div class="stijlTypoPrimaryRow">'+
                  buildFontMenuHtml(curFont)+
                  buildFontSizeMenuHtml(curFontSize)+
                  '<div class="stijlTypoDivider" aria-hidden="true"></div>'+
                  '<div class="stijlTypoToolStack">'+
                    '<div class="stijlTypoStyleGroup">'+
                      '<details class="textToolbarMenu"><summary class="textToolbarMenuBtn'+(textWeight!=='regular'?' sel':'')+'" title="Dikte" data-text-weight-btn="1"><strong>B</strong><span class="textToolbarCaret">▾</span></summary><div class="textToolbarMenuPop"><div class="textToolbarMenuLabel">Tekstdikte</div><div class="textToolbarMenuGrid"><button class="textToolbarMenuItem'+(textWeight==='regular'?' sel':'')+'" type="button" data-text-weight-option="regular" onclick="setTextWeight(\'regular\');closeTextMenu(this)"><strong style="font-weight:400">B</strong><span>Normaal</span></button><button class="textToolbarMenuItem'+(textWeight==='medium'?' sel':'')+'" type="button" data-text-weight-option="medium" onclick="setTextWeight(\'medium\');closeTextMenu(this)"><strong style="font-weight:500">B</strong><span>Medium</span></button><button class="textToolbarMenuItem'+(textWeight==='semibold'?' sel':'')+'" type="button" data-text-weight-option="semibold" onclick="setTextWeight(\'semibold\');closeTextMenu(this)"><strong style="font-weight:600">B</strong><span>Semi-bold</span></button><button class="textToolbarMenuItem'+(textWeight==='bold'?' sel':'')+'" type="button" data-text-weight-option="bold" onclick="setTextWeight(\'bold\');closeTextMenu(this)"><strong style="font-weight:700">B</strong><span>Bold</span></button></div></div></details>'+
                      '<button class="textStyleIconBtn italic'+(textItalic?' sel':'')+'" type="button" title="Cursief" aria-label="Cursief" data-text-italic="1" onclick="toggleTextItalic()"><em>I</em></button>'+
                      '<button class="textStyleIconBtn underline'+(textUnderline?' sel':'')+'" type="button" title="Onderstrepen" aria-label="Onderstrepen" data-text-underline="1" onclick="toggleTextUnderline()"><span style="text-decoration:underline">U</span></button>'+
                    '</div>'+
                    '<div class="stijlTypoColorGroup">'+
                      buildTextColorMenuHtml('settc',textColor)+
                      buildTextBgMenuHtml(textBgMode)+
                    '</div>'+
                  '</div>'+
                  '<div class="stijlTypoDivider" aria-hidden="true"></div>'+
                '</div>'+
                '<div class="stijlTypoSecondaryRow">'+
                  '<div class="stijlTypoAlignGroup">'+
                    '<div class="alignBar" title="Uitlijning">'+
                      ['left','center','right'].map(function(a){var labels={'left':'Links','center':'Midden','right':'Rechts'};return'<button class="alignBtn'+(align===a?' sel':'')+'" type="button" onclick="setTextAlign(\''+a+'\')" data-align="'+a+'" title="'+labels[a]+'" aria-label="'+labels[a]+'">'+alignIcons[a]+'</button>';}).join('')+
                    '</div>'+
                    '<div class="alignBar" title="Positie">'+
                      ['top','center','bottom'].map(function(v){var labels={'top':'Boven','center':'Midden','bottom':'Onder'};return'<button class="alignBtn'+(valign===v?' sel':'')+'" type="button" onclick="setTextValign(\''+v+'\')" data-valign="'+v+'" title="'+labels[v]+'" aria-label="'+labels[v]+'">'+valignIcons[v]+'</button>';}).join('')+
                    '</div>'+
                  '</div>'+
                  '<div class="stijlTypoDivider" aria-hidden="true"></div>'+
                  '<div class="stijlTypoParagraphWrap">'+
                    '<div class="stijlTypoDivider"></div>'+
                    '<div class="stijlTypoParagraphGroup">'+
                      buildListMenuHtml()+
                      '<div class="alignBar" title="Inspringen">'+
                        '<button class="alignBtn" type="button" onclick="indentText(\'out\')" title="Uitspringen" aria-label="Uitspringen"><svg viewBox="0 0 16 16" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;display:block"><line x1="2" y1="3" x2="14" y2="3"/><line x1="7" y1="6.5" x2="14" y2="6.5"/><line x1="7" y1="9.5" x2="14" y2="9.5"/><line x1="2" y1="13" x2="14" y2="13"/><path d="M4.5 5.5L2 8L4.5 10.5"/></svg></button>'+
                        '<button class="alignBtn" type="button" onclick="indentText(\'in\')" title="Inspringen" aria-label="Inspringen"><svg viewBox="0 0 16 16" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;display:block"><line x1="2" y1="3" x2="14" y2="3"/><line x1="7" y1="6.5" x2="14" y2="6.5"/><line x1="7" y1="9.5" x2="14" y2="9.5"/><line x1="2" y1="13" x2="14" y2="13"/><path d="M2 5.5L4.5 8L2 10.5"/></svg></button>'+
                      '</div>'+
                    '</div>'+
                    '<div class="stijlTypoDivider"></div>'+
                  '</div>'+
                  '<div class="stijlTypoSpacingGroup">'+
                    buildLetterSpacingMenuHtml(letterSpacing)+
                    buildLineHeightMenuHtml(lineHeight)+
                  '</div>'+
                  '<div class="stijlTypoDivider" aria-hidden="true"></div>'+
                  addTextBtn+
                '</div>'+
              '</div>'+
            '</div>'+
          '</div>';
  var textCard=(previewKey==='cover'?'<div class="stijlMiniCard tight" id="coverTextEditorCard">'+buildCoverTextEditorHtml()+'</div>':'');
  var shapeCard='<div class="stijlMiniCard tight">'+
            '<div class="shapeEditor" data-shape-key="'+esc(previewKey)+'">'+buildShapeEditorHtml(previewKey)+'</div>'+
          '</div>';
  var colorCard='<div class="stijlMiniCard">'+
            '<div class="stijlMiniHead"><div><div class="stijlSectionLabel">Kaartkleur</div></div></div>'+
            '<div class="stijlEditorSection">'+
              '<div class="stijlColorStack">'+
                '<div class="stijlColorLine">'+
                  (layoutMode==='canvas'?'':'<div class="sLbl">Achtergrond</div>')+
                  brandPaletteHtml('setcbg',cardBg,BRAND_FAM_BG)+
                '</div>'+
                '<div class="shapeSliderRow" style="margin-top:10px">'+
                  '<div class="shapeSliderHRow"><span class="shapeSliderHLbl">Kleurtoon</span><input class="shapeSlider" style="flex:1;--pct:'+sliderPercent(cardBgToneValue(),-100,100)+'%" type="range" min="-100" max="100" step="1" value="'+cardBgToneValue()+'" oninput="paintShapeSlider(this);this.nextElementSibling.innerHTML=sliderValueHtml((this.value>0?\'+\':\'\')+this.value,\'\');setCardBgTone(this.value)"><span class="shapeSliderValPill">'+sliderValueHtml((cardBgToneValue()>0?'+':'')+cardBgToneValue(),'')+'</span></div>'+
                '</div>'+
              '</div>'+
            '</div>'+
          '</div>';
  var bgCard='<div class="stijlMiniCard tight">'+
            '<div class="stijlMiniHead"><div><div class="stijlSectionLabel">Achtergrond</div></div></div>'+
            buildBgCtrls(bgCfg(),accentColor,'',true)+
          '</div>';
  var toolbarRow='<div class="stijlCanvasToolbar">'+
    typoCard.replace(' span2','')+
  '</div>';
  var toolbarExtra=opts.toolbarExtra?'<div class="stijlCanvasToolbarExtra">'+opts.toolbarExtra+'</div>':'';
  if(layoutMode==='canvas'){
    return '<div class="stijlCanvasTopTools">'+toolbarRow+toolbarExtra+'</div>'+
      '<div class="stijlCardLayout canvas">'+
        '<div class="stijlCanvasSide left">'+shapeCard+colorCard+bgCard+'</div>'+
        '<div class="stijlCanvasSide preview">'+
          previewCol+
        '</div>'+
        '<div class="stijlCanvasSide right">'+(opts.sidePanelHtml||'')+'</div>'+
      '</div>';
  }
  return '<div class="stijlCardLayout">'+
    previewCol+
    '<div class="stijlControlsCol">'+
      '<div class="stijlPanel stijlEditorMain stijlGroup">'+
        '<div class="stijlEditorStack">'+
          typoCard+
          shapeCard+
          colorCard+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>';
}
function opmakenViewMode(){
  return 'canvas';
}
function setOpmakenView(mode){
  var m=S.d.meta=S.d.meta||{};
  m.ui=m.ui||{};
  m.ui.opmaakView=mode==='canvas'?'canvas':'stack';
  markDirty();
  buildStijlPreserveBg(g('pw'));
}
function opmakenViewToggleHtml(mode){
  return '';
}
function setStylePreviewKey(key){
  STYLE_PREVIEW_KEY=key||null;
  buildStijlPreserveBg(g('pw'));
  updateEditorHeaderTheme();
}
function activeStyleEditKey(){
  if(S.clTab==='opmaken'&&S.opmPane==='info')return INFO_SLIDE_KEY||'cover';
  return STYLE_PREVIEW_KEY||'cover';
}
function setInfoPreviewKey(key){
  INFO_SLIDE_KEY=key||'cover';
  buildStijlPreserveBg(g('pw'));
  updateEditorHeaderTheme();
}
function updateActiveHeaderThemeName(val){
  if(S.clTab==='opmaken'&&S.opmPane==='info'){
    var infoKey=INFO_SLIDE_KEY||'cover';
    if(!infoKey||infoKey==='cover')return;
    var meta=S.d.meta||{};
    if((meta.themes||[]).some(function(t){return t.key===infoKey;})){
      updateStyleThemeNameByKey(infoKey,val);
      return;
    }
    if((meta.infoPages||[]).some(function(p){return p.key===infoKey;})){
      updateInfoCustomPageLabel(infoKey,val);
    }
    return;
  }
  updateStyleThemeNameByKey(STYLE_PREVIEW_KEY,val);
}
function updateEditorHeaderTheme(){
  var key=(S.clTab==='opmaken'&&S.opmPane==='info')
    ?(INFO_SLIDE_KEY||'cover')
    :(STYLE_PREVIEW_KEY||'cover');
  var isTheme=key&&key!=='cover'&&key!=='algemeen';
  var sep=g('editorThemeSep');
  var thEl=g('editorThemeTitle');
  if(!sep||!thEl)return;
  if(S.clTab==='inst'){
    if(thEl.tagName==='INPUT'){
      thEl.value='Instellingen';
      thEl.style.display='';
      thEl.readOnly=true;
      thEl.classList.add('is-static');
    }else thEl.textContent='Instellingen';
    sep.style.display='';
  } else if(S.clTab==='opmaken'&&S.opmPane==='info'&&key){
    var infoOpts=infoSlideOptions(S.d&&S.d.meta||{});
    var active=infoOpts.find(function(opt){return opt.key===key;});
    var activeName=active?(active.label||active.key):key;
    var editable=!!(active&&(active.isCustom||(!active.isCustom&&active.key!=='cover')));
    if(thEl.tagName==='INPUT'){
      thEl.value=activeName;
      thEl.style.display='';
      thEl.readOnly=!editable;
      thEl.classList.toggle('is-static',!editable);
    }else thEl.textContent=activeName;
    sep.style.display='';
  } else if(isTheme){
    var theme=(S.d&&S.d.meta&&S.d.meta.themes||[]).find(function(t){return t.key===key;});
    var name=theme?(theme.label||theme.key):key;
    if(thEl.tagName==='INPUT'){
      thEl.value=name;
      thEl.style.display='';
      thEl.readOnly=false;
      thEl.classList.remove('is-static');
    }else thEl.textContent=name;
    sep.style.display='';
  } else {
    if(thEl.tagName==='INPUT'){
      thEl.value='';
      thEl.style.display='none';
      thEl.readOnly=false;
      thEl.classList.remove('is-static');
    }else thEl.textContent='';
    sep.style.display='none';
  }
  syncEditorHeaderWidths();
}
function syncEditorHeaderWidths(){
  var titleEl=g('editorSetTitle');
  var thEl=g('editorThemeTitle');
  function fitHeaderInput(el,minW,maxW){
    if(!el||el.tagName!=='INPUT')return;
    var text=String(el.value||el.placeholder||'');
    var probe=document.createElement('span');
    var cs=window.getComputedStyle(el);
    probe.textContent=text||'';
    probe.style.position='absolute';
    probe.style.visibility='hidden';
    probe.style.whiteSpace='pre';
    probe.style.font=cs.font;
    probe.style.fontSize=cs.fontSize;
    probe.style.fontWeight=cs.fontWeight;
    probe.style.letterSpacing=cs.letterSpacing;
    probe.style.textTransform=cs.textTransform;
    document.body.appendChild(probe);
    var width=Math.ceil(probe.getBoundingClientRect().width)+8;
    probe.remove();
    el.style.width=Math.max(minW,Math.min(maxW,width))+'px';
  }
  fitHeaderInput(titleEl,84,320);
  fitHeaderInput(thEl,56,260);
}
function activeStyleDeletePath(){
  var key=activeStyleEditKey();
  if(!S.activeId||!key)return '';
  return styleCardPathForKey(key)||'';
}
function appendImportedSvgShapes(key,dataUrl){
  var imported=extractImportedSvgAsSingleLayer(dataUrl);
  if(!imported){toast('SVG kon niet als geheel worden toegevoegd','amber');return false;}
  var layers=getCardShapeLayers(key);
  if(layers.length>=6){toast('Maximaal 6 vormen','amber');return false;}
  captureHistoryBeforeChange();
  layers.push(imported);
  setShapeSelection(key,[layers.length-1],layers.length-1);
  syncShapeColorTargetForLayer(key,imported);
  markDirty();
  refreshShapeEditors(key);
  renderCardShapeTargets();
  toast(imported.label==='SVG'?'SVG toegevoegd':'Icoon toegevoegd','green');
  return true;
}
function importStyleSvgAsShapes(key){
  key=key||activeStyleEditKey();
  var path=styleCardPathForKey(key);
  var asset=(cachedCardAssetForPath(path)||{}).asset||null;
  if(!(asset&&asset.dataUrl&&isSvgDataUrl(asset.dataUrl))){toast('Geen SVG op deze kaart','amber');return;}
  appendImportedSvgShapes(key,asset.dataUrl);
}
function importShapeSvgFile(key,input){
  key=key||activeStyleEditKey();
  var file=input&&input.files&&input.files[0];
  if(!file){return;}
  if(!/\.svg$/i.test(file.name||'')){toast('Alleen SVG','red');if(input)input.value='';return;}
  var reader=new FileReader();
  reader.onload=function(){
    appendImportedSvgShapes(key,String(reader.result||''));
    if(input)input.value='';
  };
  reader.onerror=function(){
    toast('SVG kon niet worden gelezen','red');
    if(input)input.value='';
  };
  reader.readAsDataURL(file);
}
function resetCardColorSettings(key){
  key=key||activeStyleEditKey();
  var meta=S.d.meta=S.d.meta||{};
  var maps=cardBgMaps(meta);
  delete maps.base[key];
  delete maps.tone[key];
  markDirty();
  buildStijlPreserveBg(g('pw'));
  toast('Kaartkleur gereset','amber');
}
function resetCardShapeSettings(key){
  key=key||activeStyleEditKey();
  var store=cardShapeStore();
  delete store[key];
  delete STYLE_SHAPE_ACTIVE[key];
  delete STYLE_SHAPE_SELECTED[key];
  delete STYLE_SHAPE_SELECTED_MULTI[key];
  delete STYLE_SHAPE_COLOR_TARGET[key];
  markDirty();
  buildStijlPreserveBg(g('pw'));
  toast('Vormen gereset','amber');
}
function resetSetBackgroundSettings(){
  var accent=((S.d.meta||{}).cssVars||{})['--pk-set-accent']||'#CFE6DF';
  var bg=bgCfg();
  Object.keys(bg).forEach(function(k){delete bg[k];});
  bg.palette=[accent];
  bg.autoMode=true;
  bg.autoTint=true;
  markDirty();
  buildStijlPreserveBg(g('pw'));
  scheduleBg();
  toast('Achtergrond gereset','amber');
}
function deleteActiveStyleAsset(){
  var path=activeStyleDeletePath();
  if(!path){toast('Geen actieve kaart','amber');return;}
  deleteCardFile(path,safeid(path));
}
var FONT_LIST=[
  'IBM Plex Sans','Inter','DM Sans','Outfit','Plus Jakarta Sans','Nunito','Poppins',
  'Quicksand','Lexend','Figtree','Jost','Manrope','Raleway','Lato','Montserrat',
  'Open Sans','Source Sans 3','Noto Sans','Work Sans','Mulish','Karla','Cabin',
  'Rubik','Barlow','Urbanist','DM Serif Display','Playfair Display','Merriweather',
  'Lora','Spectral','EB Garamond','Libre Baskerville','Cormorant Garamond',
  'Fira Sans','Space Grotesk','Sora','Josefin Sans','Exo 2','Titillium Web',
  'Roboto Slab','Zilla Slab','Bitter','Crete Round','Arvo',
  'Patrick Hand','Caveat','Pacifico','Fredoka','Comfortaa'
];
var FONT_SIZE_PRESETS=['8','9','10','11','12','14','16','18','20','24','28','32','36','42','48'];
var FONT_SIZE_LEGACY={sm:'10',md:'12',lg:'14',xl:'16'};
function normFontSize(v){return FONT_SIZE_LEGACY[v]||v||'12';}
function fontSizeCss(v){var n=parseInt(normFontSize(v),10)||12;return n+'pt';}
function swatchGridHtml(action,currentColor,palette){
  var cur=String(currentColor||'').toLowerCase();
  return '<div class="swatchGrid">'+palette.map(function(p){
    var hex=String(p.a||'').toLowerCase();
    var isLight=hex==='#ffffff'||hex==='ffffff';
    return '<button class="swatchBtn'+(isLight?' swatchBtnLight':'')+(cur===hex?' sel':'')+'" type="button" data-action="'+action+'" data-hex="'+esc(p.a)+'" title="'+esc(p.n)+'" style="background:'+esc(p.a)+'"></button>';
  }).join('')+'</div>';
}
function normalizeHexInput(v){
  v=String(v||'').trim();
  if(/^#[0-9a-fA-F]{3}$/.test(v))v='#'+v[1]+v[1]+v[2]+v[2]+v[3]+v[3];
  return /^#[0-9a-fA-F]{6}$/.test(v)?v:'';
}
function rgbToHsvAdmin(r,g,b){
  r/=255;g/=255;b/=255;
  var max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,h=0,s=max===0?0:d/max,v=max;
  if(d!==0){
    if(max===r)h=((g-b)/d)%6;
    else if(max===g)h=((b-r)/d)+2;
    else h=((r-g)/d)+4;
    h*=60;
    if(h<0)h+=360;
  }
  return {h:h,s:s,v:v};
}
function hexToHsvAdmin(hex){
  var rgb=hexToRgbAdmin(hex);
  return rgb?rgbToHsvAdmin(rgb.r,rgb.g,rgb.b):{h:0,s:0,v:1};
}
function hsvToRgbAdmin(h,s,v){
  h=((h%360)+360)%360;
  s=Math.max(0,Math.min(1,s));
  v=Math.max(0,Math.min(1,v));
  var c=v*s;
  var x=c*(1-Math.abs((h/60)%2-1));
  var m=v-c;
  var r=0,g=0,b=0;
  if(h<60){r=c;g=x;}
  else if(h<120){r=x;g=c;}
  else if(h<180){g=c;b=x;}
  else if(h<240){g=x;b=c;}
  else if(h<300){r=x;b=c;}
  else{r=c;b=x;}
  return {
    r:Math.round((r+m)*255),
    g:Math.round((g+m)*255),
    b:Math.round((b+m)*255)
  };
}
function brandSwBtn(action,p,cur){
  var hex=String(p.a||'').toLowerCase();
  var isLight=hex==='#ffffff'||hex==='ffffff';
  return '<button class="brandSw'+(isLight?' brandSwLight':'')+(cur===hex?' sel':'')+'" type="button" data-action="'+action+'" data-hex="'+esc(p.a)+'" title="'+esc(p.n)+'" style="background:'+esc(p.a)+'"></button>';
}
function stylePaletteMeta(action){
  if(action==='settc'){
    return {
      title:'Tekstkleur kiezen',
      quick:[
        {n:'Houtskool',  a:'#3C4650'},
        {n:'Navy',       a:'#2C3E63'},
        {n:'Teal',       a:'#2F5F63'},
        {n:'Woud',       a:'#365C45'},
        {n:'Violet',     a:'#6A63C2'},
        {n:'Berry',      a:'#B45B82'},
        {n:'Goud',       a:'#C99A2E'},
        {n:'Wit',        a:'#FFFFFF'}
      ],
      families:[
        {n:'Houtskool',base:'#3C4650',deep:'#1A1A2E'},
        {n:'Navy',     base:'#2C3E63',deep:'#141E38'},
        {n:'Teal',     base:'#2F5F63',deep:'#1A3E40'},
        {n:'Woud',     base:'#365C45',deep:'#1E3D2A'},
        {n:'Violet',   base:'#6A63C2',deep:'#4A45A0'},
        {n:'Indigo',   base:'#4F5FB2',deep:'#363F80'},
        {n:'Goud',     base:'#C99A2E',deep:'#8C6A10'},
        {n:'Sage',     base:'#6FAE9A',deep:'#3D8070'}
      ]
    };
  }
  if(action==='settb'){
    return {
      title:'Tekstvlak kiezen',
      quick:[
        {n:'Wit',        a:'#FFFFFF'},
        {n:'Mintgroen',  a:'#CFE6D8'},
        {n:'Hemelblauw', a:'#CAD6EF'},
        {n:'Lavendel',   a:'#E7E1F5'},
        {n:'Perzik',     a:'#F8E4D2'},
        {n:'Teal',       a:'#A8D8D6'},
        {n:'Botergeel',  a:'#F4E2A5'},
        {n:'Muntgroen',  a:'#7FC5A6'}
      ],
      families:[
        {n:'Sage',    base:'#F7F4EF',deep:'#CFE6DF'},
        {n:'Teal',    base:'#ECF5F4',deep:'#D6ECEA'},
        {n:'Aqua',    base:'#EEF8F7',deep:'#CFEDEA'},
        {n:'Violet',  base:'#F4F1F8',deep:'#E7E1F5'},
        {n:'Crème',   base:'#FCF7EA',deep:'#F2E6C4'},
        {n:'Tarwe',   base:'#F8F0D8',deep:'#E9D39C'},
        {n:'Slate',   base:'#F3F4F8',deep:'#EEEFF4'},
        {n:'Inkt',    base:'#EEF1F8',deep:'#CAD2E5'}
      ]
    };
  }
  return {
    title:'Kaartachtergrond kiezen',
    families:BRAND_FAMILIES
  };
}
function stylePalettePoints(action){
  return stylePaletteMeta(action).families.reduce(function(acc,fam){
    return acc.concat(famShades(fam.deep,fam.n).map(function(p){return {n:p.n,a:p.a,f:fam.n,base:fam.base};}));
  },[]);
}
function stylePaletteRows(action){
  var meta=stylePaletteMeta(action);
  var pts=buildExpandedPalette(meta.families.map(function(f){return {n:f.n,a:f.base||f.deep};}));
  var rows=[];
  for(var i=0;i<pts.length;i+=15)rows.push(pts.slice(i,i+15));
  return rows;
}
var _stylePalState=null;
var _stylePalRecent=[];
var _stylePalDrag=null;
var _stylePalAnchor=null;
function brandPaletteHtml(action,currentColor,rows,opts){
  var cur=String(currentColor||'').toLowerCase();
  var hexNorm=normalizeHexInput(currentColor)||'#ffffff';
  var isExpanded=!!STYLE_PAL_EXPANDED[action];
  var gridIcon='<svg viewBox="0 0 14 14" width="11" height="11" fill="currentColor" opacity=".75"><rect x="1.5" y="1.5" width="3" height="3" rx=".8"/><rect x="5.5" y="1.5" width="3" height="3" rx=".8"/><rect x="9.5" y="1.5" width="3" height="3" rx=".8"/><rect x="1.5" y="5.5" width="3" height="3" rx=".8"/><rect x="5.5" y="5.5" width="3" height="3" rx=".8"/><rect x="9.5" y="5.5" width="3" height="3" rx=".8"/><rect x="1.5" y="9.5" width="3" height="3" rx=".8"/><rect x="5.5" y="9.5" width="3" height="3" rx=".8"/><rect x="9.5" y="9.5" width="3" height="3" rx=".8"/></svg>';
  var firstRow=rows[0]||[];
  var quickItems=firstRow.slice(0,8);
  (function(){var ext=BRAND_FAMILIES;for(var _qi=0;_qi<ext.length&&quickItems.length<24;_qi+=2){var _fc=ext[_qi];if(_fc&&!quickItems.some(function(q){return q.a===_fc.base;}))quickItems.push({n:_fc.n,a:_fc.base});}})();
  var extraRows=(firstRow.length>8?[firstRow.slice(8)]:[]).concat(rows.slice(1));
  var prefixHtml=(opts&&opts.prefixHtml)||'';
  var html='<div class="brandCompact">'+
    '<div class="brandQSection">'+
      '<div class="brandQuickRow">'+
        '<div class="brandSwsGroup">'+
          prefixHtml+
          quickItems.map(function(p){return brandSwBtn(action,p,cur);}).join('')+
        '</div>'+
        '<div class="brandQuickActions">'+
          '<button class="brandExpandBtn'+(isExpanded?' on':'')+'" type="button" data-action="expandpicker" data-target="'+action+'" title="'+(isExpanded?'Minder':'Meer kleuren')+'">'+gridIcon+'</button>'+
          '<span class="brandQSep"></span>'+
          '<label class="brandCurrentSw" data-cur-target="'+action+'" style="background:'+esc(hexNorm)+'" title="Eigen kleur kiezen">'+
            '<input type="color" value="'+esc(hexNorm)+'" oninput="applyStyleColor(\''+esc(action)+'\',this.value);this.parentElement.style.background=this.value">'+
          '</label>'+
        '</div>'+
      '</div>'+
    '</div>';
  if(isExpanded){
    html+='<div class="brandExpandedWrap">';
    if(extraRows.length>=3){
      var wFams=[];
      for(var ci=0;ci<Math.floor(extraRows.length/3);ci++){
        var cr0=extraRows[ci*3]||[];
        var cr1=extraRows[ci*3+1]||[];
        var cr2=extraRows[ci*3+2]||[];
        for(var fi=0;fi<cr0.length;fi++){
          var pL=cr0[fi],pB=cr1[fi]||cr0[fi],pD=cr2[fi]||cr0[fi];
          if(!pL)continue;
          wFams.push([pL,pB,pD]);
        }
      }
      var wLabels=['Rustig & fris','Warm & zacht','Neutraal & donker'];
      html+='<div class="brandWordBlocks">';
      [0,14,28].forEach(function(start,bi){
        var grp=wFams.slice(start,start+14);
        if(!grp.length)return;
        html+='<div class="brandWordSection">'+
          '<div class="brandWordLabel">'+wLabels[bi]+'</div>'+
          '<div class="brandWordBlock">';
        grp.forEach(function(fam){
          fam.forEach(function(p){html+=brandSwBtn(action,p,cur);});
        });
        html+='</div></div>';
      });
      html+='</div>';
    }
    html+='<label class="brandCustomBtn" style="--pick:'+esc(hexNorm)+'">'+
      '<span class="brandCustomSw"></span>'+
      'Eigen kleur…'+
      '<input type="color" value="'+esc(hexNorm)+'" oninput="applyStyleColor(\''+esc(action)+'\',this.value);this.parentElement.style.setProperty(\'--pick\',this.value)">'+
    '</label>';
    html+='</div>';
  }
  html+='</div>';
  return html;
}
function stylePaletteCurrentHex(action){
  var activeKey=activeStyleEditKey();
  if(action==='settc'&&activeStyleEditKey()==='cover'){
    var block=coverTextStore()[currentCoverTextIdx()]||coverTextStore()[0];
    return normalizeHexInput((block||{}).color)||'#1a1a2e';
  }
  if(action==='settb'&&activeStyleEditKey()==='cover'){
    var block2=coverTextStore()[currentCoverTextIdx()]||coverTextStore()[0];
    return normalizeHexInput((block2||{}).bg)||'#ffffff';
  }
  var css=(S.d.meta||{}).cssVars||{};
  if(action==='setcbg')return cardBgBaseForKey(S.d.meta,activeKey)||DEFAULT_CARD_SURFACE;
  return normalizeHexInput(css[action==='settc'?'--pk-set-text':'--pk-text-bg-color'])||(action==='settc'?'#1a1a2e':'#ffffff');
}
function stylePaletteRecentRowHtml(){
  if(!_stylePalRecent.length)return '';
  return '<div class="stylePalSections">'+
    '<div class="stylePalSecHead"><div class="stylePalSecTitle">Recent</div><button class="stylePalRecentClear" type="button" onclick="clearStylePaletteRecent()">Alles wissen</button></div>'+
    '<div class="stylePalGrid">'+_stylePalRecent.map(function(hex){
      return '<button class="stylePalHexSw" type="button" style="--sw:'+esc(hex)+'" title="'+esc(hex)+'" onclick="pickStylePaletteHex(\''+esc(hex)+'\')"></button>';
    }).join('')+'</div>'+
  '</div>';
}
function stylePaletteGridHtml(action){
  return '<div class="stylePalPaletteWrap">'+stylePaletteRows(action).map(function(row,ri){
    return '<div class="stylePalGrid">'+row.map(function(p){
      return '<button class="stylePalHexSw" type="button" style="--sw:'+esc(p.a)+'" title="'+esc(p.n)+'" data-hex="'+esc(p.a)+'" onclick="pickStylePaletteHex(\''+esc(p.a)+'\')"></button>';
    }).join('')+'</div>';
  }).join('')+'</div>';
}
function stylePaletteModalHtml(action){
  var meta=stylePaletteMeta(action);
  var cur=stylePaletteCurrentHex(action);
  return ''+
    '<div class="stylePalHead">'+
      '<div class="stylePalTitle">'+esc(meta.title)+'</div>'+
      '<button class="stylePalClose" type="button" onclick="closeModal()" aria-label="Sluiten">×</button>'+
    '</div>'+
    '<div class="stylePalBody">'+
      '<div class="stylePalSections">'+
        '<div class="stylePalSecHead"><div class="stylePalSecTitle">Snel kiezen</div></div>'+
        stylePaletteGridHtml(action)+
      '</div>'+
      stylePaletteRecentRowHtml()+
      '<div class="stylePalTop">'+
        '<div class="stylePalMainPick">'+
          '<div id="stylePalSurface" class="stylePalSurface" onmousedown="startStylePalSurface(event)"><div id="stylePalSurfaceDot" class="stylePalSurfaceDot"></div></div>'+
          '<div id="stylePalHue" class="stylePalHue" onmousedown="startStylePalHue(event)"><div id="stylePalHueKnob" class="stylePalHueKnob"></div></div>'+
        '</div>'+
        '<div class="stylePalSide">'+
          '<div id="stylePalPreview" class="stylePalPreview">#FFFFFF</div>'+
          '<div class="stylePalFields">'+
            '<div class="sLbl">HEX</div>'+
            '<input class="fIn" id="stylePalHexInput" value="'+esc(cur)+'" oninput="syncStylePaletteHex(this.value)">'+
            '<div class="sLbl">RGB</div>'+
            '<div class="stylePalRgb">'+
              '<input class="fIn" id="stylePalRInput" inputmode="numeric" oninput="syncStylePaletteRgb()">'+
              '<input class="fIn" id="stylePalGInput" inputmode="numeric" oninput="syncStylePaletteRgb()">'+
              '<input class="fIn" id="stylePalBInput" inputmode="numeric" oninput="syncStylePaletteRgb()">'+
            '</div>'+
          '</div>'+
          '<div class="stylePalQuickActions">'+
            '<label class="stylePalPickerBtn" id="stylePalPickerBtn"><span class="stylePalPickerSw" id="stylePalPickerSw"></span>Kleurkiezer<input id="stylePalNative" type="color" value="'+esc(cur)+'" oninput="syncStylePaletteHex(this.value)"></label>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="stylePalFooter"><button class="btnP stylePalApply" type="button" onclick="applyStylePalette()">Gebruik kleur</button></div>'+
    '</div>';
}
function setStylePaletteState(hex){
  var hsv=hexToHsvAdmin(hex);
  _stylePalState={action:_stylePalState.action,h:hsv.h,s:hsv.s,v:hsv.v,hex:normalizeHexInput(hex)||'#ffffff'};
}
function renderStylePalette(){
  if(!_stylePalState)return;
  var rgb=hsvToRgbAdmin(_stylePalState.h,_stylePalState.s,_stylePalState.v);
  var hex=rgbToHexAdmin(rgb.r,rgb.g,rgb.b);
  _stylePalState.hex=hex;
  var hueRgb=hsvToRgbAdmin(_stylePalState.h,1,1);
  var hueHex=rgbToHexAdmin(hueRgb.r,hueRgb.g,hueRgb.b);
  var surf=g('stylePalSurface'),dot=g('stylePalSurfaceDot'),hue=g('stylePalHue'),knob=g('stylePalHueKnob');
  if(surf)surf.style.background=hueHex;
  if(dot){dot.style.left=(_stylePalState.s*100)+'%';dot.style.top=((1-_stylePalState.v)*100)+'%';}
  if(knob)knob.style.top=((_stylePalState.h/360)*100)+'%';
  if(g('stylePalPreview')){
    g('stylePalPreview').style.background=hex;
    g('stylePalPreview').textContent=hex.toUpperCase();
  }
  if(g('stylePalHexInput')&&g('stylePalHexInput')!==document.activeElement)g('stylePalHexInput').value=hex;
  if(g('stylePalRInput')&&g('stylePalRInput')!==document.activeElement)g('stylePalRInput').value=rgb.r;
  if(g('stylePalGInput')&&g('stylePalGInput')!==document.activeElement)g('stylePalGInput').value=rgb.g;
  if(g('stylePalBInput')&&g('stylePalBInput')!==document.activeElement)g('stylePalBInput').value=rgb.b;
  if(g('stylePalNative'))g('stylePalNative').value=hex;
  if(g('stylePalPickerBtn'))g('stylePalPickerBtn').style.setProperty('--pick',hex);
  Array.prototype.slice.call(document.querySelectorAll('.stylePalHexSw')).forEach(function(btn){
    btn.classList.toggle('sel',String(btn.dataset.hex||'').toLowerCase()===hex.toLowerCase());
  });
}
function updateStylePaletteFromHex(hex){
  var norm=normalizeHexInput(hex);
  if(!norm||!_stylePalState)return;
  var hsv=hexToHsvAdmin(norm);
  _stylePalState.h=hsv.h;
  _stylePalState.s=hsv.s;
  _stylePalState.v=hsv.v;
  _stylePalState.hex=norm;
  renderStylePalette();
}
function syncStylePaletteHex(v){
  updateStylePaletteFromHex(v);
}
function syncStylePaletteRgb(){
  var r=parseInt((g('stylePalRInput')||{}).value,10);
  var gVal=parseInt((g('stylePalGInput')||{}).value,10);
  var b=parseInt((g('stylePalBInput')||{}).value,10);
  if([r,gVal,b].some(function(v){return isNaN(v);} ))return;
  updateStylePaletteFromHex(rgbToHexAdmin(r,gVal,b));
}
function pickStylePaletteHex(hex){
  updateStylePaletteFromHex(hex);
}
function clearStylePaletteRecent(){
  _stylePalRecent=[];
  if(g('mb')&&g('mb').classList.contains('stylePalModal'))openStylePalette(_stylePalState.action);
}
function stylePalettePickAt(clientX,clientY,mode){
  if(!_stylePalState)return;
  var el=g(mode==='hue'?'stylePalHue':'stylePalSurface');
  if(!el)return;
  var rect=el.getBoundingClientRect();
  var x=Math.max(0,Math.min(rect.width,clientX-rect.left));
  var y=Math.max(0,Math.min(rect.height,clientY-rect.top));
  if(mode==='hue'){
    _stylePalState.h=(y/rect.height)*360;
  }else{
    _stylePalState.s=x/rect.width;
    _stylePalState.v=1-(y/rect.height);
  }
  renderStylePalette();
}
function startStylePalSurface(ev){
  _stylePalDrag={kind:'surface'};
  stylePalettePickAt(ev.clientX,ev.clientY,'surface');
  ev.preventDefault();
}
function startStylePalHue(ev){
  _stylePalDrag={kind:'hue'};
  stylePalettePickAt(ev.clientX,ev.clientY,'hue');
  ev.preventDefault();
}
function openStylePalette(action,anchorEl){
  _stylePalAnchor=anchorEl||null;
  _stylePalState={action:action,h:0,s:0,v:1,hex:stylePaletteCurrentHex(action)};
  showModal(stylePaletteModalHtml(action),'stylePalModal');
  g('ovl').classList.remove('palPopover');
  updateStylePaletteFromHex(_stylePalState.hex);
}

function buildStijl(target){
  var m=S.d.meta||{};
  var accent=(m.cssVars||{})['--pk-set-accent']||'#CFE6DF';
  var bg=((m.ui||{}).index||{}).background||{};
  var layoutMode=opmakenViewMode();
  if(!Array.isArray(bg.palette)||!bg.palette.length){var bc=bgCfg();bc.palette=[accent];}
  var curFont=(m.cssVars||{})['--pk-font']||'IBM Plex Sans';

  var pane=S.opmPane||'vragen';
  var isInfoMode=pane==='info';
  var infoKey=INFO_SLIDE_KEY||'cover';
  if(!isInfoMode){
    var vraagOpts=stylePreviewOptions(m);
    var vraagKeys=vraagOpts.map(function(opt){return opt.key;});
    if(vraagKeys.indexOf(STYLE_PREVIEW_KEY)<0){
      var firstVraagTheme=vraagOpts.find(function(opt){return opt.key!=='cover'&&opt.key!=='algemeen';});
      STYLE_PREVIEW_KEY=(firstVraagTheme||vraagOpts[0]||{}).key||'cover';
    }
  }
  // In info mode: use infoSlideOptions so custom pages and excluded slides are handled
  var infoOpts=isInfoMode?infoSlideOptions(m):null;
  if(isInfoMode){
    var infoActive=infoOpts.find(function(o){return o.key===infoKey&&!o.excluded;});
    if(!infoActive){var firstActive=infoOpts.find(function(o){return !o.excluded;});infoKey=(firstActive||infoOpts[0]||{}).key||'cover';}
    INFO_SLIDE_KEY=infoKey;
  }
  var activeInfoOpt=isInfoMode?((infoOpts.find(function(o){return o.key===infoKey;})||null)):null;
  var previewState=isInfoMode?null:stylePreviewState(m);
  var themeIdx=!isInfoMode?styleThemeIndexByKey(previewState.selected.key):-1;
  var themeLabel=!isInfoMode&&themeIdx>=0?((m.themes||[])[themeIdx].label||''):'';
  var previewFile=isInfoMode?(((activeInfoOpt)||{}).file||'voorkant.svg'):previewState.file;
  var sampleTxt=!isInfoMode?(previewState.selected.key==='cover'?previewState.sampleTxt:questionPreviewFrontText(previewState.selected.key)):'';
  var sliderHtml='';
  if(isInfoMode){
    sliderHtml=infoOpts.map(function(opt){return infoSlideCardHtml(opt,infoKey);}).join('');
    // Select-all / deselect-all tile (only when there are themes or custom pages to toggle)
    var toggleableOpts=infoOpts.filter(function(o){return o.key!=='cover';});
    if(toggleableOpts.length>0){
      var allIncluded=toggleableOpts.every(function(o){return !o.excluded;});
      var toggleAllTitle=allIncluded?'Alles verbergen':'Alles tonen';
      var toggleAllAction=allIncluded?'excludeAllInfoThemes()':'includeAllInfoThemes()';
      var toggleAllIcon=allIncluded
        ?'<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 8h10"/></svg>'
        :'<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>';
      sliderHtml+='<button class="stijlSlideCard stijlSlideAdd infoToggleAll" type="button" onclick="'+toggleAllAction+'" title="'+toggleAllTitle+'">'+
        '<div class="stijlSlideThumb"><div class="stijlSlidePlusWrap"><div class="stijlSlidePlusChip">'+toggleAllIcon+'</div></div></div>'+
        '<div class="stijlSlideBody"><div class="stijlSlideName">'+esc(toggleAllTitle)+'</div></div>'+
      '</button>';
    }
    // "Vul alle thema's" tile – only when some themes have no info text yet
    var themsWithMissingInfo=(m.themes||[]).filter(function(th){return !String(((S.d.uitleg)||{})[th.key]||'').trim();});
    if(themsWithMissingInfo.length>0){
      var penIcon='<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 2.5l3 3L5 14H2v-3L10.5 2.5z"/></svg>';
      sliderHtml+='<button class="stijlSlideCard stijlSlideAdd" type="button" onclick="fillAllThemeInfo()" title="Vul tekst in voor alle thema\'s">'+
        '<div class="stijlSlideThumb"><div class="stijlSlidePlusWrap"><div class="stijlSlidePlusChip">'+penIcon+'</div></div></div>'+
        '<div class="stijlSlideBody"><div class="stijlSlideName">Gebruik alle thema\'s</div></div>'+
      '</button>';
    }
    sliderHtml+='<button class="stijlSlideCard stijlSlideAdd" type="button" onclick="addInfoCustomPage()" title="Eigen pagina toevoegen">'+
      '<div class="stijlSlideThumb"><div class="stijlSlidePlusWrap"><div class="stijlSlidePlusChip"><div class="stijlSlidePlus">+</div></div></div></div>'+
      '<div class="stijlSlideBody"><div class="stijlSlideName">Pagina</div></div>'+
    '</button>';
  }else{
    sliderHtml=previewState.options.map(function(opt){return styleSlideCardHtml(opt,previewState.selected.key);}).join('');
  }
  if(!isInfoMode){
    sliderHtml+=
      '<button class="stijlSlideCard stijlSlideAdd" type="button" onclick="addThemeFromStyle()">'+
        '<div class="stijlSlideThumb"><div class="stijlSlidePlusWrap"><div class="stijlSlidePlusChip"><div class="stijlSlidePlus">+</div></div></div></div>'+
        '<div class="stijlSlideBody"><div class="stijlSlideName">Nieuw thema</div></div>'+
      '</button>'+
      '<button class="stijlSlideCard stijlSlideAdd stijlSlideDup" type="button" onclick="dupSet()" title="Set dupliceren">'+
        '<div class="stijlSlideThumb"><div class="stijlSlidePlusWrap"><div class="stijlSlidePlusChip"><svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></div></div></div>'+
        '<div class="stijlSlideBody"><div class="stijlSlideName">Set dupliceren</div></div>'+
      '</button>';
  }
  var html='<div class="panel"><div class="stijlShell">'+
    '<div id="stijl-kaart" class="stijlCardSection">'+
      '<div class="stijlHeaderBar'+(isInfoMode?' info-mode':'')+'">'+
        '<div class="stijlSlideRail">'+
          sliderHtml+
        '</div>'+
      '</div>'+
      '<div class="stijlSectionTitle">'+(isInfoMode?'Kaart infosheet':'Kaart opmaken')+'</div>'+
      buildSharedCardEditor({
        selectorHtml:'',
        wrapId:'stijlCardPrevWrap',
        wrapClass:'stijlCardPrevWrap',
        label:isInfoMode?((activeInfoOpt&&activeInfoOpt.label)||''):themeLabel,
        faceId:'stijlCardFace',
        frontId:'stijlCardTxt',
        backId:'stijlCardBack',
        previewFile:isInfoMode?(((activeInfoOpt)||{}).file||previewFile):previewFile,
        previewKey:isInfoMode?infoKey:previewState.selected.key,
        forceNoImage:isInfoMode&&cardBuildModeForKey(m,infoKey)==='self',
        sampleTxt:isInfoMode?mdToHtml(((S.d.uitleg)||{})[infoKey]||''):sampleTxt,
        frontTxt:isInfoMode?mdToHtml(((S.d.uitleg)||{})[infoKey]||''):sampleTxt,
        forceBold:false,
        previewHint:previewFile,
        suppressEmptyFrontHint:true,
        infoRichCe:isInfoMode,
        infoRichCeKey:isInfoMode?infoKey:null,
        showInfoMidTitle:isInfoMode&&infoKey!=='cover'&&!!(((m.themes||[]).find(function(t){return t.key===infoKey;}))||((m.infoPages||[]).find(function(p){return p.key===infoKey;}))),
        infoMidTitleKey:isInfoMode?infoKey:null,
        infoMidTitleText:isInfoMode?infoMidTitleText(infoKey):'',
        layoutMode:layoutMode,
        sidePanelHtml:'<div class="stijlQuestionPane'+(isInfoMode?' info-mode':'')+'">'+opmakenPaneTabsHtml(pane)+'<div id="stijlSidePaneBody"></div></div>'
      })+
    '</div>'+
    (layoutMode==='canvas'?'':('<div id="stijl-bg" class="stijlCardSection">'+
      '<div class="stijlSectionTitle">Achtergrond</div>'+
      '<div class="bgWrap">'+buildBgCtrls(bg,accent)+
      '<div class="bgPrev"><div class="bgCanvas" id="bgWrap"><canvas id="bgCanvas"></canvas></div><div class="bgHint">Live preview</div></div></div>'+
    '</div>'))+
  '</div></div>';

  target.innerHTML=html;
  var fontLink=document.getElementById('fontPreviewLink');
  if(!fontLink){fontLink=document.createElement('link');fontLink.rel='stylesheet';fontLink.id='fontPreviewLink';document.head.appendChild(fontLink);}
  fontLink.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(curFont)+':wght@400;500;600&display=swap';

  target.querySelectorAll('.richTa').forEach(function(ta){
    autoH(ta);
    ta.addEventListener('input',function(){autoH(this);});
  });

  wireBgCtrls();
  wireStyleComposer();
  syncActiveCoverTextControls();
  renderBgPreview();

  var sidePane=g('stijlSidePaneBody');
  if(sidePane){
    if(pane==='vragen'){
      buildVragen(sidePane,{filterKey:STYLE_PREVIEW_KEY||'cover'});
    }else{
      buildInfoPane(sidePane);
    }
    setTimeout(focusOpmakenSideContent,30);
  }
  setTimeout(updateStijlPreview,50);
  setTimeout(applyCanvasZoom,80);
  setTimeout(initSliderScrollHints,60);
}
function syncBgPalette(newAccent){
  var bc=bgCfg();
  // Only auto-sync if user hasn't customized with multiple colors
  if(!Array.isArray(bc.palette)||bc.palette.length<=1){
    bc.palette=[newAccent];markDirty();
    var pw2=g('bg_pal');if(pw2)pw2.innerHTML=buildPalEd(bc.palette);
  }
}
function syncStyleColorInput(action,val){
  if(action===(_stylePalState&&_stylePalState.action))syncStylePaletteHex(val);
}
function applyStyleColor(action,hex){
  hex=normalizeHexInput(hex);
  if(!hex){toast('Gebruik een geldige hex-kleur','red');return;}
  var activeKey=activeStyleEditKey();
  _stylePalRecent=[hex].concat(_stylePalRecent.filter(function(item){return item.toLowerCase()!==hex.toLowerCase();})).slice(0,8);
  if(action==='settc'){
    if(RT.richCeTarget){applyRichCeCmd('foreColor',hex);if(g('mb')&&g('mb').classList.contains('stylePalModal'))closeModal();return;}
    if(activeKey==='cover'){
      var blocks=coverTextStore();
      var block=blocks[currentCoverTextIdx()]||blocks[0];
      if(!block)return;
      block.color=hex;
      markDirty();
    }else{
      setCV('--pk-set-text',hex);markDirty();
    }
    g('pw').querySelectorAll('[data-action="settc"]').forEach(function(d){d.classList.toggle('sel',String(d.dataset.hex||'').toLowerCase()===hex.toLowerCase());});
    g('pw').querySelectorAll('[data-cur-target="settc"]').forEach(function(d){d.style.background=hex;});
    g('pw').querySelectorAll('[data-text-color-btn]').forEach(function(btn){
      btn.innerHTML=textColorButtonIcon(hex)+'<span class="textToolbarCaret">▾</span>';
    });
    updateStijlPreview();
    if(g('mb').classList.contains('stylePalModal'))closeModal();
    return;
  }
  if(action==='settb'){
    if(activeKey==='cover'){
      var blocks2=coverTextStore();
      var block2=blocks2[currentCoverTextIdx()]||blocks2[0];
      if(!block2)return;
      block2.bg=hex;
      markDirty();
    }else{
      setCV('--pk-text-bg-color',hex);markDirty();
    }
    g('pw').querySelectorAll('[data-text-bg-btn]').forEach(function(btn){
      btn.classList.remove('sel');
      btn.innerHTML=textBgButtonIcon(hex||'none')+'<span class="textToolbarCaret">▾</span>';
    });
    updateStijlPreview();
    if(g('mb').classList.contains('stylePalModal'))closeModal();
    return;
  }
  if(action==='setcbg'){
    var meta=S.d.meta=S.d.meta||{};
    var maps=cardBgMaps(meta);
    maps.base[activeKey]=hex;
    maps.tone[activeKey]=0;
    setCardBuildMode(activeKey,'self');
    markDirty();
    g('pw').querySelectorAll('[data-action="setcbg"]').forEach(function(d){d.classList.toggle('sel',String(d.dataset.hex||'').toLowerCase()===hex.toLowerCase());});
    g('pw').querySelectorAll('[data-cur-target="setcbg"]').forEach(function(d){d.style.background=hex;});
    updateStijlPreview();
    if(g('mb').classList.contains('stylePalModal'))closeModal();
  }
}
function applyStyleColorInput(action){
  if(action===(_stylePalState&&_stylePalState.action)&&_stylePalState)applyStyleColor(action,_stylePalState.hex);
}
function applyStylePalette(){
  if(_stylePalState)applyStyleColor(_stylePalState.action,_stylePalState.hex);
}
function setFontLive(val){
  if(activeStyleEditKey()==='cover'){
    var blocks=coverTextStore();
    var block=blocks[currentCoverTextIdx()]||blocks[0];
    if(!block)return;
    block.font=val;
    markDirty();
  }else{
    setCV('--pk-font',val);markDirty();
  }
  var fontLink=document.getElementById('fontPreviewLink');
  if(!fontLink){fontLink=document.createElement('link');fontLink.rel='stylesheet';fontLink.id='fontPreviewLink';document.head.appendChild(fontLink);}
  fontLink.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(val)+':wght@400;500;600&display=swap';
  // Update font menu button display live (without full rebuild)
  document.querySelectorAll('[data-font-menu-btn]').forEach(function(btn){
    var lbl=btn.querySelector('.fontMenuLabel');
    if(lbl)lbl.textContent=val;
    btn.style.fontFamily=val;
  });
  document.querySelectorAll('[data-font-option]').forEach(function(btn){
    btn.classList.toggle('sel',btn.dataset.fontOption===val);
  });
  updateStijlPreview();
}
function setFontSizeLive(val){
  var n=parseInt(val,10);if(isNaN(n)||n<6||n>72)return;
  if(activeStyleEditKey()==='cover'){
    updateCoverTextSize(currentCoverTextIdx(),n);
    return;
  }
  setCV('--pk-font-size',String(n));markDirty();updateStijlPreview();
  document.querySelectorAll('[data-font-size-btn]').forEach(function(btn){
    btn.innerHTML=fontSizeButtonLabel(n);
  });
  document.querySelectorAll('[data-font-size-option]').forEach(function(btn){
    btn.classList.toggle('sel',String(btn.dataset.fontSizeOption||'')===String(n));
  });
}
function updateStijlPreview(){
  var m=S.d.meta||{};
  var cv=m.cssVars||{};
  var previewKey=activeStyleEditKey();
  var font=cv['--pk-font']||'IBM Plex Sans';
  var fs=fontSizeCss(cv['--pk-font-size']||'12');
  var color=cv['--pk-set-text']||'rgba(48,96,136,0.95)';
  var align=(S.opmPane==='info')?(cv['--pk-text-align']||'left'):(cv['--pk-text-align']||'center');
  var valign=cv['--pk-text-valign']||'center';
  var cardBg=cardBgForKey(m,previewKey)||ADMIN_PREVIEW_CARD_BG;
  var globalWeight=cv['--pk-font-weight']||'regular';
  var globalItalic=cv['--pk-font-italic']==='1';
  var globalUnderline=cv['--pk-font-underline']==='1';
  var globalTextBg=normalizeHexInput(cv['--pk-text-bg-color'])||'';
  var letterSpacing=cv['--pk-letter-spacing']||'0';
  var lineHeight=cv['--pk-line-height']||'1.4';
  ['stijlCardTxt','qedCardTxt'].forEach(function(id){
    var txt=g(id);if(!txt)return;
    var inner=txt.querySelector('.cpFrontInner')||txt;
    txt.style.fontFamily="'"+font+"', sans-serif";
    txt.style.fontSize=fs;
    txt.style.color=color;
    txt.style.textAlign=align;
    txt.style.letterSpacing=letterSpacing==='0'?'':letterSpacing+'px';
    txt.style.lineHeight=lineHeight;
    var infoMode=(S.opmPane==='info');
    if(infoMode){
      // Info mode: card shows image only, richCe below handles its own styles
      txt.style.fontWeight='';txt.style.fontStyle='';txt.style.textDecoration='';
    }else{
      txt.style.fontWeight=globalWeight==='bold'?'700':'400';
      txt.style.fontStyle='normal';txt.style.textDecoration='none';
      inner.style.fontWeight=globalWeight==='bold'?'700':globalWeight==='semibold'?'600':globalWeight==='medium'?'500':'400';
      inner.style.fontStyle=globalItalic?'italic':'normal';
      inner.style.textDecoration=globalUnderline?'underline':'none';
      inner.style.background=globalTextBg||'transparent';
      inner.style.padding=globalTextBg?'4px 8px':'0';
    }
    var overlay=txt.parentElement;
    if(overlay){
      overlay.style.alignItems=valign==='top'?'flex-start':valign==='bottom'?'flex-end':'center';
      overlay.style.justifyContent=align==='left'?'flex-start':align==='right'?'flex-end':'center';
    }
  });
  ['stijlCardPrevWrap','qedCardPrevWrap'].forEach(function(id){
    var prev=g(id);if(!prev)return;
    var outer=prev.querySelector('.cardFaceOuter');
    if(outer)outer.style.background='transparent';
    var empty=prev.querySelector('.cpBgEmpty');
    if(empty)empty.style.background=cardBgValue(cardBg);
  });
  renderCardShapeTargets();
  renderCoverTextTargets();
  var coverBlocks=coverTextStore();
  coverEditorQueryAll('.cpTextLayer[data-cover-texts="1"] .cpTextBlockText').forEach(function(node){
    var wrap=node.parentElement;
    var wrapIdx=wrap?parseInt(wrap.dataset.coverTextIdx,10):NaN;
    var block=coverBlocks[isNaN(wrapIdx)?0:wrapIdx]||{};
    var bgHex=normalizeHexInput(block.bg)||'';
    if(wrap)wrap.style.background='transparent';
    if(wrap)wrap.style.padding='0';
    node.style.fontFamily="'"+(block.font||font)+"', sans-serif";
    node.style.color=block.color||color;
    node.style.textAlign=block.align||align;
    node.style.fontSize=(parseInt(block.size,10)|| (wrapIdx===0?18:12))+'pt';
    node.style.fontWeight=block.weight==='bold'?'700':block.weight==='semibold'?'600':block.weight==='medium'?'500':'400';
    node.style.fontStyle=block.italic?'italic':'normal';
    node.style.textDecoration=block.underline?'underline':'none';
    node.classList.toggle('hasBg',!!bgHex);
    node.style.setProperty('--cp-text-bg',bgHex||'transparent');
  });
}
function setTextAlign(val){
  if(RT.richCeTarget&&RT.richCeTarget.dataset.richType!=='question'){var ac={left:'justifyLeft',center:'justifyCenter',right:'justifyRight'};if(ac[val])applyRichCeCmd(ac[val]);return;}
  if(activeStyleEditKey()==='cover'){
    updateCoverTextAlign(currentCoverTextIdx(),val);
    document.querySelectorAll('[data-align]').forEach(function(b){
      b.classList.toggle('sel',b.dataset.align===val);
    });
    return;
  }
  setCV('--pk-text-align',val);markDirty();updateStijlPreview();
  document.querySelectorAll('[data-align]').forEach(function(b){
    b.classList.toggle('sel',b.dataset.align===val);
  });
}
function setTextValign(val){
  if(activeStyleEditKey()==='cover'){
    updateCoverTextValign(currentCoverTextIdx(),val);
    document.querySelectorAll('[data-valign]').forEach(function(b){
      b.classList.toggle('sel',b.dataset.valign===val);
    });
    return;
  }
  setCV('--pk-text-valign',val);markDirty();updateStijlPreview();
  document.querySelectorAll('[data-valign]').forEach(function(b){
    b.classList.toggle('sel',b.dataset.valign===val);
  });
}
function toggleList(type){
  if(RT.richCeTarget&&RT.richCeTarget.dataset.richType!=='question'){
    applyRichCeCmd(type==='ol'?'insertOrderedList':'insertUnorderedList');
  }
}
function indentText(dir){
  if(RT.richCeTarget&&RT.richCeTarget.dataset.richType!=='question'){
    applyRichCeCmd(dir==='out'?'outdent':'indent');
  }
}
function setLetterSpacing(val){
  val=String(val||'0');
  setCV('--pk-letter-spacing',val);markDirty();updateStijlPreview();
  document.querySelectorAll('[data-letter-spacing-val]').forEach(function(b){b.classList.toggle('sel',b.dataset.letterSpacingVal===val);});
}
function setLineHeight(val){
  val=String(val||'1.4');
  setCV('--pk-line-height',val);markDirty();updateStijlPreview();
  document.querySelectorAll('[data-line-height-val]').forEach(function(b){b.classList.toggle('sel',b.dataset.lineHeightVal===val);});
}

function bgCfg(){var m=S.d.meta;m.ui=m.ui||{};m.ui.index=m.ui.index||{};m.ui.index.background=m.ui.index.background||{};return m.ui.index.background;}
var DEFAULT_INDEX_BG_PALETTE=['#67C5BB','#7FD1C8','#93DCD4','#B1E8E1'];
function sliderValueHtml(value,suffix){
  var num=String(value==null?'':value);
  return '<span class="valueNum">'+esc(num)+'</span><span class="valueSuffix">'+esc(suffix||'')+'</span>';
}
function applyBgPaletteColor(hex){
  var color=normalizeHexInput(hex)||'#ffffff';
  var bc=bgCfg();
  bc.palette=Array.isArray(bc.palette)?bc.palette:[(S.d.meta.cssVars||{})['--pk-set-accent']||'#CFE6DF'];
  var idx=bc.palette.map(function(c){return String(c).toLowerCase();}).indexOf(String(color).toLowerCase());
  if(idx<0){
    bc.palette.push(color);
    idx=bc.palette.length-1;
  }else{
    bc.palette[idx]=color;
  }
  BG_ACTIVE_PAL_INDEX=idx;
  markDirty();
  var pw=g('bg_pal');if(pw)pw.innerHTML=buildPalEd(bc.palette);
  scheduleBg();
}
function selectedBgShapes(bg){
  var list=Array.isArray(bg&&bg.blobShapes)?bg.blobShapes.filter(Boolean):[];
  if(!list.length&&bg&&bg.blobSpread)list=[bg.blobSpread];
  if(!list.length)list=['organic'];
  return list;
}
function buildBgCtrls(bg,accent,title,canvas){
  var count=typeof bg.blobCount==='number'?bg.blobCount:6,alpha=typeof bg.alphaBoost==='number'?bg.alphaBoost:1.0,size=typeof bg.sizeScale==='number'?bg.sizeScale:1.0,irr=typeof bg.blobIrregularity==='number'?bg.blobIrregularity:0.35,pal=Array.isArray(bg.palette)&&bg.palette.length?bg.palette:[accent],autoMode=bg.autoMode!==false,shapes=selectedBgShapes(bg);
  var SHAPES=[{v:'organic',l:'Organisch'},{v:'circle',l:'Cirkels'},{v:'grid',l:'Raster'},{v:'triangle',l:'Driehoeken'},{v:'diamond',l:'Diamanten'}];
  if(canvas){
    // Flat canvas layout: no nested card wrappers, no accordion
    return '<div class="bgCanvasFlat">'+
      (title?'<div class="stijlSectionLabel">'+esc(title||'Achtergrond')+'</div>':'')+
      '<div class="bgAutoHint" style="margin:0 0 9px">'+(autoMode?'Volgt vormen en kleuren van de hele set.':'Kies zelf vormen, kleuren en intensiteit.')+'</div>'+
      '<div class="togR2" style="margin-top:4px;margin-bottom:6px"><label style="font-size:12px;color:var(--k2)">Automatisch</label><label class="tog"><input type="checkbox" id="bg_auto"'+(autoMode?' checked':'')+'><span class="togSl"></span></label></div>'+
      (!autoMode?
        '<div class="bgCanvasFlatSec"><div class="sLbl">Kleur</div>'+
          '<div class="bgAutoHint" style="margin:0 0 9px">De witte achtergrond kleurt subtiel mee met je kaartkleur.</div>'+
          '<div class="togR2" style="margin:4px 0 13px"><label style="font-size:11.5px;color:var(--k2)">Achtergrond tint</label><label class="tog"><input type="checkbox" id="bg_at"'+(bg.autoTint!==false?' checked':'')+'><span class="togSl"></span></label></div>'+
          '<div id="bg_pal">'+buildPalEd(pal)+'</div>'+
        '</div>'+
        '<div class="bgCanvasFlatSec"><div class="sLbl">Vormen</div>'+
          '<div class="bgShapeBar" style="margin:4px 0 8px">'+SHAPES.map(function(s){return'<button class="shapeTypeBtn'+(shapes.indexOf(s.v)>=0?' sel':'')+'" type="button" title="'+esc(s.l)+'" aria-label="'+esc(s.l)+'" data-action="bgshape" data-v="'+s.v+'">'+shapeIconSvg(s.v==='grid'?'diamond':s.v)+'</button>';}).join('')+'</div>'+
          '<div class="bgAutoHint" style="margin:0 0 9px">Bepaalt hoe strak of organisch de vormen aanvoelen.</div>'+
          '<div class="ctrlR"><label>Vormvariatie</label><input class="shapeSlider" style="--pct:'+sliderPercent(irr,0.05,0.65)+'%" type="range" id="bg_irr" min="0.05" max="0.65" step="0.05" value="'+irr+'" oninput="paintShapeSlider(this)"><span class="cv" id="bg_irr_v">'+sliderValueHtml(Math.round(irr*100),'%')+'</span></div>'+
        '</div>'
      :'')+
      '<div class="bgCanvasFlatSec"><div class="sLbl">Intensiteit</div>'+
        '<div class="ctrlR"><label>Aantal</label><input class="shapeSlider" style="--pct:'+sliderPercent(count,2,22)+'%" type="range" id="bg_n" min="2" max="22" step="1" value="'+count+'" oninput="paintShapeSlider(this)"><span class="cv" id="bg_n_v">'+sliderValueHtml(count,'')+'</span></div>'+
        '<div class="ctrlR"><label>Grootte</label><input class="shapeSlider" style="--pct:'+sliderPercent(size,0.3,2.4)+'%" type="range" id="bg_sz" min="0.3" max="2.4" step="0.1" value="'+size+'" oninput="paintShapeSlider(this)"><span class="cv" id="bg_sz_v">'+sliderValueHtml(size,'×')+'</span></div>'+
        '<div class="ctrlR"><label>Zichtbaarheid</label><input class="shapeSlider" style="--pct:'+sliderPercent(alpha,0.2,3.2)+'%" type="range" id="bg_al" min="0.2" max="3.2" step="0.1" value="'+alpha+'" oninput="paintShapeSlider(this)"><span class="cv" id="bg_al_v">'+sliderValueHtml(alpha,'×')+'</span></div>'+
        '<div class="bgAutoHint" style="margin:4px 0 0">Bepaal de zichtbaarheid van de achtergrond.</div>'+
      '</div>'+
    '</div>';
  }
  return '<div class="bgCtrls">'+
    '<div class="ctrlG bgAutoCard"><label class="cgT">'+esc(title||'Achtergrond')+'</label>'+
      '<div class="togR2"><label>Automatisch achtergrond maken</label><label class="tog"><input type="checkbox" id="bg_auto"'+(autoMode?' checked':'')+'><span class="togSl"></span></label></div>'+
      '<div class="bgAutoHint">'+(autoMode?'Achtergrond volgt automatisch de vormen en kleuren van de hele kaartenset.':'Kies zelf vormen, kleuren en intensiteit voor de achtergrond.')+'</div>'+
    '</div>'+
    '<details class="bgCompactPanel"'+(autoMode?'':' open')+'>'+
      '<summary>'+(autoMode?'Achtergrond verfijnen':'Handmatige achtergrond')+'</summary>'+
      '<div class="bgCompactBody">'+
    (autoMode?'':'<div class="bgManualWrap">'+
      '<div class="ctrlG"><label class="cgT">Kleur</label>'+
        '<div class="togR2"><label>Achtergrond tint</label><label class="tog"><input type="checkbox" id="bg_at"'+(bg.autoTint!==false?' checked':'')+'><span class="togSl"></span></label></div>'+
        '<div class="bgAutoHint" style="margin-top:-2px">De witte achtergrond kleurt subtiel mee met je kaartkleur.</div>'+
        '<div id="bg_pal">'+buildPalEd(pal)+'</div></div>'+
      '<div class="ctrlG"><label class="cgT">Vormen</label>'+
        '<div class="bgShapeBar">'+SHAPES.map(function(s){return'<button class="shapeTypeBtn'+(shapes.indexOf(s.v)>=0?' sel':'')+'" type="button" title="'+esc(s.l)+'" aria-label="'+esc(s.l)+'" data-action="bgshape" data-v="'+s.v+'">'+shapeIconSvg(s.v==='grid'?'diamond':s.v)+'</button>';}).join('')+'</div>'+
        '<div class="ctrlR" style="margin-top:10px"><label>Vormvariatie</label><input class="shapeSlider" style="--pct:'+sliderPercent(irr,0.05,0.65)+'%" type="range" id="bg_irr" min="0.05" max="0.65" step="0.05" value="'+irr+'" oninput="paintShapeSlider(this)"><span class="cv" id="bg_irr_v">'+sliderValueHtml(Math.round(irr*100),'%')+'</span></div><div class="bgAutoHint" style="margin-top:2px">Bepaalt hoe strak of organisch de vormen aanvoelen.</div></div>'+
    '</div>')+
    '<div class="ctrlG"><label class="cgT">Hoeveelheid &amp; grootte</label>'+
      '<div class="ctrlR"><label>Aantal vormen</label><input class="shapeSlider" style="--pct:'+sliderPercent(count,2,22)+'%" type="range" id="bg_n" min="2" max="22" step="1" value="'+count+'" oninput="paintShapeSlider(this)"><span class="cv" id="bg_n_v">'+sliderValueHtml(count,'')+'</span></div>'+
      '<div class="ctrlR"><label>Grootte</label><input class="shapeSlider" style="--pct:'+sliderPercent(size,0.3,2.4)+'%" type="range" id="bg_sz" min="0.3" max="2.4" step="0.1" value="'+size+'" oninput="paintShapeSlider(this)"><span class="cv" id="bg_sz_v">'+sliderValueHtml(size,'×')+'</span></div>'+
      '<div class="ctrlR"><label>Zichtbaarheid</label><input class="shapeSlider" style="--pct:'+sliderPercent(alpha,0.2,3.2)+'%" type="range" id="bg_al" min="0.2" max="3.2" step="0.1" value="'+alpha+'" oninput="paintShapeSlider(this)"><span class="cv" id="bg_al_v">'+sliderValueHtml(alpha,'×')+'</span></div><div class="bgAutoHint" style="margin-top:2px">Bepaal de zichtbaarheid van de achtergrond.</div>'+
    '</div>'+
      '</div>'+
    '</details>'+
  '</div>';
}
function buildPalEd(pal){
  var cur=pal.map(function(c){return String(c).toLowerCase();});
  var gridIcon='<svg viewBox="0 0 14 14" width="11" height="11" fill="currentColor" opacity=".75"><rect x="1.5" y="1.5" width="3" height="3" rx=".8"/><rect x="5.5" y="1.5" width="3" height="3" rx=".8"/><rect x="9.5" y="1.5" width="3" height="3" rx=".8"/><rect x="1.5" y="5.5" width="3" height="3" rx=".8"/><rect x="5.5" y="5.5" width="3" height="3" rx=".8"/><rect x="9.5" y="5.5" width="3" height="3" rx=".8"/><rect x="1.5" y="9.5" width="3" height="3" rx=".8"/><rect x="5.5" y="9.5" width="3" height="3" rx=".8"/><rect x="9.5" y="9.5" width="3" height="3" rx=".8"/></svg>';
  var trashIcon='<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12h10l1-12"/><path d="M9 7V4h6v3"/></svg>';
  var swBtn=function(p){
    var hex=String(p.a||'').toLowerCase();
    var isLight=hex==='#ffffff'||hex==='ffffff';
    return '<button class="brandSw'+(isLight?' brandSwLight':'')+'" type="button" data-action="addp" data-hex="'+esc(p.a)+'" title="'+esc(p.n)+'" style="background:'+esc(p.a)+'"></button>';
  };
  var isExpanded=!!STYLE_PAL_EXPANDED['bgpal'];
  var bgQuick=BRAND_FAM_BG[0];
  var selIdx=Math.max(0,Math.min((pal.length?pal.length-1:0),parseInt(BG_ACTIVE_PAL_INDEX,10)||0));
  BG_ACTIVE_PAL_INDEX=selIdx;
  var currentHex=normalizeHexInput(pal[selIdx])||'#ffffff';
  var html='<div class="shapeActiveWrap bgPalActiveWrap"><div class="shapeActiveLabel">Actieve kleuren</div><div class="shapeLayerBar bgPalActiveRow">';
  pal.forEach(function(c,i){
    var hex=String(c||'').toLowerCase();
    var isLight=hex==='#ffffff'||hex==='ffffff';
    html+='<button class="brandSw'+(isLight?' brandSwLight':'')+(i===selIdx?' sel':'')+'" type="button" data-action="selp" data-i="'+i+'" data-hex="'+esc(c)+'" title="Kleur selecteren" style="background:'+esc(c)+'"></button>';
  });
  if(pal.length)html+='<button class="shapeLayerDelete bgPalDelete" type="button" title="Geselecteerde kleur verwijderen" aria-label="Geselecteerde kleur verwijderen" data-action="delp">'+trashIcon+'</button>';
  html+='</div></div>';
  html+='<div class="brandCompact" style="margin-top:10px">';
  html+='<div class="sLbl" style="margin:0 0 4px">Voeg toe</div>';
  html+='<div class="brandQSection">';
  var bgExtQuick=bgQuick.slice();
  (function(){var ext=BRAND_FAMILIES;for(var _qi=0;_qi<ext.length&&bgExtQuick.length<24;_qi+=2){var _fc=ext[_qi];if(_fc&&!bgExtQuick.some(function(q){return q.a===_fc.base;}))bgExtQuick.push({n:_fc.n,a:_fc.base});}})();
  html+='<div class="brandQuickRow">';
  html+='<div class="brandSwsGroup">'+bgExtQuick.map(swBtn).join('')+'</div>';
  html+='<div class="brandQuickActions">';
  html+='<button class="brandExpandBtn'+(isExpanded?' on':'')+'" type="button" data-action="expandpicker" data-target="bgpal" title="'+(isExpanded?'Minder':'Meer kleuren')+'">'+gridIcon+'</button>';
  html+='<span class="brandQSep"></span>';
  html+='<label class="brandCurrentSw" style="background:'+esc(currentHex)+'" title="Eigen kleur kiezen">'+
    '<input type="color" value="'+esc(currentHex)+'" oninput="applyBgPaletteColor(this.value);this.parentElement.style.background=this.value">'+
  '</label>';
  html+='</div></div></div>';
  if(isExpanded){
    html+='<div class="brandExpandedWrap">';
    var extraRows=BRAND_FAM_BG.slice(1);
    var wFams=[];
    for(var ci=0;ci<Math.floor(extraRows.length/3);ci++){
      var cr0=extraRows[ci*3]||[],cr1=extraRows[ci*3+1]||[],cr2=extraRows[ci*3+2]||[];
      for(var fi=0;fi<cr0.length;fi++){
        var pL=cr0[fi],pB=cr1[fi]||cr0[fi],pD=cr2[fi]||cr0[fi];
        if(!pL)continue;
        wFams.push([pL,pB,pD]);
      }
    }
    var wLabels=['Rustig & fris','Warm & zacht','Neutraal & donker'];
    html+='<div class="brandWordBlocks">';
    [0,14,28].forEach(function(start,bi){
      var grp=wFams.slice(start,start+14);
      if(!grp.length)return;
      html+='<div class="brandWordSection"><div class="brandWordLabel">'+wLabels[bi]+'</div><div class="brandWordBlock">';
      grp.forEach(function(fam){fam.forEach(function(p){html+=swBtn(p);});});
      html+='</div></div>';
    });
    html+='</div></div>';
  }
  html+='</div>';
  return html;
}
function wireBgCtrls(){
  function wire(id,field,fmt){var el2=g(id);if(!el2)return;el2.oninput=function(){var v=parseFloat(this.value);if(isNaN(v))return;if(fmt==='int')v=Math.round(v);var vEl=g(id+'_v');if(vEl)vEl.innerHTML=fmt==='int'?sliderValueHtml(v,''):(fmt==='pct'?sliderValueHtml(Math.round(v*100),'%'):sliderValueHtml(v,'×'));bgCfg()[field]=v;markDirty();scheduleBg();};}
  wire('bg_n','blobCount','int');wire('bg_sz','sizeScale','x');wire('bg_al','alphaBoost','x');wire('bg_irr','blobIrregularity','pct');
  var at=g('bg_at');if(at)at.onchange=function(){bgCfg().autoTint=this.checked;markDirty();scheduleBg();};
  var auto=g('bg_auto');if(auto)auto.onchange=function(){bgCfg().autoMode=this.checked;markDirty();buildStijlPreserveBg(g('pw'));};
}
function scheduleBg(){clearTimeout(bgTimer);bgTimer=setTimeout(renderBgPreview,90);}
function deriveAutoBgSettings(){
  var bg=bgCfg();
  var accent=(S.d.meta.cssVars||{})['--pk-set-accent']||'#CFE6DF';
  var themeKeys=((S.d.meta||{}).themes||[]).map(function(th){return th&&th.key;}).filter(Boolean);
  var shapeKeys=Object.keys(cardShapeStore()).filter(function(key){
    return getCardShapeLayers(key).length>0;
  });
  themeKeys=themeKeys.concat(shapeKeys.filter(function(key){return themeKeys.indexOf(key)<0;}));
  if(!themeKeys.length&&getCardShapeLayers('algemeen').length)themeKeys=['algemeen'];
  var paletteCount={};
  var shapeCount={};
  function bump(map,key){
    if(!key)return;
    map[key]=(map[key]||0)+1;
  }
  themeKeys.forEach(function(key){
    var layers=(typeof getCardShapeLayers==='function'?getCardShapeLayers(key):[])||[];
    layers.forEach(function(layer){
      var fill=normalizeHexInput(layer&&layer.fill);
      var stroke=normalizeHexInput(layer&&layer.stroke);
      if(fill)bump(paletteCount,fill);
      if(stroke&&String(layer.stroke||'').toLowerCase()!=='transparent')bump(paletteCount,stroke);
      if(layer&&layer.type)bump(shapeCount,layer.type);
    });
  });
  var palette=Object.keys(paletteCount).sort(function(a,b){return paletteCount[b]-paletteCount[a];}).slice(0,6);
  var shapes=Object.keys(shapeCount).sort(function(a,b){return shapeCount[b]-shapeCount[a];}).slice(0,4);
  if(!palette.length)palette=DEFAULT_INDEX_BG_PALETTE.slice();
  if(!shapes.length)shapes=['organic'];
  return {
    palette:palette,
    shapes:shapes,
    count:typeof bg.blobCount==='number'?Math.max(2,Math.min(22,Math.round(bg.blobCount))):7,
    alphaBoost:typeof bg.alphaBoost==='number'?Math.max(0.4,Math.min(3.2,bg.alphaBoost)):1.05,
    sizeScale:typeof bg.sizeScale==='number'?Math.max(0.3,Math.min(2.4,bg.sizeScale)):0.85,
    irregularity:typeof bg.blobIrregularity==='number'?Math.max(0.05,Math.min(0.65,bg.blobIrregularity)):0.35,
    seedKey:themeKeys.join('|')+'__'+palette.join('|')+'__'+shapes.join('|')
  };
}

// Canvas BG preview follows the actual preview window ratio.
function renderBgPreview(){
  requestAnimationFrame(function(){
    var canvas=g('bgCanvas');if(!canvas)return;
    var wrap=g('bgWrap');if(!wrap)return;
    var rect=wrap.getBoundingClientRect();
    var W2=Math.round(rect.width)||wrap.offsetWidth||300;
    var H2=Math.round(rect.height)||wrap.offsetHeight||Math.round(W2*(10/16));
    if(W2<20||H2<20){setTimeout(renderBgPreview,100);return;}
    canvas.width=W2*2;canvas.height=H2*2;canvas.style.width=W2+'px';canvas.style.height=H2+'px';
    var ctx=canvas.getContext('2d');if(!ctx)return;var W=W2*2,H=H2*2;
    var bg=bgCfg(),accent=(S.d.meta.cssVars||{})['--pk-set-accent']||'#CFE6DF';
    var isNight=previewNightMode()||adminNightMode();
    var autoSettings=bg.autoMode!==false?deriveAutoBgSettings():null;
    var pal=autoSettings?autoSettings.palette:(Array.isArray(bg.palette)&&bg.palette.length?bg.palette:[accent]);
    var darkPalette=(Array.isArray(bg.darkPalette)&&bg.darkPalette.length?bg.darkPalette:['#67C5BB','#74CEC4','#7FD1C8','#8AD8D0','#93DCD4']);
    var count=Math.max(1,Math.round(autoSettings?autoSettings.count:(typeof bg.blobCount==='number'?bg.blobCount:6)));
    var alphaBoost=autoSettings?autoSettings.alphaBoost:(typeof bg.alphaBoost==='number'?bg.alphaBoost:1);
    var darkAlphaBoost=(typeof bg.darkAlphaBoost==='number'?bg.darkAlphaBoost:1.02);
    var sizeScale=autoSettings?autoSettings.sizeScale:(typeof bg.sizeScale==='number'?bg.sizeScale:1);
    var darkSizeScale=(typeof bg.darkSizeScale==='number'?bg.darkSizeScale:1.0);
    var darkMix=(typeof bg.darkMix==='number'?bg.darkMix:0.12);
    var irr=autoSettings?autoSettings.irregularity:(typeof bg.blobIrregularity==='number'?bg.blobIrregularity:0.35);
    var shapes=autoSettings?autoSettings.shapes:selectedBgShapes(bg);
    var useGrid=shapes.indexOf('grid')>=0;
    var drawShapes=shapes.filter(function(s){return s!=='grid';});
    if(!drawShapes.length)drawShapes=['organic'];
    ctx.fillStyle=isNight?'#1b1840':'#F8FAFA';ctx.fillRect(0,0,W,H);
    var seed=0;
    var seedSource=(autoSettings&&autoSettings.seedKey)?autoSettings.seedKey:pal.join('|')+'|'+count+'|'+shapes.join('|');
    for(var si=0;si<seedSource.length;si++)seed=((seed*31+seedSource.charCodeAt(si))|0)>>>0;
    var rnd=prng(seed+count*997);
    var pos=[];
    var posRefH=Math.round(W*1.6);
    var aspect=W/Math.max(posRefH,1);
    var phoneRef=780;var baseDim=phoneRef*(aspect>1?0.8:1);
    if(useGrid){var cols=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/cols);for(var i=0;i<count;i++){var col=i%cols,row=Math.floor(i/cols);pos.push({x:W*((col+.2+rnd()*.6)/cols*1.16-.08),y:posRefH*((row+.2+rnd()*.6)/rows*1.16-.08)});}}
    else{for(var i=0;i<count;i++)pos.push({x:(rnd()*1.1-.05)*W,y:(rnd()*1.1-.05)*posRefH});}
    var extraH=H-posRefH;
    if(extraH>40){var extraCount=Math.max(1,Math.round(count*extraH/posRefH));var rnd2=prng(seed+7919);for(var ei=0;ei<extraCount;ei++)pos.push({x:(rnd2()*1.1-.05)*W,y:posRefH+(rnd2()*.9+.05)*extraH});count+=extraCount;}
    for(var i=0;i<count;i++){
      var raw=(isNight?darkPalette:pal)[i%(isNight?darkPalette.length:pal.length)],rgb=h2r(raw),hsl=r2h(rgb[0],rgb[1],rgb[2]);
      var warm=(hsl[0]>=0&&hsl[0]<=70)||(hsl[0]>=290&&hsl[0]<=360),amt=warm?.12:.1;if(hsl[2]>.75)amt=warm?.18:.14;
      var alpha=isNight?Math.min((0.22+rnd()*.10)*darkAlphaBoost,.6):Math.min(((warm?.19:.24)+rnd()*.1)*alphaBoost,.68),radius=(baseDim*(.19+rnd()*.16))*(isNight?darkSizeScale:sizeScale);
      var shapeType=drawShapes[i%drawShapes.length]||'organic';
      ctx.globalAlpha=alpha;ctx.fillStyle=isNight?mixHexAdmin(raw,'#1b1840',darkMix):mixW(raw,amt);
      if(isNight){
        ctx.shadowColor=ctx.fillStyle;
        ctx.shadowBlur=22;
      }else{
        ctx.shadowColor='transparent';
        ctx.shadowBlur=0;
      }
      if(shapeType==='circle'){ctx.beginPath();ctx.arc(pos[i].x,pos[i].y,radius,0,Math.PI*2);ctx.closePath();ctx.fill();}
      else if(shapeType==='triangle'){triPath(ctx,pos[i].x,pos[i].y,radius,rnd);ctx.fill();}
      else if(shapeType==='diamond'){diamondPath(ctx,pos[i].x,pos[i].y,radius,rnd);ctx.fill();}
      else{blobPath(ctx,pos[i].x,pos[i].y,radius,irr,8+Math.floor(rnd()*5),rnd);ctx.fill();}
    }
    ctx.globalAlpha=1;
    ctx.shadowBlur=0;
    ctx.shadowColor='transparent';
  });
}
function prng(s){var a=s>>>0;return function(){a|=0;a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function h2r(h){h=String(h||'').replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function r2h(r,g2,b){r/=255;g2/=255;b/=255;var mx=Math.max(r,g2,b),mn=Math.min(r,g2,b),h=0,s=0,l=(mx+mn)/2;if(mx!==mn){var d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);switch(mx){case r:h=(g2-b)/d+(g2<b?6:0);break;case g2:h=(b-r)/d+2;break;case b:h=(r-g2)/d+4;break;}h*=60;}return[h,s,l];}
function mixW(hex,amt){var rgb=h2r(hex);return'rgb('+rgb.map(function(v){return Math.round(v+(255-v)*amt);}).join(',')+')';}
function blobPath(ctx,cx,cy,r,irr,pts,rnd){var step=(Math.PI*2)/pts;ctx.beginPath();for(var i=0;i<=pts;i++){var a=i*step,rr=r*(1-irr/2+rnd()*irr),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;if(i===0){ctx.moveTo(x,y);}else{var ca=a-step/2,cr=r*(1-irr/2+rnd()*irr),cpx=cx+Math.cos(ca)*cr,cpy=cy+Math.sin(ca)*cr;ctx.quadraticCurveTo(cpx,cpy,x,y);}}ctx.closePath();}
function triPath(ctx,cx,cy,r,rnd){var a=rnd()*Math.PI*2;ctx.beginPath();for(var i=0;i<3;i++){var ang=a+i*(Math.PI*2/3),x=cx+Math.cos(ang)*r,y=cy+Math.sin(ang)*r;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.closePath();}
function diamondPath(ctx,cx,cy,r,rnd){var rx=r*(0.7+rnd()*0.4),ry=r*(0.9+rnd()*0.3);ctx.beginPath();ctx.moveTo(cx,cy-ry);ctx.lineTo(cx+rx,cy);ctx.lineTo(cx,cy+ry);ctx.lineTo(cx-rx,cy);ctx.closePath();}

// ═══════════════════════════════════════════
// STEP: INSTELLINGEN
// ═══════════════════════════════════════════
function buildInst(target){
  var m=S.d.meta||{};
  var menu=m.ui&&m.ui.menu||{};
  var sheet=m.ui&&m.ui.sheet||{};
  function togHtml(id,label,checked,sub){
    return '<div class="togRow"><div><label for="'+id+'">'+esc(label)+'</label>'+(sub?'<span class="togRowSub">'+esc(sub)+'</span>':'')+'</div>'+
      '<label class="tog"><input type="checkbox" id="'+id+'"'+(checked?' checked':'')+'><span class="togSl"></span></label></div>';
  }

  var currentFmtId=getCardFormatId();
  var formatPickerHtml='<section class="instSection instSectionWide">'+
    '<div class="sLbl" style="margin-top:0">Kaartformaat</div>'+
    '<div class="instCard">'+
      fmtStripHtml(currentFmtId,'setCardFormat')+
      '<p class="fHint" style="margin-top:10px">De editor bewaart kaartbeelden centraal in <code>cards/</code>. Het gekozen formaat bepaalt de verhouding ('+esc(cardFormatDimensionsText(S.d.meta))+') en wat je in previews en cropkaders ziet.</p>'+
    '</div>'+
  '</section>';

  var backIcon='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 3 4.5 8l5 5"/><path d="M5 8h6.5"/></svg>';
  target.innerHTML='<div class="panel instPanel"><div class="instShell">'+
    '<div class="instTopbar"><div class="instIntro"><p>Bepaal welke knoppen zichtbaar zijn en hoe de kaartenviewer zich gedraagt.</p></div><button class="btnS instBackBtn" type="button" onclick="closeInstPage()">'+backIcon+'<span>Terug naar opmaak</span></button></div>'+
    '<div class="instGrid">'+formatPickerHtml+
      '<section class="instSection">'+
        '<div class="sLbl" style="margin-top:0">Menu</div>'+
        '<div class="instCard">'+
        '<div class="togGroup">'+
          togHtml('i_info','Informatieknop (ⓘ)',menu.showInfo!==false,'Opent de Infosheet')+
          togHtml('i_shuf','Shuffelknop',menu.showShuffle!==false,'Kaarten in willekeurige volgorde')+
          togHtml('i_sets','Knop "Alle sets"',menu.showAllSets!==false,'Navigeer terug naar het overzicht')+
        '</div>'+
        '</div>'+
      '</section>'+
      '<section class="instSection">'+
        '<div class="sLbl" style="margin-top:0">Infosheet</div>'+
        '<div class="instCard">'+
        '<div class="togGroup">'+
          togHtml('i_sfirst','Tonen bij eerste bezoek',sheet.showOnFirst!==false,'Infosheet opent automatisch bij het eerste bezoek')+
        '</div>'+
        '</div>'+
      '</section>'+
      '<section class="instSection instSectionWide">'+
        '<div class="sLbl" style="margin-top:0">Viewer-opties</div>'+
        '<div class="instCard">'+
        '<div class="togGroup">'+
          togHtml('i_anim','Flip-animatie',m.flipAnim!==false,'Kaart draait om bij klikken')+
          togHtml('i_flip','Achterkant actief',m.doubleSided!==false,'Kaart heeft een achterkant')+
        '</div>'+
        '</div>'+
      '</section>'+
    '</div>'+
  '</div></div>';
  // Wire toggles
  [['i_info','ui.menu.showInfo'],['i_shuf','ui.menu.showShuffle'],['i_sets','ui.menu.showAllSets'],['i_sfirst','ui.sheet.showOnFirst'],['i_anim','flipAnim'],['i_flip','doubleSided']].forEach(function(pair){
    var el2=g(pair[0]);if(!el2)return;
    el2.onchange=function(){
      var parts=pair[1].split('.');var obj=S.d.meta;
      for(var i=0;i<parts.length-1;i++){obj[parts[i]]=obj[parts[i]]||{};obj=obj[parts[i]];}
      obj[parts[parts.length-1]]=this.checked;markDirty();
    };
  });
}

// ═══════════════════════════════════════════
// SAVE
// ═══════════════════════════════════════════
function refreshSetShas(id,d){
  return Promise.all([
    api('/contents/sets/'+id+'/meta.json').then(function(r){d.metaSha=r.sha;}).catch(function(){}),
    api('/contents/sets/'+id+'/questions.json').then(function(r){d.questionsSha=r.sha;}).catch(function(){}),
    api('/contents/sets/'+id+'/uitleg.json').then(function(r){d.uitlegSha=r.sha;}).catch(function(){}),
    api('/contents/sets/'+id+'/intro.json').then(function(r){d.introSha=r.sha;}).catch(function(){})
  ]);
}
function refreshSingleSha(path,applySha){
  return api('/contents/'+path).then(function(r){
    if(typeof applySha==='function')applySha(r.sha||null);
  });
}
function isShaConflictError(err){
  var msg=String((err&&err.message)||'');
  return msg.indexOf('is at ')>=0 ||
    msg.indexOf('does not match')>=0 ||
    msg.indexOf('sha')>=0 && msg.indexOf('match')>=0;
}
function revertSetChanges(){
  if(!S.activeId||!SC[S.activeId])return;
  S.d=cloneSetBundle(SC[S.activeId]);
  resetHistory(S.d);
  syncDirtyFromSnapshot();
  lsDel('pk_draft_'+S.activeId);
  setCoverTextActiveState(0);
  renderSidebar();
  renderEditor();
  toast('Wijzigingen teruggezet','amber');
}
function saveSet(cb){
  collectCurrent();
  var saveLabel=(S.clTab==='opmaken'&&S.opmPane==='kaart')?'Kaart opslaan':'Opslaan';
  var btn=g('saveBtn');if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span> '+saveLabel+'…';}
  var id=S.activeId,d=S.d,msg='Update set: '+id;
  var steps=[
    {path:'sets/'+id+'/meta.json',getData:function(){return d.meta;},getSha:function(){return d.metaSha;},setSha:function(sha){d.metaSha=sha;}},
    {path:'sets/'+id+'/questions.json',getData:function(){return d.questions;},getSha:function(){return d.questionsSha;},setSha:function(sha){d.questionsSha=sha;}},
    {path:'sets/'+id+'/uitleg.json',getData:function(){return d.uitleg;},getSha:function(){return d.uitlegSha;},setSha:function(sha){d.uitlegSha=sha;}},
    {path:'sets/'+id+'/intro.json',getData:function(){return d.intro;},getSha:function(){return d.introSha;},setSha:function(sha){d.introSha=sha;}}
  ];
  function saveOne(step,retried){
    return saveFile(step.path,step.getData(),step.getSha(),msg).then(function(r){
      step.setSha(((r||{}).content||{}).sha||step.getSha());
    }).catch(function(e){
      if(!retried&&isShaConflictError(e)){
        return refreshSingleSha(step.path,step.setSha).then(function(){
          return saveOne(step,true);
        });
      }
      throw e;
    });
  }
  function doSave(){
    return steps.reduce(function(chain,step){
      return chain.then(function(){return saveOne(step,false);});
    },Promise.resolve()).then(function(){
      return saveIndex(msg).catch(function(e){
        if(isShaConflictError(e)){
          return refreshIndexSha().then(function(){return saveIndex(msg);});
        }
        throw e;
      });
    }).then(function(){
      cacheSetBundle(id,cloneSetBundle(d));
      resetHistory(S.d);
      syncDirtyFromSnapshot();
      lsDel('pk_draft_'+id);
      if(btn){btn.disabled=false;btn.innerHTML=saveLabel;}
      renderSidebar();refreshChecklistChrome();toast('Opgeslagen ✓','green');if(typeof cb==='function')cb();
    }).catch(function(e){
      if(btn){btn.disabled=false;btn.innerHTML=saveLabel;}
      toast('Fout: '+e.message,'red');
    });
  }
  Promise.all([refreshSetShas(id,d),refreshIndexSha()]).then(function(){
    return doSave();
  }).catch(function(e){
    if(btn){btn.disabled=false;btn.innerHTML=saveLabel;}
    toast('Fout: '+e.message,'red');
  });
}

// ═══════════════════════════════════════════
// NEW / DUPLICATE / DELETE
// ═══════════════════════════════════════════
function showNewSetModal(){
  var _setNames=['bijv. Diep Luisteren','bijv. Eerlijk Vertellen','bijv. Moeilijke Gesprekken','bijv. Goed Nadenken','bijv. Vriendelijk Botsen','bijv. Rustig Reflecteren','bijv. Helder Kijken','bijv. Nieuwsgierig Zijn','bijv. Dapper Delen','bijv. Stil Staan','bijv. Vertrouwen Opbouwen','bijv. Grenzen Verkennen','bijv. Loslaten en Leren','bijv. Iets Nieuws Wagen','bijv. Patronen Doorbreken','bijv. Beter Begrijpen','bijv. Keuzes Maken','bijv. Wat Speelt Er','bijv. Terugkijken en Vooruitkijken','bijv. De Essentie Raken','bijv. Voelen wat Telt','bijv. Ongemak Omarmen','bijv. Buiten de Lijntjes','bijv. De Volgende Stap'];
  var _ph=_setNames[Math.floor(Math.random()*_setNames.length)];
  showModal('<h3>Nieuwe kaartenset</h3>'+
    '<div class="field"><label>Setnaam</label><input id="ns_title" type="text" placeholder="'+_ph+'" class="fIn" autofocus></div>'+
    '<div class="field"><label>Kaartformaat</label>'+
      fmtStripHtml(DEFAULT_CARD_FORMAT,'pickNewFmt')+
      '<input type="hidden" id="ns_fmt" value="'+DEFAULT_CARD_FORMAT+'">'+
      '<div class="fHint" style="margin-top:8px">Nieuwe sets gebruiken één centrale kaartbron in <code>cards/</code>. Het formaat bepaalt de verhouding in de editor en viewer, zonder extra variantmappen.</div>'+
    '</div>'+
    '<div class="mAct"><button class="mCa" onclick="closeModal()">Annuleren</button><button class="mOk" onclick="createSet()">Aanmaken</button></div>',
    'newSetModal');
  setTimeout(function(){var n=g('ns_title');if(n)n.focus();},50);
}
function createSet(){
  var title=(g('ns_title').value||'').trim();
  if(!title){toast('Vul een naam in','red');return;}
  var fmtEl=g('ns_fmt');
  var fmtId=(fmtEl&&fmtEl.value)||DEFAULT_CARD_FORMAT;
  var id=title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');
  if(!id)id='set-'+Date.now();
  // ensure unique
  var base=id,n=2;while(S.sets.find(function(s){return s.id===id;}))id=base+'-'+n++;
  clearSetClientState(id);
  closeModal();S.sets.push({id:id,title:title});
  var meta=mkMeta(id,title);
  if(fmtId!==DEFAULT_CARD_FORMAT)meta.cardFormat=fmtId;
  S.d={meta:meta,questions:{},uitleg:{cover:''},intro:{slides:[{key:'cover',title:title,body:'',img:'cards/voorkant.svg',alt:title}],hint:'← → swipe'}};
  cacheSetBundle(id,cloneSetBundle({meta:S.d.meta,metaSha:null,questions:S.d.questions,questionsSha:null,uitleg:S.d.uitleg,uitlegSha:null,intro:S.d.intro,introSha:null}));
  applyCardFormat();
  S.activeId=id;resetHistory(S.d);S.dirty=true;updateDirtyUi();renderSidebar();showModeChoice();
}
function dupSet(){
  var src=S.activeId;
  var srcTitle=(S.sets.find(function(s){return s.id===src;})||{}).title||src;
  showModal('<h3>Set dupliceren</h3><p>Kopie van <strong>'+esc(srcTitle)+'</strong></p>'+
    '<div class="field"><label>Nieuwe naam</label><input id="du_nm" type="text" placeholder="Kopie van '+esc(srcTitle)+'" class="fIn" autofocus></div>'+
    '<div class="mAct"><button class="mCa" onclick="closeModal()">Annuleren</button><button class="mOk" onclick="execDup()">Dupliceren</button></div>');
}
function execDup(){
  var title=(g('du_nm').value||'').trim();if(!title){toast('Geef een naam in','red');return;}
  var base=title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'')||'kopie';
  var id=base,n=2;while(S.sets.find(function(s){return s.id===id;})){id=base+'-'+n++;}
  closeModal();S.sets.push({id:id,title:title});
  var data=JSON.parse(JSON.stringify(S.d));data.meta.id=id;data.meta.title=title;
  cacheSetBundle(id,cloneSetBundle({meta:data.meta,metaSha:null,questions:data.questions,questionsSha:null,uitleg:data.uitleg,uitlegSha:null,intro:data.intro,introSha:null}));
  S.d=data;S.activeId=id;resetHistory(S.d);S.dirty=true;updateDirtyUi();renderSidebar();renderEditor();toast('Gedupliceerd — sla op om te bevestigen','amber');
}
function mkMeta(id,title){return{id:id,title:title||id,cover:'voorkant.svg',viewerTemplate:'classic',flipAnim:true,doubleSided:true,backMode:'mirror',cssVars:{'--pk-set-accent':'#CFE6DF','--pk-set-bg':DEFAULT_CARD_SURFACE,'--pk-set-card':DEFAULT_CARD_SURFACE},ui:{menu:{showInfo:true,showShuffle:true,showAllSets:true},sheet:{enabled:true,defaultMode:'cards'},index:{layout:'hero-grid',background:{palette:['#CFE6D8','#CAD6EF','#E7E1F5','#F8E4D2','#A8D8D6','#F4E2A5','#F2C8D2']}},assetFlow:{mode:'single-source',folder:'cards'},themeCss:'theme.css'},themes:[],infoPages:[]};}
function deleteCardFile(path,sid){
  if(!confirm('Bestand verwijderen?\n'+path.split('/').pop()))return;
  var setPrefix='sets/'+S.activeId+'/';
  if(path.indexOf(setPrefix)!==0){toast('Alleen bestanden uit deze kaartenset kunnen hier verwijderd worden','red');return;}
  var paths=cardAssetSiblingPaths(path).filter(function(p,i,arr){return arr.indexOf(p)===i;});
  Promise.all(paths.map(function(p){
    return deleteGhFile(p,'Remove card: '+p).catch(function(err){
      if(err&&String(err.message||'').indexOf('404')>=0)return null;
      throw err;
    });
  })).then(function(){
    paths.forEach(function(p){
      if(CC[p]){delete CC[p].cropSource;delete CC[p].cropState;}
      delete CC[p];
      clearFolderCache(p);
    });
    refreshLibGrid(S.activeId);
    refreshAdminPanel();
    setTimeout(loadCardPreviews,50);
    toast('Verwijderd','green');
  }).catch(function(e){toast('Fout: '+e.message,'red');});
}
function removeLibraryFile(path){
  if(!confirm('Bestand verwijderen?\n'+path.split('/').pop()))return;
  var setPrefix='sets/'+S.activeId+'/';
  if(path.indexOf(setPrefix)!==0){toast('Alleen bestanden uit deze kaartenset kunnen hier verwijderd worden','red');return;}
  var paths=cardAssetSiblingPaths(path).filter(function(p,i,arr){return arr.indexOf(p)===i;});
  Promise.all(paths.map(function(p){
    return deleteGhFile(p,'Remove: '+p).catch(function(err){
      if(err&&String(err.message||'').indexOf('404')>=0)return null;
      throw err;
    });
  })).then(function(){
    paths.forEach(function(p){
      if(CC[p]){delete CC[p].cropSource;delete CC[p].cropState;}
      delete CC[p];
      clearFolderCache(p);
    });
    refreshLibGrid(S.activeId);
    refreshAdminPanel();
    setTimeout(loadCardPreviews,50);
    toast('Verwijderd','green');
  }).catch(function(e){toast('Fout bij verwijderen: '+e.message,'red');});
}
function deleteGhFolder(folderPath){  return api('/contents/'+folderPath).then(function(items){
    if(!Array.isArray(items))return;
    return Promise.all(items.map(function(item){
      if(item.type==='dir')return deleteGhFolder(item.path);
      return api('/contents/'+item.path,'DELETE',{message:'Remove: '+item.path,sha:item.sha}).catch(function(){});
    }));
  }).catch(function(){});
}
function doDelete(){showModal('<h3>Set verwijderen?</h3><p>Verwijdert <strong>'+esc(S.d&&S.d.meta&&S.d.meta.title||S.activeId)+'</strong> en alle bijbehorende data permanent.</p><div class="mAct"><button class="mCa" onclick="closeModal()">Annuleren</button><button class="mDng" onclick="execDel()">Verwijderen</button></div>');}
function execDel(){
  closeModal();var id=S.activeId;
  S.sets=S.sets.filter(function(s){return s.id!==id;});
  clearSetClientState(id);
  if(S.indexData.default===id&&S.sets.length)S.indexData.default=S.sets[0].id;
  saveIndex('Remove: '+id).then(function(){
    S.activeId=null;S.dirty=false;
    renderSidebar();
    g('mc').innerHTML='<div class="welcome"><h2>Set verwijderd</h2><p>Bestanden worden verwijderd…</p></div>';
    // Now delete all files from GitHub
    return deleteGhFolder('sets/'+id);
  }).then(function(){
    var w=document.querySelector('.welcome p');if(w)w.textContent='Set en alle bestanden verwijderd.';
    toast('Verwijderd','green');
  }).catch(function(e){toast('Fout: '+e.message,'red');});
}

// ═══════════════════════════════════════════
// SHORTCUTS
// ═══════════════════════════════════════════
function showShortcuts(){
  showModal('<h3>Sneltoetsen</h3><table style="width:100%;border-collapse:collapse;font-size:12.5px">'+
    [['⌘S / Ctrl+S','Opslaan'],['Esc','Modal sluiten']].map(function(r){return'<tr><td style="padding:5px 8px 5px 0;font-family:monospace;font-size:11.5px;color:var(--k3)">'+r[0]+'</td><td>'+r[1]+'</td></tr>';}).join('')+
  '</table><div class="mAct"><button class="mCa" onclick="closeModal()">Sluiten</button></div>');
}

// ═══════════════════════════════════════════
// EVENT DELEGATION
// ═══════════════════════════════════════════
document.addEventListener('click',function(ev){
  if(!ev.target.closest('.textToolbarMenu')){
    document.querySelectorAll('.textToolbarMenu[open]').forEach(function(menu){menu.open=false;});
  }
  var el2=ev.target.closest('[data-action]');
  if(el2){
    var a=el2.dataset.action;
    if(a!=='toggleTileMenu'&&a!=='noop')closeTileMenus();
    if(a==='fmt'){applyTextFormat(el2.dataset.target,el2.dataset.fmt);return;}
    if(a==='noop'){ev.stopPropagation();return;}
    if(a==='toggleTileMenu'){
      ev.stopPropagation();
      var tileMenu=el2.closest('.cTile');
      if(!tileMenu)return;
      var open=!tileMenu.classList.contains('menuopen');
      closeTileMenus(tileMenu);
      tileMenu.classList.toggle('menuopen',open);
      return;
    }
    if(a==='picktile'){
      ev.stopPropagation();
      var pickTile=el2.closest('.cTile');
      if(pickTile)pickTile.classList.remove('menuopen');
      openTilePicker(pickTile);
      return;
    }
    if(a==='delfile'){ev.stopPropagation();deleteCardFile(el2.dataset.path,el2.dataset.sid);return;}
    if(a==='dellib'){ev.stopPropagation();
      removeLibraryFile(el2.dataset.path);
      return;
    }
    if(a==='recrop'){
      ev.stopPropagation();
      var rp=el2.dataset.path,rs=el2.dataset.sid,ca=CC[rp];
      if(ca&&ca.dataUrl)showCropModal(ca.cropSource||ca.dataUrl,rp,rs,false,{sourceDataUrl:ca.cropSource||ca.dataUrl,cropState:ca.cropState||null,name:rp.split('/').pop(),folderName:'cards'});
      return;
    }
    if(a==='lcard'){ev.stopPropagation();linkCard(parseInt(el2.dataset.ti,10),el2.dataset.folder,el2.dataset.file);return;}
    if(a==='addq'){addQ(el2.dataset.key);return;}
    if(a==='delq'){delQ(el2.dataset.key,parseInt(el2.dataset.qi,10));return;}
    if(a==='delth'){delTh(parseInt(el2.dataset.i,10));return;}
    if(a==='delsl'){delSl(parseInt(el2.dataset.i,10));return;}
    if(a==='bulk'){showBulkImport(el2.dataset.key);return;}
    if(a==='setl'){var m=S.d.meta;m.ui=m.ui||{};m.ui.index=m.ui.index||{};m.ui.index.layout=el2.dataset.id;markDirty();buildStijlPreserveBg(g('pw'));return;}
    if(a==='setv'){S.d.meta.viewerTemplate=el2.dataset.id;markDirty();buildStijlPreserveBg(g('pw'));return;}
    if(a==='expandpicker'){
      var tgt0=el2.dataset.target;
      STYLE_PAL_EXPANDED[tgt0]=!STYLE_PAL_EXPANDED[tgt0];
      var shk0=el2.dataset.shapeKey;
      if(shk0){
        refreshShapeEditors(shk0);
      } else if(tgt0==='settc'||tgt0==='settb'){
        // Targeted update: only rebuild popup content, no full panel rebuild = no flicker
        var menuEl0=el2.closest('.textToolbarMenu');
        var popEl0=menuEl0&&menuEl0.querySelector('.textToolbarMenuPop');
        if(popEl0){
          var m0=S.d.meta||{};
          var pk0=activeStyleEditKey();
          var acb0=pk0==='cover'?((coverTextStore()||[])[currentCoverTextIdx()]||null):null;
          if(tgt0==='settc'){
            var tcHex0=pk0==='cover'&&acb0?(acb0.color||'#1a1a2e'):((m0.cssVars||{})['--pk-set-text']||'#1a1a2e');
            var tcMeta0=stylePaletteMeta('settc');
            popEl0.innerHTML=brandPaletteHtml('settc',tcHex0,[tcMeta0.quick.slice(0,8)].concat(BRAND_FAM_BG.slice(1)));
          } else {
            var tbHex0=pk0==='cover'&&acb0?(acb0.bg||''):((m0.cssVars||{})['--pk-text-bg-color']||'');
            var tbNoSw0='<button class="brandSw brandNoColorSw'+(tbHex0?'':' sel')+'" type="button" title="Geen vlak" onclick="setTextBgMode(\'\')"><svg viewBox="0 0 18 18" width="18" height="18"><line x1="3" y1="15" x2="15" y2="3" stroke="#d05050" stroke-width="1.5" stroke-linecap="round"/></svg></button>';
            popEl0.innerHTML=brandPaletteHtml('settb',tbHex0||'',BRAND_FAM_BG,{prefixHtml:tbNoSw0});
          }
        } else {
          buildStijlPreserveBg(g('pw'));
        }
      } else {
        buildStijlPreserveBg(g('pw'));
      }
      return;
    }
    if(a==='setkleurtab'){STIJL_KLEUR_TAB=el2.dataset.target;buildStijlPreserveBg(g('pw'));return;}
    if(a==='setc'){var hexA=el2.dataset.hex||((FULL_PAL[parseInt(el2.dataset.i,10)]||{}).a);if(hexA){setCV('--pk-set-accent',hexA);markDirty();syncBgPalette(hexA);scheduleBg();updateStijlPreview();}return;}
    if(a==='settc'){applyStyleColor('settc',el2.dataset.hex||((FULL_PAL[parseInt(el2.dataset.i,10)]||{}).a));return;}
    if(a==='settb'){applyStyleColor('settb',el2.dataset.hex||((FULL_PAL[parseInt(el2.dataset.i,10)]||{}).a));return;}
    if(a==='setcbg'){applyStyleColor('setcbg',el2.dataset.hex||((FULL_PAL[parseInt(el2.dataset.i,10)]||{}).a));return;}
    if(a==='setfs'){setFontSizeLive(el2.dataset.v);return;}
    if(a==='spread'){bgCfg().blobSpread=el2.dataset.v;markDirty();g('pw').querySelectorAll('.shPill').forEach(function(b){b.classList.toggle('sel',b.dataset.v===el2.dataset.v);});scheduleBg();return;}
    if(a==='bgshape'){
      var bcsh=bgCfg(),shape=el2.dataset.v;
      bcsh.blobShapes=selectedBgShapes(bcsh).slice();
      var idxsh=bcsh.blobShapes.indexOf(shape);
      if(idxsh>=0&&bcsh.blobShapes.length>1)bcsh.blobShapes.splice(idxsh,1);
      else if(idxsh<0)bcsh.blobShapes.push(shape);
      bcsh.blobSpread=bcsh.blobShapes[0]||'organic';
      markDirty();
      buildStijlPreserveBg(g('pw'));
      scheduleBg();
      return;
    }
    if(a==='addp'){var bc=bgCfg(),hexP=el2.dataset.hex||((STYLE_ACCENT_PAL[0]||{}).a)||'#7FCFC9';bc.palette=Array.isArray(bc.palette)?bc.palette:[(S.d.meta.cssVars||{})['--pk-set-accent']||'#CFE6DF'];if(bc.palette.indexOf(hexP)===-1){bc.palette.push(hexP);BG_ACTIVE_PAL_INDEX=bc.palette.length-1;markDirty();var pw2=g('bg_pal');if(pw2)pw2.innerHTML=buildPalEd(bc.palette);scheduleBg();}return;}
    if(a==='selp'){BG_ACTIVE_PAL_INDEX=Math.max(0,parseInt(el2.dataset.i,10)||0);var pwSel=g('bg_pal');if(pwSel)pwSel.innerHTML=buildPalEd((bgCfg().palette)||[]);return;}
    if(a==='delp'){var bc2=bgCfg();if(Array.isArray(bc2.palette)&&bc2.palette.length){var idxP=Math.max(0,Math.min(bc2.palette.length-1,parseInt(BG_ACTIVE_PAL_INDEX,10)||0));bc2.palette.splice(idxP,1);BG_ACTIVE_PAL_INDEX=Math.max(0,Math.min(bc2.palette.length-1,idxP));markDirty();var pw3=g('bg_pal');if(pw3)pw3.innerHTML=buildPalEd(bc2.palette);scheduleBg();}return;}
    if(a==='radio'){
      var name=el2.dataset.name,val=el2.dataset.v;
      if(name==='sheetMode'){S.d.meta.ui=S.d.meta.ui||{};S.d.meta.ui.sheet=S.d.meta.ui.sheet||{};S.d.meta.ui.sheet.defaultMode=val;markDirty();}
      var rg=el2.closest('.radioGroup');if(rg)rg.querySelectorAll('.radioOpt').forEach(function(o){o.classList.toggle('sel',o.dataset.v===val);});
      return;
    }
    if(a==='setIntroMode'){
      S.d.intro=S.d.intro||{slides:[],hint:'← → swipe'};
      var nextMode=el2.dataset.v;
      if(nextMode==='slides'){
        ensureIntroSlides();
        if(S.d.intro.mode==='themes'&&(!S.d.intro.slides||S.d.intro.slides.length<=1)){
          var themes0=S.d.meta.themes||[];
          var keys0=Array.isArray(S.d.intro.activeThemes)&&S.d.intro.activeThemes.length?S.d.intro.activeThemes:themes0.map(function(t){return t.key;});
          themes0.forEach(function(th){
            if(keys0.indexOf(th.key)===-1)return;
            if(S.d.intro.slides.some(function(sl){return sl&&sl.key===th.key;}))return;
            S.d.intro.slides.push({key:th.key,title:th.label||th.key,body:(S.d.uitleg&&S.d.uitleg[th.key])||'',img:'cards/'+(th.card||th.key+'.svg'),alt:th.label||th.key});
          });
        }
      }else if(nextMode==='single'){
        ensureIntroSlides();
      }
      S.d.intro.mode=nextMode;markDirty();
      rebuildWelkomst();return;
    }
    if(a==='toggleTheme'){
      S.d.intro=S.d.intro||{slides:[],hint:'← →'};
      var keys=S.d.intro.activeThemes||(S.d.meta.themes||[]).map(function(t){return t.key;});
      S.d.intro.activeThemes=keys;
      var idx=keys.indexOf(el2.dataset.key);
      if(idx>=0)keys.splice(idx,1);else keys.push(el2.dataset.key);
      markDirty();rebuildWelkomst();return;
    }
  }
  closeTileMenus();
  var toolbar=getFloatingTextBar();
  if(toolbar&&toolbar.contains(ev.target)) return;
  var textTarget=ev.target.closest&&ev.target.closest('textarea.richTa, textarea.bulkArea');
  if(textTarget){
    showFloatingTextBar(textTarget);
    return;
  }
  hideFloatingTextBar(true);
  // Tile click → open assign popup
  var tile=ev.target.closest('.cTile');
  if(tile&&!ev.target.closest('button')&&!ev.target.closest('input')){
    setActiveTargetPath(tile.dataset.path||'');
    if(tile.dataset.modeKey&&cardBuildModeForKey(S.d.meta,tile.dataset.modeKey)==='self'&&!SELECTED_LIB_PATH)return;
    if(SELECTED_LIB_PATH){assignLibraryPathToTile(tile,SELECTED_LIB_PATH);return;}
    openTilePicker(tile);
  }
});
document.addEventListener('toggle',function(ev){
  var menu=ev.target;
  if(!menu||!menu.classList||!menu.classList.contains('textToolbarMenu')||!menu.open)return;
  document.querySelectorAll('.textToolbarMenu[open]').forEach(function(other){
    if(other!==menu)other.open=false;
  });
},true);
// ─── RichCe global tracking ───────────────────────────────────────────────
document.addEventListener('focusin',function(e){
  if(e.target&&e.target.classList&&e.target.classList.contains('richCe')){
    activateRichCe(e.target);
  }else if(RT.richCeTarget&&e.target&&e.target.closest&&e.target.closest('.stijlCanvasTopTools,.stijlCanvasToolbar')){
    if(RT.ceBlurTimer){clearTimeout(RT.ceBlurTimer);RT.ceBlurTimer=null;}
  }
},true);
document.addEventListener('focusout',function(e){
  if(e.target&&e.target.classList&&e.target.classList.contains('richCe')){deactivateRichCe();}
},true);
document.addEventListener('selectionchange',function(){
  if(!RT.richCeTarget)return;
  try{
    var sel=window.getSelection();
    if(!sel||!sel.rangeCount)return;
    var range=sel.getRangeAt(0);
    if(RT.richCeTarget.contains(range.commonAncestorContainer)||RT.richCeTarget===range.commonAncestorContainer){
      RT.savedRange=range.cloneRange();
    }
  }catch(e){}
});
document.addEventListener('mousedown',function(e){
  var inToolbar=!!(e.target.closest&&e.target.closest('.stijlCanvasTopTools,.stijlCanvasToolbar'));
  if(!inToolbar||!RT.richCeTarget)return;
  try{var sel=window.getSelection();if(sel&&sel.rangeCount)RT.savedRange=sel.getRangeAt(0).cloneRange();}catch(e){}
  if(!e.target.closest('details')&&!e.target.closest('summary')&&!e.target.closest('input')&&!e.target.closest('label')){
    e.preventDefault();
  }
},true);
document.addEventListener('keydown',function(e){
  if(!e.target||!e.target.classList||!e.target.classList.contains('richCe'))return;
  if(!(e.ctrlKey||e.metaKey))return;
  if(e.key==='b'||e.key==='B'){e.preventDefault();document.execCommand('bold');}
  if(e.key==='i'||e.key==='I'){e.preventDefault();document.execCommand('italic');}
  if(e.key==='u'||e.key==='U'){e.preventDefault();document.execCommand('underline');}
});
// ─── Bold button: direct toggle when info richCe is active ───────────────
document.addEventListener('click',function(e){
  if(!RT.richCeTarget||RT.richCeTarget.dataset.richType==='question')return;
  var weightSummary=e.target.closest('[data-text-weight-btn]');
  if(weightSummary){
    e.preventDefault();
    e.stopPropagation();
    applyRichCeCmd('bold');
    return;
  }
},true);
// ──────────────────────────────────────────────────────────────────────────
document.addEventListener('change',function(ev){
  if(ev.target.type!=='file')return;
  var a=ev.target.dataset.action;
  if(a==='ulink'){uploadAndLink(ev.target,parseInt(ev.target.dataset.ti,10),ev.target.dataset.folder);return;}
  if(a==='targetupload'){
    var files=Array.from(ev.target.files||[]);
    if(files.length){
      uploadFile(files[0],ev.target.dataset.path,ev.target.dataset.sid);
      if(files.length>1)queueLooseUploads(files.slice(1),'cards');
    }
    ev.target.value='';
    return;
  }
  if(a==='palc'){var bc=bgCfg();bc.palette=bc.palette||[];bc.palette[parseInt(ev.target.dataset.i,10)]=ev.target.value;markDirty();scheduleBg();return;}
  // looseFileIn — upload to library
  if(ev.target.id==='looseFileIn'||ev.target.id==='looseThumbIn'){return;} // handled by onchange attribute
  // Legacy: tiles no longer have file inputs, this is a fallback
  if(ev.target.dataset.path){uploadFile(ev.target.files[0],ev.target.dataset.path,ev.target.dataset.sid);ev.target.value='';}
});
document.addEventListener('dragover',function(ev){
  var tile=ev.target.closest('.cTile');
  var infoDrop=ev.target.closest('[data-info-drop]');
  var styleDrop=ev.target.closest('[data-style-dropzone]');
  var uploadZone=ev.target.closest('.kuDrop,.kuUploadRail');
  if(tile||uploadZone||infoDrop||styleDrop)ev.preventDefault();
  if(tile)tile.classList.add('droptarget');
  if(infoDrop)infoDrop.classList.add('dragover');
  if(styleDrop)styleDrop.classList.add('dragover');
});
document.addEventListener('dragleave',function(ev){
  var tile=ev.target.closest('.cTile');
  var infoDrop=ev.target.closest('[data-info-drop]');
  var styleDrop=ev.target.closest('[data-style-dropzone]');
  if(tile&&!tile.contains(ev.relatedTarget))tile.classList.remove('droptarget');
  if(infoDrop&&!infoDrop.contains(ev.relatedTarget))infoDrop.classList.remove('dragover');
  if(styleDrop&&!styleDrop.contains(ev.relatedTarget))styleDrop.classList.remove('dragover');
});
document.addEventListener('drop',function(ev){
  var tile=ev.target.closest('.cTile');
  var infoDrop=ev.target.closest('[data-info-drop]');
  var styleDrop=ev.target.closest('[data-style-dropzone]');
  var uploadZone=ev.target.closest('.kuDrop');
  var libGrid=ev.target.closest('.kuUploadRail');
  if(!tile&&!uploadZone&&!libGrid&&!infoDrop&&!styleDrop)return;
  ev.preventDefault();
  if(tile)tile.classList.remove('droptarget');
  if(infoDrop)infoDrop.classList.remove('dragover');
  if(styleDrop)styleDrop.classList.remove('dragover');

  var fname=ev.dataTransfer&&ev.dataTransfer.getData('text/plain');
  var libpath=ev.dataTransfer&&ev.dataTransfer.getData('libpath');
  var files=ev.dataTransfer&&ev.dataTransfer.files;

  if(styleDrop&&files&&files.length){
    var styleSvgFiles=Array.from(files).filter(function(file){return !!(file&&/\.svg$/i.test(file.name||''));});
    if(!styleSvgFiles.length){toast('Alleen SVG','red');return;}
    STYLE_PREVIEW_KEY=styleDrop.dataset.stylePreviewKey||STYLE_PREVIEW_KEY;
    uploadFile(styleSvgFiles[0],styleDrop.dataset.path,styleDrop.dataset.sid);
    return;
  }

  if(infoDrop&&files&&files.length){
    var infoFiles=Array.from(files).filter(function(file){return !!(file&&/\.(svg|png)$/i.test(file.name||''));});
    if(!infoFiles.length){toast('Alleen SVG of PNG','red');return;}
    dropInfoSlideFile(parseInt(infoDrop.dataset.infoDrop,10),infoFiles[0]);
    return;
  }

  // Lib-item dragged onto tile → assign
  if(tile&&fname&&!(files&&files.length)){
    setActiveTargetPath(tile.dataset.path||'');
    assignLibraryPathToTile(tile,libpath||cardAssetPathForSet(S.activeId,fname));
    return;
  }

  // File dropped on tile -> assign first file directly to that tile, rest to library
  if(tile&&files&&files.length){
    setActiveTargetPath(tile.dataset.path||'');
    var droppedFiles=Array.from(files).filter(function(file){return !!(file&&/\.(svg|png)$/i.test(file.name||''));});
    if(!droppedFiles.length){toast('Alleen SVG of PNG','red');return;}
    uploadFile(droppedFiles[0],tile.dataset.path,tile.dataset.sid);
    if(droppedFiles.length>1)queueLooseUploads(droppedFiles.slice(1),'cards');
    return;
  }

  // File dropped elsewhere in upload area -> to library
  if(files&&files.length){
    queueLooseUploads(files,'cards');
    return;
  }
});
document.addEventListener('focusin',function(ev){
  if(isTextToolbarTarget(ev.target)) showFloatingTextBar(ev.target);
});
document.addEventListener('mousedown',function(ev){
  var editingIdx=currentEditingCoverTextIdx();
  if(editingIdx<0)return;
  var editingText=coverEditorQuery('.cpTextBlock.editing[data-cover-text-idx="'+editingIdx+'"] .cpTextBlockText');
  if(editingText&&(editingText===ev.target||editingText.contains(ev.target)))return;
  finishCoverTextInlineEdit(editingIdx);
},true);
document.addEventListener('mousedown',function(ev){
  if(ev.target&&ev.target.closest&&ev.target.closest('.shapeContextMenu'))return;
  clearShapeContextMenu();
  if(SHAPE_MARQUEE||S.clTab!=='opmaken'||SHAPE_DRAG)return;
  var key=activeStyleEditKey();
  if(getShapeActiveIndex(key,false)<0)return;
  var target=ev.target;
  if(target&&target.closest&&(
    target.closest('.cpShape')||
    target.closest('.shapeEditor')||
    target.closest('.shapeLayerBar')||
    target.closest('.shapeTypeBar')||
    target.closest('.shapePaintRow')||
    target.closest('.shapeSliderRow')||
    target.closest('.iconLibrary')
  )) return;
  clearActiveShapeSelection(key);
});
document.addEventListener('mousedown',function(ev){
  if(S.clTab!=='opmaken'||ev.button!==0||SHAPE_DRAG)return;
  var target=ev.target;
  if(!target||!target.closest)return;
  if(target.closest('.cpShape')||target.closest('.cpShapeText')||target.closest('.cvZoomControl')||target.closest('.stijlCanvasTools')||target.closest('.cvBackMode')||target.closest('.cpTextBlock'))return;
  var host=target.closest('.stijlCanvasWindow .cardFaceOuter, .stijlCanvasWindow .adminInfoSlide');
  if(!host)return;
  var layerEl=host.querySelector('.cpShapeLayer[data-shape-key]');
  if(!layerEl)return;
  var key=layerEl.dataset.shapeKey||activeStyleEditKey();
  startShapeMarquee(ev,key,host,layerEl);
  ev.preventDefault();
});
document.addEventListener('selectionchange',function(){
  var active=document.activeElement;
  if(isTextToolbarTarget(active)) syncFloatingTextBar();
});
window.addEventListener('scroll',function(){
  if(RT.target) syncFloatingTextBar();
},true);
window.addEventListener('resize',function(){
  if(RT.target) syncFloatingTextBar();
});
var floatingBar=getFloatingTextBar();
if(floatingBar){
  floatingBar.addEventListener('mousedown',function(ev){ev.preventDefault();});
}
document.addEventListener('keydown',function(e){
  if((e.metaKey||e.ctrlKey)&&!e.altKey){
    var aeUndo=document.activeElement;
    var tagUndo=aeUndo&&aeUndo.tagName?aeUndo.tagName.toLowerCase():'';
    var typingUndo=!!(aeUndo&&(aeUndo.isContentEditable||tagUndo==='input'||tagUndo==='textarea'));
    if(!typingUndo&&e.key.toLowerCase()==='z'){
      e.preventDefault();
      if(e.shiftKey)redoSetChanges();
      else undoSetChanges();
      return;
    }
    if(!typingUndo&&e.key.toLowerCase()==='y'){
      e.preventDefault();
      redoSetChanges();
      return;
    }
  }
  if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();if(S.activeId&&S.dirty)saveSet();return;}
  if(e.key==='Escape'){closeModal();return;}
  if(S.clTab==='opmaken'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&/^Arrow(Left|Right|Up|Down)$/.test(e.key)){
    var aeMove=document.activeElement;
    var tagMove=aeMove&&aeMove.tagName?aeMove.tagName.toLowerCase():'';
    var typingMove=!!(aeMove&&(aeMove.isContentEditable||tagMove==='input'||tagMove==='textarea'||tagMove==='select'));
    if(!typingMove){
      var step=e.shiftKey?5:1;
      var dx=0,dy=0;
      if(e.key==='ArrowLeft')dx=-step;
      if(e.key==='ArrowRight')dx=step;
      if(e.key==='ArrowUp')dy=-step;
      if(e.key==='ArrowDown')dy=step;
      if(dx||dy){
        if(nudgeActiveShapeLayer(dx,dy)){
          e.preventDefault();
          return;
        }
      }
    }
  }
  if((e.key==='Backspace'||e.key==='Delete')&&S.clTab==='opmaken'){
    var ae=document.activeElement;
    var tag=ae&&ae.tagName?ae.tagName.toLowerCase():'';
    var typing=!!(ae&&(ae.isContentEditable||tag==='input'||tag==='textarea'||tag==='select'));
    if(!typing){
      if(activeStyleEditKey()==='cover'&&currentCoverTextIdx()>=0&&document.querySelector('.cpTextBlock.active:not(.editing)')){
        e.preventDefault();
        removeCoverTextBlock(currentCoverTextIdx());
        return;
      }
      if(deleteActiveShapeLayer(activeStyleEditKey())){
        e.preventDefault();
        return;
      }
      var path=activeStyleDeletePath();
      if(path){
        e.preventDefault();
        deleteActiveStyleAsset();
        return;
      }
    }
  }
  if(e.key==='Enter'&&!g('setup').classList.contains('hidden'))connect();
});
window.addEventListener('beforeunload',function(e){if(S.dirty){e.preventDefault();e.returnValue='';}});

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function fR(label,type,id,value,hint,readonly){
  var inp=type==='textarea'
    ?'<textarea class="fTa" id="'+id+'" rows="3">'+esc(value)+'</textarea>'
    :'<input type="text" class="fIn" id="'+id+'" value="'+esc(value)+'"'+(hint?' placeholder="'+esc(hint)+'"':'')+(readonly?' readonly':'')+' oninput="markDirty()">';
  return'<div class="fRow"><label class="fLbl">'+esc(label)+'</label>'+inp+'</div>';
}
function markDirty(){
  S.dirty=true;
  pushHistorySnapshot();
  refreshTopBarControls();
  renderSidebar();
  refreshChecklistChrome();
}
function safeid(s){return btoa(s).replace(/[^a-zA-Z0-9]/g,'').slice(0,20);}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function g(id){return document.getElementById(id);}
function show(id){g(id).classList.remove('hidden');}
function hide(id){g(id).classList.add('hidden');}
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k);}catch(e){}}
function parse(s){try{return JSON.parse(s);}catch(_){return null;}}
function timeAgo(ts){var d=Math.round((Date.now()-ts)/60000);return d<1?'zojuist':d<60?d+' min geleden':Math.round(d/60)+' uur geleden';}
var toastTm;
function toast(msg,type){var t=g('toast');t.textContent=msg;t.className='toast on'+(type?' '+type:'');clearTimeout(toastTm);toastTm=setTimeout(function(){t.className='toast';},3200);}
function livePreviewUrl(){
  return '../kaarten/?set='+encodeURIComponent(S.activeId||'');
}
function showLivePreview(){
  if(!S.activeId){toast('Kies eerst een kaartenset','red');return;}
  var set=S.sets.find(function(s){return s.id===S.activeId;})||{};
  var baseUrl=livePreviewUrl();
  var url=baseUrl+(baseUrl.indexOf('?')>=0?'&':'?')+'_preview='+(Date.now());
  var hint=S.dirty?'Niet-opgeslagen wijzigingen zie je pas na opslaan.':'Zo ziet deze kaartenset eruit op telefoonformaat.';
  showModal(
    '<div class="livePreviewHead">'+
      '<div><h3>'+esc(set.title||S.activeId)+'</h3><div class="livePreviewHint">'+esc(hint)+'</div></div>'+
    '</div>'+
    '<div class="livePhone">'+
      '<div class="livePhoneTop"></div>'+
      '<div class="livePhoneFrame"><iframe src="'+esc(url)+'" title="Live preview '+esc(set.title||S.activeId)+'" loading="lazy"></iframe></div>'+
    '</div>'+
    '<div class="livePreviewActions">'+
      '<div class="livePreviewMeta">Telefoonweergave</div>'+
      '<div class="mAct" style="margin-top:0"><a class="mCa" href="'+esc(url)+'" target="_blank" rel="noopener">Nieuw tabblad</a><button class="mOk" onclick="closeModal()">Sluiten</button></div>'+
    '</div>',
    'livePreviewModal'
  );
}
function showModal(html,extraClass){var mb=g('mb');mb.className='modal'+(extraClass?' '+extraClass:'');mb.innerHTML=html;g('ovl').classList.remove('hidden');}
function closeModal(){var mb=g('mb'),ovl=g('ovl');ovl.classList.add('hidden');ovl.classList.remove('palPopover');mb.className='modal';mb.style.cssText='';mb.innerHTML='';_stylePalDrag=null;_stylePalAnchor=null;_stylePalState=null;}
g('ovl').addEventListener('click',function(e){if(e.target===this)closeModal();});
document.addEventListener('mousemove',function(ev){
  if(SHAPE_MARQUEE){
    updateShapeMarquee(ev.clientX,ev.clientY);
    return;
  }
  if(COVER_TEXT_DRAG){
    var dx=ev.clientX-Number(COVER_TEXT_DRAG.startX||0);
    var dy=ev.clientY-Number(COVER_TEXT_DRAG.startY||0);
    if(!COVER_TEXT_DRAG.moved&&Math.sqrt(dx*dx+dy*dy)<4)return;
    COVER_TEXT_DRAG.moved=true;
    dragCoverTextTo(ev.clientX,ev.clientY);
    return;
  }
  if(SHAPE_DRAG){
    dragShapeTo(ev.clientX,ev.clientY);
    return;
  }
  if(!_stylePalDrag)return;
  if(_stylePalDrag.kind==='surface'||_stylePalDrag.kind==='hue'){
    stylePalettePickAt(ev.clientX,ev.clientY,_stylePalDrag.kind);
    return;
  }
  var mb=g('mb');
  var left=Math.max(12,Math.min(window.innerWidth-mb.offsetWidth-12,ev.clientX-_stylePalDrag.dx));
  var top=Math.max(12,Math.min(window.innerHeight-mb.offsetHeight-12,ev.clientY-_stylePalDrag.dy));
  mb.style.left=left+'px';
  mb.style.top=top+'px';
});
document.addEventListener('mouseup',function(ev){
  if(SHAPE_MARQUEE){
    finishShapeMarquee(ev.clientX,ev.clientY);
    return;
  }
  if(COVER_TEXT_DRAG){
    if(!COVER_TEXT_DRAG.moved){
      setActiveCoverText(COVER_TEXT_DRAG.idx,{silent:true});
    } else {
      COVER_TEXT_SUPPRESS_CLICK_UNTIL=Date.now()+250;
      patchCoverTextTargets();
    }
    if(COVER_TEXT_DRAG.layerEl)clearCoverTextGuides(COVER_TEXT_DRAG.layerEl);
    if(COVER_TEXT_DRAG.blockEl)COVER_TEXT_DRAG.blockEl.classList.remove('dragging');
  }
  COVER_TEXT_DRAG=null;
  if(SHAPE_DRAG&&SHAPE_DRAG.shapeEl){SHAPE_DRAG.shapeEl.classList.remove('dragging');startShapeSelTimer(SHAPE_DRAG.key);}
  SHAPE_DRAG=null;
  syncPreviewGridAccentState();
  _stylePalDrag=null;
});
function initSliderScrollHints(){
  document.querySelectorAll('.stijlHeaderBar .stijlSlideRail').forEach(function(rail){
    var bar=rail.closest('.stijlHeaderBar');
    if(!bar)return;
    var noOverflow=rail.scrollWidth<=rail.clientWidth+4;
    var atEnd=noOverflow||(rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-8);
    bar.classList.toggle('scroll-end',atEnd);
  });
}
document.addEventListener('scroll',function(e){
  var rail=e.target;
  if(rail&&rail.classList&&rail.classList.contains('stijlSlideRail')){
    var bar=rail.closest('.stijlHeaderBar');
    if(bar){
      var atEnd=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-8;
      bar.classList.toggle('scroll-end',atEnd);
    }
  }
},true);
// ── Responsive swatch clamping ─────────────────────────────────────────────
// Show only whole swatches in .brandSwsGroup; hides any that would be clipped.
function clampSwatchGroup(g){
  if(!g||!g.offsetParent)return; // not visible
  var sw=18,gap=4,w=g.offsetWidth;
  var n=Math.max(1,Math.floor((w+gap)/(sw+gap)));
  g.querySelectorAll('.brandSw').forEach(function(s,i){s.style.display=i<n?'':'none';});
}
function clampAllSwatchGroups(){
  document.querySelectorAll('.brandSwsGroup').forEach(clampSwatchGroup);
}
(function(){
  // Re-clamp when any .brandSwsGroup is added or when the panel resizes
  new MutationObserver(function(muts){
    muts.forEach(function(m){
      m.addedNodes.forEach(function(nd){
        if(nd.nodeType!==1)return;
        if(nd.classList&&nd.classList.contains('brandSwsGroup')){setTimeout(function(){clampSwatchGroup(nd);},0);}
        else if(nd.querySelectorAll){nd.querySelectorAll('.brandSwsGroup').forEach(function(g){setTimeout(function(){clampSwatchGroup(g);},0);});}
      });
    });
  }).observe(document.body,{childList:true,subtree:true});
  if(window.ResizeObserver){
    new ResizeObserver(function(){clampAllSwatchGroups();}).observe(document.documentElement);
  }
})();
