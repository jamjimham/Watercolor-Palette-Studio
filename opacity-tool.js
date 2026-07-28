// ─────────────────────────────────────────────────────────────
// state-core.js
// Palette load/save (incl. safeSetItem and the app-error banner), and
// page navigation (showPage).
// (source: original index.html lines 2863-2924)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// PALETTE STORAGE
// ══════════════════════════════════════════════════════════════
function loadPalettes(){
  try{return JSON.parse(localStorage.getItem('wc_palettes')||'[]');}catch{return[];}
}
function savePalettes(p){
  localStorage.setItem('wc_palettes',JSON.stringify(p));
  trackChangeForBackupReminder();
}

let palettes=loadPalettes();
let activePaletteId=palettes.length?palettes[0].id:null;
let activePaletteView='swatch'; // swatch | wheel | mixing

function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}

// ══════════════════════════════════════════════════════════════
// PAGE NAVIGATION
// ══════════════════════════════════════════════════════════════
function showPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  if(btn) btn.classList.add('active');
  if(id==='reference') renderRef();
  if(id==='pigments') renderPigmentCompare();
  if(id==='recommended') renderRecommendedPalettes();
  if(id==='opacity') renderOpacityChart();
  if(id==='tracker'){populateTrackerSelect();renderTracker();}
  if(id==='cost'){populateCostSelect();renderCostEstimator();}
  if(id==='recipes') renderRecipes();
  if(id==='shopping'){shopSearchBuilt=false;renderShoppingPage();}
  if(id==='harmony') renderHarmonyPage();
  if(id==='valuestudy') renderValueStudyPage();
  if(id==='backup') renderBackupPage();
}

// ── "More" dropdown menu (secondary tools) ──
function toggleNavMore(e){
  e.stopPropagation();
  var menu=document.getElementById('nav-more-menu');
  menu.classList.toggle('open');
}
function closeNavMore(){
  var menu=document.getElementById('nav-more-menu');
  if(menu) menu.classList.remove('open');
}
document.addEventListener('click',function(e){
  var menu=document.getElementById('nav-more-menu');
  if(menu && menu.classList.contains('open') && !e.target.closest('.nav-more-wrap')) closeNavMore();
});
// Highlight the More trigger and the relevant submenu item when a "More" page is active
function syncNavTabActive(id){
  var moreBtn=document.querySelector('.nav-more-btn');
  var inMore=!!document.querySelector('.nav-more-menu button[data-page="'+id+'"]');
  if(moreBtn) moreBtn.classList.toggle('active', inMore);
  document.querySelectorAll('.nav-more-menu button').forEach(function(b){
    b.classList.toggle('active', b.dataset.page===id);
  });
}

