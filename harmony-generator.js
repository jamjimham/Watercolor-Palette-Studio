// ─────────────────────────────────────────────────────────────
// cost-estimator.js
// Cost Estimator page.
// (source: original index.html lines 4740-4813)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// COST ESTIMATOR
// Prices are approximate 2024 MSRP in USD
// ══════════════════════════════════════════════════════════════
var BRAND_PRICES={
  'daniel-smith':  {5:10.99, 15:17.99, 37:32.99},
  'winsor-newton': {5:9.49,  15:16.49, 37:29.99},
  'schmincke':     {5:10.99, 15:18.99, 37:34.99},
  'holbein':       {5:9.99,  15:16.99, 37:31.99},
  'sennelier':     {5:10.49, 15:17.49, 37:32.49},
  'mgraham':       {5:8.99,  15:14.99, 37:26.99},
  'qor':           {5:9.49,  15:15.99, 37:28.99},
  'blockx':        {5:12.99, 15:22.99, 37:42.99},
  'mijello':       {5:7.99,  15:12.99, 37:24.99},
  'utrecht':       {5:7.49,  15:12.49, 37:22.99},
  'schpirerr-farben':{5:3.99, 15:7.99, 37:14.99},
};
// Cadmium/cobalt surcharge
var PREMIUM_PIGMENTS=['PY35','PO20','PR108','PB28','PV14','PV49','PG50','PB35','PBr5'];
function isPremium(pigment){
  return PREMIUM_PIGMENTS.some(function(p){return pigment.includes(p);});
}

function populateCostSelect(){
  var sel=document.getElementById('cost-palette-sel');
  if(!sel) return;
  var cur=sel.value;
  sel.innerHTML='<option value="">Select a palette…</option>'+
    palettes.map(function(p){return '<option value="'+p.id+'"'+(p.id===cur?' selected':'')+'>'+p.name+'</option>';}).join('');
}

function renderCostEstimator(){
  populateCostSelect();
  var palSel=document.getElementById('cost-palette-sel');
  var sizeSel=document.getElementById('cost-size-sel');
  if(!palSel||!sizeSel) return;
  var palId=palSel.value;
  var size=parseInt(sizeSel.value)||15;
  var wrap=document.getElementById('cost-content');
  if(!wrap) return;
  if(!palId){wrap.innerHTML='<p style="text-align:center;padding:3rem;color:var(--ink3);font-style:italic;">Select a palette above.</p>';return;}
  var pal=palettes.find(function(p){return p.id===palId;});
  if(!pal||!pal.colors.length){wrap.innerHTML='<p style="text-align:center;padding:3rem;color:var(--ink3);font-style:italic;">Palette is empty.</p>';return;}

  var total=0;
  var cards='';
  pal.colors.forEach(function(c){
    var base=(BRAND_PRICES[c.brand]||{5:9.99,15:16.99,37:30.99})[size]||16.99;
    var premium=isPremium(c.pigment)?base*0.25:0;
    var price=parseFloat((base+premium).toFixed(2));
    total+=price;
    cards+='<div class="cost-card">'
      +'<div class="cc-swatch" style="background:'+c.hex+';"></div>'
      +'<div class="cc-info">'
        +'<div class="cc-name">'+c.name+'</div>'
        +'<div class="cc-brand">'+(BRAND_LABELS[c.brand]||c.brand)+(isPremium(c.pigment)?' · <span style="color:#9b3a1a;font-size:0.58rem;">cadmium/cobalt</span>':'')+'</div>'
      +'</div>'
      +'<div>'
        +'<div class="cc-price">$'+price.toFixed(2)+'</div>'
        +'<div class="cc-size">'+size+'ml tube</div>'
      +'</div>'
      +'</div>';
  });

  var perColor=(total/pal.colors.length).toFixed(2);
  var html='<div class="cost-header">'
    +'<div class="cost-total-card"><div class="ctc-label">Total Est. Cost</div><div class="ctc-val">$'+total.toFixed(2)+'</div><div class="ctc-sub">'+pal.colors.length+' tubes · '+size+'ml each</div></div>'
    +'<div class="cost-total-card" style="background:var(--paper2);"><div class="ctc-label" style="color:var(--ink3);">Per Color Avg</div><div class="ctc-val" style="color:var(--ink);">$'+perColor+'</div><div class="ctc-sub" style="color:var(--ink3);">per tube</div></div>'
    +'<p class="cost-note">Prices are estimated 2024 MSRP in USD. Cadmium and cobalt pigments carry a premium. Actual prices vary by retailer — check online for current deals.</p>'
    +'</div>'
    +'<div class="cost-grid">'+cards+'</div>';
  wrap.innerHTML=html;
}

