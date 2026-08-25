// ─────────────────────────────────────────────────────────────
// sync.js
// Cross-device sync via Supabase — shares the same project as Plein Air
// Journal (separate tables/bucket, zero overlap). No login: a private
// "pairing code" is the only credential. Reuses the app's own backup JSON
// shape as the sync payload rather than inventing a new data model, and
// keeps photos in Supabase Storage instead of embedding them in the synced
// blob — the actual fix for the original "storage full" problem.
// ─────────────────────────────────────────────────────────────

const SB_URL = "https://seqfbtofevmcgafywlrh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcWZidG9mZXZtY2dhZnl3bHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTczNDksImV4cCI6MjA5NzU3MzM0OX0.Eq0r8z9bSuibgPjP4kpfNnusU3kCUrragzEcqFsI2Oo"; // same anon key Plein Air Journal uses — same project, safe to share client-side
const SB_PHOTO_BUCKET = "palette-studio-photos";

function sbHeaders(extra){
  return Object.assign({
    "apikey": SB_KEY,
    "Authorization": "Bearer " + SB_KEY,
    "Content-Type": "application/json"
  }, extra||{});
}

var syncState = {
  pairingCode: localStorage.getItem('wc_sync_pairing_code') || null,
  lastSyncedAt: localStorage.getItem('wc_sync_last_synced_at') || null,
  syncing: false
};

function isSyncPaired(){ return !!syncState.pairingCode; }

// A short, easy-to-type code — avoids visually ambiguous characters
// (0/O, 1/I/l) since this gets typed by hand on a second device.
function generatePairingCode(){
  var alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var code = '';
  for(var i=0;i<8;i++){
    if(i===4) code+='-';
    code += alphabet[Math.floor(Math.random()*alphabet.length)];
  }
  return code;
}

function setPairingCode(code){
  syncState.pairingCode = code;
  safeSetItem('wc_sync_pairing_code', code);
}
function setLastSyncedAt(iso){
  syncState.lastSyncedAt = iso;
  safeSetItem('wc_sync_last_synced_at', iso);
}

// ── Starting sync on THIS device for the first time ──────────────────
function startNewSync(){
  var code = generatePairingCode();
  setPairingCode(code);
  renderSyncCard();
  // Push immediately so the row exists remotely before anyone tries to
  // pair a second device with this code.
  syncPush().then(function(){
    showToast('Sync set up — this device is now the source');
  }).catch(function(err){
    console.error('Initial sync push failed:', err);
    showToast("Couldn't reach the sync server — check your connection and try again");
  });
}

// ── Linking THIS device to an existing pairing code ───────────────────
function linkExistingSync(code){
  code = (code||'').trim().toUpperCase();
  if(!code){ showToast('Enter a pairing code first'); return; }
  syncState.pairingCode = code; // don't persist until we confirm it's real
  showToast('Connecting…');
  sbFetchSyncRow(code).then(function(row){
    if(!row){
      syncState.pairingCode = null;
      showToast("That code doesn't match any synced data yet");
      return;
    }
    setPairingCode(code);
    applyRemoteData(row.data).then(function(){
      setLastSyncedAt(row.updated_at);
      renderSyncCard();
      showToast('Linked — pulled your synced data onto this device');
    });
  }).catch(function(err){
    syncState.pairingCode = null;
    console.error('Link sync failed:', err);
    showToast("Couldn't reach the sync server — check your connection and try again");
  });
}

function unlinkSync(){
  if(!confirm('Stop syncing this device? Your data stays on this device either way — this just disconnects it from the sync code.')) return;
  syncState.pairingCode = null;
  syncState.lastSyncedAt = null;
  localStorage.removeItem('wc_sync_pairing_code');
  localStorage.removeItem('wc_sync_last_synced_at');
  renderSyncCard();
  showToast('Sync disconnected');
}

// ── Core REST calls ──────────────────────────────────────────────────
// Explicit order+limit so we always get the single most-recently-updated
// row for this pairing code — without this, if the DB ever ends up with
// more than one row under the same code, a plain "select=*" has no
// guaranteed row order and can silently hand back a much older row.
function sbFetchSyncRow(code){
  return fetch(SB_URL+"/rest/v1/palette_studio_sync?pairing_code=eq."+encodeURIComponent(code)+"&select=*&order=updated_at.desc&limit=1", {
    headers: sbHeaders()
  }).then(function(r){
    if(!r.ok) throw new Error('Sync fetch failed: '+r.status);
    return r.json();
  }).then(function(rows){ return rows && rows[0] ? rows[0] : null; });
}

function sbUpsertSyncRow(code, data){
  // on_conflict=pairing_code is required alongside resolution=merge-duplicates:
  // PostgREST otherwise targets the table's primary key for the upsert's
  // conflict resolution, not the pairing_code column. Now that pairing_code
  // has its own unique constraint, a request without this param becomes a
  // hard-failing unique-constraint violation (HTTP 409) on every push.
  return fetch(SB_URL+"/rest/v1/palette_studio_sync?on_conflict=pairing_code", {
    method: "POST",
    headers: sbHeaders({ "Prefer": "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify({ pairing_code: code, data: data })
  }).then(function(r){
    if(!r.ok) throw new Error('Sync upsert failed: '+r.status);
    return r.json();
  }).then(function(rows){ return rows[0]; });
}


// ── Push: local → remote ─────────────────────────────────────────────
// Builds the same shape as the app's own Backup export, plus a photo
// manifest (keys + visibility only — not the image bytes, those go to
// Storage separately below).
function buildSyncPayload(){
  var backup = buildBackupObject();
  var photoManifest = {};
  Object.keys(colorPhotos).forEach(function(key){
    photoManifest[key] = { visible: colorPhotos[key].visible!==false };
  });
  backup.photoManifest = photoManifest;
  return backup;
}

function syncPush(){
  if(!isSyncPaired()) return Promise.resolve();
  syncState.syncing = true;
  var payload = buildSyncPayload();
  return sbUpsertSyncRow(syncState.pairingCode, payload)
    .then(function(row){
      setLastSyncedAt(row.updated_at);
      return uploadUnsyncedPhotos();
    })
    .finally(function(){ syncState.syncing = false; renderSyncCard(); });
}

// ── Pull: remote → local ─────────────────────────────────────────────
// `remoteBackup` is the full shape buildBackupObject() produces:
// { app, type, version, exportedAt, data:{palettes,tubes,shopping}, photoManifest }
function applyRemoteData(remoteBackup){
  var d = remoteBackup.data || {};
  if(d.palettes) { palettes = d.palettes; savePalettes(palettes); }
  if(d.tubes) { tubeData = d.tubes; saveTubeData(tubeData); }
  if(d.shopping) { shoppingList = d.shopping; saveShoppingList(shoppingList); }
  renderPaletteList();
  if(typeof renderShoppingPage==='function') renderShoppingPage();
  return downloadMissingPhotos(remoteBackup.photoManifest||{});
}

// ── Smart single-button sync ──────────────────────────────────────────
// Compares "when did local data actually last change" (markLocalDataModified,
// tied to genuinely successful saves) against the server's updated_at —
// NOT against lastSyncedAt (when this device last talked to the server).
// Those are different things: if a local save silently fails (e.g. storage
// full) but the tiny sync-timestamp write still succeeds, lastSyncedAt can
// keep matching the server even while the actual data underneath has
// reverted — which would make this device wrongly look "not behind" and
// push its stale data over a genuinely newer server copy.
function syncNow(){
  if(!isSyncPaired()){ showToast('Set up sync first'); return; }
  syncState.syncing = true; renderSyncCard();
  var localModifiedAt = localStorage.getItem('wc_local_data_modified_at');
  sbFetchSyncRow(syncState.pairingCode).then(function(row){
    var remoteNewer = row && (!localModifiedAt || new Date(row.updated_at) > new Date(localModifiedAt));
    if(remoteNewer){
      return applyRemoteData(row.data).then(function(){
        setLastSyncedAt(row.updated_at);
        showToast('Pulled the newer copy from your other device');
      });
    } else {
      return syncPush().then(function(){
        showToast('Synced — this device was newer');
      });
    }
  }).catch(function(err){
    console.error('Sync failed:', err);
    showToast("Couldn't reach the sync server — check your connection and try again");
  }).finally(function(){
    syncState.syncing = false; renderSyncCard();
  });
}

// ── Photo sync ────────────────────────────────────────────────────────
// Additive/merge only (never deletes on either side) — the simplest safe
// behavior for a photo store, avoiding conflict cases entirely.
function sanitizePhotoObjectName(key){
  return encodeURIComponent(key).replace(/\./g,'%2E');
}

function uploadUnsyncedPhotos(){
  var uploadedSet = JSON.parse(localStorage.getItem('wc_sync_uploaded_photos')||'[]');
  var uploadedIdx = {}; uploadedSet.forEach(function(k){ uploadedIdx[k]=true; });
  var keys = Object.keys(colorPhotos).filter(function(k){ return !uploadedIdx[k] && colorPhotos[k] && colorPhotos[k].photo; });
  if(!keys.length) return Promise.resolve();
  var chain = Promise.resolve();
  keys.forEach(function(key){
    chain = chain.then(function(){ return uploadOnePhoto(key); }).then(function(){
      uploadedSet.push(key);
      safeSetItem('wc_sync_uploaded_photos', JSON.stringify(uploadedSet));
    });
  });
  return chain;
}

function uploadOnePhoto(key){
  var dataUrl = colorPhotos[key].photo;
  var blob = dataUrlToBlob(dataUrl);
  var objectName = sanitizePhotoObjectName(key);
  return fetch(SB_URL+"/storage/v1/object/"+SB_PHOTO_BUCKET+"/"+objectName, {
    method: "POST",
    headers: { "apikey": SB_KEY, "Authorization": "Bearer "+SB_KEY, "Content-Type": blob.type||"image/jpeg", "x-upsert": "true" },
    body: blob
  });
}

function downloadMissingPhotos(manifest){
  var keys = Object.keys(manifest).filter(function(k){ return !colorPhotos[k]; });
  if(!keys.length) return Promise.resolve();
  var chain = Promise.resolve();
  keys.forEach(function(key){
    chain = chain.then(function(){ return downloadOnePhoto(key, manifest[key]); });
  });
  return chain.then(function(){ saveColorPhotos(colorPhotos); });
}

function downloadOnePhoto(key, meta){
  var objectName = sanitizePhotoObjectName(key);
  return fetch(SB_URL+"/storage/v1/object/public/"+SB_PHOTO_BUCKET+"/"+objectName)
    .then(function(r){ if(!r.ok) throw new Error('Photo fetch failed: '+r.status); return r.blob(); })
    .then(function(blob){ return blobToDataUrl(blob); })
    .then(function(dataUrl){
      colorPhotos[key] = { photo: dataUrl, visible: meta.visible!==false };
    })
    .catch(function(err){
      console.error('Could not download photo for', key, err);
      // Non-fatal — one missing photo shouldn't block the rest of the sync.
    });
}

function dataUrlToBlob(dataUrl){
  var parts = dataUrl.split(',');
  var mime = parts[0].match(/:(.*?);/)[1];
  var bin = atob(parts[1]);
  var arr = new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
  return new Blob([arr], {type:mime});
}
function blobToDataUrl(blob){
  return new Promise(function(resolve,reject){
    var reader = new FileReader();
    reader.onload = function(){ resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Automatic check on app startup ─────────────────────────────────────
// Runs once, right after the app's first render. Deliberately pull-only —
// never auto-pushes, since that could silently overwrite a genuinely newer
// local change the user hasn't gotten around to syncing yet. Fails
// completely silently on any error (offline, server unreachable) so
// opening the app with no connection never shows an alarming error for a
// background check nobody asked to see. Only speaks up if it actually
// finds and applies something newer.
function autoCheckSyncOnLoad(){
  if(!isSyncPaired()) return;
  var localModifiedAt = localStorage.getItem('wc_local_data_modified_at');
  sbFetchSyncRow(syncState.pairingCode).then(function(row){
    if(!row) return;
    var remoteNewer = !localModifiedAt || new Date(row.updated_at) > new Date(localModifiedAt);
    if(!remoteNewer) return;
    return applyRemoteData(row.data).then(function(){
      setLastSyncedAt(row.updated_at);
      showToast('Synced newer data from another device');
    });
  }).catch(function(err){
    console.warn('Startup sync check skipped (offline or unreachable):', err);
  });
}

// ── UI ────────────────────────────────────────────────────────────────
function renderSyncCard(){
  var el = document.getElementById('sync-card-body');
  if(!el) return;
  if(!isSyncPaired()){
    el.innerHTML =
      '<p class="backup-card-desc">Sync your palettes and swatch photos across devices — no account needed, just a private code you set up once and enter on each device.</p>'+
      '<div class="backup-btn-row">'+
        '<button class="backup-btn primary" onclick="startNewSync()">✨ Start syncing from this device</button>'+
      '</div>'+
      '<div class="backup-btn-row">'+
        '<input type="text" id="sync-link-code-input" placeholder="Or enter a code from another device" maxlength="9" style="flex:1;font-family:monospace;text-transform:uppercase;">'+
        '<button class="backup-btn" onclick="linkExistingSync(document.getElementById(\'sync-link-code-input\').value)">Link</button>'+
      '</div>';
  } else {
    var lastSynced = syncState.lastSyncedAt ? new Date(syncState.lastSyncedAt).toLocaleString() : 'never';
    el.innerHTML =
      '<p class="backup-card-desc">This device is synced. Enter <strong>'+escapeHtml(syncState.pairingCode)+'</strong> on another device to link it too.</p>'+
      '<p class="backup-card-desc" style="font-size:0.7rem;">Last synced: '+escapeHtml(lastSynced)+'</p>'+
      '<div class="backup-btn-row">'+
        '<button class="backup-btn primary" onclick="syncNow()"'+(syncState.syncing?' disabled':'')+'>'+(syncState.syncing?'Syncing…':'🔄 Sync now')+'</button>'+
        '<button class="backup-btn" onclick="unlinkSync()">Disconnect</button>'+
      '</div>';
  }
}
