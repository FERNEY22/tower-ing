/* =========================================================================
   PUERTA DE LA FASE 3 (5/6) — Prueba de estres de convergencia (§11)

   Diez diodos en serie con una fuente de 15 V. Debe converger SIN recurrir
   al escalonamiento de gmin.

   Lo que se mide aqui es la maquinaria, no el resultado: sin limitacion de
   paso y sin saturacion del exponente, este circuito hace desbordar la
   exponencial en la primera iteracion.
   ========================================================================= */

import { describe, it, expect } from "vitest";
import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import { resolverNoLineal } from "@/motor/newton";
import { MOTOR } from "@/config";

/** n diodos en serie, opcionalmente con una resistencia limitadora. */
function cadenaDeDiodos(n: number, tensionV: number, resistenciaOhm?: number): Circuito {
  const componentes: Circuito["componentes"] = [
    crearComponente("fuenteDC", "v1", { tensionV }),
    crearComponente("tierra", "gnd"),
    ...Array.from({ length: n }, (_, i) => crearComponente("diodo", `d${i + 1}`)),
  ];
  const cables: Circuito["cables"] = [cable("wg", "v1:negativo", "gnd:ref")];

  if (resistenciaOhm !== undefined) {
    componentes.push(crearComponente("resistencia", "r1", { valorOhm: resistenciaOhm }));
    cables.push(cable("w0", "v1:positivo", "r1:a"));
    cables.push(cable("w1", "r1:b", "d1:anodo"));
  } else {
    cables.push(cable("w1", "v1:positivo", "d1:anodo"));
  }

  for (let i = 1; i < n; i++) {
    cables.push(cable(`wc${i}`, `d${i}:catodo`, `d${i + 1}:anodo`));
  }
  cables.push(cable("wf", `d${n}:catodo`, "v1:negativo"));

  return { componentes, cables };
}

describe("Estres · diez diodos en serie con 15 V", () => {
  const s = resolverNoLineal(cadenaDeDiodos(10, 15), {
    permitirEscalonamiento: false,
  });

  it("converge", () => {
    expect(s.ok).toBe(true);
    expect(s.diagnosticos).toEqual([]);
  });

  it("converge SIN escalonamiento de gmin, como exige la especificacion", () => {
    expect(s.uso_escalonamiento).toBe(false);
  });

  it("lo hace dentro del limite de iteraciones", () => {
    expect(s.iteraciones).toBeLessThanOrEqual(MOTOR.maxIteraciones);
  });

  it("cumple el criterio de corriente, no solo el de tension", () => {
    // Sin resistencia limitadora la corriente es enorme (el modelo entra en
    // su extension lineal), asi que el umbral es abstol mas el suelo de
    // precision del double. Lo relevante: el criterio de corriente se aplica
    // y se cumple; no basta con que las tensiones dejen de moverse.
    const corrienteMax = Math.max(
      ...Array.from({ length: 10 }, (_, i) =>
        Math.abs(s.componentes.get(`d${i + 1}`)!.corrienteA),
      ),
    );
    expect(s.residuoCorrienteA).toBeLessThan(
      MOTOR.abstol + MOTOR.epsilonCorriente * corrienteMax,
    );
  });

  it("los diez diodos quedan en el mismo punto de operacion", () => {
    const tensiones = Array.from({ length: 10 }, (_, i) =>
      s.componentes.get(`d${i + 1}`)!.tensionV,
    );
    const primera = tensiones[0]!;
    for (const v of tensiones) expect(v).toBeCloseTo(primera, 6);
  });

  it("las diez caidas suman la tension de la fuente", () => {
    const suma = Array.from({ length: 10 }, (_, i) =>
      s.componentes.get(`d${i + 1}`)!.tensionV,
    ).reduce((a, b) => a + b, 0);
    expect(suma).toBeCloseTo(15, 4);
  });
});

describe("Estres · la misma cadena con resistencia limitadora", () => {
  // Este si es un circuito razonable: 1 kΩ deja unos pocos mA.
  const s = resolverNoLineal(cadenaDeDiodos(10, 15, 1000), {
    permitirEscalonamiento: false,
  });

  it("converge sin escalonamiento", () => {
    expect(s.ok).toBe(true);
    expect(s.uso_escalonamiento).toBe(false);
  });

  it("aqui si cumple el abstol estricto de la especificacion", () => {
    // Con corrientes de miliamperios el suelo de precision no aporta nada y
    // el criterio se cumple en su forma absoluta, 1e-12 A.
    expect(s.residuoCorrienteA).toBeLessThan(MOTOR.abstol);
  });

  it("cada diodo cae del orden de 0,7 V", () => {
    for (let i = 1; i <= 10; i++) {
      const v = s.componentes.get(`d${i}`)!.tensionV;
      expect(v).toBeGreaterThan(0.55);
      expect(v).toBeLessThan(0.8);
    }
  });

  it("la corriente es la misma en toda la cadena", () => {
    const i1 = s.componentes.get("d1")!.corrienteA;
    const i10 = s.componentes.get("d10")!.corrienteA;
    expect(i1).toBeCloseTo(i10, 9);
    expect(i1).toBeGreaterThan(0);
  });

  it("KVL: las diez caidas mas la de R suman 15 V", () => {
    let suma = s.componentes.get("r1")!.tensionV;
    for (let i = 1; i <= 10; i++) suma += s.componentes.get(`d${i}`)!.tensionV;
    expect(suma).toBeCloseTo(15, 5);
  });
});

describe("Estres · cadenas de otras longitudes", () => {
  for (const n of [1, 2, 5, 20]) {
    it(`${n} diodo(s) en serie con 15 V y 1 kΩ converge`, () => {
      const s = resolverNoLineal(cadenaDeDiodos(n, 15, 1000), {
        permitirEscalonamiento: false,
      });
      expect(s.ok).toBe(true);
      expect(s.uso_escalonamiento).toBe(false);
    });
  }
});
