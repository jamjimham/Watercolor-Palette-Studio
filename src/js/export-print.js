// ─────────────────────────────────────────────────────────────
// export-print.js
// Export a palette as a printable HTML page.
// (source: original index.html lines 4518-4561)
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// EXPORT PALETTE AS PRINT PAGE
// ══════════════════════════════════════════════════════════════
function exportCurrentPalette(){
  const pal=palettes.find(p=>p.id===activePaletteId);
  if(!pal){showToast('Select a palette first');return;}
  const rows=pal.colors.map(c=>[
    '<tr>',
    '<td style="padding:6px 8px;"><div style="width:36px;height:36px;background:'+c.hex+';border-radius:3px;border:1px solid rgba(0,0,0,0.1);"></div></td>',
    '<td style="padding:6px 10px;font-family:Georgia,serif;font-size:13px;">'+c.name+'</td>',
    '<td style="padding:6px 10px;font-family:monospace;font-size:11px;color:#666;">'+c.pigment+'</td>',
    '<td style="padding:6px 10px;font-size:12px;">'+(BRAND_LABELS[c.brand]||c.brand)+'</td>',
    '<td style="padding:6px 10px;font-size:12px;">'+c.lf+'</td>',
    '<td style="padding:6px 10px;font-size:12px;">'+c.transparency+(c.gran?' · Gran':'')+'</td>',
    '</tr>'
  ].join('')).join('');
  const cols=pal.colors.slice(0,10);
  // Pre-compute upper triangle of mixes
  const exportMixCache={};
  cols.forEach((a,i)=>cols.forEach((b,j)=>{
    if(i<j) exportMixCache[i+','+j]=mixPaint(a.hex,b.hex,0.5);
  }));
  const mixHdr='<tr><th></th>'+cols.map(c=>'<th style="padding:3px;font-size:9px;writing-mode:vertical-rl;height:70px;">'+c.name.split(' ').slice(0,2).join(' ')+'</th>').join('')+'</tr>';
  const mixRows=cols.map((row,ri)=>'<tr><td style="padding:3px;font-size:9px;white-space:nowrap;">'+row.name.split(' ').slice(0,2).join(' ')+'</td>'+cols.map((col,ci)=>{
    if(ri===ci) return '<td style="background:#e8e4dc;width:36px;height:36px;"></td>';
    const key=Math.min(ri,ci)+','+Math.max(ri,ci);
    return '<td style="background:'+exportMixCache[key]+';width:36px;height:36px;" title="'+row.name+' + '+col.name+'"></td>';
  }).join('')+'</tr>').join('');
  const html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+pal.name+'</title>'
    +'<style>body{font-family:Georgia,serif;margin:30px;color:#1e1710;}h1{font-size:20px;margin-bottom:4px;}p{font-size:12px;color:#666;margin-bottom:20px;}table{border-collapse:collapse;width:100%;}th{text-align:left;padding:6px 8px;border-bottom:2px solid #1e1710;font-size:12px;}tr:nth-child(even){background:#f8f4ee;}</style>'
    +'</head><body>'
    +'<h1>'+pal.name+'</h1>'
    +'<p>'+(pal.notes||'')+'<br>'+pal.colors.length+' colors &nbsp;·&nbsp; Exported '+new Date().toLocaleDateString()+'</p>'
    +'<table><thead><tr><th>Swatch</th><th>Color Name</th><th>Pigment</th><th>Brand</th><th>LF</th><th>Properties</th></tr></thead><tbody>'+rows+'</tbody></table>'
    +(pal.colors.length>=2?'<h2 style="font-size:16px;margin-top:30px;margin-bottom:10px;">Mixing Chart (first 10 colors)</h2><table style="width:auto;"><thead>'+mixHdr+'</thead><tbody>'+mixRows+'</tbody></table>':'')
    +'</body></html>';
  const win=window.open('about:blank','_blank');
  if(win){win.document.write(html);win.document.close();setTimeout(()=>win.print(),500);}
}


// ══════════════════════════════════════════════════════════════


