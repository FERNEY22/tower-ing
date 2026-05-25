/* ===================================================================
   Observatorio Institucional ETITC
   cap-06.js — Lógica específica del Capítulo 6 (Deserción y Permanencia)
   Plantilla estructural · sin datos sistematizados aún.
   =================================================================== */

(function(){
  'use strict';

  if(!document.querySelector('.page[data-page="ch6"]')) return;

  const subnavButtons = document.querySelectorAll('.page[data-page="ch6"] .subnav button');
  subnavButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = btn.dataset.sub;
      subnavButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      document.querySelectorAll('.page[data-page="ch6"] .subsection').forEach(s => s.classList.remove('is-active'));
      const target = document.querySelector(`.page[data-page="ch6"] .subsection[data-sub="${sub}"]`);
      if(target){ target.classList.add('is-active'); }

      const top = document.querySelector('.subnav');
      if(top){ window.scrollTo({ top: top.offsetTop, behavior: 'instant' }); }
    });
  });

})();
