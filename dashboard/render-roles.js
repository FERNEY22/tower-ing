// ══════════════════════════════════════════════════════════════════
// render-roles.js  ·  Identificador de Rol Colaborativo
// Nodo Firebase: estudiantes/
// ══════════════════════════════════════════════════════════════════

const ROL_COLORS = { coordinador:'#3498db', comunicador:'#9b59b6', investigador:'#27ae60', 'analista de datos':'#e67e22' };
const ROL_BADGE  = { coordinador:'b-coord',  comunicador:'b-comun',  investigador:'b-invest', 'analista de datos':'b-anal'  };
const DOT        = { coordinador:'#3498db', comunicador:'#9b59b6', investigador:'#27ae60', 'analista de datos':'#e67e22' };
const ROLES_LIST = ['coordinador','comunicador','investigador','analista de datos'];

let estadoGrupos = { grupos: [], sinGrupo: [] };

function renderRoles() {
  const rows  = Object.entries(DATA.roles).map(([k,v]) => ({ key:k, ...v }));
  const counts = ROLES_LIST.map(r => rows.filter(e => e.rolNatural === r).length);

  document.getElementById('r-total').textContent  = rows.length;
  document.getElementById('r-coord').textContent  = counts[0];
  document.getElementById('r-comun').textContent  = counts[1];
  document.getElementById('r-invest').textContent = counts[2];
  document.getElementById('r-anal').textContent   = counts[3];
  document.getElementById('badge-count').textContent = rows.length + ' registros';

  crearChart('chart-r-dist','doughnut',{
    labels:['Coordinador','Comunicador','Investigador','Analista de Datos'],
    datasets:[{ data:counts, backgroundColor:Object.values(ROL_COLORS), borderWidth:2, borderColor:'white' }]
  },{ plugins:{ legend:{ position:'bottom', labels:{ padding:14 }}}});

  const avgs = ROLES_LIST.map(r => {
    const set = rows.filter(e => e.puntajes?.[r]);
    return set.length ? (set.reduce((s,e) => s+(e.puntajes[r]||0),0)/set.length).toFixed(1) : 0;
  });
  crearChart('chart-r-avg','bar',{
    labels:['Coordinador','Comunicador','Investigador','Analista'],
    datasets:[{ label:'Puntaje promedio', data:avgs,
      backgroundColor:Object.values(ROL_COLORS).map(c=>c+'bb'),
      borderRadius:6, borderSkipped:false }]
  },{ scales:{ y:{ beginAtZero:true, grid:{ color:'#f0f0f0' }}, x:{ grid:{ display:false }}},
      plugins:{ legend:{ display:false }}});

  const tbody = document.getElementById('r-tabla');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-td">No hay estudiantes registrados aún.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.sort((a,b)=>(b.fechaRegistro||0)-(a.fechaRegistro||0)).map(r => {
    const p = r.puntajes || {};
    const fecha = r.fechaRegistro
      ? new Date(r.fechaRegistro).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    return `<tr>
      <td><strong>${r.nombre||'—'}</strong></td>
      <td>${r.apellido||'—'}</td>
      <td style="font-family:monospace;font-size:.82rem">${r.identificacion||'—'}</td>
      <td><span class="rol-badge ${ROL_BADGE[r.rolNatural]||''}">${(r.rolNatural||'—').toUpperCase()}</span></td>
      <td style="text-align:center">${p.coordinador||0}</td>
      <td style="text-align:center">${p.comunicador||0}</td>
      <td style="text-align:center">${p.investigador||0}</td>
      <td style="text-align:center">${p['analista de datos']||0}</td>
      <td style="font-size:.8rem;color:#7f8c8d">${fecha}</td>
      <td><button class="btn btn-red" onclick="eliminar('${r.key}')"><i class="fas fa-trash"></i></button></td>
    </tr>`;
  }).join('');
}

function eliminar(key) {
  if (!confirm('¿Eliminar este registro permanentemente?')) return;
  db.ref('estudiantes/' + key).remove();
}

function formarGrupos() {
  const estudiantes = Object.entries(DATA.roles).map(([k,v]) => ({
    key:k, nombre:v.nombre||'—', apellido:v.apellido||'—',
    rolNatural:v.rolNatural||'', puntajes:{...(v.puntajes||{})}
  }));
  if (estudiantes.length < 4) { alert('Se necesitan al menos 4 estudiantes para formar grupos.'); return; }

  const numGrupos = Math.floor(estudiantes.length / 4);
  let sobrantes   = estudiantes.length % 4;

  estudiantes.forEach(e => {
    const sorted = Object.entries(e.puntajes).sort((a,b)=>b[1]-a[1]);
    e.maxPuntaje = sorted[0]?.[1]||0;
    e.segundoRol = sorted[1]?.[0]||'';
    e.tercerRol  = sorted[2]?.[0]||'';
    delete e.rolAsignado;
  });

  let conteo = { coordinador:0, comunicador:0, investigador:0, 'analista de datos':0 };
  ROLES_LIST.forEach(rol => {
    estudiantes.filter(e=>e.rolNatural===rol)
      .sort((a,b)=>b.maxPuntaje-a.maxPuntaje)
      .slice(0, numGrupos)
      .forEach(e=>{ e.rolAsignado=rol; conteo[rol]++; });
  });

  estudiantes.filter(e=>!e.rolAsignado).forEach(e=>{
    for (const rol of [e.segundoRol, e.tercerRol, ...ROLES_LIST]) {
      if (rol && conteo[rol] < numGrupos + (sobrantes>0?1:0)) {
        e.rolAsignado=rol; conteo[rol]++;
        if(sobrantes>0) sobrantes--;
        break;
      }
    }
  });

  const pool = {};
  ROLES_LIST.forEach(r=>pool[r]=[]);
  estudiantes.forEach(e=>{ if(e.rolAsignado) pool[e.rolAsignado].push(e); });
  const nGrupos = Math.min(...ROLES_LIST.map(r=>pool[r].length));

  const grupos = Array.from({length:nGrupos}, (_,i)=>({
    numero: i+1,
    integrantes: ROLES_LIST.map(r=>({...pool[r][i], rolAsignado:r}))
  }));

  const usados   = new Set(grupos.flatMap(g=>g.integrantes.map(m=>m.key)));
  const sinGrupo = estudiantes.filter(e=>!usados.has(e.key));
  estadoGrupos   = { grupos, sinGrupo };
  renderGrupos();
}

function renderGrupos() {
  const { grupos, sinGrupo } = estadoGrupos;

  document.getElementById('grupos-info').innerHTML =
    `<i class="fas fa-info-circle"></i>
     <strong>${grupos.length} grupo(s)</strong> formados con un integrante de cada rol.
     ${sinGrupo.length
       ? ` · <strong style="color:#c05621">${sinGrupo.length} estudiante(s) pendientes</strong>`
       : ' · <strong style="color:#27ae60">✅ Todos los estudiantes tienen grupo.</strong>'}`;

  document.getElementById('grupos-container').innerHTML = grupos.map(g=>`
    <div class="grupo-card" id="grupo-card-${g.numero}">
      <h4><i class="fas fa-users" style="color:#2980b9"></i> Grupo ${g.numero}
        <span style="font-size:.75rem;color:#7f8c8d;font-weight:400"> (${g.integrantes.length} integrantes)</span>
      </h4>
      ${g.integrantes.map(m=>`
        <div class="gm">
          <div class="gm-dot" style="background:${DOT[m.rolAsignado]||'#ccc'}"></div>
          <span class="gm-nombre">${m.nombre} ${m.apellido}</span>
          <span class="gm-rol">${(m.rolAsignado||m.rolNatural||'—').toUpperCase()}</span>
        </div>`).join('')}
    </div>`).join('');

  if (sinGrupo.length) {
    document.getElementById('sin-grupo-wrap').innerHTML = `
      <div class="sin-grupo">
        <h4><i class="fas fa-user-clock"></i> Pendientes de asignar (${sinGrupo.length})</h4>
        ${sinGrupo.map(e=>`
          <div class="sg-item" id="sg-${e.key}">
            <div class="gm-dot" style="background:${DOT[e.rolNatural]||'#ccc'}"></div>
            <span class="gm-nombre"><strong>${e.nombre} ${e.apellido}</strong>
              <small style="color:#7f8c8d"> · ${(e.rolNatural||'—').toUpperCase()}</small>
            </span>
            <select onchange="asignarAGrupo('${e.key}', this.value)"
              style="padding:5px 10px;border:1px solid #ddd;border-radius:6px;font-family:inherit;font-size:.82rem;cursor:pointer;margin-left:10px">
              <option value="">— Asignar a grupo —</option>
              ${estadoGrupos.grupos.map(g=>`<option value="${g.numero}">Grupo ${g.numero}</option>`).join('')}
            </select>
          </div>`).join('')}
      </div>`;
  } else {
    document.getElementById('sin-grupo-wrap').innerHTML = '';
  }

  const sec = document.getElementById('sec-grupos');
  sec.style.display = 'block';
  sec.scrollIntoView({ behavior:'smooth', block:'start' });
}

function asignarAGrupo(estudianteKey, numGrupo) {
  if (!numGrupo) return;
  const num = parseInt(numGrupo);
  const idx = estadoGrupos.sinGrupo.findIndex(e=>e.key===estudianteKey);
  if (idx === -1) return;
  const est   = estadoGrupos.sinGrupo.splice(idx, 1)[0];
  const grupo = estadoGrupos.grupos.find(g=>g.numero===num);
  if (!grupo) return;
  grupo.integrantes.push({ ...est, rolAsignado: est.rolNatural });
  renderGrupos();
}