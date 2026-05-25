/* ===================================================================
   Observatorio Institucional ETITC
   cap-03.js — Lógica específica del Capítulo 3 (Saber TyT / Saber Pro)
   Generado en Paso 5 del refactor a partir de cap-template.js.

   Contenido:
   - Subnav de las 5 subsecciones
   - Tabs del dashboard embebido (2 páginas: Resultados generales + Evolución temporal)
   - URL de Publish to Web ya integrada
   =================================================================== */

(function(){
  'use strict';

  if(!document.querySelector('.page[data-page="ch3"]')) return;

  // ----- Subnav dentro del Cap. 3 -----
  const subnavButtons = document.querySelectorAll('.page[data-page="ch3"] .subnav button');
  subnavButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = btn.dataset.sub;
      subnavButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      document.querySelectorAll('.page[data-page="ch3"] .subsection').forEach(s => s.classList.remove('is-active'));
      const target = document.querySelector(`.page[data-page="ch3"] .subsection[data-sub="${sub}"]`);
      if(target){ target.classList.add('is-active'); }

      const top = document.querySelector('.subnav');
      if(top){ window.scrollTo({ top: top.offsetTop, behavior: 'instant' }); }
    });
  });

  // ----- Tabs del dashboard embebido -----
  const DASH_BASE_URL = 'https://app.powerbi.com/view?r=eyJrIjoiODQzNzg1MTgtZDY3MC00NTY5LTk2MmQtNTUwNWIwY2JmNGVkIiwidCI6IjQ5NWZkMDQ2LWQ4NjQtNDY2Ny05ZWU4LTUwNjc5NzY0ZDgzNCIsImMiOjR9';

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

})();
