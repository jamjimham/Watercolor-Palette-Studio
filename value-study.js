// ─────────────────────────────────────────────────────────────
// sort-drag-photo.js
// Swatch sort modes, drag-to-reorder, and swatch photo attachment.
// (source: original index.html lines 5010-5321)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// SORT & DRAG-DROP
// Double-tap/long-press a card to enter drag mode, then drag to reorder
// ══════════════════════════════════════════════════════════════
var palSortMode = 'custom';

function setPalSort(mode, palId) {
  palSortMode = mode;
  var pal = palettes.find(function(p){ return p.id === palId; });
  if (!pal) return;
  if (mode !== 'custom') {
    pal.colors = getSortedColors(pal);
    savePalettes(palettes);
  }
  renderPaletteView(pal);
}

// hexToHslSort is an alias for hexToHsl (same logic, kept for call-site compatibility)
var hexToHslSort = hexToHsl;

function getSortedColors(pal) {
  var colors = pal.colors.slice();
  if (palSortMode==='custom') return colors;
  if (palSortMode==='hue') {
    // Cache hsl values to avoid repeated computation during sort
    const hslCache = new Map();
    const getHsl = hex => {
      if (!hslCache.has(hex)) hslCache.set(hex, hexToHslSort(hex));
      return hslCache.get(hex);
    };
    return colors.sort(function(a,b){
      var [ha,,] = getHsl(a.hex), [hb,,] = getHsl(b.hex);
      var sa = getHsl(a.hex)[1], sb = getHsl(b.hex)[1];
      if (sa<10&&sb>=10) return 1; if (sb<10&&sa>=10) return -1;
      return ha-hb;
    });
  }
  if (palSortMode==='lf') {
    var o={'I':0,'II':1,'III':2,'NR':3};
    return colors.sort(function(a,b){ return (o[a.lf]||3)-(o[b.lf]||3); });
  }
  if (palSortMode==='brand') {
    return colors.sort(function(a,b){ return a.brand.localeCompare(b.brand)||a.name.localeCompare(b.name); });
  }
  if (palSortMode==='transparency') {
    var t={'T':0,'ST':1,'O':2};
    return colors.sort(function(a,b){ return (t[a.transparency]||1)-(t[b.transparency]||1); });
  }
  return colors;
}

// ── DRAG STATE ──
var dragSrcIdx = null;
var dragPalId  = null;
var _dragModeCard = null; // card currently in drag mode

function enterDragMode(card) {
  // Exit any previously active drag mode card
  if (_dragModeCard && _dragModeCard !== card) exitDragMode(_dragModeCard);
  _dragModeCard = card;
  card.classList.add('drag-ready');
  card.setAttribute('draggable', 'true');
  // Haptic feedback on iOS if available
  if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(30);
  showToast('Drag mode — move to reorder');
}

function exitDragMode(card) {
  if (!card) return;
  card.classList.remove('drag-ready','dragging');
  card.setAttribute('draggable','false');
  if (_dragModeCard === card) _dragModeCard = null;
}

function initDragDrop(pal) {
  var sgGrid = document.getElementById('sg_'+pal.id);
  if (!sgGrid) return;

  sgGrid.querySelectorAll('.sg-card').forEach(function(card) {
    var handle = card.querySelector('.sg-handle');
    if (!handle) return; // not in custom sort mode

    // ── DESKTOP: mousedown on handle arms drag, dragstart fires naturally ──
    handle.addEventListener('mousedown', function(e) {
      e.stopPropagation();
      enterDragMode(card);
    });

    card.addEventListener('dragstart', function(e) {
      if (!card.classList.contains('drag-ready')) { e.preventDefault(); return; }
      dragSrcIdx = parseInt(card.dataset.idx);
      dragPalId  = card.dataset.palid;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
    });
    card.addEventListener('dragend', function() {
      card.classList.remove('dragging');
      exitDragMode(card);
      sgGrid.querySelectorAll('.sg-card').forEach(function(c){ c.classList.remove('drag-over'); });
    });
    card.addEventListener('dragover', function(e) {
      if (!dragSrcIdx && dragSrcIdx!==0) return;
      e.preventDefault(); e.dataTransfer.dropEffect='move';
      sgGrid.querySelectorAll('.sg-card').forEach(function(c){ c.classList.remove('drag-over'); });
      card.classList.add('drag-over');
    });
    card.addEventListener('drop', function(e) {
      e.preventDefault();
      var toIdx=parseInt(card.dataset.idx);
      if (dragSrcIdx===null||dragSrcIdx===toIdx||dragPalId!==pal.id) return;
      var p=palettes.find(function(x){ return x.id===pal.id; });
      if (!p) return;
      var moved=p.colors.splice(dragSrcIdx,1)[0];
      p.colors.splice(toIdx,0,moved);
      savePalettes(palettes);
      dragSrcIdx=null;
      renderPaletteView(p);
    });

    // ── MOBILE: touch directly on the handle starts the drag, no delay ──
    var touchDragging = false;

    handle.addEventListener('touchstart', function(e) {
      e.stopPropagation();
      enterDragMode(card);
      touchDragging = true;
    }, {passive:true});

    card.addEventListener('touchmove', function(e) {
      if (!card.classList.contains('drag-ready') || !touchDragging) return;
      e.preventDefault();

      var t=e.touches[0];
      if (!window._touchClone) {
        window._touchClone=card.cloneNode(true);
        window._touchClone.style.cssText='position:fixed;opacity:0.75;pointer-events:none;z-index:9999;width:'+card.offsetWidth+'px;transform:scale(1.05);border-radius:5px;box-shadow:0 8px 24px rgba(0,0,0,0.25);transition:none;';
        document.body.appendChild(window._touchClone);
      }
      window._touchClone.style.left=(t.clientX-card.offsetWidth/2)+'px';
      window._touchClone.style.top=(t.clientY-card.offsetHeight/2)+'px';

      // Find card under finger
      window._touchClone.style.display='none';
      var el=document.elementFromPoint(t.clientX,t.clientY);
      window._touchClone.style.display='';
      var target=el?el.closest('.sg-card'):null;
      sgGrid.querySelectorAll('.sg-card').forEach(function(c){c.classList.remove('drag-over');});
      if (target&&target!==card) target.classList.add('drag-over');
    }, {passive:false});

    card.addEventListener('touchend', function(e) {
      if (window._touchClone) { window._touchClone.remove(); window._touchClone=null; }
      sgGrid.querySelectorAll('.sg-card').forEach(function(c){c.classList.remove('drag-over');});

      if (!touchDragging||!card.classList.contains('drag-ready')) {
        exitDragMode(card);
        touchDragging=false;
        return;
      }

      var t=e.changedTouches[0];
      var el=document.elementFromPoint(t.clientX,t.clientY);
      var target=el?el.closest('.sg-card'):null;

      exitDragMode(card);
      touchDragging=false;

      if (!target||target===card) return;
      var fromIdx=parseInt(card.dataset.idx), toIdx=parseInt(target.dataset.idx);
      var p=palettes.find(function(x){ return x.id===pal.id; });
      if (!p) return;
      var moved=p.colors.splice(fromIdx,1)[0];
      p.colors.splice(toIdx,0,moved);
      savePalettes(palettes);
      renderPaletteView(p);
    });

    card.addEventListener('touchcancel', function() {
      if (window._touchClone) { window._touchClone.remove(); window._touchClone=null; }
      exitDragMode(card);
      touchDragging=false;
    });
  });

  // Click on grid background exits drag mode
  sgGrid.addEventListener('click', function(e) {
    if (!e.target.closest('.sg-card') && _dragModeCard) exitDragMode(_dragModeCard);
  });
}

// ── UTILITY FUNCTIONS ──
function debounce(fn, ms){
  var timer;
  return function(){
    var args=arguments, ctx=this;
    clearTimeout(timer);
    timer=setTimeout(function(){ fn.apply(ctx,args); }, ms);
  };
}

function saveColorNote(palId, idx, note){
  var pal = palettes.find(function(p){ return p.id===palId; });
  if (!pal || !pal.colors[idx]) return;
  pal.colors[idx].note = note;
  savePalettes(palettes);
}

// ══════════════════════════════════════════════════════════════
// SWATCH PHOTO ATTACHMENT
// ══════════════════════════════════════════════════════════════
function triggerPhotoUpload(palId, idx){
  // Reuse or create a hidden file input
  var inputId='_photoinput_'+palId+'_'+idx;
  var inp=document.getElementById(inputId);
  if(!inp){
    inp=document.createElement('input');
    inp.type='file'; inp.accept='image/*'; inp.capture='environment';
    inp.id=inputId; inp.className='sg-file-input';
    document.body.appendChild(inp);
    inp.addEventListener('change',function(){
      var file=inp.files[0]; if(!file) return;
      // Resize to max 400px wide before storing as base64 to keep localStorage lean
      var reader=new FileReader();
      reader.onload=function(ev){
        var img=new Image();
        img.onload=function(){
          var MAX=400;
          var scale=Math.min(1,MAX/Math.max(img.width,img.height));
          var w=Math.round(img.width*scale), h=Math.round(img.height*scale);
          var cv=document.createElement('canvas'); cv.width=w; cv.height=h;
          cv.getContext('2d').drawImage(img,0,0,w,h);
          var dataUrl=cv.toDataURL('image/jpeg',0.82);
          var pal=palettes.find(function(p){return p.id===palId;});
          if(!pal||!pal.colors[idx]) return;
          pal.colors[idx].photo=dataUrl;
          pal.colors[idx].photoVisible=true;
          savePalettes(palettes);
          // Update DOM without full re-render
          var photoDiv=document.getElementById('sgp_'+palId+'_'+idx);
          var canvasEl=document.getElementById('sgc_'+palId+'_'+idx);
          var toggleBtn=document.getElementById('sgt_'+palId+'_'+idx);
          if(photoDiv){photoDiv.style.backgroundImage='url('+dataUrl+')';photoDiv.classList.add('visible');}
          if(canvasEl){canvasEl.style.opacity='0';}
          if(toggleBtn){toggleBtn.classList.add('has-photo');toggleBtn.textContent='◼ render';}
          showToast('Photo attached');
        };
        img.src=ev.target.result;
      };
      reader.readAsDataURL(file);
      inp.value=''; // reset so same file can be re-selected
    });
  }
  inp.click();
}

function swatchCamAction(palId, idx, hasPhoto){
  if(!hasPhoto){ triggerPhotoUpload(palId,idx); return; }
  // Show a tiny action sheet-style popup
  var existing=document.getElementById('_cam_menu');
  if(existing) existing.remove();
  var menu=document.createElement('div');
  menu.id='_cam_menu';
  menu.style.cssText='position:fixed;z-index:9999;background:white;border:1px solid var(--border);border-radius:6px;box-shadow:0 4px 16px rgba(30,23,16,0.18);padding:0.3rem 0;min-width:160px;font-family:Crimson Pro,serif;font-size:0.88rem;';
  menu.innerHTML=[
    '<div style="padding:0.45rem 1rem;cursor:pointer;color:var(--ink);" id="_cmr">🔄 Replace photo</div>',
    '<div style="padding:0.45rem 1rem;cursor:pointer;color:var(--rust);" id="_cmd">🗑 Remove photo</div>',
    '<div style="padding:0.45rem 1rem;cursor:pointer;color:var(--ink3);" id="_cmc">Cancel</div>'
  ].join('');
  document.body.appendChild(menu);
  // Position near the camera button
  var btn=event.currentTarget||event.target;
  var r=btn.getBoundingClientRect();
  menu.style.left=Math.min(r.left, window.innerWidth-170)+'px';
  menu.style.top=(r.bottom+4)+'px';
  var dismiss=function(){menu.remove();document.removeEventListener('click',outsideClick,true);};
  var outsideClick=function(e){if(!menu.contains(e.target))dismiss();};
  setTimeout(function(){document.addEventListener('click',outsideClick,true);},10);
  document.getElementById('_cmr').onclick=function(){dismiss();triggerPhotoUpload(palId,idx);};
  document.getElementById('_cmd').onclick=function(){dismiss();removeSwatchPhoto(palId,idx);};
  document.getElementById('_cmc').onclick=dismiss;
}

function toggleSwatchPhoto(palId, idx){
  var pal=palettes.find(function(p){return p.id===palId;});
  if(!pal||!pal.colors[idx]||!pal.colors[idx].photo) return;
  var c=pal.colors[idx];
  c.photoVisible=!c.photoVisible;
  savePalettes(palettes);
  var photoDiv=document.getElementById('sgp_'+palId+'_'+idx);
  var canvasEl=document.getElementById('sgc_'+palId+'_'+idx);
  var toggleBtn=document.getElementById('sgt_'+palId+'_'+idx);
  if(photoDiv) photoDiv.classList.toggle('visible',c.photoVisible);
  if(canvasEl) canvasEl.style.opacity=c.photoVisible?'0':'';
  if(toggleBtn) toggleBtn.textContent=c.photoVisible?'◼ render':'🖼 photo';
}

function removeSwatchPhoto(palId, idx){
  var pal=palettes.find(function(p){return p.id===palId;});
  if(!pal||!pal.colors[idx]) return;
  delete pal.colors[idx].photo;
  delete pal.colors[idx].photoVisible;
  savePalettes(palettes);
  renderSwatchView(pal, document.getElementById('palette-view-content'));
  showToast('Photo removed');
}

var debouncedRenderRef     = debounce(renderRef, 200);
var debouncedRenderOpacity = debounce(renderOpacityChart, 200);
var debouncedRenderPigment = debounce(renderPigmentCompare, 200);
var debouncedRenderRecipes = debounce(renderRecipes, 200);
var debouncedRenderShopGrid = debounce(renderShopGrid, 200);

