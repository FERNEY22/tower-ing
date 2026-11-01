// TrendFER: registro de estudiantes y control de intentos por equipo y actividad.
// POST {accion:'registro', nombre, correo, equipo}          -> crea o actualiza al usuario y devuelve los intentos usados
// POST {accion:'reservar', correo, actividad}               -> reserva un intento y devuelve el permiso firmado para generar
// POST {accion:'resultado', permiso}                        -> solo devuelve los intentos usados (el navegador ya no cambia estados)
// Acciones internas, solo desde la edge function (cabecera x-trendfer-interno = HMAC del secreto sobre "accion.permiso"):
// POST {accion:'consumir', permiso}                         -> reservado -> en_curso en una sola operación; si no estaba reservado, 403
// POST {accion:'cerrar', permiso, estado}                   -> en_curso -> generado | fallido (los fallidos no cuentan)
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db, json } from '../lib/gemelos-db.mjs';
import { ACTIVIDADES, MAX_INTENTOS } from '../lib/trendfer-instrucciones.mjs';

const CORREO = /^[^@\s]{1,64}@universidadean\.edu\.co$/;
const limpia = (s, n) => String(s || '').replace(/[<>{}$]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const claveEquipo = (s) => limpia(s, 60).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function firmar(datos) {
  const cuerpo = b64u(JSON.stringify(datos));
  const firma = createHmac('sha256', process.env.TRENDFER_SECRET).update(cuerpo).digest('hex');
  return `${cuerpo}.${firma}`;
}
function verificar(permiso) {
  const [cuerpo, firma] = String(permiso || '').split('.');
  if (!cuerpo || !firma) return null;
  const esperada = createHmac('sha256', process.env.TRENDFER_SECRET).update(cuerpo).digest('hex');
  if (esperada.length !== firma.length || !timingSafeEqual(Buffer.from(esperada), Buffer.from(firma))) return null;
  try { return JSON.parse(Buffer.from(cuerpo.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch { return null; }
}
// Firma de las llamadas internas de la edge function: HMAC del secreto sobre "accion.permiso".
function esInterna(req, accion, permiso) {
  const firma = String(req.headers.get('x-trendfer-interno') || '');
  const esperada = createHmac('sha256', process.env.TRENDFER_SECRET).update(`${accion}.${permiso}`).digest('hex');
  return firma.length === esperada.length && timingSafeEqual(Buffer.from(esperada), Buffer.from(firma));
}

let indices = null;
async function base() {
  const d = await db();
  if (!indices) indices = Promise.all([
    d.collection('trendfer_usuarios').createIndex({ correo: 1 }, { unique: true }),
    d.collection('trendfer_usos').createIndex({ equipoClave: 1, actividad: 1, estado: 1 }),
    d.collection('trendfer_usos').createIndex({ correo: 1, actividad: 1, estado: 1 })
  ]).catch((e) => { indices = null; throw e; });
  await indices;
  return d;
}

async function usados(d, correo, equipoClave) {
  const filas = await d.collection('trendfer_usos').aggregate([
    { $match: { estado: { $ne: 'fallido' }, $or: [{ equipoClave }, { correo }] } },
    { $group: { _id: { actividad: '$actividad', equipo: { $eq: ['$equipoClave', equipoClave] }, correo: { $eq: ['$correo', correo] } }, n: { $sum: 1 } } }
  ]).toArray();
  const out = {};
  for (const a of ACTIVIDADES) {
    const porEquipo = filas.filter((f) => f._id.actividad === a && f._id.equipo).reduce((s, f) => s + f.n, 0);
    const porCorreo = filas.filter((f) => f._id.actividad === a && f._id.correo).reduce((s, f) => s + f.n, 0);
    out[a] = { usados: Math.max(porEquipo, porCorreo), max: MAX_INTENTOS };
  }
  return out;
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Método no permitido' });
  if (!process.env.TRENDFER_SECRET) return json(500, { ok: false, error: 'Falta configurar TRENDFER_SECRET' });
  let body;
  try {
    const txt = await req.text();
    if (txt.length > 4000) return json(413, { ok: false, error: 'Envío demasiado grande' });
    body = JSON.parse(txt);
  } catch { return json(400, { ok: false, error: 'JSON inválido' }); }

  try {
    const d = await base();
    const ahora = new Date();

    if (body.accion === 'registro') {
      const nombre = limpia(body.nombre, 80), correo = limpia(body.correo, 90).toLowerCase(), equipo = limpia(body.equipo, 60);
      if (nombre.split(' ').length < 2) return json(400, { ok: false, error: 'Escribe tu nombre completo.' });
      if (!CORREO.test(correo)) return json(400, { ok: false, error: 'Usa tu correo @universidadean.edu.co.' });
      if (claveEquipo(equipo).length < 2) return json(400, { ok: false, error: 'Escribe el nombre de tu equipo.' });
      const equipoClave = claveEquipo(equipo);
      await d.collection('trendfer_usuarios').updateOne(
        { correo },
        { $set: { nombre, equipo, equipoClave, ultimoIngreso: ahora }, $setOnInsert: { correo, creado: ahora }, $inc: { ingresos: 1 } },
        { upsert: true }
      );
      return json(200, { ok: true, usuario: { nombre, correo, equipo }, usos: await usados(d, correo, equipoClave) });
    }

    if (body.accion === 'reservar') {
      const correo = limpia(body.correo, 90).toLowerCase(), actividad = String(body.actividad || '');
      if (!ACTIVIDADES.includes(actividad)) return json(400, { ok: false, error: 'Actividad desconocida.' });
      const u = await d.collection('trendfer_usuarios').findOne({ correo });
      if (!u) return json(403, { ok: false, error: 'Vuelve a entrar con tu correo.' });
      const usos = await usados(d, correo, u.equipoClave);
      if (usos[actividad].usados >= MAX_INTENTOS) return json(429, { ok: false, error: `Tu equipo ya usó los ${MAX_INTENTOS} intentos de esta actividad.`, usos });
      const r = await d.collection('trendfer_usos').insertOne({ correo, equipoClave: u.equipoClave, equipo: u.equipo, actividad, estado: 'reservado', t: ahora });
      const permiso = firmar({ id: String(r.insertedId), correo, equipo: u.equipo, actividad, exp: Date.now() + 10 * 60 * 1000 });
      usos[actividad].usados += 1;
      return json(200, { ok: true, permiso, usos });
    }

    if (body.accion === 'consumir' || body.accion === 'cerrar') {
      if (!esInterna(req, body.accion, String(body.permiso || ''))) return json(403, { ok: false, error: 'No autorizado.' });
      const p = verificar(body.permiso);
      if (!p) return json(403, { ok: false, error: 'Permiso inválido.' });
      const { ObjectId } = await import('mongodb');
      let _id;
      try { _id = new ObjectId(p.id); } catch { return json(403, { ok: false, error: 'Permiso inválido.' }); }
      if (body.accion === 'consumir') {
        if (p.exp < Date.now()) return json(403, { ok: false, error: 'El permiso venció. Vuelve a generar.' });
        const r = await d.collection('trendfer_usos').updateOne({ _id, estado: 'reservado' }, { $set: { estado: 'en_curso', inicio: ahora } });
        if (r.modifiedCount !== 1) return json(403, { ok: false, error: 'Este permiso ya se usó. Vuelve a generar.' });
        return json(200, { ok: true });
      }
      const estado = body.estado === 'generado' ? 'generado' : 'fallido';
      const r = await d.collection('trendfer_usos').updateOne({ _id, estado: 'en_curso' }, { $set: { estado, fin: ahora } });
      return json(200, { ok: r.modifiedCount === 1 });
    }

    if (body.accion === 'resultado') {
      const p = verificar(body.permiso);
      if (!p) return json(403, { ok: false, error: 'Permiso inválido.' });
      const u = await d.collection('trendfer_usuarios').findOne({ correo: p.correo });
      return json(200, { ok: true, usos: await usados(d, p.correo, u?.equipoClave || '') });
    }

    return json(400, { ok: false, error: 'Acción desconocida' });
  } catch (e) {
    console.error('trendfer', e.message);
    return json(500, { ok: false, error: 'Error del servidor' });
  }
};

export const config = { path: '/api/trendfer' };
