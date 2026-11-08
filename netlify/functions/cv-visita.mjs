// Aviso de visitas al CV.
// POST {ref, utm, idioma, pantalla, zona, movil, webdriver} desde cv/index.html
//  -> filtra bots, guarda la visita en Firebase (visitas_cv/<id>) y envía un correo con Resend.
//
// Variables de entorno en Netlify (Site configuration → Environment variables):
//   RESEND_API_KEY   clave de https://resend.com (sin ella se guarda la visita pero no se envía correo)
//   CV_AVISO_PARA    correo que recibe el aviso (el mismo con el que se creó la cuenta de Resend)
//   CV_AVISO_DESDE   opcional; por defecto "Aviso CV <onboarding@resend.dev>"

const DB = 'https://tower-ing-default-rtdb.firebaseio.com';
const ORIGENES = ['https://tower-ing.com', 'https://www.tower-ing.com'];

// Rastreadores, vistas previas de enlaces, monitores y navegadores automatizados.
const BOT = /bot|crawl|spider|slurp|archiver|headless|phantom|puppeteer|playwright|selenium|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram|discord|slack|skype|embedly|quora|pinterest|vkshare|w3c_validator|curl|wget|python|java\/|go-http|node-fetch|axios|okhttp|httpclient|postman|insomnia|uptime|pingdom|monitor|statuscake|check_http/i;

const corto = (s, n) => String(s ?? '').replace(/[<>]/g, '').slice(0, n);
const resp = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

// IP sin el último bloque: sirve para ver la red de origen sin guardar la IP completa.
function ipParcial(ip) {
  if (!ip) return '';
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + '::';
  const p = ip.split('.'); return p.length === 4 ? `${p[0]}.${p[1]}.${p[2]}.0` : '';
}

function navegador(ua) {
  const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Otro';
  const so = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Otro';
  return { nav, so };
}

function origenDe(ref, utm) {
  if (utm) return utm;
  if (!ref) return 'Directo (enlace pegado, QR o favorito)';
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '');
    if (/linkedin|lnkd/.test(h)) return 'LinkedIn';
    if (/google\./.test(h)) return 'Google';
    if (/bing\./.test(h)) return 'Bing';
    if (/github/.test(h)) return 'GitHub';
    if (/mail|outlook/.test(h)) return 'Correo';
    if (/tower-ing\.com$/.test(h)) return 'Navegación dentro de tower-ing.com';
    return h;
  } catch { return 'Desconocido'; }
}

async function enviarCorreo(v) {
  const key = process.env.RESEND_API_KEY, para = process.env.CV_AVISO_PARA;
  if (!key || !para) return 'sin-configurar';
  const lugar = [v.ciudad, v.region, v.pais].filter(Boolean).join(', ') || 'Ubicación desconocida';
  const filas = [
    ['Fecha', v.fechaTexto], ['Lugar aproximado', lugar], ['Llegó desde', v.origen],
    ['Dispositivo', `${v.movil ? 'Celular' : 'Computador'} · ${v.so} · ${v.navegador}`],
    ['Idioma', v.idioma], ['Pantalla', v.pantalla], ['Red (IP parcial)', v.ip]
  ].map(([k, x]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td style="padding:4px 0"><b>${corto(x, 200)}</b></td></tr>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px">
    <p>Alguien acaba de abrir tu hoja de vida en tower-ing.com.</p>
    <table style="border-collapse:collapse">${filas}</table>
    <p style="color:#888;font-size:12px">El detalle completo queda en tu dashboard → «Visitas a la hoja de vida».</p></div>`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: process.env.CV_AVISO_DESDE || 'Aviso CV <onboarding@resend.dev>',
      to: [para],
      subject: `Visita a tu CV · ${lugar} · ${v.origen}`,
      html
    })
  });
  return r.ok ? 'enviado' : `error-${r.status}`;
}

export default async (req, context) => {
  if (req.method !== 'POST') return resp(405, { ok: false });

  const origin = req.headers.get('origin') || '';
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!ORIGENES.includes(origin) && !local) return resp(403, { ok: false });

  let b;
  try { const t = await req.text(); if (t.length > 4000) return resp(413, { ok: false }); b = JSON.parse(t); }
  catch { return resp(400, { ok: false }); }

  const ua = req.headers.get('user-agent') || '';
  if (!ua || BOT.test(ua) || b.webdriver === true || !req.headers.get('accept-language')) {
    return resp(200, { ok: true, bot: true });
  }

  const geo = context.geo || {};
  const { nav, so } = navegador(ua);
  const ahora = new Date();
  const v = {
    fecha: ahora.toISOString(),
    fechaTexto: ahora.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }),
    ciudad: corto(geo.city, 60),
    region: corto(geo.subdivision?.name, 60),
    pais: corto(geo.country?.name, 60),
    paisCodigo: corto(geo.country?.code, 4),
    ip: ipParcial(context.ip),
    origen: corto(origenDe(corto(b.ref, 300), corto(b.utm, 60)), 120),
    referencia: corto(b.ref, 300),
    navegador: nav, so,
    movil: b.movil === true,
    idioma: corto(b.idioma, 20),
    pantalla: corto(b.pantalla, 20),
    zona: corto(b.zona, 40),
    agente: corto(ua, 300)
  };

  try {
    v.correo = await enviarCorreo(v);
  } catch { v.correo = 'error'; }

  // Firebase: la regla genérica $root/$entryId permite crear entradas nuevas sin login.
  try {
    await fetch(`${DB}/visitas_cv.json`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) });
  } catch { /* si falla el guardado, el correo ya salió */ }

  return resp(200, { ok: true });
};

export const config = { path: '/api/cv-visita' };
