// ═══════════════════════════════════════════════════════════════════════
// render-flipflops-sd.js
// Dashboard — Cuestionario Flip-Flops (Sistemas Digitales)
// Nodo Firebase: quizzes/flipflops_sd
// Estructura: {cedula} → { total_intentos, intento_1, intento_2 }
// ═══════════════════════════════════════════════════════════════════════

function renderFlipflopsSD() {

  // ── 1. Leer datos crudos ─────────────────────────────────────────────
  const raw   = DATA.flipflopsSD || {};
  const nodes = Object.values(raw);   // un nodo por cédula
  const total = nodes.length;

  // ── 2. Sin datos ─────────────────────────────────────────────────────
  if (total === 0) {
    document.getElementById('ff-total').textContent        = '0';
    document.getElementById('ff-promedio').textContent     = '—';
    document.getElementById('ff-aprobados').textContent    = '0';
    document.getElementById('ff-proceso').textContent      = '0';
    document.getElementById('ff-riesgo').textContent       = '0';
    document.getElementById('ff-dos-intentos').textContent = '0';
    document.getElementById('ff-tabla-body').innerHTML =
      '<tr><td colspan="8" class="empty-td">Sin respuestas registradas aún.</td></tr>';
    return;
  }

  // ── 3. Aplanar: tomar el MEJOR intento por estudiante ────────────────
  const estudiantes = nodes.map(node => {
    const i1 = node.intento_1 || null;
    const i2 = node.intento_2 || null;
    const nIntentos = node.total_intentos || (i1 ? 1 : 0);

    // mejor puntaje
    let mejor = i1;
    if (i2 && i2.puntaje > (i1 ? i1.puntaje : -1)) mejor = i2;
    if (!mejor) return null;

    return {
      nombre:        mejor.nombre || '—',
      identificacion:mejor.identificacion || '—',
      puntaje:       mejor.puntaje   || 0,
      total:         mejor.total     || 10,
      porcentaje:    mejor.porcentaje|| 0,
      bloqueA:       mejor.bloque_a_puntaje || 0,
      bloqueB:       mejor.bloque_b_puntaje || 0,
      terminadoPor:  mejor.terminado_por    || 'submit',
      timestamp:     mejor.timestamp        || '',
      nIntentos,
      preguntas:     mejor.preguntas || []
    };
  }).filter(Boolean);

  const n = estudiantes.length;

  // ── 4. Acumuladores ─────────────────────────────────────────────────
  let sumaPuntaje = 0, aprobados = 0, proceso = 0, riesgo = 0, dosIntentos = 0;
  const histPuntaje = Array(11).fill(0);       // índices 0-10
  const qAciertos   = {};                       // { id: { ok, total } }
  let sumaBloqueA = 0, sumaBloqueB = 0;
  const motivos     = { submit: 0, tiempo: 0, cambio_pestana: 0 };

  estudiantes.forEach(e => {
    sumaPuntaje += e.puntaje;
    histPuntaje[e.puntaje]++;
    sumaBloqueA += e.bloqueA;
    sumaBloqueB += e.bloqueB;
    if (e.nIntentos >= 2) dosIntentos++;
    motivos[e.terminadoPor] = (motivos[e.terminadoPor] || 0) + 1;

    // Nivel
    if      (e.puntaje >= 6)  aprobados++;
    else if (e.puntaje >= 4)  proceso++;
    else                       riesgo++;

    // Aciertos por pregunta (ID)
    e.preguntas.forEach(p => {
      if (!qAciertos[p.id]) qAciertos[p.id] = { ok: 0, total: 0 };
      qAciertos[p.id].total++;
      if (p.acerto) qAciertos[p.id].ok++;
    });
  });

  const promedio = (sumaPuntaje / n).toFixed(1);
  const pBloqueA = (sumaBloqueA / n).toFixed(1);
  const pBloqueB = (sumaBloqueB / n).toFixed(1);

  // ── 5. KPIs ──────────────────────────────────────────────────────────
  document.getElementById('ff-total').textContent        = n;
  document.getElementById('ff-promedio').textContent     = `${promedio}/10`;
  document.getElementById('ff-aprobados').textContent    = aprobados;
  document.getElementById('ff-proceso').textContent      = proceso;
  document.getElementById('ff-riesgo').textContent       = riesgo;
  document.getElementById('ff-dos-intentos').textContent = dosIntentos;

  // ── 6. Gráfica 1 — Doughnut niveles ─────────────────────────────────
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

  // ── 7. Gráfica 2 — Histograma puntajes ──────────────────────────────
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

  // ── 8. Gráfica 3 — Bloque A vs Bloque B ─────────────────────────────
  crearChart('ff-chart-bloques', 'bar', {
    labels: ['Bloque 1\nConceptos (5pts)', 'Bloque 2\nExcitación (5pts)'],
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
    scales: {
      y: { beginAtZero: true, max: 5, title: { display: true, text: 'Puntaje promedio' } }
    }
  });

  // ── 9. Gráfica 4 — % acierto por pregunta ───────────────────────────
  const qIds   = Object.keys(qAciertos).sort((a,b) => +a - +b);
  const qLabels = qIds.map(id => `P${id}`);
  const qData   = qIds.map(id => {
    const { ok, total } = qAciertos[id];
    return total ? Math.round((ok / total) * 100) : 0;
  });

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
      x: { beginAtZero: true, max: 100, title: { display: true, text: '% Acierto' },
        ticks: { callback: v => v + '%' } }
    }
  });

  // ── 10. Tabla individual ─────────────────────────────────────────────
  const sorted = [...estudiantes].sort((a, b) => b.puntaje - a.puntaje);

  const nivelbadge = p => {
    if (p >= 6)  return '<span class="b-listo">Aprobado</span>';
    if (p >= 4)  return '<span class="b-sel">En proceso</span>';
    return '<span class="b-comp">En riesgo</span>';
  };
  const terminoBadge = t => {
    if (t === 'submit')        return '✔ Entregado';
    if (t === 'tiempo')        return '⏱ Tiempo';
    if (t === 'cambio_pestana')return '⚠ Cambio vent.';
    return t;
  };
  const color = p => p >= 6 ? '#27ae60' : p >= 4 ? '#e67e22' : '#e74c3c';
  const fmtDate = ts => ts ? new Date(ts).toLocaleDateString('es-CO', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';

  document.getElementById('ff-tabla-body').innerHTML = sorted.map((e, i) => {
    const pct = (e.puntaje / e.total) * 100;
    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${e.nombre}</strong></td>
        <td style="font-family:monospace;font-size:.82rem">${e.identificacion}</td>
        <td>
          <div style="display:flex;align-items:center;gap:.5rem;">
            <div style="flex:1;background:#eee;border-radius:4px;height:8px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${color(e.puntaje)};border-radius:4px"></div>
            </div>
            <span style="font-weight:600;color:${color(e.puntaje)};white-space:nowrap">${e.puntaje}/10</span>
          </div>
        </td>
        <td>${e.bloqueA}/5</td>
        <td>${e.bloqueB}/5</td>
        <td>${nivelbadge(e.puntaje)}</td>
        <td style="font-size:.8rem">${e.nIntentos}</td>
        <td style="font-size:.8rem;white-space:nowrap">${terminoBadge(e.terminadoPor)}</td>
        <td style="font-size:.78rem;color:#666">${fmtDate(e.timestamp)}</td>
      </tr>`;
  }).join('');
}