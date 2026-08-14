// ─────────────────────────────────────────────────────────────
// recipes-tool.js
// Quick Mix Recipes page.
// (source: original index.html lines 4814-5009)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// QUICK MIX RECIPES
// ══════════════════════════════════════════════════════════════
var MIX_RECIPES=[
  // GREENS
  {name:'Foliage Green',desc:'Rich mid-green for summer leaves. Adjust ratio for lighter/darker foliage.',tags:['landscape','foliage'],
   parts:[{name:'Phthalo Blue (Green Shade)',brand:'daniel-smith',ratio:1},{name:'New Gamboge',brand:'daniel-smith',ratio:3}]},
  {name:'Olive Green',desc:'Muted warm olive. Great for dried grasses, late autumn leaves.',tags:['landscape','earth'],
   parts:[{name:'French Ultramarine',brand:'daniel-smith',ratio:1},{name:'New Gamboge',brand:'daniel-smith',ratio:2},{name:'Burnt Sienna',brand:'daniel-smith',ratio:1}]},
  {name:'Spring Green',desc:'Fresh, bright spring foliage. Light and airy.',tags:['landscape','foliage'],
   parts:[{name:'Phthalo Green (Yellow Shade)',brand:'daniel-smith',ratio:1},{name:'Hansa Yellow Medium',brand:'daniel-smith',ratio:2}]},
  {name:'Dark Shadow Green',desc:'Deep forest shadow. Add water for transparent glazes over foliage.',tags:['landscape','shadow'],
   parts:[{name:'Phthalo Green (Blue Shade)',brand:'daniel-smith',ratio:1},{name:'Perylene Maroon',brand:'daniel-smith',ratio:1}]},
  {name:'Grey-Green (Eucalyptus)',desc:'Silvery grey-green of eucalyptus or sage. Perfect for Australian landscapes.',tags:['landscape'],
   parts:[{name:'Cobalt Blue',brand:'daniel-smith',ratio:1},{name:'Quinacridone Gold',brand:'daniel-smith',ratio:1},{name:'Buff Titanium',brand:'daniel-smith',ratio:1}]},
  // NEUTRALS / GREYS
  {name:'Chromatic Black',desc:'Richer, more interesting than tube black. Varies warm or cool by ratio.',tags:['neutral','shadow'],
   parts:[{name:'French Ultramarine',brand:'daniel-smith',ratio:2},{name:'Burnt Sienna',brand:'daniel-smith',ratio:1}]},
  {name:'Warm Shadow Grey',desc:'Luminous warm grey for shadows in sunlit scenes.',tags:['neutral','shadow'],
   parts:[{name:'French Ultramarine',brand:'daniel-smith',ratio:1},{name:'Burnt Sienna',brand:'daniel-smith',ratio:1},{name:'Quinacridone Rose',brand:'daniel-smith',ratio:1}]},
  {name:'Cool Shadow',desc:'Blue-leaning neutral for cool light shadows.',tags:['neutral','shadow'],
   parts:[{name:'French Ultramarine',brand:'daniel-smith',ratio:3},{name:'Quinacridone Rose',brand:'daniel-smith',ratio:1}]},
  {name:'Warm Grey (Linen)',desc:'Soft warm grey for fabrics, stonework, aged wood.',tags:['neutral'],
   parts:[{name:'Buff Titanium',brand:'daniel-smith',ratio:3},{name:'Payne\'s Gray',brand:'daniel-smith',ratio:1}]},
  {name:'Neutral Tint (Mixed)',desc:'Versatile grey-neutral from primary complements.',tags:['neutral'],
   parts:[{name:'Burnt Sienna',brand:'daniel-smith',ratio:1},{name:'French Ultramarine',brand:'daniel-smith',ratio:1},{name:'Quinacridone Rose',brand:'daniel-smith',ratio:1}]},
  // SKIES & WATER
  {name:'Sky Blue (Midday)',desc:'Clear midday sky. Heavier pigment at zenith, dilute near horizon.',tags:['sky','landscape'],
   parts:[{name:'Cerulean Blue Chromium',brand:'daniel-smith',ratio:3},{name:'French Ultramarine',brand:'daniel-smith',ratio:1}]},
  {name:'Sunset Orange Sky',desc:'Warm sunset glow. Wet-in-wet for soft edges.',tags:['sky','landscape'],
   parts:[{name:'Pyrrol Scarlet',brand:'daniel-smith',ratio:1},{name:'New Gamboge',brand:'daniel-smith',ratio:2}]},
  {name:'Storm Sky',desc:'Moody stormy atmosphere. Keep it wet for dramatic blooms.',tags:['sky','atmospheric'],
   parts:[{name:'Payne\'s Gray',brand:'daniel-smith',ratio:2},{name:'French Ultramarine',brand:'daniel-smith',ratio:1},{name:'Quinacridone Rose',brand:'daniel-smith',ratio:1}]},
  {name:'Ocean Turquoise',desc:'Shallow tropical water. Luminous and transparent.',tags:['water','landscape'],
   parts:[{name:'Phthalo Blue (Green Shade)',brand:'daniel-smith',ratio:1},{name:'Phthalo Green (Yellow Shade)',brand:'daniel-smith',ratio:1}]},
  {name:'Deep Ocean',desc:'Dark deep water. Good for seascapes and night scenes.',tags:['water','landscape'],
   parts:[{name:'French Ultramarine',brand:'daniel-smith',ratio:2},{name:'Prussian Blue',brand:'daniel-smith',ratio:1}]},
  // FLESH / PORTRAIT
  {name:'Warm Caucasian Flesh',desc:'Basic warm skin tone. Build up in washes for depth.',tags:['portrait','flesh'],
   parts:[{name:'Pyrrol Scarlet',brand:'daniel-smith',ratio:1},{name:'New Gamboge',brand:'daniel-smith',ratio:3},{name:'Buff Titanium',brand:'daniel-smith',ratio:2}]},
  {name:'Cool Flesh (Shadows)',desc:'Cool shadow areas in skin. Use over warm flesh base.',tags:['portrait','flesh','shadow'],
   parts:[{name:'Quinacridone Rose',brand:'daniel-smith',ratio:1},{name:'French Ultramarine',brand:'daniel-smith',ratio:1}]},
  {name:'Deep Skin Tone',desc:'Richer brown skin tones. Layer transparently for depth.',tags:['portrait','flesh'],
   parts:[{name:'Burnt Sienna',brand:'daniel-smith',ratio:2},{name:'Quinacridone Rose',brand:'daniel-smith',ratio:1},{name:'French Ultramarine',brand:'daniel-smith',ratio:1}]},
  {name:'Lip Red',desc:'Natural lip colour. Dilute heavily for realistic results.',tags:['portrait'],
   parts:[{name:'Quinacridone Coral',brand:'daniel-smith',ratio:2},{name:'Pyrrol Scarlet',brand:'daniel-smith',ratio:1}]},
  // EARTH / STONE
  {name:'Sandy Stone',desc:'Warm sandstone or sandy beach.',tags:['landscape','earth'],
   parts:[{name:'Raw Sienna',brand:'daniel-smith',ratio:2},{name:'Buff Titanium',brand:'daniel-smith',ratio:1}]},
  {name:'Dark Earth',desc:'Rich dark soil or bark. Good for tree trunks and foregrounds.',tags:['landscape','earth'],
   parts:[{name:'Burnt Umber',brand:'daniel-smith',ratio:2},{name:'French Ultramarine',brand:'daniel-smith',ratio:1}]},
  {name:'Rusty Metal / Rust',desc:'Aged iron, rust stains. Textured wet-on-dry.',tags:['texture','earth'],
   parts:[{name:'Burnt Sienna',brand:'daniel-smith',ratio:2},{name:'Quinacridone Gold',brand:'daniel-smith',ratio:1},{name:'French Ultramarine',brand:'daniel-smith',ratio:1}]},
  {name:'Limestone / Pale Stone',desc:'Light grey stone. Granulates beautifully.',tags:['landscape','earth'],
   parts:[{name:'Cerulean Blue Chromium',brand:'daniel-smith',ratio:1},{name:'Buff Titanium',brand:'daniel-smith',ratio:3}]},
  // PURPLES / VIOLETS
  {name:'Lavender',desc:'Soft floral lavender. Use diluted for sky gradations.',tags:['floral'],
   parts:[{name:'French Ultramarine',brand:'daniel-smith',ratio:2},{name:'Quinacridone Rose',brand:'daniel-smith',ratio:1}]},
  {name:'Deep Violet',desc:'Rich jewel-like violet for flowers and shadows.',tags:['floral','shadow'],
   parts:[{name:'Quinacridone Magenta',brand:'daniel-smith',ratio:1},{name:'French Ultramarine',brand:'daniel-smith',ratio:1}]},
  // BROWNS
  {name:'Warm Sepia',desc:'Deep warm sepia for pen-and-wash linework.',tags:['neutral','earth'],
   parts:[{name:'Burnt Umber',brand:'daniel-smith',ratio:2},{name:'Pyrrol Red',brand:'daniel-smith',ratio:1}]},
  {name:'Walnut Ink',desc:'Soft warm neutral for background washes.',tags:['neutral'],
   parts:[{name:'Raw Umber',brand:'daniel-smith',ratio:2},{name:'Burnt Sienna',brand:'daniel-smith',ratio:1}]},
];

var allRecipeTags=[...new Set(MIX_RECIPES.flatMap(function(r){return r.tags;}))].sort();
var activeRecipeTag='all';

function renderRecipes(){
  var wrap=document.getElementById('recipes-content');
  if(!wrap) return;
  var q=(document.getElementById('recipe-search')||{value:''}).value.trim().toLowerCase();

  var filtered=MIX_RECIPES.filter(function(r){
    if(activeRecipeTag!=='all'&&!r.tags.includes(activeRecipeTag)) return false;
    if(q&&!r.name.toLowerCase().includes(q)&&!r.desc.toLowerCase().includes(q)&&!r.tags.join(' ').includes(q)) return false;
    return true;
  });

  // Notice: recipes use Daniel Smith pigments as the reference formula
  var noticeHtml='<div class="recipe-notice">'
    +'<span class="recipe-notice-icon">ℹ</span>'
    +'<span>Recipes are written using <strong>Daniel Smith</strong> paints as the reference formula. If you paint with other brands, tap <strong>"Find in my brand"</strong> on any ingredient to see the closest match from the full color database.</span>'
    +'</div>';

  // Build tag filters above grid
  var tagHtml='<div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:1rem;">'
    +['all',...allRecipeTags].map(function(t){
      return '<button class="filt-btn'+(t===activeRecipeTag?' active':'')+'" onclick="activeRecipeTag=\''+t+'\';renderRecipes();">'+t+'</button>';
    }).join('')+'</div>';

  if(!filtered.length){
    wrap.innerHTML=noticeHtml+tagHtml+'<div style="padding:3rem;text-align:center;color:var(--ink3);font-style:italic;">No recipes match your search.</div>';
    return;
  }

  var cards='';
  filtered.forEach(function(r,ri){
    // Calculate mixed color using subtractive (Kubelka-Munk) mixing — matches
    // how the Mixing Chart computes 2-color mixes, extended to N ingredients.
    // Linear RGB averaging (the old approach) makes complementary-color "mud"
    // recipes look too bright and clean; real paint absorbs light multiplicatively.
    var rs=r.parts.map(function(p){return COLORS.find(function(c){return c.name===p.name&&c.brand===p.brand&&(c.medium||'watercolor')===(p.medium||'watercolor');})||{hex:'#888888',name:p.name};});
    var totalRatio=r.parts.reduce(function(s,p){return s+p.ratio;},0);
    var mhex=mixPaintN(r.parts.map(function(p,i){return {hex:rs[i].hex, w:p.ratio};}));
    var [mixedR,mixedG,mixedB]=parseHex(mhex);
    var brightness=(mixedR*299+mixedG*587+mixedB*114)/1000;
    var textCol=brightness>140?'rgba(30,23,16,0.7)':'rgba(250,246,239,0.85)';

    var partsHtml='';
    r.parts.forEach(function(p,i){
      var c=rs[i];
      var barW=Math.round(p.ratio/totalRatio*100);
      partsHtml+='<div class="recipe-part">'
        +'<div class="rp-label" title="'+p.name+' (Daniel Smith)">'+p.name.split(' ').slice(0,3).join(' ')+'</div>'
        +'<div class="rp-bar-wrap"><div class="rp-bar" style="width:'+barW+'%;background:'+c.hex+';"></div></div>'
        +'<span class="rp-ratio">'+p.ratio+'pt</span>'
        +'<button class="rp-sub-btn" title="Find closest match in any brand" aria-label="Find closest match in any brand" onclick="showRecipeSubstitute(this,'+ri+','+i+')">⇄</button>'
        +'</div>'
        +'<div class="rp-sub-result" id="rp-sub-'+ri+'-'+i+'"></div>';
    });
    var tagsHtml=r.tags.map(function(t){return '<span class="recipe-tag">'+t+'</span>';}).join('');

    cards+='<div class="recipe-card">'
      +'<div class="recipe-result" style="background:'+mhex+';">'
        +'<span class="recipe-result-hex" style="color:'+textCol+';">'+mhex.toUpperCase()+'</span>'
      +'</div>'
      +'<div class="recipe-body">'
        +'<div class="recipe-name">'+r.name+'</div>'
        +'<div class="recipe-desc">'+r.desc+'</div>'
        +'<div class="recipe-parts">'+partsHtml+'</div>'
        +'<div>'+tagsHtml+'</div>'
      +'</div>'
      +'</div>';
  });
  wrap.innerHTML=noticeHtml+tagHtml+'<div class="recipes-grid" id="recipes-grid-data">'+cards+'</div>';
  // Stash the filtered recipe list on the DOM container for the substitute lookup
  window._currentRecipeList = filtered;
}

function showRecipeSubstitute(btn, recipeIdx, partIdx){
  var r = window._currentRecipeList && window._currentRecipeList[recipeIdx];
  if(!r) return;
  var p = r.parts[partIdx];
  var original = COLORS.find(function(c){return c.name===p.name&&c.brand===p.brand&&(c.medium||'watercolor')===(p.medium||'watercolor');});
  if(!original) return;
  var resultEl = document.getElementById('rp-sub-'+recipeIdx+'-'+partIdx);
  if(!resultEl) return;
  // Toggle off if already showing
  if(resultEl.classList.contains('open')){
    resultEl.classList.remove('open');
    resultEl.innerHTML='';
    return;
  }
  // Find closest match excluding Daniel Smith so we surface a genuine cross-brand alternative
  var nonDSMatches = COLORS.filter(function(c){return c.brand!=='daniel-smith';});
  var best=null, bestDist=Infinity;
  nonDSMatches.forEach(function(c){
    var or_=parseHex(original.hex), cr_=parseHex(c.hex);
    var dr=or_[0]-cr_[0], dg=or_[1]-cr_[1], db=or_[2]-cr_[2];
    var d=dr*dr+dg*dg+db*db;
    if(d<bestDist){bestDist=d;best=c;}
  });
  if(!best){ resultEl.innerHTML=''; return; }
  resultEl.classList.add('open');
  resultEl.innerHTML='<div class="rp-sub-card">'
    +'<div class="rp-sub-swatch" style="background:'+best.hex+';"></div>'
    +'<div class="rp-sub-info"><strong>'+best.name+'</strong><span>'+(BRAND_LABELS[best.brand]||best.brand)+' · '+best.pigment+'</span></div>'
    +'</div>';
}




// ── INSTALL BANNER ──
(function(){
  var dismissed = localStorage.getItem('wc_banner_dismissed');
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var isStandalone = window.navigator.standalone === true;
  if(isIOS && !isStandalone && !dismissed){
    var banner = document.getElementById('install-banner');
    if(banner){
      banner.style.display='block';
      // Shift topnav down
      document.querySelector('.topnav').style.marginTop='0';
    }
  }
})();
function dismissBanner(){
  safeSetItem('wc_banner_dismissed','1');
  var b=document.getElementById('install-banner');
  if(b) b.style.display='none';
}

