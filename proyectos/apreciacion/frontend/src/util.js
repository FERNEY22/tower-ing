// Color de una nota segun su fracción de la escala (0..1) — verde alto, rojo bajo.
export function colorFrac(frac) {
  if (frac == null) return "#1a2029";
  const t = Math.max(0, Math.min(1, (frac - 0.5) / 0.5)); // 50%..100% -> 0..1
  const hue = 6 + t * 130; // rojo -> verde
  return `hsl(${hue} 58% ${26 + t * 12}%)`;
}
// color para nota en escala nativa (value / escalaMax)
export const colorNota = (v, escalaMax) =>
  v == null ? "#1a2029" : colorFrac(v / escalaMax);
// color para 0-100
export const color100 = (v) => (v == null ? "#1a2029" : colorFrac(v / 100));

export const nfmt = (n) => (n == null ? "–" : n.toLocaleString("es-CO"));

// --- Agrupación de programas por FACULTAD (ETITC) y nivel de formación ---
// Facultades y cadenas propedéuticas oficiales (etitc.edu.co):
//  Sistemas: Computación → Desarrollo de Software → Ing. de Sistemas
//  Mecatrónica: Electrónica Industrial → Automatización Industrial → Ing. Mecatrónica
//  Electromecánica: Mantenimiento Industrial → Montajes Industriales → Ing. Electromecánica
//  Mecánica: Dibujo Mecánico → Gestión de Fabricación Mecánica → Ing. Mecánica
//  Procesos Industriales: Procesos de Manufactura → Producción Industrial → Ing. de Procesos
const _norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Se evalúa en este orden: gana la primera coincidencia. El orden cuida las
// colisiones de substring (electromecánica/mecatrónica antes que "mecanic").
const AREAS = [
  { area: "Seguridad y Salud en el Trabajo", kw: ["seguridad y salud", "salud en el trabajo"] },
  { area: "Licenciatura en Tecnología", kw: ["licenciatura", "pedagog"] },
  { area: "Sistemas", kw: ["sistemas", "software", "computacion", "internet de las cosas", "dispositivos", "informatic"] },
  { area: "Mecatrónica", kw: ["mecatronica", "electronica", "automatizacion", "instrumentacion"] },
  { area: "Electromecánica", kw: ["electromecanica", "mantenimiento", "montajes", "media tension", "redes", "energia electrica", "distribucion"] },
  { area: "Mecánica", kw: ["mecanic", "dibujo", "fabricacion", "maquinas", "herramientas"] },
  { area: "Procesos Industriales", kw: ["procesos", "manufactura", "produccion"] },
];
// Orden de presentación: las 5 facultades por ciclos propedéuticos y luego las demás.
const AREA_ORDER = [
  "Sistemas", "Mecatrónica", "Electromecánica", "Mecánica", "Procesos Industriales",
  "Seguridad y Salud en el Trabajo", "Licenciatura en Tecnología", "Otros",
];

// Nivel de formación (para ordenar dentro de un área): Técnica → Tecnología → Ingeniería → Especialización.
const NIVELES = [
  { nivel: "Especialización", ord: 4, kw: ["especializacion"] },
  { nivel: "Ingeniería", ord: 3, kw: ["ingenieria", "licenciatura"] },
  { nivel: "Tecnología", ord: 2, kw: ["tecnologia", "tecnologica"] },
  { nivel: "Técnica", ord: 1, kw: ["tecnica"] },
];

export function areaPrograma(nombre) {
  const n = _norm(nombre);
  const hit = AREAS.find((a) => a.kw.some((k) => n.includes(k)));
  const area = hit ? hit.area : "Otros";
  return { area, areaOrd: AREA_ORDER.indexOf(area) };
}

export function nivelPrograma(nombre) {
  const n = _norm(nombre);
  const hit = NIVELES.find((v) => v.kw.some((k) => n.includes(k)));
  return hit ? { nivel: hit.nivel, nivelOrd: hit.ord } : { nivel: "", nivelOrd: 9 };
}

// Ordena programas agrupando por área y, dentro de cada área, por nivel y nombre.
export function ordenarProgramas(programas) {
  return [...programas].sort((a, b) => {
    const aa = areaPrograma(a), ba = areaPrograma(b);
    if (aa.areaOrd !== ba.areaOrd) return aa.areaOrd - ba.areaOrd;
    const an = nivelPrograma(a), bn = nivelPrograma(b);
    if (an.nivelOrd !== bn.nivelOrd) return an.nivelOrd - bn.nivelOrd;
    return a.localeCompare(b, "es");
  });
}
