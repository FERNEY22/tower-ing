/* ===================================================================
   Observatorio Institucional ETITC
   app.js — Lógica común del sitio
   Refactor Paso 3: aligerado, el código específico del Cap. 1 se
   movió a cap-01.js. Las funciones aquí son defensivas: si un
   contenedor esperado no existe en el DOM, simplemente no actúan.
   Esto permite cargar app.js desde index.html y desde cualquier
   cap-XX-slug.html sin errores.
   =================================================================== */

(function(){
  'use strict';

  // ----- Catálogo de capítulos -----
  // status: 'wip' = en desarrollo · 'pending' = pendiente · 'done' = cerrado
  // file: si existe, es el HTML del capítulo. Si no, el item se renderiza sin link.
  const CHAPTERS = [
    { n: 1, slug: 'autoevaluacion',     title: 'Modelo de Autoevaluación Institucional', kind: 'Piloto · plantilla', status: 'wip',     statusLabel: 'En desarrollo', file: 'cap-01-autoevaluacion.html' },
    { n: 2, slug: 'saber-11',            title: 'Saber 11',                                kind: 'Prueba externa',    status: 'wip',     statusLabel: 'En desarrollo', file: 'cap-02-saber-11.html' },
    { n: 3, slug: 'saber-pro',           title: 'Saber TyT / Saber Pro',                   kind: 'Prueba externa',    status: 'wip',     statusLabel: 'En desarrollo', file: 'cap-03-saber-pro.html' },
    { n: 4, slug: 'evaluacion-docente',  title: 'Evaluación docente',                      kind: 'Talento humano',    status: 'wip',     statusLabel: 'En desarrollo', file: 'cap-04-evaluacion-docente.html' },
    { n: 5, slug: 'matricula',           title: 'Matrícula y admisiones',                  kind: 'Indicador',         status: 'wip',     statusLabel: 'En desarrollo', file: 'cap-05-matricula-admisiones.html' },
    { n: 6, slug: 'desercion',           title: 'Deserción y permanencia',                 kind: 'Indicador',         status: 'pending', statusLabel: 'Pendiente',     file: null },
    { n: 7, slug: 'egresados',           title: 'Graduados y egresados',                   kind: 'Indicador',         status: 'pending', statusLabel: 'Pendiente',     file: null },
    { n: 8, slug: 'planta-docente',      title: 'Planta docente',                          kind: 'Talento humano',    status: 'wip',     statusLabel: 'En desarrollo', file: 'cap-08-planta-docente.html' },
  ];

  // ----- Helper: construir el item del índice (link si hay file, span si no) -----
  function chapterLinkHTML(ch){
    const num = String(ch.n).padStart(2,'0');
    const inner = `
      <span class="num tnum">${num}</span>
      <span>
        <span class="ttl">${ch.title}</span>
        <span class="kind">${ch.kind}</span>
      </span>
      <span class="status s-${ch.status}">${ch.statusLabel}</span>`;
    return ch.file
      ? `<a href="${ch.file}">${inner}</a>`
      : `<span class="toc-item-disabled">${inner}</span>`;
  }

  // ----- Inyección del índice (portada) — defensivo -----
  const tocOl = document.getElementById('chapter-toc');
  if(tocOl){
    CHAPTERS.forEach(ch => {
      const li = document.createElement('li');
      li.innerHTML = chapterLinkHTML(ch);
      tocOl.appendChild(li);
    });
  }

  // ----- Footer chapters list — defensivo -----
  const footUl = document.getElementById('footer-chapters');
  if(footUl){
    CHAPTERS.forEach(ch => {
      const li = document.createElement('li');
      const label = `${String(ch.n).padStart(2,'0')} · ${ch.title}`;
      li.innerHTML = ch.file
        ? `<a href="${ch.file}">${label}</a>`
        : `<span class="foot-disabled">${label}</span>`;
      footUl.appendChild(li);
    });
  }

  // ----- Router por hash — defensivo -----
  // Solo opera dentro de index.html, donde existen múltiples .page[data-page]
  // En los archivos cap-XX-slug.html no hay multi-page, así que no actúa.
  function activatePage(pageKey){
    const pages = document.querySelectorAll('.page');
    if(pages.length === 0) return;

    pages.forEach(p => p.classList.remove('is-active'));
    const target = document.querySelector(`.page[data-page="${pageKey}"]`);
    if(target){
      target.classList.add('is-active');
    } else {
      const cover = document.querySelector('.page[data-page="cover"]');
      if(cover) cover.classList.add('is-active');
    }

    // top nav active
    document.querySelectorAll('.topnav a').forEach(a => a.classList.remove('active'));
    const navMap = { 'cover': 'cover', 'about': 'about' };
    const navKey = navMap[pageKey] || 'cover';
    const navEl = document.querySelector(`.topnav a[data-nav="${navKey}"]`);
    if(navEl) navEl.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function parseHash(){
    const h = location.hash.replace(/^#\/?/, '').trim();
    if(!h) return 'cover';
    if(h === 'acerca') return 'about';
    // #capitulos es anchor scroll dentro de la portada — no cambia de página
    if(h === 'capitulos') return 'cover';
    return 'cover';
  }

  if(document.querySelector('.page[data-page="cover"]')){
    window.addEventListener('hashchange', () => activatePage(parseHash()));
    activatePage(parseHash());
  }

})();
