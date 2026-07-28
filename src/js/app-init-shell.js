// ─────────────────────────────────────────────────────────────
// app-init-shell.js
// Mobile navigation drawer, app init, and service worker registration.
// (source: original index.html lines 6802-6957)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// MOBILE NAVIGATION — Expandable Drawer
// ══════════════════════════════════════════════════════════════
var isMobile = function(){ return window.innerWidth <= 700; };
var drawerOpen = false;

var PAGE_META = {
  'palettes':    {icon:'🎨', label:'Palettes'},
  'reference':   {icon:'📖', label:'Reference'},
  'pigments':    {icon:'🔬', label:'Pigments'},
  'recommended': {icon:'⭐', label:'Starters'},
  'opacity':     {icon:'◐',  label:'Opacity'},
  'tracker':     {icon:'🎯', label:'Tracker'},
  'cost':        {icon:'💰', label:'Cost'},
  'recipes':     {icon:'🧪', label:'Recipes'},
  'shopping':    {icon:'🛒', label:'Shopping'},
  'harmony':     {icon:'🎡', label:'Harmony'},
  'valuestudy':  {icon:'◑',  label:'Value Study'},
  'backup':      {icon:'💾', label:'Backup'},
};

function mobileNavDrawer(id, btn) {
  closeMobileDrawer();
  document.querySelectorAll('.mobile-nav-item').forEach(function(t){ t.classList.toggle('active', t===btn); });
  updateMobileBar(id);
  showPage(id, null);
  document.querySelectorAll('.nav-tab').forEach(function(t){
    t.classList.toggle('active', t.getAttribute('onclick')&&t.getAttribute('onclick').includes("'"+id+"'"));
  });
  syncNavTabActive(id);
}

function updateMobileBar(id) {
  var meta = PAGE_META[id] || {icon:'🎨', label:id};
  var icon = document.getElementById('mbc-icon');
  var label = document.getElementById('mbc-label');
  if (icon) icon.textContent = meta.icon;
  if (label) label.textContent = meta.label;
}

function toggleMobileDrawer() {
  drawerOpen ? closeMobileDrawer() : openMobileDrawer();
}

function openMobileDrawer() {
  drawerOpen = true;
  var drawer = document.getElementById('mobile-nav-drawer');
  var overlay = document.getElementById('mobile-drawer-overlay');
  var moreBtn = document.getElementById('mobile-bar-menu');
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
  if (moreBtn) moreBtn.classList.add('drawer-open');
}

function closeMobileDrawer() {
  drawerOpen = false;
  var drawer = document.getElementById('mobile-nav-drawer');
  var overlay = document.getElementById('mobile-drawer-overlay');
  var moreBtn = document.getElementById('mobile-bar-menu');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  if (moreBtn) moreBtn.classList.remove('drawer-open');
}

// Navigate from a fixed bottom tab. Reuses showPage (which now also syncs the
// tab bar's active state) and closes the overflow drawer if it was open.
function tabGo(id) {
  closeMobileDrawer();
  showPage(id, null);
  if (typeof syncNavTabActive === 'function') syncNavTabActive(id);
}


function toggleMobileSidebar() {
  var page = document.querySelector('.page.active');
  if (!page) return;
  var id = page.id.replace('page-','');
  if (id === 'palettes') {
    var sb = document.querySelector('.palettes-sidebar');
    if (sb) sb.classList.toggle('open');
  } else if (id === 'reference') {
    var sb = document.querySelector('.ref-sidebar');
    if (sb) sb.classList.toggle('open');
  }
  var overlay = document.getElementById('sidebar-overlay');
  var anyOpen = document.querySelector('.palettes-sidebar.open,.ref-sidebar.open');
  if (overlay) overlay.classList.toggle('open', !!anyOpen);
}

function closeSidebars() {
  document.querySelectorAll('.palettes-sidebar,.ref-sidebar').forEach(function(s){ s.classList.remove('open'); });
  var overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.classList.remove('open');
}

// Patch showPage to sync both the overflow drawer and the fixed tab bar.
var PRIMARY_TABS = ['palettes','reference','valuestudy','recipes'];
var _origShowPage = window.showPage;
window.showPage = function(id, btn) {
  if (typeof _origShowPage === 'function') _origShowPage(id, btn);
  updateMobileBar(id);
  document.querySelectorAll('.mobile-nav-item').forEach(function(t){
    t.classList.toggle('active', t.dataset.page === id);
  });
  // Fixed 5-tab bar: highlight the matching primary tab, or fall back to the
  // "More" tab for any page that lives in the overflow drawer.
  var inPrimary = PRIMARY_TABS.indexOf(id) !== -1;
  document.querySelectorAll('.tabbar-tab').forEach(function(t){
    if (t.classList.contains('tabbar-more')) {
      t.classList.toggle('active', !inPrimary);
    } else {
      t.classList.toggle('active', t.dataset.page === id);
    }
  });
};

window.addEventListener('resize', function(){
  if (!isMobile()) {
    closeSidebars();
    closeMobileDrawer();
  }
});



// iOS momentum scroll prevention on non-scrollable areas
document.addEventListener('touchmove', function(e){
  var scrollable = '.palette-view,.ref-grid-wrap,.tracker-wrap,.cost-wrap,.recipes-wrap,.opacity-wrap,.pigment-compare-wrap,.palette-list,.ref-sidebar,.palettes-sidebar,.mixer-body,.paper-wrap,.shop-page,.harmony-page,.harmony-pick-col,.harmony-result-col,.backup-page,.backup-textarea,.recommended-wrap,.vs-page,.vs-side-panel,.vs-main';
  if (e.target.closest(scrollable)) return;
  e.preventDefault();
}, {passive: false});

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
renderPaletteList();
(function(){
  try{
    var n = parseInt(localStorage.getItem('wc_changes_since_backup')||'0',10);
    updateBackupReminderBanner(n);
  }catch(e){}
})();
(function(){
  try{
    var saved = localStorage.getItem('wc_app_name_prefix');
    var el = document.getElementById('app-name-prefix');
    if(el) el.textContent = saved || "James's";
  }catch(e){}
})();
function editAppName(){
  var el = document.getElementById('app-name-prefix');
  if(!el) return;
  var current = el.textContent;
  var next = prompt('Personalize the app name (shown before "Palette Studio"):', current);
  if(next===null) return; // cancelled
  next = next.trim() || 'My';
  el.textContent = next;
  try{ localStorage.setItem('wc_app_name_prefix', next); }catch(e){}
}

// ══════════════════════════════════════════════════════════════
// SERVICE WORKER — offline support
// ══════════════════════════════════════════════════════════════
// Registered last and defensively: if this fails or isn't supported (older
// browsers, some in-app webviews), the app still works exactly as before —
// this only adds the ability to open with no network connection.
if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js').catch(function(err){
      console.warn('Service worker registration failed (app still works online):', err);
    });
  });
}
