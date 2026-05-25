/* ===================================================================
   Observatorio Institucional ETITC
   cap-XX.js — Lógica específica del Capítulo [[CAP_NUM]] ([[CAP_TITLE]])
   Plantilla generada en Paso 4 del refactor.

   Contenido típico:
   - Tabs del dashboard embebido (si el capítulo tiene Power BI)
   - Subnav de subsecciones (siempre presente)
   - Datos específicos del capítulo y renders interactivos
   =================================================================== */

(function(){
  'use strict';

  // Guard: si la página del capítulo no está en el DOM, salir sin hacer nada.
  // Permite cargar este JS desde otros archivos sin romper.
  if(!document.querySelector('.page[data-page="[[CAP_DATA_PAGE]]"]')) return;

  // ----- Subnav dentro del Cap. [[CAP_NUM]] -----
  // Navegación entre las 5 subsecciones (Diagnóstico/Historia/Cambios/Dashboard/Estándar)
  const subnavButtons = document.querySelectorAll('.page[data-page="[[CAP_DATA_PAGE]]"] .subnav button');
  subnavButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = btn.dataset.sub;
      subnavButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      document.querySelectorAll('.page[data-page="[[CAP_DATA_PAGE]]"] .subsection').forEach(s => s.classList.remove('is-active'));
      const target = document.querySelector(`.page[data-page="[[CAP_DATA_PAGE]]"] .subsection[data-sub="${sub}"]`);
      if(target){ target.classList.add('is-active'); }

      const top = document.querySelector('.subnav');
      if(top){ window.scrollTo({ top: top.offsetTop, behavior: 'instant' }); }
    });
  });

  // ----- Tabs del dashboard embebido -----
  // Cuando tengas la URL de Publish to Web de tu .pbix, descomentá y
  // reemplazá el null por la URL completa:
  //   'https://app.powerbi.com/view?r=...'
  const DASH_BASE_URL = null;

  const dashTabs = document.querySelectorAll('.dash-tabs button');
  const dashFrame = document.getElementById('dash-frame');

  function mountDash(pageName){
    if(!DASH_BASE_URL || !dashFrame){ return; }
    const sep = DASH_BASE_URL.includes('?') ? '&' : '?';
    const url = `${DASH_BASE_URL}${sep}pageName=${encodeURIComponent(pageName)}`;
    dashFrame.innerHTML = `<iframe src="${url}" title="Reporte Power BI — ${pageName}" allowfullscreen loading="lazy"></iframe>`;
  }

  if(dashTabs.length > 0){
    dashTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        dashTabs.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        mountDash(btn.dataset.pg);
      });
    });

    const activeDashBtn = document.querySelector('.dash-tabs button.is-active');
    if(activeDashBtn){ mountDash(activeDashBtn.dataset.pg); }
  }

  // ----- Aquí van los renders específicos del Cap. [[CAP_NUM]] -----
  // Por ejemplo: datos reales, gráficos SVG personalizados, tablas dinámicas, etc.
  // Mirar cap-01.js como referencia de patrones disponibles.

})();
