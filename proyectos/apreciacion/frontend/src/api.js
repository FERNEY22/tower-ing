// Modo ESTÁTICO: la app lee snapshots JSON de /datos (generados con
// etl/construir_snapshots.py). No requiere backend ni base de datos corriendo.
// Para regenerar los datos: levantar el backend y correr el generador de nuevo.

const _cache = {};
function jload(name) {
  if (!_cache[name]) {
    _cache[name] = fetch(`/datos/${name}.json`).then((r) => {
      if (!r.ok) throw new Error(`No se pudo cargar ${name}.json`);
      return r.json();
    });
  }
  return _cache[name];
}

const k = (v) => (v == null ? "" : v);

export const api = {
  anios: () => jload("anios"),
  filtros: async (anio) => (await jload("filtros"))[String(anio)] || { estamento: [], programa: [] },
  tablero: async (anio, f = {}) =>
    (await jload("tablero"))[`${anio}|${k(f.estamento)}|${k(f.programa)}|${k(f.base)}`],
  comparativo: async (anio, f = {}) =>
    (await jload("comparativo"))[`${anio}|${k(f.estamento)}`],
  historico: () => jload("historico"),
  historicoCaracteristicas: () => jload("historico_caracteristicas"),
  instrumento2025: () => jload("instrumento2025"),
  cobertura: () => jload("cobertura"),
};
