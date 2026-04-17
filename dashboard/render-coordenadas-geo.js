// ═══════════════════════════════════════════════════════════════════════
// render-coordenadas-geo.js
// Dashboard — Quiz Sistemas de Coordenadas (Tecnologías Geoespaciales)
// Nodo Firebase: quizzes/coordenadas_geo/{cedula}/intento_N
// Banco 25 · 10 preguntas por intento · Máx 2 intentos · Puntaje /10
// ═══════════════════════════════════════════════════════════════════════

// ── Filtro por rango de fechas (estado y handlers) ──────────────────────
// Se expone en window para que los onclick del HTML los encuentren.
window.FILTRO_CG = window.FILTRO_CG || { desde: null, hasta: null };

window.aplicarFiltroCG = function () {
  const d = document.getElementById('cg-filtro-desde').value;
  const h = document.getElementById('cg-filtro-hasta').value;
  // datetime-local entrega formato "YYYY-MM-DDTHH:MM" que new Date() interpreta
  // como hora local del navegador — exactamente lo que queremos.
  window.FILTRO_CG.desde = d ? new Date(d).getTime() : null;
  window.FILTRO_CG.hasta = h ? new Date(h).getTime() : null;
  if (typeof renderCoordenadasGeo === 'function') renderCoordenadasGeo();
};

window.limpiarFiltroCG = function () {
  document.getElementById('cg-filtro-desde').value = '';
  document.getElementById('cg-filtro-hasta').value = '';
  window.FILTRO_CG = { desde: null, hasta: null };
  if (typeof renderCoordenadasGeo === 'function') renderCoordenadasGeo();
};

// ═══════════════════════════════════════════════════════════════════════

function renderCoordenadasGeo() {
  try {

    // ── 1. Datos ────────────────────────────────────────────────────────
    const raw   = DATA.coordenadasGeo || {};
    const nodes = Object.values(raw);

    // ── 2. Sin datos ────────────────────────────────────────────────────
    if (nodes.length === 0) {
      document.getElementById('cg-total').textContent        = '0';
      document.getElementById('cg-promedio').textContent     = '—';
      document.getElementById('cg-aprobados').textContent    = '0';
      document.getElementById('cg-proceso').textContent      = '0';
      document.getElementById('cg-riesgo').textContent       = '0';
      document.getElementById('cg-dos-intentos').textContent = '0';
      document.getElementById('cg-tabla-body').innerHTML =
        '<tr><td colspan="12" class="empty-td">Sin respuestas registradas aún.</td></tr>';
      return;
    }

    // ── 3. Extraer mejor intento por estudiante ─────────────────────────
    function extraerMejor(node) {
      if (node.intento_1) {
        const i1 = node.intento_1;
        const i2 = node.intento_2 || null;
        const nIntentos = node.total_intentos || (i2 ? 2 : 1);
        const mejor = (i2 && i2.puntaje > i1.puntaje) ? i2 : i1;
        return { ...mejor, nIntentos };
      }
      // fallback: estructura plana
      if (node.nombre && node.puntaje !== undefined) {
        return { ...node, nIntentos: 1 };
      }
      return null;
    }

    const estudiantes = nodes.map(node => {
      const d = extraerMejor(node);
      if (!d) return null;

      // ── Normalizar puntaje a escala /10 ─────────────────────────────
      // Versiones antiguas del quiz podían guardar puntaje sobre 100
      // (y a veces total:100, a veces total:10 con puntaje desbordado).
      // Forzamos siempre escala [0, 10].
      let puntajeRaw = Number(d.puntaje) || 0;
      let totalRaw   = Number(d.total)   || 10;
      if (totalRaw > 10 && totalRaw > 0) {
        // total en escala >10 → reescalar puntaje proporcionalmente
        puntajeRaw = Math.round(puntajeRaw * 10 / totalRaw);
      } else if (puntajeRaw > 10) {
        // total correcto pero puntaje desbordado → asumir que venía sobre 100
        puntajeRaw = Math.round(puntajeRaw / 10);
      }
      // Capar en el rango válido
      puntajeRaw = Math.max(0, Math.min(10, puntajeRaw));

      return {
        nombre:         d.nombre         || '—',
        identificacion: d.identificacion || d.cedula || '—',
        programa:       d.programa       || '—',
        puntaje:        puntajeRaw,
        total:          10,
        escalas:        Number(d.escalas_puntaje)       || 0,
        coordenadas:    Number(d.coordenadas_puntaje)   || 0,
        distancias:     Number(d.distancias_puntaje)    || 0,
        nortes:         Number(d.nortes_puntaje)        || 0,
        escalasTot:     Number(d.escalas_total)         || 0,
        coordenadasTot: Number(d.coordenadas_total)     || 0,
        distanciasTot:  Number(d.distancias_total)      || 0,
        nortesTot:      Number(d.nortes_total)          || 0,
        terminadoPor:   d.terminado_por  || 'submit',
        timestamp:      d.timestamp      || '',
        nIntentos:      d.nIntentos      || 1,
        preguntas:      Array.isArray(d.preguntas) ? d.preguntas : []
      };
    }).filter(Boolean);

    const n = estudiantes.length;

    if (n === 0) {
      document.getElementById('cg-tabla-body').innerHTML =
        '<tr><td colspan="12" class="empty-td">Datos en Firebase pero estructura no reconocida. Revisa la consola.</td></tr>';
      return;
    }

    // ── 3b. Filtro por rango de fechas (estado global) ──────────────────
    const filtro = window.FILTRO_CG || { desde: null, hasta: null };
    const estudiantesFiltrados = estudiantes.filter(e => {
      const ts = Number(e.timestamp) || 0;
      if (filtro.desde && ts < filtro.desde) return false;
      if (filtro.hasta && ts > filtro.hasta) return false;
      return true;
    });

    // Indicador de filtro activo
    const estadoEl = document.getElementById('cg-filtro-estado');
    if (estadoEl) {
      if (filtro.desde || filtro.hasta) {
        const fmt = ts => new Date(ts).toLocaleString('es-CO',
          { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
        const d = filtro.desde ? fmt(filtro.desde) : '—';
        const h = filtro.hasta ? fmt(filtro.hasta) : '—';
        estadoEl.innerHTML = `<i class="fas fa-check-circle" style="color:#27ae60"></i> Filtro activo: <strong>${d}</strong> a <strong>${h}</strong> · ${estudiantesFiltrados.length} de ${estudiantes.length} registros`;
      } else {
        estadoEl.textContent = `Mostrando los ${estudiantes.length} registros`;
      }
    }

    // Si el filtro deja 0 registros, limpiar KPIs/tabla y salir
    if (estudiantesFiltrados.length === 0) {
      document.getElementById('cg-total').textContent        = '0';
      document.getElementById('cg-promedio').textContent     = '—';
      document.getElementById('cg-aprobados').textContent    = '0';
      document.getElementById('cg-proceso').textContent      = '0';
      document.getElementById('cg-riesgo').textContent       = '0';
      document.getElementById('cg-dos-intentos').textContent = '0';
      document.getElementById('cg-tabla-body').innerHTML =
        '<tr><td colspan="12" class="empty-td">No hay registros en el rango de fechas seleccionado.</td></tr>';
      // Destruir gráficos viejos si existen
      ['cg-chart-niveles','cg-chart-hist','cg-chart-temas','cg-chart-preguntas'].forEach(id => {
        if (window.CHARTS && window.CHARTS[id]) { window.CHARTS[id].destroy(); delete window.CHARTS[id]; }
      });
      return;
    }

    // A partir de aquí todos los cálculos usan el subconjunto filtrado
    const lista = estudiantesFiltrados;

    // ── 4. Acumuladores (sobre la lista filtrada) ───────────────────────
    let sumaPuntaje=0, aprobados=0, proceso=0, riesgo=0, dosIntentos=0;
    let sumaEsc=0, sumaCoord=0, sumaDist=0, sumaNor=0;
    let totEsc=0,  totCoord=0,  totDist=0,  totNor=0;
    const histPuntaje = Array(11).fill(0);
    const qAciertos   = {};
    const nLista = lista.length;

    lista.forEach(e => {
      sumaPuntaje += e.puntaje;
      sumaEsc     += e.escalas;     totEsc   += e.escalasTot;
      sumaCoord   += e.coordenadas; totCoord += e.coordenadasTot;
      sumaDist    += e.distancias;  totDist  += e.distanciasTot;
      sumaNor     += e.nortes;      totNor   += e.nortesTot;

      if (e.puntaje >= 0 && e.puntaje <= 10) histPuntaje[e.puntaje]++;
      if (e.nIntentos >= 2) dosIntentos++;
      if      (e.puntaje >= 6) aprobados++;
      else if (e.puntaje >= 4) proceso++;
      else                      riesgo++;

      e.preguntas.forEach(p => {
        if (!p || p.id === undefined) return;
        if (!qAciertos[p.id]) qAciertos[p.id] = { ok: 0, total: 0, tema: p.tema || '—' };
        qAciertos[p.id].total++;
        if (p.acerto) qAciertos[p.id].ok++;
      });
    });

    const promedio = (sumaPuntaje / nLista).toFixed(1);

    // % acierto por tema (agregado, sobre el total de veces que ese tema apareció)
    const pctEsc   = totEsc   ? (sumaEsc   / totEsc   * 100) : 0;
    const pctCoord = totCoord ? (sumaCoord / totCoord * 100) : 0;
    const pctDist  = totDist  ? (sumaDist  / totDist  * 100) : 0;
    const pctNor   = totNor   ? (sumaNor   / totNor   * 100) : 0;

    // ── 5. KPIs ─────────────────────────────────────────────────────────
    document.getElementById('cg-total').textContent        = nLista;
    document.getElementById('cg-promedio').textContent     = `${promedio}/10`;
    document.getElementById('cg-aprobados').textContent    = aprobados;
    document.getElementById('cg-proceso').textContent      = proceso;
    document.getElementById('cg-riesgo').textContent       = riesgo;
    document.getElementById('cg-dos-intentos').textContent = dosIntentos;

    // ── 6. Doughnut niveles ──────────────────────────────────────────────
    crearChart('cg-chart-niveles', 'doughnut', {
      labels: ['Aprobado ≥6', 'En proceso 4–5', 'En riesgo ≤3'],
      datasets: [{
        data: [aprobados, proceso, riesgo],
        backgroundColor: ['#27ae60', '#e67e22', '#e74c3c'],
        borderWidth: 2, borderColor: '#fff'
      }]
    }, {
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 16 } },
        title:  { display: true, text: 'Distribución de niveles', font: { size: 13 } }
      }
    });

    // ── 7. Histograma de puntajes ────────────────────────────────────────
    crearChart('cg-chart-hist', 'bar', {
      labels: ['0','1','2','3','4','5','6','7','8','9','10'],
      datasets: [{
        label: 'Estudiantes',
        data: histPuntaje,
        backgroundColor: histPuntaje.map((_,i) =>
          i >= 6 ? 'rgba(39,174,96,.75)' : i >= 4 ? 'rgba(230,126,34,.75)' : 'rgba(231,76,60,.75)'
        ),
        borderRadius: 4
      }]
    }, {
      plugins: {
        legend: { display: false },
        title:  { display: true, text: 'Histograma de puntajes (mejor intento)', font: { size: 13 } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'N° estudiantes' } },
        x: { title: { display: true, text: 'Puntaje sobre 10' } }
      }
    });

    // ── 8. % acierto por tema (4 bloques) ────────────────────────────────
    const hayDatosTemas = (totEsc + totCoord + totDist + totNor) > 0;
    const canvasTemas = document.getElementById('cg-chart-temas');
    if (!hayDatosTemas && canvasTemas) {
      // No hay datos por bloque (intentos viejos sin desglose)
      const parent = canvasTemas.parentElement;
      parent.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#7f8c8d;font-size:.95rem;text-align:center;padding:2rem">' +
        'Aún no hay intentos con desglose por bloque temático.<br>' +
        '<small>Los nuevos intentos realizados con la versión actual del quiz alimentarán este gráfico.</small></div>';
    } else {
      // Paleta de 3 niveles: <50% rojo, 50-74% amarillo, ≥75% verde
      const colorNivel = p =>
        p >= 75 ? 'rgba(39,174,96,.85)'    :   // verde
        p >= 50 ? 'rgba(230,126,34,.85)'   :   // amarillo/naranja
                  'rgba(231,76,60,.85)';       // rojo

      crearChart('cg-chart-temas', 'bar', {
        labels: ['Escalas', 'Coordenadas Colombia', 'Distancias', 'Nortes'],
        datasets: [{
          label: '% acierto',
          data: [pctEsc.toFixed(1), pctCoord.toFixed(1), pctDist.toFixed(1), pctNor.toFixed(1)],
          backgroundColor: [
            colorNivel(pctEsc),
            colorNivel(pctCoord),
            colorNivel(pctDist),
            colorNivel(pctNor)
          ],
          borderRadius: 4
        }]
      }, {
        plugins: {
          legend: { display: false },
          title:  { display: true, text: '% de acierto por bloque temático', font: { size: 13 } },
          tooltip: { callbacks: {
            label: ctx => {
              const sumas = [sumaEsc, sumaCoord, sumaDist, sumaNor];
              const tots  = [totEsc,  totCoord,  totDist,  totNor];
              return ` ${ctx.parsed.y}% (${sumas[ctx.dataIndex]}/${tots[ctx.dataIndex]})`;
            }
          }}
        },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' },
               title: { display: true, text: '% acierto' } }
        }
      });
    }

    // ── 9. % acierto por pregunta del banco ──────────────────────────────
    const qIds    = Object.keys(qAciertos).sort((a, b) => +a - +b);
    const qLabels = qIds.map(id => `P${id}`);
    const qData   = qIds.map(id => {
      const { ok, total } = qAciertos[id];
      return total ? Math.round((ok / total) * 100) : 0;
    });

    const canvasPreg = document.getElementById('cg-chart-preguntas');
    if (qIds.length === 0 && canvasPreg) {
      const parent = canvasPreg.parentElement;
      parent.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#7f8c8d;font-size:.95rem;text-align:center;padding:2rem">' +
        'Aún no hay intentos con detalle por pregunta.<br>' +
        '<small>Los nuevos intentos realizados con la versión actual del quiz alimentarán este gráfico.</small></div>';
    } else if (qIds.length > 0) {
      // Paleta de 3 niveles (misma del gráfico de bloques)
      const colorNivelQ = p =>
        p >= 75 ? 'rgba(39,174,96,.85)'    :
        p >= 50 ? 'rgba(230,126,34,.85)'   :
                  'rgba(231,76,60,.85)';

      crearChart('cg-chart-preguntas', 'bar', {
        labels: qLabels,
        datasets: [{
          label: '% Acierto',
          data: qData,
          backgroundColor: qData.map(colorNivelQ),
          borderRadius: 3
        }]
      }, {
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          title:  { display: true, text: '% de acierto por pregunta (ID del banco)', font: { size: 13 } },
          tooltip: { callbacks: {
            label: ctx => {
              const id = qIds[ctx.dataIndex];
              const q = qAciertos[id];
              return ` ${ctx.parsed.x}% (${q.ok}/${q.total}) — ${q.tema}`;
            }
          }}
        },
        scales: {
          x: { beginAtZero: true, max: 100,
               title: { display: true, text: '% Acierto' },
               ticks: { callback: v => v + '%' } }
        }
      });
    }

    // ── 10. Tabla individual ─────────────────────────────────────────────
    const sorted = [...lista].sort((a, b) => b.puntaje - a.puntaje);

    const nivelbadge = p => {
      if (p >= 6) return '<span class="b-listo">Aprobado</span>';
      if (p >= 4) return '<span class="b-sel">En proceso</span>';
      return '<span class="b-comp">En riesgo</span>';
    };
    const terminoBadge = t => {
      if (t === 'submit')         return '✔ Entregado';
      if (t === 'tiempo')         return '⏱ Tiempo';
      if (t === 'cambio_pestana') return '⚠ Cambio vent.';
      return t || '—';
    };
    const color   = p  => p >= 6 ? '#27ae60' : p >= 4 ? '#e67e22' : '#e74c3c';
    const fmtDate = ts => {
      try { return ts ? new Date(ts).toLocaleDateString('es-CO', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'; }
      catch(e) { return ts || '—'; }
    };
    const miniCell = (ok, tot) =>
      tot ? `<span style="color:${ok === tot ? '#27ae60' : ok > 0 ? '#e67e22' : '#e74c3c'}">${ok}/${tot}</span>`
          : '<span style="color:#bbb">—</span>';

    document.getElementById('cg-tabla-body').innerHTML = sorted.map((e, i) => {
      const pct = Math.round((e.puntaje / (e.total || 10)) * 100);
      return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${e.nombre}</strong></td>
          <td style="font-family:monospace;font-size:.82rem;text-align:center">${e.identificacion}</td>
          <td>
            <div style="display:flex;align-items:center;gap:.5rem;">
              <div style="flex:1;background:#eee;border-radius:4px;height:8px;overflow:hidden;min-width:60px">
                <div style="width:${pct}%;height:100%;background:${color(e.puntaje)};border-radius:4px"></div>
              </div>
              <span style="font-weight:600;color:${color(e.puntaje)};white-space:nowrap">${e.puntaje}/${e.total}</span>
            </div>
          </td>
          <td style="text-align:center;font-size:.82rem">${miniCell(e.escalas, e.escalasTot)}</td>
          <td style="text-align:center;font-size:.82rem">${miniCell(e.coordenadas, e.coordenadasTot)}</td>
          <td style="text-align:center;font-size:.82rem">${miniCell(e.distancias, e.distanciasTot)}</td>
          <td style="text-align:center;font-size:.82rem">${miniCell(e.nortes, e.nortesTot)}</td>
          <td style="text-align:center">${nivelbadge(e.puntaje)}</td>
          <td style="text-align:center;font-size:.82rem">${e.nIntentos}</td>
          <td style="text-align:center;font-size:.8rem;white-space:nowrap">${terminoBadge(e.terminadoPor)}</td>
          <td style="font-size:.78rem;color:#666">${fmtDate(e.timestamp)}</td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('renderCoordenadasGeo error:', err);
    const tb = document.getElementById('cg-tabla-body');
    if (tb) tb.innerHTML = `<tr><td colspan="12" class="empty-td">Error al procesar datos: ${err.message}</td></tr>`;
  }
}