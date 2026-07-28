// ─────────────────────────────────────────────────────────────
// opacity-tool.js
// Opacity data and the Opacity Chart page.
// (source: original index.html lines 4562-4647)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// OPACITY DATA & CHART
// ══════════════════════════════════════════════════════════════
// Opacity score 0-100: 0=fully transparent, 100=fully opaque
// getOpacityScore removed — using opacityScore() instead
// Deterministic score based on pigment+name hash
function hashScore(str,min,range){
  let h=0;for(let i=0;i<str.length;i++){h=(h*31+str.charCodeAt(i))&0xffffffff;}
  return min+Math.abs(h)%range;
}
function opacityScore(c){
  const base=c.transparency==='T'?8:c.transparency==='ST'?42:75;
  const spread=c.transparency==='T'?22:c.transparency==='ST'?22:20;
  return hashScore(c.pigment+c.name, base, spread);
}

let opacityBrandFilter='all';

function renderOpacityChart(){
  const wrap=document.getElementById('opacity-content');
  if(!wrap) return;
  const q=(document.getElementById('opacity-search')||{value:''}).value.trim().toLowerCase();

  // Build brand filter buttons if not yet built
  const filtersEl=document.getElementById('opacity-brand-filters');
  if(filtersEl&&!filtersEl.dataset.built){
    filtersEl.dataset.built='1';
    const brands=['all','daniel-smith','winsor-newton','schmincke','holbein','sennelier','mgraham'];
    filtersEl.innerHTML=brands.map(b=>'<button class="filt-btn'+(b===opacityBrandFilter?' active':'')+'" onclick="opacityBrandFilter=\''+b+'\';document.querySelectorAll(\'#opacity-brand-filters .filt-btn\').forEach(x=>x.classList.remove(\'active\'));this.classList.add(\'active\');renderOpacityChart();">'+(b==='all'?'All':BRAND_LABELS[b]||b)+'</button>').join('');
  }

  const filtered=COLORS.filter(c=>{
    if(opacityBrandFilter!=='all'&&c.brand!==opacityBrandFilter) return false;
    if(q&&!c.name.toLowerCase().includes(q)) return false;
    return true;
  });

  // Sort by opacity score ascending (most transparent first)
  const withScore=filtered.map(c=>({c,score:opacityScore(c)})).sort((a,b)=>a.score-b.score);
  const groups=[
    {label:'Fully Transparent (washes reveal paper)',items:withScore.filter(x=>x.score<30)},
    {label:'Semi-Transparent (slight coverage)',items:withScore.filter(x=>x.score>=30&&x.score<55)},
    {label:'Semi-Opaque (moderate coverage)',items:withScore.filter(x=>x.score>=55&&x.score<75)},
    {label:'Opaque (covers underlying layers)',items:withScore.filter(x=>x.score>=75)},
  ];

  let html='';
  // Paper checkerboard legend
  html+='<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;padding:0.6rem 0.8rem;background:white;border:1px solid var(--border2);border-radius:4px;font-size:0.72rem;color:var(--ink3);">'
    +'<span>← More transparent &nbsp;&nbsp; Each bar shows how much the paint covers the paper &nbsp;&nbsp; More opaque →</span>'
    +'</div>';

  groups.forEach(function(g){
    if(!g.items.length) return;
    html+='<div class="opacity-group-title">'+g.label+' <span style="font-size:0.68rem;color:var(--ink3);font-style:italic;">'+g.items.length+' colors</span></div>';
    html+='<div class="opacity-grid">';
    g.items.forEach(function(item){
      const c=item.c, score=item.score;
      // Parse hex once, then use in all 5 steps
      const [cr,cg,cb]=parseHex(c.hex);
      const pr=245,pg=240,pb=232;
      let swatchHtml='';
      for(let s=0;s<5;s++){
        const alpha=(s+1)/5*score/100;
        const mr=Math.round(pr+(cr-pr)*alpha),mg=Math.round(pg+(cg-pg)*alpha),mb_=Math.round(pb+(cb-pb)*alpha);
        swatchHtml+='<div class="opacity-step" style="background:rgb('+mr+','+mg+','+mb_+');"></div>';
      }
      const scoreLabel=score<30?'Transparent':score<55?'Semi-T':score<75?'Semi-O':'Opaque';
      const barColor=score<30?'#6090b0':score<55?'#7080a0':score<75?'#908070':'#706050';
      html+='<div class="opacity-card">'
        +'<div class="opacity-swatch-row">'+swatchHtml+'</div>'
        +'<div class="opacity-info">'
          +'<div class="opacity-name">'+c.name+'</div>'
          +'<div class="opacity-pig">'+c.pigment+'&nbsp;·&nbsp;'+(BRAND_LABELS[c.brand]||c.brand)+'</div>'
          +'<div class="opacity-bar-wrap">'
            +'<div class="opacity-bar"><div class="opacity-bar-fill" style="width:'+score+'%;background:'+barColor+';"></div></div>'
            +'<span class="opacity-label">'+scoreLabel+'</span>'
          +'</div>'
        +'</div>'
        +'</div>';
    });
    html+='</div>';
  });
  wrap.innerHTML=html||'<div style="padding:3rem;text-align:center;color:var(--ink3);font-style:italic;">No colors match your search.</div>';
}

