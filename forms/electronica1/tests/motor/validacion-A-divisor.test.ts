/* =========================================================================
   PUERTA DE LA FASE 2 — Caso A de la especificacion (§11)

   Divisor resistivo: fuente 9 V, R1 = 1 kΩ, R2 = 2 kΩ en serie.
   Esperado: V(R2) = 6,000 V e I = 3,000 mA, con tolerancia del 0,1 %.

   Si esta prueba no pasa, no se avanza a los elementos no lineales.
   ========================================================================= */

import { describe, it, expect } from "vitest";
import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import { resolverLineal, corrienteDe, tensionDe } from "@/motor/solverLineal";

/** Tolerancia del 0,1 % que exige la especificacion. */
function dentroDelUnoPorMil(medido: number, esperado: number): boolean {
  return Math.abs(medido - esperado) <= Math.abs(esperado) * 0.001;
}

function divisor(): Circuito {
  return {
    componentes: [
      crearComponente("fuenteDC", "v1", { tensionV: 9 }),
      crearComponente("resistencia", "r1", { valorOhm: 1000 }),
      crearComponente("resistencia", "r2", { valorOhm: 2000 }),
      crearComponente("tierra", "gnd"),
    ],
    cables: [
      cable("w1", "v1:positivo", "r1:a"),
      cable("w2", "r1:b", "r2:a"),
      cable("w3", "r2:b", "v1:negativo"),
      cable("w4", "v1:negativo", "gnd:ref"),
    ],
  };
}

describe("Caso A · divisor resistivo 9 V con 1 kΩ y 2 kΩ", () => {
  const s = resolverLineal(divisor());

  it("resuelve sin diagnosticos", () => {
    expect(s.ok).toBe(true);
    expect(s.diagnosticos).toEqual([]);
  });

  it("V(R2) = 6,000 V con tolerancia del 0,1 %", () => {
    const v = tensionDe(s, "r2");
    expect(dentroDelUnoPorMil(v, 6)).toBe(true);
    expect(v).toBeCloseTo(6, 6);
  });

  it("I = 3,000 mA con tolerancia del 0,1 %", () => {
    const i = corrienteDe(s, "r1");
    expect(dentroDelUnoPorMil(i, 0.003)).toBe(true);
    expect(i).toBeCloseTo(0.003, 9);
  });

  it("V(R1) = 3,000 V: las dos caidas suman la tension de la fuente", () => {
    expect(tensionDe(s, "r1")).toBeCloseTo(3, 6);
    expect(tensionDe(s, "r1") + tensionDe(s, "r2")).toBeCloseTo(9, 6);
  });

  it("la misma corriente atraviesa las dos resistencias", () => {
    // No son identicas al ultimo bit: gmin (1e-12 S) deriva a referencia una
    // fuga proporcional a la tension del nodo, del orden de 6e-12 A aqui. Es
    // el precio de no tener matrices singulares, y esta doce ordenes de
    // magnitud por debajo de cualquier cosa medible.
    expect(corrienteDe(s, "r1")).toBeCloseTo(corrienteDe(s, "r2"), 9);
  });

  it("la fuga de gmin se mantiene por debajo del nanoamperio", () => {
    const fuga = Math.abs(corrienteDe(s, "r1") - corrienteDe(s, "r2"));
    expect(fuga).toBeGreaterThan(0); // existe: gmin esta puesto
    expect(fuga).toBeLessThan(1e-9); // e importa cero
  });

  it("la fuente entrega 3,000 mA, en positivo", () => {
    const i = corrienteDe(s, "v1");
    expect(i).toBeGreaterThan(0); // entregar es positivo, no negativo
    expect(i).toBeCloseTo(0.003, 9);
  });

  it("la potencia entregada es la suma de la disipada", () => {
    const fuente = s.componentes.get("v1")!.potenciaW;
    const disipada =
      s.componentes.get("r1")!.potenciaW + s.componentes.get("r2")!.potenciaW;
    expect(fuente).toBeCloseTo(disipada, 9);
    expect(fuente).toBeCloseTo(9 * 0.003, 9);
  });

  it("la referencia queda exactamente en 0 V", () => {
    expect(s.tensiones.get(s.referencia!.nodoId)).toBe(0);
  });
});

describe("Caso A · variantes que no deben cambiar el resultado", () => {
  it("da lo mismo sin tierra explicita, tomando el negativo de la fuente", () => {
    const c = divisor();
    c.componentes = c.componentes.filter((x) => x.id !== "gnd");
    c.cables = c.cables.filter((w) => w.id !== "w4");

    const s = resolverLineal(c);
    expect(tensionDe(s, "r2")).toBeCloseTo(6, 6);
    expect(corrienteDe(s, "r1")).toBeCloseTo(0.003, 9);
  });

  it("da lo mismo con el orden de los componentes cambiado", () => {
    const c = divisor();
    c.componentes.reverse();
    c.cables.reverse();

    const s = resolverLineal(c);
    expect(tensionDe(s, "r2")).toBeCloseTo(6, 6);
    expect(corrienteDe(s, "r1")).toBeCloseTo(0.003, 9);
  });

  it("gmin no contamina el resultado a la precision exigida", () => {
    // Con gmin diez ordenes de magnitud mayor, el 0,1 % debe seguir cumpliendose.
    const s = resolverLineal(divisor(), { gmin: 1e-2 * 1e-6 });
    expect(dentroDelUnoPorMil(tensionDe(s, "r2"), 6)).toBe(true);
  });
});
