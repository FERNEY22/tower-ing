/* Comportamiento del solver lineal mas alla del caso A: leyes de Kirchhoff,
   interruptores, potenciometro, componentes quemados y los casos en los que
   el circuito no tiene solucion. */

import { describe, it, expect } from "vitest";
import {
  cable,
  construirRed,
  crearComponente,
  nodoDeTerminal,
  type Circuito,
} from "@/motor/circuito";
import {
  corrienteDe,
  resolverLineal,
  tensionDe,
  tensionEntreNodos,
} from "@/motor/solverLineal";
import { tramosPotenciometro, resistenciaEfectiva } from "@/motor/mna";

/** Fuente + una rama, con tierra en el negativo. */
function malla(
  tensionV: number,
  ramas: Circuito["componentes"],
  cables: Circuito["cables"],
): Circuito {
  return {
    componentes: [
      crearComponente("fuenteDC", "v1", { tensionV }),
      crearComponente("tierra", "gnd"),
      ...ramas,
    ],
    cables: [cable("wg", "v1:negativo", "gnd:ref"), ...cables],
  };
}

describe("ley de Ohm en una sola resistencia", () => {
  const s = resolverLineal(
    malla(10, [crearComponente("resistencia", "r1", { valorOhm: 2000 })], [
      cable("w1", "v1:positivo", "r1:a"),
      cable("w2", "r1:b", "v1:negativo"),
    ]),
  );

  it("toda la tension cae en la resistencia", () => {
    expect(tensionDe(s, "r1")).toBeCloseTo(10, 9);
  });

  it("la corriente es V/R", () => {
    expect(corrienteDe(s, "r1")).toBeCloseTo(10 / 2000, 12);
  });

  it("la potencia es V·I", () => {
    expect(s.componentes.get("r1")!.potenciaW).toBeCloseTo(10 * (10 / 2000), 12);
  });
});

describe("resistencias en serie", () => {
  it("tres en serie se comportan como su suma", () => {
    const s = resolverLineal(
      malla(
        12,
        [
          crearComponente("resistencia", "r1", { valorOhm: 100 }),
          crearComponente("resistencia", "r2", { valorOhm: 200 }),
          crearComponente("resistencia", "r3", { valorOhm: 300 }),
        ],
        [
          cable("w1", "v1:positivo", "r1:a"),
          cable("w2", "r1:b", "r2:a"),
          cable("w3", "r2:b", "r3:a"),
          cable("w4", "r3:b", "v1:negativo"),
        ],
      ),
    );

    // Precision de contraste: corrientes al nanoamperio, tensiones a los
    // 100 nV. Por debajo de eso solo esta el ruido de gmin, que no
    // representa nada medible en un laboratorio.
    const i = 12 / 600;
    expect(corrienteDe(s, "r1")).toBeCloseTo(i, 9);
    expect(tensionDe(s, "r1")).toBeCloseTo(i * 100, 7);
    expect(tensionDe(s, "r3")).toBeCloseTo(i * 300, 7);
    // KVL: las tres caidas suman la tension de la fuente.
    expect(
      tensionDe(s, "r1") + tensionDe(s, "r2") + tensionDe(s, "r3"),
    ).toBeCloseTo(12, 7);
  });
});

describe("resistencias en paralelo", () => {
  it("reparten la corriente segun su conductancia y cumplen KCL", () => {
    const s = resolverLineal(
      malla(
        6,
        [
          crearComponente("resistencia", "r1", { valorOhm: 1000 }),
          crearComponente("resistencia", "r2", { valorOhm: 3000 }),
        ],
        [
          cable("w1", "v1:positivo", "r1:a"),
          cable("w2", "v1:positivo", "r2:a"),
          cable("w3", "r1:b", "v1:negativo"),
          cable("w4", "r2:b", "v1:negativo"),
        ],
      ),
    );

    expect(corrienteDe(s, "r1")).toBeCloseTo(6 / 1000, 9);
    expect(corrienteDe(s, "r2")).toBeCloseTo(6 / 3000, 9);
    // KCL en el nodo de la fuente, con el margen que deja la fuga de gmin.
    expect(corrienteDe(s, "v1")).toBeCloseTo(
      corrienteDe(s, "r1") + corrienteDe(s, "r2"),
      9,
    );
  });
});

describe("interruptores", () => {
  function conInterruptor(cerrado: boolean) {
    return resolverLineal(
      malla(
        9,
        [
          crearComponente("interruptor", "s1", { cerrado }),
          crearComponente("resistencia", "r1", { valorOhm: 1000 }),
        ],
        [
          cable("w1", "v1:positivo", "s1:a"),
          cable("w2", "s1:b", "r1:a"),
          cable("w3", "r1:b", "v1:negativo"),
        ],
      ),
    );
  }

  it("cerrado no introduce caida apreciable", () => {
    const s = conInterruptor(true);
    expect(Math.abs(tensionDe(s, "s1"))).toBeLessThan(1e-9);
    expect(corrienteDe(s, "r1")).toBeCloseTo(9 / 1000, 9);
    expect(tensionDe(s, "r1")).toBeCloseTo(9, 9);
  });

  it("abierto corta la corriente y aguanta toda la tension", () => {
    const s = conInterruptor(false);
    expect(Math.abs(corrienteDe(s, "r1"))).toBeLessThan(1e-9);
    expect(tensionDe(s, "s1")).toBeCloseTo(9, 6);
    expect(Math.abs(tensionDe(s, "r1"))).toBeLessThan(1e-6);
  });

  it("un circuito abierto sigue resolviendose, sin errores", () => {
    expect(conInterruptor(false).ok).toBe(true);
  });
});

describe("potenciometro", () => {
  it("reparte la resistencia total segun la posicion del cursor", () => {
    expect(tramosPotenciometro(10000, 0.25)).toEqual({
      aCursor: 2500,
      cursorB: 7500,
    });
  });

  it("con el cursor al tope no genera una conductancia infinita", () => {
    const t = tramosPotenciometro(10000, 0);
    expect(t.aCursor).toBeGreaterThan(0);
    expect(Number.isFinite(1 / t.aCursor)).toBe(true);
  });

  it("acota el cursor fuera de rango en lugar de dar valores absurdos", () => {
    expect(tramosPotenciometro(1000, 2).cursorB).toBe(
      tramosPotenciometro(1000, 1).cursorB,
    );
    expect(tramosPotenciometro(1000, -5).aCursor).toBe(
      tramosPotenciometro(1000, 0).aCursor,
    );
  });

  it("como divisor de tension, la salida sigue al cursor", () => {
    function salida(cursor: number): number {
      const c = malla(
        10,
        [crearComponente("potenciometro", "p1", { totalOhm: 10000, cursor })],
        [
          cable("w1", "v1:positivo", "p1:a"),
          cable("w2", "p1:b", "v1:negativo"),
        ],
      );
      const s = resolverLineal(c);
      // Tension del cursor respecto a la referencia, buscada por su nombre
      // de terminal: nada de adivinar cual nodo es.
      const red = construirRed(c);
      return s.tensiones.get(nodoDeTerminal(red, "p1", "cursor"))!;
    }

    // Es un barrido monotono: lo que hara el estudiante en la leccion 4.
    const v25 = salida(0.25);
    const v50 = salida(0.5);
    const v75 = salida(0.75);
    expect(v75).toBeLessThan(v50);
    expect(v50).toBeLessThan(v25);
    expect(v50).toBeCloseTo(5, 3);
  });
});

describe("componentes quemados", () => {
  it("un componente quemado se comporta como circuito abierto", () => {
    const c = malla(
      9,
      [
        crearComponente("resistencia", "r1", { valorOhm: 1000 }),
        crearComponente("resistencia", "r2", { valorOhm: 1000 }),
      ],
      [
        cable("w1", "v1:positivo", "r1:a"),
        cable("w2", "r1:b", "r2:a"),
        cable("w3", "r2:b", "v1:negativo"),
      ],
    );
    c.componentes.find((x) => x.id === "r1")!.estado.quemado = true;

    const s = resolverLineal(c);
    expect(Math.abs(corrienteDe(s, "r1"))).toBeLessThan(1e-9);
    expect(Math.abs(corrienteDe(s, "r2"))).toBeLessThan(1e-9);
    expect(s.ok).toBe(true);
  });
});

describe("resistencia efectiva", () => {
  it("respeta los valores normales", () => {
    expect(resistenciaEfectiva(1000)).toBe(1000);
  });

  it("pone un suelo a los valores nulos o absurdos", () => {
    expect(resistenciaEfectiva(0)).toBeGreaterThan(0);
    expect(resistenciaEfectiva(-5)).toBeGreaterThan(0);
    expect(resistenciaEfectiva(NaN)).toBeGreaterThan(0);
  });
});

describe("cuando el circuito no se puede resolver", () => {
  it("un cortocircuito de fuente no llega siquiera al solver", () => {
    const c = malla(
      9,
      [crearComponente("resistencia", "r1", { valorOhm: 1000 })],
      [
        cable("w1", "v1:positivo", "r1:a"),
        cable("w2", "r1:b", "v1:negativo"),
        cable("wX", "v1:positivo", "v1:negativo"),
      ],
    );
    const s = resolverLineal(c);
    expect(s.ok).toBe(false);
    expect(s.diagnosticos.some((d) => d.codigo === "cortocircuito-fuente")).toBe(
      true,
    );
    expect(s.componentes.size).toBe(0);
  });

  it("dos fuentes distintas sobre los mismos nodos dan un mensaje, no una excepcion", () => {
    const c: Circuito = {
      componentes: [
        crearComponente("fuenteDC", "v1", { tensionV: 9 }),
        crearComponente("fuenteDC", "v2", { tensionV: 5 }),
        crearComponente("tierra", "gnd"),
      ],
      cables: [
        cable("w1", "v1:positivo", "v2:positivo"),
        cable("w2", "v1:negativo", "v2:negativo"),
        cable("w3", "v1:negativo", "gnd:ref"),
      ],
    };
    const s = resolverLineal(c);
    expect(s.ok).toBe(false);
    expect(s.diagnosticos.some((d) => d.codigo === "no-converge")).toBe(true);
    for (const d of s.diagnosticos) {
      expect(d.mensaje).not.toMatch(/singular|matriz|pivote/i);
    }
  });

  it("los avisos de topologia no impiden resolver", () => {
    const c = malla(
      9,
      [
        crearComponente("resistencia", "r1", { valorOhm: 1000 }),
        crearComponente("led", "d1"), // suelto: ni se estampa
      ],
      [
        cable("w1", "v1:positivo", "r1:a"),
        cable("w2", "r1:b", "v1:negativo"),
      ],
    );
    const s = resolverLineal(c);
    expect(s.ok).toBe(true);
    expect(s.diagnosticos.some((d) => d.codigo === "componente-suelto")).toBe(
      true,
    );
    expect(corrienteDe(s, "r1")).toBeCloseTo(9 / 1000, 9);
  });
});

describe("tensiones entre nodos", () => {
  it("mide la diferencia como lo hara el voltimetro", () => {
    const c = malla(
      9,
      [
        crearComponente("resistencia", "r1", { valorOhm: 1000 }),
        crearComponente("resistencia", "r2", { valorOhm: 2000 }),
      ],
      [
        cable("w1", "v1:positivo", "r1:a"),
        cable("w2", "r1:b", "r2:a"),
        cable("w3", "r2:b", "v1:negativo"),
      ],
    );
    const s = resolverLineal(c);
    const nodos = [...s.tensiones.entries()].sort((a, b) => b[1] - a[1]);
    const alto = nodos[0]![0];
    const bajo = nodos[nodos.length - 1]![0];
    expect(tensionEntreNodos(s, alto, bajo)).toBeCloseTo(9, 9);
    expect(tensionEntreNodos(s, bajo, alto)).toBeCloseTo(-9, 9);
  });
});
