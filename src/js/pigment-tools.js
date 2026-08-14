// ─────────────────────────────────────────────────────────────
// pigment-tools.js
// Palette notes, Pigment Compare, and Recommended Palettes.
// (source: original index.html lines 4289-4517)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// PALETTE NOTES
// ══════════════════════════════════════════════════════════════
function savePaletteNotes(id,notes){
  const pal=palettes.find(p=>p.id===id);
  if(pal){pal.notes=notes;savePalettes(palettes);}
}

// ══════════════════════════════════════════════════════════════
// PIGMENT COMPARE
// ══════════════════════════════════════════════════════════════
function renderPigmentCompare(){
  const content=document.getElementById('pigment-compare-content');
  if(!content) return;
  const q=(document.getElementById('pigment-search')||{value:''}).value.trim().toUpperCase();

  // Group all colors by pigment code
  const pigmentMap={};
  COLORS.forEach(c=>{
    const codes=c.pigment.split('+');
    codes.forEach(code=>{
      const clean=code.trim();
      if(!pigmentMap[clean]) pigmentMap[clean]=[];
      pigmentMap[clean].push(c);
    });
  });

  // Filter by search
  const entries=Object.entries(pigmentMap)
    .filter(([code])=>!q||code.includes(q))
    .filter(([,colors])=>colors.length>1) // only show pigments used by multiple entries
    .sort(([a],[b])=>a.localeCompare(b));

  if(!entries.length){
    if(!q){
      // No search query — show all multi-pigment groups
      const all=Object.entries(pigmentMap).filter(([,c])=>c.length>1).sort(([a],[b])=>a.localeCompare(b));
      renderPigmentGroups(content,all);
    } else {
      content.innerHTML='<div style="padding:2rem;text-align:center;color:var(--ink3);font-style:italic;">No pigment codes match your search.</div>';
    }
    return;
  }
  renderPigmentGroups(content,entries);
}

function renderPigmentGroups(container,entries){
  let html='';
  entries.forEach(function([code, colors]){
    let cards='';
    colors.forEach(function(c){
      cards+='<div class="pigment-card">'
        +'<div class="pc-swatch" style="background:'+c.hex+';"></div>'
        +'<div class="pc-info">'
          +'<div class="pc-name">'+c.name+'</div>'
          +'<div class="pc-brand">'+(BRAND_LABELS[c.brand]||c.brand)+'</div>'
          +'<div class="pc-meta">'+c.transparency+' · LF '+c.lf+(c.gran?' · Gran':'')+'</div>'
        +'</div>'
        +'</div>';
    });
    html+='<div class="pigment-group">'
      +'<div class="pigment-group-title">'
        +'<span class="pigment-code-badge">'+code+'</span>'
        +'<span style="font-size:0.75rem;color:var(--ink3);">'+colors.length+' colors use this pigment</span>'
      +'</div>'
      +'<div class="pigment-cards">'+cards+'</div>'
      +'</div>';
  });
  container.innerHTML=html||'<div style="padding:2rem;text-align:center;color:var(--ink3);font-style:italic;">No shared pigments found.</div>';
}

// ══════════════════════════════════════════════════════════════
// RECOMMENDED PALETTES
// ══════════════════════════════════════════════════════════════
const RECOMMENDED_PALETTES=[
  {
    name:"Classic Limited Palette",
    desc:"The time-tested 6-color palette. Perfect for learning color mixing and harmony.",
    colors:[
      {name:"French Ultramarine",brand:"daniel-smith"},
      {name:"Phthalo Blue (Green Shade)",brand:"daniel-smith"},
      {name:"Quinacridone Rose",brand:"daniel-smith"},
      {name:"Pyrrol Red",brand:"daniel-smith"},
      {name:"Hansa Yellow Medium",brand:"daniel-smith"},
      {name:"New Gamboge",brand:"daniel-smith"},
    ]
  },
  {
    name:"Landscape Palette",
    desc:"Earthy greens, sky blues, warm ochres and burnt siennas for painting outdoors.",
    colors:[
      {name:"French Ultramarine",brand:"daniel-smith"},
      {name:"Cerulean Blue Chromium",brand:"daniel-smith"},
      {name:"Phthalo Green (Blue Shade)",brand:"daniel-smith"},
      {name:"Sap Green",brand:"daniel-smith"},
      {name:"New Gamboge",brand:"daniel-smith"},
      {name:"Raw Sienna",brand:"daniel-smith"},
      {name:"Burnt Sienna",brand:"daniel-smith"},
      {name:"Burnt Umber",brand:"daniel-smith"},
      {name:"Payne's Gray",brand:"daniel-smith"},
    ]
  },
  {
    name:"Portrait Palette",
    desc:"Warm flesh tones, subtle pinks, and earthy neutrals for painting skin and faces.",
    colors:[
      {name:"Quinacridone Rose",brand:"daniel-smith"},
      {name:"Pyrrol Scarlet",brand:"daniel-smith"},
      {name:"New Gamboge",brand:"daniel-smith"},
      {name:"Raw Sienna",brand:"daniel-smith"},
      {name:"Burnt Sienna",brand:"daniel-smith"},
      {name:"Transparent Red Oxide",brand:"daniel-smith"},
      {name:"French Ultramarine",brand:"daniel-smith"},
      {name:"Payne's Gray",brand:"daniel-smith"},
      {name:"Buff Titanium",brand:"daniel-smith"},
    ]
  },
  {
    name:"Granulating Palette",
    desc:"All granulating pigments for stunning textured washes and atmospheric effects.",
    colors:[
      {name:"French Ultramarine",brand:"daniel-smith"},
      {name:"Cerulean Blue Chromium",brand:"daniel-smith"},
      {name:"Moonglow",brand:"daniel-smith"},
      {name:"Indanthrone Blue",brand:"daniel-smith"},
      {name:"Lunar Black",brand:"daniel-smith"},
      {name:"Lunar Blue",brand:"daniel-smith"},
      {name:"Raw Sienna",brand:"daniel-smith"},
      {group:"Oranges",name:"Burnt Sienna",brand:"daniel-smith"},
      {name:"Raw Umber",brand:"daniel-smith"},
      {name:"Cobalt Blue",brand:"daniel-smith"},
    ]
  },
  {
    name:"Transparent Mixing Palette",
    desc:"All single-pigment transparent colors for pure, luminous glazes and clean mixes.",
    colors:[
      {name:"Hansa Yellow Medium",brand:"daniel-smith"},
      {name:"Nickel Azo Yellow",brand:"daniel-smith"},
      {name:"Pyrrol Orange",brand:"daniel-smith"},
      {name:"Pyrrol Red",brand:"daniel-smith"},
      {name:"Quinacridone Rose",brand:"daniel-smith"},
      {name:"Quinacridone Magenta",brand:"daniel-smith"},
      {name:"Phthalo Blue (Green Shade)",brand:"daniel-smith"},
      {name:"French Ultramarine",brand:"daniel-smith"},
      {name:"Phthalo Green (Blue Shade)",brand:"daniel-smith"},
      {name:"Viridian",brand:"daniel-smith"},
    ]
  },
  {
    name:"Urban Sketching Palette",
    desc:"Compact and versatile. Warm and cool of each primary plus earth tones for cityscapes.",
    colors:[
      {name:"Hansa Yellow Medium",brand:"daniel-smith"},
      {name:"Quinacridone Gold",brand:"daniel-smith"},
      {name:"Pyrrol Orange",brand:"daniel-smith"},
      {name:"Pyrrol Red",brand:"daniel-smith"},
      {name:"Quinacridone Rose",brand:"daniel-smith"},
      {name:"Phthalo Blue (Green Shade)",brand:"daniel-smith"},
      {name:"French Ultramarine",brand:"daniel-smith"},
      {name:"Sap Green",brand:"daniel-smith"},
      {name:"Raw Sienna",brand:"daniel-smith"},
      {name:"Burnt Sienna",brand:"daniel-smith"},
      {name:"Payne's Gray",brand:"daniel-smith"},
    ]
  },
  {
    name:"Botanical Art Palette",
    desc:"Soft, luminous colors favored for botanical illustration. All highly transparent.",
    colors:[
      {name:"Lemon Yellow",brand:"daniel-smith"},
      {name:"New Gamboge",brand:"daniel-smith"},
      {name:"Quinacridone Coral",brand:"daniel-smith"},
      {name:"Quinacridone Rose",brand:"daniel-smith"},
      {name:"Permanent Alizarin Crimson",brand:"daniel-smith"},
      {name:"Phthalo Blue (Green Shade)",brand:"daniel-smith"},
      {name:"Cobalt Blue",brand:"daniel-smith"},
      {name:"Phthalo Green (Yellow Shade)",brand:"daniel-smith"},
      {name:"Sap Green",brand:"daniel-smith"},
      {name:"Burnt Sienna",brand:"daniel-smith"},
    ]
  },
  {
    name:"Moody Atmospheric Palette",
    desc:"Dark, granulating, and chromatic. Ideal for moody skies, storms, and nocturnes.",
    colors:[
      {name:"Moonglow",brand:"daniel-smith"},
      {name:"Indanthrone Blue",brand:"daniel-smith"},
      {name:"Indigo",brand:"daniel-smith"},
      {name:"Prussian Blue",brand:"daniel-smith"},
      {name:"Perylene Maroon",brand:"daniel-smith"},
      {name:"Lunar Black",brand:"daniel-smith"},
      {name:"Payne's Gray",brand:"daniel-smith"},
      {name:"Quinacridone Violet",brand:"daniel-smith"},
      {name:"Raw Umber",brand:"daniel-smith"},
    ]
  },
];

function renderRecommendedPalettes(){
  const grid=document.getElementById('rec-grid');
  if(!grid) return;
  grid.innerHTML=RECOMMENDED_PALETTES.map((rp,i)=>{
    const colors=rp.colors.map(rc=>COLORS.find(c=>c.name===rc.name&&c.brand===rc.brand&&(c.medium||'watercolor')===(rc.medium||'watercolor'))).filter(Boolean);
    const sw=colors.slice(0,10).map(c=>'<div class="rec-swatch" style="background:'+c.hex+';" title="'+c.name+'"></div>').join('');
    return '<div class="rec-card">'
      +'<h3>'+rp.name+'</h3>'
      +'<p>'+rp.desc+'</p>'
      +'<div class="rec-swatches">'+sw+'</div>'
      +'<div class="rec-colors-count">'+colors.length+' colors · Daniel Smith</div>'
      +'<button class="btn-load-rec" onclick="loadRecommendedPalette('+i+')">+ Load into My Palettes</button>'
      +'</div>';
  }).join('');
}

function loadRecommendedPalette(idx){
  const rp=RECOMMENDED_PALETTES[idx];
  const colors=rp.colors.map(rc=>COLORS.find(c=>c.name===rc.name&&c.brand===rc.brand&&(c.medium||'watercolor')===(rc.medium||'watercolor'))).filter(Boolean);
  const pal={id:genId(),name:rp.name,colors:[...colors],notes:rp.desc};
  palettes.push(pal);
  savePalettes(palettes);
  activePaletteId=pal.id;
  resetMixModeState();
  const firstTab=document.querySelector('.nav-tab:first-child');
  showPage('palettes', firstTab);
  renderPaletteList();
  showToast('"'+rp.name+'" loaded into My Palettes!');
}

