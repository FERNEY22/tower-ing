// Registro de estudiantes y de eventos de uso de los gemelos digitales.
// POST {accion:'registro', cedula, nombre, acepta}  -> crea o actualiza el usuario
// POST {accion:'eventos', cedula, sesion, eventos:[{t, escena, tipo, datos}]} -> guarda eventos (máx. 50 por envío)
import { db, json, ESCENAS, TIPOS } from '../lib/gemelos-db.mjs';

const CED = /^[0-9]{5,12}$/;
const limpiaNombre = s => String(s || '').replace(/[<>{}$]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
const limpiaDatos = d => {
  if (!d || typeof d !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(d).slice(0, 8)) {
    if (!/^[a-zA-Z0-9_]{1,24}$/.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string') out[k] = v.slice(0, 60);
  }
  return out;
};

export default async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Método no permitido' });
  let body;
  try {
    const txt = await req.text();
    if (txt.length > 20000) return json(413, { ok: false, error: 'Envío demasiado grande' });
    body = JSON.parse(txt);
  } catch { return json(400, { ok: false, error: 'JSON inválido' }); }

  const cedula = String(body.cedula || '').trim();
  if (!CED.test(cedula)) return json(400, { ok: false, error: 'Cédula inválida: escribe solo números (5 a 12 dígitos).' });

  try {
    const d = await db();
    const ahora = new Date();

    if (body.accion === 'registro') {
      const nombre = limpiaNombre(body.nombre);
      if (nombre.length < 3) return json(400, { ok: false, error: 'Escribe tu nombre completo.' });
      if (body.acepta !== true) return json(400, { ok: false, error: 'Debes aceptar el tratamiento de datos para continuar.' });
      const r = await d.collection('usuarios').findOneAndUpdate(
        { cedula },
        { $set: { nombre, ultimoIngreso: ahora }, $setOnInsert: { cedula, creado: ahora, aceptaDatos: true, fechaAceptacion: ahora }, $inc: { ingresos: 1 } },
        { upsert: true, returnDocument: 'after' }
      );
      return json(200, { ok: true, usuario: { cedula, nombre: r.nombre, nuevo: (r.ingresos || 1) === 1 } });
    }

    if (body.accion === 'eventos') {
      const u = await d.collection('usuarios').findOne({ cedula }, { projection: { _id: 1 } });
      if (!u) return json(403, { ok: false, error: 'Usuario no registrado' });
      const sesion = String(body.sesion || '').slice(0, 40);
      const lista = Array.isArray(body.eventos) ? body.eventos.slice(0, 50) : [];
      const docs = [];
      for (const e of lista) {
        if (!TIPOS.includes(e.tipo)) continue;
        const t = new Date(e.t);
        const tt = isNaN(t) || Math.abs(t - ahora) > 864e5 ? ahora : t;
        docs.push({ cedula, sesion, t: tt, escena: ESCENAS.includes(e.escena) ? e.escena : null, tipo: e.tipo, datos: limpiaDatos(e.datos) });
      }
      if (docs.length) await d.collection('eventos').insertMany(docs, { ordered: false });
      return json(200, { ok: true, guardados: docs.length });
    }

    return json(400, { ok: false, error: 'Acción desconocida' });
  } catch (e) {
    console.error('gemelo-registro', e.message);
    return json(500, { ok: false, error: 'Error del servidor' });
  }
};

export const config = { path: '/api/gemelos/registro' };
