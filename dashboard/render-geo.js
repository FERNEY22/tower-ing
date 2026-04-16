// ══════════════════════════════════════════════════════════════════
// render-geo.js  ·  Diagnóstico · Tecnologías Geoespaciales
// Nodo Firebase: diagnostico_geoespacial/
// ══════════════════════════════════════════════════════════════════

const CORRECTAS = {
  q1:'b',q2:'V',q3:'b',q4:'F',q5:'c',q6:'V',q7:'b',q8:'V',q9:'b',q10:'V',
  q11:'b',q12:'V',q13:'b',q14:'F',q15:'b',q16:'V',q17:'b',q18:'V',q19:'c',q20:'V',
  q21:'b',q22:'V',q23:'b',q24:'F',q25:'b',q26:'V',q27:'b',q28:'V',q29:'a',q30:'F'
};

const G_TIPO    = (i) => (CORRECTAS['q'+i]==='V'||CORRECTAS['q'+i]==='F') ? 'VF' : 'SM';
const G_SEC_A   = Array.from({length:10},(_,i)=>`P${i+1} (${G_TIPO(i+1)})`);
const G_SEC_B   = Array.from({length:10},(_,i)=>`P${i+11} (${G_TIPO(i+11)})`);
const G_SEC_C   = Array.from({length:10},(_,i)=>`P${i+21} (${G_TIPO(i+21)})`);

const G_LK_LABELS = [
  'P31 Interés tecnologías geo','P32 Experiencia con SIG','P33 Manejo software geo',
  'P34 Trabajo con imágenes sat.','P35 Análisis espacial','P36 Bases cartografía',
  'P37 Experiencia teledetección','P38 Trabajo interdisciplinario',
  'P39 Conoce política territorial','P40 Disposición a proyectos geo'
];

const G_AREAS = [
  { nombre:'SIG Fundamentos (A·P1–P5)',        qs:[1,2,3,4,5],      max:5 },
  { nombre:'SIG Avanzado (A·P6–P10)',           qs:[6,7,8,9,10],     max:5 },
  { nombre:'Teledet. Básica (B·P11–P15)',       qs:[11,12,13,14,15], max:5 },
  { nombre:'Teledet. Avanzada (B·P16–P20)',     qs:[16,17,18,19,20], max:5 },
  { nombre:'Herramientas Básicas (C·P21–P25)',  qs:[21,22,23,24,25], max:5 },
  { nombre:'Herramientas Avanzadas (C·P26–P30)',qs:[26,27,28,29,30], max:5 },
];

function renderGeo() {
  const rows  = Object.entries(DATA.geo).map(([k,v])=>({key:k,...v}));
  const total = rows.length;

  document.getElementById('g-total').textContent = total;
  document.getElementById('badge-count').textContent = total + ' registros';

  if (!total) {
    ['g-avg','g-listos','g-selectivo','g-repaso'].forEach(id=>document.getElementById(id).textContent='—');
    document.getElementById('g-tabla').innerHTML = '<tr><td colspan="11" class="empty-td">Sin respuestas aún.</td></tr>';
    return;
  }

  let sumS=0, listos=0, selectivo=0, repaso=0;
  const histBins  = [0,0,0,0,0];
  const qAciertos = Array(30).fill(0);
  const lkSumas   = Array(10).fill(0);
  const secA      = Array(10).fill(0);
  const secB      = Array(10).fill(0);
  const secC      = Array(10).fill(0);

  rows.forEach(r => {
    let s=0,a=0,b=0,c=0;
    for(let i=1;i<=30;i++) {
      if(r['q'+i]===CORRECTAS['q'+i]) {
        s++; qAciertos[i-1]++;
        if(i<=10)         { a++; secA[i-1]++;   }
        if(i>=11&&i<=20)  { b++; secB[i-11]++;  }
        if(i>=21)         { c++; secC[i-21]++;  }
      }
    }
    sumS += s;
    const p   = s/30*100;
    histBins[Math.min(Math.floor(p/20),4)]++;
    if(p>=67) listos++; else if(p>=40) selectivo++; else repaso++;
    for(let i=31;i<=40;i++) { const v=parseFloat(r['q'+i]); if(!isNaN(v)) lkSumas[i-31]+=v; }
  });

  document.getElementById('g-avg').textContent       = (sumS/total/30*100).toFixed(1)+'%';
  document.getElementById('g-listos').textContent    = listos;
  document.getElementById('g-selectivo').textContent = selectivo;
  document.getElementById('g-repaso').textContent    = repaso;

  crearChart('chart-g-niv','doughnut',{
    labels:['🟢 Listo','🟡 Repaso selectivo','🔴 Repaso completo'],
    datasets:[{data:[listos,selectivo,repaso],backgroundColor:['#27ae60','#e67e22','#e74c3c'],borderWidth:2,borderColor:'white'}]
  },{plugins:{legend:{position:'bottom',labels:{padding:14}}}});

  crearChart('chart-g-hist','bar',{
    labels:['0–19%','20–39%','40–59%','60–79%','80–100%'],
    datasets:[{label:'Estudiantes',data:histBins,
      backgroundColor:['#e74c3c','#e74c3c','#e67e22','#3498db','#27ae60'],borderRadius:6,borderSkipped:false}]
  },{scales:{y:{beginAtZero:true,ticks:{stepSize:1},grid:{color:'#f0f0f0'}},x:{grid:{display:false}}},plugins:{legend:{display:false}}});

  const areasData   = G_AREAS.map(area=>{ let s=0; rows.forEach(r=>area.qs.forEach(q=>{if(r['q'+q]===CORRECTAS['q'+q])s++;})); return total?(s/(total*area.max)*100).toFixed(1):0; });
  const areasColors = areasData.map(v=>parseFloat(v)>=70?'rgba(39,174,96,.8)':parseFloat(v)>=50?'rgba(230,126,34,.8)':'rgba(231,76,60,.8)');
  crearChart('chart-g-areas','bar',{labels:G_AREAS.map(a=>a.nombre),datasets:[{label:'% aciertos',data:areasData,backgroundColor:areasColors,borderRadius:6,borderSkipped:false}]},
    {indexAxis:'y',scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#f0f0f0'}},y:{grid:{display:false},ticks:{font:{size:11}}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+ctx.parsed.x+'% aciertos'}}}});

  const colQ = n => n/total*100>=50?'rgba(52,152,219,.8)':'rgba(231,76,60,.8)';

  crearChart('chart-g-secA','bar',{labels:G_SEC_A,datasets:[{label:'% aciertos',data:secA.map(n=>(n/total*100).toFixed(1)),backgroundColor:secA.map(colQ),borderRadius:4,borderSkipped:false}]},
    {indexAxis:'y',scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#f0f0f0'}},y:{grid:{display:false},ticks:{font:{size:11}}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.x}% (${secA[ctx.dataIndex]}/${total})`}}}});

  crearChart('chart-g-secB','bar',{labels:G_SEC_B,datasets:[{label:'% aciertos',data:secB.map(n=>(n/total*100).toFixed(1)),backgroundColor:secB.map(colQ),borderRadius:4,borderSkipped:false}]},
    {indexAxis:'y',scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#f0f0f0'}},y:{grid:{display:false},ticks:{font:{size:11}}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.x}% (${secB[ctx.dataIndex]}/${total})`}}}});

  crearChart('chart-g-secC','bar',{labels:G_SEC_C,datasets:[{label:'% aciertos',data:secC.map(n=>(n/total*100).toFixed(1)),backgroundColor:secC.map(colQ),borderRadius:4,borderSkipped:false}]},
    {indexAxis:'y',scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#f0f0f0'}},y:{grid:{display:false},ticks:{font:{size:11}}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.x}% (${secC[ctx.dataIndex]}/${total})`}}}});

  const lkAvgs = lkSumas.map(s=>(s/total).toFixed(2));
  const lkCols = lkAvgs.map(v=>{const n=parseFloat(v);return n>=4?'rgba(39,174,96,.8)':n>=3?'rgba(52,152,219,.8)':'rgba(231,76,60,.8)';});
  crearChart('chart-g-lk','bar',{labels:G_LK_LABELS,datasets:[{label:'Promedio',data:lkAvgs,backgroundColor:lkCols,borderRadius:4,borderSkipped:false}]},
    {indexAxis:'y',scales:{x:{min:0,max:5,ticks:{stepSize:1},grid:{color:'#f0f0f0'}},y:{grid:{display:false},ticks:{font:{size:11}}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.x} / 5`}}}});

  document.getElementById('g-tabla').innerHTML = rows
    .sort((a,b)=>{let sa=0,sb=0;for(let i=1;i<=30;i++){if(a['q'+i]===CORRECTAS['q'+i])sa++;if(b['q'+i]===CORRECTAS['q'+i])sb++;}return sb-sa;})
    .map(r=>{
      let sa=0,sB=0,sC=0;
      for(let i=1;i<=10;i++)  if(r['q'+i]===CORRECTAS['q'+i]) sa++;
      for(let i=11;i<=20;i++) if(r['q'+i]===CORRECTAS['q'+i]) sB++;
      for(let i=21;i<=30;i++) if(r['q'+i]===CORRECTAS['q'+i]) sC++;
      const s=sa+sB+sC, p=s/30*100;
      let lkSum=0,lkN=0;
      for(let i=31;i<=40;i++){const v=parseFloat(r['q'+i]);if(!isNaN(v)){lkSum+=v;lkN++;}}
      const lk=lkN?(lkSum/lkN).toFixed(1):'—';
      const [lab,cls]=p>=67?['🟢 Listo','b-listo']:p>=40?['🟡 Selectivo','b-sel']:['🔴 Completo','b-comp'];
      const barC=p>=67?'#27ae60':p>=40?'#e67e22':'#e74c3c';
      const fecha=r.timestamp?new Date(r.timestamp).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}):'—';
      return `<tr>
        <td><strong>${r._nombre||'—'}</strong></td>
        <td style="font-size:.82rem;color:#7f8c8d">${r._correo||'—'}</td>
        <td style="text-align:center">${r._semestre||'—'}</td>
        <td style="text-align:center">${sa}/10</td>
        <td style="text-align:center">${sB}/10</td>
        <td style="text-align:center">${sC}/10</td>
        <td style="text-align:center;font-weight:700">${s}/30</td>
        <td style="min-width:100px">
          <div style="background:#f0f0f0;border-radius:4px;height:8px;overflow:hidden">
            <div style="width:${p.toFixed(0)}%;height:100%;background:${barC};border-radius:4px"></div>
          </div>
          <small style="color:#666">${p.toFixed(0)}%</small>
        </td>
        <td style="text-align:center">${lk}/5</td>
        <td style="text-align:center"><span class="rol-badge ${cls}">${lab}</span></td>
        <td style="font-size:.8rem;color:#7f8c8d">${fecha}</td>
      </tr>`;
    }).join('');
}