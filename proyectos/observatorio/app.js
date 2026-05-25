/* ===================================================================
   Observatorio Institucional ETITC
   app.js — Lógica común del sitio
   Extraído del HTML monolítico para arquitectura por capas.
   Refactor: 25 mayo 2026.

   NOTA: en este paso se mantiene como bloque único. En el Paso 3
   (separación del Cap. 1 a su propio archivo) la lógica específica
   del Cap. 1 — datos de estamentos, factores CNA, gráfico SVG
   comparativo, etc. — se moverá a su propio archivo cap-01.js.
   =================================================================== */

(function(){
  'use strict';

  // ----- Catálogo de capítulos -----
  const CHAPTERS = [
    { n: 1, slug: 'autoevaluacion',     title: 'Modelo de Autoevaluación Institucional', kind: 'Piloto · plantilla', status: 'wip',     statusLabel: 'En desarrollo' },
    { n: 2, slug: 'saber-11',            title: 'Saber 11',                                kind: 'Prueba externa',    status: 'pending', statusLabel: 'Pendiente' },
    { n: 3, slug: 'saber-pro',           title: 'Saber TyT / Saber Pro',                   kind: 'Prueba externa',    status: 'pending', statusLabel: 'Pendiente' },
    { n: 4, slug: 'evaluacion-docente',  title: 'Evaluación docente',                      kind: 'Talento humano',    status: 'pending', statusLabel: 'Pendiente' },
    { n: 5, slug: 'matricula',           title: 'Matrícula y admisiones',                  kind: 'Indicador',         status: 'pending', statusLabel: 'Pendiente' },
    { n: 6, slug: 'desercion',           title: 'Deserción y permanencia',                 kind: 'Indicador',         status: 'pending', statusLabel: 'Pendiente' },
    { n: 7, slug: 'egresados',           title: 'Graduados y egresados',                   kind: 'Indicador',         status: 'pending', statusLabel: 'Pendiente' },
    { n: 8, slug: 'planta-docente',      title: 'Planta docente',                          kind: 'Talento humano',    status: 'pending', statusLabel: 'Pendiente' },
  ];

  // ----- Diagnósticos iniciales por capítulo pendiente -----
  // Cada capítulo declara: descripción, preguntas centrales, fuentes esperadas, calendario
  // Principio: nada se inventa. Si una fuente no se ha confirmado, se marca como tal.
  const CHAPTER_BRIEFS = {
    2: {
      desc: 'Resultados de la prueba Saber 11 de los estudiantes que ingresan a la ETITC. Composición de la cohorte de entrada, dispersión por colegio y municipio, comparación con referentes nacionales por área evaluada.',
      preguntas: [
        '¿Cuál es el perfil de Saber 11 de los estudiantes que ingresan a la ETITC, por programa y año?',
        '¿Cómo se compara el puntaje de ingreso de la ETITC con el promedio nacional en cada área evaluada?',
        '¿Cómo ha evolucionado la cohorte de entrada en los últimos cinco años?',
        '¿Existe correlación entre Saber 11 y permanencia o desempeño en Saber TyT / Pro?',
      ],
      fuentes: [
        { name: 'Resultados Saber 11 individuales',  org: 'ICFES · base nominal por estudiante',      estado: 'explore' },
        { name: 'Agregados Saber 11 institucionales', org: 'ICFES · reporte institucional anual',     estado: 'explore' },
        { name: 'Referentes nacionales y departamentales', org: 'ICFES · informes públicos',          estado: 'confirm' },
        { name: 'Vínculo Saber 11 ↔ matrícula ETITC', org: 'Cruce interno por documento',             estado: 'unknown' },
      ],
      cal: { fecha: 'Por programar', entregas: 'Notebook · tablas · brief · análisis', dependencia: 'Acceso al microdato ICFES' }
    },
    3: {
      desc: 'Resultados de Saber TyT y Saber Pro de los estudiantes ETITC. Valor agregado del paso por la institución (Saber 11 → Saber Pro), comparación con pares y con referentes nacionales por programa académico.',
      preguntas: [
        '¿Cuáles son los resultados de Saber TyT y Saber Pro por programa académico en cada cohorte?',
        '¿Qué valor agregado se observa entre Saber 11 y Saber Pro?',
        '¿Cómo se compara la ETITC con instituciones técnicas y tecnológicas pares?',
        '¿Qué competencias muestran las mayores brechas frente al referente nacional?',
      ],
      fuentes: [
        { name: 'Resultados Saber TyT individuales',  org: 'ICFES · base nominal',                    estado: 'explore' },
        { name: 'Resultados Saber Pro individuales',  org: 'ICFES · base nominal',                    estado: 'explore' },
        { name: 'Reporte institucional Saber Pro',    org: 'ICFES · ya referenciado en Anexo 13',     estado: 'confirm' },
        { name: 'Pares para comparación',             org: 'Selección manual del observatorio',       estado: 'unknown' },
      ],
      cal: { fecha: 'Por programar', entregas: 'Notebook · tablas · brief · análisis', dependencia: 'Decisión sobre conjunto de pares' }
    },
    4: {
      desc: 'Evaluación docente como instrumento de mejora del talento humano académico. Composición del instrumento, resultados agregados por facultad y dedicación, evolución temporal y relación con el modelo de autoevaluación CNA 2022.',
      preguntas: [
        '¿Qué instrumento de evaluación docente se ha aplicado, y cómo ha cambiado en el tiempo?',
        '¿Cuáles son los resultados agregados por facultad, dedicación y categoría?',
        '¿Cómo dialoga la evaluación docente con el factor "Profesores" de la autoevaluación CNA?',
        '¿Qué fracción de la planta docente ha sido evaluada en cada ciclo?',
      ],
      fuentes: [
        { name: 'Resultados evaluación docente',      org: 'Sistema interno ETITC',                   estado: 'unknown' },
        { name: 'Instrumento aplicado por año',       org: 'Vicerrectoría Académica',                 estado: 'unknown' },
        { name: 'Base de profesores activos',         org: 'Talento humano ETITC',                    estado: 'unknown' },
        { name: 'Acuerdo 09 / 2015 — Estatuto de Profesores', org: 'Marco normativo interno',         estado: 'confirm' },
      ],
      cal: { fecha: 'Por programar', entregas: 'Notebook · tablas · brief · análisis', dependencia: 'Disponibilidad de la base de evaluación' }
    },
    5: {
      desc: 'Matrícula y admisiones por programa académico, jornada, modalidad y nivel formativo. Capacidad institucional declarada vs. matrícula efectiva, concentración por programa y demanda histórica.',
      preguntas: [
        '¿Cómo se distribuye la matrícula activa por programa, jornada y modalidad?',
        '¿Cuál es la relación entre cupos ofertados y matrícula efectiva por programa?',
        '¿Cómo ha evolucionado la demanda y la matrícula en los últimos cinco años?',
        '¿Qué programas concentran la mayor parte del crecimiento o decrecimiento?',
      ],
      fuentes: [
        { name: 'Base de matrícula activa por semestre', org: 'Sistema institucional',                estado: 'unknown' },
        { name: 'Admisiones — inscritos y admitidos',    org: 'Oficina de admisiones ETITC',          estado: 'unknown' },
        { name: 'Programas con registro calificado',     org: 'SNIES · MEN',                          estado: 'confirm' },
        { name: 'Histórico de matrícula',                org: 'SNIES · estadísticas de educación superior', estado: 'confirm' },
      ],
      cal: { fecha: 'Por programar', entregas: 'Notebook · tablas · brief · análisis', dependencia: 'Acceso a la base institucional' }
    },
    6: {
      desc: 'Deserción y permanencia estudiantil por programa, momento del ciclo en que ocurre la deserción y comparación con referentes nacionales. Identificación de cohortes con mayor riesgo.',
      preguntas: [
        '¿Cuáles son las tasas de deserción por programa, cohorte y semestre de pérdida?',
        '¿En qué momento del ciclo académico ocurre la mayor parte de la deserción?',
        '¿Cómo se compara la ETITC con instituciones técnicas y tecnológicas pares?',
        '¿Qué factores institucionales correlacionan con mayor o menor permanencia?',
      ],
      fuentes: [
        { name: 'Indicadores de deserción institucionales', org: 'SPADIES · MEN',                     estado: 'confirm' },
        { name: 'Base nominal de matrícula histórica',     org: 'Sistema institucional ETITC',        estado: 'unknown' },
        { name: 'Causales de retiro registradas',          org: 'Registro académico',                 estado: 'unknown' },
        { name: 'Referentes nacionales TyT',               org: 'SPADIES · informes públicos',        estado: 'confirm' },
      ],
      cal: { fecha: 'Por programar', entregas: 'Notebook · tablas · brief · análisis', dependencia: 'Conexión SPADIES + base interna' }
    },
    7: {
      desc: 'Graduados y egresados. Trayectoria post-graduación, vinculación laboral, seguimiento institucional y relación con el factor "Egresados" de la autoevaluación CNA 2022.',
      preguntas: [
        '¿Cuántos egresados ha graduado la ETITC por programa, año y nivel?',
        '¿Qué se sabe sobre su vinculación laboral después del egreso?',
        '¿Existe un instrumento de seguimiento sistemático a egresados?',
        '¿Cómo dialogan estos datos con los resultados del estamento "Egresados" del ciclo CNA 2022?',
      ],
      fuentes: [
        { name: 'Base de graduados por cohorte',        org: 'Registro y control ETITC',              estado: 'unknown' },
        { name: 'Observatorio Laboral OLE',             org: 'MEN · vinculación laboral por programa', estado: 'confirm' },
        { name: 'Encuesta a egresados ENC5',            org: 'Anexo 13 · 1.804 respuestas en 2022',   estado: 'confirm' },
        { name: 'Bolsa de empleo / seguimiento',        org: 'Oficina de egresados ETITC',            estado: 'unknown' },
      ],
      cal: { fecha: 'Por programar', entregas: 'Notebook · tablas · brief · análisis', dependencia: 'Coordinación con oficina de egresados' }
    },
    8: {
      desc: 'Planta docente: composición, dedicación, formación, antigüedad y categoría. Capacidad real de la planta frente a los requerimientos académicos de cada programa.',
      preguntas: [
        '¿Cómo se compone actualmente la planta docente por dedicación, formación y antigüedad?',
        '¿Cuál es la relación entre planta docente y matrícula por programa?',
        '¿Cómo ha cambiado la planta en los últimos cinco años?',
        '¿Qué brechas existen entre planta declarada y necesidades académicas por programa?',
      ],
      fuentes: [
        { name: 'Planta docente activa',                org: 'Talento humano ETITC',                  estado: 'unknown' },
        { name: 'Histórico contractual',                org: 'Talento humano · jurídica',             estado: 'unknown' },
        { name: 'Hojas de vida / formación máxima',     org: 'Talento humano ETITC',                  estado: 'unknown' },
        { name: 'Acuerdo 09 / 2015 — Estatuto de Profesores', org: 'Marco normativo interno',         estado: 'confirm' },
      ],
      cal: { fecha: 'Por programar', entregas: 'Notebook · tablas · brief · análisis', dependencia: 'Acceso a la base de planta' }
    },
  };

  const ESTADO_LABELS = {
    confirm: { lbl: 'Confirmada',         cls: 'p-confirm' },
    explore: { lbl: 'Por explorar',       cls: 'p-explore' },
    unknown: { lbl: 'Sin confirmar',      cls: 'p-unknown' },
    missing: { lbl: 'No identificada',    cls: 'p-missing' },
  };

  // ----- Generar páginas para Caps 2-8 con diagnóstico inicial -----
  const stage = document.getElementById('stage');
  CHAPTERS.filter(c => c.status === 'pending').forEach(ch => {
    const brief = CHAPTER_BRIEFS[ch.n];
    const sec = document.createElement('section');
    sec.className = 'page';
    sec.dataset.page = 'ch' + ch.n;

    const preguntasHtml = brief.preguntas.map(q => `<li><span class="q">${q}</span></li>`).join('');
    const fuentesHtml = brief.fuentes.map(f => {
      const st = ESTADO_LABELS[f.estado];
      return `<tr>
        <td><span class="src-name">${f.name}</span><span class="src-org">${f.org}</span></td>
        <td><span class="pill ${st.cls}">${st.lbl}</span></td>
      </tr>`;
    }).join('');

    sec.innerHTML = `
      <div class="chapter-header">
        <div class="shell">
          <div class="breadcrumb">
            <a href="#/">Observatorio</a>
            <span class="sep">/</span>
            <span>Capítulo ${String(ch.n).padStart(2,'0')}</span>
          </div>
          <div class="row">
            <div>
              <h1 class="ttl">${ch.title}</h1>
              <p class="sub">${ch.kind}</p>
            </div>
            <div class="right-meta">
              CAP. ${String(ch.n).padStart(2,'0')} / 08<br>
              PENDIENTE<br>
              FASE 0
            </div>
          </div>
        </div>
      </div>

      <div class="pending-shell">
        <div class="shell">
          <div class="pending-card">
            <span class="badge">Capítulo pendiente · diagnóstico inicial</span>
            <h2>Qué deberá responder este capítulo</h2>
            <p class="desc">${brief.desc}</p>

            <div class="preguntas-bloque">
              <p class="p-label">Preguntas centrales</p>
              <ol>${preguntasHtml}</ol>
            </div>

            <div class="fuentes-bloque">
              <p class="f-label"><span>Fuentes esperadas</span><span class="meta">${brief.fuentes.length} identificadas</span></p>
              <table>
                <thead>
                  <tr><th style="width: 70%;">Fuente / Origen</th><th>Estado</th></tr>
                </thead>
                <tbody>${fuentesHtml}</tbody>
              </table>
            </div>

            <div class="calendario-bloque">
              <div class="ccell">
                <p class="k">Cuándo</p>
                <p class="v">${brief.cal.fecha}</p>
                <p class="s">Cada capítulo se desarrolla en una sesión dedicada, con su propio chat.</p>
              </div>
              <div class="ccell">
                <p class="k">Entregables</p>
                <p class="v">${brief.cal.entregas}</p>
                <p class="s">Estructura común: Diagnóstico · Historia · Cambios · Estándar.</p>
              </div>
              <div class="ccell">
                <p class="k">Dependencia crítica</p>
                <p class="v">${brief.cal.dependencia}</p>
                <p class="s">Resolver antes de iniciar el chat del capítulo.</p>
              </div>
            </div>
          </div>
        </div>
        <div class="foot-source">
          <div class="shell">
            <span>Fuente · <strong>Plan de Fase 0 · Observatorio Institucional ETITC</strong> · Versión 1.0, mayo 2026</span>
            <span>Diagnóstico inicial</span>
          </div>
        </div>
      </div>
    `;
    stage.appendChild(sec);
  });

  // ----- Inyección del índice (portada) -----
  const tocOl = document.getElementById('chapter-toc');
  CHAPTERS.forEach(ch => {
    const li = document.createElement('li');
    li.innerHTML = `
      <a href="#/capitulo/${ch.n}">
        <span class="num tnum">${String(ch.n).padStart(2,'0')}</span>
        <span>
          <span class="ttl">${ch.title}</span>
          <span class="kind">${ch.kind}</span>
        </span>
        <span class="status s-${ch.status}">${ch.statusLabel}</span>
      </a>`;
    tocOl.appendChild(li);
  });

  // ----- Footer chapters list -----
  const footUl = document.getElementById('footer-chapters');
  CHAPTERS.forEach(ch => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="#/capitulo/${ch.n}">${String(ch.n).padStart(2,'0')} · ${ch.title}</a>`;
    footUl.appendChild(li);
  });

  // ----- Router por hash -----
  function activatePage(pageKey){
    document.querySelectorAll('.page').forEach(p => p.classList.remove('is-active'));
    const target = document.querySelector(`.page[data-page="${pageKey}"]`);
    if(target){ target.classList.add('is-active'); }
    else { document.querySelector('.page[data-page="cover"]').classList.add('is-active'); }

    // top nav active
    document.querySelectorAll('.topnav a').forEach(a => a.classList.remove('active'));
    if(pageKey === 'cover'){ document.querySelector('.topnav a[data-nav="cover"]').classList.add('active'); }
    else if(pageKey === 'about'){ document.querySelector('.topnav a[data-nav="about"]').classList.add('active'); }
    else { document.querySelector('.topnav a[data-nav="ch1"]').classList.add('active'); }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function parseHash(){
    const h = location.hash.replace(/^#\/?/, '').trim();
    if(!h) return 'cover';
    if(h === 'acerca') return 'about';
    const m = h.match(/^capitulo\/(\d+)$/);
    if(m) return 'ch' + m[1];
    return 'cover';
  }

  window.addEventListener('hashchange', () => activatePage(parseHash()));
  activatePage(parseHash());

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
