// ═══════════════════════════════════════════
// SUPABASE DATA LAYER — vervangt GitHub API
// Geladen na admin.js zodat functies overschreven kunnen worden
// ═══════════════════════════════════════════

(function(){
  var db = window._supa;
  if(!db){ console.warn('Supabase client niet gevonden'); return; }

  // ── Hulpfuncties ───────────────────────────────────────────
  function uid(){ return crypto.randomUUID(); }

  function requestedSpaceSlug(){
    var parts=String(location.pathname||'').replace(/^\/|\/$/g,'').split('/').filter(Boolean);
    if(parts.length>=2 && parts[1]==='dashboard') return parts[0]||'';
    return '';
  }

  function syncDashboardRoute(slug){
    var clean=String(slug||'').trim();
    if(!clean)return;
    var pathname=String(location.pathname||'');
    var target='/'+clean+'/dashboard/';
    if(pathname===target)return;
    if(pathname==='/dashboard/' || pathname==='/dashboard'){
      history.replaceState({space:clean},'',target+(location.search||'')+(location.hash||''));
    }
  }

  function slugify(str){
    return String(str).toLowerCase().trim()
      .replace(/\s+/g,'-')
      .replace(/[^a-z0-9-]/g,'')
      .replace(/-+/g,'-')
      .replace(/^-|-$/g,'');
  }

  // Zorg dat slug uniek is binnen S.sets
  function uniqueSlug(base){
    var slug=slugify(base)||'set';
    var n=2;
    while(S.sets.find(function(s){ return s.slug===slug; })){ slug=slugify(base)+'-'+n++; }
    return slug;
  }

  // ── Space laden ─────────────────────────────────────────────
  async function getSpace(){
    var requested=requestedSpaceSlug();
    var q = db.from('spaces').select('*').eq('owner_id', S._uid);
    if(requested) q = q.eq('slug', requested);
    var r = await q.limit(1);
    if(r.error) throw new Error(r.error.message);
    var hit=(r.data||[])[0] || null;
    if(hit || requested) return hit;

    r = await db.from('spaces').select('*').eq('owner_id', S._uid).limit(1);
    if(r.error) throw new Error(r.error.message);
    return (r.data||[])[0] || null;
  }

  // ── loadIndex — overschrijft de GitHub-versie ───────────────
  window.loadIndex = async function(){
    try{
      // Hard reset van oude client-state: gewone gebruikersadmin mag nooit
      // resten van demo/legacy sets blijven renderen.
      S.activeId = null;
      S.activeKind = 'space';
      S.d = null;
      Object.keys(SC||{}).forEach(function(id){ delete SC[id]; });
      Object.keys(CC||{}).forEach(function(path){
        if(/^sets\//.test(path)) delete CC[path];
      });
      Object.keys(KF||{}).forEach(function(path){
        if(/^sets\//.test(path)) delete KF[path];
      });

      // Legacy GitHub/index-state mag de gewone gebruiker niet beïnvloeden.
      S.indexSha = '';
      S.indexData = { sets: [] };

      // Space ophalen
      var space = await getSpace();
      if(!space){
        var requested=requestedSpaceSlug();
        // Nog geen space — toon aanmaakscherm
        show('app'); hide('setup');
        g('mc').innerHTML =
          '<div class="welcome" style="max-width:400px;margin:60px auto;text-align:center">'+
          '<h2 style="margin-bottom:12px">'+(requested?'Space niet gevonden':'Maak je eerste space aan')+'</h2>'+
          '<p style="margin-bottom:20px;color:var(--k3)">'+
            (requested
              ? 'Er is voor jouw account nog geen space met slug <strong>'+esc(requested)+'</strong>. Maak die eerst aan of open de juiste dashboard-route.'
              : 'Een space is jouw werkruimte voor kaartensets.')+
          '</p>'+
          '<input id="spaceNameInp" class="fIn" placeholder="'+(requested?'Naam voor '+requested:'Naam van je organisatie')+'" style="margin-bottom:10px">'+
          '<button class="btn" onclick="createSpace()">Space aanmaken</button>'+
          '</div>';
        if(g('sbRepo')) g('sbRepo').textContent = '—';
        return;
      }

      S.spaceId = space.id;
      S.spaceSlug = space.slug;
      S.space = space;
      S.spaceLayoutMode = space.layout_mode || '';
      syncDashboardRoute(space.slug);

      show('app'); hide('setup');
      if(typeof window.drawSidebarBlobs==='function')requestAnimationFrame(window.drawSidebarBlobs);
      if(g('sbRepo')) g('sbRepo').textContent = space.name;

      // Sets ophalen
      var r = await db.from('sets').select('id,slug,title,card_format,sort_order,is_public,bundle')
        .eq('space_id', space.id).order('sort_order');
      if(r.error) throw new Error(r.error.message);

      S.sets = (r.data||[]).map(function(s){
        return { id:s.id, slug:s.slug, title:s.title, isPublic:s.is_public!==false, bundle:s.bundle||null };
      });
      renderSidebar();

      S.activeId = ((S.sets[0]||{}).id)||null;
      S.activeKind = 'space';
      loadSpaceEditor({silent:true});
    } catch(e){
      lbFail();
      toast('Laden mislukt: '+e.message, 'red');
    }
  };

  // ── Space aanmaken ──────────────────────────────────────────
  window.createSpace = async function(){
    var nameEl = g('spaceNameInp');
    var name = (nameEl&&nameEl.value||'').trim();
    if(!name){ toast('Vul een naam in','red'); return; }
    var requested=requestedSpaceSlug();
    var slug = requested || slugify(name) || 'space';
    var r = await db.from('spaces').insert({ id:uid(), slug:slug, name:name, owner_id:S._uid }).select().single();
    if(r.error){ toast('Fout: '+r.error.message,'red'); return; }
    await loadIndex();
  };

  // ── loadSetFiles — overschrijft de GitHub-versie ────────────
  window.loadSetFiles = async function(id){
    var r = await db.from('sets').select('bundle,card_format').eq('id',id).single();
    if(r.error) throw new Error(r.error.message);
    var b = r.data.bundle || {};
    var meta = b.meta || mkMeta(id);
    if(r.data.card_format) meta.cardFormat = r.data.card_format;
    return {
      meta:       meta,        metaSha:       null,
      questions:  b.questions  || {},       questionsSha:  null,
      uitleg:     b.uitleg     || {},       uitlegSha:     null,
      intro:      b.intro      || {slides:[],hint:'← → swipe'}, introSha: null
    };
  };

  window.saveSpaceSettings = async function(){
    if(!S.space){ toast('Home niet geladen','red'); return; }
    var hint=g('spaceSaveHint');
    if(hint){ hint.className='spaceSaveHint'; hint.textContent='Opslaan…'; }
    var settings = JSON.parse(JSON.stringify((S.space.settings&&typeof S.space.settings==='object')?S.space.settings:{}));
    settings.publicPage = settings.publicPage&&typeof settings.publicPage==='object' ? settings.publicPage : {};
    if(typeof settings.publicPage.enabled!=='boolean') settings.publicPage.enabled = true;
    settings.publicPage.layout = (typeof currentSpaceLayoutMode==='function' ? currentSpaceLayoutMode() : ((g('spaceLayoutInp')&&g('spaceLayoutInp').value) || 'grid'));
    if(g('spaceBgInp')) settings.publicPage.background = (g('spaceBgInp').value||'').trim() || settings.publicPage.background || 'zacht';
    if(g('spaceIntroInp')) settings.publicPage.intro = (g('spaceIntroInp').value||'').trim();
    if(g('spaceInfoFirstInp')) settings.publicPage.infoFirstVisit = !!g('spaceInfoFirstInp').checked;
    if(S.d&&S.activeKind==='space'){
      settings.publicPage.editorBundle = {
        meta: cloneJson(S.d.meta||{}),
        questions: cloneJson(S.d.questions||{}),
        uitleg: cloneJson(S.d.uitleg||{}),
        intro: cloneJson(S.d.intro||{})
      };
    }
    var r = await db.from('spaces').update({
      settings: settings,
      layout_mode: settings.publicPage.layout
    }).eq('id', S.space.id).select().single();
    if(r.error){
      if(hint){ hint.className='spaceSaveHint err'; hint.textContent='Opslaan mislukt: '+r.error.message; }
      toast('Fout: '+r.error.message,'red');
      return;
    }
    S.space = r.data || S.space;
    S.spaceLayoutMode = S.space.layout_mode || settings.publicPage.layout;
    renderSidebar();
    renderSpaceEditor();
    if(hint){ hint.className='spaceSaveHint ok'; hint.textContent='Home opgeslagen.'; }
    toast('Home opgeslagen ✓','green');
  };

  // ── saveSet — overschrijft de GitHub-versie ─────────────────
  window.saveSet = async function(cb){
    collectCurrent();
    var btn = g('saveBtn');
    if(btn){ btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Opslaan…'; }

    var id = S.activeId, d = S.d;
    var bundle = { meta:d.meta, questions:d.questions, uitleg:d.uitleg, intro:d.intro };

    var r = await db.from('sets').update({
      title:       d.meta.title || '',
      card_format: d.meta.cardFormat || 'landscape-85x55',
      bundle:      bundle
    }).eq('id', id);

    if(btn){ btn.disabled=false; btn.innerHTML='Opslaan'; }
    if(r.error){ toast('Fout: '+r.error.message,'red'); return; }

    cacheSetBundle(id, cloneSetBundle(d));
    resetHistory(S.d);
    syncDirtyFromSnapshot();
    renderSidebar();
    refreshChecklistChrome();
    toast('Opgeslagen ✓','green');
    if(typeof cb==='function') cb();
  };

  // ── saveIndex — set-volgorde opslaan ────────────────────────
  window.saveIndex = async function(){
    await Promise.all(S.sets.map(function(s,i){
      return db.from('sets').update({ sort_order:i }).eq('id', s.id);
    }));
  };

  // ── createSet — overschrijft de GitHub-versie ───────────────
  window.createSet = async function(){
    var title = (g('ns_title').value||'').trim();
    if(!title){ toast('Vul een naam in','red'); return; }
    var fmtEl = g('ns_fmt');
    var fmtId = (fmtEl&&fmtEl.value)||DEFAULT_CARD_FORMAT;
    var slug = uniqueSlug(title);
    var newId = uid();

    var meta = mkMeta(newId, title);
    if(fmtId!==DEFAULT_CARD_FORMAT) meta.cardFormat = fmtId;

    var bundle = {
      meta:      meta,
      questions: {},
      uitleg:    {cover:''},
      intro:     {slides:[{key:'cover',title:title,body:'',img:'cards/voorkant.svg',alt:title}],hint:'← → swipe'}
    };

    var r = await db.from('sets').insert({
      id:          newId,
      space_id:    S.spaceId,
      slug:        slug,
      title:       title,
      card_format: fmtId,
      is_public:   true,
      sort_order:  S.sets.length,
      bundle:      bundle
    });
    if(r.error){ toast('Fout: '+r.error.message,'red'); return; }

    clearSetClientState(newId);
    closeModal();
    S.sets.push({ id:newId, slug:slug, title:title, isPublic:true });
    S.d = { meta:meta, metaSha:null, questions:{}, questionsSha:null, uitleg:{cover:''}, uitlegSha:null,
            intro:bundle.intro, introSha:null };
    cacheSetBundle(newId, cloneSetBundle(S.d));
    applyCardFormat();
    S.activeId = newId;
    resetHistory(S.d);
    S.dirty = false;
    updateDirtyUi();
    renderSidebar();
    showModeChoice();
    toast('Set aangemaakt ✓','green');
  };

  // ── execDup — set dupliceren ─────────────────────────────────
  window.execDup = async function(){
    var title = (g('du_nm').value||'').trim();
    if(!title){ toast('Geef een naam in','red'); return; }
    var slug = uniqueSlug(title);
    var newId = uid();
    var data = JSON.parse(JSON.stringify(S.d));
    data.meta.id = newId; data.meta.title = title;
    var bundle = { meta:data.meta, questions:data.questions, uitleg:data.uitleg, intro:data.intro };

    var r = await db.from('sets').insert({
      id:          newId,
      space_id:    S.spaceId,
      slug:        slug,
      title:       title,
      card_format: data.meta.cardFormat||DEFAULT_CARD_FORMAT,
      is_public:   (S.sets.find(function(s){ return s.id===S.activeId; })||{}).isPublic!==false,
      sort_order:  S.sets.length,
      bundle:      bundle
    });
    if(r.error){ toast('Fout: '+r.error.message,'red'); return; }

    closeModal();
    S.sets.push({ id:newId, slug:slug, title:title, isPublic:((S.sets.find(function(s){ return s.id===S.activeId; })||{}).isPublic!==false) });
    cacheSetBundle(newId, cloneSetBundle({meta:data.meta,metaSha:null,questions:data.questions,questionsSha:null,
      uitleg:data.uitleg,uitlegSha:null,intro:data.intro,introSha:null}));
    S.d = data; S.activeId = newId;
    resetHistory(S.d); S.dirty = false; updateDirtyUi();
    renderSidebar(); renderEditor();
    toast('Gedupliceerd ✓','green');
  };

  // ── execDel — set verwijderen ────────────────────────────────
  window.execDel = async function(){
    closeModal();
    var id = S.activeId;
    var r = await db.from('sets').delete().eq('id', id);
    if(r.error){ toast('Fout: '+r.error.message,'red'); return; }

    S.sets = S.sets.filter(function(s){ return s.id!==id; });
    clearSetClientState(id);
    S.activeId = null; S.dirty = false;
    renderSidebar();
    g('mc').innerHTML = '<div class="welcome"><h2>Set verwijderd</h2></div>';
    toast('Verwijderd','green');
  };

  window.toggleSetPublic = async function(id){
    var set = (S.sets||[]).find(function(item){ return item.id===id; });
    if(!set){ toast('Set niet gevonden','red'); return; }
    var next = set.isPublic===false;
    var r = await db.from('sets').update({ is_public: next }).eq('id', id);
    if(r.error){ toast('Fout: '+r.error.message,'red'); return; }
    set.isPublic = next;
    renderSidebar();
    toast(next?'Publiek zichtbaar':'Privé gezet', next?'green':'amber');
  };

  // ── INIT — Supabase auth check ───────────────────────────────
  db.auth.getSession().then(function(r){
    var session = (r.data||{}).session;
    // Auth check tijdelijk uitgeschakeld voor lokale ontwikkeling
    // if(!session){ location.href='/login/'; return; }
    var md=(((session||{}).user||{}).user_metadata)||{};
    S._uid = (session&&session.user&&session.user.id) || '00000000-0000-0000-0000-000000000000';
    S._email = (session&&session.user&&session.user.email) || 'dev@local';
    S._userName = md.full_name || md.name || S._email;
    S._userAvatar = md.avatar_url || md.picture || '';
    // Toon e-mail in topbar als dat element bestaat
    var el = g('userEmail'); if(el) el.textContent = S._email;
    lbStart();
    loadIndex();
  });

})();
