// ─────────────────────────────────────────────────────────────
// color-matcher.js
// "Match a Color" — the inverse-mixing solver UI (search logic itself
// lives in rendering-engine.js; this file is the panel that calls it).
// (source: original index.html lines 3403-3493)
// ─────────────────────────────────────────────────────────────

// ── MATCH A COLOR: inverse mixing solver UI ─────────────────────────
function renderColorMatchSub(pal,content){
  content.innerHTML=`
    <div class="match-note">Pick a target color and this searches your palette for the closest 1-, 2-, and 3-paint mixes (using the same Kubelka-Munk math as the Mixing Chart), ranked by perceptual color distance (ΔE). Ratios are rounded to the nearest 5% — the resolution that's actually usable with a brush.</div>
    <div class="match-target-row">
      <div class="match-target-swatch" id="match-target-swatch" style="background:${lastMatchTargetHex};"></div>
      <div class="match-target-controls">
        <input type="color" class="match-color-input" id="match-color-input" value="${lastMatchTargetHex}" onchange="onMatchColorPick(this.value,'${pal.id}')">
        <input type="text" class="match-hex-input" id="match-hex-input" value="${lastMatchTargetHex.toUpperCase()}" maxlength="7" onchange="onMatchHexTyped(this.value,'${pal.id}')">
        <button class="match-find-btn" onclick="runColorMatch('${pal.id}')">Find Mixes</button>
      </div>
    </div>
    <div class="match-results" id="match-results">
      <div class="match-empty">Tap "Find Mixes" to search this palette.</div>
    </div>`;
}

function onMatchColorPick(hex,palId){
  lastMatchTargetHex=hex;
  const hexInput=/** @type {HTMLInputElement} */(document.getElementById('match-hex-input'));
  if(hexInput) hexInput.value=hex.toUpperCase();
  const sw=document.getElementById('match-target-swatch');
  if(sw) sw.style.background=hex;
}
function onMatchHexTyped(val,palId){
  let hex=val.trim();
  if(!/^#/.test(hex)) hex='#'+hex;
  if(!/^#[0-9a-fA-F]{6}$/.test(hex)){ showToast('Enter a valid hex color, e.g. #8a6a4a'); return; }
  lastMatchTargetHex=hex;
  const colorInput=/** @type {HTMLInputElement} */(document.getElementById('match-color-input'));
  if(colorInput) colorInput.value=hex;
  const sw=document.getElementById('match-target-swatch');
  if(sw) sw.style.background=hex;
}

function runColorMatch(palId){
  const pal=palettes.find(p=>p.id===palId);
  if(!pal) return;
  const resultsEl=document.getElementById('match-results');
  if(!resultsEl) return;
  resultsEl.innerHTML='<div class="match-empty">Searching…</div>';
  // Defer one tick so the "Searching…" state actually paints before the
  // (synchronous, occasionally ~200ms) search runs.
  setTimeout(()=>{
    const candidates=pal.colors; // includes any custom/mixed swatches already in the palette
    const matches=findColorMatches(candidates, lastMatchTargetHex, {maxResults:6});
    if(!matches.length){ resultsEl.innerHTML='<div class="match-empty">No colors in this palette to search yet.</div>'; return; }
    resultsEl.innerHTML=matches.map((m,mi)=>{
      const label=deltaELabel(m.de);
      const formula=m.idxs.map((idx,n)=>{
        const pct=Math.round(m.weights[n]*100);
        return m.idxs.length===1?`<b>${candidates[idx].name}</b> (as-is)`:`${pct}% <b>${candidates[idx].name}</b>`;
      }).join(' + ');
      return `<div class="match-result-card">
        <div class="match-result-swatch" style="background:${m.mixedHex};"></div>
        <div class="match-result-info">
          <div class="match-result-formula">${formula}</div>
          <div class="match-result-de ${label.cls}">${label.text} · ΔE ${m.de.toFixed(1)}</div>
        </div>
        ${m.idxs.length>1?`<button class="match-add-btn" onclick='addSolverMixToPalette("${pal.id}",${mi})'>+ Add to Palette</button>`:''}
      </div>`;
    }).join('');
    // Stash the raw match data so "Add to Palette" doesn't need to re-run the search
    /** @type {*} */ (resultsEl)._lastMatches=matches;
    /** @type {*} */ (resultsEl)._lastCandidates=candidates;
  },10);
}

function addSolverMixToPalette(palId,matchIndex){
  const pal=palettes.find(p=>p.id===palId);
  /** @type {*} */
  const resultsEl=document.getElementById('match-results');
  if(!pal||!resultsEl||!resultsEl._lastMatches) return;
  const m=resultsEl._lastMatches[matchIndex];
  const candidates=resultsEl._lastCandidates;
  if(!m) return;
  const sel=m.idxs.map(i=>candidates[i]);
  const transRank={T:0,ST:1,O:2};
  const transp=sel.reduce((worst,c)=>transRank[c.transparency||'ST']>transRank[worst]?(c.transparency||'ST'):worst,'T');
  const gran=sel.some(c=>c.gran);
  const pctNames=sel.map((c,n)=>`${Math.round(m.weights[n]*100)}% ${c.name.split(' ')[0]}`).join(' + ');
  const newColor={
    group:'Custom', name:pctNames, brand:'custom', pigment:'', hex:m.mixedHex,
    lf:'', transparency:transp, gran:gran, single:false, grade:'', notes:'',
    custom:true, mixedFrom:sel.map((c,n)=>`${Math.round(m.weights[n]*100)}% ${c.name}`)
  };
  pal.colors.push(newColor);
  savePalettes(palettes);
  renderPaletteList();
  showToast(`"${pctNames}" added to palette`);
}

