// ─────────────────────────────────────────────────────────────
// rendering-engine.js
// Canvas noise/texture, staining & dry-shift estimation, Kubelka-Munk
// subtractive mixing math, Lab color distance, the inverse mixing solver,
// and the dilution/consistency strip renderer. The shared "engine" layer
// several features build on top of.
// (source: original index.html lines 1835-2244)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// NOISE (for canvas texture)
// ══════════════════════════════════════════════════════════════
function fade(t){return t*t*t*(t*(t*6-15)+10);}
function lerp(a,b,t){return a+t*(b-a);}

// ── STAINING & DRY-SHIFT ESTIMATION ──────────────────────────────────────
// The color database doesn't carry per-pigment staining/dry-shift ratings
// (there's no single universally-agreed source for either across 570+
// paints), so both are estimated from well-documented, general watercolor
// pigment chemistry rather than invented per swatch. Both are labelled
// "estimated" in the UI — they're a reasonable field guide, not lab data.
//
// Staining: modern synthetic organic pigments (phthalocyanines, quinacridones,
// most PY/PO/PR dye-derived colors, anything in the 100+ pigment index
// numbers) are documented as staining — they bond into the paper fiber and
// resist lifting. Traditional earths, cadmiums, and mineral/inorganic
// pigments (low pigment index numbers, iron oxides, ultramarines, cobalts)
// lift comparatively easily. This is genuinely predictable from the pigment
// code family, not arbitrary.
const STAINING_PIGMENT_FAMILIES = ['PB15','PG7','PG36','PV19','PR122','PR206','PR209','PO48','PO49','PY150','PY154','PY175','PBr25','PB60'];
const NONSTAINING_PIGMENT_FAMILIES = ['PW6','PY35','PY37','PY42','PR101','PBr7','PB29','PB28','PG18','PG50','PBk11','PBk6','PBk7'];
function estimateStaining(pigmentCodes){
  if(!pigmentCodes) return 'moderate';
  const codes=pigmentCodes.split('+').map(s=>s.trim());
  let stainHits=0, nonHits=0;
  codes.forEach(code=>{
    if(STAINING_PIGMENT_FAMILIES.some(f=>code.startsWith(f))) stainHits++;
    else if(NONSTAINING_PIGMENT_FAMILIES.some(f=>code.startsWith(f))) nonHits++;
    else {
      // Fall back to pigment index NUMBER: modern organics tend to run
      // higher (dye-chemistry pigments registered later); classic
      // earths/minerals tend to run lower. Weak signal, used only when the
      // exact code isn't in either curated list above.
      const m=code.match(/^P[A-Z](\d+)/);
      if(m){ const n=parseInt(m[1],10); if(n>=90) stainHits++; else if(n<=50) nonHits++; }
    }
  });
  if(stainHits>nonHits) return 'high';
  if(nonHits>stainHits) return 'low';
  return 'moderate';
}
// Dry-shift: watercolor reliably dries lighter than it looks wet because
// water scatters less light than air once it evaporates. The SIZE of that
// shift is well documented to correlate with two things already in the
// database: granulating pigments (heavier mineral particles, more surface
// scatter as they dry) shift MORE; and opaque/semi-opaque pigments (more
// particulate, less pure dye-in-solution) shift more than fully transparent
// staining washes, which barely shift at all.
function estimateDryShift(transparency, gran){
  let score=0;
  if(transparency==='O') score+=2;
  else if(transparency==='ST') score+=1;
  if(gran) score+=2;
  if(score>=3) return {level:'strong', pct:'35–45%', desc:'Dries noticeably lighter — mix darker than looks right while wet.'};
  if(score>=1) return {level:'moderate', pct:'20–30%', desc:'Dries somewhat lighter than the wet wash.'};
  return {level:'minimal', pct:'10–15%', desc:'Dries close to its wet appearance — a reliable staining wash.'};
}

const _P=[];
(()=>{const s=Array.from({length:256},(_,i)=>i);for(let i=255;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]];}for(let i=0;i<512;i++)_P[i]=s[i&255];})();
function noise2(x,y){
  const X=Math.floor(x)&255,Y=Math.floor(y)&255,xf=x-Math.floor(x),yf=y-Math.floor(y);
  const u=fade(xf),v=fade(yf);
  function g(h,x,y){const vv=h&3;return(vv<2?x:-x)+(vv===0||vv===3?y:-y);}
  return lerp(lerp(g(_P[_P[X]+Y],xf,yf),g(_P[_P[X+1]+Y],xf-1,yf),u),
              lerp(g(_P[_P[X]+Y+1],xf,yf-1),g(_P[_P[X+1]+Y+1],xf-1,yf-1),u),v);
}
function fbm(x,y,o=4){let v=0,a=0.5,f=1,m=0;for(let i=0;i<o;i++){v+=a*noise2(x*f,y*f);m+=a;a*=0.5;f*=2.1;}return v/m;}
// Slightly anisotropic fbm — real paper tooth and pigment settling are never
// perfectly isotropic (felt-pressing direction, brush-stroke direction).
// Stretching the sample coordinates on one axis breaks the "generated noise"
// look without being obviously directional at a glance.
function fbmAniso(x,y,o=4,stretch=1.35,angle=0.35){
  const ca=Math.cos(angle), sa=Math.sin(angle);
  const rx=x*ca - y*sa, ry=(x*sa + y*ca)*stretch;
  return fbm(rx, ry, o);
}

// A small, precomputed tileable noise field, sampled (with wraparound) by the
// Mix Studio brush canvas to vary how much pigment a granulating paint
// deposits pixel-to-pixel — reusing the same fbmAniso field the static swatch
// renderer uses, but computed once up front rather than per-stroke, since a
// live brush can't afford a full noise evaluation per pixel per frame.
let _granTile=null;
const GRAN_TILE_SIZE=96;
function granTileValue(x,y){
  if(!_granTile){
    _granTile=new Float32Array(GRAN_TILE_SIZE*GRAN_TILE_SIZE);
    for(let ty=0;ty<GRAN_TILE_SIZE;ty++){
      for(let tx=0;tx<GRAN_TILE_SIZE;tx++){
        _granTile[ty*GRAN_TILE_SIZE+tx]=fbmAniso(tx*0.14,ty*0.14,4);
      }
    }
  }
  const xi=((Math.floor(x)%GRAN_TILE_SIZE)+GRAN_TILE_SIZE)%GRAN_TILE_SIZE;
  const yi=((Math.floor(y)%GRAN_TILE_SIZE)+GRAN_TILE_SIZE)%GRAN_TILE_SIZE;
  return _granTile[yi*GRAN_TILE_SIZE+xi];
}

function parseHex(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
function rgbToHex(r,g,b){return'#'+[r,g,b].map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');}
function mixHex(h1,h2,t){const[r1,g1,b1]=parseHex(h1),[r2,g2,b2]=parseHex(h2);return rgbToHex(r1+(r2-r1)*t,g1+(g2-g1)*t,b1+(b2-b1)*t);}
// ── Subtractive pigment mixing (single-constant Kubelka-Munk, per channel) ──
// Approximates how real paint mixes on paper: blends absorb light multiplicatively
// rather than averaging RGB, so similar hues stay clean and opposites turn neutral.
function _srgbToLin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
function _linToSrgb(c){c=c<=0.0031308?c*12.92:1.055*Math.pow(c,1/2.4)-0.055;return Math.round(Math.max(0,Math.min(1,c))*255);}
function _ks(R){R=Math.min(0.9999,Math.max(0.0001,R));return (1-R)*(1-R)/(2*R);}      // reflectance → absorption/scatter
function _ksR(k){return 1+k-Math.sqrt(k*k+2*k);}                                       // back to reflectance
function mixPaint(h1,h2,t){ // t = proportion of h2 (0..1) — kept for existing 2-color callers (Mixing Chart)
  return mixPaintN([{hex:h1,w:1-t},{hex:h2,w:t}]);
}
// N-way subtractive mix: parts = [{hex, w}], w = relative weight (need not sum to 1)
function mixPaintN(parts){
  var totalW = parts.reduce(function(s,p){return s+p.w;},0) || 1;
  var out=[0,1,2].map(function(ch){
    var kSum=0;
    parts.forEach(function(p){
      var lin=_srgbToLin(parseHex(p.hex)[ch]);
      kSum += (p.w/totalW) * _ks(lin);
    });
    return _linToSrgb(_ksR(kSum));
  });
  return rgbToHex(out[0],out[1],out[2]);
}
// Two-color K-M mix operating directly on 0-255 numbers rather than hex
// strings — used by the Mix Studio brush canvas below, which calls this once
// per pixel under the brush and can't afford string parse/format overhead
// at interactive frame rates.
function _kMixChannelNum(c1,c2,w2){
  const k1=_ks(_srgbToLin(c1)), k2=_ks(_srgbToLin(c2));
  return _linToSrgb(_ksR((1-w2)*k1 + w2*k2));
}
function chroma(hex){const[r,g,b]=parseHex(hex);return (Math.max(r,g,b)-Math.min(r,g,b))/255;}
// How much a mix neutralises ("muds"). Returns {muddy, drop}.
// Muddy = both parents are colorful but the mix lands near neutral (low absolute chroma).
function mudInfo(h1,h2,mixed){
  const c1=chroma(h1), c2=chroma(h2), cm=chroma(mixed);
  const ref=Math.max(c1,c2,0.0001);
  const drop=Math.max(0,Math.min(1,1-cm/ref));
  return {muddy:(c1>0.2 && c2>0.2 && cm<0.22), drop:drop};
}

// ── LAB COLOR DISTANCE (for the "Match a Color" solver below) ──────────
// sRGB → CIE Lab (D65). Reuses the existing sRGB↔linear helpers above.
// Lab distance (ΔE76) is a much better perceptual match metric than
// comparing raw RGB — two colors can be close in RGB but look quite
// different to the eye, or vice versa.
function hexToLab(hex){
  const[r0,g0,b0]=parseHex(hex);
  const r=_srgbToLin(r0), g=_srgbToLin(g0), b=_srgbToLin(b0);
  let x=(r*0.4124+g*0.3576+b*0.1805)/0.95047;
  let y=(r*0.2126+g*0.7152+b*0.0722)/1.0;
  let z=(r*0.0193+g*0.1192+b*0.9505)/1.08883;
  const f=t=>t>0.008856?Math.cbrt(t):(7.787*t+16/116);
  const fx=f(x),fy=f(y),fz=f(z);
  return [116*fy-16, 500*(fx-fy), 200*(fy-fz)];
}
function deltaE(hexA,hexB){
  const[l1,a1,b1]=hexToLab(hexA), [l2,a2,b2]=hexToLab(hexB);
  return Math.sqrt((l1-l2)**2+(a1-a2)**2+(b1-b2)**2);
}
function deltaELabel(de){
  if(de<2.3) return {cls:'match-de-excellent', text:'Excellent match'};   // ~JND, essentially indistinguishable
  if(de<6) return {cls:'match-de-good', text:'Good match'};
  if(de<12) return {cls:'match-de-rough', text:'Noticeable difference'};
  return {cls:'match-de-rough', text:'Rough match'};
}

// ── INVERSE MIXING SOLVER ────────────────────────────────────────────
// Given a target hex and a palette, searches single paints, 2-paint blends,
// and (for smaller palettes) 3-paint blends for the closest achievable
// mixes — using the same Kubelka-Munk math as the rest of the app, so a
// recommended mix will actually render the way the app predicts.
// Weight ratios are searched on a coarse grid then reported rounded to the
// nearest 5%, since that's what's actually usable with a brush and pans.
function findColorMatches(colors, targetHex, opts){
  opts=opts||{};
  const maxResults=opts.maxResults||6;
  const results=[]; // {idxs:[...], weights:[...], mixedHex, de}

  // n=1: does any single paint already get close?
  colors.forEach((c,i)=>{
    results.push({idxs:[i], weights:[1], mixedHex:c.hex, de:deltaE(c.hex,targetHex)});
  });

  // n=2: every pair, weight swept in 5% steps
  for(let i=0;i<colors.length;i++){
    for(let j=i+1;j<colors.length;j++){
      let best=null;
      for(let w=5;w<=95;w+=5){
        const t=w/100;
        const mixed=mixPaintN([{hex:colors[i].hex,w:1-t},{hex:colors[j].hex,w:t}]);
        const de=deltaE(mixed,targetHex);
        if(!best||de<best.de) best={weights:[1-t,t],mixedHex:mixed,de};
      }
      if(best) results.push({idxs:[i,j],weights:best.weights,mixedHex:best.mixedHex,de:best.de});
    }
  }

  // n=3: only for smaller palettes — combinations grow fast (C(n,3)) and
  // each combination is checked at ~21 weight splits, so this is capped to
  // keep the search snappy on a phone.
  if(colors.length<=22){
    const splits=[]; // barycentric weight combos in steps of 0.2 (0,0.2,...1.0 summing to 1)
    for(let a=0;a<=5;a++)for(let b=0;a+b<=5;b++){const cW=5-a-b;splits.push([a/5,b/5,cW/5]);}
    for(let i=0;i<colors.length;i++){
      for(let j=i+1;j<colors.length;j++){
        for(let k=j+1;k<colors.length;k++){
          let best=null;
          splits.forEach(([wa,wb,wc])=>{
            if(wa===0||wb===0||wc===0) return; // a 0-weight split is really an n=2 or n=1 case, already covered
            const mixed=mixPaintN([{hex:colors[i].hex,w:wa},{hex:colors[j].hex,w:wb},{hex:colors[k].hex,w:wc}]);
            const de=deltaE(mixed,targetHex);
            if(!best||de<best.de) best={weights:[wa,wb,wc],mixedHex:mixed,de};
          });
          if(best) results.push({idxs:[i,j,k],weights:best.weights,mixedHex:best.mixedHex,de:best.de});
        }
      }
    }
  }

  results.sort((a,b)=>a.de-b.de);
  // De-dupe near-identical results (same paint set) and cap to maxResults
  const seen=new Set();
  const out=[];
  for(const r of results){
    const key=r.idxs.slice().sort((a,b)=>a-b).join(',');
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if(out.length>=maxResults) break;
  }
  return out;
}

function renderSwatchCanvas(canvas,hex,gran,transparency,W,H){
  // The previous version did ctx.scale(dpr,dpr) then putImageData(W,H), but
  // putImageData IGNORES the canvas transform — so at retina/mobile DPR≥2 only
  // the top-left quadrant was painted and the CSS background hex showed through
  // for the rest. This version writes the full physical pixel buffer.
  const dpr=Math.min(2, window.devicePixelRatio||1);    // cap at 2x for perf on 3x phones
  const PW=Math.max(1,Math.round(W*dpr)), PH=Math.max(1,Math.round(H*dpr));
  canvas.width=PW; canvas.height=PH;
  const ctx=canvas.getContext('2d');
  paintSwatchRegion(ctx, hex, gran, transparency, PW, PH, dpr, 0, 0, 1.0);
}

// Core "paint over paper" pixel model, factored out of renderSwatchCanvas so it
// can be reused at arbitrary dilution strengths (see renderDilutionStrip below).
// dilution: 1.0 = full-strength paint straight from the tube/pan (unchanged
// behaviour). Lower values (down to ~0.08) simulate progressively more water
// mixed in — less pigment film covering the paper, and granulation becomes
// finer/fainter since there's less particulate matter suspended per stroke.
// ox0/oy0 let a caller offset the noise field so adjacent strip segments don't
// look like tiled copies of each other.
function paintSwatchRegion(ctx, hex, gran, transparency, PW, PH, dpr, ox0, oy0, dilution){
  const[r,g,b]=parseHex(hex);
  const pR=250, pG=247, pB=242; // warm paper (matches --paper #faf7f2)
  const baseTrans = transparency==='T' ? 0.16 : transparency==='ST' ? 0.07 : 0.01;
  let _hv=0; for(let _ci=0;_ci<hex.length;_ci++){ _hv=(_hv*31+hex.charCodeAt(_ci))&0xffffff; }
  const ox=ox0+(_hv%200), oy=oy0+((_hv>>8)%200);

  const maxC=Math.max(r,g,b), minC=Math.min(r,g,b);
  const massR = r - (r-minC)*0.12 - 38;
  const massG = g - (g-minC)*0.12 - 38;
  const massB = b - (b-minC)*0.12 - 38;

  const imgData=ctx.createImageData(PW,PH); const dat=imgData.data;
  for(let py=0; py<PH; py++){
    const yy=py/PH;
    const ny=py/dpr;
    for(let px=0; px<PW; px++){
      const xx=px/PW;
      const nx=px/dpr;
      const i=(py*PW+px)*4;

      const tooth = fbmAniso(ox+nx*0.30, oy+ny*0.30, 3, 1.4, 0.4);
      const wash=fbm(ox+nx*0.045, oy+ny*0.045, 3);
      const grain=tooth;
      const dEdge=Math.min(Math.min(xx,1-xx), Math.min(yy,1-yy));
      const edgePool=Math.max(0, 1 - dEdge*5);
      const gravity=Math.pow(yy, 1.6) * 0.28;
      // Base density curve (unchanged from the original full-strength model) —
      // wash/edge/gravity are surface variation, not dilution, so they stay at
      // full weight regardless of how watered-down the mix is; only the OVERALL
      // pigment film thickness scales with dilution, applied as a separate
      // multiplier below so Cream keeps full contrast instead of clipping.
      let baseDensity = 0.92 + (wash-0.5)*0.14 + edgePool*0.10 + gravity*0.09;
      baseDensity = Math.max(0.45, Math.min(1.08, baseDensity));
      // Dilution acts as a pigment-load multiplier on top of the surface
      // variation, with a gentle curve (sqrt) so mid-dilutions (Milk/Coffee)
      // don't crash to near-invisible too quickly — matches how watercolor
      // actually lightens (perceptually closer to log/sqrt than linear).
      const loadCurve = Math.pow(dilution, 0.62);
      const density = Math.max(0.02, baseDensity * loadCurve);
      const trans = baseTrans * (1.6 - density*0.6);
      const cover = Math.max(0, Math.min(1, density * (1 - trans)));
      let outR = r*cover + pR*(1-cover);
      let outG = g*cover + pG*(1-cover);
      let outB = b*cover + pB*(1-cover);

      if(gran){
        const cell   = fbmAniso(ox+nx*0.045, oy+ny*0.045, 3, 1.3, 0.5);
        const fine   = fbmAniso(ox+nx*0.30,  oy+ny*0.30,  2, 1.2, 1.1);
        const particulate = cell*0.72 + fine*0.28;
        // Granulation contrast follows the same load curve as density — full
        // force at Cream, fading gracefully rather than being pre-suppressed.
        const granAmt = 0.25 + loadCurve*0.75;

        // Strength multipliers and caps tuned down from the original
        // (0.95/0.92 valley, 0.65/0.55 peak) for a gentler read — same noise
        // field, same speckle size and placement, just less contrast between
        // the darkest valleys and lightest blooms.
        const vRaw = Math.max(0, 0.52 - particulate) / 0.52;
        const valleyStrength = vRaw*vRaw*(3-2*vRaw) * 0.72 * granAmt;
        const pRaw = Math.max(0, particulate - 0.50) / 0.50;
        const peakStrength = pRaw*pRaw*(3-2*pRaw) * 0.48 * granAmt;

        if(valleyStrength>0){
          outR = lerp(outR, massR, Math.min(0.74, valleyStrength));
          outG = lerp(outG, massG, Math.min(0.74, valleyStrength));
          outB = lerp(outB, massB, Math.min(0.74, valleyStrength));
        }
        if(peakStrength>0){
          outR = lerp(outR, pR, Math.min(0.40, peakStrength));
          outG = lerp(outG, pG, Math.min(0.40, peakStrength));
          outB = lerp(outB, pB, Math.min(0.40, peakStrength));
        }
      }

      const gshift = (grain-0.5) * (gran?8:12);
      outR += gshift; outG += gshift; outB += gshift;
      const sx=xx-0.22, sy=yy-0.18;
      const sheen=Math.max(0, 1 - Math.sqrt(sx*sx+sy*sy)*3.5) * 11 * loadCurve;
      outR += sheen; outG += sheen; outB += sheen;
      dat[i]   = Math.min(255, Math.max(0, outR));
      dat[i+1] = Math.min(255, Math.max(0, outG));
      dat[i+2] = Math.min(255, Math.max(0, outB));
      dat[i+3] = 255;
    }
  }
  ctx.putImageData(imgData,0,0);
}

// ── DILUTION / CONSISTENCY STRIP ──────────────────────────────
// Renders 4 side-by-side panels showing the classic watercolor teaching
// analogy: Cream (tube-strength), Milk, Coffee, Tea (progressively more
// water). Each panel is painted independently at its own dilution using the
// same physical model as the main swatch, so it stays visually consistent
// with the rest of the app rather than being a flat CSS gradient.
const DILUTION_STOPS = [
  {label:'Cream', sub:'heavy body', d:1.00},
  {label:'Milk',  sub:'medium',     d:0.55},
  {label:'Coffee',sub:'light wash', d:0.28},
  {label:'Tea',   sub:'glaze',      d:0.12},
];
function renderDilutionStrip(canvas, hex, gran, transparency, W, H){
  const dpr=Math.min(2, window.devicePixelRatio||1);
  const PW=Math.max(1,Math.round(W*dpr)), PH=Math.max(1,Math.round(H*dpr));
  canvas.width=PW; canvas.height=PH;
  const ctx=canvas.getContext('2d');
  const n=DILUTION_STOPS.length;
  const segPW=Math.floor(PW/n);
  let xCursor=0;
  DILUTION_STOPS.forEach((stop,i)=>{
    // Last segment absorbs any rounding remainder so there's no unpainted
    // sliver of paper-colored gap on the right edge at odd canvas widths.
    const thisSegW = (i===n-1) ? (PW-xCursor) : segPW;
    // Off-screen buffer per segment so putImageData doesn't have to address
    // the full canvas with an x-offset (ImageData is always drawn at 0,0).
    const segCanvas=document.createElement('canvas');
    segCanvas.width=thisSegW; segCanvas.height=PH;
    const segCtx=segCanvas.getContext('2d');
    // Offset the noise field per segment (by a large prime-ish step) so the
    // four panels don't look like the same texture repeated—each reads as an
    // independently mixed puddle, which is how you'd actually test consistency.
    paintSwatchRegion(segCtx, hex, gran, transparency, thisSegW, PH, dpr, i*137, i*59, stop.d);
    ctx.drawImage(segCanvas, xCursor, 0);
    xCursor += thisSegW;
  });
}

function renderTranspCanvas(canvas,hex,transparency,W,H){
  const dpr=Math.min(2, window.devicePixelRatio||1);
  const PW=Math.max(1,Math.round(W*dpr)), PH=Math.max(1,Math.round(H*dpr));
  canvas.width=PW; canvas.height=PH;
  const ctx=canvas.getContext('2d');
  const[r,g,b]=parseHex(hex);
  const maxA=transparency==='T'?0.75:transparency==='ST'?0.90:0.98;
  const minA=transparency==='T'?0.04:transparency==='ST'?0.12:0.35;
  const imgData=ctx.createImageData(PW,PH);const dat=imgData.data;
  const cS=4*dpr;   // checker size in physical pixels (was 4 logical)
  for(let y=0;y<PH;y++){for(let x=0;x<PW;x++){
    const i=(y*PW+x)*4,cl=((Math.floor(y/cS)+Math.floor(x/cS))%2===0);
    const bg0=cl?232:208,bg1=cl?228:204,bg2=cl?220:196;
    const a=lerp(maxA,minA,x/PW);
    dat[i]=Math.round(lerp(bg0,r,a));dat[i+1]=Math.round(lerp(bg1,g,a));
    dat[i+2]=Math.round(lerp(bg2,b,a));dat[i+3]=255;
  }}
  ctx.putImageData(imgData,0,0);
}

let _renderQ=[],_rendering=false;
function queueRender(fn){_renderQ.push(fn);if(!_rendering)_drainQ();}
function _drainQ(){
  if(!_renderQ.length){_rendering=false;return;}
  _rendering=true;
  const fn=_renderQ.shift();
  requestAnimationFrame(()=>{try{fn();}catch(e){}setTimeout(_drainQ,0);});
}
function clearQ(){_renderQ=[];_rendering=false;}

// ── Test export shim ──────────────────────────────────────────
// No-op in the browser (there's no `module` global there, so this whole
// block never runs) — exists purely so Vitest can import these pure
// functions directly from the real source file instead of tests
// maintaining their own duplicate copies of the math, which would drift
// out of sync with the actual implementation over time.
//
// Aliased to `m` rather than writing `module.exports = ...` directly:
// TypeScript's checkJs statically scans .js files for that exact literal
// pattern to decide whether to treat the file as an isolated CommonJS
// module — which it did here, and that silently broke type-checking's
// cross-file visibility for every other file calling these functions as
// globals (the whole point of concatenating them in the first place).
// The alias produces identical behavior at runtime while not matching
// that pattern.
var _testExportsTarget = typeof module !== 'undefined' ? module : null;
if (_testExportsTarget) {
  _testExportsTarget.exports = { mixPaintN, hexToLab, deltaE, deltaELabel, findColorMatches, chroma, mudInfo };
}


