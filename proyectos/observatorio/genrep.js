/* ===================================================================
   Observatorio Institucional ETITC
   genrep.js — Generador de reportes (GenRep)

   Paso 0 · prueba de concepto:
   - Escanea los capítulos listados en CHAPTERS buscando bloques
     marcados con [data-report-block] (atributos data-rb-*).
   - Construye un catálogo, permite seleccionar bloques, los clona
     en un documento previsualizado y lo exporta a PDF con
     window.print() (CSS @media print deja solo el documento).
   - Sin backend. Todo ocurre en el navegador.

   Para sumar capítulos: marcar sus bloques en el HTML y añadir el
   archivo a CHAPTERS. El resto funciona igual.
   =================================================================== */

(function(){
  'use strict';

  // Guard: solo opera en la página del generador.
  const outputEl = document.getElementById('report-output');
  if(!outputEl) return;

  // ----- Capítulos a escanear -----
  const CHAPTERS = [
    { n: '01', title: 'Modelo de Autoevaluación Institucional', file: 'cap-01-autoevaluacion.html' },
    { n: '02', title: 'Saber 11',                                file: 'cap-02-saber-11.html' },
    { n: '03', title: 'Saber TyT / Saber Pro',                   file: 'cap-03-saber-pro.html' },
    { n: '04', title: 'Evaluación docente',                      file: 'cap-04-evaluacion-docente.html' },
    { n: '05', title: 'Matrícula y admisiones',                  file: 'cap-05-matricula-admisiones.html' },
    { n: '06', title: 'Deserción y permanencia',                 file: 'cap-06-desercion-permanencia.html' },
    { n: '07', title: 'Graduados y egresados',                   file: 'cap-07-graduados.html' },
    { n: '08', title: 'Planta docente',                          file: 'cap-08-planta-docente.html' },
  ];

  const TYPE_LABEL = { chart: 'Gráfica', kpi: 'Indicadores', table: 'Tabla' };

  // ----- Estado -----
  const state = {
    blocks: [],          // catálogo: {id,type,chapter,title,source,node}
    selected: [],        // ids en orden de inserción
    template: 'medida',
    openChapters: new Set() // capítulos expandidos en el acordeón
  };

  // ----- Referencias DOM -----
  const catalogEl  = document.getElementById('catalog');
  const catCountEl = document.getElementById('cat-count');
  const bodyEl     = document.getElementById('report-body');
  const coverEl    = document.getElementById('report-cover');
  const selCountEl = document.getElementById('sel-count');
  const pageEstEl  = document.getElementById('page-est');
  const btnPrint   = document.getElementById('btn-print');
  const btnClear   = document.getElementById('btn-clear');
  const tplHint    = document.getElementById('tpl-hint');
  const covInputs  = {
    title:  document.getElementById('cov-title'),
    sub:    document.getElementById('cov-sub'),
    dep:    document.getElementById('cov-dep'),
    author: document.getElementById('cov-author')
  };

  function catalogMessage(html){
    catalogEl.innerHTML = `<p class="cat-msg">${html}</p>`;
  }

  // ----- Carga y escaneo de capítulos -----
  async function loadBlocks(){
    // El fetch() de los capítulos está bloqueado al abrir el archivo
    // directamente (file://). Hay que servir el sitio por HTTP.
    if(location.protocol === 'file:'){
      catCountEl.textContent = '0';
      catalogMessage('⚠️ Abre esta página por <b>HTTP</b>, no como archivo local.<br><br>En la carpeta del proyecto ejecuta:<br><code>python -m http.server 8000</code><br><br>y entra a <code>http://localhost:8000/genrep.html</code>');
      return;
    }

    catalogMessage('Cargando bloques…');
    const errors = [];
    for(const ch of CHAPTERS){
      try{
        const res = await fetch(ch.file);
        if(!res.ok) throw new Error('HTTP ' + res.status);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('[data-report-block]').forEach(el => {
          state.blocks.push({
            id:      el.dataset.rbId,
            type:    el.dataset.rbType || 'chart',
            chapter: el.dataset.rbChapter || ch.n,
            title:   el.dataset.rbTitle || '(sin título)',
            source:  el.dataset.rbSource || '',
            node:    el.cloneNode(true)
          });
        });
      }catch(err){
        console.warn('GenRep: no se pudo cargar', ch.file, err);
        errors.push(ch.file + ' (' + err.message + ')');
      }
    }

    catCountEl.textContent = state.blocks.length;
    if(!state.blocks.length){
      catalogMessage('No se encontraron bloques.' +
        (errors.length ? '<br><br>No se pudo cargar:<br><code>' + errors.join('<br>') + '</code>' : ''));
      return;
    }
    renderCatalog();
    // Reporte sugerido de entrada — el usuario lo ajusta desde aquí.
    applyTemplate('ejecutivo');
  }

  // ----- Catálogo (panel izquierdo) — acordeón por capítulo -----
  function renderCatalog(){
    catalogEl.innerHTML = '';
    CHAPTERS.forEach(ch => {
      const blocks = state.blocks.filter(b => b.chapter === ch.n);
      if(!blocks.length) return;

      const group = document.createElement('div');
      group.className = 'cat-group' + (state.openChapters.has(ch.n) ? ' is-open' : '');

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'cat-group__head';
      head.innerHTML = `
        <span class="cat-group__chev">▸</span>
        <span class="cat-group__ttl">${ch.n} · ${ch.title}</span>
        <span class="cat-group__meta" data-meta="${ch.n}"></span>`;
      head.addEventListener('click', () => {
        const open = group.classList.toggle('is-open');
        if(open) state.openChapters.add(ch.n); else state.openChapters.delete(ch.n);
      });

      const bodyDiv = document.createElement('div');
      bodyDiv.className = 'cat-group__body';
      blocks.forEach(b => {
        const label = document.createElement('label');
        label.className = 'cat-item';
        label.innerHTML = `
          <input type="checkbox" data-id="${b.id}">
          <span class="ci-body">
            <span class="ci-ttl">${b.title}</span>
            <span class="ci-badge t-${b.type}">${TYPE_LABEL[b.type] || b.type}</span>
          </span>`;
        const cb = label.querySelector('input');
        cb.checked = state.selected.includes(b.id);
        cb.addEventListener('change', () => toggle(b.id, cb.checked));
        bodyDiv.appendChild(label);
      });

      group.appendChild(head);
      group.appendChild(bodyDiv);
      catalogEl.appendChild(group);
    });
    updateGroupCounts();
  }

  // Actualiza el contador "seleccionados/total" de cada capítulo.
  function updateGroupCounts(){
    CHAPTERS.forEach(ch => {
      const meta = catalogEl.querySelector(`[data-meta="${ch.n}"]`);
      if(!meta) return;
      const chBlocks = state.blocks.filter(b => b.chapter === ch.n);
      const sel = chBlocks.filter(b => state.selected.includes(b.id)).length;
      meta.textContent = sel ? `${sel}/${chBlocks.length}` : `${chBlocks.length}`;
      meta.classList.toggle('has-sel', sel > 0);
    });
  }

  // ----- Selección -----
  function toggle(id, on){
    if(state.template === 'ficha' && on){
      // Ficha individual: una sola a la vez
      state.selected = [id];
      syncCheckboxes();
    } else if(on){
      if(!state.selected.includes(id)) state.selected.push(id);
    } else {
      state.selected = state.selected.filter(x => x !== id);
    }
    updateGroupCounts();
    renderReport();
  }

  function syncCheckboxes(){
    catalogEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = state.selected.includes(cb.dataset.id);
    });
    updateGroupCounts();
  }

  // ----- Plantillas -----
  const HINTS = {
    medida:    'A la medida — marca manualmente los bloques que quieras incluir.',
    capitulo:  'Por capítulo — incluye todos los bloques del capítulo.',
    ejecutivo: 'Ejecutivo (sugerido) — indicadores + la gráfica clave de cada capítulo. Ajústalo marcando o desmarcando bloques.',
    ficha:     'Ficha individual — un solo bloque por documento. Al elegir otro, se reemplaza.'
  };

  function applyTemplate(tpl){
    state.template = tpl;
    tplHint.textContent = HINTS[tpl] || '';
    document.querySelectorAll('.genrep-templates button').forEach(btn =>
      btn.classList.toggle('is-active', btn.dataset.tpl === tpl));

    if(tpl === 'capitulo'){
      state.selected = state.blocks.map(b => b.id);
    } else if(tpl === 'ejecutivo'){
      const ids = [];
      CHAPTERS.forEach(ch => {
        const blocks = state.blocks.filter(b => b.chapter === ch.n);
        blocks.filter(b => b.type === 'kpi').forEach(b => ids.push(b.id));
        const firstChart = blocks.find(b => b.type === 'chart');
        if(firstChart) ids.push(firstChart.id);
      });
      state.selected = ids;
    } else if(tpl === 'ficha'){
      state.selected = state.selected.slice(0, 1);
    }
    // 'medida' no toca la selección actual

    // Expandir en el acordeón los capítulos que quedaron con selección.
    state.openChapters = new Set(
      CHAPTERS.filter(ch => state.blocks.some(b => b.chapter === ch.n && state.selected.includes(b.id)))
              .map(ch => ch.n)
    );
    renderCatalog();
    renderReport();
  }

  // ----- Render del documento (panel derecho) -----
  function renderCover(){
    const fecha = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });
    const meta = [
      `<span><b>${escapeHtml(covInputs.dep.value || '—')}</b></span>`,
      covInputs.author.value ? `<span>Elaborado por <b>${escapeHtml(covInputs.author.value)}</b></span>` : '',
      `<span>Generado el <b>${fecha}</b></span>`,
      `<span>Observatorio ETITC · v2.0</span>`
    ].filter(Boolean).join('');
    coverEl.innerHTML = `
      <span class="rc-crest">ETITC · Observatorio Institucional</span>
      <h1>${escapeHtml(covInputs.title.value || 'Reporte sin título')}</h1>
      ${covInputs.sub.value ? `<p class="rc-sub">${escapeHtml(covInputs.sub.value)}</p>` : ''}
      <div class="rc-meta">${meta}</div>`;
  }

  function renderReport(){
    renderCover();

    if(!state.selected.length){
      bodyEl.innerHTML = '<p class="report-empty">Selecciona bloques en el panel izquierdo para armar el reporte.</p>';
    } else {
      bodyEl.innerHTML = '';
      state.selected.forEach((id, i) => {
        const b = state.blocks.find(x => x.id === id);
        if(!b) return;
        const wrap = document.createElement('div');
        wrap.className = 'report-block';
        const head = document.createElement('div');
        head.className = 'rb-head';
        head.innerHTML = `<p class="rb-ttl">${b.title}</p><span class="rb-num">Cap. ${b.chapter} · ${String(i+1).padStart(2,'0')}</span>`;
        wrap.appendChild(head);
        wrap.appendChild(b.node.cloneNode(true));
        if(b.source){
          const src = document.createElement('p');
          src.className = 'rb-src';
          src.textContent = 'Fuente · ' + b.source;
          wrap.appendChild(src);
        }
        bodyEl.appendChild(wrap);
      });
    }

    const n = state.selected.length;
    selCountEl.textContent = `${n} ${n === 1 ? 'bloque' : 'bloques'}`;
    btnPrint.disabled = (n === 0);
    estimatePages();
  }

  // Estima cuántas hojas saldrán al imprimir (aprox., A4 a 96 dpi).
  function estimatePages(){
    if(!pageEstEl) return;
    if(!state.selected.length){ pageEstEl.textContent = ''; return; }
    const A4_PX = 1122;
    const pages = Math.max(1, Math.ceil(outputEl.scrollHeight / A4_PX));
    pageEstEl.textContent = `≈ ${pages} ${pages === 1 ? 'hoja' : 'hojas'}`;
  }

  // ----- Utilidades -----
  function escapeHtml(s){
    return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  // ----- Eventos -----
  document.querySelectorAll('.genrep-templates button').forEach(btn =>
    btn.addEventListener('click', () => applyTemplate(btn.dataset.tpl)));

  Object.values(covInputs).forEach(inp => inp.addEventListener('input', renderCover));

  btnClear.addEventListener('click', () => {
    state.selected = [];
    syncCheckboxes();
    renderReport();
  });

  btnPrint.addEventListener('click', () => window.print());

  // ----- Init -----
  renderCover();
  loadBlocks();

})();
