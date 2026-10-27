// Conexión compartida a MongoDB Atlas para las funciones de los gemelos digitales.
// La cadena de conexión vive solo en la variable de entorno MONGODB_URI de Netlify.
import { MongoClient } from 'mongodb';

let clientPromise = null;

export async function db() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Falta la variable de entorno MONGODB_URI');
  if (!clientPromise) {
    const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 });
    clientPromise = client.connect().then(async c => {
      const d = c.db(process.env.MONGODB_DB || 'gemelos');
      await Promise.all([
        d.collection('usuarios').createIndex({ cedula: 1 }, { unique: true }),
        d.collection('eventos').createIndex({ cedula: 1, t: -1 }),
        d.collection('eventos').createIndex({ t: -1 }),
        d.collection('eventos').createIndex({ sesion: 1 })
      ]);
      return c;
    }).catch(e => { clientPromise = null; throw e; });
  }
  const c = await clientPromise;
  return c.db(process.env.MONGODB_DB || 'gemelos');
}

export const json = (status, body, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }
});

export const ESCENAS = ['banda', 'semaforo', 'electroneumatica', 'agua', 'energia', 'manufactura', 'alimentos', 'logistica', 'edificios'];
export const TIPOS = ['ingreso', 'escena', 'lenguaje', 'plc', 'modulo', 'ejemplo', 'guardar', 'exportar', 'pulso', 'salida'];
