/* =========================================================================
   PUERTA DE LA FASE 3 (4/6) — Caso D de la especificacion (§11)

   Regulador zener: fuente 12 V, Rs = 220 Ω, zener de 5,1 V, carga de 1 kΩ.
   Esperado: Vout entre 5,0 y 5,2 V, y ademas Izener + Icarga = IRs con error
   por debajo del 0,1 %.

   Es el circuito de la leccion 5, la antesala de la fuente regulada.
   ========================================================================= */

import { describe, it, expect } from "vitest";
import {
  cable,
  construirRed,
  crearComponente,
  nodoDeTerminal,
  type Circuito,
} from "@/motor/circuito";
import { resolver } from "@/motor";

function reguladorZener(cargaOhm = 1000, alimentacionV = 12): Circuito {
  return {
    componentes: [
      crearComponente("fuenteDC", "v1", { tensionV: alimentacionV }),
      crearComponente("resistencia", "rs", { valorOhm: 220 }),
      crearComponente("zener", "z1", { tensionRupturaV: 5.1 }),
      crearComponente("resistencia", "rl", { valorOhm: cargaOhm }),
      crearComponente("tierra", "gnd"),
    ],
    cables: [
      cable("w1", "v1:positivo", "rs:a"),
      // El zener va en inversa: el catodo al lado positivo.
      cable("w2", "rs:b", "z1:catodo"),
      cable("w3", "rs:b", "rl:a"),
      cable("w4", "z1:anodo", "v1:negativo"),
      cable("w5", "rl:b", "v1:negativo"),
      cable("w6", "v1:negativo", "gnd:ref"),
    ],
  };
}

function tensionDeSalida(c: Circuito, s: ReturnType<typeof resolver>): number {
  const red = construirRed(c);
  return s.tensiones.get(nodoDeTerminal(red, "rl", "a"))!;
}

describe("Caso D · regulador zener de 5,1 V", () => {
  const c = reguladorZener();
  const s = resolver(c);

  it("converge sin diagnosticos", () => {
    expect(s.ok).toBe(true);
    expect(s.diagnosticos).toEqual([]);
  });

  it("Vout queda entre 5,0 y 5,2 V", () => {
    const vout = tensionDeSalida(c, s);
    expect(vout).toBeGreaterThanOrEqual(5.0);
    expect(vout).toBeLessThanOrEqual(5.2);
  });

  it("KCL en el nodo de salida con error por debajo del 0,1 %", () => {
    const iRs = s.componentes.get("rs")!.corrienteA;
    const iCarga = s.componentes.get("rl")!.corrienteA;
    // El zener conduce de catodo a anodo en ruptura: su corriente sale
    // negativa en la convencion anodo→catodo.
    const iZener = Math.abs(s.componentes.get("z1")!.corrienteA);

    const error = Math.abs(iZener + iCarga - iRs) / Math.abs(iRs);
    expect(error).toBeLessThan(0.001);
  });

  it("el zener trabaja en ruptura, no en directa", () => {
    const z = s.componentes.get("z1")!;
    expect(z.tensionV).toBeLessThan(0); // catodo mas positivo que anodo
    expect(Math.abs(z.tensionV)).toBeGreaterThan(5);
  });

  it("el zener absorbe mas corriente que la carga en este punto", () => {
    const iZener = Math.abs(s.componentes.get("z1")!.corrienteA);
    expect(iZener).toBeGreaterThan(s.componentes.get("rl")!.corrienteA);
  });
});

describe("Caso D · la regulacion es el objetivo de la leccion", () => {
  function voutCon(cargaOhm: number, alimentacionV = 12): number {
    const c = reguladorZener(cargaOhm, alimentacionV);
    return tensionDeSalida(c, resolver(c));
  }

  it("la salida apenas se mueve al variar la carga entre 1 k y 10 k", () => {
    const conCargaAlta = voutCon(10000);
    const conCargaNominal = voutCon(1000);
    expect(Math.abs(conCargaAlta - conCargaNominal)).toBeLessThan(0.1);
  });

  it("la salida apenas se mueve al variar la entrada entre 9 y 15 V", () => {
    const v9 = voutCon(1000, 9);
    const v15 = voutCon(1000, 15);
    expect(Math.abs(v15 - v9)).toBeLessThan(0.15);
  });

  it("con una carga que excede la capacidad, la regulacion se pierde", () => {
    // Segunda parte de la averia de la leccion 5: la carga se lleva toda la
    // corriente y el zener sale de ruptura.
    const vout = voutCon(50);
    expect(vout).toBeLessThan(5.0);
  });
});

describe("Caso D · el zener invertido no regula", () => {
  it("montado en directa se comporta como un diodo comun", () => {
    const c = reguladorZener();
    // Se invierte: anodo al lado positivo.
    c.cables = [
      cable("w1", "v1:positivo", "rs:a"),
      cable("w2", "rs:b", "z1:anodo"),
      cable("w3", "rs:b", "rl:a"),
      cable("w4", "z1:catodo", "v1:negativo"),
      cable("w5", "rl:b", "v1:negativo"),
      cable("w6", "v1:negativo", "gnd:ref"),
    ];

    const s = resolver(c);
    expect(s.ok).toBe(true);
    const vout = tensionDeSalida(c, s);
    // Cae la de un diodo en directa, no 5,1 V.
    expect(vout).toBeLessThan(1);
    expect(vout).toBeGreaterThan(0.5);
  });
});
