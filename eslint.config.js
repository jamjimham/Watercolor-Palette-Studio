// ─────────────────────────────────────────────────────────────
// value-study.js
// Value Study: photo-to-value-zones analysis, Roll a Reference (masters/
// photo/prompt), and Suggest a Palette. Also contains renderHarmonyColorGrid/
// setHarmonyRoot/renderHarmonyResult — see the note in harmony-generator.js.
// (source: original index.html lines 5700-6801)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// VALUE STUDY
// ══════════════════════════════════════════════════════════════
// A reference photo is converted to greyscale, then posterized into N tonal
// zones (3/4/5/7/9) using perceptual luminance. A draggable split divider
// lets you compare the original photo against the value study directly, and
// tapping anywhere samples the exact zone/luminance at that point — the kind
// of "what value is this really?" check painters do constantly when working
// from a photo. Nothing here is written to localStorage by default (photos
// are large); "Save Image" exports a PNG so it can be kept outside the app.

var vsState = {
  img: null,            // the loaded HTMLImageElement
  zones: 5,             // current posterization step count (3/4/5/7/9)
  view: 'split',         // 'split' | 'posterized' | 'original'
  splitPct: 50,          // current split divider position, 0–100
  zoneBounds: null,      // [ ] luminance thresholds for the active zone count, set by posterize
  zoneCounts: null,      // pixel counts per zone, for the histogram/key
  origCanvas: null,      // offscreen full-res original (for sampling + export)
  postCanvas: null,      // offscreen full-res posterized (for sampling + export)
};

// Named labels for each zone count, ordered DARK → LIGHT to match zone index
// 0 = darkest (lowest luminance) through zone n-1 = lightest, which is the
// order posterizeValueStudy() actually assigns. Using the same "Light Light /
// Middle Light / … Dark Dark" language as the Munsell-derived 9-step scale
// keeps this consistent with how painters already talk about value, while
// gracefully collapsing to fewer, coarser labels at lower step counts.
var VS_ZONE_LABELS = {
  3: ['Dark','Middle','Light'],
  4: ['Dark','Middle Dark','Middle Light','Light'],
  5: ['Dark','Dark Middle','Middle','Light Middle','Light'],
  7: ['Dark Dark','Dark','Dark Middle','Middle','Light Middle','Light','Light Light'],
  9: ['Dark Dark','Middle Dark','Light Dark','Dark Middle','Middle Middle','Light Middle','Dark Light','Middle Light','Light Light'],
};

var _vsScaleChartBuilt=false;
function renderValueStudyPage(){
  // The reference scale chart is static content — build it once, the first
  // time this page is ever shown, rather than on every navigation to it.
  if(!_vsScaleChartBuilt){ renderValueStudyScaleChart(); _vsScaleChartBuilt=true; }
  populateVsSuggestSelect();
  // Nothing else to do until a photo is loaded — the empty state is already
  // in the DOM. If we're returning to this page with a photo already loaded
  // (e.g. switching tabs and back), just make sure the canvases are current.
  if(vsState.img) redrawValueStudy();
}

// Renders the always-visible 9-step reference scale — independent of any
// uploaded photo. Built once from the same VS_ZONE_LABELS/luminance model as
// the photo tool below, so the numbering and terminology stay consistent
// between "the chart you look up" and "the tool you sample values with".
function renderValueStudyScaleChart(){
  var wrap=document.getElementById('vs-scale-chart');
  if(!wrap) return;
  var n=9;
  var labels=VS_ZONE_LABELS[9];
  var cells='';
  // Display light (zone n-1) first through dark (zone 0) last, matching the
  // reference convention of Light Light=1 … Dark Dark=9 running left to right.
  for(var i=n-1;i>=0;i--){
    var grey=Math.round(((i+0.5)/n)*255);
    var hex=rgbToHex(grey,grey,grey);
    var displayNum=n-i;
    var textCol = grey>140 ? '#1c1a16' : '#f5f0e8';
    cells+='<div class="vs-scale-cell" style="background:'+hex+';color:'+textCol+';">'
      +'<span class="vs-scale-cell-label">'+labels[i]+'</span>'
      +'<span class="vs-scale-cell-num">'+displayNum+'</span>'
      +'</div>';
  }
  wrap.innerHTML=cells;
}

// ── ROLL A REFERENCE ─────────────────────────────────────────────────
// Ported from the standalone Reference Roll app so rolling a reference and
// analyzing its values are one flow instead of two apps and a screenshot in
// between. Only the "master" (curated public-domain watercolors) and
// "photo" (random stock photo) sources are wired in here — "prompt" mode in
// Reference Roll generates a text prompt with no image, so it has nothing
// for Value Study to analyze and stays out of scope for this integration.

// Curated public-domain watercolors, verified Wikimedia Commons filenames —
// identical list to Reference Roll's MASTERS_WATERCOLOR, so a piece you've
// seen there will show up here too.
var VS_MASTERS_WATERCOLOR = [
  { artist: 'J.M.W. Turner', title: 'Heidelberg with a Rainbow', year: '1840', file: 'Joseph Mallord William Turner - Heidelberg with a Rainbow, 1840.jpg' },
  { artist: 'J.M.W. Turner', title: 'Bell Rock Lighthouse', year: 'c.1819', file: 'Joseph Mallord William Turner - Bell Rock Lighthouse - Google Art Project.jpg' },
  { artist: 'J.M.W. Turner', title: 'Lucerne from the Lake', year: 'c.1841', file: 'Joseph Mallord William Turner - Lucerne from the Lake - Google Art Project.jpg' },
  { artist: 'J.M.W. Turner', title: 'Rheinfall (Rhine Falls)', year: '1841', file: 'William Turner Rheinfall 1841.jpg' },
  { artist: 'J.M.W. Turner', title: 'Venice from Fusina', year: '1821', file: 'J.M.W. Turner - Venice from Fusina (1821).jpg' },
  { artist: 'J.M.W. Turner', title: 'The Sarner See, Evening', year: 'c.1842', file: 'JMW Turner, The Sarner See (Lake Sarnen), Evening c.1842, watercolor.jpg' },
  { artist: 'J.M.W. Turner', title: 'The Chain Pier at Brighton', year: 'c.1828', file: 'JMW Turner, The Chain Pier at Brighton, Royal Pavilion.jpg' },
  { artist: 'J.M.W. Turner', title: 'Fishmarket on the Sands, Early Morning', year: '1824', file: "JMW Turner's watercolour, 'Fishmarket on the Sands, Early Morning 1824'.jpg" },
  { artist: 'Winslow Homer', title: 'The Gulf Stream', year: '1899', file: 'Winslow Homer - The Gulf Stream (watercolour).jpg' },
  { artist: 'Winslow Homer', title: 'Sunset at Gloucester', year: '1880', file: 'Winslow Homer - Sunset at Gloucester.jpg' },
  { artist: 'Winslow Homer', title: 'Rowboat', year: '1880', file: 'Winslow Homer - Rowboat.jpg' },
  { artist: 'Winslow Homer', title: 'The Milk Maid', year: '1878', file: 'Winslow Homer - The Milk Maid (1878).jpg' },
  { artist: 'Winslow Homer', title: 'Boy in a Boatyard', year: '1873', file: 'Winslow Homer - Boy in a Boatyard.jpg' },
  { artist: 'Winslow Homer', title: 'After the Hurricane, Bahamas', year: '1899', file: 'Winslow Homer - After the Hurricane, Bahamas.jpg' },
  { artist: 'Winslow Homer', title: 'Fishing', year: '1878', file: 'Winslow Homer - Fishing (1878).jpg' },
  { artist: 'Winslow Homer', title: 'Boy Fishing', year: '1892', file: 'Winslow Homer - Boy Fishing (1892).jpg' },
  { artist: 'Winslow Homer', title: 'The Blue Boat', year: '1892', file: 'Winslow Homer - The Blue Boat - Google Art Project.jpg' },
  { artist: 'Winslow Homer', title: 'Hound and Hunter (sketch)', year: 'c.1892', file: 'Winslow Homer - Hound and Hunter (sketch).jpg' },
  { artist: 'Winslow Homer', title: 'Deer Drinking', year: 'c.1892', file: 'Winslow Homer - Deer Drinking.jpg' },
  { artist: 'Winslow Homer', title: 'Old Friends', year: 'c.1894', file: 'Winslow Homer - Old Friends.jpg' },
  { artist: 'Winslow Homer', title: 'Adirondacks Guide', year: '1894', file: 'Winslow Homer - Adirondacks Guide.jpg' },
  { artist: 'Winslow Homer', title: 'Campfire, Adirondacks', year: 'c.1892', file: 'Winslow Homer - Campfire, Adirondacks.jpg' },
  { artist: 'John Singer Sargent', title: 'Above Lake Garda at San Vigilio', year: 'c.1913', file: 'John Singer Sargent - Above Lake Garda at San Vigilio.jpg' },
  { artist: 'John Singer Sargent', title: 'Corfu, Lights and Shadows', year: 'c.1909', file: 'John Singer Sargent - Corfu, lights and shadows.jpg' },
  { artist: 'John Singer Sargent', title: 'Cottage at Fairford, Gloucestershire', year: 'c.1917', file: 'John Singer Sargent - Cottage at Fairford, Gloucestershire.jpg' },
  { artist: 'John Singer Sargent', title: 'Fog above Lake Garda at San Vigilio', year: '1913', file: 'John Singer Sargent - Fog above lake Garda at San Vigilio 1913.jpg' },
  { artist: 'John Singer Sargent', title: 'San Vigilio', year: '1913', file: 'John Singer Sargent - San Vigilio 1913.jpg' },
  { artist: 'John Singer Sargent', title: 'Scuola Grande di San Rocco', year: 'c.1903', file: 'John Singer Sargent - Scuola Grande di San Rocco.jpg' },
  { artist: 'John Singer Sargent', title: 'Spanish Fountain', year: 'c.1912', file: 'John Singer Sargent - Spanish Fountain.jpg' },
  { artist: 'John Singer Sargent', title: 'The Jetty at San Vigilio', year: '1913', file: 'John Singer Sargent - The Jetty at San Vigilio 1913.jpg' },
  { artist: 'John Singer Sargent', title: 'Under the Willows', year: 'c.1917', file: 'John Singer Sargent - Under the Willows - Google Art Project.jpg' },
  { artist: 'John Singer Sargent', title: 'Muddy Alligators', year: '1917', file: 'Sargent - Muddy Alligators.jpg' },
  { artist: 'John Singer Sargent', title: 'View from a Window, Genoa', year: 'undated', file: 'John Singer Sargent - View from a Window, Genoa.jpg' },
  { artist: 'John Singer Sargent', title: 'A Venetian Trattoria', year: 'c.1903', file: 'Sargent - A Venetian Trattoria, c. 1902-1903, Cat. 1079.jpg' },
  { artist: 'John Singer Sargent', title: 'Boats at Anchor', year: '1917', file: 'Sargent - Boats at Anchor, 1917, 1917.90.jpg' },
  { artist: 'John Sell Cotman', title: 'A Ruined House', year: 'c.1808', file: 'A Ruined House by John Sell Cotman, watercolor.jpg' },
  { artist: 'John Sell Cotman', title: 'Spanish Chestnut Tree, Struck by Lightning', year: 'c.1808', file: 'Spanish Chestnut Tree, Struck by Lightning by John Sell Cotman.jpg' },
  { artist: 'John Sell Cotman', title: 'A Windmill', year: 'c.1828', file: 'John Sell Cotman, A Windmill, c. 1828. watercolor.jpg' },
  { artist: 'John Sell Cotman', title: "St. Benet's Abbey", year: 'c.1831', file: "John Sell Cotman - St. Benet's Abbey - Google Art Project.jpg" },
  { artist: 'John Sell Cotman', title: 'Castle at Alençon', year: 'undated', file: 'John Sell Cotman - Castle at Alencon - Google Art Project.jpg' },
  { artist: 'John Sell Cotman', title: 'A Castle Tower (Caernarvon Castle)', year: 'undated', file: 'John Sell Cotman - A Castle Tower (Caernarvon Castle) - Google Art Project.jpg' },
  { artist: 'John Sell Cotman', title: 'Mountainous Landscape, North Wales', year: 'undated', file: 'John Sell Cotman - Mountainous Landscape, North Wales - Google Art Project.jpg' },
  { artist: 'John Sell Cotman', title: 'Boats at Anchor on Breydon Water', year: 'undated', file: 'Boats at Anchor on Breydon Water - John Sell Cotman.jpg' },
  { artist: 'Thomas Girtin', title: 'Romantic Landscape', year: 'c.1798', file: 'Thomas Girtin - Romantic Landscape - Google Art Project.jpg' },
  { artist: 'Thomas Girtin', title: 'View of Rochester', year: 'c.1798', file: 'Thomas Girtin - View of Rochester - Google Art Project.jpg' },
  { artist: 'Thomas Girtin', title: 'Dover', year: 'c.1798', file: 'Thomas Girtin - Dover - Google Art Project.jpg' },
  { artist: 'Thomas Girtin', title: 'Tynemouth Priory, Northumberland', year: 'c.1793', file: 'Thomas Girtin - Tynemouth Priory, Northumberland - Google Art Project.jpg' },
  { artist: 'Thomas Girtin', title: 'Lyme Regis, Dorset', year: 'undated', file: 'Thomas Girtin - Lyme Regis, Dorset - Google Art Project.jpg' },
  { artist: 'Thomas Girtin', title: 'Jedburgh Abbey from the South East', year: '1798', file: 'Thomas Girtin - Jedburgh Abbey from the South East - Google Art Project.jpg' },
  { artist: 'Paul Cézanne', title: 'Landscape with Trees', year: 'undated', file: 'Paul Cézanne- Landscape with Trees.jpg' },
  { artist: 'Paul Cézanne', title: 'Well and Winding Path in the Park of Château Noir', year: 'undated', file: 'Paul Cézanne- Well and Winding Path in the Park of Château Noir.jpg' },
  { artist: 'Paul Cézanne', title: 'Rocks at Bibémus', year: '1887', file: '1887, Cézanne, Rocks at Bibémus.jpg' },
  { artist: 'Paul Cézanne', title: 'Forest Interior', year: '1890', file: '1890, Cézanne, Forest Interior.jpg' },
  { artist: 'Paul Cézanne', title: 'House in Provence', year: '1890', file: '1890, Cézanne, House in Provence.jpg' },
  { artist: 'Paul Cézanne', title: 'Mont Sainte Victoire', year: '1900', file: '1900, Cézanne, Mont Sainte Victoire.jpg' },
  { artist: 'Paul Cézanne', title: 'Path, Trees, and Walls', year: '1900', file: '1900, Cézanne, Path, Trees, and Walls.jpg' },
  { artist: 'Paul Cézanne', title: 'Undergrowth', year: '1900', file: '1900, Cézanne, Undergrowth.jpg' }
];

// Shuffle-bag picker (same approach as Reference Roll): draws every piece
// once before any repeat, and nudges the reshuffle so it can't hand back
// the piece that just showed.
var _vsMasterBag=[], _vsMasterLast=-1;
function vsShuffledIndices(n){
  var arr=[]; for(var i=0;i<n;i++) arr.push(i);
  for(var j=arr.length-1;j>0;j--){
    var k=Math.floor(Math.random()*(j+1));
    var t=arr[j]; arr[j]=arr[k]; arr[k]=t;
  }
  return arr;
}
function vsNextMasterIndex(){
  if(_vsMasterBag.length===0){
    var bag=vsShuffledIndices(VS_MASTERS_WATERCOLOR.length);
    if(VS_MASTERS_WATERCOLOR.length>1 && bag[bag.length-1]===_vsMasterLast){
      var swapWith=Math.floor(Math.random()*(bag.length-1));
      var t=bag[bag.length-1]; bag[bag.length-1]=bag[swapWith]; bag[swapWith]=t;
    }
    _vsMasterBag=bag;
  }
  var idx=_vsMasterBag.pop();
  _vsMasterLast=idx;
  return idx;
}

var vsRollMode=null;          // 'master' | 'photo' — remembers the last roll source for "Roll Another"
var vsCurrentAttribution=null;

// Resolves a Commons filename to its actual file URL on upload.wikimedia.org
// via the MediaWiki API's own documented CORS support (the origin=* param
// makes the API respond with Access-Control-Allow-Origin). This matters
// because going through commons.wikimedia.org/wiki/Special:FilePath (a
// redirect) turned out not to support CORS reliably for canvas reads —
// confirmed by two failed rolls in testing — whereas a direct
// upload.wikimedia.org file URL does; it's the same host MDN's own
// reference documentation uses as its worked example for cross-origin
// canvas images.
async function vsResolveCommonsUrl(filename){
  var api='https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url&iiurlwidth=900&titles='+encodeURIComponent('File:'+filename);
  var res=await fetch(api);
  if(!res.ok) throw new Error('Commons API request failed: '+res.status);
  var data=await res.json();
  var pages=data.query && data.query.pages;
  var page=pages && Object.values(pages)[0];
  var info=page && page.imageinfo && page.imageinfo[0];
  if(!info || (!info.thumburl && !info.url)) throw new Error('No image URL returned for '+filename);
  return info.thumburl || info.url;
}

async function vsRollMaster(){
  vsRollMode='master';
  var piece=VS_MASTERS_WATERCOLOR[vsNextMasterIndex()];
  vsCurrentAttribution={
    text: piece.artist+' — '+piece.title+', '+piece.year,
    link: 'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(piece.file)
  };
  showToast('Rolling…');
  try{
    var directUrl=await vsResolveCommonsUrl(piece.file);
    vsLoadRemoteImage(directUrl, "That reference couldn't be loaded — try rolling again");
  }catch(err){
    console.error('Commons lookup failed:',err);
    showToast("Couldn't reach Wikimedia Commons — try rolling again");
  }
}

function vsRollPhoto(){
  vsRollMode='photo';
  vsCurrentAttribution=null;
  var seed=Math.floor(Math.random()*1e9);
  vsLoadRemoteImage('https://picsum.photos/seed/'+seed+'/900/900', "That photo couldn't be loaded — try rolling again");
}

function vsRollAgain(){
  if(vsRollMode==='photo') vsRollPhoto();
  else vsRollMaster();
}

// ── ROLL A PAINTING PROMPT (dice mode) ──────────────────────────────
// Ported from Reference Roll's four-dice prompt generator. Unlike master/
// photo rolls, a prompt has no image, so it can't feed Value Study's
// posterization — it's shown as its own small card, independent of whether
// a photo is loaded, rather than living inside the photo workspace.
var PROMPT_DATA = {
  subject: [
    'a lighthouse', 'an old barn', 'a fishing boat', 'a mountain range', 'a solitary tree',
    'a market stall', 'a narrow alley', 'a stone bridge', 'a windmill', 'a train station platform',
    'a garden gate', 'a farmhouse', 'a harbor at rest', 'a cathedral facade', 'a fruit stand',
    'a snow-covered field', 'a courtyard fountain', 'a row of terraced houses', 'a lone rowboat',
    'a mountain cabin', 'a city rooftop', 'a country crossroads', 'a vineyard hillside', 'a tide pool',
    'a forest clearing', 'a covered bridge', "a lighthouse keeper's cottage", 'a canal with moored boats',
    'a weathered dock', 'a hillside chapel'
  ],
  setting: [
    'at dawn', 'at dusk', 'under a midday sun', 'in thick fog', 'during a passing storm',
    'in deep winter', 'under a full moon', 'in autumn rain', 'at low tide', 'in golden hour light',
    'under a heavy overcast sky', 'in early spring', 'at the blue hour', 'during a light snowfall',
    'in the heat of late summer', 'just after a rainstorm', 'under a starlit sky', 'in a sudden gust of wind',
    'at first light', 'in the last light of day', 'under scattered clouds', 'in a warm afternoon haze',
    'during a quiet drizzle', 'at high tide'
  ],
  object: [
    'a single red umbrella', 'smoke curling from a chimney', 'laundry drying on a line',
    'a bicycle leaning against a wall', 'birds scattering into flight', 'a cat asleep in a window',
    'reflections rippling in a puddle', 'a broken picket fence', 'string lights strung overhead',
    'a rusted weathervane', 'a stack of split firewood', 'a door left ajar', 'a lantern hanging from a hook',
    'a coil of rope on the dock', 'a scarecrow in the distance', 'an overturned wheelbarrow',
    'ivy climbing a wall', 'a row of empty chairs', 'a kite caught in a tree', 'footprints in wet sand',
    'a chalkboard sign out front', 'a stray dog crossing the road', 'moss growing on stone steps',
    'a clothesline snapping in the wind', 'a single lit window', 'gulls circling overhead'
  ],
  mood: [
    'melancholic', 'serene', 'dramatic', 'nostalgic', 'quietly tense', 'joyful', 'mysterious',
    'hushed and still', 'bustling', 'isolated', 'romantic', 'eerie', 'triumphant', 'peaceful',
    'foreboding', 'wistful', 'restless', 'tender', 'solemn', 'playful', 'brooding', 'hopeful',
    'lonesome', 'electric with energy'
  ]
};
var promptBags={subject:[],setting:[],object:[],mood:[]};
var promptLastPicked={subject:null,setting:null,object:null,mood:null};
var currentPrompt={subject:0,setting:0,object:0,mood:0};
var _vsPromptRolledOnce=false;

function vsNextPromptIndex(cat){
  var list=PROMPT_DATA[cat];
  if(!promptBags[cat] || promptBags[cat].length===0){
    var bag=vsShuffledIndices(list.length);
    if(list.length>1 && bag[bag.length-1]===promptLastPicked[cat]){
      var swapWith=Math.floor(Math.random()*(bag.length-1));
      var t=bag[bag.length-1]; bag[bag.length-1]=bag[swapWith]; bag[swapWith]=t;
    }
    promptBags[cat]=bag;
  }
  var idx=promptBags[cat].pop();
  promptLastPicked[cat]=idx;
  return idx;
}

function vsRenderPrompt(){
  var els={
    subject:document.getElementById('vs-prompt-subject'),
    setting:document.getElementById('vs-prompt-setting'),
    object:document.getElementById('vs-prompt-object'),
    mood:document.getElementById('vs-prompt-mood')
  };
  Object.keys(els).forEach(function(cat){
    if(els[cat]) els[cat].textContent=PROMPT_DATA[cat][currentPrompt[cat]];
  });
}

function vsRollAllPrompt(){
  currentPrompt={
    subject:vsNextPromptIndex('subject'),
    setting:vsNextPromptIndex('setting'),
    object:vsNextPromptIndex('object'),
    mood:vsNextPromptIndex('mood')
  };
  _vsPromptRolledOnce=true;
  vsRenderPrompt();
  vsTogglePromptCard(true);
}

function vsRerollPromptCat(cat){
  currentPrompt[cat]=vsNextPromptIndex(cat);
  vsRenderPrompt();
}

// show: true=open, false=close, undefined=toggle. Rolls a first prompt
// automatically the very first time the card is opened, so it never shows
// the empty "—" placeholders.
function vsTogglePromptCard(show){
  var card=document.getElementById('vs-prompt-card');
  if(!card) return;
  var willShow = show===undefined ? (card.style.display==='none') : show;
  card.style.display = willShow ? 'block' : 'none';
  if(willShow && !_vsPromptRolledOnce) vsRollAllPrompt();
}

// Loads an image from Wikimedia Commons or Picsum and hands it to the same
// loadValueStudyImage() pipeline the manual-upload path uses.
//
// First attempt requests CORS (crossOrigin='anonymous') so the canvas stays
// readable for value analysis. Wikimedia Commons' Special:FilePath doesn't
// reliably send CORS headers, though — Reference Roll's own source has a
// comment noting the same discovery — so if that request fails outright,
// this retries the identical URL without requesting CORS. That second
// attempt will reliably display the image, but if the source genuinely
// has no CORS support, reading pixel data from it will still fail — in
// which case loadValueStudyImage's own probe catches that and this
// surfaces a clear "can't analyze this one" message rather than silently
// leaving stale content on screen.
function vsLoadRemoteImage(url,failMsg,_attempt){
  var attempt=_attempt||0;
  showToast(attempt===0 ? 'Rolling…' : 'Retrying…');
  var img=new Image();
  if(attempt===0) img.crossOrigin='anonymous';
  img.onload=function(){
    try{
      loadValueStudyImage(img);
      renderVsAttribution();
    }catch(err){
      console.error('Value Study remote load failed:',err);
      if(attempt===0){
        vsLoadRemoteImage(url,failMsg,1);
      } else {
        showToast("This reference can't be read for value analysis — try rolling again");
      }
    }
  };
  img.onerror=function(){
    if(attempt===0){
      vsLoadRemoteImage(url,failMsg,1);
    } else {
      showToast(failMsg);
    }
  };
  img.src=url;
}

function renderVsAttribution(){
  var el=document.getElementById('vs-attribution');
  if(!el) return;
  if(vsCurrentAttribution){
    el.style.display='block';
    el.innerHTML='<a href="'+vsCurrentAttribution.link+'" target="_blank" rel="noopener">'+vsCurrentAttribution.text+'</a> · public domain, via Wikimedia Commons';
  } else {
    el.style.display='none';
  }
}

function triggerValueStudyUpload(){
  var inputId='_vs_photoinput';
  var inp=document.getElementById(inputId);
  if(!inp){
    inp=document.createElement('input');
    // No 'capture' attribute here — Value Study is almost always used with an
    // EXISTING reference photo (from the camera roll, a saved image, a photo
    // taken earlier), not a fresh camera shot. Setting capture='environment'
    // forces mobile browsers straight into the live camera and skips the
    // photo library picker entirely, which is wrong for this use case.
    inp.type='file'; inp.accept='image/*';
    inp.id=inputId; inp.style.display='none';
    document.body.appendChild(inp);
    inp.addEventListener('change',function(){
      var file=inp.files[0]; if(!file) return;
      var reader=new FileReader();
      reader.onerror=function(){
        showToast('Could not read that photo — try a different one');
      };
      reader.onload=function(ev){
        var img=new Image();
        img.onerror=function(){
          // Some iOS photo formats (HEIC originals that didn't convert
          // cleanly, certain edited/Live Photo exports) can fail to decode
          // as an <img>. Fail loudly instead of leaving a blank workspace
          // with no explanation.
          showToast('That photo could not be loaded — try exporting it as JPEG or taking a new screenshot of it');
        };
        img.onload=function(){
          try{
            vsRollMode=null;
            vsCurrentAttribution=null;
            loadValueStudyImage(img);
            renderVsAttribution();
          }catch(err){
            console.error('Value Study load failed:', err);
            showToast('Something went wrong loading that photo — try a smaller or different image');
            // Roll back to a clean empty state rather than leaving a mixed
            // half-loaded UI on screen.
            var toolSectionEl=document.querySelector('.vs-tool-section');
            if(toolSectionEl) toolSectionEl.classList.remove('vs-has-photo');
          }
        };
        img.src=ev.target.result;
      };
      reader.readAsDataURL(file);
      inp.value='';
    });
  }
  inp.click();
}

function loadValueStudyImage(img){
  vsState.img=img;
  vsState.splitPct=50;

  // Cap working resolution for performance AND to stay well under iOS
  // Safari's canvas memory ceiling — the app already keeps many other
  // canvases alive (every rendered swatch), and iOS silently fails/blanks
  // canvas allocations once total canvas memory across the page gets too
  // high. 700px on the long edge (down from 900) gives more headroom while
  // still being plenty for on-screen display and a clean exported PNG.
  var MAX=700;
  var scale=Math.min(1, MAX/Math.max(img.width,img.height));
  var w=Math.max(1,Math.round(img.width*scale)), h=Math.max(1,Math.round(img.height*scale));

  var oc=document.createElement('canvas'); oc.width=w; oc.height=h;
  var octx=oc.getContext('2d');
  if(!octx) throw new Error('Could not get 2D canvas context');
  octx.drawImage(img,0,0,w,h);

  // Confirm the draw actually produced readable pixel data before
  // committing to this as the new state — catches tainted-canvas errors
  // and silent iOS allocation failures immediately, with a clear message,
  // rather than leaving a permanently blank workspace.
  var probe;
  try{
    probe = octx.getImageData(0,0,Math.min(4,w),Math.min(4,h));
  }catch(err){
    var isCorsIssue = err && err.name==='SecurityError';
    throw new Error(isCorsIssue
      ? "This image's source doesn't allow reading its pixel data here, so it can be viewed but not analyzed for values."
      : 'Could not read image data from the photo (it may be a format the browser can\'t process here): '+err.message);
  }
  if(!probe || !probe.data || probe.data.length===0){
    throw new Error('Photo loaded but produced no image data');
  }

  vsState.origCanvas=oc;

  var toolSection=document.querySelector('.vs-tool-section');
  if(toolSection) toolSection.classList.add('vs-has-photo');

  posterizeValueStudy();
  redrawValueStudy();

  // Fade the "tap to sample" hint out after a few seconds so it doesn't
  // linger and clutter the image once the user gets it.
  var hint=document.getElementById('vs-canvas-hint');
  hint.classList.remove('hide');
  clearTimeout(window._vsHintTimer);
  window._vsHintTimer=setTimeout(function(){ hint.classList.add('hide'); },4000);
}

// Converts the loaded photo to greyscale using perceptual (Rec. 601)
// luminance weighting, then quantizes into vsState.zones evenly-spaced
// bands. Rebuilds vsState.postCanvas and the histogram/zone-count data used
// by the side panel. Called whenever the photo loads or the zone count changes.
function posterizeValueStudy(){
  var oc=vsState.origCanvas;
  var w=oc.width, h=oc.height;
  var octx=oc.getContext('2d');
  var src=octx.getImageData(0,0,w,h);

  var pc=document.createElement('canvas'); pc.width=w; pc.height=h;
  var pctx=pc.getContext('2d');
  var out=pctx.createImageData(w,h);

  var n=vsState.zones;
  // Zone boundaries in 0–255 luminance space, evenly spaced.
  var bounds=[];
  for(var i=1;i<n;i++) bounds.push(Math.round(255*i/n));
  vsState.zoneBounds=bounds;

  // Representative grey level for each zone: the CENTRE of its luminance
  // range rather than a flat linear ramp — this keeps the darkest zone from
  // reading as pure black and the lightest from reading as pure white unless
  // the photo actually contains those extremes, which better matches how a
  // limited-value painting is actually mixed (you rarely mix true 0/255).
  var counts=new Array(n).fill(0);
  var d=src.data, od=out.data;
  for(var p=0;p<d.length;p+=4){
    var lum = d[p]*0.299 + d[p+1]*0.587 + d[p+2]*0.114;
    var zone=0;
    while(zone<bounds.length && lum>=bounds[zone]) zone++;
    counts[zone]++;
    var repGrey = Math.round(((zone+0.5)/n)*255);
    od[p]=od[p+1]=od[p+2]=repGrey; od[p+3]=255;
  }
  pctx.putImageData(out,0,0);
  vsState.postCanvas=pc;
  vsState.zoneCounts=counts;

  renderValueStudyHistogram();
  renderValueStudyZoneKey();
  renderValueStudyReading();
}

function setValueStudyZones(n){
  vsState.zones=n;
  document.querySelectorAll('.vs-zone-btn').forEach(function(b){
    b.classList.toggle('active', parseInt(b.dataset.n,10)===n);
  });
  if(vsState.img){ posterizeValueStudy(); redrawValueStudy(); }
}

function setValueStudyView(view){
  vsState.view=view;
  document.querySelectorAll('.vs-view-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.view===view);
  });
  redrawValueStudy();
}

// Draws both the original and posterized canvases into the visible on-screen
// canvases and applies the current view mode (split / posterized-only /
// original-only) via the clip-path on the posterized layer + handle visibility.
function redrawValueStudy(){
  if(!vsState.origCanvas||!vsState.postCanvas) return;
  var ocv=document.getElementById('vs-canvas-original');
  var pcv=document.getElementById('vs-canvas-posterized');
  var w=vsState.origCanvas.width, h=vsState.origCanvas.height;
  ocv.width=w; ocv.height=h;
  pcv.width=w; pcv.height=h;
  ocv.getContext('2d').drawImage(vsState.origCanvas,0,0);
  pcv.getContext('2d').drawImage(vsState.postCanvas,0,0);

  var handle=document.getElementById('vs-split-handle');
  if(vsState.view==='split'){
    pcv.style.clipPath='inset(0 0 0 '+vsState.splitPct+'%)';
    handle.style.display='block';
    handle.style.left=vsState.splitPct+'%';
    ocv.style.opacity='1'; pcv.style.opacity='1';
  } else if(vsState.view==='posterized'){
    pcv.style.clipPath='inset(0 0 0 0)';
    handle.style.display='none';
    ocv.style.opacity='0'; pcv.style.opacity='1';
  } else { // original
    pcv.style.clipPath='inset(0 0 0 100%)';
    handle.style.display='none';
    ocv.style.opacity='1'; pcv.style.opacity='1';
  }
}

// ── Split-divider dragging ──
(function(){
  var dragging=false;
  var justDragged=false; // suppresses the click event a drag-release also fires
  function pctFromEvent(e, wrap){
    var rect=wrap.getBoundingClientRect();
    var x=(e.touches?e.touches[0].clientX:e.clientX)-rect.left;
    return Math.max(0, Math.min(100, (x/rect.width)*100));
  }
  function bind(){
    var handle=document.getElementById('vs-split-handle');
    var wrap=document.getElementById('vs-canvas-wrap');
    if(!handle||!wrap||handle._vsBound) return;
    handle._vsBound=true;
    handle.addEventListener('mousedown', function(e){ dragging=true; e.preventDefault(); });
    handle.addEventListener('touchstart', function(e){ dragging=true; }, {passive:true});
    window.addEventListener('mousemove', function(e){
      if(!dragging||vsState.view!=='split') return;
      justDragged=true;
      vsState.splitPct=pctFromEvent(e, wrap);
      redrawValueStudy();
    });
    window.addEventListener('touchmove', function(e){
      if(!dragging||vsState.view!=='split') return;
      justDragged=true;
      vsState.splitPct=pctFromEvent(e, wrap);
      redrawValueStudy();
      e.preventDefault();
    }, {passive:false});
    function endDrag(){
      if(dragging&&justDragged){
        // A drag that actually moved the handle will also fire a native
        // 'click' on whatever element is under the pointer at release —
        // often the canvas wrapper, which would otherwise incorrectly drop
        // a sample marker at that spot. Swallow exactly one click after a
        // real drag; a plain click without movement is unaffected.
        window._vsSuppressNextClick=true;
        setTimeout(function(){ window._vsSuppressNextClick=false; },0);
      }
      dragging=false; justDragged=false;
    }
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);
  }
  window._vsBindSplitHandle=bind;
  bind();
})();

// ── Tap/click to sample a value at a point ──
(function(){
  function bind(){
    var wrap=document.getElementById('vs-canvas-wrap');
    if(!wrap||wrap._vsSampleBound) return;
    wrap._vsSampleBound=true;
    wrap.addEventListener('click', function(e){
      // Ignore the synthetic click a split-handle drag-release also fires,
      // and ignore clicks that land directly on the handle itself.
      if(window._vsSuppressNextClick) return;
      if(e.target&&e.target.id==='vs-split-handle') return;
      sampleValueStudyAt(e);
    });
  }
  window._vsBindSampler=bind;
  bind();
})();

function sampleValueStudyAt(e){
  if(!vsState.origCanvas) return;
  var wrap=document.getElementById('vs-canvas-wrap');
  var rect=wrap.getBoundingClientRect();

  // The canvas is displayed with object-fit:contain, so we need to map the
  // click position from wrapper-space into actual image-pixel-space,
  // accounting for the letterboxing on whichever axis doesn't fill the wrap.
  var iw=vsState.origCanvas.width, ih=vsState.origCanvas.height;
  var scale=Math.min(rect.width/iw, rect.height/ih);
  var dispW=iw*scale, dispH=ih*scale;
  var offX=(rect.width-dispW)/2, offY=(rect.height-dispH)/2;
  var clickX=e.clientX-rect.left, clickY=e.clientY-rect.top;
  var px=Math.round((clickX-offX)/scale), py=Math.round((clickY-offY)/scale);
  if(px<0||py<0||px>=iw||py>=ih) return; // clicked in the letterbox margin

  var octx=vsState.origCanvas.getContext('2d');
  var pixel=octx.getImageData(px,py,1,1).data;
  var lum=pixel[0]*0.299+pixel[1]*0.587+pixel[2]*0.114;
  var n=vsState.zones, bounds=vsState.zoneBounds;
  var zone=0;
  while(zone<bounds.length && lum>=bounds[zone]) zone++;
  var repGrey=Math.round(((zone+0.5)/n)*255);
  var hex=rgbToHex(repGrey,repGrey,repGrey);
  var origHex=rgbToHex(pixel[0],pixel[1],pixel[2]);
  var labels=VS_ZONE_LABELS[n]||[];
  var label=labels[zone]||('Zone '+(zone+1));

  // Position the marker dot at the click point (in wrapper-space, so it
  // tracks correctly regardless of image scale/letterboxing).
  var marker=document.getElementById('vs-sample-marker');
  marker.style.left=clickX+'px'; marker.style.top=clickY+'px';
  marker.style.background=origHex;
  marker.style.display='block';

  var pct=Math.round((lum/255)*100);
  document.getElementById('vs-sample-readout').innerHTML=
    '<div class="vs-sample-swatch" style="background:'+hex+';"></div>'
    +'<div class="vs-sample-info">'
      +'<div class="vs-sample-zone">'+label+' <span style="color:var(--ink3);font-weight:400;">— Zone '+(n-zone)+' of '+n+'</span></div>'
      +'<div class="vs-sample-meta">Luminance '+Math.round(lum)+'/255 · '+pct+'% light</div>'
      +'<div class="vs-sample-bar-wrap"><div class="vs-sample-bar" style="width:'+pct+'%;"></div></div>'
    +'</div>';

  var hint=document.getElementById('vs-canvas-hint');
  if(hint) hint.classList.add('hide');
}

// ── Side panel: histogram, zone key, plain-language reading ──
function renderValueStudyHistogram(){
  var wrap=document.getElementById('vs-histogram');
  if(!wrap||!vsState.zoneCounts) return;
  var counts=vsState.zoneCounts;
  var total=counts.reduce(function(a,b){return a+b;},0)||1;
  var max=Math.max.apply(null,counts)||1;
  var n=vsState.zones;
  wrap.innerHTML=counts.map(function(c,i){
    var h=Math.max(2, Math.round((c/max)*64));
    var grey=Math.round(((i+0.5)/n)*255);
    return '<div class="vs-histogram-bar" style="height:'+h+'px;background:'+rgbToHex(grey,grey,grey)+';" title="'+Math.round(c/total*100)+'%"></div>';
  }).join('');
}

function renderValueStudyZoneKey(){
  var wrap=document.getElementById('vs-zone-key');
  if(!wrap||!vsState.zoneCounts) return;
  var n=vsState.zones, counts=vsState.zoneCounts;
  var total=counts.reduce(function(a,b){return a+b;},0)||1;
  var labels=VS_ZONE_LABELS[n]||[];
  // Build light→dark for display (matches the reference value-scale convention
  // of "Light Light" first), while the underlying zone index (used in the
  // sample readout as "Zone X of N") stays dark=1…light=N internally.
  var rows=[];
  for(var i=n-1;i>=0;i--){
    var grey=Math.round(((i+0.5)/n)*255);
    var pct=Math.round(counts[i]/total*100);
    rows.push('<div class="vs-zone-key-row">'
      +'<div class="vs-zone-key-swatch" style="background:'+rgbToHex(grey,grey,grey)+';"></div>'
      +'<div class="vs-zone-key-label">'+(labels[i]||('Zone '+(i+1)))+'</div>'
      +'<div class="vs-zone-key-pct">'+pct+'%</div>'
      +'</div>');
  }
  wrap.innerHTML=rows.join('');
}

// A short plain-language read on the photo's overall tonal character —
// genuinely useful before committing to paint something, since it tells you
// at a glance whether you're looking at a high-key, low-key, or full-range
// subject, which should inform how you plan your washes.
function renderValueStudyReading(){
  var wrap=document.getElementById('vs-key-reading');
  if(!wrap||!vsState.zoneCounts) return;
  var n=vsState.zones, counts=vsState.zoneCounts;
  var total=counts.reduce(function(a,b){return a+b;},0)||1;
  // counts[0] is the DARKEST zone and counts[n-1] is the LIGHTEST (matches
  // posterizeValueStudy's indexing), so the low end of the array is the dark
  // share and the high end is the light share.
  var darkShare=(counts.slice(0,Math.ceil(n/3)).reduce(function(a,b){return a+b;},0))/total;
  var lightShare=(counts.slice(-Math.ceil(n/3)).reduce(function(a,b){return a+b;},0))/total;
  var midShare=1-lightShare-darkShare;

  var character;
  if(lightShare>0.55) character='This is a <b>high-key</b> subject — dominated by light values. Keep your darkest dark deliberate and small, or it will overpower the piece.';
  else if(darkShare>0.55) character='This is a <b>low-key</b> subject — dominated by dark values. Save a few genuinely light passages so the darks read as dark by contrast.';
  else if(midShare>0.55) character='This subject sits mostly in the <b>middle values</b>, with limited extremes. Consider deliberately pushing your lightest light and darkest dark to add punch.';
  else character='This subject has a <b>full tonal range</b> — a healthy spread from light to dark. Good candidate for a confident, high-contrast study.';

  var dominant=counts.indexOf(Math.max.apply(null,counts));
  var labels=VS_ZONE_LABELS[n]||[];
  var domLabel=labels[dominant]||('Zone '+(dominant+1));

  wrap.innerHTML='<p>'+character+'</p><p style="margin-top:0.5rem;">Most common value: <b>'+domLabel+'</b> ('+Math.round(counts[dominant]/total*100)+'% of the frame).</p>';
}

// ── SUGGEST A PALETTE: connects Value Study's photo analysis to a real ──
// paint-shopping-list, so a reference photo turns into an actionable
// palette plan rather than just a value diagnosis. Reuses the same
// Kubelka-Munk matching engine as "Match a Color" in the Mixing view, and
// the same Lab-space distance used there.

function populateVsSuggestSelect(){
  var sel=document.getElementById('vs-suggest-palette-sel');
  if(!sel) return;
  var cur=sel.value || activePaletteId || '';
  sel.innerHTML='<option value="">Select a palette…</option>'+
    palettes.map(function(p){return '<option value="'+p.id+'"'+(p.id===cur?' selected':'')+'>'+p.name+'</option>';}).join('');
}

// Samples the loaded photo and returns its most visually significant
// colors. Pixels are bucketed into a coarse RGB grid (cheap, no true
// k-means), then buckets that are perceptually close in Lab space get
// folded into whichever is more dominant, so near-duplicate shades don't
// crowd out genuinely distinct hues. Sampling is capped at ~40,000 pixels
// regardless of photo size, since a dominant-color read doesn't need every
// pixel and this keeps it snappy on a phone.
function extractDominantColors(canvas,maxColors){
  maxColors=maxColors||6;
  var ctx=canvas.getContext('2d');
  var w=canvas.width,h=canvas.height;
  var data=ctx.getImageData(0,0,w,h).data;
  var totalPx=w*h;
  var stride=Math.max(1,Math.floor(totalPx/40000));
  var buckets={};
  var STEP=24;
  var px=0;
  for(var p=0;p<data.length;p+=4){
    px++;
    if(px%stride!==0) continue;
    var r=data[p],g=data[p+1],b=data[p+2];
    var key=Math.round(r/STEP)+','+Math.round(g/STEP)+','+Math.round(b/STEP);
    var bucket=buckets[key];
    if(!bucket){bucket={r:0,g:0,b:0,count:0};buckets[key]=bucket;}
    bucket.r+=r;bucket.g+=g;bucket.b+=b;bucket.count++;
  }
  var list=Object.keys(buckets).map(function(k){
    var bkt=buckets[k];
    return {hex:rgbToHex(bkt.r/bkt.count,bkt.g/bkt.count,bkt.b/bkt.count),count:bkt.count};
  });
  list.sort(function(a,b){return b.count-a.count;});
  var merged=[];
  list.forEach(function(c){
    var dupe=null;
    for(var i=0;i<merged.length;i++){ if(deltaE(merged[i].hex,c.hex)<10){dupe=merged[i];break;} }
    if(dupe) dupe.count+=c.count;
    else merged.push({hex:c.hex,count:c.count});
  });
  merged.sort(function(a,b){return b.count-a.count;});
  return merged.slice(0,maxColors);
}

// Returns roughly what luminance value (0-255, greyscale) the darkest ~2%
// of the photo sits at — a percentile rather than the single darkest pixel,
// so one noisy/JPEG-artifact pixel can't skew the reading. Uses a 256-bucket
// histogram pass rather than sorting every pixel, since sorting a few
// hundred thousand values on a phone is needlessly slow for this.
function photoDarkestLuminance(){
  if(!vsState.origCanvas) return null;
  var ctx=vsState.origCanvas.getContext('2d');
  var w=vsState.origCanvas.width,h=vsState.origCanvas.height;
  var data=ctx.getImageData(0,0,w,h).data;
  var hist=new Array(256).fill(0);
  var total=0;
  for(var p=0;p<data.length;p+=4){
    var lum=Math.round(data[p]*0.299+data[p+1]*0.587+data[p+2]*0.114);
    hist[lum]++;total++;
  }
  var target=total*0.02,acc=0;
  for(var i=0;i<256;i++){acc+=hist[i];if(acc>=target) return i;}
  return 255;
}

// How dark can this palette actually go? Checks both the single darkest
// paint as-is, and a "strategic mud" mix of the palette's 3 lowest-luminance
// paints layered together (the classic way painters reach a deep neutral
// dark without owning a black) — and reports whichever gets darker, since
// that's the honest ceiling on what the palette can reach.
function paletteDarkestReach(colors){
  if(!colors.length) return null;
  var byLum=colors.slice().sort(function(a,b){return hexToLab(a.hex)[0]-hexToLab(b.hex)[0];});
  var darkestSingle=byLum[0];
  var darkTrio=byLum.slice(0,Math.min(3,byLum.length));
  var mixedDark = darkTrio.length>1 ? mixPaintN(darkTrio.map(function(c){return {hex:c.hex,w:1};})) : darkTrio[0].hex;
  var mixedLum=hexToLab(mixedDark)[0];
  var singleLum=hexToLab(darkestSingle.hex)[0];
  var best = mixedLum<singleLum ? {hex:mixedDark,lum:mixedLum,via:'mixed'} : {hex:darkestSingle.hex,lum:singleLum,via:'single'};
  return {darkestSingle:darkestSingle,mixedDark:mixedDark,best:best};
}

function runValueStudySuggest(){
  var sel=document.getElementById('vs-suggest-palette-sel');
  var resultsEl=document.getElementById('vs-suggest-results');
  if(!sel||!resultsEl) return;
  var palId=sel.value;
  if(!palId){ resultsEl.innerHTML='<div class="vs-suggest-empty">Pick a palette first.</div>'; return; }
  if(!vsState.origCanvas){ resultsEl.innerHTML='<div class="vs-suggest-empty">Load a photo first.</div>'; return; }
  var pal=palettes.find(function(p){return p.id===palId;});
  if(!pal||!pal.colors.length){ resultsEl.innerHTML='<div class="vs-suggest-empty">That palette has no colors yet.</div>'; return; }

  resultsEl.innerHTML='<div class="vs-suggest-empty">Analyzing photo…</div>';
  setTimeout(function(){
    var dominants=extractDominantColors(vsState.origCanvas,6);
    var rows=dominants.map(function(d){
      var matches=findColorMatches(pal.colors,d.hex,{maxResults:1});
      return {target:d.hex,match:matches[0]};
    });

    var cardsHtml=rows.map(function(r){
      var m=r.match;
      if(!m){
        return '<div class="vs-suggest-card"><div class="vs-suggest-target" style="background:'+r.target+';"></div>'
          +'<div class="vs-suggest-info"><div class="vs-suggest-formula">No match found</div></div></div>';
      }
      var formula = m.idxs.length===1
        ? '<b>'+pal.colors[m.idxs[0]].name+'</b>'
        : m.idxs.map(function(idx,n){return Math.round(m.weights[n]*100)+'% <b>'+pal.colors[idx].name+'</b>';}).join(' + ');
      var label=deltaELabel(m.de);
      return '<div class="vs-suggest-card">'
        +'<div class="vs-suggest-target" style="background:'+r.target+';" title="From photo"></div>'
        +'<div class="vs-suggest-arrow">→</div>'
        +'<div class="vs-suggest-match-swatch" style="background:'+m.mixedHex+';"></div>'
        +'<div class="vs-suggest-info"><div class="vs-suggest-formula">'+formula+'</div>'
        +'<div class="vs-suggest-de '+label.cls+'">'+label.text+' · ΔE '+m.de.toFixed(1)+'</div></div>'
        +'</div>';
    }).join('');

    var reach=paletteDarkestReach(pal.colors);
    var photoGrey=photoDarkestLuminance();
    var warnHtml='';
    if(reach && photoGrey!=null){
      var photoHex=rgbToHex(photoGrey,photoGrey,photoGrey);
      var photoDarkL=hexToLab(photoHex)[0];
      var gap=reach.best.lum - photoDarkL;
      if(gap>8){
        warnHtml='<div class="vs-suggest-warn">⚠ Even '+(reach.best.via==='mixed' ? 'layering your 3 deepest paints together' : 'straight from <b>'+reach.darkestSingle.name+'</b>')+', your darkest achievable mix reads noticeably lighter than this photo\'s deepest shadows. Plan on 2–3 layered glazes to build the darks up, rather than expecting one wash to get there.</div>';
      } else {
        warnHtml='<div class="vs-suggest-ok">✓ This palette\'s darkest mix reaches this photo\'s shadow depth in a wash or two.</div>';
      }
    }
    resultsEl.innerHTML=cardsHtml+warnHtml;
  },10);
}

// Exports the current view (respecting split/posterized/original) as a PNG
// download — since photos aren't persisted in localStorage, this is the way
// to keep a value study for reference in the field or paste into notes later.
async function downloadValueStudy(){
  if(!vsState.origCanvas||!vsState.postCanvas){ showToast('Load a photo first'); return; }
  var w=vsState.origCanvas.width, h=vsState.origCanvas.height;
  var out=document.createElement('canvas'); out.width=w; out.height=h;
  var octx=out.getContext('2d');
  if(vsState.view==='original'){
    octx.drawImage(vsState.origCanvas,0,0);
  } else if(vsState.view==='posterized'){
    octx.drawImage(vsState.postCanvas,0,0);
  } else {
    var splitX=Math.round(w*vsState.splitPct/100);
    octx.drawImage(vsState.origCanvas,0,0);
    octx.save();
    octx.beginPath();
    octx.rect(splitX,0,w-splitX,h);
    octx.clip();
    octx.drawImage(vsState.postCanvas,0,0);
    octx.restore();
    octx.fillStyle='rgba(201,152,48,0.9)';
    octx.fillRect(splitX-1,0,2,h);
  }
  var dataUrl=out.toDataURL('image/png');

  // Prefer the native share sheet where it's available — an <a download>
  // click on a data URL is unreliable on iOS Safari (it often just opens
  // the image in a new tab instead of saving it) and is *especially*
  // unreliable once the app is installed to the home screen, since
  // standalone PWAs have limited download support. The share sheet gives
  // an explicit "Save Image" the person taps themselves, and confirms
  // success on its own — we don't need to (and shouldn't) also toast a
  // success message we can't actually verify.
  if(navigator.share && navigator.canShare){
    try{
      var blob=await (await fetch(dataUrl)).blob();
      var file=new File([blob],'value-study.png',{type:'image/png'});
      if(navigator.canShare({files:[file]})){
        await navigator.share({files:[file], title:'Value Study'});
        return;
      }
    }catch(err){
      if(err && err.name==='AbortError') return; // they cancelled the share sheet on purpose
      // otherwise fall through to the download fallback below
    }
  }

  // Fallback for browsers without file-sharing support (mainly desktop) —
  // this method does work reliably there, so the toast is accurate here.
  var link=document.createElement('a');
  link.download='value-study.png';
  link.href=dataUrl;
  link.click();
  showToast('Value study saved to your downloads');
}


function renderHarmonyColorGrid() {
  var grid = document.getElementById('harmony-color-grid');
  if (!grid) return;
  var q = (document.getElementById('harmony-search')||{value:''}).value.trim().toLowerCase();
  var palId = harmonyPalId;
  var pool;
  if (palId) {
    var pal = palettes.find(function(p){ return p.id===palId; });
    pool = pal ? pal.colors : COLORS;
  } else {
    pool = COLORS;
  }
  var filtered = pool.filter(function(c){
    if (q&&!c.name.toLowerCase().includes(q)&&!c.pigment.toLowerCase().includes(q)) return false;
    return true;
  });
  if (!palId && !q) filtered = filtered.slice(0,120);
  if (!filtered.length) { grid.innerHTML='<div style="color:var(--ink3);font-style:italic;padding:0.8rem;">No colors found.</div>'; return; }
  grid.innerHTML = filtered.map(function(c){
    var sel = harmonyColor && harmonyColor.name===c.name && harmonyColor.brand===c.brand;
    var sn=c.name.replace(/'/g,"\\'"), sb=c.brand.replace(/'/g,"\\'");
    var hcls='harmony-pick-card'+(sel?' selected':'');
    return '<div class="'+hcls+'" data-name="'+c.name.replace(/"/g,'&quot;')+'" data-brand="'+c.brand+'" onclick="setHarmonyRoot(this.dataset.name,this.dataset.brand)">'
      +'<div class="harmony-pick-swatch" style="background:'+c.hex+';"></div>'
      +'<div class="harmony-pick-name">'+c.name+'</div>'
      +'</div>';
  }).join('');
}

function setHarmonyRoot(name, brand) {
  harmonyColor = COLORS.find(function(c){ return c.name===name&&c.brand===brand; });
  renderHarmonyColorGrid();
  renderHarmonyResult();
}

function setHarmonyType(type, btn) {
  harmonyType = type;
  document.querySelectorAll('.harmony-type-btn').forEach(function(b){b.classList.remove('active');});
  if (btn) btn.classList.add('active');
  renderHarmonyResult();
}

function hslToHex(h,s,l) {
  h=((h%360)+360)%360; s/=100; l/=100;
  var c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2;
  var r=0,g=0,b=0;
  if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}
  else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}
  return '#'+[r+m,g+m,b+m].map(function(v){return Math.round(v*255).toString(16).padStart(2,'0');}).join('');
}

function findClosestColor(targetHex, excludeHex) {
  var tr=parseInt(targetHex.slice(1,3),16), tg=parseInt(targetHex.slice(3,5),16), tb=parseInt(targetHex.slice(5,7),16);
  var best=null, bestDist=Infinity;
  COLORS.forEach(function(c){
    if (c.hex===excludeHex) return;
    var r=parseInt(c.hex.slice(1,3),16)-tr, g=parseInt(c.hex.slice(3,5),16)-tg, b=parseInt(c.hex.slice(5,7),16)-tb;
    var d=r*r+g*g+b*b; // squared distance — no sqrt needed for comparison
    if(d<bestDist){bestDist=d;best=c;}
  });
  return {color:best, dist:Math.sqrt(bestDist)};
}

function renderHarmonyResult() {
  var wrap = document.getElementById('harmony-result');
  if (!wrap) return;
  if (!harmonyColor) {
    wrap.innerHTML='<div style="color:var(--ink3);font-style:italic;text-align:center;padding:2rem;">Pick a root color above to generate harmonies.</div>';
    return;
  }
  var ht = HARMONY_TYPES.find(function(t){ return t.id===harmonyType; });
  if (!ht) return;
  var rootHsl = hexToHsl(harmonyColor.hex);
  var rootH=rootHsl[0], rootS=rootHsl[1], rootL=rootHsl[2];

  // Build harmony slots: root + offset colors
  var slots = [{isRoot:true, targetHex:harmonyColor.hex, color:harmonyColor, label:'Root'}];
  ht.offsets.forEach(function(offset, i){
    var tH = (rootH+offset+360)%360;
    var targetHex = hslToHex(tH, Math.min(100,rootS*1.05), Math.max(20,Math.min(75,rootL)));
    var match = findClosestColor(targetHex, harmonyColor.hex);
    slots.push({isRoot:false, targetHex:targetHex, color:match.color, dist:match.dist, label:'Harmony '+(i+1), offset:offset});
  });

  var html = '<div class="harmony-desc">'+ht.desc+'</div>';

  // Visual wheel arc showing relationships
  html += '<canvas id="harmony-wheel" width="200" height="200" style="display:block;margin:0.5rem auto;"></canvas>';

  // Color slots
  html += '<div class="harmony-slots">';
  slots.forEach(function(slot){
    var c = slot.color;
    if (!c) return;
    var transpLabel = c.transparency==='T'?'T':c.transparency==='ST'?'ST':'O';
    html += '<div class="harmony-slot'+(slot.isRoot?' root':'')+'">'
      + '<div class="harmony-slot-swatch" style="background:'+c.hex+';"></div>'
      + '<div class="harmony-slot-info">'
        + '<div class="harmony-slot-label">'+slot.label+(slot.isRoot?' ✦':''+(slot.offset?(' +'+slot.offset+'°'):''))+'</div>'
        + '<div class="harmony-slot-name">'+c.name+'</div>'
        + '<div class="harmony-slot-meta">'+c.pigment+' · '+(BRAND_LABELS[c.brand]||c.brand)+'</div>'
        + '<div class="harmony-slot-badges"><span class="lbadge lf-'+c.lf+'">'+c.lf+'</span><span style="font-size:0.6rem;color:var(--ink3);margin-left:4px;">'+transpLabel+'</span></div>'
        + '<div class="harmony-slot-actions">'
          + '<button class="sort-btn" onclick="shopAdd(\''+c.name.replace(/'/g,"\\'")+'\',\''+c.brand.replace(/'/g,"\\'")+'\')">+ Shopping List</button>'
        + '</div>'
      + '</div>'
      + '</div>';
  });
  html += '</div>';
  wrap.innerHTML = html;

  // Draw mini wheel
  requestAnimationFrame(function(){
    var wc = document.getElementById('harmony-wheel');
    if (!wc) return;
    var ctx=wc.getContext('2d'), cx=100, cy=100, R=80, ir=30;
    // Hue ring — single conic gradient instead of 360 segments
    ctx.save();
    ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
    ctx.arc(cx,cy,ir,0,Math.PI*2,true);
    ctx.clip('evenodd');
    var ringGrd=ctx.createConicGradient(0,cx,cy);
    for(var gh=0;gh<=360;gh+=5) ringGrd.addColorStop(gh/360,'hsl('+gh+',65%,58%)');
    ctx.fillStyle=ringGrd;
    ctx.fillRect(cx-R,cy-R,R*2,R*2);
    ctx.restore();
    ctx.beginPath();ctx.arc(cx,cy,ir-1,0,Math.PI*2);ctx.fillStyle='#f5f0e8';ctx.fill();
    // Draw dots and lines for harmony
    slots.forEach(function(slot,i){
      var h = hexToHsl(slot.targetHex)[0];
      var rad = h*Math.PI/180;
      var px=cx+Math.cos(rad)*(ir+(R-ir)*0.6), py=cy+Math.sin(rad)*(ir+(R-ir)*0.6);
      if(i>0){
        var rh=hexToHsl(harmonyColor.hex)[0], rrad=rh*Math.PI/180;
        var rpx=cx+Math.cos(rrad)*(ir+(R-ir)*0.6), rpy=cy+Math.sin(rrad)*(ir+(R-ir)*0.6);
        ctx.beginPath();ctx.moveTo(rpx,rpy);ctx.lineTo(px,py);
        ctx.strokeStyle='rgba(30,23,16,0.3)';ctx.lineWidth=1;ctx.stroke();
      }
      ctx.beginPath();ctx.arc(px+1,py+1,slot.isRoot?8:6,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fill();
      ctx.beginPath();ctx.arc(px,py,slot.isRoot?8:6,0,Math.PI*2);
      ctx.fillStyle=slot.color?slot.color.hex:slot.targetHex;ctx.fill();
      ctx.strokeStyle=slot.isRoot?'#b8862a':'rgba(255,255,255,0.9)';ctx.lineWidth=slot.isRoot?2.5:1.5;ctx.stroke();
    });
  });
}



// ── Test export shim (see rendering-engine.js for the full explanation
// of this pattern, including why `module` is aliased rather than
// referenced directly) ──────────────────────────────
var _testExportsTarget2 = typeof module !== 'undefined' ? module : null;
if (_testExportsTarget2) {
  _testExportsTarget2.exports = { vsShuffledIndices, vsNextMasterIndex, vsNextPromptIndex, VS_MASTERS_WATERCOLOR, PROMPT_DATA };
}
