// ══════════════════════════════════════════════════════════════════
// render-taller.js  ·  Taller Integral · Matemáticas Básicas
// Nodo Firebase: evaluaciones/tallerMatematicas/
// ══════════════════════════════════════════════════════════════════

const TALLER_TEMAS = [
  { id:'t01', label:'T1 · Productos notables' },
  { id:'t02', label:'T2 · Diferencia de cuadrados' },
  { id:'t03', label:'T3 · Trinomios' },
  { id:'t04', label:'T4 · Fracc. algebraicas (simplif.)' },
  { id:'t05', label:'T5 · Suma/resta fracciones' },
  { id:'t06', label:'T6 · Ec. fraccionarias' },
  { id:'t07', label:'T7 · Ec. cuadráticas (fact.)' },
  { id:'t08', label:'T8 · Fórmula cuadrática' },
  { id:'t09', label:'T9 · Radicales' },
  { id:'t10', label:'T10 · Ec. con radicales' }
];

function renderTaller() {
  const rows  = Object.values(DATA.taller);
  const total = rows.length;

  document.getElementById('t-total').textContent = total;
  document.getElementById('badge-count').textContent = total + ' registros';

  if (!total) {
    ['t-avg','t-aprob','t-proceso','t-riesgo'].forEach(id=>document.getElementById(id).textContent='—');
    document.getElementById('t-tabla').innerHTML = '<tr><td colspan="7" class="empty-td">Sin respuestas aún.</td></tr>';
    return;
  }

  let sumP=0, aprob=0, proceso=0, riesgo=0;
  let sumF=0, sumM=0, sumD=0;
  const histBins = [0,0,0,0,0]; // 0-9, 10-19, 20-29, 30-39, 40-50
  const aciertosTema = {};   // { t01: {ok:0, total:0}, ... }
  TALLER_TEMAS.forEach(t => { aciertosTema[t.id] = { ok:0, total:0 }; });

  rows.forEach(r => {
    const p = r.puntaje ?? 0;
    sumP += p;
    if (p >= 35)      aprob++;
    else if (p >= 25) proceso++;
    else              riesgo++;

    sumF += r.aciertosFacil   ?? 0;
    sumM += r.aciertosMedia   ?? 0;
    sumD += r.aciertosDificil ?? 0;

    // Histograma por bins de 10
    const bin = Math.min(Math.floor(p/10), 4);
    histBins[bin]++;

    // Aciertos por tema (recorre detalles)
    const det = r.detalles || {};
    Object.values(det).forEach(d => {
      if (d && d.topicId && aciertosTema[d.topicId]) {
        aciertosTema[d.topicId].total++;
        if (d.correcto) aciertosTema[d.topicId].ok++;
      }
    });
  });

  document.getElementById('t-avg').textContent     = (sumP/total).toFixed(2) + ' / 50';
  document.getElementById('t-aprob').textContent   = aprob;
  document.getElementById('t-proceso').textContent = proceso;
  document.getElementById('t-riesgo').textContent  = riesgo;

  // ── GRÁFICO 1: Distribución por nivel ─────────────────────────────
  crearChart('chart-t-dist','doughnut',{
    labels:['✅ Aprobado ≥35','🟡 En proceso 25–34','🔴 En riesgo ≤24'],
    datasets:[{data:[aprob,proceso,riesgo],backgroundColor:['#27ae60','#e67e22','#e74c3c'],borderWidth:2,borderColor:'white'}]
  },{plugins:{legend:{position:'bottom',labels:{padding:14}}}});

  // ── GRÁFICO 2: Histograma de puntajes ─────────────────────────────
  crearChart('chart-t-hist','bar',{
    labels:['0–9','10–19','20–29','30–39','40–50'],
    datasets:[{label:'Estudiantes',data:histBins,
      backgroundColor:['#e74c3c','#e67e22','#f39c12','#3498db','#27ae60'],borderRadius:6,borderSkipped:false}]
  },{scales:{y:{beginAtZero:true,ticks:{stepSize:1},grid:{color:'#f0f0f0'}},x:{grid:{display:false}}},plugins:{legend:{display:false}}});

  // ── GRÁFICO 3: % aciertos por tema ────────────────────────────────
  const temaLabels = TALLER_TEMAS.map(t => t.label);
  const temaPct    = TALLER_TEMAS.map(t => {
    const a = aciertosTema[t.id];
    return a.total ? (a.ok/a.total*100).toFixed(1) : 0;
  });
  const temaCols   = temaPct.map(v => parseFloat(v) >= 50 ? 'rgba(52,152,219,.8)' : 'rgba(231,76,60,.8)');
  crearChart('chart-t-temas','bar',{
    labels: temaLabels,
    datasets:[{label:'% aciertos',data:temaPct,backgroundColor:temaCols,borderRadius:4,borderSkipped:false}]
  },{indexAxis:'y',
     scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#f0f0f0'}},y:{grid:{display:false},ticks:{font:{size:11}}}},
     plugins:{legend:{display:false},
              tooltip:{callbacks:{label:ctx=>{
                const t = TALLER_TEMAS[ctx.dataIndex];
                const a = aciertosTema[t.id];
                return ` ${ctx.parsed.x}% (${a.ok}/${a.total})`;
              }}}}});

  // ── GRÁFICO 4: Promedio aciertos por dificultad ───────────────────
  const promF = (sumF/total).toFixed(1);
  const promM = (sumM/total).toFixed(1);
  const promD = (sumD/total).toFixed(1);
  const pctF  = (sumF/(total*20)*100).toFixed(1);
  const pctM  = (sumM/(total*20)*100).toFixed(1);
  const pctD  = (sumD/(total*10)*100).toFixed(1);
  crearChart('chart-t-dificultad','bar',{
    labels:['Fáciles (20)','Medias (20)','Difíciles (10)'],
    datasets:[{label:'% aciertos promedio',data:[pctF,pctM,pctD],
      backgroundColor:['#27ae60','#e67e22','#e74c3c'],borderRadius:6,borderSkipped:false}]
  },{scales:{y:{beginAtZero:true,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#f0f0f0'}},x:{grid:{display:false}}},
     plugins:{legend:{display:false},
              tooltip:{callbacks:{label:ctx=>{
                const idx = ctx.dataIndex;
                const proms = [promF, promM, promD];
                const caps  = [20, 20, 10];
                return ` ${ctx.parsed.y}% — promedio ${proms[idx]}/${caps[idx]}`;
              }}}}});

  // ── TABLA ─────────────────────────────────────────────────────────
  const NIV = p => p>=35 ? ['✅ Aprobado','b-listo']
                 : p>=25 ? ['🟡 En proceso','b-sel']
                         : ['🔴 En riesgo','b-comp'];

  document.getElementById('t-tabla').innerHTML = rows
    .sort((a,b)=>(b.puntaje||0)-(a.puntaje||0))
    .map(r => {
      const p   = r.puntaje ?? 0;
      const pct = (p/50*100).toFixed(0);
      const barC= p>=35 ? '#27ae60' : p>=25 ? '#e67e22' : '#e74c3c';
      const [lab,cls] = NIV(p);
      const fecha = r.timestamp
        ? new Date(r.timestamp).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : '—';
      const f = r.aciertosFacil   ?? '—';
      const m = r.aciertosMedia   ?? '—';
      const d = r.aciertosDificil ?? '—';
      return `<tr>
        <td><strong>${r.nombre||'—'}</strong></td>
        <td style="text-align:center;font-family:monospace;font-size:.82rem">${r.documento||'—'}</td>
        <td style="text-align:center;font-weight:700">${p} / 50</td>
        <td style="text-align:center;font-size:.82rem;color:#555">
          <span style="color:#27ae60">${f}</span>·<span style="color:#e67e22">${m}</span>·<span style="color:#e74c3c">${d}</span>
        </td>
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