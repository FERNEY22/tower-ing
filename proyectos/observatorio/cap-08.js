/* ===================================================================
   Observatorio Institucional ETITC
   cap-08.js — Lógica específica del Capítulo 8 (Planta Docente)
   Diferencia con caps 1-3: NO hay iframe Power BI.
   El dashboard es HTML/SVG nativo embebido en el HTML.
   =================================================================== */

(function(){
  'use strict';

  if(!document.querySelector('.page[data-page="ch8"]')) return;

  // ----- Subnav dentro del Cap. 8 -----
  const subnavButtons = document.querySelectorAll('.page[data-page="ch8"] .subnav button');
  subnavButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = btn.dataset.sub;
      subnavButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      document.querySelectorAll('.page[data-page="ch8"] .subsection').forEach(s => s.classList.remove('is-active'));
      const target = document.querySelector(`.page[data-page="ch8"] .subsection[data-sub="${sub}"]`);
      if(target){ target.classList.add('is-active'); }

      const top = document.querySelector('.subnav');
      if(top){ window.scrollTo({ top: top.offsetTop, behavior: 'instant' }); }
    });
  });

})();
