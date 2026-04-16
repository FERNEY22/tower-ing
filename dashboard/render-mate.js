// ══════════════════════════════════════════════════════════════════
// render-mate.js  ·  Evaluación Express · Matemáticas Básicas
// Nodo Firebase: evaluaciones/matematicasBasicas/
// ══════════════════════════════════════════════════════════════════

const MATE_LABELS = [
  'P01 · Productos notables (SM)',
  'P02 · Diferencia de cuadrados (RA)',
  'P03 · Trinomios (SM)',
  'P04 · Fracc. algebraicas (RA)',
  'P05 · Suma de fracciones (SM)',
  'P06 · Ec. fraccionaria (RA)',
  'P07 · Ec. cuadrática — fact. (SM)',
  'P08 · Fórmula cuadrática (RA)',
  'P09 · Radicales (SM)',
  'P10 · Ec. con radical (RA)'
];

function renderMate() {
  const rows  = Object.values(DATA.mate);
  const total = rows.length;

  document.getElementById('m-total').textContent = total;
  document.getElementById('badge-count').textContent = total + ' registros';

  if (!total) {
    ['m-avg','m-aprob','m-proceso','m-riesgo'].forEach(id=>document.getElementById(id).textContent='—');
    document.getElementById('m-tabla').innerHTML = '<tr><td colspan="6" class="empty-td">Sin respuestas aún.</td></tr>';
    return;
  }

  let sumP=0, aprob=0, proceso=0, riesgo=0;
  const histBins  = [0,0,0,0,0,0]; // 0-1, 2-3, 4-5, 6-7, 8-9, 10
  const aciertosQ = Array(10).fill(0);
  const QS        = ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10'];

  rows.forEach(r => {
    const p = r.puntaje ?? 0;
    sumP += p;
    if (p >= 6)      aprob++;
    else if (p >= 4) proceso++;
    else             riesgo++;
    histBins[Math.min(Math.floor(p/2), 5)]++;
    const det = r.detalles || {};
    QS.forEach((q,i) => { if(det[q]?.correcto) aciertosQ[i]++; });
  });

  document.getElementById('m-avg').textContent     = (sumP/total).toFixed(2) + ' / 10';
  document.getElementById('m-aprob').textContent   = aprob;
  document.getElementById('m-proceso').textContent = proceso;
  document.getElementById('m-riesgo').textContent  = riesgo;

  crearChart('chart-m-dist','doughnut',{
    labels:['✅ Aprobado ≥6','🟡 En proceso 4–5','🔴 En riesgo ≤3'],
    datasets:[{data:[aprob,proceso,riesgo],backgroundColor:['#27ae60','#e67e22','#e74c3c'],borderWidth:2,borderColor:'white'}]
  },{plugins:{legend:{position:'bottom',labels:{padding:14}}}});

  crearChart('chart-m-hist','bar',{
    labels:['0–1','2–3','4–5','6–7','8–9','10'],
    datasets:[{label:'Estudiantes',data:histBins,
      backgroundColor:['#e74c3c','#e74c3c','#e67e22','#3498db','#27ae60','#1a2a6c'],borderRadius:6,borderSkipped:false}]
  },{scales:{y:{beginAtZero:true,ticks:{stepSize:1},grid:{color:'#f0f0f0'}},x:{grid:{display:false}}},plugins:{legend:{display:false}}});

  const pctQ  = aciertosQ.map(n=>(n/total*100).toFixed(1));
  const colsQ = pctQ.map(v=>parseFloat(v)>=50?'rgba(52,152,219,.8)':'rgba(231,76,60,.8)');
  crearChart('chart-m-pregs','bar',{
    labels:MATE_LABELS,
    datasets:[{label:'% aciertos',data:pctQ,backgroundColor:colsQ,borderRadius:4,borderSkipped:false}]
  },{indexAxis:'y',
     scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#f0f0f0'}},y:{grid:{display:false},ticks:{font:{size:11}}}},
     plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.x}% (${aciertosQ[ctx.dataIndex]}/${total})`}}}});

  const NIV = p => p>=6?['✅ Aprobado','b-listo']:p>=4?['🟡 En proceso','b-sel']:['🔴 En riesgo','b-comp'];
  document.getElementById('m-tabla').innerHTML = rows
    .sort((a,b)=>(b.puntaje||0)-(a.puntaje||0))
    .map(r => {
      const p   = r.puntaje ?? 0;
      const pct = (p/10*100).toFixed(0);
      const barC= p>=6?'#27ae60':p>=4?'#e67e22':'#e74c3c';
      const [lab,cls] = NIV(p);
      const fecha = r.timestamp
        ? new Date(r.timestamp).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : '—';
      return `<tr>
        <td><strong>${r.nombre||'—'}</strong></td>
        <td style="text-align:center;font-family:monospace;font-size:.82rem">${r.documento||'—'}</td>
        <td style="text-align:center;font-weight:700">${p} / 10</td>
        <td style="min-width:110px">
          <div style="background:#f0f0f0;border-radius:4px;height:8px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${barC};border-radius:4px"></div>
          </div>
          <small style="color:#666">${pct}%</small>
        </td>
        <td style="text-align:center"><span class="rol-badge ${cls}">${lab}</span></td>
        <td style="font-size:.8rem;color:#7f8c8d">${fecha}</td>
      </tr>`;
    }).join('');
}