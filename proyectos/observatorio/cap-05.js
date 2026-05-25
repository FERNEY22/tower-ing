/* ===================================================================
   Observatorio Institucional ETITC
   cap-05.js — Lógica específica del Capítulo 5 (Matrícula y Admisiones)
   Dashboard nativo HTML/SVG, sin iframe Power BI.
   =================================================================== */

(function(){
  'use strict';

  if(!document.querySelector('.page[data-page="ch5"]')) return;

  const subnavButtons = document.querySelectorAll('.page[data-page="ch5"] .subnav button');
  subnavButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = btn.dataset.sub;
      subnavButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      document.querySelectorAll('.page[data-page="ch5"] .subsection').forEach(s => s.classList.remove('is-active'));
      const target = document.querySelector(`.page[data-page="ch5"] .subsection[data-sub="${sub}"]`);
      if(target){ target.classList.add('is-active'); }

      const top = document.querySelector('.subnav');
      if(top){ window.scrollTo({ top: top.offsetTop, behavior: 'instant' }); }
    });
  });

})();
