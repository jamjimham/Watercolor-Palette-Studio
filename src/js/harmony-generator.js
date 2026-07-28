// ─────────────────────────────────────────────────────────────
// harmony-generator.js
// Color Harmony — page init only (renderHarmonyPage). NOTE: the rest of
// this feature's functions (renderHarmonyColorGrid, setHarmonyRoot,
// renderHarmonyResult) physically live inside value-study.js — an old
// edit landed them there instead of here. Preserved as-is during this
// split rather than silently relocated; worth reuniting in a follow-up
// pass now that it's easy to find and move.
// (source: original index.html lines 5671-5699)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// COLOR HARMONY GENERATOR
// ══════════════════════════════════════════════════════════════
var harmonyColor = null;
var harmonyType  = 'complementary';
var harmonyPalId = '';

var HARMONY_TYPES = [
  { id:'complementary',  label:'Complementary',   desc:'Opposite on the wheel. Maximum contrast.', offsets:[180] },
  { id:'analogous',      label:'Analogous',        desc:'Adjacent hues. Natural and harmonious.',   offsets:[-30,-15,15,30] },
  { id:'triadic',        label:'Triadic',           desc:'Three evenly spaced hues. Vibrant.',       offsets:[120,240] },
  { id:'split',          label:'Split-Comp',        desc:'Root + two colors flanking its complement.', offsets:[150,210] },
  { id:'tetradic',       label:'Tetradic',          desc:'Four colors — two complementary pairs.',   offsets:[90,180,270] },
  { id:'square',         label:'Square',            desc:'Four colors equally spaced at 90°.',        offsets:[90,180,270] },
];

function renderHarmonyPage() {
  // Populate palette selector
  var sel = document.getElementById('harmony-palette-sel');
  if (sel) {
    var cur = sel.value||harmonyPalId;
    sel.innerHTML = '<option value="">— browse all colors —</option>'
      + palettes.map(function(p){ return '<option value="'+p.id+'"'+(p.id===cur?' selected':'')+'>'+p.name+'</option>'; }).join('');
    harmonyPalId = cur;
  }
  renderHarmonyColorGrid();
  renderHarmonyResult();
}

