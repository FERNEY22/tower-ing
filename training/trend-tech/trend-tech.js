/* ============================================================
   TREND & TECH — comportamiento de la sección
   Figura del recorrido: el carro avanza por las semanas, el reloj
   suma el porcentaje evaluado en cada corte y la lámpara se enciende
   en la sustentación.
   ============================================================ */
(function () {
  const fig = document.querySelector(".tt-fig");
  if (!fig) return;
  const stage = fig.querySelector(".tt-stage");
  const svg = stage.querySelector("svg");
  const D = JSON.parse(stage.dataset.fig);
  const carriage = svg.querySelector('[data-part="carriage"]');
  const needle = svg.querySelector('[data-part="needle"]');
  const groups = { f1: svg.querySelector('[data-part="f1"]'), f2: svg.querySelector('[data-part="f2"]') };
  const readout = fig.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const LAST = D.WEEKS + 1;                     // posición extra: sustentación
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const fine = (v) => Math.round(v * 100) / 100;
  const move = (v, w) => `translate(${fine(v[0] * w)} ${fine(v[1] * w)})`;

  // Porcentaje evaluado según la semana alcanzada (modelo del curso)
  const evaluated = (week) => D.CUTS.reduce((sum, c) => sum + (week >= c.week - 0.02 ? c.pct : 0), 0);
  const phaseOf = (week) => (week <= D.CUTS[0].week ? 1 : 2);

  function needleAt(frac) {
    const a = D.SWEEP0 + frac * D.SWEEP, s = Math.sin(a), c = Math.cos(a);
    const pt = (r) => [D.dial[0] + (D.ux[0] * s - D.uy[0] * c) * r, D.dial[1] + (D.ux[1] * s - D.uy[1] * c) * r];
    const [t0, t1] = [pt(-D.tail), pt(D.R)];
    return `M${fine(t0[0])} ${fine(t0[1])}L${fine(t1[0])} ${fine(t1[1])}`;
  }

  function textFor(pos) {
    if (pos >= LAST) return "Sustentación · evaluado 100 %";
    const w = Math.round(pos);
    const pct = evaluated(pos);
    return (w === 0 ? "Inicio" : `Semana ${w} · Fase ${phaseOf(w)}`) + ` · evaluado ${pct} %`;
  }

  let pos = 0, target = 0, x = 0, dial = 0, dialRate = 0;
  let frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idle = 0;

  function draw() {
    const week = Math.min(x, D.WEEKS);
    carriage.setAttribute("transform", move(D.ux, D.X0 + week * D.WEEK));
    needle.setAttribute("d", needleAt(dial / 100));
    const ph = phaseOf(week);
    groups.f1.setAttribute("transform", move(D.uz, ph === 1 && x > 0.05 ? 3 : 0));
    groups.f2.setAttribute("transform", move(D.uz, ph === 2 && x < LAST - 0.05 ? 3 : 0));
    fig.toggleAttribute("data-lamp", x > LAST - 0.3);
    const text = textFor(Math.abs(x - target) < 0.3 ? target : x);
    if (readout.textContent !== text) {
      readout.textContent = text;
      stage.setAttribute("aria-valuenow", String(Math.round(target)));
      stage.setAttribute("aria-valuetext", text.replace(/ · /g, ", "));
    }
  }

  // Recorrido automático: avanza semana a semana y vuelve a empezar
  const tourAt = (t) => { const n = Math.floor(t / 1.1) % (LAST + 3); return Math.min(n, LAST); };

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const calm = still.matches;
    if (touring) { clock += dt; target = tourAt(clock); }
    x = calm ? target : x + (target - x) * (1 - Math.exp(-dt / 0.32));
    if (Math.abs(target - x) < 0.002) x = target;
    const want = evaluated(Math.min(x, D.WEEKS));
    if (calm) { dial = want; dialRate = 0; }
    else {
      for (let i = 0; i < 4; i++) { dialRate += ((want - dial) * 90 - dialRate * 13) * dt / 4; dial += dialRate * dt / 4; }
      if (Math.abs(want - dial) < 0.05 && Math.abs(dialRate) < 0.05) { dial = want; dialRate = 0; }
    }
    draw();
    const settled = !touring && x === target && dialRate === 0;
    frame = visible && !settled ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  const steer = (to) => {
    touring = false;
    target = clamp(to, 0, LAST);
    clearTimeout(idle);
    idle = setTimeout(() => { touring = !still.matches; clock = target * 1.1; run(); }, 5000);
    run();
  };

  new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "80px 0px" }).observe(stage);

  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" && e.buttons === 0) return;
    const box = svg.getBoundingClientRect();
    const share = clamp(((e.clientX - box.left) / box.width - 0.12) / 0.76, 0, 1);
    steer(Math.round(share * LAST));
  });
  stage.addEventListener("pointerdown", (e) => {
    const box = svg.getBoundingClientRect();
    const share = clamp(((e.clientX - box.left) / box.width - 0.12) / 0.76, 0, 1);
    steer(Math.round(share * LAST));
  });
  stage.addEventListener("keydown", (e) => {
    const keys = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    let to = null;
    if (e.key in keys) to = Math.round(target) + keys[e.key];
    if (e.key === "Home") to = 0;
    if (e.key === "End") to = LAST;
    if (to === null) return;
    e.preventDefault();
    steer(to);
  });
  still.addEventListener("change", () => { if (still.matches) touring = false; run(); });
  draw();
})();

/* ============================================================
   Recorrido en tarjetas: Anterior / Siguiente, progreso y swipe.
   La tarjeta entra desde el lado hacia el que se avanza; con
   teclado el cambio es inmediato.
   ============================================================ */
(function () {
  const tour = document.querySelector("[data-tour]");
  if (!tour) return;
  const steps = [...tour.querySelectorAll(".tt-step")];
  const track = tour.querySelector("[data-tour-track]");
  const prev = tour.querySelector("[data-tour-prev]");
  const next = tour.querySelector("[data-tour-next]");
  const now = tour.querySelector("[data-tour-now]");
  const part = tour.querySelector("[data-tour-part]");
  const fill = tour.querySelector("[data-tour-fill]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = "cubic-bezier(.22, 1, .36, 1)";
  tour.querySelector("[data-tour-total]").textContent = steps.length;
  let at = 0;

  function show(to, how) {
    to = Math.max(0, Math.min(steps.length - 1, to));
    if (to === at && how !== "init") return;
    const dir = to > at ? 1 : -1;
    steps[at].hidden = true;
    steps[at].style.transform = "";
    const card = steps[to];
    card.hidden = false;
    at = to;
    // pausar el video al salir de la tarjeta
    steps.forEach((s, i) => { if (i !== at) s.querySelectorAll("video").forEach((v) => v.pause()); });
    now.textContent = at + 1;
    part.textContent = card.dataset.part;
    fill.style.transform = `scaleX(${(at + 1) / steps.length})`;
    prev.disabled = at === 0;
    next.disabled = at === steps.length - 1;
    if (how === "init" || how === "key") return;
    if (card.animate) {
      const frames = still.matches
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: `translateX(${dir * 24}px)` }, { opacity: 1, transform: "translateX(0)" }];
      card.animate(frames, { duration: still.matches ? 150 : 220, easing: EASE });
    }
    // si el inicio del recorrido quedó arriba de la pantalla, volver a él
    const top = tour.getBoundingClientRect().top;
    if (top < 0) tour.scrollIntoView({ behavior: still.matches ? "auto" : "smooth", block: "start" });
  }

  prev.addEventListener("click", () => show(at - 1));
  next.addEventListener("click", () => show(at + 1));
  tour.addEventListener("keydown", (e) => {
    if (e.target.closest("input, select, textarea, video, .tt-quiz, .tt-slides")) return;
    if (e.key === "ArrowRight") { show(at + 1, "key"); }
    else if (e.key === "ArrowLeft") { show(at - 1, "key"); }
  });

  // Swipe en pantallas táctiles: la tarjeta sigue al dedo y decide al soltar
  let sx = 0, sy = 0, st = 0, dx = 0, drag = null;
  const skip = "button, a, select, input, textarea, video, summary, .tt-video, .tt-slides";
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch" || drag || e.target.closest(skip)) return;
    drag = { id: e.pointerId, decided: false, horizontal: false };
    sx = e.clientX; sy = e.clientY; st = performance.now(); dx = 0;
  });
  track.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const mx = e.clientX - sx, my = e.clientY - sy;
    if (!drag.decided && Math.hypot(mx, my) > 8) {
      drag.decided = true;
      drag.horizontal = Math.abs(mx) > Math.abs(my) * 1.2;
      if (drag.horizontal) track.setPointerCapture(e.pointerId);
    }
    if (!drag.horizontal) return;
    const atEdge = (mx > 0 && at === 0) || (mx < 0 && at === steps.length - 1);
    dx = atEdge ? mx / (1 + Math.abs(mx) / 60) : mx;        // freno en los extremos
    if (!still.matches) steps[at].style.transform = `translateX(${dx}px)`;
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const horizontal = drag.horizontal;
    drag = null;
    if (!horizontal) return;
    const velocity = Math.abs(dx) / Math.max(1, performance.now() - st);
    const go = Math.abs(dx) > 60 || velocity > 0.11;
    const card = steps[at];
    if (go && dx < 0 && at < steps.length - 1) { card.style.transform = ""; show(at + 1); return; }
    if (go && dx > 0 && at > 0) { card.style.transform = ""; show(at - 1); return; }
    if (card.animate && !still.matches && dx) card.animate([{ transform: `translateX(${dx}px)` }, { transform: "translateX(0)" }], { duration: 200, easing: EASE });
    card.style.transform = "";
  };
  track.addEventListener("pointerup", release);
  track.addEventListener("pointercancel", release);

  show(0, "init");
})();

/* ============================================================
   Quiz: una pregunta a la vez, explicación al responder,
   resultado con las falladas y reintento en orden aleatorio.
   ============================================================ */
(function () {
  const quiz = document.querySelector("[data-quiz]");
  if (!quiz) return;
  const all = [...quiz.querySelectorAll(".tt-q")];
  const head = quiz.querySelector("[data-q-head]");
  const nowEl = quiz.querySelector("[data-q-now]");
  const fill = quiz.querySelector("[data-q-fill]");
  const next = quiz.querySelector("[data-q-next]");
  const result = quiz.querySelector("[data-q-result]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = "cubic-bezier(.22, 1, .36, 1)";
  quiz.querySelector("[data-q-total]").textContent = all.length;
  quiz.querySelector("[data-q-of]").textContent = all.length;
  let order = all.slice(), at = 0;
  const answers = new Map();

  const enter = (el, dx, dy) => {
    if (!el.animate) return;
    const frames = still.matches
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, transform: `translate(${dx}px, ${dy}px)` }, { opacity: 1, transform: "translate(0, 0)" }];
    el.animate(frames, { duration: still.matches ? 150 : dy ? 180 : 200, easing: EASE });
  };

  function showQ(k, animate) {
    at = k;
    all.forEach((q) => (q.hidden = true));
    result.hidden = true;
    head.hidden = false;
    const q = order[at];
    q.hidden = false;
    q.querySelector("legend b").textContent = at + 1;
    nowEl.textContent = at + 1;
    fill.style.transform = `scaleX(${(at + 1) / order.length})`;
    next.hidden = !answers.has(q);
    if (animate) enter(q, 16, 0);
  }

  function lock(q) {
    q.querySelectorAll("button[data-v], select, [data-check]").forEach((el) => (el.disabled = true));
  }

  function answered(q, ok) {
    answers.set(q, ok);
    lock(q);
    const fb = q.querySelector(".tt-fb");
    fb.dataset.state = ok ? "ok" : "no";
    fb.textContent = ok ? q.dataset.ok : q.dataset.no;
    next.hidden = false;
    enter(next, 0, 6);
    next.focus({ preventScroll: true });
  }

  function showResult() {
    all.forEach((q) => (q.hidden = true));
    head.hidden = true;
    next.hidden = true;
    const good = order.filter((q) => answers.get(q)).length;
    quiz.querySelector("[data-q-score]").textContent = good;
    const missed = order.filter((q) => !answers.get(q));
    quiz.querySelector("[data-q-msg]").textContent = missed.length
      ? "Repasa las preguntas que fallaste:"
      : "Respondiste todas bien.";
    const list = quiz.querySelector("[data-q-missed]");
    list.innerHTML = "";
    missed.forEach((q) => {
      const li = document.createElement("li");
      const p = document.createElement("p");
      p.textContent = q.querySelector("legend span").textContent;
      const a = document.createElement("p");
      a.className = "ans";
      a.textContent = "Respuesta correcta: " + q.dataset.correct;
      li.append(p, a);
      list.append(li);
    });
    list.hidden = !missed.length;
    result.hidden = false;
    enter(result, 16, 0);
    result.focus({ preventScroll: true });
  }

  all.forEach((q) => {
    if (q.hasAttribute("data-match")) {
      const sel = [...q.querySelectorAll("select")];
      q.querySelector("[data-check]").addEventListener("click", () => {
        const fb = q.querySelector(".tt-fb");
        if (sel.some((s) => !s.value)) {
          fb.removeAttribute("data-state");
          fb.textContent = "Elige una revolución para cada ejemplo.";
          return;
        }
        let ok = true;
        sel.forEach((s) => { const good = s.value === s.dataset.answer; s.dataset.state = good ? "ok" : "no"; ok = ok && good; });
        answered(q, ok);
      });
      return;
    }
    q.querySelectorAll("button[data-v]").forEach((b) => b.addEventListener("click", () => {
      const ok = b.dataset.v === q.dataset.answer;
      b.dataset.state = ok ? "ok" : "no";
      if (!ok) q.querySelector(`button[data-v="${q.dataset.answer}"]`).dataset.state = "ok";
      answered(q, ok);
    }));
  });

  next.addEventListener("click", () => (at < order.length - 1 ? showQ(at + 1, true) : showResult()));

  quiz.querySelector("[data-reset]").addEventListener("click", () => {
    answers.clear();
    all.forEach((q) => {
      q.querySelectorAll("[data-state]").forEach((el) => el.removeAttribute("data-state"));
      q.querySelectorAll("button[data-v], select, [data-check]").forEach((el) => (el.disabled = false));
      q.querySelectorAll("select").forEach((s) => (s.value = ""));
      const fb = q.querySelector(".tt-fb");
      fb.textContent = "";
      fb.removeAttribute("data-state");
    });
    // orden aleatorio, distinto del anterior cuando se puede
    const prev = order.map((q) => all.indexOf(q)).join();
    do {
      order = all.slice();
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    } while (order.length > 1 && order.map((q) => all.indexOf(q)).join() === prev);
    showQ(0, true);
    order[0].querySelector("button[data-v], select").focus({ preventScroll: true });
  });

  showQ(0, false);
})();

/* ============================================================
   Visor de diapositivas: Anterior / Siguiente, flechas y swipe
   ============================================================ */
(function () {
  const box = document.querySelector("[data-slides]");
  if (!box) return;
  const titles = JSON.parse(box.dataset.slides);
  const dir = box.dataset.slidesDir;
  const img = box.querySelector("[data-slide-img]");
  const prev = box.querySelector("[data-slide-prev]");
  const next = box.querySelector("[data-slide-next]");
  const now = box.querySelector("[data-slide-now]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const src = (i) => `${dir}${String(i + 1).padStart(2, "0")}.jpg`;
  box.querySelector("[data-slide-total]").textContent = titles.length;
  let at = 0;
  const preload = (i) => { if (i >= 0 && i < titles.length) { const im = new Image(); im.src = src(i); } };

  function go(i) {
    i = Math.max(0, Math.min(titles.length - 1, i));
    if (i === at) return;
    at = i;
    img.src = src(at);
    img.alt = `Diapositiva ${at + 1} de ${titles.length}: ${titles[at]}`;
    now.textContent = at + 1;
    prev.disabled = at === 0;
    next.disabled = at === titles.length - 1;
    if (!still.matches && img.animate) img.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 150, easing: "ease" });
    preload(at + 1);
  }
  prev.addEventListener("click", () => go(at - 1));
  next.addEventListener("click", () => go(at + 1));
  box.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1); }
  });
  let sx = 0, sy = 0, id = null;
  const frame = box.querySelector(".tt-slides-frame");
  frame.addEventListener("pointerdown", (e) => { if (e.pointerType === "touch") { id = e.pointerId; sx = e.clientX; sy = e.clientY; } });
  frame.addEventListener("pointerup", (e) => {
    if (e.pointerId !== id) return;
    id = null;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(at + (dx < 0 ? 1 : -1));
  });
  frame.addEventListener("pointercancel", () => (id = null));
  preload(1);
})();

/* ============================================================
   Cronómetro del pitch: 10 minutos de exposición + 5 de preguntas,
   con registro del tiempo de cada una de las 8 partes.
   ============================================================ */
(function () {
  const box = document.querySelector("[data-pitch]");
  if (!box) return;
  const EXPO = 10 * 60, QA = 5 * 60;
  const timeEl = box.querySelector("[data-pitch-time]");
  const phaseEl = box.querySelector("[data-pitch-phase]");
  const partEl = box.querySelector("[data-pitch-part]");
  const fill = box.querySelector("[data-pitch-fill]");
  const status = box.querySelector("[data-pitch-status]");
  const startB = box.querySelector("[data-pitch-start]");
  const nextB = box.querySelector("[data-pitch-next]");
  const resetB = box.querySelector("[data-pitch-reset]");
  const parts = [...box.querySelectorAll("[data-part-i]")];
  const names = parts.map((li) => li.querySelector(".nm").textContent);
  const fmt = (s) => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
  let running = false, base = 0, acc = 0, part = 0, partStart = 0, timer = 0, phase = "expo";

  const elapsed = () => acc + (running ? (Date.now() - base) / 1000 : 0);
  function paint() {
    const e = elapsed();
    if (phase === "expo" && e >= EXPO) {
      closePart(EXPO); phase = "qa";
      phaseEl.textContent = "Preguntas"; box.dataset.phase = "qa";
      status.textContent = "Terminó la exposición. Empiezan los 5 minutos de preguntas.";
      partEl.textContent = "Preguntas del jurado";
    }
    if (phase === "qa" && e >= EXPO + QA) {
      stop(); phase = "end"; box.dataset.phase = "end";
      phaseEl.textContent = "Tiempo terminado"; status.textContent = "Terminó el tiempo de preguntas.";
    }
    const left = phase === "expo" ? EXPO - e : phase === "qa" ? EXPO + QA - e : 0;
    timeEl.textContent = fmt(left);
    const share = phase === "expo" ? e / EXPO : phase === "qa" ? (e - EXPO) / QA : 1;
    fill.style.transform = `scaleX(${Math.min(1, Math.max(0, share))})`;
    timeEl.setAttribute("aria-label", (phase === "qa" ? "Preguntas: " : "Exposición: ") + fmt(left) + " restantes");
  }
  function closePart(at) {
    if (part >= parts.length || phase !== "expo") return;
    parts[part].querySelector("[data-part-time]").textContent = fmt(at - partStart);
    parts[part].dataset.done = "";
  }
  function markPart() {
    parts.forEach((li, i) => li.toggleAttribute("data-on", i === part && phase === "expo"));
    if (phase === "expo") partEl.textContent = part < parts.length ? `Parte ${part + 1} de ${parts.length} · ${names[part]}` : "Todas las partes presentadas";
  }
  function start() { running = true; base = Date.now(); startB.textContent = "Pausar"; timer = setInterval(paint, 250); paint(); }
  function stop() { if (running) { acc = elapsed(); running = false; } clearInterval(timer); startB.textContent = phase === "end" ? "Iniciar" : "Reanudar"; }
  startB.addEventListener("click", () => {
    if (phase === "end") return;
    if (running) { stop(); status.textContent = "Cronómetro en pausa."; } else { start(); status.textContent = phase === "qa" ? "Preguntas en curso." : `Parte ${part + 1}: ${names[part] || ""}.`; }
  });
  nextB.addEventListener("click", () => {
    if (phase !== "expo" || part >= parts.length) return;
    const e = elapsed(); closePart(e); part++; partStart = e; markPart();
    status.textContent = part < parts.length ? `Parte ${part + 1}: ${names[part]}.` : "Presentaron las 8 partes.";
  });
  resetB.addEventListener("click", () => {
    stop(); acc = 0; part = 0; partStart = 0; phase = "expo"; delete box.dataset.phase;
    parts.forEach((li) => { li.querySelector("[data-part-time]").textContent = "—"; delete li.dataset.done; });
    phaseEl.textContent = "Exposición"; startB.textContent = "Iniciar"; status.textContent = "Cronómetro reiniciado."; markPart(); paint();
  });
  markPart(); paint();
})();
