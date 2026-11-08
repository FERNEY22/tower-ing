/* render-cv-visitas.js — Visitas a la hoja de vida (cv/index.html)
   Datos que guarda netlify/functions/cv-visita.mjs en visitas_cv/<id>:
   fecha, ciudad, region, pais, ip (parcial), origen, referencia, navegador, so, movil, idioma, pantalla, correo. */
(function(){
  function esc(s){ return (s==null?"":(""+s)).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function todos(){
    const d=(typeof DATA!=="undefined" && DATA.cvVisitas) ? DATA.cvVisitas : {};
    return Object.values(d||{}).filter(v=>v && v.fecha).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  }
  function contar(arr, f){
    const m={}; arr.forEach(v=>{ const k=f(v)||"—"; m[k]=(m[k]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }
  function fechaCO(iso){
    try{ return new Date(iso).toLocaleString("es-CO",{timeZone:"America/Bogota",dateStyle:"medium",timeStyle:"short"}); }
    catch(e){ return iso; }
  }
  function lugar(v){ return [v.ciudad, v.region, v.pais].filter(Boolean).join(", ") || "—"; }
  function tablaConteo(titulo, icono, filas){
    return `<div class="seccion"><h2><i class="fa-solid ${icono}"></i> ${titulo}</h2>
      <table><thead><tr><th>${titulo}</th><th>Visitas</th></tr></thead><tbody>
      ${filas.map(([k,n])=>`<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join("") || '<tr><td colspan="2">Sin datos</td></tr>'}
      </tbody></table></div>`;
  }

  function render(){
    const cont=document.getElementById("vista-cvVisitas"); if(!cont) return;
    const vs=todos();
    const hace7=Date.now()-7*864e5, hace30=Date.now()-30*864e5;
    const n7=vs.filter(v=>Date.parse(v.fecha)>=hace7).length;
    const n30=vs.filter(v=>Date.parse(v.fecha)>=hace30).length;
    const paises=new Set(vs.map(v=>v.pais).filter(Boolean)).size;

    cont.innerHTML = `
      <div class="seccion-head"><h2><i class="fa-solid fa-id-card"></i> Visitas a la hoja de vida</h2></div>
      <div class="kpi-grid">
        <div class="kpi-card"><i class="fa-solid fa-eye"></i><h3>${vs.length}</h3><p>Visitas en total</p></div>
        <div class="kpi-card green"><i class="fa-solid fa-calendar-week"></i><h3>${n7}</h3><p>Últimos 7 días</p></div>
        <div class="kpi-card purple"><i class="fa-solid fa-calendar"></i><h3>${n30}</h3><p>Últimos 30 días</p></div>
        <div class="kpi-card orange"><i class="fa-solid fa-earth-americas"></i><h3>${paises}</h3><p>Países distintos</p></div>
      </div>
      <div class="seccion"><h2><i class="fa-solid fa-list"></i> Detalle de visitas</h2>
        <div style="overflow-x:auto"><table>
          <thead><tr><th>Fecha</th><th>Lugar aproximado</th><th>Llegó desde</th><th>Dispositivo</th><th>Idioma</th><th>Red (IP parcial)</th></tr></thead>
          <tbody>${vs.map(v=>`<tr>
            <td>${esc(fechaCO(v.fecha))}</td><td>${esc(lugar(v))}</td>
            <td>${esc(v.origen)}${v.referencia?`<br><small style="color:var(--ink-3)">${esc(v.referencia)}</small>`:""}</td>
            <td>${v.movil?"Celular":"Computador"} · ${esc(v.so)} · ${esc(v.navegador)}</td>
            <td>${esc(v.idioma)}</td><td><code>${esc(v.ip)}</code></td></tr>`).join("") || '<tr><td colspan="6">Todavía no hay visitas registradas.</td></tr>'}
          </tbody></table></div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
        ${tablaConteo("Origen","fa-arrow-right-to-bracket",contar(vs,v=>v.origen))}
        ${tablaConteo("País","fa-flag",contar(vs,v=>v.pais))}
      </div>`;
  }
  window.renderCvVisitas = render;
})();
