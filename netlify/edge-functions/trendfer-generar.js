// TrendFER: genera el entregable. Verifica el permiso firmado por /api/trendfer,
// arma las instrucciones en el servidor y transmite la respuesta del modelo mientras se escribe.
// El estado del intento (en_curso, generado, fallido) lo decide solo el servidor.
import { construirPrompt, ACTIVIDADES } from "../lib/trendfer-instrucciones.mjs";

const enc = new TextEncoder();
const dec = new TextDecoder();
const err = (status, error) => new Response(JSON.stringify({ ok: false, error }), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function verificar(permiso, secreto) {
  const [cuerpo, firma] = String(permiso || "").split(".");
  if (!cuerpo || !firma) return null;
  const key = await crypto.subtle.importKey("raw", enc.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const esperada = hex(await crypto.subtle.sign("HMAC", key, enc.encode(cuerpo)));
  if (esperada !== firma) return null;
  try { const bin = atob(cuerpo.replace(/-/g, "+").replace(/_/g, "/")); return JSON.parse(dec.decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))); } catch { return null; }
}

// Llamada interna a /api/trendfer, firmada con HMAC del secreto sobre "accion.permiso".
async function interna(req, secreto, accion, permiso, extra = {}) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firma = hex(await crypto.subtle.sign("HMAC", key, enc.encode(`${accion}.${permiso}`)));
  const r = await fetch(new URL("/api/trendfer", req.url), {
    method: "POST",
    headers: { "content-type": "application/json", "x-trendfer-interno": firma },
    body: JSON.stringify({ accion, permiso, ...extra })
  });
  return { status: r.status, j: await r.json().catch(() => ({})) };
}

export default async (req) => {
  if (req.method !== "POST") return err(405, "Método no permitido");
  const secreto = Netlify.env.get("TRENDFER_SECRET"), clave = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!secreto || !clave) return err(500, "Falta configurar el servidor");
  let body;
  try {
    const txt = await req.text();
    if (txt.length > 60000) return err(413, "Los archivos son muy largos. Pega solo lo esencial.");
    body = JSON.parse(txt);
  } catch { return err(400, "JSON inválido"); }

  const p = await verificar(body.permiso, secreto);
  if (!p || p.exp < Date.now()) return err(403, "El permiso venció. Vuelve a generar.");
  if (!ACTIVIDADES.includes(p.actividad) || p.actividad !== body.actividad) return err(400, "Actividad no válida.");

  // Consume la reserva en el servidor: un permiso solo sirve para una generación.
  const c = await interna(req, secreto, "consumir", body.permiso).catch(() => ({ status: 502, j: {} }));
  if (c.status !== 200 || !c.j.ok) return err(c.status === 403 ? 403 : 502, c.j.error || "No se pudo iniciar la generación.");
  const cerrar = (estado) => interna(req, secreto, "cerrar", body.permiso, { estado }).catch((e) => console.error("trendfer-generar cerrar", e.message));

  const prompt = construirPrompt(p.actividad, p.equipo, body.archivos || {}, body.respuestas || {});
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": clave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Netlify.env.get("TRENDFER_MODEL") || "claude-sonnet-5-5",
      max_tokens: 12000,
      stream: true,
      messages: [{ role: "user", content: prompt + "\n\nResponde únicamente con el objeto JSON, sin texto antes ni después." }]
    })
  }).catch((e) => { console.error("trendfer-generar fetch", e.message); return null; });
  if (!r || !r.ok || !r.body) {
    if (r) console.error("trendfer-generar", r.status, await r.text().catch(() => ""));
    await cerrar("fallido");
    return err(502, "No se pudo generar. Vuelve a intentar; el intento no se cuenta.");
  }

  // Convierte el flujo SSE del modelo en texto plano para el navegador.
  // Al terminar, el servidor marca el intento: generado si el modelo cerró normalmente, fallido si hubo error o se cortó por límite.
  let pendiente = "", fallo = false, fin = null;
  const flujo = r.body.pipeThrough(new TransformStream({
    async flush() { await cerrar(!fallo && fin === "end_turn" ? "generado" : "fallido"); },
    transform(chunk, ctl) {
      pendiente += dec.decode(chunk, { stream: true });
      const lineas = pendiente.split("\n");
      pendiente = lineas.pop();
      for (const l of lineas) {
        if (!l.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(l.slice(5).trim());
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") ctl.enqueue(enc.encode(ev.delta.text));
          if (ev.type === "message_delta" && ev.delta?.stop_reason) fin = ev.delta.stop_reason;
          if (ev.type === "error") { fallo = true; ctl.enqueue(enc.encode("\n[[ERROR]]")); }
        } catch { /* línea incompleta */ }
      }
    }
  }));
  return new Response(flujo, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
};

export const config = { path: "/api/trendfer/generar" };
