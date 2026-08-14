// ─────────────────────────────────────────────────────────────
// reference-tab.js
// The Brand Reference browsing grid.
// (source: original index.html lines 3979-4125)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// BRAND REFERENCE
// ══════════════════════════════════════════════════════════════
let refBrand='all',refGroup=null,refLF='all',refMedium='all';

function setRefMedium(btn,medium){
  refMedium=medium;
  document.querySelectorAll('.ref-medium-filters .filt-btn').forEach(b=>b.classList.toggle('active', b===btn));
  renderRef();
}

document.querySelectorAll('.rsb-btn').forEach(btn=>{
  btn.addEventListener('click',function(){
    document.querySelectorAll('.rsb-btn').forEach(b=>b.classList.remove('active'));
    this.classList.add('active');
    const brand=this.dataset.brand,group=this.dataset.group;
    if(brand){refBrand=brand;refGroup=null;}
    if(group){refGroup=group;refBrand='all';}
    syncRefMobileSwitcher();
    renderRef();
    if(isMobile()) setTimeout(closeSidebars,80);
  });
});

// Mobile brand/group dropdown — mirrors the sidebar's filter state so users
// don't need to open the (desktop-only) sidebar or rotate to landscape to
// pick a brand. Keeps a single source of truth (refBrand/refGroup) shared
// with the sidebar buttons rather than duplicating filter logic.
function setRefFromDropdown(value){
  const [kind,val]=value.split(':');
  if(kind==='brand'){ refBrand=val; refGroup=null; }
  else if(kind==='group'){ refGroup=val; refBrand='all'; }
  // Keep the desktop sidebar's active state in sync too, in case the window
  // is resized from mobile to desktop width without a page reload.
  document.querySelectorAll('.rsb-btn').forEach(b=>{
    const match=(kind==='brand'&&b.dataset.brand===val)||(kind==='group'&&b.dataset.group===val);
    b.classList.toggle('active', match);
  });
  renderRef();
}
// Reflects the current refBrand/refGroup state back into the <select> —
// called whenever the sidebar buttons change state so both controls agree.
function syncRefMobileSwitcher(){
  const sel=document.getElementById('ref-mobile-switcher');
  if(!sel) return;
  sel.value = refGroup ? ('group:'+refGroup) : ('brand:'+refBrand);
}

function setRefLF(btn,lf){
  refLF=lf;
  document.querySelectorAll('.ref-filters .filt-btn').forEach(b=>b.classList.toggle('active', b===btn));
  renderRef();
}

function getRefFiltered(){
  const q=(document.getElementById('ref-search')||{value:''}).value.trim().toLowerCase();
  return COLORS.filter(c=>{
    if(refMedium!=='all'&&(c.medium||'watercolor')!==refMedium) return false;
    if(refBrand!=='all'&&c.brand!==refBrand) return false;
    if(refGroup&&c.group!==refGroup) return false;
    if(refLF==='I'&&c.lf!=='I') return false;
    if(refLF==='T'&&c.transparency!=='T') return false;
    if(refLF==='gran'&&!c.gran) return false;
    if(refLF==='single'&&!c.single) return false;
    if(refLF==='O'&&c.transparency!=='O') return false;
    if(q&&!c.name.toLowerCase().includes(q)&&!c.pigment.toLowerCase().includes(q)) return false;
    return true;
  });
}

function paletteOptionsHtml(){
  if(!palettes.length) return '<option value="">No palettes — create one first</option>';
  return palettes.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
}

function renderRef(){
  clearQ();
  const wrap=document.getElementById('ref-grid-wrap');
  if(!wrap) return;
  const filtered=getRefFiltered();
  if(!filtered.length){wrap.innerHTML='<div class="no-ref-results">No colors match your filters.</div>';return;}
  // Performance: warn if rendering many cards
  if(filtered.length>300){
    wrap.innerHTML='<div class="no-ref-results" style="color:var(--rust);">'+filtered.length+' colors — use the brand or group filter to narrow results for best performance.</div>';
    return;
  }

  const byGroup={};
  GROUP_ORDER.forEach(g=>byGroup[g]=[]);
  filtered.forEach(c=>{
    // Attach cid once per color to avoid recomputing it separately for the colorMap
    c._cid=`ref_${c.brand}_${c.medium||'watercolor'}_${c.name}`.replace(/[^a-zA-Z0-9_]/g,'_');
    if(byGroup[c.group])byGroup[c.group].push(c);
  });

  let html='';
  GROUP_ORDER.forEach(g=>{
    const cols=byGroup[g];if(!cols.length) return;
    html+=`<div class="ref-group-header"><h3>${GROUP_LABELS[g]||g}</h3><span class="ref-group-count">${cols.length}</span></div><div class="ref-grid">`;
    cols.forEach(c=>{
      const cid=c._cid;
      const sn=escJsAttr(c.name),sb=escJsAttr(c.brand);
      const bTag=refBrand==='all'?`<div class="ref-brand-tag">${BRAND_LABELS[c.brand]||c.brand}</div>`:'';
      const mTag=(refMedium==='all'&&c.medium==='gouache')?`<div class="ref-medium-tag">Gouache</div>`:'';
      const photo=getColorPhoto(c);
      const hasPhoto=!!photo;
      const showPhoto=hasPhoto&&isColorPhotoVisible(c);
      html+=`<div class="ref-card" onclick="openRefChip('${sn}','${sb}','${c.medium}')">
        <div class="ref-swatch" style="background:${c.hex};" data-cid="rs_${cid}">
          <canvas id="rs_${cid}" style="${showPhoto?'opacity:0;':''}"></canvas>
          <div class="ref-photo${showPhoto?' visible':''}" id="rp_${cid}" style="${photo?'background-image:url('+photo+');':''}"></div>
          <button class="ref-cam" id="rpc_${cid}" title="${hasPhoto?'Replace or remove photo':'Attach a real-world swatch photo'}" aria-label="${hasPhoto?'Replace or remove photo':'Attach a real-world swatch photo'}" onclick="event.stopPropagation();refCamAction('${cid}','${sn}','${sb}',${hasPhoto},'${c.medium}')">${hasPhoto?'📷✓':'📷'}</button>
          <button class="ref-photo-toggle${hasPhoto?' has-photo':''}" id="rpt_${cid}" onclick="event.stopPropagation();refTogglePhoto('${cid}','${sn}','${sb}','${c.medium}')" title="Toggle photo/render">${showPhoto?'◼ render':'🖼 photo'}</button>
        </div>
        <div class="ref-ts" data-cid="rt_${cid}">
          <canvas id="rt_${cid}"></canvas>
          <span class="ref-ts-label">${c.transparency==='T'?'transparent →':c.transparency==='ST'?'semi →':'opaque'}</span>
        </div>
        <div class="ref-body">
          <div class="ref-name">${escapeHtml(c.name)}</div>
          <div class="ref-pig">${c.pigment}</div>
          <div class="ref-meta"><span class="lbadge lf-${c.lf}">${c.lf}</span>
          <span class="ref-transp">${c.gran?'Gran·':''} ${c.transparency}</span></div>
          ${bTag}
          ${mTag}
        </div>
      </div>`;
    });
    html+='</div>';
  });
  wrap.innerHTML=html;

  // IntersectionObserver for canvas renders — reuse already-computed _cid
  if(window._refIO) window._refIO.disconnect();
  const colorMap={};
  filtered.forEach(c=>{colorMap['rs_'+c._cid]=c;colorMap['rt_'+c._cid]=c;});
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting) return;
      const area=e.target,cid=area.dataset.cid;
      if(!cid) return;
      const c=colorMap[cid];if(!c) return;
      const cv=document.getElementById(cid);if(!cv) return;
      const W=area.offsetWidth||130,H=area.offsetHeight||72;
      if(cid.startsWith('rs_')) queueRender(()=>renderSwatchCanvas(cv,c.hex,c.gran,c.transparency,W,H,c.medium));
      else queueRender(()=>renderTranspCanvas(cv,c.hex,c.transparency,W,H));
      io.unobserve(area);
    });
  },{rootMargin:'300px'});
  wrap.querySelectorAll('[data-cid]').forEach(el=>io.observe(el));
  window._refIO=io;

  // Update brand sidebar counts using a single pass over COLORS
  const brandCounts={all:COLORS.length};
  COLORS.forEach(c=>{brandCounts[c.brand]=(brandCounts[c.brand]||0)+1;});
  const ids=['all','daniel-smith','winsor-newton','schmincke','holbein','sennelier','mgraham','qor','blockx','mijello','utrecht','schpirerr-farben'];
  ids.forEach(b=>{
    const el=document.getElementById('rcnt-'+b);if(!el) return;
    el.textContent='('+(brandCounts[b]||0)+')';
  });
}

// ── Reference card photo wiring — shares the same color-identity photo
// store as palette swatch cards, so a photo attached here shows up on
// every palette card for that color too, and vice versa. ──
function refCamAction(cid, name, brand, hasPhoto, medium){
  const c=COLORS.find(x=>x.name===name && x.brand===brand && (x.medium||'watercolor')===(medium||'watercolor'));
  if(!c) return;
  const key=colorPhotoKey(c);
  const btn=(event&&(event.currentTarget||event.target))||document.getElementById('rpc_'+cid);
  const refresh=function(){
    const photo=getColorPhoto(c);
    const visible=isColorPhotoVisible(c);
    const photoDiv=document.getElementById('rp_'+cid);
    const canvasEl=document.getElementById('rs_'+cid);
    const toggleBtn=document.getElementById('rpt_'+cid);
    const camBtn=document.getElementById('rpc_'+cid);
    if(photoDiv){
      photoDiv.style.backgroundImage=photo?'url('+photo+')':'';
      photoDiv.classList.toggle('visible', !!photo&&visible);
    }
    if(canvasEl) canvasEl.style.opacity=(photo&&visible)?'0':'';
    if(toggleBtn){
      toggleBtn.classList.toggle('has-photo', !!photo);
      toggleBtn.textContent=visible?'◼ render':'🖼 photo';
    }
    if(camBtn) camBtn.textContent=photo?'📷✓':'📷';
  };
  if(!hasPhoto){ triggerPhotoUpload(key, refresh); return; }
  if(btn) showPhotoActionMenu(btn, key, refresh, refresh);
}

function refTogglePhoto(cid, name, brand, medium){
  const c=COLORS.find(x=>x.name===name && x.brand===brand && (x.medium||'watercolor')===(medium||'watercolor'));
  if(!c) return;
  const key=colorPhotoKey(c);
  toggleColorPhotoVisible(key, function(visible){
    const photoDiv=document.getElementById('rp_'+cid);
    const canvasEl=document.getElementById('rs_'+cid);
    const toggleBtn=document.getElementById('rpt_'+cid);
    if(photoDiv) photoDiv.classList.toggle('visible', visible);
    if(canvasEl) canvasEl.style.opacity=visible?'0':'';
    if(toggleBtn) toggleBtn.textContent=visible?'◼ render':'🖼 photo';
  });
}

