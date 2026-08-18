// ─────────────────────────────────────────────────────────────
// palette-actions-chip.js
// Palette CRUD actions (create/rename/duplicate/delete), and the
// paint-detail "chip" modal shared by the Palette and Reference tabs.
// (source: original index.html lines 3738-3978)
// ─────────────────────────────────────────────────────────────

// ── PALETTE ACTIONS ──────────────────────────────────────────
function openNewPaletteModal(){
  document.getElementById('new-palette-name').value='';
  document.getElementById('modal-new').classList.add('open');
  setTimeout(()=>document.getElementById('new-palette-name').focus(),100);
}

document.getElementById('new-palette-name').addEventListener('keydown',e=>{
  if(e.key==='Enter') createPalette();
  if(e.key==='Escape') closeModal('modal-new');
});

function createPalette(){
  const name=document.getElementById('new-palette-name').value.trim()||'New Palette';
  const pal={id:genId(),name,colors:[]};
  palettes.push(pal);
  savePalettes(palettes);
  activePaletteId=pal.id;
  resetMixModeState();
  closeModal('modal-new');
  renderPaletteList();
  showToast(`"${name}" created`);
}

function renamePalette(id,name){
  const p=palettes.find(x=>x.id===id);
  if(p){p.name=name||'Untitled';savePalettes(palettes);renderPaletteList();}
}

function duplicatePalette(e,id){
  e.stopPropagation();
  const p=palettes.find(x=>x.id===id);
  if(!p) return;
  const copy={
    id:genId(),
    name:p.name+' (copy)',
    colors:p.colors.map(c=>({...c})),
    notes:p.notes||''
  };
  palettes.push(copy);
  savePalettes(palettes);
  activePaletteId=copy.id;
  resetMixModeState();
  renderPaletteList();
  showToast(`"${p.name}" duplicated`);
}

// ── DILUTION CONSISTENCY MODAL ───────────────────────────────
// Badge/label lookup tables for the paint chip modal
const LF_LABELS={I:'Excellent lightfastness',II:'Very good lightfastness',III:'Fair — may fade over time',IV:'Poor — fades noticeably'};
const TRANSPARENCY_LABELS={T:'Transparent',ST:'Semi-transparent',O:'Opaque'};
const STAINING_LABELS={high:'Staining',moderate:'Semi-staining',low:'Lifts easily'};

let _chipCurrentPalId=null, _chipCurrentIdx=null, _chipOpenColor=null;

function openDilutionModal(palId, idx){
  const pal=palettes.find(p=>p.id===palId);
  if(!pal) return;
  const c=pal.colors[idx];
  if(!c) return;
  _chipCurrentPalId=palId; _chipCurrentIdx=idx;
  _chipOpenColor=null;
  populateChipModal(c, false);
}

// Opens the same paint-detail chip used in the Palette tab, but for a raw
// color from the reference database rather than one already living inside
// a palette — this is what Brand Reference cards now open on tap, instead
// of the old hover-only "+ Add to Palette" overlay (which needed a second
// tap to actually register on touch devices anyway). Notes have nowhere to
// persist for a color that isn't in any palette yet, so that section hides;
// an Add to Palette control takes its place instead.
function openRefChip(name, brand, medium){
  const c=COLORS.find(x=>x.name===name && x.brand===brand && (x.medium||'watercolor')===(medium||'watercolor'));
  if(!c) return;
  _chipCurrentPalId=null; _chipCurrentIdx=null;
  _chipOpenColor={name:c.name, brand:c.brand, medium:c.medium};
  populateChipModal(c, true);
}

function populateChipModal(c, isReferenceMode){
  // ── Title block ──
  document.getElementById('chip-color-name').textContent=c.name;
  document.getElementById('chip-brand').textContent = c.custom ? 'Custom mix' : (BRAND_LABELS[c.brand]||c.brand);
  const pigEl=document.getElementById('chip-pigment');
  if(c.custom){
    pigEl.textContent=(c.mixedFrom||[]).join(' + ');
  } else {
    pigEl.textContent=c.pigment||'';
    pigEl.style.display=c.pigment?'':'none';
  }
  document.getElementById('chip-custom-badge').style.display=c.custom?'block':'none';

  // ── Manufacturer website link ──
  const brandLink=document.getElementById('chip-brand-link');
  const websiteUrl = !c.custom && BRAND_WEBSITES[c.brand];
  if(websiteUrl){
    brandLink.href=websiteUrl;
    brandLink.style.display='';
  } else {
    brandLink.style.display='none';
  }

  // ── Badges: transparency, granulation, staining, lightfastness ──
  const staining=c.custom ? 'moderate' : estimateStaining(c.pigment);
  const badges=[];
  if(!c.custom){
    badges.push(`<div class="chip-badge" title="${TRANSPARENCY_LABELS[c.transparency]||''}"><span class="cb-icon">◐</span>${TRANSPARENCY_LABELS[c.transparency]||c.transparency}</div>`);
  }
  if(c.gran) badges.push(`<div class="chip-badge" title="Granulating — settles into paper texture"><span class="cb-icon">◦◦</span>Granulating</div>`);
  badges.push(`<div class="chip-badge cb-stain-${staining==='high'?'high':staining==='low'?'low':''}" title="Estimated from pigment chemistry"><span class="cb-icon">💧</span>${STAINING_LABELS[staining]}</div>`);
  if(!c.custom && c.lf){
    badges.push(`<div class="chip-badge cb-lf-${c.lf}" title="${LF_LABELS[c.lf]||''}"><span class="cb-icon">⭐</span>Lightfastness ${c.lf}</div>`);
  }
  if(!c.custom && c.single) badges.push(`<div class="chip-badge" title="A single pigment, not a blend"><span class="cb-icon">●</span>Single Pigment</div>`);
  document.getElementById('chip-badges').innerHTML=badges.join('');

  // ── Hero swatch ──
  requestAnimationFrame(()=>{
    const hero=document.getElementById('chip-hero-canvas');
    const W=hero.parentElement.offsetWidth||440, H=150;
    renderSwatchCanvas(hero, c.hex, c.gran, c.transparency||'ST', W, H, c.medium);
  });

  // ── Dry shift ──
  const shift=estimateDryShift(c.transparency||'ST', !!c.gran, c.medium);
  document.getElementById('chip-dryshift-level').textContent=shift.level+' shift ('+shift.pct+')';
  document.getElementById('chip-dryshift-desc').textContent=shift.desc;
  const wetSample=document.getElementById('chip-wet-sample'), drySample=document.getElementById('chip-dry-sample');
  // "Dry" preview: the true rendered hex, since the rest of the app already
  // treats stored hex values as the dry/settled appearance of each paint.
  // "Wet" preview: darker and more saturated than dry, since watercolor
  // reliably dries lighter than it looks while wet on the paper. Nudging
  // lightness down and saturation up (rather than a flat lerp toward black)
  // keeps it looking like a glistening wash instead of going muddy/grey.
  const [wh,ws,wl]=hexToHsl(c.hex);
  const wetHex=hslToHex(wh, Math.min(100, ws+8), Math.max(0, wl-16));
  wetSample.style.background=wetHex;
  drySample.style.background=c.hex;

  // ── Dilution strip (existing feature, folded into the chip) ──
  const labelsWrap=document.getElementById('dilution-labels');
  labelsWrap.innerHTML=DILUTION_STOPS.map(s=>
    `<div class="dilution-label-cell"><div class="dilution-label-name">${s.label}</div><div class="dilution-label-sub">${s.sub}</div></div>`
  ).join('');

  // ── Notes vs. Add-to-Palette: mutually exclusive depending on context.
  // A color that isn't in any palette yet has nowhere for a note to live,
  // so that section is replaced by the ability to add it to one instead.
  const notesSection=document.getElementById('chip-notes-section');
  const addpalSection=document.getElementById('chip-addpal-section');
  if(isReferenceMode){
    notesSection.style.display='none';
    addpalSection.style.display='';
    const sel=document.getElementById('chip-addpal-select');
    sel.innerHTML=paletteOptionsHtml();
  } else {
    notesSection.style.display='';
    addpalSection.style.display='none';
    const notesInput=document.getElementById('chip-notes-input');
    notesInput.value=c.note||'';
  }

  const modal=document.getElementById('modal-dilution');
  modal.classList.add('open');
  hapticTap();

  requestAnimationFrame(()=>{
    const cv=document.getElementById('dilution-strip-canvas');
    const W=cv.parentElement.offsetWidth||440, H=100;
    renderDilutionStrip(cv, c.hex, c.gran, c.transparency||'ST', W, H, c.medium);
  });
}

function chipAddToPalette(){
  const sel=document.getElementById('chip-addpal-select');
  if(!sel || !_chipOpenColor) return;
  addColorToPalette(sel.value, _chipOpenColor.name, _chipOpenColor.brand, _chipOpenColor.medium);
  closeDilutionModal();
}

function closeDilutionModal(){
  // Persist any note change on close, same as the note field elsewhere in the app
  if(_chipCurrentPalId!==null && _chipCurrentIdx!==null){
    const notesInput=document.getElementById('chip-notes-input');
    if(notesInput){
      saveColorNote(_chipCurrentPalId, _chipCurrentIdx, notesInput.value);
      // Keep the swatch card's own note field in sync without a full
      // re-render, so it doesn't show stale text until the palette is
      // switched away from and back.
      const card=document.querySelector(`.sg-card[data-palid="${_chipCurrentPalId}"][data-idx="${_chipCurrentIdx}"]`);
      const cardNoteInput=card?card.querySelector('.sg-note-input'):null;
      if(cardNoteInput) cardNoteInput.value=notesInput.value;
    }
  }
  document.getElementById('modal-dilution').classList.remove('open');
  _chipCurrentPalId=null; _chipCurrentIdx=null;
  _chipOpenColor=null;
}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    const m=document.getElementById('modal-dilution');
    if(m&&m.classList.contains('open')) closeDilutionModal();
  }
});

function deletePalette(e,id){
  if(e) e.stopPropagation();
  if(!confirm('Delete this palette?')) return;
  palettes=palettes.filter(p=>p.id!==id);
  if(activePaletteId===id) activePaletteId=palettes.length?palettes[0].id:null;
  resetMixModeState();
  savePalettes(palettes);
  renderPaletteList();
  showToast('Palette deleted');
}

function removeFromPalette(palId,idx){
  const pal=palettes.find(p=>p.id===palId);
  if(!pal) return;
  const removed=pal.colors.splice(idx,1)[0];
  savePalettes(palettes);
  renderPaletteList();
  showToast(`${removed.name} removed`);
}

function addColorToPalette(palId,colorName,colorBrand,colorMedium){
  const pal=palettes.find(p=>p.id===palId);
  const col=COLORS.find(c=>c.name===colorName&&c.brand===colorBrand&&(c.medium||'watercolor')===(colorMedium||'watercolor'));
  if(!pal||!col) return;
  const already=pal.colors.some(c=>c.name===col.name&&c.brand===col.brand&&(c.medium||'watercolor')===(col.medium||'watercolor'));
  if(already){showToast('Already in palette');return;}
  pal.colors.push({...col});
  savePalettes(palettes);
  renderPaletteList();
  showToast(`${col.name} added to "${pal.name}"`);
}

function closeModal(id){document.getElementById(id).classList.remove('open');}
document.getElementById('modal-new').addEventListener('click',function(e){if(e.target===this)closeModal('modal-new');});

