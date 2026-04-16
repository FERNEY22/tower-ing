// ══════════════════════════════════════════════════════════════════
// render-ac.js  ·  Diagnóstico · Acción Climática
// Nodo Firebase: diagnostico_climatica/
// ══════════════════════════════════════════════════════════════════

const AC_TF = {1:'F',2:'V',3:'F',4:'V',5:'V',6:'F',7:'F',8:'V',9:'F',10:'F'};
const AC_MC = {
  11:'C',12:'B',13:'C',14:'B',15:'B',16:'B',17:'B',18:'A',19:'C',20:'B',
  21:'B',22:'B',23:'B',24:'B',25:'B',26:'B',27:'B',28:'A',29:'B',30:'B'
};

const AC_TF_LABELS = [
  'P1 CO₂ único GEI','P2 Efecto inv. natural','P3 IPCC investiga',
  'P4 Colombia firmó París','P5 Deforest. y CO₂','P6 Temp. +3 °C',
  'P7 Renovables cero emis.','P8 ENSO en Colombia',
  'P9 Huella = Alc. 1 solo','P10 Adapt. reduce emis.'
];
const AC_MC_LABELS = [
  'P11 Gas mayor GWP','P12 Temp. IPCC AR6','P13 Sector mayor emisor CO',
  'P14 Qué incluye LCOE','P15 Qué significa NDC','P16 NbS urbana',
  'P17 Alcance 2 GHG','P18 Mitig. vs Adapt.','P19 Qué es IDEAM',
  'P20 Meta NDC Colombia','P21 Objetivo París','P22 Factor de emisión',
  'P23 Variable clave solar','P24 Sector NO emisor','P25 El Niño Colombia',
  'P26 Qué es CO₂e','P27 Páramos Colombia','P28 Herramienta modelado',
  'P29 Hidroeléctrica CO','P30 Captación agua'
];
const AC_LK_LABELS = [
  'P31 Urgencia CC','P32 Capacidad soluciones','P33 Cambio de hábitos',
  'P34 Responsabilidad ing.','P35 Interés renovables','P36 Bases ciencias',
  'P37 Exp. datos ambientales','P38 Trabajo interdiscip.','P39 Conoce política CC',
  'P40 Presentar propuestas'
];
const AC_AREAS = [
  { nombre: 'Sistema climático',     qs: [1,2,6,12],        max: 4 },
  { nombre: 'Política climática',    qs: [3,4,15,19,20,21], max: 6 },
  { nombre: 'Clima Colombia/ENSO',   qs: [8,13,25,29],      max: 4 },
  { nombre: 'Mitig. vs Adaptación',  qs: [10,18,30],        max: 3 },
  { nombre: 'Huella de carbono/GHG', qs: [9,17,22,26],      max: 4 },
  { nombre: 'Energías renovables',   qs: [7,14,23,28],      max: 4 },
  { nombre: 'Ecosistemas y NbS',     qs: [5,16,27],         max: 3 },
  { nombre: 'GEI y gases',           qs: [11,24],           max: 2 },
];

function renderAC() {
  const rows  = Object.entries(DATA.ac).map(([k,v]) => ({ key:k, ...v }));
  const total = rows.length;

  document.getElementById('ac-total').textContent = total;
  document.getElementById('badge-count').textContent = total + ' registros';

  if (!total) {
    ['ac-avg','ac-avanzado','ac-intermedio','ac-basico'].forEach(id=>document.getElementById(id).textContent='—');
    document.getElementById('ac-tabla').innerHTML = '<tr><td colspan="9" class="empty-td">Sin respuestas aún.</td></tr>';
    return;
  }

  let sumPct=0, avanzado=0, intermedio=0, basico=0;
  const tfAciertos = Array(10).fill(0);
  const mcAciertos = Array(20).fill(0);
  const lkSumas    = Array(10).fill(0);
  const histBins   = [0,0,0,0,0];

  rows.forEach(r => {
    const resp = r.respuestas || {};
    const pct  = parseFloat(r.porcentaje) || 0;
    sumPct += pct;
    if (r.nivel === 'Avanzado')        avanzado++;
    else if (r.nivel === 'Intermedio') intermedio++;
    else                               basico++;
    histBins[Math.min(Math.floor(pct/20),4)]++;
    for(let i=1;i<=10;i++)  if(String(resp[i])===AC_TF[i]) tfAciertos[i-1]++;
    for(let i=11;i<=30;i++) if(String(resp[i])===AC_MC[i]) mcAciertos[i-11]++;
    for(let i=31;i<=40;i++) { const v=parseFloat(resp[i]); if(!isNaN(v)) lkSumas[i-31]+=v; }
  });

  document.getElementById('ac-avg').textContent        = (sumPct/total).toFixed(1)+'%';
  document.getElementById('ac-avanzado').textContent   = avanzado;
  document.getElementById('ac-intermedio').textContent = intermedio;
  document.getElementById('ac-basico').textContent     = basico;

  crearChart('chart-ac-niv','doughnut',{
    labels:['🟢 Avanzado','🟡 Intermedio','🔴 Básico'],
    datasets:[{data:[avanzado,intermedio,basico],backgroundColor:['#27ae60','#e67e22','#e74c3c'],borderWidth:2,borderColor:'white'}]
  },{plugins:{legend:{position:'bottom',labels:{padding:14}}}});

  crearChart('chart-ac-hist','bar',{
    labels:['0–19%','20–39%','40–59%','60–79%','80–100%'],
    datasets:[{label:'Estudiantes',data:histBins,backgroundColor:['#e74c3c','#e74c3c','#e67e22','#3498db','#27ae60'],borderRadius:6,borderSkipped:false}]
  },{scales:{y:{beginAtZero:true,ticks:{stepSize:1},grid:{color:'#f0f0f0'}},x:{grid:{display:false}}},plugins:{legend:{display:false}}});

  const areasData   = AC_AREAS.map(area=>{ let s=0; rows.forEach(r=>{const resp=r.respuestas||{}; area.qs.forEach(q=>{const c=q<=10?AC_TF[q]:AC_MC[q];if(String(resp[q])===c)s++;});}); return total?(s/(total*area.max)*100).toFixed(1):0; });
  const areasColors = areasData.map(v=>v>=70?'rgba(39,174,96,.8)':v>=50?'rgba(230,126,34,.8)':'rgba(231,76,60,.8)');
  crearChart('chart-ac-areas','bar',{labels:AC_AREAS.map(a=>a.nombre),datasets:[{label:'% aciertos',data:areasData,backgroundColor:areasColors,borderRadius:6,borderSkipped:false}]},
    {indexAxis:'y',scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#f0f0f0'}},y:{grid:{display:false},ticks:{font:{size:12}}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+ctx.parsed.x+'% aciertos'}}}});

  const colQ = (pct) => parseFloat(pct)>=50?'rgba(52,152,219,.8)':'rgba(231,76,60,.8)';

  const tfPct=tfAciertos.map(n=>(n/total*100).toFixed(1));
  crearChart('chart-ac-tf','bar',{labels:AC_TF_LABELS,datasets:[{label:'% aciertos',data:tfPct,backgroundColor:tfPct.map(colQ),borderRadius:4,borderSkipped:false}]},
    {indexAxis:'y',scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#f0f0f0'}},y:{grid:{display:false},ticks:{font:{size:11}}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.x}% (${tfAciertos[ctx.dataIndex]}/${total})`}}}});

  const mcPct=mcAciertos.map(n=>(n/total*100).toFixed(1));
  crearChart('chart-ac-mc','bar',{labels:AC_MC_LABELS,datasets:[{label:'% aciertos',data:mcPct,backgroundColor:mcPct.map(colQ),borderRadius:4,borderSkipped:false}]},
    {indexAxis:'y',scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#f0f0f0'}},y:{grid:{display:false},ticks:{font:{size:11}}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.x}% (${mcAciertos[ctx.dataIndex]}/${total})`}}}});

  const lkAvgs=lkSumas.map(s=>(s/total).toFixed(2));
  const lkCols=lkAvgs.map(v=>{const n=parseFloat(v);return n>=4?'rgba(39,174,96,.8)':n>=3?'rgba(52,152,219,.8)':'rgba(231,76,60,.8)';});
  crearChart('chart-ac-lk','bar',{labels:AC_LK_LABELS,datasets:[{label:'Promedio',data:lkAvgs,backgroundColor:lkCols,borderRadius:4,borderSkipped:false}]},
    {indexAxis:'y',scales:{x:{min:0,max:5,ticks:{stepSize:1},grid:{color:'#f0f0f0'}},y:{grid:{display:false},ticks:{font:{size:11}}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.x} / 5`}}}});

  const NIV={Avanzado:['🟢 Avanzado','b-listo'],Intermedio:['🟡 Intermedio','b-sel'],Básico:['🔴 Básico','b-comp']};
  document.getElementById('ac-tabla').innerHTML=rows
    .sort((a,b)=>parseFloat(b.porcentaje||0)-parseFloat(a.porcentaje||0))
    .map(r=>{
      const [lab,cls]=NIV[r.nivel]||['—',''];
      const pct=parseFloat(r.porcentaje)||0, barC=pct>=70?'#27ae60':pct>=40?'#e67e22':'#e74c3c';
      return `<tr>
        <td><strong>${r.nombre||'—'}</strong></td>
        <td style="text-align:center;font-family:monospace;font-size:.82rem">${r.codigo||'—'}</td>
        <td style="text-align:center">${r.puntajeTF??'—'}/10</td>
        <td style="text-align:center">${r.puntajeMC??'—'}/20</td>
        <td style="text-align:center">${r.promedioLikert??'—'}</td>
        <td style="text-align:center;font-weight:700">${r.total??'—'}/30</td>
        <td style="min-width:110px">
          <div style="background:#f0f0f0;border-radius:4px;height:8px;overflow:hidden">
            <div style="width:${Math.round(pct)}%;height:100%;background:${barC};border-radius:4px"></div>
          </div>
          <small style="color:#666">${pct.toFixed(0)}%</small>
        </td>
        <td style="text-align:center"><span class="rol-badge ${cls}">${lab}</span></td>
        <td style="font-size:.8rem;color:#7f8c8d">${r.fechaRegistro||'—'}</td>
      </tr>`;
    }).join('');
}