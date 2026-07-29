// ─────────────────────────────────────────────────────────────
// palette-view-core.js
// The Palette tab shell, view-tab switching, and the swatch grid.
// (source: original index.html lines 2925-3145)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// MY PALETTES
// ══════════════════════════════════════════════════════════════
function renderPaletteList(){
  const list=document.getElementById('palette-list');
  if(!palettes.length){
    list.innerHTML='<div class="empty-palettes">No palettes yet.<br>Click + New to create one.</div>';
  } else {
    list.innerHTML=palettes.map(p=>{
      const swatches=p.colors.slice(0,5).map(c=>`<div class="pi-swatch" style="background:${c.hex}"></div>`).join('');
      return`<div class="swipe-row" data-swipe-action="deletePalette(null,'${p.id}')">
        <div class="swipe-backing"><span class="swipe-delete-label">Delete</span></div>
        <div class="swipe-content palette-item${p.id===activePaletteId?' active':''}" onclick="selectPalette('${p.id}')">
        <div class="palette-item-swatches">${swatches}</div>
        <span class="palette-item-name">${p.name}</span>
        <span class="palette-item-count">${p.colors.length}</span>
        <div class="palette-item-actions">
          <button class="palette-item-btn" title="Duplicate palette" onclick="event.stopPropagation();duplicatePalette(event,'${p.id}')">⧉</button>
          <button class="palette-item-btn del" title="Delete palette" onclick="event.stopPropagation();deletePalette(event,'${p.id}')">✕</button>
        </div>
      </div></div>`;
    }).join('');
    initSwipeRows(list);
  }
  renderPaletteArea();
}

function selectPalette(id){
  activePaletteId=id;
  palSortMode='custom';
  // Mix Colors selection indices are only meaningful within the palette they
  // were selected from — carrying them into a different palette would select
  // the wrong swatches (or mix the wrong colors) since indices don't line up.
  resetMixModeState();
  renderPaletteList();
  if(isMobile()) setTimeout(closeSidebars,80);
}

function renderPaletteArea(){
  const area=document.getElementById('palette-area');
  const pal=palettes.find(p=>p.id===activePaletteId);
  if(!pal){
    area.style.cssText='flex:1;overflow:hidden;display:flex;flex-direction:column;';
    area.innerHTML=`<div class="no-palette" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
      <div class="big-icon">🎨</div>
      <p>Select or create a palette<br>to get started.</p>
      <button class="btn-new" style="padding:0.6rem 1.1rem;font-size:0.85rem;" onclick="openNewPaletteModal()">+ New Palette</button>
    </div>`;
    return;
  }
  area.style.cssText='flex:1;overflow:hidden;display:flex;flex-direction:column;';
  area.innerHTML=`
    <div class="palette-header">
      <select class="palette-mobile-switcher" id="palette-mobile-switcher" onchange="selectPalette(this.value)" aria-label="Switch palette">
        ${palettes.map(p=>`<option value="${p.id}"${p.id===pal.id?' selected':''}>${p.name} (${p.colors.length})</option>`).join('')}
      </select>
      <input class="palette-name-input" value="${pal.name}" onchange="renamePalette('${pal.id}',this.value)" maxlength="40">
      <div class="palette-toolbar">
        <button class="palette-tool-btn" title="New palette" onclick="openNewPaletteModal()">+ New</button>
        <button class="palette-tool-btn" title="Duplicate this palette" onclick="duplicatePalette(event,'${pal.id}')">⧉ Copy</button>
        <button class="palette-tool-btn del" title="Delete this palette" onclick="deletePalette(event,'${pal.id}')">✕ Delete</button>
      </div>
      <button class="btn-add-colors" onclick="showPage('reference',document.querySelector('.nav-tab:nth-child(2)'))">+ Add Colors</button>
    </div>
    <div class="palette-header-row2">
      <div class="view-tabs">
        <button class="view-tab${activePaletteView==='swatch'?' active':''}" data-view="swatch" onclick="setPaletteView('swatch')"><span class="vt-icon">▦</span> Swatches</button>
        <button class="view-tab${activePaletteView==='wheel'?' active':''}" data-view="wheel" onclick="setPaletteView('wheel')"><span class="vt-icon">◔</span> Color Wheel</button>
        <button class="view-tab${activePaletteView==='mixing'?' active':''}" data-view="mixing" onclick="setPaletteView('mixing')"><span class="vt-icon">⊞</span> Mixing Chart</button>
        <button class="view-tab${activePaletteView==='brush'?' active':''}" data-view="brush" onclick="setPaletteView('brush')"><span class="vt-icon">🖌</span> Mix Studio</button>
      </div>
    </div>
    <div class="palette-notes-wrap">
      <textarea class="palette-notes-input" rows="2" placeholder="Notes about this palette — subjects, techniques, color relationships…" onchange="savePaletteNotes('${pal.id}',this.value)">${pal.notes||''}</textarea>
    </div>
    <div class="palette-view" id="palette-view-content"></div>`;
  renderPaletteView(pal);
}

function setPaletteView(v){
  activePaletteView=v;
  const pal=palettes.find(p=>p.id===activePaletteId);
  if(!pal) return;
  document.querySelectorAll('.view-tab').forEach(t=>{
    t.classList.toggle('active', t.dataset.view===v);
  });
  renderPaletteView(pal);
}

function renderPaletteView(pal){
  clearQ();
  const content=document.getElementById('palette-view-content');
  if(!content) return;
  if(!pal.colors.length){
    content.innerHTML='<div class="empty-palette-view">No colors yet. Click <strong>+ Add Colors</strong> to browse the brand reference and add paints you own.</div>';
    return;
  }
  if(activePaletteView==='swatch') renderSwatchView(pal,content);
  else if(activePaletteView==='wheel') renderWheelView(pal,content);
  else if(activePaletteView==='mixing') renderMixingView(pal,content);
  else if(activePaletteView==='brush') renderBrushView(pal,content);
}

// ── SWATCH GRID ──────────────────────────────────────────────
var mixModeActive=false;      // whether "Mix Colors" selection mode is on
var mixSelectedIdxs=[];       // real indices (into pal.colors) currently selected for mixing

// Mix-selection indices are only valid for the palette they were chosen from.
// Call this any time the active palette changes (switching, duplicating,
// deleting, loading a starter palette, or restoring a backup) so a stale
// selection can't silently point at the wrong swatches in a different palette.
function resetMixModeState(){
  mixModeActive=false;
  mixSelectedIdxs=[];
}

function toggleMixMode(palId){
  mixModeActive=!mixModeActive;
  mixSelectedIdxs=[];
  const pal=palettes.find(p=>p.id===palId);
  if(pal) renderPaletteView(pal);
}

function toggleMixSelect(palId,idx){
  const pal=palettes.find(p=>p.id===palId);
  if(!pal) return;
  hapticTap();
  const pos=mixSelectedIdxs.indexOf(idx);
  if(pos>-1) mixSelectedIdxs.splice(pos,1);
  else {
    if(mixSelectedIdxs.length>=4){ showToast('You can mix up to 4 colors at once'); return; }
    mixSelectedIdxs.push(idx);
  }
  renderPaletteView(pal);
}

function renderSwatchView(pal,content){
  clearQ();
  // Sort bar HTML — sort modes live in one dropdown; Mix Colors stays its
  // own dedicated button since it's an action, not a sort order.
  const SORT_OPTIONS=[
    {v:'custom',   label:'✦ Custom Order'},
    {v:'hue',      label:'🌈 By Hue'},
    {v:'lf',       label:'⭐ By Lightfastness'},
    {v:'brand',    label:'🏷 By Brand'},
    {v:'transparency', label:'◐ By Opacity'},
  ];
  const sortBar=`<div class="palette-sort-bar">
    <select class="sort-dropdown" onchange="setPalSort(this.value,'${pal.id}')" aria-label="Sort colors">
      ${SORT_OPTIONS.map(o=>`<option value="${o.v}"${palSortMode===o.v?' selected':''}>${o.label}</option>`).join('')}
    </select>
    <button class="sort-btn mix-toggle-btn${mixModeActive?' active':''}" onclick="toggleMixMode('${pal.id}')">🧪 ${mixModeActive?'Cancel Mixing':'Mix Colors'}</button>
    <span class="sort-label">${pal.colors.length} colors${palSortMode==='custom'&&!mixModeActive?' · drag ⠿ to reorder':''}${mixModeActive?' · tap swatches to select':''}${!mixModeActive?' · tap a swatch for dilution guide':''}</span>
  </div>`;

  const sorted=getSortedColors(pal);
  const customColors=sorted.filter(c=>c.custom);
  const paintColors=sorted.filter(c=>!c.custom);

  function cardHtml(c){
    const realIdx=pal.colors.findIndex(x=>x===c);
    const note=c.note||'';
    const photo=getColorPhoto(c);
    const hasPhoto=!!photo;
    const showPhoto=hasPhoto&&isColorPhotoVisible(c);
    const isSelected=mixModeActive&&mixSelectedIdxs.includes(realIdx);
    const selectOverlay=mixModeActive?`<button class="sg-mix-select${isSelected?' checked':''}" onclick="toggleMixSelect('${pal.id}',${realIdx})" title="Select for mixing">${isSelected?'✓':''}</button>`:'';
    const clickToSelect=mixModeActive?` onclick="toggleMixSelect('${pal.id}',${realIdx})"`:'';
    return `<div class="sg-card${c.custom?' sg-custom':''}${isSelected?' sg-selected-for-mix':''}" draggable="false" data-idx="${realIdx}" data-palid="${pal.id}"${clickToSelect}>
        ${(palSortMode==='custom'&&!mixModeActive&&!c.custom)?`<button class="sg-handle" title="Drag to reorder" aria-label="Drag to reorder">⠿</button>`:''}
        ${selectOverlay}
        <div class="sg-swatch"${mixModeActive?'':` onclick="openDilutionModal('${pal.id}',${realIdx})" title="Tap for full paint details"`} style="background:${c.hex};">
          <canvas id="sgc_${pal.id}_${realIdx}" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;${showPhoto?'opacity:0;':''}"></canvas>
          <div class="sg-photo${showPhoto?' visible':''}" id="sgp_${pal.id}_${realIdx}" style="${photo?'background-image:url('+photo+');':''}"></div>
          ${!mixModeActive?`<button class="sg-del" onclick="event.stopPropagation();removeFromPalette('${pal.id}',${realIdx})">✕</button>
          <button class="sg-cam" id="sgcam_${pal.id}_${realIdx}" title="${hasPhoto?'Replace or remove photo':'Attach photo'}" onclick="event.stopPropagation();swatchCamAction('${pal.id}',${realIdx},${hasPhoto})">${hasPhoto?'📷✓':'📷'}</button>
          <button class="sg-photo-toggle${hasPhoto?' has-photo':''}" id="sgt_${pal.id}_${realIdx}" onclick="event.stopPropagation();toggleSwatchPhoto('${pal.id}',${realIdx})" title="Toggle photo/render">${showPhoto?'◼ render':'🖼 photo'}</button>
          <button class="sg-dilute-hint" title="Tap swatch for full paint details">ℹ</button>`:''}
          ${c.custom?'<span class="sg-custom-badge" title="Custom mixed color">🧪 Mixed</span>':''}
        </div>
        <div class="sg-body">
          <div class="sg-name">${c.name}</div>
          <div class="sg-pig">${c.custom?(c.mixedFrom||[]).join(' + '):c.pigment}</div>
          <div class="sg-meta">
            ${c.custom?'':`<span class="lbadge lf-${c.lf}">${c.lf}</span>`}
            <span class="sg-brand">${c.custom?'Custom mix':(BRAND_LABELS[c.brand]||c.brand)}</span>
          </div>
        </div>
        ${!mixModeActive?`<div class="sg-note-wrap">
          <input class="sg-note-input" type="text" placeholder="Add a note…" value="${note.replace(/"/g,'&quot;')}" 
            onchange="saveColorNote('${pal.id}',${realIdx},this.value)"
            onfocus="this.parentElement.parentElement.setAttribute('draggable','false')"
            onblur="this.parentElement.parentElement.setAttribute('draggable','${(palSortMode==='custom'&&!mixModeActive)?'true':'false'}')">
        </div>`:''}
      </div>`;
  }

  let gridsHtml='';
  if(customColors.length){
    gridsHtml+=`<div class="sg-section-label">🧪 Custom Mixes</div><div class="swatch-grid sg-custom-grid">${customColors.map(cardHtml).join('')}</div>`;
    if(paintColors.length) gridsHtml+=`<div class="sg-section-label">Paints</div>`;
  }
  gridsHtml+=`<div class="swatch-grid" id="sg_${pal.id}">${paintColors.map(cardHtml).join('')}</div>`;

  // Floating mix preview bar — shown only while 2+ swatches are selected
  const mixBarHtml=mixModeActive?renderMixBarHtml(pal):'';

  content.innerHTML=sortBar+gridsHtml+mixBarHtml;
  if(!mixModeActive) initDragDrop(pal);

  // Queue canvas renders via IntersectionObserver
  if(window._sgIO) window._sgIO.disconnect();
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting) return;
      const cv=e.target;
      // data-idx lives on the parent .sg-card, not the canvas itself.
      const card=cv.closest('.sg-card');
      if(!card) return;
      const idx=parseInt(card.dataset.idx);
      const c=pal.colors[idx];
      if(!c) return;
      const W=cv.parentElement.offsetWidth||120;
      const H=cv.parentElement.offsetHeight||80;
      queueRender(()=>renderSwatchCanvas(cv,c.hex,c.gran,c.transparency,W,H));
      io.unobserve(cv);
    });
  },{rootMargin:'200px'});

  // Observe all canvas elements in the grid regardless of sort order
  content.querySelectorAll('canvas[id^="sgc_"]').forEach(cv=>io.observe(cv));
  window._sgIO=io;
}

