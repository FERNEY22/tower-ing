/* ===================================================================
   Observatorio Institucional ETITC
   cap-01.js — Lógica específica del Capítulo 1 (Autoevaluación)
   Separado de app.js en el Paso 3 del refactor por capas.

   Contenido:
   - Tabs del dashboard embebido (Power BI)
   - Subnav de subsecciones del Cap. 1
   - Datos reales: cobertura por estamento, características CNA
   - Renders interactivos: barras, gráfico SVG comparativo,
     factores conceptuales expandibles
   =================================================================== */

(function(){
  'use strict';

  // Guard: si los nodos del Cap. 1 no están en el DOM, no hacer nada.
  if(!document.querySelector('.page[data-page="ch1"]')) return;

// ---------- Tabs del dashboard embebido ----------
const DASH_BASE_URL = 'https://app.powerbi.com/view?r=eyJrIjoiNjY5NTYzZTktNWExOC00ZGVlLWIzODUtYzcxYzk2NjU0NDVjIiwidCI6IjQ5NWZkMDQ2LWQ4NjQtNDY2Ny05ZWU4LTUwNjc5NzY0ZDgzNCIsImMiOjR9';


const dashTabs = document.querySelectorAll('.dash-tabs button');
const dashFrame = document.getElementById('dash-frame');

function mountDash(pageName){
  if(!DASH_BASE_URL){ return; } // mantener placeholder si aún no hay URL
  const sep = DASH_BASE_URL.includes('?') ? '&' : '?';
  const url = `${DASH_BASE_URL}${sep}pageName=${encodeURIComponent(pageName)}`;
  dashFrame.innerHTML = `<iframe src="${url}" title="Reporte Power BI — ${pageName}" allowfullscreen loading="lazy"></iframe>`;
}

dashTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    dashTabs.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    mountDash(btn.dataset.pg);
  });
});

// Montaje inicial: la página activa por defecto (Comparativo)
const activeDashBtn = document.querySelector('.dash-tabs button.is-active');
if(activeDashBtn){ mountDash(activeDashBtn.dataset.pg); }





  // ----- Subnav dentro del Cap 1 -----
  const subnavButtons = document.querySelectorAll('.subnav button');
  subnavButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = btn.dataset.sub;
      subnavButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.querySelectorAll('.page[data-page="ch1"] .subsection').forEach(s => s.classList.remove('is-active'));
      const target = document.querySelector(`.page[data-page="ch1"] .subsection[data-sub="${sub}"]`);
      if(target){ target.classList.add('is-active'); }
      // scroll a comienzo del contenido (debajo de subnav sticky)
      const top = document.querySelector('.subnav').getBoundingClientRect().bottom + window.scrollY;
      window.scrollTo({ top: top - 8, behavior: 'smooth' });
    });
  });

  // =============== DATOS REALES — Diagnóstico ===============
  // Encuestados por estamento — ciclo 2022 (fuente: tabla Estamentos, Anexo 13)
  const ESTAMENTOS_COB = [
    { lbl: 'Estudiantes',                       meta: 'ENC3 · Encuesta a Estudiantes',                          n: 2072 },
    { lbl: 'Egresados téc. profesionales',      meta: 'ENC5 · Egresados Tec./Tecnol.',                          n: 1652 },
    { lbl: 'Egresados profesionales',           meta: 'ENC5 · Egresados Profesionales',                         n: 152  },
    { lbl: 'Administrativos',                   meta: 'ENC2 · Encuesta a Administrativos',                      n: 130  },
    { lbl: 'Profesores',                        meta: 'ENC4 · Encuesta a Profesores',                           n: 54   },
    { lbl: 'Directivos',                        meta: 'ENC1 · Encuesta a Directivos',                           n: 11   },
    { lbl: 'Empresarios',                       meta: 'ENC6 · Sector productivo',                               n: 2    },
  ];
  const ESTAMENTOS_PREG = [
    { lbl: 'Estudiantes',                       meta: 'F1, F2, F3, F5, F6, F10, F11, F12',                       n: 39 },
    { lbl: 'Directivos',                        meta: 'F1, F3, F5, F9, F10, F11, F12',                            n: 27 },
    { lbl: 'Egresados profesionales',           meta: 'F1, F2, F5, F11',                                          n: 27 },
    { lbl: 'Egresados téc. profesionales',      meta: 'F1, F2, F5, F11',                                          n: 23 },
    { lbl: 'Profesores',                        meta: 'F3, F9, F10, F11, F12',                                    n: 21 },
    { lbl: 'Administrativos',                   meta: 'F1, F9, F11, F12',                                         n: 8  },
    { lbl: 'Empresarios',                       meta: 'F1, F4, F7, F11, F12',                                     n: 8  },
  ];

  function renderBars(containerId, data, opts){
    const c = document.getElementById(containerId);
    if(!c) return;
    const max = Math.max(...data.map(d => d.n));
    const unit = opts.unit || '';
    const mutedBelow = opts.mutedBelow || 0;
    c.innerHTML = data.map(d => {
      const pct = (d.n / max) * 100;
      const muted = d.n < mutedBelow ? ' muted' : '';
      return `
        <div class="row">
          <div class="lbl">${d.lbl}<span class="meta">${d.meta}</span></div>
          <div class="bar${muted}"><span class="fill" style="width:${pct.toFixed(1)}%"></span></div>
          <div class="val tnum">${d.n.toLocaleString('es-CO')}<span class="unit">${unit}</span></div>
        </div>`;
    }).join('');
  }
  renderBars('bars-cobertura', ESTAMENTOS_COB, { unit: 'encuestados', mutedBelow: 50 });
  renderBars('bars-preguntas', ESTAMENTOS_PREG, { unit: 'preguntas',   mutedBelow: 0  });

  // =============== DATOS REALES — Estándar ===============
  // Distribución de las 38 características por los 12 factores CNA conceptuales
  // Fuente: Caracteristicas_CNA del Anexo 13
  const CARACT_POR_FACTOR = [
    { n: 1,  factor: 'Identidad institucional',                     k: 3 },
    { n: 2,  factor: 'Gobierno institucional y transparencia',      k: 3 },
    { n: 3,  factor: 'Desarrollo, gestión y sostenibilidad',        k: 6 },
    { n: 4,  factor: 'Mejoramiento continuo y autorregulación',     k: 4 },
    { n: 5,  factor: 'Estructura y procesos académicos',            k: 4 },
    { n: 6,  factor: 'Aportes de la investigación y la innovación', k: 2 },
    { n: 7,  factor: 'Impacto social',                              k: 2 },
    { n: 8,  factor: 'Visibilidad nacional e internacional',        k: 2 },
    { n: 9,  factor: 'Bienestar institucional',                     k: 1 },
    { n: 10, factor: 'Comunidad de profesores',                     k: 5 },
    { n: 11, factor: 'Comunidad de estudiantes',                    k: 3 },
    { n: 12, factor: 'Comunidad de egresados',                      k: 3 },
  ];
  (function renderCaract(){
    const c = document.getElementById('bars-caracteristicas');
    if(!c) return;
    const max = Math.max(...CARACT_POR_FACTOR.map(d => d.k));
    c.innerHTML = CARACT_POR_FACTOR.map(d => {
      const pct = (d.k / max) * 100;
      return `<div class="row">
        <div class="num tnum">${String(d.n).padStart(2,'0')}</div>
        <div class="name">${d.factor}</div>
        <div class="b"><span class="f" style="width:${pct.toFixed(1)}%"></span></div>
        <div class="v tnum">${d.k}<span class="sub">caract.</span></div>
      </div>`;
    }).join('');
  })();

  // ===================================================================
  // INTERACTIVIDAD — Ronda 4
  // ===================================================================

  // ---------- 1. DETALLE EXPANDIBLE POR ESTAMENTO ----------
  const ESTAMENTO_FULL = {
    'Estudiantes':                       { factores: ['F01','F02','F03','F05','F06','F10','F11','F12'], factoresLabels: ['Proy. Educativo','Estudiantes','Profesores','Aspectos Acad.','Permanencia','Medios Educativos','Org. y Admin.','Recursos Físicos'], prom: 8.77, aspectos: 30 },
    'Egresados téc. profesionales':      { factores: ['F01','F02','F05','F11'], factoresLabels: ['Proy. Educativo','Estudiantes','Aspectos Acad.','Org. y Admin.'], prom: 8.20, aspectos: 5 },
    'Egresados profesionales':           { factores: ['F01','F02','F05','F11'], factoresLabels: ['Proy. Educativo','Estudiantes','Aspectos Acad.','Org. y Admin.'], prom: 8.20, aspectos: 5 },
    'Administrativos':                   { factores: ['F01','F09','F11','F12'], factoresLabels: ['Proy. Educativo','Bienestar','Org. y Admin.','Recursos Físicos'], prom: 8.26, aspectos: 5 },
    'Profesores':                        { factores: ['F03','F09','F10','F11','F12'], factoresLabels: ['Profesores','Bienestar','Medios Educativos','Org. y Admin.','Recursos Físicos'], prom: 7.92, aspectos: 13 },
    'Directivos':                        { factores: ['F01','F03','F05','F09','F10','F11','F12'], factoresLabels: ['Proy. Educativo','Profesores','Aspectos Acad.','Bienestar','Medios Educativos','Org. y Admin.','Recursos Físicos'], prom: 9.45, aspectos: 16 },
    'Empresarios':                       { factores: ['F01','F04','F07','F11','F12'], factoresLabels: ['Proy. Educativo','Egresados','Interacción Entorno','Org. y Admin.','Recursos Físicos'], prom: 8.50, aspectos: 5 },
  };

  function openEstamento(name, n){
    const data = ESTAMENTO_FULL[name];
    if(!data) return;
    const det = document.getElementById('estamento-detail');
    const fLabels = data.factores.map((f, i) => `<span class="fp" title="${data.factoresLabels[i]}">${f} · ${data.factoresLabels[i]}</span>`).join('');
    let stat = '';
    if(n < 50){ stat = 'Muestra estadísticamente débil — leer como insumo cualitativo.'; }
    else if(n < 200){ stat = 'Muestra moderada — interpretar con prudencia.'; }
    else { stat = 'Muestra estadísticamente representativa.'; }
    det.innerHTML = `
      <div class="dh">
        <h4>${name}</h4>
        <span class="closer" id="close-estamento">Cerrar ×</span>
      </div>
      <div class="dgrid">
        <div class="dcell"><p class="k">Encuestados</p><p class="v">${n.toLocaleString('es-CO')}</p></div>
        <div class="dcell"><p class="k">Preguntas</p><p class="v">${ESTAMENTOS_PREG.find(e=>e.lbl===name).n}</p></div>
        <div class="dcell"><p class="k">Promedio</p><p class="v">${data.prom.toFixed(2)}</p></div>
        <div class="dcell"><p class="k">Aspectos</p><p class="v">${data.aspectos}</p></div>
      </div>
      <p class="note">${stat}</p>
      <p class="k" style="font-family:var(--mono); font-size:10.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--ink-3); margin: 16px 0 8px;">Factores operativos cubiertos</p>
      <div class="factor-pills">${fLabels}</div>
    `;
    det.classList.add('is-open');
    document.getElementById('close-estamento').addEventListener('click', closeEstamento);
  }
  function closeEstamento(){
    document.querySelectorAll('.cov-bars[id="bars-cobertura"] .row').forEach(r => r.classList.remove('is-active'));
    const det = document.getElementById('estamento-detail');
    if(det){ det.classList.remove('is-open'); }
  }

  // Reasignar handlers en cov-bars de cobertura
  (function bindCovBars(){
    const rows = document.querySelectorAll('#bars-cobertura .row');
    rows.forEach((r, i) => {
      r.addEventListener('click', () => {
        const wasActive = r.classList.contains('is-active');
        rows.forEach(x => x.classList.remove('is-active'));
        if(wasActive){ closeEstamento(); return; }
        r.classList.add('is-active');
        const d = ESTAMENTOS_COB[i];
        openEstamento(d.lbl, d.n);
      });
    });
  })();

  // ---------- 2. GRÁFICO SVG COMPARATIVO 2017 vs 2022 ----------
  // Promedios reales por factor (escala original)
  const PROMS = [
    { id17:'F01', id22:'F01', name22:'Proyecto Educativo / Identidad Institucional',          name17:'Misión, Visión, PEI y PEP',              v17: 4.09, v22: 8.95, tipo:'reformulado' },
    { id17:'F02', id22:'F02', name22:'Estudiantes',                                          name17:'Estudiantes',                            v17: 4.10, v22: 8.83, tipo:'conservado'  },
    { id17:'F03', id22:'F03', name22:'Profesores',                                           name17:'Profesores',                             v17: 3.98, v22: 8.55, tipo:'conservado'  },
    { id17:'F09', id22:'F04', name22:'Egresados',                                            name17:'Impacto de los Egresados en el Medio',   v17: 4.00, v22: 8.18, tipo:'reformulado' },
    { id17:'F04', id22:'F05', name22:'Aspectos Académicos y Resultados de Aprendizaje',      name17:'Procesos Académicos',                    v17: 4.13, v22: 8.73, tipo:'reformulado' },
    { id17:null,  id22:'F06', name22:'Permanencia y Graduación',                              name17:null,                                     v17: null, v22: 8.68, tipo:'nuevo'       },
    { id17:'F05', id22:'F07', name22:'Interacción con el Entorno Nacional e Internacional',  name17:'Visibilidad Nacional e Internacional',   v17: 4.00, v22: 8.58, tipo:'reformulado' },
    { id17:'F06', id22:'F08', name22:'Aportes de Investigación, Innovación y Creación',      name17:'Investigación, Innovación y Creación A.', v17: 4.00, v22: 8.65, tipo:'reformulado' },
    { id17:'F07', id22:'F09', name22:'Bienestar de la Comunidad Académica del Programa',     name17:'Bienestar Institucional',                v17: 4.10, v22: 8.78, tipo:'reformulado' },
    { id17:null,  id22:'F10', name22:'Medios Educativos y Ambientes de Aprendizaje',         name17:null,                                     v17: null, v22: 8.60, tipo:'nuevo'       },
    { id17:'F08', id22:'F11', name22:'Organización, Administración y Financiación',          name17:'Organización, Administración y Gestión', v17: 4.13, v22: 8.73, tipo:'reformulado' },
    { id17:'F10', id22:'F12', name22:'Recursos Físicos y Tecnológicos',                      name17:'Recursos Físicos y Financieros',         v17: 4.03, v22: 8.88, tipo:'reformulado' },
  ];

  function renderPromedios(){
    const container = document.getElementById('chart-promedios');
    if(!container) return;
    const W = 1100, H = PROMS.length * 56 + 60;
    const padL = 360, padR = 80, padT = 30, padB = 30;
    const plotW = W - padL - padR;
    const scaleX = v => padL + (v / 10) * plotW;
    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`;

    // Grid + ticks 0..10
    for(let i=0; i<=10; i+=2){
      const x = scaleX(i);
      svg += `<line class="grid-line" x1="${x}" y1="${padT}" x2="${x}" y2="${H-padB}"/>`;
      svg += `<text class="tick-label" x="${x}" y="${padT - 8}" text-anchor="middle">${i}</text>`;
      svg += `<text class="tick-label" x="${x}" y="${H - padB + 14}" text-anchor="middle">${i}</text>`;
    }
    // Eje
    svg += `<line class="axis-line" x1="${padL}" y1="${padT}" x2="${padL}" y2="${H-padB}"/>`;

    PROMS.forEach((d, i) => {
      const y = padT + i * 56 + 28;
      const rowY = padT + i * 56;
      // Row background (para hover)
      svg += `<g class="group" data-i="${i}">`;
      svg += `<rect class="row-bg" x="0" y="${rowY}" width="${W}" height="56"/>`;
      // Label
      const lblClass = d.tipo === 'nuevo' ? 'factor-label new' : 'factor-label';
      const lblTxt = d.name22.length > 48 ? d.name22.substring(0, 47) + '…' : d.name22;
      svg += `<text class="${lblClass}" x="${padL - 12}" y="${y + 5}" text-anchor="end">${lblTxt}</text>`;
      // 2017 bar (normalizada × 2)
      if(d.v17 !== null){
        const v17n = d.v17 * 2;
        const x17 = scaleX(v17n);
        svg += `<rect class="bar-17" x="${padL}" y="${y - 18}" width="${x17 - padL}" height="14"/>`;
        svg += `<text class="value-label" x="${x17 + 6}" y="${y - 7}">${v17n.toFixed(2)}</text>`;
      }
      // 2022 bar
      const x22 = scaleX(d.v22);
      svg += `<rect class="bar-22" x="${padL}" y="${y + 2}" width="${x22 - padL}" height="14"/>`;
      svg += `<text class="value-label" x="${x22 + 6}" y="${y + 13}">${d.v22.toFixed(2)}</text>`;
      svg += `</g>`;
    });

    svg += `</svg>`;
    container.innerHTML = svg + `<div class="svg-tt" id="svg-tt"></div>`;

    // Interactividad: tooltip on hover
    const tt = document.getElementById('svg-tt');
    container.querySelectorAll('g.group').forEach((g, idx) => {
      const d = PROMS[idx];
      g.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + 14;
        const y = e.clientY - rect.top + 14;
        let html = `<p class="tt-title">${d.name22}</p>`;
        if(d.v17 !== null){
          html += `<div class="tt-row"><span class="yr">2017 · "${d.name17}"</span><span class="val">${d.v17.toFixed(2)} / 5</span></div>`;
          html += `<div class="tt-row"><span class="yr">2017 · normalizado</span><span class="val">${(d.v17*2).toFixed(2)} / 10</span></div>`;
        } else {
          html += `<div class="tt-row"><span class="yr">2017</span><span class="val">— sin equivalente</span></div>`;
        }
        html += `<div class="tt-row"><span class="yr">2022 · Global</span><span class="val">${d.v22.toFixed(2)} / 10</span></div>`;
        if(d.v17 !== null){
          const delta = d.v22 - (d.v17 * 2);
          const sign = delta >= 0 ? '+' : '';
          html += `<div class="tt-row"><span class="yr">Δ normalizado</span><span class="val">${sign}${delta.toFixed(2)}</span></div>`;
        }
        const tipoTxt = { conservado: 'Factor conservado', reformulado: 'Factor reformulado', nuevo: 'Factor nuevo en 2022' }[d.tipo];
        html += `<div class="tt-foot">${tipoTxt}</div>`;
        tt.innerHTML = html;
        tt.style.left = Math.min(x, container.offsetWidth - 300) + 'px';
        tt.style.top  = Math.min(y, container.offsetHeight - 200) + 'px';
        tt.classList.add('is-visible');
      });
      g.addEventListener('mouseleave', () => tt.classList.remove('is-visible'));
    });
  }
  renderPromedios();

  // ---------- 3. FACTORES CONCEPTUALES EXPANDIBLES (Estándar) ----------
  // 38 características CNA reales — Fuente: Caracteristicas_CNA del Anexo 13
  const CARACTERISTICAS_CNA = {
    1: ['Coherencia y pertinencia de la Misión', 'Orientaciones y estrategias del PEI', 'Formación integral y construcción de identidad'],
    2: ['Buen Gobierno y máximo órgano de Gobierno', 'Relación con grupos de interés', 'Rendición de cuentas'],
    3: ['Administración y gestión', 'Procesos de comunicación', 'Capacidad de gestión', 'Recursos de apoyo académico', 'Desarrollo profesoral', 'Recursos y gestión financiera'],
    4: ['Cultura de la Autoevaluación', 'Procesos de autorregulación', 'Sistema interno de aseguramiento de la calidad', 'Evaluación de Directivas, Profesores y Personal Administrativo'],
    5: ['Componentes formativos', 'Componentes pedagógicos y de evaluación', 'Componente de interacción y relevancia social', 'Procesos de creación, modificación y ampliación de programas'],
    6: ['Formación para la investigación, creación e innovación', 'Investigación, desarrollo tecnológico, innovación y creación'],
    7: ['Institución y entorno', 'Impacto cultural y artístico'],
    8: ['Inserción en contextos académicos nacionales e internacionales', 'Relaciones externas de profesores y estudiantes'],
    9: ['Estructura y funcionamiento del Bienestar Institucional'],
    10:['Derechos y deberes de los profesores', 'Planta profesoral', 'Trayectoria profesoral', 'Desarrollo profesoral', 'Interacción académica de los profesores'],
    11:['Derechos y deberes de los estudiantes', 'Admisión y permanencia de estudiantes', 'Estímulos y apoyos para estudiantes'],
    12:['Seguimiento a egresados', 'Egresados y programas académicos', 'Relación de los egresados con la Institución'],
  };
  const FACTORES_CONCEPTUALES = [
    [1,  'Identidad institucional'],
    [2,  'Gobierno institucional y transparencia'],
    [3,  'Desarrollo, gestión y sostenibilidad'],
    [4,  'Mejoramiento continuo y autorregulación'],
    [5,  'Estructura y procesos académicos'],
    [6,  'Aportes de la investigación y la innovación'],
    [7,  'Impacto social'],
    [8,  'Visibilidad nacional e internacional'],
    [9,  'Bienestar institucional'],
    [10, 'Comunidad de profesores'],
    [11, 'Comunidad de estudiantes'],
    [12, 'Comunidad de egresados'],
  ];

  (function renderFactoresConceptuales(){
    const ol = document.getElementById('factores-conceptuales');
    if(!ol) return;
    ol.innerHTML = FACTORES_CONCEPTUALES.map(([n, name]) => {
      const cars = CARACTERISTICAS_CNA[n] || [];
      const carsHtml = cars.map((c, i) => `<li><span class="ord">${String(i+1).padStart(2,'0')}</span>${c}</li>`).join('');
      return `<li data-fid="${n}">
        <span class="n tnum">${String(n).padStart(2,'0')}</span>
        <span class="t">${name}<span class="chev">›</span></span>
        <div class="expand">
          <p class="ehd">${cars.length} característica${cars.length>1?'s':''} CNA · factor ${String(n).padStart(2,'0')}</p>
          <ul>${carsHtml}</ul>
        </div>
      </li>`;
    }).join('');

    // Toggle expand
    ol.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = li.classList.contains('is-open');
        ol.querySelectorAll('li').forEach(x => x.classList.remove('is-open'));
        if(!wasOpen) li.classList.add('is-open');
      });
    });
  })();


})();
