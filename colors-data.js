// ─────────────────────────────────────────────────────────────
// brush-studio.js
// Mix Studio — the live wet-on-wet virtual practice canvas.
// (source: original index.html lines 3494-3737)
// ─────────────────────────────────────────────────────────────

// ── MIX STUDIO: live wet-on-wet virtual practice canvas ─────────────
// A scratch pad for testing a mix before committing real paint to real
// paper. Loads a "brush" from a well in the current palette and paints
// onto a virtual sheet using the same Kubelka-Munk math as the rest of
// the app — applied per-pixel in real time rather than just previewed as
// a static swatch. Two behaviors fall out of tracking how recently each
// area was touched: paint over a still-wet area and colors genuinely
// fuse (wet-into-wet); paint over an area that's had time to "dry" and
// the new color glazes translucently over it instead, the way a second
// watercolor layer behaves over a dry first wash. The canvas itself is
// intentionally ephemeral (not saved) — it's a rehearsal space, not
// another place to manage files.
var brushState={ paletteId:null, loadedIdx:null, size:22, dilution:1.0 };
var _brush={ canvas:null, ctx:null, dpr:1, W:0, H:0, wetMap:null, wetMapW:0, wetMapH:0, drawing:false, lastX:0, lastY:0, undoStack:[] };
const BRUSH_WET_DOWNSCALE=4;   // wetness tracked at 1/4 canvas resolution — plenty smooth, far cheaper
const BRUSH_WET_MS=7000;       // how long an area is considered "wet" after being touched
const BRUSH_UNDO_MAX=20;

function renderBrushView(pal,content){
  brushState.paletteId=pal.id;
  if(brushState.loadedIdx==null || !pal.colors[brushState.loadedIdx]){
    brushState.loadedIdx = pal.colors.length ? 0 : null;
  }
  content.innerHTML=`
    <div class="brush-wrap">
      <div class="brush-note">A practice sheet for testing a mix before it touches real paper. Paint while an area's still wet and colors fuse; give it a moment and a new color glazes over it instead, the way a dry wash behaves under a second layer. Nothing here is saved — leaving this tab clears it.</div>
      <div class="brush-canvas-shell" id="brush-canvas-shell" style="height:min(60vw,360px);min-height:220px;">
        <canvas class="brush-canvas" id="brush-canvas"></canvas>
      </div>
      <div class="brush-controls-row">
        <div class="brush-slider-group">🖌 Size <input type="range" id="brush-size-input" min="6" max="60" value="${brushState.size}" oninput="setBrushSize(this.value)"></div>
        <div class="brush-slider-group">💧 Water <input type="range" id="brush-dilution-input" min="15" max="100" value="${Math.round(brushState.dilution*100)}" oninput="setBrushDilution(this.value)"></div>
        <button class="brush-btn" onclick="undoBrushStroke()">↺ Undo</button>
        <button class="brush-btn" onclick="clearBrushCanvas()">✕ Clear</button>
        <div class="brush-loaded-chip" id="brush-loaded-chip"></div>
      </div>
      <div class="brush-tray-label">Tap a well to load your brush</div>
      <div class="brush-tray" id="brush-tray"></div>
    </div>`;
  renderBrushTray(pal);
  updateBrushLoadedChip(pal);
  requestAnimationFrame(()=>initBrushCanvas(pal));
}

function renderBrushTray(pal){
  const tray=document.getElementById('brush-tray');
  if(!tray) return;
  tray.innerHTML=pal.colors.map((c,i)=>
    `<div class="brush-well${brushState.loadedIdx===i?' loaded':''}" style="background:${c.hex};" title="${c.name}" onclick="loadBrushColor(${i})"></div>`
  ).join('');
}

function updateBrushLoadedChip(pal){
  const chip=document.getElementById('brush-loaded-chip');
  if(!chip) return;
  const c=brushState.loadedIdx!=null ? pal.colors[brushState.loadedIdx] : null;
  chip.innerHTML=c ? `<div class="brush-loaded-swatch" style="background:${c.hex};"></div> ${c.name}` : 'No paint loaded';
}

function loadBrushColor(i){
  brushState.loadedIdx=i;
  const pal=palettes.find(p=>p.id===brushState.paletteId);
  if(!pal) return;
  hapticTap();
  renderBrushTray(pal);
  updateBrushLoadedChip(pal);
}

function setBrushSize(v){ brushState.size=parseInt(v,10); }
function setBrushDilution(v){ brushState.dilution=parseInt(v,10)/100; }

function initBrushCanvas(pal){
  const shell=document.getElementById('brush-canvas-shell');
  const canvas=document.getElementById('brush-canvas');
  if(!shell||!canvas) return;
  const cssW=shell.clientWidth||600, cssH=shell.clientHeight||320;
  const dpr=Math.min(2, window.devicePixelRatio||1);
  canvas.width=Math.round(cssW*dpr);
  canvas.height=Math.round(cssH*dpr);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  _brush.canvas=canvas; _brush.ctx=ctx; _brush.dpr=dpr;
  _brush.W=canvas.width; _brush.H=canvas.height;
  _brush.wetMapW=Math.ceil(_brush.W/BRUSH_WET_DOWNSCALE);
  _brush.wetMapH=Math.ceil(_brush.H/BRUSH_WET_DOWNSCALE);
  _brush.wetMap=new Float32Array(_brush.wetMapW*_brush.wetMapH);
  _brush.undoStack=[];
  paintBrushPaperBase();
  attachBrushPointerEvents(canvas);
}

function paintBrushPaperBase(){
  const ctx=_brush.ctx;
  ctx.fillStyle='#faf7f2';
  ctx.fillRect(0,0,_brush.W,_brush.H);
  // Very faint paper grain, reusing the shared granulation noise field so it
  // reads as the same "paper" the rest of the app renders on.
  const img=ctx.getImageData(0,0,_brush.W,_brush.H);
  const dat=img.data;
  for(let y=0;y<_brush.H;y+=2){
    for(let x=0;x<_brush.W;x+=2){
      const gv=granTileValue(x*0.5,y*0.5);
      const shade=Math.round(gv*4);
      const idx=(y*_brush.W+x)*4;
      dat[idx]=Math.min(255,Math.max(0,dat[idx]-shade));
      dat[idx+1]=Math.min(255,Math.max(0,dat[idx+1]-shade));
      dat[idx+2]=Math.min(255,Math.max(0,dat[idx+2]-shade));
    }
  }
  ctx.putImageData(img,0,0);
}

function _brushSmoothstep(edge0,edge1,x){
  const t=Math.min(1,Math.max(0,(x-edge0)/(edge1-edge0)));
  return t*t*(3-2*t);
}

function markBrushWet(px,py,radius,now){
  const mx=Math.floor(px/BRUSH_WET_DOWNSCALE), my=Math.floor(py/BRUSH_WET_DOWNSCALE);
  const mr=Math.ceil(radius/BRUSH_WET_DOWNSCALE)+1;
  for(let dy=-mr;dy<=mr;dy++){
    for(let dx=-mr;dx<=mr;dx++){
      if(dx*dx+dy*dy>mr*mr) continue;
      const xx=mx+dx, yy=my+dy;
      if(xx<0||yy<0||xx>=_brush.wetMapW||yy>=_brush.wetMapH) continue;
      _brush.wetMap[yy*_brush.wetMapW+xx]=now;
    }
  }
}
function brushWetnessAt(gx,gy,now){
  const mx=Math.floor(gx/BRUSH_WET_DOWNSCALE), my=Math.floor(gy/BRUSH_WET_DOWNSCALE);
  if(mx<0||my<0||mx>=_brush.wetMapW||my>=_brush.wetMapH) return 0;
  const t=_brush.wetMap[my*_brush.wetMapW+mx];
  if(!t) return 0;
  return Math.max(0, 1-(now-t)/BRUSH_WET_MS);
}

// Paints one circular "dab" by reading the pixels under it, K-M-mixing each
// one against the loaded paint (weighted by wetness, dilution, edge falloff,
// and — for granulating paints — the shared noise field), and writing the
// result back. Runs at pixel level rather than a flat alpha overlay so wet
// mixing and dry glazing both fall out of the same real math the rest of
// the app uses, rather than two separately-faked effects.
function paintBrushDab(px,py){
  const pal=palettes.find(p=>p.id===brushState.paletteId);
  if(!pal||brushState.loadedIdx==null) return;
  const c=pal.colors[brushState.loadedIdx];
  if(!c) return;
  const ctx=_brush.ctx;
  const radius=(brushState.size/2)*_brush.dpr;
  const x0=Math.max(0,Math.floor(px-radius)), y0=Math.max(0,Math.floor(py-radius));
  const x1=Math.min(_brush.W,Math.ceil(px+radius)), y1=Math.min(_brush.H,Math.ceil(py+radius));
  const w=x1-x0, h=y1-y0;
  if(w<=0||h<=0) return;
  const img=ctx.getImageData(x0,y0,w,h);
  const dat=img.data;
  const[nr,ng,nb]=parseHex(c.hex);
  const baseAlpha=(c.transparency==='O'?0.55:c.transparency==='ST'?0.4:0.28)*brushState.dilution;
  const now=performance.now();
  for(let j=0;j<h;j++){
    for(let i=0;i<w;i++){
      const gx=x0+i, gy=y0+j;
      const dx=gx-px, dy=gy-py;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist>radius) continue;
      const edge=1-_brushSmoothstep(radius*0.55,radius,dist);
      let wNew=baseAlpha*edge;
      if(wNew<=0.003) continue;
      const wet=brushWetnessAt(gx,gy,now);
      wNew*=(0.55+0.45*wet); // wet-into-wet fuses fuller strength; dry areas only glaze
      if(c.gran){
        const gv=granTileValue(gx*0.5,gy*0.5);
        wNew*=(0.7+0.6*Math.max(0,gv));
      }
      wNew=Math.min(0.96,wNew);
      const idx=(j*w+i)*4;
      dat[idx]  =_kMixChannelNum(dat[idx],  nr,wNew);
      dat[idx+1]=_kMixChannelNum(dat[idx+1],ng,wNew);
      dat[idx+2]=_kMixChannelNum(dat[idx+2],nb,wNew);
      dat[idx+3]=255;
    }
  }
  ctx.putImageData(img,x0,y0);
  markBrushWet(px,py,radius,now);
}

function attachBrushPointerEvents(canvas){
  function toLocal(e){
    const rect=canvas.getBoundingClientRect();
    const scaleX=canvas.width/rect.width, scaleY=canvas.height/rect.height;
    return {x:(e.clientX-rect.left)*scaleX, y:(e.clientY-rect.top)*scaleY};
  }
  function down(e){
    if(brushState.loadedIdx==null){ showToast('Tap a well below to load your brush'); return; }
    e.preventDefault();
    pushBrushUndoSnapshot();
    _brush.drawing=true;
    const p=toLocal(e);
    _brush.lastX=p.x; _brush.lastY=p.y;
    paintBrushDab(p.x,p.y);
  }
  function move(e){
    if(!_brush.drawing) return;
    e.preventDefault();
    const p=toLocal(e);
    const dx=p.x-_brush.lastX, dy=p.y-_brush.lastY;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const radius=(brushState.size/2)*_brush.dpr;
    const step=Math.max(2,radius*0.35);
    const n=Math.max(1,Math.floor(dist/step));
    for(let i=1;i<=n;i++){
      const t=i/n;
      paintBrushDab(_brush.lastX+dx*t, _brush.lastY+dy*t);
    }
    _brush.lastX=p.x; _brush.lastY=p.y;
  }
  function up(){ _brush.drawing=false; }
  canvas.addEventListener('pointerdown',down);
  canvas.addEventListener('pointermove',move);
  window.addEventListener('pointerup',up);
  canvas.addEventListener('pointerleave',up);
  canvas.addEventListener('pointercancel',up);
}

function pushBrushUndoSnapshot(){
  if(!_brush.ctx) return;
  try{
    const snap=_brush.ctx.getImageData(0,0,_brush.W,_brush.H);
    _brush.undoStack.push(snap);
    if(_brush.undoStack.length>BRUSH_UNDO_MAX) _brush.undoStack.shift();
  }catch(e){ /* snapshot failed — undo just won't cover this stroke */ }
}
function undoBrushStroke(){
  if(!_brush.ctx || !_brush.undoStack.length){ showToast('Nothing to undo'); return; }
  const snap=_brush.undoStack.pop();
  _brush.ctx.putImageData(snap,0,0);
}
function clearBrushCanvas(){
  if(!_brush.ctx) return;
  pushBrushUndoSnapshot();
  paintBrushPaperBase();
  if(_brush.wetMap) _brush.wetMap.fill(0);
  showToast('Canvas cleared');
}

