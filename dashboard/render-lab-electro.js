/* render-lab-electro.js — Quiz de Laboratorio · Electrónica (IFA00112)
   4 apartados de quiz (solo el Quiz 1 habilitado) · 2 preguntas aleatorias por estudiante.
   Analítica para el docente: calificación, aprobación, desempeño por bloque temático,
   preguntas más falladas y detalle por estudiante.
   Payload autodescriptivo (no requiere clave de respuestas). Uniforme con el dashboard. */
(function(){
  const QUICES = [
    {id:"quiz1",nombre:"Quiz 1 · Instrumentos y Práctica No 1"},
    {id:"quiz2",nombre:"Quiz 2 · Práctica No 2"},
    {id:"quiz3",nombre:"Quiz 3 · Práctica No 3"},
    {id:"quiz4",nombre:"Quiz 4 · Práctica No 4"}
  ];
  const BLOQUES = {
    "1":"Multímetro: conexión, modos y diagnóstico",
    "2":"Fuente DC y generador de funciones",
    "3":"Osciloscopio y acoplamiento",
    "4":"Protoboard, montaje y buenas prácticas",
    "5":"Práctica No 1: estaciones y cálculos"
  };
  const ORDEN_BLQ = ["1","2","3","4","5"];
  const APROBA = 60; // nota mínima de aprobación

  let seg = "general"; // general | id de quiz

  function tok(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#4d66ff"; }
  function esc(s){ return (s==null?"":(""+s)).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function tokPct(v){ return v>=75?tok("--pos"):v>=50?tok("--warn"):tok("--neg"); }
  function colPct(v){ return v>=75?"var(--pos)":v>=50?"var(--warn)":"var(--neg)"; }
  function quizNombre(id){ const q=QUICES.find(x=>x.id===id); return q?q.nombre:(id||"—"); }
  function blqNombre(k){ return BLOQUES[k]||k; }

  function todos(){
    const d=(typeof DATA!=="undefined" && DATA.labElectro) ? DATA.labElectro : {};
    return Array.isArray(d) ? d : Object.values(d||{});
  }
  function registros(){ const all=todos(); return seg==="general"?all:all.filter(r=>r.quiz===seg); }
  // Se descartan los abandonos y cualquier registro incompleto (pruebas, escrituras a medias)
  function validos(recs){ return (recs||[]).filter(r=>r && !r.abandonado && r.nombre && r.quiz); }
  function prom(arr){ const v=(arr||[]).filter(x=>typeof x==="number"); return v.length? Math.round(v.reduce((a,b)=>a+b,0)/v.length):null; }

  function kpis(recs){
    const ok=validos(recs);
    const notas=ok.map(r=>typeof r.nota==="number"?r.nota:r.pct);
    const aprob=ok.filter(r=>(typeof r.nota==="number"?r.nota:r.pct)>=APROBA).length;
    return {
      total:ok.length,
      abandonos:recs.length-ok.length,
      promedio:prom(notas),
      aprobados:aprob,
      pctAprob: ok.length? Math.round(100*aprob/ok.length):null
    };
  }
  // Distribución de calificaciones (adaptativa: usa los valores realmente obtenidos)
  function distNotas(recs){
    const m={};
    validos(recs).forEach(r=>{ const n=(typeof r.nota==="number"?r.nota:r.pct)||0; m[n]=(m[n]||0)+1; });
    return Object.keys(m).map(Number).sort((a,b)=>a-b).map(n=>({nota:n,n:m[n]}));
  }
  // Desempeño por bloque temático (agrega c/t de todos los estudiantes)
  function porBloque(recs){
    const ok=validos(recs), acc={};
    ok.forEach(r=>{ const b=r.bloques||{}; Object.keys(b).forEach(k=>{
      const o=acc[k]||(acc[k]={c:0,t:0}); o.c+=b[k].c||0; o.t+=b[k].t||0; }); });
    const claves=ORDEN_BLQ.filter(k=>acc[k]).concat(Object.keys(acc).filter(k=>!ORDEN_BLQ.includes(k)));
    return claves.map(k=>({bloque:k, nombre:blqNombre(k), pct: acc[k].t?Math.round(100*acc[k].c/acc[k].t):null, n:acc[k].t}));
  }
  // Comparativo entre quices habilitados
  function porQuiz(){
    const all=todos();
    return QUICES.map(q=>{
      const ok=validos(all.filter(r=>r.quiz===q.id));
      const notas=ok.map(r=>(typeof r.nota==="number"?r.nota:r.pct));
      return { id:q.id, nombre:q.nombre, n:ok.length, promedio:prom(notas),
        aprob: ok.length? Math.round(100*ok.filter(x=>((typeof x.nota==="number"?x.nota:x.pct)>=APROBA)).length/ok.length):null };
    }).filter(q=>q.n>0);
  }
  // Ítems: % de acierto por pregunta (cada estudiante ve 2 al azar del banco)
  function porItem(recs){
    const ok=validos(recs), acc={};
    ok.forEach(r=>(r.respuestas||[]).forEach(q=>{
      const o=acc[q.id]||(acc[q.id]={id:q.id, bloque:q.bloque, tema:q.tema||q.id, etiqueta:q.etiqueta||"", c:0, t:0, sinResp:0});
      o.t++; if(q.correcta) o.c++; if(q.agotado) o.sinResp++;
    }));
    return Object.values(acc).map(o=>({...o,pct:o.t?Math.round(100*o.c/o.t):0})).sort((a,b)=>a.pct-b.pct||b.t-a.t);
  }
  // Temas agrupados (orientación pedagógica)
  function porTema(recs){
    const ok=validos(recs), acc={};
    ok.forEach(r=>(r.respuestas||[]).forEach(q=>{
      const key=q.tema||q.id; const o=acc[key]||(acc[key]={tema:key,bloque:q.bloque,c:0,t:0});
      o.t++; if(q.correcta) o.c++;
    }));
    return Object.values(acc).map(o=>({...o,pct:o.t?Math.round(100*o.c/o.t):0})).sort((a,b)=>a.pct-b.pct);
  }
  function participacion(recs){
    const m={}; validos(recs).forEach(r=>{ const k=r.programa||"—"; m[k]=(m[k]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }
  function cobertura(recs){
    const ok=validos(recs); const vistos=new Set();
    ok.forEach(r=>(r.respuestas||[]).forEach(q=>vistos.add(q.id)));
    return { items:vistos.size, mostradas: ok.reduce((a,r)=>a+((r.respuestas||[]).length),0) };
  }

  function render(){
    const cont=document.getElementById("vista-labElectro"); if(!cont) return;
    const recs=registros(), all=todos();
    const quizDisp=[...new Set(all.map(r=>r.quiz))];
    const selSty="padding:9px 14px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface-2);color:var(--ink);font-family:var(--font-body);font-size:var(--t-sm);font-weight:500;cursor:pointer;outline:none";
    const head=`<div class="seccion-head"><h2><i class="fa-solid fa-wave-square"></i> Quiz de Laboratorio · Electrónica</h2>
        <select id="lab-el-seg" style="${selSty}"><option value="general">General · todos los quices</option>
          ${QUICES.filter(q=>quizDisp.includes(q.id)).map(q=>`<option value="${q.id}">${q.nombre}</option>`).join("")}</select></div>`;

    if(!validos(recs).length){
      cont.innerHTML=`<div class="seccion">${head}<p class="empty-td">Aún no hay intentos registrados${seg!=="general"?" para "+quizNombre(seg):""}.</p></div>`;
      bindSel(); return;
    }

    const k=kpis(recs), dist=distNotas(recs), blq=porBloque(recs), comp=porQuiz(),
          items=porItem(recs), temas=porTema(recs), part=participacion(recs), cob=cobertura(recs);
    const det=validos(recs).slice().sort((a,b)=>((b.nota??b.pct)||0)-((a.nota??a.pct)||0));
    const debiles=temas.filter(t=>t.pct<60).slice(0,6);
    const falladas=items.filter(i=>i.pct<60).slice(0,10);

    cont.innerHTML=`
      <div class="seccion" style="padding-bottom:14px">${head}</div>
      <div class="kpi-grid">
        <div class="kpi-card"><i class="fa-solid fa-users"></i><h3>${k.total}</h3><p>Estudiantes evaluados</p></div>
        <div class="kpi-card purple"><i class="fa-solid fa-gauge-high"></i><h3>${k.promedio??"—"}</h3><p>Calificación promedio /100</p></div>
        <div class="kpi-card green"><i class="fa-solid fa-circle-check"></i><h3>${k.pctAprob??"—"}%</h3><p>Aprobación (≥${APROBA})</p></div>
        <div class="kpi-card red"><i class="fa-solid fa-user-slash"></i><h3>${k.abandonos}</h3><p>Intentos abandonados</p></div>
      </div>
      <div class="charts-row">
        <div class="seccion"><h2><i class="fa-solid fa-chart-column"></i> Distribución de calificaciones</h2>
          <p style="color:var(--ink-3);font-size:var(--t-sm);margin:-6px 0 12px">Número de estudiantes por nota obtenida. Con 2 preguntas las notas posibles son 0, 50 y 100.</p>
          <div class="chart-wrap"><canvas id="lab-el-dist"></canvas></div></div>
        <div class="seccion"><h2><i class="fa-solid fa-chart-pie"></i> Aprobación</h2>
          <p style="color:var(--ink-3);font-size:var(--t-sm);margin:-6px 0 12px">Estudiantes que alcanzan la nota mínima de ${APROBA}/100.</p>
          <div class="chart-wrap"><canvas id="lab-el-aprob"></canvas></div></div>
      </div>
      <div class="seccion"><h2><i class="fa-solid fa-layer-group"></i> Desempeño por bloque temático</h2>
        <p style="color:var(--ink-3);font-size:var(--t-sm);margin:-6px 0 12px">% de acierto en los ítems de cada bloque del banco. 🔴 &lt;50% reforzar · 🟠 50–74% revisar · 🟢 ≥75% dominado.</p>
        <div class="chart-wrap" style="height:${Math.max(220,blq.length*40)}px"><canvas id="lab-el-blq"></canvas></div>
        <div style="overflow-x:auto;margin-top:14px"><table>
          <thead><tr><th>Bloque</th><th>Contenido</th><th style="text-align:center">Ítems presentados</th><th style="text-align:center">% acierto</th></tr></thead>
          <tbody>${blq.map(b=>`<tr><td style="font-weight:600">${esc(b.bloque)}</td><td>${esc(b.nombre)}</td>
            <td style="text-align:center">${b.n}</td>
            <td style="text-align:center"><b style="color:${colPct(b.pct||0)}">${b.pct??"—"}%</b></td></tr>`).join("")}</tbody>
        </table></div></div>
      ${seg==="general" && comp.length>1 ? `
      <div class="seccion"><h2><i class="fa-solid fa-code-compare"></i> Comparativo por quiz</h2>
        <div class="chart-wrap" style="height:280px"><canvas id="lab-el-comp"></canvas></div>
        <div style="overflow-x:auto;margin-top:14px"><table>
          <thead><tr><th>Quiz</th><th style="text-align:center">n</th><th style="text-align:center">Promedio</th><th style="text-align:center">Aprobación</th></tr></thead>
          <tbody>${comp.map(q=>`<tr><td>${esc(q.nombre)}</td><td style="text-align:center">${q.n}</td>
            <td style="text-align:center"><b style="color:${colPct(q.promedio||0)}">${q.promedio??"—"}</b></td>
            <td style="text-align:center">${q.aprob??"—"}%</td></tr>`).join("")}</tbody>
        </table></div></div>`:""}
      <div class="seccion"><h2><i class="fa-solid fa-arrow-trend-down"></i> Temas por reforzar · orientación</h2>
        <p style="color:var(--ink-3);font-size:var(--t-sm);margin:-6px 0 12px">% de acierto por tema (menor = más débil). Cada estudiante solo ve 2 ítems al azar, así que la muestra por tema crece a medida que se registran más intentos.</p>
        <div class="chart-wrap" style="height:${Math.max(220,temas.length*24)}px"><canvas id="lab-el-temas"></canvas></div>
        ${debiles.length?`<div class="grupos-info" style="margin-top:16px">
          <b>Sugerencia de refuerzo:</b> el grupo está más flojo en
          ${debiles.map(t=>`<b>${esc(t.tema)}</b> (bloque ${esc(t.bloque)}, ${t.pct}%)`).join(", ")}.
          Retoma estos puntos del material de instrumentos y de la guía antes de la siguiente práctica.</div>`:""}
      </div>
      <div class="seccion"><h2><i class="fa-solid fa-circle-question"></i> Preguntas más falladas</h2>
        <p style="color:var(--ink-3);font-size:var(--t-sm);margin:-6px 0 12px">Cobertura del banco: <b>${cob.items}</b> ítems distintos han salido en <b>${cob.mostradas}</b> presentaciones.</p>
        ${falladas.length?`<div style="overflow-x:auto"><table>
          <thead><tr><th>Ítem</th><th>Bloque</th><th>Pregunta</th><th style="text-align:center">Veces</th><th style="text-align:center">Sin responder</th><th style="text-align:center">% acierto</th></tr></thead>
          <tbody>${falladas.map(i=>`<tr><td style="font-family:var(--font-mono,monospace)">${esc(i.id)}</td>
            <td>${esc(i.bloque)}</td><td>${esc(i.etiqueta)}</td>
            <td style="text-align:center">${i.t}</td><td style="text-align:center">${i.sinResp}</td>
            <td style="text-align:center"><b style="color:${colPct(i.pct)}">${i.pct}%</b></td></tr>`).join("")}</tbody>
        </table></div>`:`<p class="empty-td">Ninguna pregunta baja del 60% de acierto.</p>`}
      </div>
      <div class="seccion"><h2><i class="fa-solid fa-list"></i> Detalle por estudiante ${seg!=="general"?"· "+quizNombre(seg):""}</h2>
        <div style="overflow-x:auto"><table>
          <thead><tr><th>Estudiante</th><th>Identificación</th><th>Programa</th><th>Quiz</th>
            <th style="text-align:center">Correctas</th><th style="text-align:center">Sin responder</th>
            <th style="text-align:center">Nota</th><th style="text-align:center">Estado</th><th style="text-align:center">Tiempo</th></tr></thead>
          <tbody>${det.map(r=>{ const nota=(typeof r.nota==="number"?r.nota:r.pct)||0;
            const mm=Math.floor((r.duracionSeg||0)/60), ss=(r.duracionSeg||0)%60;
            const sinResp=(r.total||0)-(r.respondidas||0);
            return `<tr><td style="font-weight:600">${esc(r.nombre)}</td><td>${esc(r.identificacion)}</td><td>${esc(r.programa)}</td><td>${esc(quizNombre(r.quiz))}</td>
              <td style="text-align:center">${r.correctas??"—"}/${r.total??"—"}</td>
              <td style="text-align:center">${sinResp>0?sinResp:"—"}</td>
              <td style="text-align:center"><b style="color:${colPct(nota)}">${nota}</b></td>
              <td style="text-align:center"><span class="rol-badge ${nota>=APROBA?"b-listo":"b-comp"}">${nota>=APROBA?"Aprobado":"No aprobado"}</span></td>
              <td style="text-align:center">${mm}:${String(ss).padStart(2,"0")}</td></tr>`;}).join("")}</tbody>
        </table></div></div>
      <div class="seccion"><h2><i class="fa-solid fa-people-group"></i> Participación por programa</h2>
        <table><thead><tr><th>Programa</th><th>Estudiantes</th></tr></thead>
        <tbody>${part.map(p=>`<tr><td>${esc(p[0])}</td><td>${p[1]}</td></tr>`).join("")}</tbody></table></div>`;

    bindSel();

    // ==== Charts ====
    const barY={plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}};
    const barXpct={indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,max:100,ticks:{stepSize:25,callback:v=>v+"%"}}}};

    crearChart("lab-el-dist","bar",
      {labels:dist.map(d=>d.nota+" / 100"),datasets:[{data:dist.map(d=>d.n),backgroundColor:dist.map(d=>tokPct(d.nota))}]},
      barY);

    crearChart("lab-el-aprob","doughnut",
      {labels:["Aprobados","No aprobados"],datasets:[{data:[k.aprobados,k.total-k.aprobados],backgroundColor:[tok("--pos"),tok("--neg")]}]},
      {plugins:{legend:{position:"right",labels:{boxWidth:12,font:{size:11}}}}});

    crearChart("lab-el-blq","bar",
      {labels:blq.map(b=>b.bloque+" · "+b.nombre),datasets:[{data:blq.map(b=>b.pct??0),backgroundColor:blq.map(b=>tokPct(b.pct??0))}]},
      barXpct);

    if(seg==="general" && comp.length>1){
      crearChart("lab-el-comp","bar",
        {labels:comp.map(q=>q.nombre),datasets:[
          {label:"Promedio /100",data:comp.map(q=>q.promedio??0),backgroundColor:tok("--electric")},
          {label:"% aprobación",data:comp.map(q=>q.aprob??0),backgroundColor:tok("--pos")}]},
        {plugins:{legend:{position:"top",labels:{boxWidth:12,font:{size:11}}}},scales:{y:{beginAtZero:true,max:100,ticks:{stepSize:25}}}});
    }

    crearChart("lab-el-temas","bar",
      {labels:temas.map(t=>t.tema),datasets:[{data:temas.map(t=>t.pct),backgroundColor:temas.map(t=>tokPct(t.pct))}]},
      barXpct);
  }

  function bindSel(){
    const s=document.getElementById("lab-el-seg"); if(s){ s.value=seg; s.onchange=e=>{seg=e.target.value;render();}; }
  }
  window.renderLabElectro = render;
})();
