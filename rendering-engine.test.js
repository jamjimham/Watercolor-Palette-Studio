// ─────────────────────────────────────────────────────────────
// mixing-chart.js
// The Mix Colors bar, Color Wheel view, and Mixing Chart.
// (source: original index.html lines 3146-3402)
// ─────────────────────────────────────────────────────────────

// ── COLOR MIXING ─────────────────────────────────────────────
function renderMixBarHtml(pal){
  const sel=mixSelectedIdxs.map(i=>pal.colors[i]).filter(Boolean);
  if(sel.length<2){
    return `<div class="mix-bar" id="mix-bar">
      <div class="mix-bar-hint">Select 2–4 swatches above to preview a mix.</div>
    </div>`;
  }
  const equalW=sel.map(()=>1);
  const mixedHex=mixPaintN(sel.map((c,i)=>({hex:c.hex,w:equalW[i]})));
  const chipHtml=sel.map((c,i)=>`<div class="mix-chip" style="background:${c.hex};" title="${c.name}"></div>`).join('');
  return `<div class="mix-bar" id="mix-bar">
    <div class="mix-bar-row">
      <div class="mix-bar-chips">${chipHtml}</div>
      <div class="mix-bar-plus">→</div>
      <div class="mix-bar-result" style="background:${mixedHex};" title="${mixedHex}"></div>
      <div class="mix-bar-actions">
        <input type="text" id="mix-name-input" class="mix-name-input" placeholder="Name this mix…" maxlength="34">
        <button class="mix-add-btn" onclick="confirmAddMix('${pal.id}')">+ Add to Palette</button>
      </div>
    </div>
    <div class="mix-bar-names">${sel.map(c=>c.name).join(' + ')} <span class="mix-bar-hex">${mixedHex.toUpperCase()}</span></div>
  </div>`;
}

function confirmAddMix(palId){
  const pal=palettes.find(p=>p.id===palId);
  if(!pal) return;
  const sel=mixSelectedIdxs.map(i=>pal.colors[i]).filter(Boolean);
  if(sel.length<2){ showToast('Select at least 2 colors to mix'); return; }
  const equalW=sel.map(()=>1);
  const mixedHex=mixPaintN(sel.map((c,i)=>({hex:c.hex,w:equalW[i]})));
  const nameInput=document.getElementById('mix-name-input');
  const customName=(nameInput&&nameInput.value.trim())||sel.map(c=>c.name.split(' ')[0]).join(' + ');
  // Estimate transparency/granulation loosely from the parent paints so the
  // rendered swatch still looks plausible (average lean toward the more opaque
  // and more granulating of the sources — mixing rarely makes paint MORE transparent
  // or removes granulation entirely).
  const transRank={T:0,ST:1,O:2};
  const transp=sel.reduce((worst,c)=>transRank[c.transparency]>transRank[worst]?c.transparency:worst,'T');
  const gran=sel.some(c=>c.gran);
  const newColor={
    group:'Custom',
    name:customName,
    brand:'custom',
    pigment:'',
    hex:mixedHex,
    lf:'',
    transparency:transp,
    gran:gran,
    single:false,
    grade:'',
    notes:'',
    custom:true,
    mixedFrom:sel.map(c=>c.name)
  };
  pal.colors.push(newColor);
  savePalettes(palettes);
  resetMixModeState();
  renderPaletteList();
  showToast(`"${customName}" added to palette`);
}

// ── COLOR WHEEL ──────────────────────────────────────────────
function hexToHsl(hex){
  let[r,g,b]=parseHex(hex);
  r/=255;g/=255;b/=255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if(max===min){h=s=0;}
  else{
    const d=max-min;
    s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;default:h=((r-g)/d+4)/6;}
  }
  return[h*360,s*100,l*100];
}

function renderWheelView(pal,content){
  const size=Math.min(content.offsetWidth||400,380);
  const cx=size/2,cy=size/2,outerR=size/2-14,innerR=outerR*0.36;

  content.innerHTML=`<div class="wheel-view">
    <canvas id="wheel-canvas" width="${size}" height="${size}" style="max-width:100%;display:block;margin:0 auto;"></canvas>
    <div class="wheel-note" style="font-size:0.7rem;text-align:center;margin:0.5rem 0;">
      Reds at right · Yellows top-right · Greens top · Blues left · Purples bottom · Neutrals (low saturation) near center
    </div>
    <div class="wheel-legend" id="wheel-legend"></div>
  </div>`;

  const canvas=document.getElementById('wheel-canvas');
  const ctx=canvas.getContext('2d');

  // Draw hue ring using conic gradient (single draw call instead of 360 segments)
  // Canvas 0rad = east (right), HSL hue 0=red starts at east — correct mapping
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx,cy,outerR,0,Math.PI*2);
  ctx.arc(cx,cy,innerR,0,Math.PI*2,true);
  ctx.clip('evenodd');
  const ringGrd=ctx.createConicGradient(0,cx,cy);
  for(let h=0;h<=360;h+=5) ringGrd.addColorStop(h/360,`hsl(${h},70%,58%)`);
  ctx.fillStyle=ringGrd;
  ctx.fillRect(cx-outerR,cy-outerR,outerR*2,outerR*2);
  ctx.restore();

  // Hue labels around the ring
  const hueLabels=[
    {h:0,label:'Red'},{h:30,label:'Orange'},{h:60,label:'Yellow'},
    {h:120,label:'Green'},{h:180,label:'Cyan'},{h:210,label:'Azure'},
    {h:240,label:'Blue'},{h:270,label:'Violet'},{h:300,label:'Magenta'},{h:330,label:'Rose'}
  ];
  ctx.font=`${Math.round(size*0.032)}px Georgia,serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  hueLabels.forEach(({h,label})=>{
    const rad=h*Math.PI/180;
    const lr=outerR+14;
    const lx=cx+Math.cos(rad)*lr;
    const ly=cy+Math.sin(rad)*lr;
    ctx.fillStyle='rgba(30,23,16,0.45)';
    ctx.fillText(label,lx,ly);
  });

  // Inner circle — paper background
  ctx.beginPath();ctx.arc(cx,cy,innerR-1,0,Math.PI*2);
  ctx.fillStyle='#f5f0e8';ctx.fill();
  ctx.strokeStyle='rgba(30,23,16,0.08)';ctx.lineWidth=1;ctx.stroke();

  // Place color dots — hue maps directly to canvas angle
  // Cluster colors at same hue slightly apart so they don't overlap
  const hueGroups={};
  pal.colors.forEach(c=>{
    const[h,s,l]=hexToHsl(c.hex);
    const bucket=Math.round(h/5)*5; // 5° buckets
    if(!hueGroups[bucket]) hueGroups[bucket]=[];
    hueGroups[bucket].push({c,h,s,l});
  });

  Object.values(hueGroups).forEach(group=>{
    group.forEach((item,i)=>{
      const {c,h,s,l}=item;
      const isNeutral=s<12;
      // Spread dots in same bucket slightly
      const spread=(group.length>1)?(i-(group.length-1)/2)*6:0;
      const adjustedH=h+spread;
      const rad=adjustedH*Math.PI/180;

      // Distance: neutrals near center, saturated near outer ring
      const minDist=isNeutral?8:innerR*0.15;
      const maxDist=isNeutral?innerR*0.7:outerR-innerR-4;
      const dist=innerR+minDist+(maxDist*(isNeutral?0.5:s/100));

      const px=cx+Math.cos(rad)*dist;
      const py=cy+Math.sin(rad)*dist;
      const dotR=isNeutral?5:7;

      // Shadow
      ctx.beginPath();ctx.arc(px+1,py+1,dotR,0,Math.PI*2);
      ctx.fillStyle='rgba(0,0,0,0.25)';ctx.fill();

      // Color dot
      ctx.beginPath();ctx.arc(px,py,dotR,0,Math.PI*2);
      ctx.fillStyle=c.hex;ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.9)';ctx.lineWidth=1.5;ctx.stroke();

      // For dark colors add inner highlight
      const [br,bg_,bb]=parseHex(c.hex);
      const brightness=(br*299+bg_*587+bb*114)/1000;
      if(brightness<80){
        ctx.beginPath();ctx.arc(px-1,py-1,dotR*0.4,0,Math.PI*2);
        ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fill();
      }
    });
  });

  // Legend — group by hue family
  const legend=document.getElementById('wheel-legend');
  const sorted=[...pal.colors].sort((a,b)=>hexToHsl(a.hex)[0]-hexToHsl(b.hex)[0]);
  legend.innerHTML=sorted.map(c=>`
    <div class="wl-item">
      <div class="wl-dot" style="background:${c.hex};"></div>
      <span>${c.name}</span>
    </div>`).join('');
}

// ── MIXING CHART ─────────────────────────────────────────────
var mixingSubView='chart'; // 'chart' | 'match' — persists while switching palettes/tabs within a session
var lastMatchTargetHex='#8a6a4a';

function setMixingSubView(v,pal){
  mixingSubView=v;
  const content=document.getElementById('palette-view-content');
  if(content) renderMixingView(pal,content);
}

function renderMixingView(pal,content){
  const colors=pal.colors;
  if(colors.length<2){
    content.innerHTML='<div class="empty-palette-view">Add at least 2 colors to see mixing tools.</div>';return;
  }
  content.innerHTML=`<div class="mix-subtabs">
    <button class="mix-subtab${mixingSubView==='chart'?' active':''}" onclick="setMixingSubView('chart',palettes.find(p=>p.id==='${pal.id}'))">⊞ Mixing Chart</button>
    <button class="mix-subtab${mixingSubView==='match'?' active':''}" onclick="setMixingSubView('match',palettes.find(p=>p.id==='${pal.id}'))">🎯 Match a Color</button>
  </div><div id="mixing-sub-content"></div>`;
  const body=document.getElementById('mixing-sub-content');
  if(mixingSubView==='match') renderColorMatchSub(pal,body);
  else renderMixingChartSub(pal,body);
}

function renderMixingChartSub(pal,content){
  const colors=pal.colors;
  // No limit — show all colors
  const cols=colors;
  const cellSize=Math.max(48, Math.min(70, Math.floor(360/cols.length)));
  const headerSize=Math.max(70,cellSize+20);

  let html=`<div class="mix-note">Mixes use a subtractive pigment model (Kubelka-Munk), so they behave like paint on paper rather than blended light. A <span class="mud-dot-legend">◌</span> marks combinations that turn muddy — useful for neutrals, worth avoiding when you want a clean hue.</div>`;
  html+=`<div class="mix-chart-wrap"><table class="mix-chart-table" style="table-layout:fixed;"><thead><tr><th style="width:${headerSize}px;"></th>`;
  cols.forEach(c=>{
    html+=`<th style="width:${cellSize}px;min-width:${cellSize}px;"><div class="mct-header">
      <div class="mct-hs" style="background:${c.hex};width:${Math.min(28,cellSize-8)}px;height:${Math.min(28,cellSize-8)}px;border-radius:50%;"></div>
      <div class="mct-hn" style="font-size:${cellSize<55?'0.5rem':'0.58rem'};">${c.name.split(' ').slice(0,2).join(' ')}</div>
    </div></th>`;
  });
  // Pre-compute upper triangle of mixes (A+B == B+A, so skip redundant calls)
  const mixCache={};
  cols.forEach((a,i)=>cols.forEach((b,j)=>{
    if(i>=j) return;
    const key=i+','+j;
    const mixed=mixPaint(a.hex,b.hex,0.5);
    mixCache[key]={mixed,mud:mudInfo(a.hex,b.hex,mixed)};
  }));

  html+=`</tr></thead><tbody>`;
  cols.forEach((row,ri)=>{
    html+=`<tr><td style="width:${headerSize}px;min-width:${headerSize}px;"><div class="mct-header">
      <div class="mct-hs" style="background:${row.hex};width:24px;height:24px;border-radius:50%;"></div>
      <div class="mct-hn" style="font-size:0.58rem;">${row.name.split(' ').slice(0,2).join(' ')}</div>
    </div></td>`;
    cols.forEach((col,ci)=>{
      const w=cellSize+'px';
      if(ri===ci){
        html+=`<td style="width:${w};height:${w};"><div class="mix-cell diagonal" style="background:${row.hex};width:100%;height:100%;"></div></td>`;
      } else {
        const key=Math.min(ri,ci)+','+Math.max(ri,ci);
        const {mixed,mud}=mixCache[key];
        html+=`<td style="width:${w};height:${w};"><div class="mix-cell${mud.muddy?' muddy':''}" style="background:${mixed};width:100%;height:100%;" title="${row.name} + ${col.name} = ${mixed.toUpperCase()}${mud.muddy?' (muddy — '+Math.round(mud.drop*100)+'% chroma loss)':''}">
          <span class="mix-hex">${mixed.toUpperCase()}</span>
        </div></td>`;
      }
    });
    html+=`</tr>`;
  });
  html+=`</tbody></table></div>`;
  content.innerHTML=html;
}

