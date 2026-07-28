/* =========================================================================
   valores.ts — Serie E12 y formato de magnitudes.

   La leccion 1 consiste en leer bandas de colores, asi que los valores de
   resistencia tienen que ser valores reales de catalogo. Un 1234 Ω no existe
   en una gaveta y no se puede representar con cuatro bandas.

   El calculo de las bandas en si NO esta aqui: es presentacion y vive en
   vistas/fisica/bandasColor.ts. Aqui solo esta el valor.
   ========================================================================= */

/** Mantisas normalizadas de la serie E12 (tolerancia 10 % y 5 %). */
export const SERIE_E12 = [
  1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2,
] as const;

/** Descompone un valor en mantisa [1,10) y exponente decimal. */
export function descomponer(valor: number): { mantisa: number; exponente: number } {
  if (valor <= 0) return { mantisa: 0, exponente: 0 };
  const exponente = Math.floor(Math.log10(valor));
  const mantisa = valor / Math.pow(10, exponente);
  // log10 en coma flotante puede dejar la mantisa justo fuera del rango.
  if (mantisa >= 10) return { mantisa: mantisa / 10, exponente: exponente + 1 };
  if (mantisa < 1) return { mantisa: mantisa * 10, exponente: exponente - 1 };
  return { mantisa, exponente };
}

/** True si el valor pertenece a la serie E12, con margen de redondeo. */
export function esE12(valor: number, margenRelativo = 0.01): boolean {
  if (valor <= 0) return false;
  const { mantisa } = descomponer(valor);
  return SERIE_E12.some((m) => Math.abs(mantisa - m) / m <= margenRelativo);
}

/** Valor E12 mas cercano, en escala logaritmica. */
export function e12MasCercano(valor: number): number {
  if (valor <= 0) return SERIE_E12[0]!;
  const { mantisa, exponente } = descomponer(valor);

  // Anotado como number: SERIE_E12 es `as const` y sin esto el tipo se
  // estrecharia al literal 1.
  let mejor: number = SERIE_E12[0]!;
  let mejorDistancia = Infinity;
  for (const m of SERIE_E12) {
    // Distancia logaritmica: 100 y 120 estan tan cerca como 1000 y 1200.
    const d = Math.abs(Math.log10(mantisa / m));
    if (d < mejorDistancia) {
      mejorDistancia = d;
      mejor = m;
    }
  }
  // La decada tambien puede estar mas cerca por arriba: 9,5 -> 10, no -> 8,2.
  const porArriba = Math.abs(Math.log10(mantisa / 10));
  if (porArriba < mejorDistancia) {
    return redondearRuido(Math.pow(10, exponente + 1));
  }
  return redondearRuido(mejor * Math.pow(10, exponente));
}

/** Quita la basura de coma flotante: 219.99999999997 -> 220. */
function redondearRuido(valor: number): number {
  return Number(valor.toPrecision(12));
}

/* ------------------------------------------------------------- formato */

interface Prefijo {
  factor: number;
  simbolo: string;
}

const PREFIJOS: Prefijo[] = [
  { factor: 1e9, simbolo: "G" },
  { factor: 1e6, simbolo: "M" },
  { factor: 1e3, simbolo: "k" },
  { factor: 1, simbolo: "" },
  { factor: 1e-3, simbolo: "m" },
  { factor: 1e-6, simbolo: "µ" },
  { factor: 1e-9, simbolo: "n" },
  { factor: 1e-12, simbolo: "p" },
];

/**
 * Formatea con prefijo del SI y coma decimal, como se escribe en el curso.
 * formatearMagnitud(1500, "Ω")   -> "1,5 kΩ"
 * formatearMagnitud(0.0092, "A") -> "9,2 mA"
 */
export function formatearMagnitud(
  valor: number,
  unidad: string,
  cifrasSignificativas = 3,
): string {
  if (!Number.isFinite(valor)) return `— ${unidad}`;
  if (valor === 0) return `0 ${unidad}`;

  const signo = valor < 0 ? "-" : "";
  const abs = Math.abs(valor);

  const prefijo =
    PREFIJOS.find((p) => abs >= p.factor) ?? PREFIJOS[PREFIJOS.length - 1]!;
  const escalado = abs / prefijo.factor;

  const texto = Number(escalado.toPrecision(cifrasSignificativas))
    .toString()
    .replace(".", ",");

  return `${signo}${texto} ${prefijo.simbolo}${unidad}`;
}

export function formatearOhm(valor: number): string {
  return formatearMagnitud(valor, "Ω");
}

export function formatearVoltios(valor: number, cifras = 4): string {
  return formatearMagnitud(valor, "V", cifras);
}

export function formatearAmperios(valor: number, cifras = 4): string {
  return formatearMagnitud(valor, "A", cifras);
}

export function formatearVatios(valor: number, cifras = 3): string {
  return formatearMagnitud(valor, "W", cifras);
}
