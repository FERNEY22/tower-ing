// ══════════════════════════════════════════════════════════════════
// render-yuncar-ent.js  ·  YUNCAR · Entrevistas Actores Clave
// Nodo Firebase: entrevistas_yuncar/
// ══════════════════════════════════════════════════════════════════

function renderYuncarEnt() {
  const rows  = Object.values(DATA.yuncarEnt);
  const total = rows.length;

  document.getElementById('yt-total').textContent = total;
  document.getElementById('badge-count').textContent = total + ' registros';

  if (!total) {
    document.getElementById('yt-tabla').innerHTML = '<tr><td colspan="6" class="empty-td">Sin entrevistas registradas aún.</td></tr>';
    return;
  }

  const guiaA = rows.filter(r=>r.ficha?.guia==='A').length;
  const guiaB = rows.filter(r=>r.ficha?.guia==='B').length;
  const guiaC = rows.filter(r=>r.ficha?.guia==='C').length;
  document.getElementById('yt-guiaA').textContent = guiaA;
  document.getElementById('yt-guiaB').textContent = guiaB;
  document.getElementById('yt-guiaC').textContent = guiaC;

  // Chart: distribución por guía
  crearChart('chart-yt-guias','doughnut',{
    labels:['Guía A · Directivo','Guía B · Prestador','Guía C · Consultor'],
    datasets:[{data:[guiaA,guiaB,guiaC],
      backgroundColor:['#3498db','#9b59b6','#e67e22'],borderWidth:2,borderColor:'white'}]
  },{plugins:{legend:{position:'bottom',labels:{padding:14}}}});

  // Chart: modalidad de entrevista
  const freq    = arr => arr.reduce((m,v)=>(m[v]=(m[v]||0)+1,m),{});
  const modales = freq(rows.map(r=>r.ficha?.modalidad||'N/D'));
  crearChart('chart-yt-modal','bar',{
    labels: Object.keys(modales),
    datasets:[{label:'Entrevistas',data:Object.values(modales),
      backgroundColor:['#1a2a6c','#3498db','#27ae60'],borderRadius:6,borderSkipped:false}]
  },{scales:{y:{beginAtZero:true,ticks:{stepSize:1},grid:{color:'#f0f0f0'}},x:{grid:{display:false}}},
     plugins:{legend:{display:false}}});

  // Tabla detalle
  const BG = { A:'b-coord', B:'b-comun', C:'b-invest' };
  document.getElementById('yt-tabla').innerHTML = rows
    .sort((a,b)=>(b.ficha?.fecha||'').localeCompare(a.ficha?.fecha||''))
    .map(r => {
      const f = r.ficha || {};
      return `<tr>
        <td style="font-family:monospace;font-size:.82rem">${f.codigo||'—'}</td>
        <td><strong>${f.nombre||'—'}</strong></td>
        <td>${f.cargo||'—'}</td>
        <td style="text-align:center"><span class="rol-badge ${BG[f.guia]||''}">${f.guia?'Guía '+f.guia:'—'}</span></td>
        <td style="text-align:center">${f.modalidad||'—'}</td>
        <td style="font-size:.8rem;color:#7f8c8d">${f.fecha||'—'}</td>
      </tr>`;
    }).join('');
}