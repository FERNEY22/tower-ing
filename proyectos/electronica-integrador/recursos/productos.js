// Productos de la etapa: pestañas, carga diferida de las vistas interactivas y descargas.
(() => {
  document.querySelectorAll("[data-prod]").forEach((box) => {
    const tabs = [...box.querySelectorAll("[data-prod-tab]")], panes = [...box.querySelectorAll("[data-prod-pane]")];
    const show = (i) => {
      tabs.forEach((t, k) => t.setAttribute("aria-selected", k === i ? "true" : "false"));
      panes.forEach((p, k) => {
        p.hidden = k !== i;
        if (k === i) p.querySelectorAll("iframe[data-src]").forEach((f) => { if (!f.src) f.src = f.dataset.src; });
      });
    };
    tabs.forEach((t, i) => t.addEventListener("click", () => show(i)));
    show(0);
  });
  document.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-b64]");
    if (!a) return;
    e.preventDefault();
    const txt = a.innerHTML; a.setAttribute("aria-busy", "true");
    try {
      const b = atob((await (await fetch(a.dataset.b64)).text()).trim());
      const u8 = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i);
      const blob = new Blob([u8], { type: a.dataset.mime });
      const dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null;
      if (dl) {
        try { await dl.save({ filename: a.dataset.name, data: blob }); }
        catch (er) { if (er && er.code !== "declined") throw er; }
      } else {
        const url = URL.createObjectURL(blob);
        const l = document.createElement("a"); l.href = url; l.download = a.dataset.name; document.body.appendChild(l); l.click(); l.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch (err) { a.innerHTML = "No se pudo descargar; intenta de nuevo"; setTimeout(() => (a.innerHTML = txt), 3000); }
    a.removeAttribute("aria-busy");
  });
})();

// Recorrido obligatorio: video, presentación y productos.
(() => {
  const CV = window.CV; if (!CV) return;
  CV.progress = CV.progress || {};
  const prog = (k, t) => { CV.progress[k] = t; document.dispatchEvent(new CustomEvent("cv:progress")); };
  const v = document.querySelector(".cv-video video");
  if (v) {
    let hecho = false;
    v.addEventListener("timeupdate", () => {
      if (hecho || !v.duration) return;
      let s = 0; for (let i = 0; i < v.played.length; i++) s += v.played.end(i) - v.played.start(i);
      const p = Math.min(1, s / v.duration);
      if (p >= 0.85) { hecho = true; CV.report("video", { label: "Video-lección", text: "Vista" }); }
      else prog("video", Math.round(p * 100) + " % visto");
    });
  }
  const sl = document.querySelector("[data-slides]");
  if (sl) {
    const tot = JSON.parse(sl.dataset.slides).length, vistas = new Set([1]);
    const now = sl.querySelector("[data-slide-now]");
    const upd = () => {
      vistas.add(+now.textContent);
      if (vistas.size >= tot) CV.report("pres", { label: "Presentación", text: `${tot} de ${tot} diapositivas` });
      else prog("pres", `${vistas.size} de ${tot} diapositivas`);
    };
    new MutationObserver(upd).observe(now, { childList: true, characterData: true, subtree: true });
    upd();
  }
  const box = document.querySelector("[data-prod]");
  if (box) {
    const tabs = [...box.querySelectorAll("[data-prod-tab]")], vis = new Set();
    const upd = (i) => {
      vis.add(i);
      if (vis.size >= tabs.length) CV.report("prod", { label: "Productos", text: `${tabs.length} de ${tabs.length} revisados` });
      else prog("prod", `${vis.size} de ${tabs.length} revisados`);
    };
    tabs.forEach((t, i) => t.addEventListener("click", () => upd(i)));
    const obs = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) upd(0); });
    obs.observe(box);
  }
})();
