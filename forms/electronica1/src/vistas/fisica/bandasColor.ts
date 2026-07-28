/* =========================================================================
   bandasColor.ts — Valor de resistencia a codigo de cuatro bandas.

   Las bandas NO son decoracion. La leccion 1 consiste en leerlas y deducir
   el valor, asi que tienen que salir del valor real del componente. Si se
   dibujaran bandas cualesquiera, la leccion no tendria sentido.

   Codigo de 4 bandas: dos digitos significativos, multiplicador y
   tolerancia.
   ========================================================================= */

import { descomponer } from "@/motor/valores";

export interface Banda {
  /** Nombre del color, para el texto alternativo y la ayuda emergente. */
  nombre: string;
  /** Color real de la banda. Aqui el color ES el dato. */
  hex: string;
  /** Que significa esta banda. */
  papel: "digito" | "multiplicador" | "tolerancia";
  /** Valor que representa: digito, exponente o porcentaje. */
  valor: number;
}

/** Colores del codigo, en orden de digito 0 a 9. */
export const COLORES_DIGITO = [
  { nombre: "negro", hex: "#1c1c1c" },
  { nombre: "marrón", hex: "#6b4423" },
  { nombre: "rojo", hex: "#c62828" },
  { nombre: "naranja", hex: "#e8710a" },
  { nombre: "amarillo", hex: "#f0c419" },
  { nombre: "verde", hex: "#2e7d32" },
  { nombre: "azul", hex: "#1565c0" },
  { nombre: "violeta", hex: "#7b1fa2" },
  { nombre: "gris", hex: "#9e9e9e" },
  { nombre: "blanco", hex: "#f2f2f2" },
] as const;

const ORO = { nombre: "oro", hex: "#c9a227" };
const PLATA = { nombre: "plata", hex: "#c0c4c8" };
const SIN_BANDA = { nombre: "sin banda", hex: "transparent" };

/** Colores de tolerancia, del mas fino al mas grosero. */
const TOLERANCIAS: { pct: number; nombre: string; hex: string }[] = [
  { pct: 0.05, ...COLORES_DIGITO[8] },
  { pct: 0.1, ...COLORES_DIGITO[7] },
  { pct: 0.25, ...COLORES_DIGITO[6] },
  { pct: 0.5, ...COLORES_DIGITO[5] },
  { pct: 1, ...COLORES_DIGITO[1] },
  { pct: 2, ...COLORES_DIGITO[2] },
  { pct: 5, ...ORO },
  { pct: 10, ...PLATA },
  { pct: 20, ...SIN_BANDA },
];

/** Banda de tolerancia para un porcentaje dado. */
export function bandaDeTolerancia(toleranciaPct: number): Banda {
  const encontrada =
    TOLERANCIAS.find((t) => Math.abs(t.pct - toleranciaPct) < 1e-9) ??
    // Si el valor no es uno de los normalizados, se usa el inmediatamente
    // mas grosero: nunca se promete mas precision de la que hay.
    TOLERANCIAS.find((t) => t.pct >= toleranciaPct) ??
    TOLERANCIAS[TOLERANCIAS.length - 1]!;

  return {
    nombre: encontrada.nombre,
    hex: encontrada.hex,
    papel: "tolerancia",
    valor: encontrada.pct,
  };
}

/**
 * Las cuatro bandas de una resistencia.
 *
 * Se devuelve siempre en el orden en que se leen: digito, digito,
 * multiplicador, tolerancia.
 */
export function bandasDe(valorOhm: number, toleranciaPct = 5): Banda[] {
  if (!(valorOhm > 0) || !Number.isFinite(valorOhm)) {
    return [
      { ...COLORES_DIGITO[0], papel: "digito", valor: 0 },
      { ...COLORES_DIGITO[0], papel: "digito", valor: 0 },
      { ...COLORES_DIGITO[0], papel: "multiplicador", valor: 0 },
      bandaDeTolerancia(toleranciaPct),
    ];
  }

  let { mantisa, exponente } = descomponer(valorOhm);

  let d1 = Math.floor(mantisa);
  let d2 = Math.round((mantisa - d1) * 10);

  // 9,97 redondea a 9 y 10: hay que subir de decada.
  if (d2 >= 10) {
    d2 = 0;
    d1 += 1;
  }
  if (d1 >= 10) {
    d1 = 1;
    d2 = 0;
    exponente += 1;
  }

  // valor = (10·d1 + d2) × 10^(exponente−1)
  const multiplicador = exponente - 1;

  return [
    { ...COLORES_DIGITO[d1]!, papel: "digito", valor: d1 },
    { ...COLORES_DIGITO[d2]!, papel: "digito", valor: d2 },
    bandaMultiplicadora(multiplicador),
    bandaDeTolerancia(toleranciaPct),
  ];
}

function bandaMultiplicadora(exponente: number): Banda {
  if (exponente === -1) {
    return { ...ORO, papel: "multiplicador", valor: -1 };
  }
  if (exponente === -2) {
    return { ...PLATA, papel: "multiplicador", valor: -2 };
  }
  const indice = Math.max(0, Math.min(9, exponente));
  return {
    ...COLORES_DIGITO[indice]!,
    papel: "multiplicador",
    valor: indice,
  };
}

/**
 * Vuelve del codigo al valor. Es la operacion que hace el estudiante en la
 * leccion 1, y sirve para comprobar que las bandas dibujadas son correctas.
 */
export function valorDeBandas(bandas: Banda[]): number {
  const [d1, d2, mult] = bandas;
  if (!d1 || !d2 || !mult) return 0;
  return (d1.valor * 10 + d2.valor) * Math.pow(10, mult.valor);
}

/** Lectura en palabras: "marrón, negro, rojo, oro". */
export function leerBandas(bandas: Banda[]): string {
  return bandas.map((b) => b.nombre).join(", ");
}
