// ══════════════════════════════════════════════════════════════════
// render-taller10.js  ·  Taller Express · Matemáticas Básicas (/10)
// Nodo Firebase: evaluaciones/tallerMate10/
// ══════════════════════════════════════════════════════════════════

const TALLER10_TEMAS = [
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

function renderTaller10() {
  const rows  = Object.values(DATA.taller10);
  const total = rows.length;

  document.getElementById('t10-total').textContent = total;
  document.getElementById('badge-count').textContent = total + ' registros';

  if (!total) {
    ['t10-avg','t10-aprob','t10-proceso','t10-riesgo'].forEach(id=>document.getElementById(id).textContent='—');
    document.getElementById('t10-tabla').innerHTML = '<tr><td colspan="7" class="empty-td">Sin respuestas aún.</td></tr>';
    return;
  }

  let sumP=0, aprob=0, proceso=0, riesgo=0;
  let sumF=0, sumM=0, sumD=0;
  const histBins = [0,0,0,0,0]; // 0-1, 2-3, 4-5, 6-7, 8-10
  const aciertosTema = {};
  TALLER10_TEMAS.forEach(t => { aciertosTema[t.id] = { ok:0, total:0 }; });

  rows.forEach(r => {
    const p = r.puntaje ?? 0;
    sumP += p;
    if (p >= 7)      aprob++;
    else if (p >= 5) proceso++;
    else             riesgo++;

    sumF += r.aciertosFacil   ?? 0;
    sumM += r.aciertosMedia   ?? 0;
    sumD += r.aciertosDificil ?? 0;

    // Histograma por bins de 2 (0-1, 2-3, 4-5, 6-7, 8-10)
    const bin = Math.min(Math.floor(p/2), 4);
    histBins[bin]++;

    // Aciertos por tema (solo los temas que aparecieron en ese intento)
    const det = r.detalles || {};
    Object.values(det).forEach(d => {
      if (d && d.topicId && aciertosTema[d.topicId]) {
        aciertosTema[d.topicId].total++;
        if (d.correcto) aciertosTema[d.topicId].ok++;
      }
    });
  });

  document.getElementById('t10-avg').textContent     = (sumP/total).toFixed(2) + ' / 10';
  document.getElementById('t10-aprob').textContent   = aprob;
  document.getElementById('t10-proceso').textContent = proceso;
  document.getElementById('t10-riesgo').textContent  = riesgo;

  // ── GRÁFICO 1: Distribución por nivel ─────────────────────────────
  crearChart('chart-t10-dist','doughnut',{
    labels:['✅ Aprobado ≥7','🟡 En proceso 5–6','🔴 En riesgo ≤4'],
    datasets:[{data:[aprob,proceso,riesgo],backgroundColor:['#27ae60','#e67e22','#e74c3c'],borderWidth:2,borderColor:'white'}]
  },{plugins:{legend:{position:'bottom',labels:{padding:14}}}});

  // ── GRÁFICO 2: Histograma de puntajes ─────────────────────────────
  crearChart('chart-t10-hist','bar',{
    labels:['0–1','2–3','4–5','6–7','8–10'],
    datasets:[{label:'Estudiantes',data:histBins,
      backgroundColor:['#e74c3c','#e67e22','#f39c12','#3498db','#27ae60'],borderRadius:6,borderSkipped:false}]
  },{scales:{y:{beginAtZero:true,ticks:{stepSize:1},grid:{color:'#f0f0f0'}},x:{grid:{display:false}}},plugins:{legend:{display:false}}});

  // ── GRÁFICO 3: % aciertos por tema ────────────────────────────────
  // Nota: como cada intento toma 10 aleatorias de 50, algunos temas pueden tener pocos datos.
  // Se muestra el % calculado sobre las veces que cada tema efectivamente salió.
  const temaLabels = TALLER10_TEMAS.map(t => t.label);
  const temaPct    = TALLER10_TEMAS.map(t => {
    const a = aciertosTema[t.id];
    return a.total ? (a.ok/a.total*100).toFixed(1) : 0;
  });
  const temaCols   = temaPct.map(v => parseFloat(v) >= 50 ? 'rgba(52,152,219,.8)' : 'rgba(231,76,60,.8)');
  crearChart('chart-t10-temas','bar',{
    labels: temaLabels,
    datasets:[{label:'% aciertos',data:temaPct,backgroundColor:temaCols,borderRadius:4,borderSkipped:false}]
  },{indexAxis:'y',
     scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#f0f0f0'}},y:{grid:{display:false},ticks:{font:{size:11}}}},
     plugins:{legend:{display:false},
              tooltip:{callbacks:{label:ctx=>{
                const t = TALLER10_TEMAS[ctx.dataIndex];
                const a = aciertosTema[t.id];
                return ` ${ctx.parsed.x}% (${a.ok}/${a.total})`;
              }}}}});

  // ── GRÁFICO 4: % aciertos por dificultad ──────────────────────────
  // Caps por intento: 2 fáciles, 4 medias, 4 difíciles
  const promF = (sumF/total).toFixed(1);
  const promM = (sumM/total).toFixed(1);
  const promD = (sumD/total).toFixed(1);
  const pctF  = (sumF/(total*2)*100).toFixed(1);
  const pctM  = (sumM/(total*4)*100).toFixed(1);
  const pctD  = (sumD/(total*4)*100).toFixed(1);
  crearChart('chart-t10-dificultad','bar',{
    labels:['Fáciles (2)','Medias (4)','Difíciles (4)'],
    datasets:[{label:'% aciertos promedio',data:[pctF,pctM,pctD],
      backgroundColor:['#27ae60','#e67e22','#e74c3c'],borderRadius:6,borderSkipped:false}]
  },{scales:{y:{beginAtZero:true,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#f0f0f0'}},x:{grid:{display:false}}},
     plugins:{legend:{display:false},
              tooltip:{callbacks:{label:ctx=>{
                const idx = ctx.dataIndex;
                const proms = [promF, promM, promD];
                const caps  = [2, 4, 4];
                return ` ${ctx.parsed.y}% — promedio ${proms[idx]}/${caps[idx]}`;
              }}}}});

  // ── TABLA ─────────────────────────────────────────────────────────
  const NIV = p => p>=7 ? ['✅ Aprobado','b-listo']
                : p>=5 ? ['🟡 En proceso','b-sel']
                       : ['🔴 En riesgo','b-comp'];

  document.getElementById('t10-tabla').innerHTML = rows
    .sort((a,b)=>(b.puntaje||0)-(a.puntaje||0))
    .map(r => {
      const p   = r.puntaje ?? 0;
      const pct = (p/10*100).toFixed(0);
      const barC= p>=7 ? '#27ae60' : p>=5 ? '#e67e22' : '#e74c3c';
      const [lab,cls] = NIV(p);
      const fecha = r.timestamp
        ? new Date(r.timestamp).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : '—';
      const f = r.aciertosFacil   ?? '—';
      const m = r.aciertosMedia   ?? '—';
      const d = r.aciertosDificil ?? '—';
      return `<tr>
        <td><strong>${r.nombre||'—'}</strong></td>
        <td style="text-align:center;font-family:monospace;font-size:.82rem">${r.documento||'—'}</td>
        <td style="text-align:center;font-weight:700">${p} / 10</td>
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