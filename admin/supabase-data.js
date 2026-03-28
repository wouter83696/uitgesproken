// ═══════════════════════════════════════════
// SUPABASE DATA LAYER — vervangt GitHub API
// Geladen na admin.js zodat functies overschreven kunnen worden
// ═══════════════════════════════════════════

(function(){
  var db = window._supa;
  if(!db){ console.warn('Supabase client niet gevonden'); return; }

  // ── Hulpfuncties ───────────────────────────────────────────
  function uid(){ return crypto.randomUUID(); }

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
    var r = await db.from('spaces').select('*').eq('owner_id', S._uid).limit(1);
    if(r.error) throw new Error(r.error.message);
    return (r.data||[])[0] || null;
  }

  // ── loadIndex — overschrijft de GitHub-versie ───────────────
  window.loadIndex = async function(){
    try{
      // Space ophalen
      var space = await getSpace();
      if(!space){
        // Nog geen space — toon aanmaakscherm
        show('app'); hide('setup');
        g('mc').innerHTML =
          '<div class="welcome" style="max-width:400px;margin:60px auto;text-align:center">'+
          '<h2 style="margin-bottom:12px">Maak je eerste space aan</h2>'+
          '<p style="margin-bottom:20px;color:var(--k3)">Een space is jouw werkruimte voor kaartensets.</p>'+
          '<input id="spaceNameInp" class="fIn" placeholder="Naam van je organisatie" style="margin-bottom:10px">'+
          '<button class="btn" onclick="createSpace()">Space aanmaken</button>'+
          '</div>';
        if(g('sbRepo')) g('sbRepo').textContent = '—';
        return;
      }

      S.spaceId = space.id;
      S.spaceSlug = space.slug;

      show('app'); hide('setup');
      if(g('sbRepo')) g('sbRepo').textContent = space.name;

      // Sets ophalen
      var r = await db.from('sets').select('id,slug,title,card_format,sort_order')
        .eq('space_id', space.id).order('sort_order');
      if(r.error) throw new Error(r.error.message);

      S.sets = (r.data||[]).map(function(s){
        return { id:s.id, slug:s.slug, title:s.title };
      });
      renderSidebar();

      if(!S.sets.length){ renderLoadedWelcome(); return; }
      await loadSet(S.sets[0].id, {silent:true});
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
    var slug = slugify(name) || 'space';
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
      sort_order:  S.sets.length,
      bundle:      bundle
    });
    if(r.error){ toast('Fout: '+r.error.message,'red'); return; }

    clearSetClientState(newId);
    closeModal();
    S.sets.push({ id:newId, slug:slug, title:title });
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
      sort_order:  S.sets.length,
      bundle:      bundle
    });
    if(r.error){ toast('Fout: '+r.error.message,'red'); return; }

    closeModal();
    S.sets.push({ id:newId, slug:slug, title:title });
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

  // ── INIT — Supabase auth check ───────────────────────────────
  db.auth.getSession().then(function(r){
    var session = (r.data||{}).session;
    if(!session){ location.href='/login/'; return; }
    S._uid = session.user.id;
    S._email = session.user.email;
    // Toon e-mail in topbar als dat element bestaat
    var el = g('userEmail'); if(el) el.textContent = session.user.email;
    lbStart();
    loadIndex();
  });

})();
