// ─────────────────────────────────────────────────────────────
// ui-shell.js
// Toasts, haptic feedback, and the generic swipe-to-delete gesture handler
// used by several list views.
// (source: original index.html lines 4126-4288)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════
let _toastTimer;
// ══════════════════════════════════════════════════════════════
// HAPTIC FEEDBACK
// ══════════════════════════════════════════════════════════════
// Centralized so every confirming action in the app gets consistent tactile
// feedback instead of the one-off vibrate() call that used to live only in
// the drag-mode handler. navigator.vibrate is Android/Chrome-only — iOS
// Safari has no web vibration API at all, so these are enhancement-only and
// silently no-op there; nothing depends on them firing.
function hapticTap(){ try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){} }
function hapticSuccess(){ try{ if(navigator.vibrate) navigator.vibrate([14,40,14]); }catch(e){} }
function hapticWarning(){ try{ if(navigator.vibrate) navigator.vibrate(45); }catch(e){} }

// ══════════════════════════════════════════════════════════════
// SWIPE TO DELETE
// ══════════════════════════════════════════════════════════════
// Generic gesture for any ".swipe-row" — expects a ".swipe-backing" (the red
// "Delete" layer underneath) and a ".swipe-content" (the visible row that
// slides). The row's own data-swipe-action attribute holds a JS expression
// string (e.g. "shopRemove(3)") that gets eval'd once the user actually
// commits to the delete, either by swiping past the threshold and releasing
// past a second confirm threshold, or by swiping fully open and tapping the
// exposed red area. This mirrors the standard iOS/Android list-delete
// pattern rather than deleting instantly on any swipe, so an accidental
// swipe can't destroy data.
const SWIPE_REVEAL_PX = 84;      // width of the exposed delete area once "open"
const SWIPE_COMMIT_PX = 150;     // drag distance past which releasing auto-deletes
let _swipeState = null;

function initSwipeRows(container){
  const rows = container.querySelectorAll('.swipe-row');
  rows.forEach(row=>{
    const content = row.querySelector('.swipe-content');
    if(!content || content._swipeBound) return;
    content._swipeBound = true;

    content.addEventListener('touchstart', onSwipeStart, {passive:true});
    content.addEventListener('touchmove', onSwipeMove, {passive:false});
    content.addEventListener('touchend', onSwipeEnd, {passive:true});
    content.addEventListener('touchcancel', onSwipeEnd, {passive:true});
  });

  // Tapping the exposed red backing (once a row is swiped open) deletes it —
  // a second, deliberate confirmation tap rather than triggering on the
  // swipe gesture alone.
  container.querySelectorAll('.swipe-backing').forEach(backing=>{
    if(backing._swipeBound) return;
    backing._swipeBound = true;
    backing.addEventListener('click', function(){
      const row = backing.closest('.swipe-row');
      if(row && row.classList.contains('swipe-open')) commitSwipeDelete(row);
    });
  });
}

function onSwipeStart(e){
  const content = e.currentTarget;
  const row = content.closest('.swipe-row');
  // Close any other row that was left open before starting a new gesture
  document.querySelectorAll('.swipe-row.swipe-open').forEach(r=>{
    if(r!==row) closeSwipeRow(r);
  });
  _swipeState = {
    row, content,
    startX: e.touches[0].clientX,
    startY: e.touches[0].clientY,
    currentX: 0,
    dragging: false,
    axisLocked: null, // 'x' | 'y' | null — decided after a few px of movement
  };
}
function onSwipeMove(e){
  if(!_swipeState) return;
  const dx = e.touches[0].clientX - _swipeState.startX;
  const dy = e.touches[0].clientY - _swipeState.startY;

  if(_swipeState.axisLocked===null && (Math.abs(dx)>6 || Math.abs(dy)>6)){
    _swipeState.axisLocked = Math.abs(dx)>Math.abs(dy) ? 'x' : 'y';
  }
  if(_swipeState.axisLocked==='y') return; // let the page scroll vertically instead

  e.preventDefault(); // horizontal swipe — take over from page scroll
  _swipeState.dragging = true;
  // Only allow dragging leftward (negative dx) to reveal delete; allow a
  // little rightward rubber-band if the row is already open so it can close.
  const already = _swipeState.row.classList.contains('swipe-open') ? -SWIPE_REVEAL_PX : 0;
  let x = already + dx;
  x = Math.max(-SWIPE_COMMIT_PX-30, Math.min(6, x)); // clamp with tiny overscroll give
  _swipeState.currentX = x;
  _swipeState.content.classList.add('swiping');
  _swipeState.content.style.transform = 'translateX('+x+'px)';
}
function onSwipeEnd(){
  if(!_swipeState) return;
  const {row, content, currentX, dragging} = _swipeState;
  content.classList.remove('swiping');

  if(!dragging){ _swipeState=null; return; }

  if(currentX <= -SWIPE_COMMIT_PX){
    // Dragged past the commit threshold — treat release as confirmed delete
    hapticWarning();
    commitSwipeDelete(row);
  } else if(currentX <= -SWIPE_REVEAL_PX/2){
    // Dragged partway — snap fully open, waiting for a confirming tap
    openSwipeRow(row);
    hapticTap();
  } else {
    closeSwipeRow(row);
  }
  _swipeState=null;
}
function openSwipeRow(row){
  row.classList.add('swipe-open');
  const content = row.querySelector('.swipe-content');
  if(content) content.style.transform = 'translateX(-'+SWIPE_REVEAL_PX+'px)';
}
function closeSwipeRow(row){
  row.classList.remove('swipe-open');
  const content = row.querySelector('.swipe-content');
  if(content) content.style.transform = 'translateX(0)';
}
function commitSwipeDelete(row){
  const action = row.getAttribute('data-swipe-action');
  if(!action) return;
  // Parse "fnName(arg1,arg2)" into a direct function call rather than using
  // eval — the action strings are always simple, known calls generated by
  // renderPaletteList/renderShoppingPage, never arbitrary user input.
  const m = action.match(/^(\w+)\((.*)\)$/);
  if(!m) return;
  const fn = window[m[1]];
  if(typeof fn !== 'function') return;
  const args = m[2].length ? m[2].split(',').map(a=>{
    a=a.trim();
    if(a==='null') return null;
    if(/^-?\d+$/.test(a)) return parseInt(a,10);
    if(/^'.*'$/.test(a)) return a.slice(1,-1);
    return a;
  }) : [];
  fn.apply(null, args);
}


function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>t.classList.remove('show'),2200);
  // Every toast represents some confirmed action — give it matching haptic
  // weight. Destructive/warning-sounding messages get the sharper buzz,
  // everything else gets the light double-tap success pattern.
  const lower=(msg||'').toLowerCase();
  if(lower.includes('remov')||lower.includes('delet')||lower.includes('could not')||lower.includes('went wrong')||lower.includes('error')){
    hapticWarning();
  } else {
    hapticSuccess();
  }
}


