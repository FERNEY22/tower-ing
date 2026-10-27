// Panel de administrador de los gemelos digitales (solo lectura).
// Requiere el encabezado  x-admin-key  igual a la variable de entorno ADMIN_KEY.
// GET ?accion=resumen&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// GET ?accion=usuario&cedula=123456
import { db, json, ESCENAS } from '../lib/gemelos-db.mjs';
import { timingSafeEqual } from 'node:crypto';

const PULSO_MIN = 1; // cada evento "pulso" equivale a 1 minuto de uso activo

function autorizado(req) {
  const k = process.env.ADMIN_KEY || '';
  const h = req.headers.get('x-admin-key') || '';
  if (k.length < 12 || h.length !== k.length) return false;
  return timingSafeEqual(Buffer.from(h), Buffer.from(k));
}

function rango(url) {
  const d = url.searchParams.get('desde'), h = url.searchParams.get('hasta');
  const desde = d ? new Date(d + 'T00:00:00-05:00') : new Date(Date.now() - 30 * 864e5);
  const hasta = h ? new Date(h + 'T23:59:59-05:00') : new Date();
  return { desde: isNaN(desde) ? new Date(Date.now() - 30 * 864e5) : desde, hasta: isNaN(hasta) ? new Date() : hasta };
}

export default async (req) => {
  if (req.method !== 'GET') return json(405, { ok: false, error: 'Método no permitido' });
  if (!autorizado(req)) return json(401, { ok: false, error: 'Clave de administrador incorrecta' });
  const url = new URL(req.url);
  const accion = url.searchParams.get('accion') || 'resumen';
  try {
    const d = await db();
    const ev = d.collection('eventos'), us = d.collection('usuarios');

    if (accion === 'resumen') {
      const { desde, hasta } = rango(url);
      const m = { t: { $gte: desde, $lte: hasta } };
      const [usuarios, porEscena, porDia, porUsuario, porLenguaje, totales] = await Promise.all([
        us.find({}, { projection: { _id: 0, cedula: 1, nombre: 1, creado: 1, ultimoIngreso: 1, ingresos: 1 } }).sort({ ultimoIngreso: -1 }).limit(2000).toArray(),
        ev.aggregate([{ $match: { ...m, escena: { $ne: null } } },
          { $group: { _id: '$escena', minutos: { $sum: { $cond: [{ $eq: ['$tipo', 'pulso'] }, PULSO_MIN, 0] } }, aperturas: { $sum: { $cond: [{ $eq: ['$tipo', 'escena'] }, 1, 0] } }, usuarios: { $addToSet: '$cedula' } } },
          { $project: { _id: 0, escena: '$_id', minutos: 1, aperturas: 1, usuarios: { $size: '$usuarios' } } }]).toArray(),
        ev.aggregate([{ $match: m },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$t', timezone: '-05:00' } }, usuarios: { $addToSet: '$cedula' }, minutos: { $sum: { $cond: [{ $eq: ['$tipo', 'pulso'] }, PULSO_MIN, 0] } } } },
          { $project: { _id: 0, dia: '$_id', usuarios: { $size: '$usuarios' }, minutos: 1 } }, { $sort: { dia: 1 } }]).toArray(),
        ev.aggregate([{ $match: m },
          { $group: { _id: '$cedula', minutos: { $sum: { $cond: [{ $eq: ['$tipo', 'pulso'] }, PULSO_MIN, 0] } }, sesiones: { $addToSet: '$sesion' }, escenas: { $addToSet: '$escena' },
            ejecuciones: { $sum: { $cond: [{ $and: [{ $eq: ['$tipo', 'plc'] }, { $eq: ['$datos.run', true] }] }, 1, 0] } }, ultimo: { $max: '$t' } } },
          { $project: { _id: 0, cedula: '$_id', minutos: 1, sesiones: { $size: '$sesiones' }, escenas: { $filter: { input: '$escenas', cond: { $ne: ['$$this', null] } } }, ejecuciones: 1, ultimo: 1 } }]).toArray(),
        ev.aggregate([{ $match: { ...m, tipo: 'lenguaje' } }, { $group: { _id: '$datos.lenguaje', n: { $sum: 1 } } }, { $project: { _id: 0, lenguaje: '$_id', n: 1 } }]).toArray(),
        ev.aggregate([{ $match: m }, { $group: { _id: null, eventos: { $sum: 1 }, sesiones: { $addToSet: '$sesion' }, activos: { $addToSet: '$cedula' }, minutos: { $sum: { $cond: [{ $eq: ['$tipo', 'pulso'] }, PULSO_MIN, 0] } } } },
          { $project: { _id: 0, eventos: 1, sesiones: { $size: '$sesiones' }, activos: { $size: '$activos' }, minutos: 1 } }]).toArray()
      ]);
      const pu = Object.fromEntries(porUsuario.map(x => [x.cedula, x]));
      const tabla = usuarios.map(u => ({ ...u, ...(pu[u.cedula] || { minutos: 0, sesiones: 0, escenas: [], ejecuciones: 0, ultimo: null }) }));
      const esc = ESCENAS.map(e => porEscena.find(x => x.escena === e) || { escena: e, minutos: 0, aperturas: 0, usuarios: 0 });
      return json(200, { ok: true, desde, hasta, totales: { registrados: usuarios.length, ...(totales[0] || { eventos: 0, sesiones: 0, activos: 0, minutos: 0 }) }, escenas: esc, dias: porDia, lenguajes: porLenguaje, usuarios: tabla });
    }

    if (accion === 'usuario') {
      const cedula = String(url.searchParams.get('cedula') || '');
      if (!/^[0-9]{5,12}$/.test(cedula)) return json(400, { ok: false, error: 'Cédula inválida' });
      const [u, eventos] = await Promise.all([
        us.findOne({ cedula }, { projection: { _id: 0 } }),
        ev.find({ cedula, tipo: { $ne: 'pulso' } }, { projection: { _id: 0, cedula: 0 } }).sort({ t: -1 }).limit(500).toArray()
      ]);
      if (!u) return json(404, { ok: false, error: 'No existe ese usuario' });
      return json(200, { ok: true, usuario: u, eventos });
    }

    return json(400, { ok: false, error: 'Acción desconocida' });
  } catch (e) {
    console.error('gemelo-admin', e.message);
    return json(500, { ok: false, error: 'Error del servidor' });
  }
};

export const config = { path: '/api/gemelos/admin' };
