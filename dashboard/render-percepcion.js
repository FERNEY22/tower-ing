// ══════════════════════════════════════════════════════════════════
// render-percepcion.js  ·  Revisión Técnica · Observatorio Institucional ETITC
// Nodo Firebase: percepcion_observatorio/
// ══════════════════════════════════════════════════════════════════

const PC_ITEMS = [
  'Exactitud de datos','Trazabilidad','Cálculos SIACET','Consistencia entre vistas',
  'Vigencia / actualización','Cobertura de factores',
  'Navegación','Claridad gráficas/tablas','Comprensión indicadores','Utilidad para decisiones',
  'Velocidad / rendimiento','Multidispositivo',
  'Alineación SIACET','Instrumentos ENC1–ENC6','Valor vs Excel/Power BI'
];
const PC_BLOQUES = [
  { nombre:'Calidad técnica y de datos', qs:[1,2,3,4,5,6] },
  { nombre:'Uso del instrumento',        qs:[7,8,9,10,11,12] },
  { nombre:'Pertinencia metodológica',   qs:[13,14,15] }
];
const PC_VEREDICTOS = {
  'Aprobado':                   ['🟢 Aprobado','b-listo','#27ae60'],
  'Aprobado con observaciones': ['🟡 Con observaciones','b-sel','#e67e22'],
  'No aprobado':                ['🔴 No aprobado','b-comp','#e74c3c']
};

function _pcGlobal(it){ let s=0,n=0; for(let i=1;i<=15;i++){const v=parseFloat((it||{})[i]); if(!isNaN(v)){s+=v;n++;}} return n?s/n:0; }
function _pcBloque(it,qs){ let s=0,n=0; qs.forEach(q=>{const v=parseFloat((it||{})[q]); if(!isNaN(v)){s+=v;n++;}}); return n?(s/n).toFixed(2):'—'; }

function renderPercepcion() {
  const rows  = Object.entries(DATA.percepcion).map(([k,v]) => ({ key:k, ...v }));
  const total = rows.length;

  document.getElementById('pc-total').textContent = total;
  document.getElementById('badge-count').textContent = total + ' revisores';

  if (!total) {
    ['pc-avg','pc-aprob','pc-obs','pc-noaprob'].forEach(id=>document.getElementById(id).textContent='—');
    document.getElementById('pc-tabla').innerHTML = '<tr><td colspan="6" class="empty-td">Sin revisiones aún.</td></tr>';
    document.getElementById('pc-obs-list').innerHTML = '<p style="color:#7f8c8d">Sin observaciones registradas.</p>';
    return;
  }

  let sumGlobal=0, aprob=0, obs=0, noaprob=0;
  const itemSum = Array(15).fill(0);
  const itemN   = Array(15).fill(0);

  rows.forEach(r => {
    const it = r.items || {};
    for(let i=1;i<=15;i++){ const v=parseFloat(it[i]); if(!isNaN(v)){ itemSum[i-1]+=v; itemN[i-1]++; } }
    sumGlobal += _pcGlobal(it);
    if(r.veredicto==='Aprobado') aprob++;
    else if(r.veredicto==='No aprobado') noaprob++;
    else obs++;
  });

  document.getElementById('pc-avg').textContent     = (sumGlobal/total).toFixed(2);
  document.getElementById('pc-aprob').textContent   = aprob;
  document.getElementById('pc-obs').textContent     = obs;
  document.getElementById('pc-noaprob').textContent = noaprob;

  // ── Veredicto global (doughnut) ──
  crearChart('chart-pc-veredicto','doughnut',{
    labels:['🟢 Aprobado','🟡 Con observaciones','🔴 No aprobado'],
    datasets:[{data:[aprob,obs,noaprob],backgroundColor:['#27ae60','#e67e22','#e74c3c'],borderWidth:2,borderColor:'white'}]
  },{plugins:{legend:{position:'bottom',labels:{padding:14}}}});

  // ── Promedio por bloque (bar vertical) ──
  const blkAvgs = PC_BLOQUES.map(b=>{ let s=0,n=0; b.qs.forEach(q=>{ s+=itemSum[q-1]; n+=itemN[q-1]; }); return n?(s/n).toFixed(2):0; });
  const blkCols = blkAvgs.map(v=>parseFloat(v)>=4?'rgba(39,174,96,.8)':parseFloat(v)>=3?'rgba(52,152,219,.8)':'rgba(231,76,60,.8)');
  crearChart('chart-pc-bloques','bar',{labels:PC_BLOQUES.map(b=>b.nombre),datasets:[{label:'Promedio',data:blkAvgs,backgroundColor:blkCols,borderRadius:6,borderSkipped:false}]},
    {scales:{y:{min:0,max:5,ticks:{stepSize:1},grid:{color:'#f0f0f0'}},x:{grid:{display:false}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+ctx.parsed.y+' / 5'}}}});

  // ── Promedio por ítem (bar horizontal) ──
  const itemAvgs = itemSum.map((s,i)=> itemN[i]?(s/itemN[i]).toFixed(2):0);
  const itemCols = itemAvgs.map(v=>{const n=parseFloat(v);return n>=4?'rgba(39,174,96,.8)':n>=3?'rgba(52,152,219,.8)':'rgba(231,76,60,.8)';});
  crearChart('chart-pc-items','bar',{labels:PC_ITEMS,datasets:[{label:'Promedio',data:itemAvgs,backgroundColor:itemCols,borderRadius:4,borderSkipped:false}]},
    {indexAxis:'y',scales:{x:{min:0,max:5,ticks:{stepSize:1},grid:{color:'#f0f0f0'}},y:{grid:{display:false},ticks:{font:{size:11}}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.x} / 5 (${itemN[ctx.dataIndex]} resp.)`}}}});

  // ── Tabla por revisor ──
  const esc = s => (s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  document.getElementById('pc-tabla').innerHTML = rows
    .sort((a,b)=>_pcGlobal(b.items)-_pcGlobal(a.items))
    .map(r=>{
      const it=r.items||{};
      const glob=_pcGlobal(it); const globTxt = glob?glob.toFixed(2):'—';
      const [lab,cls] = PC_VEREDICTOS[r.veredicto]||['—',''];
      return `<tr>
        <td><strong>${esc(r.nombre)||'—'}</strong><br><small style="color:#7f8c8d">${esc(r.rol)||''}</small></td>
        <td style="text-align:center">${_pcBloque(it,[1,2,3,4,5,6])}</td>
        <td style="text-align:center">${_pcBloque(it,[7,8,9,10,11,12])}</td>
        <td style="text-align:center">${_pcBloque(it,[13,14,15])}</td>
        <td style="text-align:center;font-weight:700">${globTxt}</td>
        <td style="text-align:center"><span class="rol-badge ${cls}">${lab}</span></td>
      </tr>`;
    }).join('');

  // ── Observaciones y correcciones consolidadas (cards) ──
  const campo = (t,txt)=> txt&&txt.trim() ? `<div style="margin-top:8px"><strong style="font-size:.8rem;color:#555">${t}:</strong> <span style="font-size:.86rem;color:#444">${esc(txt)}</span></div>` : '';
  const itemsObsHtml = (io,it)=>{
    if(!io) return '';
    const keys = Object.keys(io).filter(k=>io[k]&&io[k].trim());
    if(!keys.length) return '';
    const lis = keys.map(k=>`<li style="margin-top:4px"><strong>${PC_ITEMS[k-1]||('Ítem '+k)}</strong> <span style="color:#e67e22">(${(it||{})[k]}/5)</span>: <span style="color:#444">${esc(io[k])}</span></li>`).join('');
    return `<div style="margin-top:8px"><strong style="font-size:.8rem;color:#555">Ítems observados (≤3):</strong><ul style="margin:4px 0 0 18px;font-size:.84rem">${lis}</ul></div>`;
  };
  document.getElementById('pc-obs-list').innerHTML = rows.map(r=>{
    const cuerpo = [
      itemsObsHtml(r.itemObs, r.items),
      campo('Calidad técnica', r.obsTecnica),
      campo('Uso del instrumento', r.obsUso),
      campo('Pertinencia metodológica', r.obsMetodologia),
      campo('Corrección general', r.correccionGeneral)
    ].join('');
    if(!cuerpo) return '';
    const [lab,cls,col] = PC_VEREDICTOS[r.veredicto]||['—','','#999'];
    return `<div style="border:1px solid #eee;border-left:3px solid ${col};border-radius:8px;padding:14px 16px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <strong>${esc(r.nombre)||'—'} <small style="color:#7f8c8d;font-weight:400">· ${esc(r.rol)||''}</small></strong>
        <span class="rol-badge ${cls}">${lab}</span>
      </div>
      ${cuerpo}
    </div>`;
  }).join('') || '<p style="color:#7f8c8d">Sin observaciones registradas.</p>';
}
