// ─────────────────────────────────────────────────────────────
// tube-tracker.js
// Paint Tube Tracker (how full each tube is).
// (source: original index.html lines 4648-4739)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// PAINT TUBE TRACKER
// ══════════════════════════════════════════════════════════════
function loadTubeData(){
  try{return JSON.parse(localStorage.getItem('wc_tubes')||'{}');}catch{return{};}
}
function saveTubeData(d){ return safeSetItem('wc_tubes',JSON.stringify(d)); }
var tubeData=loadTubeData();

function getTubeKey(c){return c.brand+'::'+c.name;}
function getTubeLevel(c){
  var d=tubeData[getTubeKey(c)];
  return (d!==undefined)?d:4; // default full (4 pips)
}
function setTubeLevel(brand,name,level){
  tubeData[brand+'::'+name]=level;
  saveTubeData(tubeData);
  renderTracker();
}

function populateTrackerSelect(){
  var sel=document.getElementById('tracker-palette-sel');
  if(!sel) return;
  var cur=sel.value;
  sel.innerHTML='<option value="">Select a palette to track…</option>'+
    palettes.map(function(p){return '<option value="'+p.id+'"'+(p.id===cur?' selected':'')+'>'+p.name+'</option>';}).join('');
}

function renderTracker(){
  populateTrackerSelect();
  var sel=document.getElementById('tracker-palette-sel');
  if(!sel) return;
  var palId=sel.value;
  var wrap=document.getElementById('tracker-content');
  if(!wrap) return;
  if(!palId){wrap.innerHTML='<p style="text-align:center;padding:3rem;color:var(--ink3);font-style:italic;">Select a palette above.</p>';return;}
  var pal=palettes.find(function(p){return p.id===palId;});
  if(!pal||!pal.colors.length){wrap.innerHTML='<p style="text-align:center;padding:3rem;color:var(--ink3);font-style:italic;">This palette has no colors yet.</p>';return;}

  var LEVELS=[
    {label:'Full',color:'#4a6848',pip:'#4a6848'},
    {label:'¾ full',color:'#7a9878',pip:'#7a9878'},
    {label:'½ full',color:'#c8a030',pip:'#c8a030'},
    {label:'¼ left',color:'#d47830',pip:'#d47830'},
    {label:'Empty',color:'#c04030',pip:'#c04030'},
  ];

  var html='<div class="tracker-legend">';
  LEVELS.forEach(function(lv,i){
    html+='<div class="tl-item"><div class="tl-pip" style="background:'+lv.pip+';border-color:'+lv.pip+';"></div>'+lv.label+'</div>';
  });
  html+='</div>';

  html+='<div class="tracker-group">';
  html+='<div class="tracker-group-title">'+pal.name+' — '+pal.colors.length+' tubes</div>';

  // Sort: empties and low last
  var sorted=pal.colors.slice().sort(function(a,b){return getTubeLevel(b)-getTubeLevel(a);});

  sorted.forEach(function(c){
    var level=getTubeLevel(c);
    var isEmpty=level===0;
    var lv=LEVELS[4-Math.min(level,4)];
    var statusLabel=['Empty','Low — reorder soon','Getting low','Good supply','Full'][Math.min(level,4)];
    var pips='';
    for(var p=4;p>=0;p--){
      var filled=level>=(4-p);
      var pipColor=filled?LEVELS[4-Math.min(level,4)].pip:'transparent';
      pips+='<div class="tr-pip'+(filled?' filled':'')+'" style="'+(filled?'background:'+pipColor+';border-color:'+pipColor+';':'')+'" onclick="setTubeLevel(\''+escJsAttr(c.brand)+'\',\''+escJsAttr(c.name)+'\','+(4-p)+')" title="'+['Empty','¼','½','¾','Full'][4-p]+'"></div>';
    }
    html+='<div class="tracker-row'+(isEmpty?' empty':'')+'">'
      +'<div class="tr-swatch" style="background:'+c.hex+';"></div>'
      +'<span class="tr-name">'+c.name+'</span>'
      +'<span class="tr-brand">'+(BRAND_LABELS[c.brand]||c.brand)+'</span>'
      +'<div class="tr-level">'+pips+'</div>'
      +'<span class="tr-status" style="color:'+lv.pip+';">'+statusLabel+'</span>'
      +'</div>';
  });
  html+='</div>';

  var empties=sorted.filter(function(c){return getTubeLevel(c)===0;});
  var lows=sorted.filter(function(c){return getTubeLevel(c)===1;});
  if(empties.length||lows.length){
    html+='<div style="margin-top:1rem;padding:0.8rem 1rem;background:white;border:1px solid var(--border);border-radius:4px;border-left:3px solid var(--rust);">'
      +'<div style="font-family:\'Fraunces\',serif;font-size:0.85rem;margin-bottom:0.4rem;color:var(--rust);">Shopping List</div>'
      +(empties.length?'<div style="font-size:0.75rem;color:var(--ink2);margin-bottom:0.3rem;"><strong>Empty:</strong> '+empties.map(function(c){return c.name+' ('+( BRAND_LABELS[c.brand]||c.brand)+')';}).join(', ')+'</div>':'')
      +(lows.length?'<div style="font-size:0.75rem;color:var(--ink2);"><strong>Running low:</strong> '+lows.map(function(c){return c.name+' ('+(BRAND_LABELS[c.brand]||c.brand)+')';}).join(', ')+'</div>':'')
      +'</div>';
  }
  wrap.innerHTML=html;
}

