/* =========================================================================
   PUERTA DE LA FASE 3 (2/6) — Caso B de la especificacion (§11)

   LED rojo con resistencia limitadora: fuente 5 V, R = 330 Ω.
   Esperado: Vled entre 1,85 y 1,95 V, I entre 9,2 y 9,6 mA, y el LED no se
   quema.

   Es el circuito de la leccion 2: exactamente lo que el estudiante tiene que
   calcular a mano antes de montarlo.
   ========================================================================= */

import { describe, it, expect } from "vitest";
import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import { resolver } from "@/motor";
import { LIMITES } from "@/config";

function ledConLimitadora(resistenciaOhm = 330, alimentacionV = 5): Circuito {
  return {
    componentes: [
      crearComponente("fuenteDC", "v1", { tensionV: alimentacionV }),
      crearComponente("resistencia", "r1", { valorOhm: resistenciaOhm }),
      crearComponente("led", "d1", { color: "rojo" }),
      crearComponente("tierra", "gnd"),
    ],
    cables: [
      cable("w1", "v1:positivo", "r1:a"),
      cable("w2", "r1:b", "d1:anodo"),
      cable("w3", "d1:catodo", "v1:negativo"),
      cable("w4", "v1:negativo", "gnd:ref"),
    ],
  };
}

describe("Caso B · LED rojo con resistencia de 330 Ω a 5 V", () => {
  const s = resolver(ledConLimitadora());
  const led = s.componentes.get("d1")!;
  const r = s.componentes.get("r1")!;

  it("converge sin diagnosticos", () => {
    expect(s.ok).toBe(true);
    expect(s.diagnosticos).toEqual([]);
  });

  it("Vled queda entre 1,85 y 1,95 V", () => {
    expect(led.tensionV).toBeGreaterThanOrEqual(1.85);
    expect(led.tensionV).toBeLessThanOrEqual(1.95);
  });

  it("la corriente queda entre 9,2 y 9,6 mA", () => {
    expect(led.corrienteA).toBeGreaterThanOrEqual(0.0092);
    expect(led.corrienteA).toBeLessThanOrEqual(0.0096);
  });

  it("el LED no se quema: la corriente esta por debajo del limite", () => {
    expect(led.corrienteA).toBeLessThan(LIMITES.ledCorrienteMaxA);
  });

  it("KVL se cumple: la caida del LED mas la de R suman la alimentacion", () => {
    expect(led.tensionV + r.tensionV).toBeCloseTo(5, 6);
  });

  it("la misma corriente pasa por la resistencia y por el LED", () => {
    expect(r.corrienteA).toBeCloseTo(led.corrienteA, 9);
  });

  it("resuelve en pocas iteraciones", () => {
    expect(s.iteraciones).toBeGreaterThan(1); // es no lineal, ha iterado
    expect(s.iteraciones).toBeLessThan(30);
  });
});

describe("Caso B · el LED conduce en un solo sentido", () => {
  it("montado al reves practicamente no conduce", () => {
    const c = ledConLimitadora();
    // Se invierten anodo y catodo: el error de la leccion 3.
    c.cables = [
      cable("w1", "v1:positivo", "r1:a"),
      cable("w2", "r1:b", "d1:catodo"),
      cable("w3", "d1:anodo", "v1:negativo"),
      cable("w4", "v1:negativo", "gnd:ref"),
    ];

    const s = resolver(c);
    expect(s.ok).toBe(true);
    const led = s.componentes.get("d1")!;
    expect(Math.abs(led.corrienteA)).toBeLessThan(1e-6);
    // Casi toda la tension se queda sobre el LED, no sobre la resistencia.
    expect(Math.abs(led.tensionV)).toBeGreaterThan(4.9);
  });
});

describe("Caso B · sin resistencia limitadora", () => {
  it("la corriente se dispara por encima del limite del LED", () => {
    // El circuito de la averia de la leccion 2. Con 1 mΩ, que es lo mas
    // parecido a "un cable" que admite el modelo.
    const s = resolver(ledConLimitadora(0.001));
    expect(s.ok).toBe(true);
    const led = s.componentes.get("d1")!;
    expect(led.corrienteA).toBeGreaterThan(LIMITES.ledCorrienteMaxA);
  });
});
