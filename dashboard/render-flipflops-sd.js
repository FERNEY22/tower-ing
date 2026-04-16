// ═══════════════════════════════════════════════════════════════════════
// render-flipflops-sd.js
// Dashboard — Cuestionario Flip-Flops (Sistemas Digitales)
// Nodo Firebase: flipflops_sd
// Compatible con estructura plana Y estructura intento_1/intento_2
// ═══════════════════════════════════════════════════════════════════════

function renderFlipflopsSD() {
  try {

    // ── 1. Datos ────────────────────────────────────────────────────────
    const raw   = DATA.flipflopsSD || {};
    const nodes = Object.values(raw);

    // ── 2. Sin datos ────────────────────────────────────────────────────
    if (nodes.length === 0) {
      document.getElementById('ff-total').textContent        = '0';
      document.getElementById('ff-promedio').textContent     = '—';
      document.getElementById('ff-aprobados').textContent    = '0';
      document.getElementById('ff-proceso').textContent      = '0';
      document.getElementById('ff-riesgo').textContent       = '0';
      document.getElementById('ff-dos-intentos').textContent = '0';
      document.getElementById('ff-tabla-body').innerHTML =
        '<tr><td colspan="10" class="empty-td">Sin respuestas registradas aún.</td></tr>';
      return;
    }

    // ── 3. Normalizar: plano O intento_1/intento_2 ─────────────────────
    function extraerMejor(node) {
      // Estructura nueva: tiene intento_1
      if (node.intento_1) {
        const i1 = node.intento_1;
        const i2 = node.intento_2 || null;
        const nIntentos = node.total_intentos || 1;
        const mejor = (i2 && i2.puntaje > i1.puntaje) ? i2 : i1;
        return { ...mejor, nIntentos };
      }
      // Estructura plana: tiene nombre y puntaje directo
      if (node.nombre && node.puntaje !== undefined) {
        return { ...node, nIntentos: 1 };
      }
      return null;
    }

    const estudiantes = nodes.map(node => {
      const d = extraerMejor(node);
      if (!d) return null;
      return {
        nombre:        d.nombre         || '—',
        identificacion:d.identificacion || '—',
        puntaje:       Number(d.puntaje)           || 0,
        total:         Number(d.total)             || 10,
        bloqueA:       Number(d.bloque_a_puntaje)  || 0,
        bloqueB:       Number(d.bloque_b_puntaje)  || 0,
        terminadoPor:  d.terminado_por  || 'submit',
        timestamp:     d.timestamp      || '',
        nIntentos:     d.nIntentos      || 1,
        preguntas:     Array.isArray(d.preguntas) ? d.preguntas : []
      };
    }).filter(Boolean);

    const n = estudiantes.length;

    if (n === 0) {
      document.getElementById('ff-tabla-body').innerHTML =
        '<tr><td colspan="10" class="empty-td">Datos en Firebase pero estructura no reconocida. Revisa la consola.</td></tr>';
      return;
    }

    // ── 4. Acumuladores ─────────────────────────────────────────────────
    let sumaPuntaje=0, aprobados=0, proceso=0, riesgo=0, dosIntentos=0;
    let sumaBloqueA=0, sumaBloqueB=0;
    const histPuntaje = Array(11).fill(0);
    const qAciertos   = {};

    estudiantes.forEach(e => {
      sumaPuntaje += e.puntaje;
      sumaBloqueA += e.bloqueA;
      sumaBloqueB += e.bloqueB;
      if (e.puntaje >= 0 && e.puntaje <= 10) histPuntaje[e.puntaje]++;
      if (e.nIntentos >= 2) dosIntentos++;
      if      (e.puntaje >= 6) aprobados++;
      else if (e.puntaje >= 4) proceso++;
      else                      riesgo++;

      e.preguntas.forEach(p => {
        if (!p || p.id === undefined) return;
        if (!qAciertos[p.id]) qAciertos[p.id] = { ok: 0, total: 0 };
        qAciertos[p.id].total++;
        if (p.acerto) qAciertos[p.id].ok++;
      });
    });

    const promedio = (sumaPuntaje / n).toFixed(1);
    const pBloqueA = (sumaBloqueA / n).toFixed(1);
    const pBloqueB = (sumaBloqueB / n).toFixed(1);

    // ── 5. KPIs ─────────────────────────────────────────────────────────
    document.getElementById('ff-total').textContent        = n;
    document.getElementById('ff-promedio').textContent     = `${promedio}/10`;
    document.getElementById('ff-aprobados').textContent    = aprobados;
    document.getElementById('ff-proceso').textContent      = proceso;
    document.getElementById('ff-riesgo').textContent       = riesgo;
    document.getElementById('ff-dos-intentos').textContent = dosIntentos;

    // ── 6. Doughnut niveles ──────────────────────────────────────────────
    crearChart('ff-chart-niveles', 'doughnut', {
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

    // ── 7. Histograma puntajes ───────────────────────────────────────────
    crearChart('ff-chart-hist', 'bar', {
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

    // ── 8. Bloque A vs B ────────────────────────────────────────────────
    crearChart('ff-chart-bloques', 'bar', {
      labels: ['Bloque 1 — Conceptos (5pts)', 'Bloque 2 — Excitación (5pts)'],
      datasets: [{
        label: 'Promedio',
        data: [parseFloat(pBloqueA), parseFloat(pBloqueB)],
        backgroundColor: ['rgba(52,152,219,.8)', 'rgba(155,89,182,.8)'],
        borderRadius: 4
      }]
    }, {
      plugins: {
        legend: { display: false },
        title:  { display: true, text: 'Promedio por bloque temático', font: { size: 13 } }
      },
      scales: { y: { beginAtZero: true, max: 5, title: { display: true, text: 'Puntaje promedio' } } }
    });

    // ── 9. % acierto por pregunta ────────────────────────────────────────
    const qIds    = Object.keys(qAciertos).sort((a, b) => +a - +b);
    const qLabels = qIds.map(id => `P${id}`);
    const qData   = qIds.map(id => {
      const { ok, total } = qAciertos[id];
      return total ? Math.round((ok / total) * 100) : 0;
    });

    if (qIds.length > 0) {
      crearChart('ff-chart-preguntas', 'bar', {
        labels: qLabels,
        datasets: [{
          label: '% Acierto',
          data: qData,
          backgroundColor: qData.map(v => v >= 50 ? 'rgba(52,152,219,.8)' : 'rgba(231,76,60,.8)'),
          borderRadius: 3
        }]
      }, {
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          title:  { display: true, text: '% de acierto por pregunta (ID del banco)', font: { size: 13 } }
        },
        scales: {
          x: { beginAtZero: true, max: 100,
            title: { display: true, text: '% Acierto' },
            ticks: { callback: v => v + '%' } }
        }
      });
    }

    // ── 10. Tabla individual ─────────────────────────────────────────────
    const sorted = [...estudiantes].sort((a, b) => b.puntaje - a.puntaje);

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

    document.getElementById('ff-tabla-body').innerHTML = sorted.map((e, i) => {
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
              <span style="font-weight:600;color:${color(e.puntaje)};white-space:nowrap">${e.puntaje}/10</span>
            </div>
          </td>
          <td style="text-align:center">${e.bloqueA}/5</td>
          <td style="text-align:center">${e.bloqueB}/5</td>
          <td style="text-align:center">${nivelbadge(e.puntaje)}</td>
          <td style="text-align:center;font-size:.82rem">${e.nIntentos}</td>
          <td style="text-align:center;font-size:.8rem;white-space:nowrap">${terminoBadge(e.terminadoPor)}</td>
          <td style="font-size:.78rem;color:#666">${fmtDate(e.timestamp)}</td>
        </tr>`;
    }).join('');

  } catch (err) {
    // Error controlado — no rompe el resto del dashboard
    console.error('renderFlipflopsSD error:', err);
    const tb = document.getElementById('ff-tabla-body');
    if (tb) tb.innerHTML = `<tr><td colspan="10" class="empty-td">Error al procesar datos: ${err.message}</td></tr>`;
  }
}