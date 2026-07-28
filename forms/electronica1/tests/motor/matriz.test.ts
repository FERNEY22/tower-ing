import { describe, it, expect } from "vitest";
import {
  ceros,
  multiplicar,
  normaMaxima,
  residuoMaximo,
  resolverSistema,
  SistemaSingular,
} from "@/motor/matriz";

describe("utilidades de matriz", () => {
  it("crea matrices de ceros con la forma pedida", () => {
    const A = ceros(2, 3);
    expect(A).toHaveLength(2);
    expect(A[0]).toHaveLength(3);
    expect(A.flat().every((v) => v === 0)).toBe(true);
  });

  it("multiplica matriz por vector", () => {
    expect(multiplicar([[1, 2], [3, 4]], [5, 6])).toEqual([17, 39]);
  });

  it("calcula la norma maxima", () => {
    expect(normaMaxima([[1, -7], [3, 2]])).toBe(7);
  });
});

describe("eliminacion gaussiana con pivoteo parcial", () => {
  it("resuelve un sistema pequeño", () => {
    const x = resolverSistema([[2, 1], [1, 3]], [5, 10]);
    expect(x[0]).toBeCloseTo(1, 12);
    expect(x[1]).toBeCloseTo(3, 12);
  });

  it("resuelve con cero en la diagonal, que es donde falla sin pivoteo", () => {
    // El bloque D de MNA es todo ceros: este caso aparece en cada circuito
    // con una fuente de tension.
    const A = [
      [0, 1],
      [1, 0],
    ];
    const x = resolverSistema(A, [3, 4]);
    expect(x[0]).toBeCloseTo(4, 12);
    expect(x[1]).toBeCloseTo(3, 12);
  });

  it("no modifica los argumentos", () => {
    const A = [[2, 1], [1, 3]];
    const b = [5, 10];
    resolverSistema(A, b);
    expect(A).toEqual([[2, 1], [1, 3]]);
    expect(b).toEqual([5, 10]);
  });

  it("resuelve una escalera con conductancias de rango enorme", () => {
    // Conductancias de 1e-12 (gmin) a 1e3 conviviendo: el rango real de MNA.
    // Un sistema asi tiene un numero de condicion altisimo, de modo que lo
    // exigible es un residuo RELATIVO pequeño, no uno absoluto: la solucion
    // tiene componentes del orden de 1e12 y un residuo absoluto de 1e-9
    // seria mejor que la precision del propio double.
    const A = [
      [1e3 + 1e-12, -1e3, 0],
      [-1e3, 1e3 + 1e-3 + 1e-12, -1e-3],
      [0, -1e-3, 1e-3 + 1e-12],
    ];
    const b = [1, 0, 0];
    const x = resolverSistema(A, b);

    expect(x.every(Number.isFinite)).toBe(true);
    const escala = normaMaxima(A) * Math.max(...x.map(Math.abs));
    expect(residuoMaximo(A, x, b) / escala).toBeLessThan(1e-12);
  });

  it("resuelve una escalera de valores moderados con residuo minusculo", () => {
    // La matriz tipica de un divisor con gmin: nada patologico.
    const A = [
      [1e-3 + 1e-12, -1e-3],
      [-1e-3, 1e-3 + 5e-4 + 1e-12],
    ];
    const b = [1e-3 * 9, 0];
    const x = resolverSistema(A, b);
    expect(residuoMaximo(A, x, b)).toBeLessThan(1e-15);
  });

  it("resuelve un sistema de ocho incognitas", () => {
    const n = 8;
    const A = ceros(n, n);
    const xEsperado = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) A[i]![j] = 1 / (i + j + 1); // Hilbert
    }
    const b = multiplicar(A, xEsperado);
    const x = resolverSistema(A, b);
    for (let i = 0; i < n; i++) expect(x[i]).toBeCloseTo(xEsperado[i]!, 3);
  });

  it("avisa de que el sistema es singular en lugar de devolver basura", () => {
    expect(() => resolverSistema([[1, 2], [2, 4]], [1, 2])).toThrow(
      SistemaSingular,
    );
  });

  it("una fila entera de ceros tambien es singular", () => {
    expect(() => resolverSistema([[1, 2], [0, 0]], [1, 0])).toThrow(
      SistemaSingular,
    );
  });

  it("el sistema vacio devuelve solucion vacia", () => {
    expect(resolverSistema([], [])).toEqual([]);
  });

  it("rechaza dimensiones incompatibles", () => {
    expect(() => resolverSistema([[1, 2]], [1, 2])).toThrow(/incompatibles/i);
  });
});
