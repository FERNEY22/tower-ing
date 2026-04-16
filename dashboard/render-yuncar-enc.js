// ══════════════════════════════════════════════════════════════════
// render-yuncar-enc.js  ·  YUNCAR · Encuesta Mantenimiento Industrial
// Nodo Firebase: encuesta_yuncar/
// ══════════════════════════════════════════════════════════════════

function renderYuncarEnc() {
  const rows  = Object.values(DATA.yuncarEnc);
  const total = rows.length;

  document.getElementById('ye-total').textContent = total;
  document.getElementById('badge-count').textContent = total + ' registros';

  if (!total) {
    document.getElementById('ye-tabla').innerHTML = '<tr><td colspan="5" class="empty-td">Sin respuestas aún.</td></tr>';
    return;
  }

  // Promedio Likert por sección (B, C, D, E)
  const SECS     = ['seccion_B','seccion_C','seccion_D','seccion_E'];
  const secAvgs  = SECS.map(sec => {
    let sum=0, cnt=0;
    rows.forEach(r => Object.values(r[sec]||{}).forEach(v => {
      const n=parseFloat(v); if(!isNaN(n)){ sum+=n; cnt++; }
    }));
    return cnt ? (sum/cnt).toFixed(2) : 0;
  });
  const globalAvg = (secAvgs.reduce((a,b)=>a+parseFloat(b),0)/secAvgs.length).toFixed(2);
  document.getElementById('ye-avg').textContent = globalAvg;

  // Moda de sector y tamaño
  const freq = arr => arr.reduce((m,v)=>(m[v]=(m[v]||0)+1,m),{});
  const moda = obj => Object.entries(obj).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
  const sectores = freq(rows.map(r=>r.seccion_A?.sector||'N/D'));
  const tamanos  = freq(rows.map(r=>r.seccion_A?.tamano||'N/D'));
  document.getElementById('ye-sector').textContent = moda(sectores);
  document.getElementById('ye-tamano').textContent = moda(tamanos);

  // Chart: distribución por sector
  const pal   = ['#3498db','#27ae60','#e67e22','#9b59b6','#e74c3c','#1a2a6c','#1abc9c'];
  const sLab  = Object.keys(sectores);
  const sData = Object.values(sectores);
  crearChart('chart-ye-sector','doughnut',{
    labels: sLab,
    datasets:[{data:sData,backgroundColor:pal.slice(0,sLab.length),borderWidth:2,borderColor:'white'}]
  },{plugins:{legend:{position:'bottom',labels:{padding:12,font:{size:11}}}}});

  // Chart: promedios Likert por sección
  crearChart('chart-ye-secciones','bar',{
    labels:['B · Gestión interna','C · Servicios externos','D · Necesidades','E · Digitalización'],
    datasets:[{label:'Promedio Likert',data:secAvgs,
      backgroundColor:['#3498db','#27ae60','#e67e22','#9b59b6'],borderRadius:6,borderSkipped:false}]
  },{scales:{y:{min:0,max:5,ticks:{stepSize:1},grid:{color:'#f0f0f0'}},x:{grid:{display:false}}},
     plugins:{legend:{display:false}}});

  // Tabla detalle
  document.getElementById('ye-tabla').innerHTML = rows.map(r => {
    const vals = SECS.flatMap(s=>Object.values(r[s]||{}).map(v=>parseFloat(v))).filter(v=>!isNaN(v));
    const avg  = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : '—';
    return `<tr>
      <td>${r.seccion_A?.cargo||'—'}</td>
      <td>${r.seccion_A?.sector||'—'}</td>
      <td>${r.seccion_A?.tamano||'—'}</td>
      <td style="text-align:center;font-weight:700">${avg}</td>
      <td style="font-size:.8rem;color:#7f8c8d">${r.fechaRegistro||'—'}</td>
    </tr>`;
  }).join('');
}