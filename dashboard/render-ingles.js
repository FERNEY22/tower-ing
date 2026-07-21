/* render-ingles.js — Diagnóstico de Inglés · Ingeniería
   Nivel MCER (A1–C1) · secciones (grammar/vocab/reading) · comparativo por división.
   Analítica para el docente: desempeño por nivel MCER, temas débiles y orientación.
   Payload autodescriptivo (no requiere clave de respuestas). Uniforme con el dashboard. */
(function(){
  const DIVISIONES = [
    {id:"electronica",nombre:"Electrónica"},
    {id:"automatizacion",nombre:"Automatización"},
    {id:"digitales",nombre:"Digitales"},
    {id:"software_ia",nombre:"Software e IA"}
  ];
  const NIVELES = ["A1","A2","B1","B2","C1"];
  const SECS = [["grammar","Grammar"],["vocab","Vocabulary"],["reading","Reading"]];

  let seg = "general"; // general | id de división

  function tok(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#4d66ff"; }
  function esc(s){ return (s==null?"":(""+s)).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function tokPct(v){ return v>=75?tok("--pos"):v>=50?tok("--warn"):tok("--neg"); }
  function colPct(v){ return v>=75?"var(--pos)":v>=50?"var(--warn)":"var(--neg)"; }
  function divNombre(id){ const d=DIVISIONES.find(x=>x.id===id); return d?d.nombre:(id||"—"); }

  function todos(){
    const d=(typeof DATA!=="undefined" && DATA.ingles) ? DATA.ingles : {};
    return Array.isArray(d) ? d : Object.values(d||{});
  }
  function registros(){ const all=todos(); return seg==="general"?all:all.filter(r=>r.division===seg); }
  function validos(recs){ return (recs||[]).filter(r=>!r.abandonado); }

  function prom(arr){ const v=(arr||[]).filter(x=>typeof x==="number"); return v.length? Math.round(v.reduce((a,b)=>a+b,0)/v.length):null; }

  function kpis(recs){
    const ok=validos(recs);
    const pcts=ok.map(r=>r.pct);
    const dist={}; NIVELES.forEach(n=>dist[n]=0);
    ok.forEach(r=>{ if(r.nivel in dist) dist[r.nivel]++; });
    let modal="—",max=-1; NIVELES.forEach(n=>{ if(dist[n]>max){max=dist[n];modal=n;} });
    return { total:ok.length, abandonos:recs.length-ok.length, promedio:prom(pcts), modal:(ok.length?modal:"—"), dist };
  }
  function promSecciones(recs){
    const ok=validos(recs), out={};
    SECS.forEach(([k])=>{ out[k]=prom(ok.map(r=>r.secciones&&r.secciones[k]?r.secciones[k].pct:null)); });
    return out;
  }
  // Comparativo: por división → promedio por sección
  function porDivision(){
    const all=todos();
    return DIVISIONES.map(d=>{
      const ok=validos(all.filter(r=>r.division===d.id));
      const s=k=>prom(ok.map(r=>r.secciones&&r.secciones[k]?r.secciones[k].pct:null));
      return { id:d.id, nombre:d.nombre, n:ok.length, grammar:s("grammar"), vocab:s("vocab"), reading:s("reading"), total:prom(ok.map(r=>r.pct)) };
    }).filter(d=>d.n>0);
  }
  // Desempeño por nivel MCER (% de acierto de los ítems etiquetados con cada nivel)
  function porNivelMCER(recs){
    const ok=validos(recs), acc={}; NIVELES.forEach(n=>acc[n]={c:0,t:0});
    ok.forEach(r=>{ const pn=r.porNivel||{}; NIVELES.forEach(n=>{ if(pn[n]){ acc[n].c+=pn[n].c||0; acc[n].t+=pn[n].t||0; } }); });
    return NIVELES.map(n=>({nivel:n, pct: acc[n].t? Math.round(100*acc[n].c/acc[n].t):null, n:acc[n].t}));
  }
  // Temas (orientación): % de acierto por tema, con sección
  function porTema(recs){
    const ok=validos(recs), acc={};
    ok.forEach(r=>(r.respuestas||[]).forEach(q=>{
      const key=q.tema||q.id; const o=acc[key]||(acc[key]={tema:key,sec:q.sec,c:0,t:0});
      o.t++; if(q.correcta) o.c++;
    }));
    return Object.values(acc).map(o=>({...o,pct:o.t?Math.round(100*o.c/o.t):0})).sort((a,b)=>a.pct-b.pct);
  }
  function participacion(recs){
    const m={}; validos(recs).forEach(r=>{ const k=r.programa||"—"; m[k]=(m[k]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }

  function render(){
    const cont=document.getElementById("vista-ingles"); if(!cont) return;
    const recs=registros(), all=todos();
    const divDisp=[...new Set(all.map(r=>r.division))];
    const selSty="padding:9px 14px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface-2);color:var(--ink);font-family:var(--font-body);font-size:var(--t-sm);font-weight:500;cursor:pointer;outline:none";
    const head=`<div class="seccion-head"><h2><i class="fa-solid fa-language"></i> Diagnóstico de Inglés</h2>
        <select id="ing-seg" style="${selSty}"><option value="general">General · todas las divisiones</option>
          ${DIVISIONES.filter(d=>divDisp.includes(d.id)).map(d=>`<option value="${d.id}">${d.nombre}</option>`).join("")}</select></div>`;

    if(!validos(recs).length){
      cont.innerHTML=`<div class="seccion">${head}<p class="empty-td">Aún no hay diagnósticos registrados${seg!=="general"?" para "+divNombre(seg):""}.</p></div>`;
      bindSel(); return;
    }

    const k=kpis(recs), ps=promSecciones(recs), comp=porDivision(), niv=porNivelMCER(recs), temas=porTema(recs), part=participacion(recs);
    const det=validos(recs).slice().sort((a,b)=>(b.pct||0)-(a.pct||0));
    const debiles=temas.filter(t=>t.pct<60).slice(0,6);

    const secLabel={grammar:"Grammar",vocab:"Vocabulary",reading:"Reading"};

    cont.innerHTML=`
      <div class="seccion" style="padding-bottom:14px">${head}</div>
      <div class="kpi-grid">
        <div class="kpi-card"><i class="fa-solid fa-users"></i><h3>${k.total}</h3><p>Estudiantes evaluados</p></div>
        <div class="kpi-card purple"><i class="fa-solid fa-gauge-high"></i><h3>${k.promedio??"—"}%</h3><p>Promedio de aciertos</p></div>
        <div class="kpi-card green"><i class="fa-solid fa-certificate"></i><h3>${k.modal}</h3><p>Nivel MCER más común</p></div>
        <div class="kpi-card red"><i class="fa-solid fa-user-slash"></i><h3>${k.abandonos}</h3><p>Intentos abandonados</p></div>
      </div>
      <div class="charts-row">
        <div class="seccion"><h2><i class="fa-solid fa-chart-pie"></i> Distribución por nivel MCER</h2><div class="chart-wrap"><canvas id="ing-mcer"></canvas></div></div>
        <div class="seccion"><h2><i class="fa-solid fa-layer-group"></i> Promedio por sección</h2><div class="chart-wrap"><canvas id="ing-secc"></canvas></div></div>
      </div>
      <div class="seccion"><h2><i class="fa-solid fa-signal"></i> Desempeño por nivel de dificultad (MCER)</h2>
        <p style="color:var(--ink-3);font-size:var(--t-sm);margin:-6px 0 12px">% de acierto en los ítems etiquetados con cada nivel. Muestra hasta qué nivel llega el dominio del grupo: cuando cae por debajo del 50% marca el techo de nivel.</p>
        <div class="chart-wrap" style="height:240px"><canvas id="ing-niv"></canvas></div></div>
      ${seg==="general" && comp.length>1 ? `
      <div class="seccion"><h2><i class="fa-solid fa-code-compare"></i> Comparativo por división</h2>
        <p style="color:var(--ink-3);font-size:var(--t-sm);margin:-6px 0 12px">Promedio de aciertos por sección en cada énfasis de lectura.</p>
        <div class="chart-wrap" style="height:300px"><canvas id="ing-comp"></canvas></div>
        <div style="overflow-x:auto;margin-top:14px"><table>
          <thead><tr><th>División</th><th>n</th><th>Grammar</th><th>Vocabulary</th><th>Reading</th><th>Total</th></tr></thead>
          <tbody>${comp.map(d=>`<tr><td>${d.nombre}</td><td>${d.n}</td>
            <td>${d.grammar??"—"}%</td><td>${d.vocab??"—"}%</td><td>${d.reading??"—"}%</td>
            <td><b style="color:${colPct(d.total||0)}">${d.total??"—"}%</b></td></tr>`).join("")}</tbody>
        </table></div></div>`:""}
      <div class="seccion"><h2><i class="fa-solid fa-arrow-trend-down"></i> Temas por reforzar · orientación</h2>
        <p style="color:var(--ink-3);font-size:var(--t-sm);margin:-6px 0 12px">% de acierto por tema (menor = más débil). 🔴 &lt;50% reforzar · 🟠 50–74% revisar · 🟢 ≥75% dominado.</p>
        <div class="chart-wrap" style="height:${Math.max(220,temas.length*26)}px"><canvas id="ing-temas"></canvas></div>
        ${debiles.length?`<div class="grupos-info" style="margin-top:16px">
          <b>Sugerencia de refuerzo:</b> el grupo está más flojo en
          ${debiles.map(t=>`<b>${esc(t.tema)}</b> (${secLabel[t.sec]||t.sec}, ${t.pct}%)`).join(", ")}.
          Prioriza estos temas en las próximas clases y practica vocabulario en contexto de ingeniería.</div>`:""}
      </div>
      <div class="seccion"><h2><i class="fa-solid fa-list"></i> Detalle por estudiante ${seg!=="general"?"· "+divNombre(seg):""}</h2>
        <div style="overflow-x:auto"><table>
          <thead><tr><th>Estudiante</th><th>Identificación</th><th>Programa</th><th>División</th>
            <th style="text-align:center">Gram.</th><th style="text-align:center">Voc.</th><th style="text-align:center">Read.</th>
            <th style="text-align:center">Total</th><th style="text-align:center">Nivel</th><th style="text-align:center">Tiempo</th></tr></thead>
          <tbody>${det.map(r=>{ const s=r.secciones||{}; const mm=Math.floor((r.duracionSeg||0)/60), ss=(r.duracionSeg||0)%60;
            return `<tr><td style="font-weight:600">${esc(r.nombre)}</td><td>${esc(r.identificacion)}</td><td>${esc(r.programa)}</td><td>${divNombre(r.division)}</td>
              <td style="text-align:center">${s.grammar?s.grammar.pct:"—"}%</td><td style="text-align:center">${s.vocab?s.vocab.pct:"—"}%</td><td style="text-align:center">${s.reading?s.reading.pct:"—"}%</td>
              <td style="text-align:center"><b style="color:${colPct(r.pct||0)}">${r.pct}%</b></td>
              <td style="text-align:center"><span class="rol-badge b-coord">${r.nivel}</span></td>
              <td style="text-align:center">${mm}:${String(ss).padStart(2,"0")}</td></tr>`;}).join("")}</tbody>
        </table></div></div>
      <div class="seccion"><h2><i class="fa-solid fa-people-group"></i> Participación por programa</h2>
        <table><thead><tr><th>Programa</th><th>Estudiantes</th></tr></thead>
        <tbody>${part.map(p=>`<tr><td>${esc(p[0])}</td><td>${p[1]}</td></tr>`).join("")}</tbody></table></div>`;

    bindSel();

    // ==== Charts ====
    const barY={plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,max:100,ticks:{stepSize:25,callback:v=>v+"%"}}}};
    const barX={indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,max:100,ticks:{stepSize:25,callback:v=>v+"%"}}}};
    const palNiv=[tok("--neg"),tok("--warn"),tok("--electric"),tok("--electric-2"),tok("--pos")];

    crearChart("ing-mcer","doughnut",
      {labels:NIVELES,datasets:[{data:NIVELES.map(n=>k.dist[n]),backgroundColor:palNiv}]},
      {plugins:{legend:{position:"right",labels:{boxWidth:12,font:{size:11}}}}});

    crearChart("ing-secc","bar",
      {labels:SECS.map(s=>s[1]),datasets:[{data:SECS.map(s=>ps[s[0]]??0),backgroundColor:[tok("--electric"),tok("--spark"),tok("--pos")]}]},
      barY);

    crearChart("ing-niv","bar",
      {labels:niv.map(x=>x.nivel),datasets:[{data:niv.map(x=>x.pct??0),backgroundColor:niv.map(x=>tokPct(x.pct??0))}]},
      barY);

    if(seg==="general" && comp.length>1){
      crearChart("ing-comp","bar",
        {labels:comp.map(d=>d.nombre),datasets:[
          {label:"Grammar",data:comp.map(d=>d.grammar??0),backgroundColor:tok("--electric")},
          {label:"Vocabulary",data:comp.map(d=>d.vocab??0),backgroundColor:tok("--spark")},
          {label:"Reading",data:comp.map(d=>d.reading??0),backgroundColor:tok("--pos")}]},
        {plugins:{legend:{position:"top",labels:{boxWidth:12,font:{size:11}}}},scales:{y:{beginAtZero:true,max:100,ticks:{stepSize:25,callback:v=>v+"%"}}}});
    }

    crearChart("ing-temas","bar",
      {labels:temas.map(t=>t.tema),datasets:[{data:temas.map(t=>t.pct),backgroundColor:temas.map(t=>tokPct(t.pct))}]},
      barX);
  }

  function bindSel(){
    const s=document.getElementById("ing-seg"); if(s){ s.value=seg; s.onchange=e=>{seg=e.target.value;render();}; }
  }
  window.renderIngles = render;
})();
