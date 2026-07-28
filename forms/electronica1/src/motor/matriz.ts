/* =========================================================================
   matriz.ts — Algebra lineal densa.

   Los circuitos del curso tienen menos de 50 nodos, asi que una matriz densa
   sobra y una dispersa solo añadiria complejidad. Eliminacion gaussiana con
   pivoteo parcial: sin el pivoteo, un cero en la diagonal —que en MNA
   aparece constantemente, porque el bloque D es todo ceros— rompe el metodo.

   Este archivo no sabe nada de circuitos. Se prueba solo.
   ========================================================================= */

import { MOTOR } from "@/config";

export type Matriz = number[][];
export type Vector = number[];

/** Matriz de ceros de n×m. */
export function ceros(filas: number, columnas: number): Matriz {
  return Array.from({ length: filas }, () => new Array<number>(columnas).fill(0));
}

export function vectorCeros(n: number): Vector {
  return new Array<number>(n).fill(0);
}

export function copiarMatriz(A: Matriz): Matriz {
  return A.map((fila) => [...fila]);
}

/** Mayor valor absoluto de la matriz. Sirve para escalar la tolerancia. */
export function normaMaxima(A: Matriz): number {
  let max = 0;
  for (const fila of A) {
    for (const v of fila) {
      const abs = Math.abs(v);
      if (abs > max) max = abs;
    }
  }
  return max;
}

export function multiplicar(A: Matriz, x: Vector): Vector {
  const n = A.length;
  const y = vectorCeros(n);
  for (let i = 0; i < n; i++) {
    const fila = A[i]!;
    let suma = 0;
    for (let j = 0; j < fila.length; j++) suma += fila[j]! * x[j]!;
    y[i] = suma;
  }
  return y;
}

/** Residuo ‖A·x − b‖∞. En la fase 3 es parte del criterio de convergencia. */
export function residuoMaximo(A: Matriz, x: Vector, b: Vector): number {
  const y = multiplicar(A, x);
  let max = 0;
  for (let i = 0; i < y.length; i++) {
    const d = Math.abs(y[i]! - b[i]!);
    if (d > max) max = d;
  }
  return max;
}

export class SistemaSingular extends Error {
  constructor(public readonly columna: number) {
    super(`El sistema es singular: no hay pivote utilizable en la columna ${columna}.`);
    this.name = "SistemaSingular";
  }
}

/**
 * Resuelve A·x = b por eliminacion gaussiana con pivoteo parcial.
 * No modifica los argumentos.
 *
 * Lanza SistemaSingular si no encuentra pivote. Quien llama decide como
 * traducirlo: nunca se le enseña esta excepcion al estudiante.
 */
export function resolverSistema(A: Matriz, b: Vector): Vector {
  const n = b.length;
  if (A.length !== n) {
    throw new Error(`Dimensiones incompatibles: A es ${A.length}×? y b es ${n}.`);
  }
  if (n === 0) return [];

  const M = copiarMatriz(A);
  const y = [...b];

  // La tolerancia se escala con la magnitud de la matriz: en MNA conviven
  // conductancias de 1e-12 (gmin) con otras de 1e3, y un umbral absoluto
  // daria singular en circuitos perfectamente resolubles.
  const umbral = Math.max(normaMaxima(A), 1) * MOTOR.toleranciaPivote;

  for (let col = 0; col < n; col++) {
    // --- pivoteo parcial: la fila con el mayor |valor| en esta columna
    let filaPivote = col;
    let mayor = Math.abs(M[col]![col]!);
    for (let f = col + 1; f < n; f++) {
      const v = Math.abs(M[f]![col]!);
      if (v > mayor) {
        mayor = v;
        filaPivote = f;
      }
    }

    if (mayor <= umbral) throw new SistemaSingular(col);

    if (filaPivote !== col) {
      const tmp = M[col]!;
      M[col] = M[filaPivote]!;
      M[filaPivote] = tmp;
      const t = y[col]!;
      y[col] = y[filaPivote]!;
      y[filaPivote] = t;
    }

    // --- eliminacion hacia adelante
    const pivote = M[col]![col]!;
    for (let f = col + 1; f < n; f++) {
      const factor = M[f]![col]! / pivote;
      if (factor === 0) continue;
      M[f]![col] = 0;
      for (let c = col + 1; c < n; c++) {
        M[f]![c] = M[f]![c]! - factor * M[col]![c]!;
      }
      y[f] = y[f]! - factor * y[col]!;
    }
  }

  // --- sustitucion hacia atras
  const x = vectorCeros(n);
  for (let f = n - 1; f >= 0; f--) {
    let suma = y[f]!;
    for (let c = f + 1; c < n; c++) suma -= M[f]![c]! * x[c]!;
    x[f] = suma / M[f]![f]!;
  }

  return x;
}
