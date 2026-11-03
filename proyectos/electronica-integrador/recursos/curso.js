/* ============================================================
   cursovirtualFER · comportamiento de las páginas de módulo
   Recorrido en tarjetas, visor de diapositivas, quiz, caso con
   decisiones, resolver y verificar, y constancia en PDF.
   Autor: Ferney Torres Ome
   ============================================================ */
"use strict";
const STILL = matchMedia("(prefers-reduced-motion: reduce)");
const EASE = "cubic-bezier(.22, 1, .36, 1)";
const enter = (el, dx, dy) => {
  if (!el || !el.animate) return;
  const frames = STILL.matches
    ? [{ opacity: 0 }, { opacity: 1 }]
    : [{ opacity: 0, transform: `translate(${dx}px, ${dy}px)` }, { opacity: 1, transform: "translate(0, 0)" }];
  el.animate(frames, { duration: STILL.matches ? 150 : 200, easing: EASE });
};
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pct = (got, max) => (max ? Math.round((got / max) * 100) : 0);

/* Registro de resultados del módulo: lo leen la tarjeta de constancia y el PDF */
const CV = {
  results: {},
  report(key, data) { this.results[key] = data; document.dispatchEvent(new CustomEvent("cv:result", { detail: { key, data } })); },
};
window.CV = CV;

/* ============================================================
   Recorrido en tarjetas: Anterior / Siguiente, progreso y swipe.
   La tarjeta entra desde el lado hacia el que se avanza; con
   teclado el cambio es inmediato.
   ============================================================ */
(function () {
  const tour = document.querySelector("[data-tour]");
  if (!tour) return;
  const steps = [...tour.querySelectorAll(".cv-step")];
  const track = tour.querySelector("[data-tour-track]");
  const prev = tour.querySelector("[data-tour-prev]");
  const next = tour.querySelector("[data-tour-next]");
  const now = tour.querySelector("[data-tour-now]");
  const part = tour.querySelector("[data-tour-part]");
  const fill = tour.querySelector("[data-tour-fill]");
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
    steps.forEach((s, i) => { if (i !== at) s.querySelectorAll("video").forEach((v) => v.pause()); });
    now.textContent = at + 1;
    part.textContent = card.dataset.part;
    fill.style.transform = `scaleX(${(at + 1) / steps.length})`;
    prev.disabled = at === 0;
    next.disabled = at === steps.length - 1;
    if (how === "init" || how === "key") return;
    if (card.animate) {
      const frames = STILL.matches
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: `translateX(${dir * 24}px)` }, { opacity: 1, transform: "translateX(0)" }];
      card.animate(frames, { duration: STILL.matches ? 150 : 220, easing: EASE });
    }
    const top = tour.getBoundingClientRect().top;
    if (top < 0) tour.scrollIntoView({ behavior: STILL.matches ? "auto" : "smooth", block: "start" });
  }

  prev.addEventListener("click", () => show(at - 1));
  next.addEventListener("click", () => show(at + 1));
  tour.addEventListener("keydown", (e) => {
    if (e.target.closest("input, select, textarea, video, .cv-quiz, .cv-slides, .cv-case, .cv-solve, .cv-cert")) return;
    if (e.key === "ArrowRight") show(at + 1, "key");
    else if (e.key === "ArrowLeft") show(at - 1, "key");
  });

  // Swipe en pantallas táctiles: la tarjeta sigue al dedo y decide al soltar
  let sx = 0, sy = 0, st = 0, dx = 0, drag = null;
  const skip = "button, a, select, input, textarea, video, summary, label, .cv-video, .cv-slides";
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
    dx = atEdge ? mx / (1 + Math.abs(mx) / 60) : mx;
    if (!STILL.matches) steps[at].style.transform = `translateX(${dx}px)`;
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
    if (card.animate && !STILL.matches && dx) card.animate([{ transform: `translateX(${dx}px)` }, { transform: "translateX(0)" }], { duration: 200, easing: EASE });
    card.style.transform = "";
  };
  track.addEventListener("pointerup", release);
  track.addEventListener("pointercancel", release);

  show(0, "init");
})();

/* ============================================================
   Quiz: una pregunta a la vez, explicación al responder,
   resultado con las falladas y reintento aleatorio.
   Si el banco tiene más preguntas que data-quiz-n, cada intento
   toma n distintas; el primero va en el orden del banco.
   ============================================================ */
(function () {
  const quiz = document.querySelector("[data-quiz]");
  if (!quiz) return;
  const all = [...quiz.querySelectorAll(".cv-q")];
  const n = Math.min(all.length, parseInt(quiz.dataset.quizN || all.length, 10));
  const head = quiz.querySelector("[data-q-head]");
  const nowEl = quiz.querySelector("[data-q-now]");
  const fill = quiz.querySelector("[data-q-fill]");
  const next = quiz.querySelector("[data-q-next]");
  const result = quiz.querySelector("[data-q-result]");
  quiz.querySelector("[data-q-total]").textContent = n;
  quiz.querySelector("[data-q-of]").textContent = n;
  let order = all.slice(0, n), at = 0;
  const answers = new Map();

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
    next.firstChild.textContent = at === order.length - 1 ? "Ver resultado " : "Siguiente pregunta ";
    if (animate) enter(q, 16, 0);
  }

  const lock = (q) => q.querySelectorAll("button[data-v], select, [data-check]").forEach((el) => (el.disabled = true));

  function answered(q, ok) {
    answers.set(q, ok);
    lock(q);
    const fb = q.querySelector(".cv-fb");
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
    quiz.querySelector("[data-q-msg]").textContent = missed.length ? "Repasa las preguntas que fallaste:" : "Respondiste todas bien.";
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
    CV.report("quiz", { label: "Quiz", got: good, max: order.length, text: `${good} de ${order.length} (${pct(good, order.length)} %)` });
  }

  all.forEach((q) => {
    if (q.hasAttribute("data-match")) {
      const sel = [...q.querySelectorAll("select")];
      q.querySelector("[data-check]").addEventListener("click", () => {
        const fb = q.querySelector(".cv-fb");
        if (sel.some((s) => !s.value)) { fb.removeAttribute("data-state"); fb.textContent = "Elige una opción para cada fila."; return; }
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
      const fb = q.querySelector(".cv-fb");
      fb.textContent = "";
      fb.removeAttribute("data-state");
    });
    // orden aleatorio, distinto del anterior cuando se puede
    const prevKey = order.map((q) => all.indexOf(q)).join();
    do { order = shuffle(all).slice(0, n); } while (all.length > 1 && order.map((q) => all.indexOf(q)).join() === prevKey);
    showQ(0, true);
    const first = order[0].querySelector("button[data-v], select");
    if (first) first.focus({ preventScroll: true });
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
    if (!STILL.matches && img.animate) img.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 150, easing: "ease" });
    preload(at + 1);
  }
  prev.addEventListener("click", () => go(at - 1));
  next.addEventListener("click", () => go(at + 1));
  box.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1); }
  });
  let sx = 0, sy = 0, id = null;
  const frame = box.querySelector(".cv-slides-frame");
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
   Actividad · Caso con decisiones
   Cada nodo plantea una situación y sus opciones. Cada opción
   vale q = 2 (la mejor), 1 (aceptable) o 0 (riesgosa), muestra su
   consecuencia y lleva al nodo «va». El puntaje es lo obtenido
   sobre el máximo del camino recorrido (2 por decisión).
   ============================================================ */
(function () {
  const box = document.querySelector("[data-case]");
  if (!box) return;
  const data = JSON.parse(box.querySelector('script[type="application/json"]').textContent);
  const stage = box.querySelector("[data-case-stage]");
  const end = box.querySelector("[data-case-end]");
  const LBL = { 2: "Buena decisión", 1: "Aceptable, con costo", 0: "Decisión riesgosa" };
  let path = [];

  function node(id) {
    const nd = data.nodos[id];
    if (!nd || nd.fin) return finish(nd);
    const el = document.createElement("div");
    el.className = "cv-case-node";
    const k = document.createElement("span");
    k.className = "k";
    k.textContent = nd.etapa || `Decisión ${path.length + 1}`;
    const p = document.createElement("p");
    p.textContent = nd.texto;
    el.append(k, p);
    const opts = data.mezclar === false ? nd.opciones : shuffle(nd.opciones);
    opts.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = o.texto;
      b.addEventListener("click", () => {
        el.querySelectorAll("button").forEach((x) => (x.disabled = true));
        b.dataset.q = o.q;
        const c = document.createElement("p");
        c.className = "cv-conseq";
        c.dataset.q = o.q;
        const t = document.createElement("b");
        t.textContent = LBL[o.q];
        c.append(t, document.createTextNode(o.retro));
        el.append(c);
        path.push({ etapa: k.textContent, texto: o.texto, q: o.q });
        const cont = document.createElement("button");
        cont.type = "button";
        cont.className = "btn btn-primary";
        cont.style.justifySelf = "end";
        cont.innerHTML = 'Continuar <span class="arrow" aria-hidden="true">→</span>';
        cont.addEventListener("click", () => { cont.remove(); node(o.va); });
        el.append(cont);
        cont.focus({ preventScroll: true });
      });
      el.append(b);
    });
    stage.append(el);
    enter(el, 0, 10);
  }

  function finish(nd) {
    const got = path.reduce((s, x) => s + x.q, 0), max = path.length * 2;
    end.querySelector("[data-case-score]").textContent = `${got} de ${max}`;
    end.querySelector("[data-case-msg]").textContent = nd && nd.texto ? nd.texto : "";
    const ul = end.querySelector("[data-case-path]");
    ul.innerHTML = "";
    path.forEach((x) => {
      const li = document.createElement("li");
      const i = document.createElement("i");
      i.textContent = x.q === 2 ? "✓" : x.q === 1 ? "~" : "✗";
      i.style.color = x.q === 2 ? "var(--pos)" : x.q === 1 ? "var(--warn)" : "var(--neg)";
      li.append(i, document.createTextNode(`${x.etapa}: ${x.texto}`));
      ul.append(li);
    });
    end.hidden = false;
    enter(end, 0, 10);
    end.focus({ preventScroll: true });
    CV.report("caso", { label: box.dataset.label || "Actividad 1 · Caso con decisiones", got, max, text: `${got} de ${max} puntos (${pct(got, max)} %)` });
  }

  end.querySelector("[data-reset]").addEventListener("click", () => {
    stage.innerHTML = "";
    end.hidden = true;
    path = [];
    node(data.inicio);
  });
  node(data.inicio);
})();

/* ============================================================
   Actividad · Resolver y verificar
   Cada ítem se responde y se comprueba. Número: acepta coma o
   punto y una tolerancia relativa (tol) o absoluta (tol_abs).
   Texto: compara sin tildes ni mayúsculas contra «acepta».
   Puntaje por ítem: 1 menos 0,25 por pista usada (mínimo 0,25);
   si se agotan los intentos se muestra la solución y vale 0.
   ============================================================ */
(function () {
  const box = document.querySelector("[data-solve]");
  if (!box) return;
  const data = JSON.parse(box.querySelector('script[type="application/json"]').textContent);
  const tries = data.intentos || 3;
  const done = box.querySelector("[data-solve-done]");
  const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const num = (s) => { const t = String(s).trim().replace(/\s/g, "").replace(",", "."); return t === "" || isNaN(t) ? NaN : parseFloat(t); };
  const state = data.items.map(() => ({ hints: 0, fails: 0, score: null }));
  const items = [...box.querySelectorAll(".cv-item")];

  function check(i, v) {
    const it = data.items[i];
    if (it.tipo === "texto") return it.acepta.some((a) => fold(a) === fold(v));
    const x = num(v);
    if (isNaN(x)) return null;
    const tol = it.tol_abs != null ? it.tol_abs : Math.abs(it.valor) * (it.tol != null ? it.tol : 0.02);
    return Math.abs(x - it.valor) <= tol + 1e-12;
  }

  function settle() {
    if (state.some((s) => s.score === null)) return;
    const got = Math.round(state.reduce((a, s) => a + s.score, 0) * 100) / 100, max = state.length;
    const fmt = (x) => String(x).replace(".", ",");
    done.querySelector("[data-solve-score]").textContent = `${fmt(got)} de ${max}`;
    done.hidden = false;
    enter(done, 0, 10);
    CV.report("resolver", { label: box.dataset.label || "Actividad 2 · Resolver y verificar", got, max, text: `${fmt(got)} de ${max} puntos (${pct(got, max)} %)` });
  }

  items.forEach((el, i) => {
    const it = data.items[i];
    const input = el.querySelector("input");
    const btn = el.querySelector("[data-check]");
    const hintB = el.querySelector("[data-hint]");
    const hints = el.querySelector(".cv-hints");
    const fb = el.querySelector(".cv-fb");
    const pistas = it.pistas || [];
    if (!pistas.length) hintB.hidden = true;
    const closeItem = (score, how) => {
      state[i].score = score;
      input.disabled = btn.disabled = hintB.disabled = true;
      el.dataset.state = how;
      settle();
    };
    const doCheck = () => {
      if (state[i].score !== null) return;
      const r = check(i, input.value);
      if (r === null) { fb.removeAttribute("data-state"); fb.textContent = "Escribe un número; puedes usar coma decimal."; return; }
      if (r) {
        input.dataset.state = "ok";
        fb.dataset.state = "ok";
        fb.textContent = "Correcto. " + (it.explica || "");
        closeItem(Math.max(0.25, 1 - 0.25 * state[i].hints), "ok");
        return;
      }
      state[i].fails++;
      input.dataset.state = "no";
      fb.dataset.state = "no";
      const left = tries - state[i].fails;
      if (left > 0) {
        fb.textContent = `Todavía no. Te quedan ${left} ${left === 1 ? "intento" : "intentos"}${state[i].hints < pistas.length ? "; si quieres, abre una pista." : "."}`;
      } else {
        fb.textContent = "Se agotaron los intentos. Solución: " + (it.solucion || "");
        closeItem(0, "shown");
      }
    };
    btn.addEventListener("click", doCheck);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doCheck(); } });
    input.addEventListener("input", () => input.removeAttribute("data-state"));
    hintB.addEventListener("click", () => {
      const k = state[i].hints;
      if (k >= pistas.length) return;
      const li = document.createElement("li");
      const b = document.createElement("b");
      b.textContent = `Pista ${k + 1}`;
      li.append(b, document.createTextNode(pistas[k]));
      hints.append(li);
      state[i].hints++;
      if (state[i].hints >= pistas.length) hintB.hidden = true;
      else hintB.textContent = `Ver pista ${state[i].hints + 1} de ${pistas.length}`;
    });
  });

  done.querySelector("[data-reset]").addEventListener("click", () => {
    items.forEach((el, i) => {
      state[i] = { hints: 0, fails: 0, score: null };
      const input = el.querySelector("input");
      input.value = ""; input.disabled = false; input.removeAttribute("data-state");
      el.querySelector("[data-check]").disabled = false;
      const hb = el.querySelector("[data-hint]");
      const n = (data.items[i].pistas || []).length;
      hb.disabled = false; hb.hidden = !n; hb.textContent = n ? `Ver pista 1 de ${n}` : "";
      el.querySelector(".cv-hints").innerHTML = "";
      const fb = el.querySelector(".cv-fb"); fb.textContent = ""; fb.removeAttribute("data-state");
      el.removeAttribute("data-state");
    });
    done.hidden = true;
    items[0].querySelector("input").focus({ preventScroll: true });
  });
})();

/* ============================================================
   Constancia en PDF: nombre, resultados y fecha de realización
   (la fecha es la del equipo del estudiante al descargar).
   ============================================================ */
(function () {
  const box = document.querySelector("[data-cert]");
  if (!box) return;
  const need = [...box.querySelectorAll("[data-key]")].map((li) => li.dataset.key);
  const tareas = ["quiz", "caso", "resolver"];
  CV.progress = CV.progress || {};
  const nameIn = box.querySelector("input");
  const btn = box.querySelector("[data-cert-btn]");
  const msg = box.querySelector("[data-cert-msg]");
  const rows = Object.fromEntries([...box.querySelectorAll("[data-key]")].map((li) => [li.dataset.key, li]));

  function refresh() {
    need.forEach((k) => {
      const r = CV.results[k], li = rows[k];
      if (!li) return;
      li.querySelector("b").textContent = r ? r.text : (CV.progress[k] || "Pendiente");
      if (r) li.dataset.done = ""; else li.removeAttribute("data-done");
    });
    const ready = need.every((k) => CV.results[k]) && nameIn.value.trim().length >= 3;
    btn.disabled = !ready;
    msg.textContent = need.every((k) => CV.results[k]) ? (nameIn.value.trim().length >= 3 ? "" : "Escribe tu nombre completo para generar la constancia.") : "Completa todo el recorrido del módulo para habilitar la constancia: video, presentación, productos, quiz y las dos actividades.";
  }
  document.addEventListener("cv:result", refresh);
  document.addEventListener("cv:progress", refresh);
  nameIn.addEventListener("input", refresh);
  refresh();

  const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  btn.addEventListener("click", () => {
    if (!window.jspdf) { msg.textContent = "No se pudo cargar el generador de PDF. Recarga la página."; return; }
    const { jsPDF } = window.jspdf;
    const curso = box.dataset.curso, modulo = box.dataset.modulo, autor = box.dataset.autor || "Ferney Torres Ome";
    const num = box.dataset.num, total = box.dataset.total;
    const nombre = nameIn.value.trim().replace(/\s+/g, " ");
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
    const hora = ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    const W = 210, M = 22;
    const medir = new jsPDF({ unit: "mm", format: "a4" });
    medir.setFont("helvetica", "bold"); medir.setFontSize(20);
    const nmL = medir.splitTextToSize(nombre, W - 2 * M).length;
    medir.setFont("helvetica", "normal"); medir.setFontSize(12);
    const frase = `completó el Módulo ${num} · ${modulo}, del curso ${curso} (módulo ${num} de ${total}), con estos resultados:`;
    const mdL = medir.splitTextToSize(frase, W - 2 * M).length;
    const H = Math.ceil(98 + nmL * 8 + mdL * 6 + tareas.length * 16 + 37);
    const doc = new jsPDF({ unit: "mm", format: [W, H] });
    doc.setProperties({ title: `Constancia Módulo ${num} · ${curso}`, subject: curso, author: autor, creator: autor, keywords: "constancia, tower-ing" });
    doc.setFillColor(31, 61, 255); doc.rect(0, 0, W, 6, "F");
    doc.setFillColor(255, 210, 26); doc.rect(0, 6, 40, 1.6, "F");
    // emblema tower-ing
    const ex = W - M, ey = 20;
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(21, 23, 31);
    const wI = doc.getTextWidth("Ing"), wT = doc.getTextWidth("Towers");
    doc.text("Ing", ex, ey, { align: "right" });
    const bx = ex - wI - 4.2;
    doc.setFillColor(255, 190, 0);
    doc.triangle(bx + 2.4, ey - 5.2, bx + 0.4, ey - 1.4, bx + 1.9, ey - 1.4, "F");
    doc.triangle(bx + 1.5, ey - 2.2, bx + 3.2, ey - 2.2, bx + 0.9, ey + 1.6, "F");
    doc.text("Towers", bx - 0.6, ey, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(90, 93, 105);
    doc.text("tower-ing.com", ex, ey + 4.5, { align: "right" });
    doc.setDrawColor(31, 61, 255); doc.setLineWidth(0.4); doc.line(ex - wI - wT - 5, ey + 6.5, ex, ey + 6.5);
    doc.setTextColor(90, 93, 105); doc.setFontSize(9);
    doc.text(`${curso.toUpperCase()} · MÓDULO ${num} DE ${total}`, M, 34, { maxWidth: W - 2 * M });
    doc.setTextColor(21, 23, 31); doc.setFont("helvetica", "bold"); doc.setFontSize(26);
    doc.text("Constancia de realización", M, 48);
    doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(71, 74, 85);
    doc.text("Se deja constancia de que", M, 62);
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(26, 51, 214);
    const nm = doc.splitTextToSize(nombre, W - 2 * M); doc.text(nm, M, 74);
    let y = 74 + nm.length * 8 + 4;
    doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(71, 74, 85);
    const md = doc.splitTextToSize(frase, W - 2 * M);
    doc.text(md, M, y); y += md.length * 6 + 6;
    tareas.forEach((k) => {
      const r = CV.results[k];
      doc.setDrawColor(220, 214, 200); doc.setFillColor(251, 248, 241); doc.setLineWidth(0.2);
      doc.roundedRect(M, y - 6, W - 2 * M, 12, 2, 2, "FD");
      doc.setTextColor(21, 23, 31); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text(doc.splitTextToSize(r.label, 115)[0], M + 4, y + 1.5);
      doc.setFont("helvetica", "normal"); doc.setTextColor(21, 128, 61);
      doc.text(r.text, W - M - 4, y + 1.5, { align: "right" });
      y += 16;
    });
    doc.setTextColor(71, 74, 85); doc.setFontSize(10.5);
    doc.text(`Fecha de realización: ${fecha}, ${hora}`, M, y); y += 20;
    doc.setDrawColor(21, 23, 31); doc.line(M, y, M + 70, y);
    doc.setFontSize(10); doc.setTextColor(21, 23, 31); doc.text(autor, M, y + 6);
    doc.setTextColor(90, 93, 105); doc.text("Docente del curso", M, y + 11);
    doc.setFontSize(9); doc.text("Curso realizado en tower-ing.com", W - M, y + 11, { align: "right" });
    const fname = `Constancia_Modulo_${num}_${box.dataset.corto}_tower-ing.pdf`;
    (async () => {
      const dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null;
      if (!dl) { doc.save(fname); msg.textContent = "Constancia descargada."; return; }
      try { await dl.save({ filename: fname, data: doc.output("blob") }); msg.textContent = "Constancia descargada."; }
      catch (e) { msg.textContent = e && e.code === "declined" ? "Descarga cancelada. Puedes intentarlo de nuevo." : "No se pudo descargar la constancia. Intenta de nuevo."; }
    })();
  });
})();

/* ============================================================
   Modo QA (?qa): muestra todas las tarjetas, preguntas y
   resultados para medir el desborde horizontal a 360 px.
   ============================================================ */
(function () {
  if (!/[?&]qa\b/.test(location.search)) return;
  document.querySelectorAll("[hidden]").forEach((el) => (el.hidden = false));
  requestAnimationFrame(() => {
    const de = document.documentElement;
    const wide = [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > de.clientWidth + 1).slice(0, 8)
      .map((el) => el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : ""));
    de.dataset.qa = JSON.stringify({ sw: de.scrollWidth, cw: de.clientWidth, wide });
  });
})();
