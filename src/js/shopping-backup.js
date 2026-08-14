// ─────────────────────────────────────────────────────────────
// shopping-backup.js
// Shopping List, and Backup/Import-Export (incl. diagnostics).
// (source: original index.html lines 5322-5670)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// SHOPPING LIST
// ══════════════════════════════════════════════════════════════
function loadShoppingList(){ try{return JSON.parse(localStorage.getItem('wc_shopping')||'[]');}catch{return[];} }
function saveShoppingList(l){ return safeSetItem('wc_shopping',JSON.stringify(l)); }

// ══════════════════════════════════════════════════════════════
// BACKUP / IMPORT-EXPORT
// ══════════════════════════════════════════════════════════════
function buildBackupObject(){
  return {
    app:'Palette Studio',
    type:'palette-studio-backup',
    version:1,
    exportedAt:new Date().toISOString(),
    data:{
      palettes: palettes,
      tubes: tubeData,
      shopping: shoppingList
    }
  };
}
function backupJSON(){ return JSON.stringify(buildBackupObject(), null, 2); }

// ── BACKUP REMINDER SYSTEM ──
// Tracks meaningful changes since the last export/import and gently nudges
// the user to back up once enough changes accumulate, without being pushy.
var BACKUP_REMINDER_THRESHOLD = 12; // number of save events before nudging
function trackChangeForBackupReminder(){
  try{
    var n = parseInt(localStorage.getItem('wc_changes_since_backup')||'0',10) + 1;
    localStorage.setItem('wc_changes_since_backup', String(n));
    updateBackupReminderBanner(n);
  }catch(e){}
}
function markBackupDone(){
  try{
    localStorage.setItem('wc_changes_since_backup','0');
    localStorage.setItem('wc_last_backup_date', new Date().toISOString());
    updateBackupReminderBanner(0);
  }catch(e){}
}
function dismissBackupReminder(){
  try{ localStorage.setItem('wc_changes_since_backup','0'); }catch(e){}
  var b=document.getElementById('backup-reminder-banner');
  if(b) b.classList.remove('show');
}
function updateBackupReminderBanner(n){
  var b=document.getElementById('backup-reminder-banner');
  if(!b) return;
  if(n>=BACKUP_REMINDER_THRESHOLD) b.classList.add('show');
  else b.classList.remove('show');
}
function goToBackupPage(){
  var moreBtn=document.querySelector('.nav-more-btn');
  showPage('backup', null);
  syncNavTabActive('backup');
  if(typeof closeMobileDrawer==='function') closeMobileDrawer();
}

function renderBackupPage(){
  var stats=document.getElementById('backup-stats');
  if(stats){
    var palCount=palettes.length;
    var colorCount=palettes.reduce(function(n,p){return n+(p.colors?p.colors.length:0);},0);
    var tubeCount=Object.keys(tubeData).length;
    var shopCount=shoppingList.length;
    stats.innerHTML=
       '<div class="backup-stat"><strong>'+palCount+'</strong><span>Palettes</span></div>'
      +'<div class="backup-stat"><strong>'+colorCount+'</strong><span>Colors saved</span></div>'
      +'<div class="backup-stat"><strong>'+tubeCount+'</strong><span>Tubes tracked</span></div>'
      +'<div class="backup-stat"><strong>'+shopCount+'</strong><span>Shopping items</span></div>';
  }
  var ta=document.getElementById('backup-export-text');
  if(ta) ta.value=backupJSON();
}

function downloadBackup(){
  try{
    var blob=new Blob([backupJSON()],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var stamp=new Date().toISOString().slice(0,10);
    var a=document.createElement('a');
    a.href=url; a.download='palette-studio-backup-'+stamp+'.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(url);},1500);
    showToast('Backup downloaded');
    markBackupDone();
  }catch(e){ showToast('Could not download — try Copy as text'); }
}

function copyBackupToClipboard(){
  var text=backupJSON();
  var ta=document.getElementById('backup-export-text');
  if(ta) ta.value=text;
  function fallback(){ if(ta){ta.focus();ta.select();try{document.execCommand('copy');showToast('Backup copied');markBackupDone();}catch(e){showToast('Select the text above and copy manually');}} }
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){showToast('Backup copied');markBackupDone();},fallback);
  }else{ fallback(); }
}

function handleImportFile(input){
  var file=input.files&&input.files[0];
  if(!file) return;
  var reader=new FileReader();
  reader.onload=function(e){ applyImport(e.target.result); input.value=''; };
  reader.onerror=function(){ showToast('Could not read that file'); input.value=''; };
  reader.readAsText(file);
}

function importFromTextarea(){
  var ta=document.getElementById('backup-import-text');
  var text=ta?ta.value.trim():'';
  if(!text){ showToast('Paste backup text first'); return; }
  applyImport(text);
}

function applyImport(text){
  var parsed;
  try{ parsed=JSON.parse(text); }
  catch(e){ showToast('That doesn’t look like valid backup data'); return; }

  // Accept either the wrapped backup ({type, data:{…}}) or a bare data object.
  var d = (parsed && parsed.data) ? parsed.data : parsed;
  if(!d || typeof d!=='object'){ showToast('Backup data is missing or unreadable'); return; }

  var newPalettes = Array.isArray(d.palettes) ? d.palettes : null;
  var newTubes    = (d.tubes && typeof d.tubes==='object' && !Array.isArray(d.tubes)) ? d.tubes : null;
  var newShopping = Array.isArray(d.shopping) ? d.shopping : null;

  if(newPalettes===null && newTubes===null && newShopping===null){
    showToast('No palettes, tubes, or shopping list found in that backup');
    return;
  }

  // Light validation of palette shape
  if(newPalettes){
    newPalettes = newPalettes.filter(function(p){ return p && typeof p==='object' && Array.isArray(p.colors); })
      .map(function(p){ return { id:p.id||genId(), name:p.name||'Untitled', colors:p.colors, notes:p.notes||'' }; });
  }

  var summary=[];
  if(newPalettes) summary.push(newPalettes.length+' palette'+(newPalettes.length===1?'':'s'));
  if(newTubes)    summary.push(Object.keys(newTubes).length+' tracked tubes');
  if(newShopping) summary.push(newShopping.length+' shopping items');

  if(!confirm('Restore '+summary.join(', ')+'?\n\nThis replaces the matching data currently in this browser. (Your other data is left as-is.)')) return;

  if(newPalettes){ palettes=newPalettes; savePalettes(palettes);
    activePaletteId = palettes.length ? palettes[0].id : null;
    resetMixModeState(); }
  if(newTubes){ tubeData=newTubes; saveTubeData(tubeData); }
  if(newShopping){ shoppingList=newShopping; saveShoppingList(shoppingList); }

  // Refresh anything currently on screen
  if(typeof renderPaletteList==='function') renderPaletteList();
  if(typeof renderPaletteArea==='function') renderPaletteArea();
  var it=document.getElementById('backup-import-text'); if(it) it.value='';
  renderBackupPage();
  markBackupDone();
  showToast('Backup restored ✓');
}
var shoppingList = loadShoppingList();
var shopBrand = 'all';
var shopListBrand = 'all'; // filters the existing shopping list (separate from the add-colors brand filter)
var shopSearchBuilt = false;
var shopSearch = '';

function renderShoppingPage(){
  var wrap = document.getElementById('shop-content');
  if (!wrap) return;

  // Summary counts
  var total = shoppingList.length;
  var bought = shoppingList.filter(function(i){ return i.bought; }).length;

  var html = '';

  // Stats bar
  html += '<div class="shop-stats">'
    + '<span class="shop-stat"><strong>'+total+'</strong> items</span>'
    + '<span class="shop-stat-sep">·</span>'
    + '<span class="shop-stat"><strong>'+(total-bought)+'</strong> to buy</span>'
    + '<span class="shop-stat-sep">·</span>'
    + '<span class="shop-stat"><strong>'+bought+'</strong> got it</span>'
    + (bought>0 ? '<button class="shop-clear-btn" onclick="shopClearBought()">Clear bought</button>' : '')
    + '</div>';

  if (!shoppingList.length) {
    html += '<div class="shop-empty">Your list is empty.<br>Browse the Brand Reference or use the search below to add colors.</div>';
  } else {
    // Brand filter for the list itself — only show brands actually present on the list
    var listBrands = [...new Set(shoppingList.map(function(i){return i.brand;}))].sort();
    if (listBrands.length>1) {
      html += '<div class="shop-list-filter" id="shop-list-filter">'
        + '<button class="filt-btn'+(shopListBrand==='all'?' active':'')+'" data-brand="all" onclick="shopSetListBrand(this.dataset.brand,this)">All Brands</button>'
        + listBrands.map(function(b){
            var lbl=BRAND_LABELS[b]||b;
            var cnt=shoppingList.filter(function(i){return i.brand===b;}).length;
            return '<button class="filt-btn'+(shopListBrand===b?' active':'')+'" data-brand="'+b+'" onclick="shopSetListBrand(this.dataset.brand,this)">'+lbl+' ('+cnt+')</button>';
          }).join('')
        + '</div>';
    }

    // Group: to buy first, then bought — filtered by selected brand
    var visible = shopListBrand==='all' ? shoppingList : shoppingList.filter(function(i){return i.brand===shopListBrand;});
    var toBuy   = visible.filter(function(i){ return !i.bought; });
    var gotIt   = visible.filter(function(i){ return i.bought; });
    var renderGroup = function(items, label) {
      if (!items.length) return '';
      var s = '<div class="shop-group-title">'+label+'</div>';
      items.forEach(function(item) {
        var realIdx = shoppingList.indexOf(item);
        s += '<div class="swipe-row" data-swipe-action="shopRemove('+realIdx+')">'
          + '<div class="swipe-backing"><span class="swipe-delete-label">Delete</span></div>'
          + '<div class="swipe-content shop-item'+(item.bought?' bought':'')+'" id="shopitem_'+realIdx+'">'
          + '<button class="shop-check" onclick="shopToggle('+realIdx+')" title="'+(item.bought?'Mark to buy':'Mark as bought')+'">'
            + (item.bought ? '✓' : '○')
          + '</button>'
          + '<div class="shop-swatch" style="background:'+item.hex+';"></div>'
          + '<div class="shop-info">'
            + '<div class="shop-name">'+item.name+'</div>'
            + '<div class="shop-meta">'+item.pigment+' &nbsp;·&nbsp; '+(BRAND_LABELS[item.brand]||item.brand)+'</div>'
            + (item.note ? '<div class="shop-note-display">'+item.note+'</div>' : '')
          + '</div>'
          + '<div class="shop-actions">'
            + '<input class="shop-note-input" type="text" placeholder="Note…" value="'+(item.note||'').replace(/"/g,'&quot;')+'" onchange="shopSetNote('+realIdx+',this.value)" style="font-size:16px;">'
            + '<button class="shop-remove" aria-label="Remove item" onclick="shopRemove('+realIdx+')">✕</button>'
          + '</div>'
          + '</div></div>';
      });
      return s;
    };
    if (!visible.length) {
      html += '<div class="shop-empty">No items from this brand on your list.</div>';
    } else {
      html += renderGroup(toBuy, 'To Buy');
      html += renderGroup(gotIt, 'Got It ✓');
    }
  }

  // Add from reference section
  html += '<div class="shop-add-section">'
    + '<div class="shop-add-title">+ Add Colors</div>'
    + '<div class="ref-controls" style="border:none;padding:0.5rem 0;">'
      + '<div class="ref-search-wrap"><span class="si">🔍</span>'
        + '<input type="text" id="shop-search" placeholder="Search color or pigment…" value="'+shopSearch.replace(/"/g,'&quot;')+'" oninput="shopSearch=this.value;debouncedRenderShopGrid()" style="font-size:16px;">'
      + '</div>'
      + '<div class="ref-filters" id="shop-brand-filters"></div>'
    + '</div>'
    + '<div class="shop-add-grid" id="shop-add-grid"></div>'
    + '</div>';

  wrap.innerHTML = html;
  initSwipeRows(wrap);

  // Build brand filters (every render, so they don't vanish after add/toggle/clear)
  var brands = ['all','daniel-smith','winsor-newton','schmincke','holbein','sennelier','mgraham','qor','schpirerr-farben'];
  var bf = document.getElementById('shop-brand-filters');
  if (bf) bf.innerHTML = brands.map(function(b){
    var lbl = b==='all'?'All':(BRAND_LABELS[b]||b);
    return '<button class="filt-btn'+(b===shopBrand?' active':'')+'" data-brand="'+b+'" onclick="shopSetBrand(this.dataset.brand,this)">'+lbl+'</button>';
  }).join('');
  renderShopGrid();
}

function shopSetListBrand(brand, btn) {
  shopListBrand = brand;
  renderShoppingPage();
}

function shopSetBrand(brand, btn) {
  shopBrand = brand;
  document.querySelectorAll('#shop-brand-filters .filt-btn').forEach(function(b){
    b.classList.toggle('active', b===btn);
  });
  renderShopGrid();
}

function renderShopGrid() {
  var grid = document.getElementById('shop-add-grid');
  if (!grid) return;
  var q = shopSearch.trim().toLowerCase();
  if (!q && shopBrand==='all') {
    grid.innerHTML = '<div style="color:var(--ink3);font-style:italic;font-size:0.78rem;padding:0.5rem 0;">Search or pick a brand above to find colors to add.</div>';
    return;
  }
  var filtered = COLORS.filter(function(c){
    if (shopBrand!=='all'&&c.brand!==shopBrand) return false;
    if (q&&!c.name.toLowerCase().includes(q)&&!c.pigment.toLowerCase().includes(q)) return false;
    return true;
  }).slice(0,80);
  if (!filtered.length) { grid.innerHTML='<div style="color:var(--ink3);font-style:italic;font-size:0.78rem;padding:0.5rem 0;">No colors found.</div>'; return; }
  // Build a Set of "name::brand::medium" keys for O(1) membership tests
  var shopSet = new Set(shoppingList.map(function(i){return i.name+'::'+i.brand+'::'+(i.medium||'watercolor');}));
  grid.innerHTML = filtered.map(function(c){
    var already = shopSet.has(c.name+'::'+c.brand+'::'+(c.medium||'watercolor'));
    var cls='shop-grid-card'+(already?' already':'');
    return '<div class="'+cls+'" data-name="'+c.name.replace(/"/g,'&quot;')+'" data-brand="'+c.brand+'" data-medium="'+(c.medium||'watercolor')+'" onclick="shopAdd(this.dataset.name,this.dataset.brand,this.dataset.medium)">'
      +'<div class="shop-grid-swatch" style="background:'+c.hex+';"></div>'
      +'<div class="shop-grid-name">'+c.name+'</div>'
      +'<div class="shop-grid-pig">'+c.pigment+'</div>'
      +'<div class="shop-grid-add">'+(already?'✓':'+')+' </div>'
      +'</div>';
  }).join('');
}

function shopAdd(name, brand, medium) {
  var color = COLORS.find(function(c){ return c.name===name&&c.brand===brand&&(c.medium||'watercolor')===(medium||'watercolor'); });
  if (!color) return;
  var exists = shoppingList.some(function(i){ return i.name===name&&i.brand===brand&&(i.medium||'watercolor')===(medium||'watercolor'); });
  if (exists) { showToast('Already on list'); return; }
  shoppingList.push({ name:color.name, brand:color.brand, medium:color.medium, pigment:color.pigment, hex:color.hex, lf:color.lf, transparency:color.transparency, bought:false, note:'' });
  saveShoppingList(shoppingList);
  renderShoppingPage();
  showToast(color.name+' added to list');
}

function shopRemove(idx) {
  var item = shoppingList[idx];
  shoppingList.splice(idx,1);
  saveShoppingList(shoppingList);
  shopSearchBuilt = false;
  renderShoppingPage();
  if (item) showToast(item.name+' removed');
}

function shopToggle(idx) {
  if (!shoppingList[idx]) return;
  shoppingList[idx].bought = !shoppingList[idx].bought;
  if(shoppingList[idx].bought) hapticSuccess(); else hapticTap();
  saveShoppingList(shoppingList);
  renderShoppingPage();
}

function shopSetNote(idx, note) {
  if (!shoppingList[idx]) return;
  shoppingList[idx].note = note;
  saveShoppingList(shoppingList);
}

function shopClearBought() {
  shoppingList = shoppingList.filter(function(i){ return !i.bought; });
  saveShoppingList(shoppingList);
  renderShoppingPage();
  showToast('Bought items cleared');
}

