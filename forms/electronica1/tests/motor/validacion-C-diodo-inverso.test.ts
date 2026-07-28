/* =========================================================================
   PUERTA DE LA FASE 3 (3/6) — Caso C de la especificacion (§11)

   Diodo de silicio invertido: fuente 5 V, R = 1 kΩ, diodo en inversa.
   Esperado: corriente por debajo de 1 µA y practicamente toda la tension
   sobre el diodo.

   Es la averia de la leccion 3, y lo que el estudiante tiene que diagnosticar
   con el multimetro.
   ========================================================================= */

import { describe, it, expect } from "vitest";
import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import { resolver } from "@/motor";

function diodoEnSerie(invertido: boolean): Circuito {
  return {
    componentes: [
      crearComponente("fuenteDC", "v1", { tensionV: 5 }),
      crearComponente("resistencia", "r1", { valorOhm: 1000 }),
      crearComponente("diodo", "d1"),
      crearComponente("tierra", "gnd"),
    ],
    cables: [
      cable("w1", "v1:positivo", "r1:a"),
      cable("w2", "r1:b", invertido ? "d1:catodo" : "d1:anodo"),
      cable("w3", invertido ? "d1:anodo" : "d1:catodo", "v1:negativo"),
      cable("w4", "v1:negativo", "gnd:ref"),
    ],
  };
}

describe("Caso C · diodo de silicio en inversa", () => {
  const s = resolver(diodoEnSerie(true));
  const diodo = s.componentes.get("d1")!;
  const r = s.componentes.get("r1")!;

  it("converge sin diagnosticos", () => {
    expect(s.ok).toBe(true);
    expect(s.diagnosticos).toEqual([]);
  });

  it("la corriente queda por debajo de 1 µA", () => {
    expect(Math.abs(diodo.corrienteA)).toBeLessThan(1e-6);
  });

  it("practicamente toda la tension cae sobre el diodo", () => {
    expect(Math.abs(diodo.tensionV)).toBeGreaterThan(4.99);
    expect(Math.abs(r.tensionV)).toBeLessThan(0.01);
  });

  it("el diodo esta polarizado en inversa, no en directa", () => {
    // Con el catodo hacia el positivo, la tension anodo-catodo es negativa.
    expect(diodo.tensionV).toBeLessThan(0);
  });
});

describe("Caso C · el mismo circuito en directa, como contraste", () => {
  const s = resolver(diodoEnSerie(false));
  const diodo = s.componentes.get("d1")!;

  it("cae 0,7 V, que es lo que enseña el curso", () => {
    expect(diodo.tensionV).toBeGreaterThan(0.6);
    expect(diodo.tensionV).toBeLessThan(0.75);
  });

  it("circula la corriente que predice el calculo a mano", () => {
    // (5 − 0,7) / 1000 = 4,3 mA
    expect(diodo.corrienteA).toBeCloseTo(0.0043, 4);
  });

  it("invertirlo cambia la corriente en mas de tres ordenes de magnitud", () => {
    const inverso = resolver(diodoEnSerie(true));
    const iInverso = Math.abs(inverso.componentes.get("d1")!.corrienteA);
    expect(diodo.corrienteA / Math.max(iInverso, 1e-15)).toBeGreaterThan(1e3);
  });
});
