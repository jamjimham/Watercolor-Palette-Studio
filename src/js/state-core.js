// ─────────────────────────────────────────────────────────────
// state-core.js
// Palette load/save (incl. safeSetItem and the app-error banner), and
// page navigation (showPage).
// (source: original index.html lines 2863-2924)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// SAFE STORAGE + ERROR REPORTING
// ══════════════════════════════════════════════════════════════
// Every localStorage write in the app should go through safeSetItem rather
// than calling localStorage.setItem directly. Without this, a full quota
// (very reachable once swatch photos are in the mix — each is a resized
// base64 JPEG sharing the same ~5-10MB origin quota as everything else)
// throws an uncaught QuotaExceededError: the in-memory state already
// changed, the UI already said "saved", and the write to disk silently
// never happened. The user finds out on next reload, when the data is
// just gone, with no warning it ever occurred.
var _lastStorageError = null;
var _lastAppError = null;

function safeSetItem(key, value){
  try{
    localStorage.setItem(key, value);
    return true;
  }catch(err){
    _lastStorageError = { key:key, name:(err&&err.name)||'Error', message:(err&&err.message)||String(err), time:new Date().toISOString() };
    console.error('Storage write failed for key "'+key+'":', err);
    var what = key==='wc_palettes' ? 'your palettes'
      : key==='wc_color_photos' ? 'a swatch photo'
      : key==='wc_tubes' ? 'your paint tracker'
      : key==='wc_shopping' ? 'your shopping list'
      : 'your data';
    showAppErrorBanner("Couldn't save "+what+" — storage is full. This change was NOT saved. Back up now, then free up space (e.g. remove a swatch photo) before continuing.");
    return false;
  }
}

function showAppErrorBanner(message){
  var b=document.getElementById('app-error-banner');
  var t=document.getElementById('app-error-text');
  if(!b||!t) return;
  t.textContent=message;
  b.classList.add('show');
  if(typeof hapticWarning==='function') hapticWarning();
}
function dismissAppErrorBanner(){
  var b=document.getElementById('app-error-banner');
  if(b) b.classList.remove('show');
}

// A plain-text summary of app + environment state, meant to be pasted back
// into a chat when something goes wrong that can't be reproduced from the
// code alone.
function buildDiagnosticInfo(){
  var lines=[];
  lines.push('Palette Studio diagnostic info');
  lines.push('Time: '+new Date().toISOString());
  lines.push('User agent: '+navigator.userAgent);
  try{
    var colorCount=palettes.reduce(function(s,p){return s+(p.colors?p.colors.length:0);},0);
    lines.push('Palettes: '+palettes.length+', total colors: '+colorCount);
  }catch(e){}
  try{
    var used=0;
    for(var k in localStorage){ if(localStorage.hasOwnProperty(k)) used += (localStorage[k]||'').length + k.length; }
    lines.push('Approx. localStorage used: '+Math.round(used/1024)+' KB');
  }catch(e){}
  if(_lastStorageError){
    lines.push('Last storage error: ['+_lastStorageError.name+'] '+_lastStorageError.message+' (key: '+_lastStorageError.key+', at '+_lastStorageError.time+')');
  }
  if(_lastAppError){
    lines.push('Last app error: '+_lastAppError.message+' (at '+_lastAppError.time+')');
    if(_lastAppError.stack) lines.push('Stack: '+_lastAppError.stack);
  }
  return lines.join('\n');
}
function copyDiagnosticInfo(){
  var text=buildDiagnosticInfo();
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){
      showToast('Diagnostic info copied');
    }).catch(function(){
      window.prompt('Copy this diagnostic info:', text);
    });
  } else {
    window.prompt('Copy this diagnostic info:', text);
  }
}

// Global error boundary: without this, an uncaught error in any render
// path fails completely silently — no message, just a console error the
// user never sees and a UI that may now be stuck or half-rendered.
window.addEventListener('error', function(e){
  _lastAppError = { message:(e.error&&e.error.message)||e.message||'Unknown error', stack:e.error&&e.error.stack, time:new Date().toISOString() };
  console.error('Uncaught error:', e.error||e.message);
  showAppErrorBanner('Something went wrong. Your data up to this point should be safe — try backing up, then reloading the app.');
});
window.addEventListener('unhandledrejection', function(e){
  var reason=e.reason;
  _lastAppError = { message:(reason&&reason.message)||String(reason)||'Unknown error', stack:reason&&reason.stack, time:new Date().toISOString() };
  console.error('Unhandled promise rejection:', reason);
  showAppErrorBanner('Something went wrong. Your data up to this point should be safe — try backing up, then reloading the app.');
});

// ══════════════════════════════════════════════════════════════
// PALETTE STORAGE
// ══════════════════════════════════════════════════════════════
function loadPalettes(){
  try{return JSON.parse(localStorage.getItem('wc_palettes')||'[]');}catch{return[];}
}
// Tracks when local data actually, successfully changed to disk — distinct
// from "when did this device last talk to the sync server." Sync push/pull
// decisions need to compare against THIS, not a communication timestamp,
// or a device whose big data save silently failed (quota) but whose small
// sync-timestamp write still succeeded can look falsely "up to date" and
// push its stale data over a genuinely newer server copy.
function markLocalDataModified(){
  safeSetItem('wc_local_data_modified_at', new Date().toISOString());
}

function savePalettes(p){
  var ok=safeSetItem('wc_palettes',JSON.stringify(p));
  if(ok){ trackChangeForBackupReminder(); markLocalDataModified(); }
  return ok;
}

let palettes=loadPalettes();
let activePaletteId=palettes.length?palettes[0].id:null;
let activePaletteView='swatch'; // swatch | wheel | mixing

// ══════════════════════════════════════════════════════════════
// COLOR PHOTOS (real-world swatch photos, shared across the whole app)
// ══════════════════════════════════════════════════════════════
// Keyed by color identity (brand+name, or name+hex for custom mixes) rather
// than by palette/index, so a photo attached once — from any palette card or
// the Brand Reference grid — shows up everywhere that color appears, while
// still letting each card individually toggle between the rendered swatch
// and the real photo.
function loadColorPhotos(){
  try{return JSON.parse(localStorage.getItem('wc_color_photos')||'{}');}catch{return{};}
}
function saveColorPhotos(p){
  var ok=safeSetItem('wc_color_photos',JSON.stringify(p));
  if(ok) markLocalDataModified();
  return ok;
}
let colorPhotos=loadColorPhotos();

function colorPhotoKey(c){
  if(!c) return '';
  if(c.custom) return 'custom::'+(c.name||'')+'::'+(c.hex||'');
  const medium=c.medium||'watercolor';
  // Keep the exact original key format for watercolor so photos already
  // saved under it keep matching with zero migration needed. Only append a
  // medium suffix for non-watercolor media (gouache) — those never had
  // stored photos under the old key format, so there's nothing to break.
  return medium==='watercolor'
    ? (c.brand||'')+'::'+(c.name||'')
    : (c.brand||'')+'::'+(c.name||'')+'::'+medium;
}
function getColorPhotoEntry(c){
  const k=colorPhotoKey(c);
  return k?colorPhotos[k]:null;
}
function getColorPhoto(c){
  const e=getColorPhotoEntry(c);
  return e?e.photo:null;
}
function isColorPhotoVisible(c){
  const e=getColorPhotoEntry(c);
  return e ? e.visible!==false : false;
}

// One-time migration: earlier versions stored photos per palette-swatch
// instance (pal.colors[idx].photo). Fold any of those into the shared store
// so existing photos keep showing up instead of silently vanishing.
(function migrateSwatchPhotosToGlobal(){
  try{
    let changed=false;
    palettes.forEach(p=>{
      (p.colors||[]).forEach(c=>{
        if(c.photo){
          const k=colorPhotoKey(c);
          if(k && !colorPhotos[k]){
            colorPhotos[k]={photo:c.photo, visible:c.photoVisible!==false};
            changed=true;
          }
        }
      });
    });
    if(changed) saveColorPhotos(colorPhotos);
  }catch(e){}
})();

function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}

// ── ESCAPING ──────────────────────────────────────────────────
// User-typed free text (palette names, mix names, notes) gets interpolated
// into HTML template literals throughout the app. Without consistent
// escaping, a name containing a `"` breaks out of whatever attribute it
// landed in.
//
// escapeHtml: for text CONTENT and for embedding inside a double-quoted
// HTML attribute (value="...", title="...", etc).
function escapeHtml(str){
  return String(str==null?'':str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
// escJsAttr: for embedding a string as a single-quoted JS argument inside
// an onclick="..." (or similar) HTML attribute — needs both JS-string
// escaping (so the value can't break out of the JS string) and
// HTML-attribute escaping (so it can't break out of the surrounding
// double-quoted attribute either).
function escJsAttr(str){
  var jsEscaped=String(str==null?'':str).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  return jsEscaped.replace(/"/g,'&quot;');
}

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

