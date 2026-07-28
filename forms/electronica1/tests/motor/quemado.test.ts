/* =========================================================================
   PUERTA DE LA FASE 6

   Un LED sin resistencia limitadora a 5 V se quema, queda como circuito
   abierto y el circuito se vuelve a resolver.

   Es la averia sembrada de la leccion 2, asi que tiene que comportarse
   exactamente asi.
   ========================================================================= */

import { describe, it, expect } from "vitest";
import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import { resolver } from "@/motor";
import {
  evaluarQuemado,
  marcarQuemados,
  reemplazarComponente,
  resolverConQuemado,
} from "@/motor/quemado";
import { LIMITES } from "@/config";

/** Fuente + una rama en serie, con tierra. */
function malla(tensionV: number, ramas: Circuito["componentes"], cables: Circuito["cables"]): Circuito {
  return {
    componentes: [
      crearComponente("fuenteDC", "V1", { tensionV }),
      crearComponente("tierra", "GND1"),
      ...ramas,
    ],
    cables: [cable("wg", "V1:negativo", "GND1:ref"), ...cables],
  };
}

/** LED directamente entre los bornes, sin nada que limite la corriente. */
function ledSinLimitadora(): Circuito {
  return malla(5, [crearComponente("led", "LED1", { color: "rojo" })], [
    cable("w1", "V1:positivo", "LED1:anodo"),
    cable("w2", "LED1:catodo", "V1:negativo"),
  ]);
}

describe("LED sin resistencia limitadora a 5 V", () => {
  const { circuito, solucion, quemaduras } = resolverConQuemado(ledSinLimitadora());

  it("se quema", () => {
    expect(quemaduras).toHaveLength(1);
    expect(quemaduras[0]!.componenteId).toBe("LED1");
    expect(quemaduras[0]!.motivo).toBe("corriente-directa");
  });

  it("queda marcado como quemado en el circuito", () => {
    const led = circuito.componentes.find((c) => c.id === "LED1")!;
    expect(led.estado.quemado).toBe(true);
    expect(led.estado.motivoQuemado).toMatch(/resistencia limitadora/i);
  });

  it("pasa a comportarse como circuito abierto", () => {
    const led = solucion.componentes.get("LED1")!;
    expect(Math.abs(led.corrienteA)).toBeLessThan(1e-9);
  });

  it("el circuito se vuelve a resolver despues de quemarse", () => {
    // La solucion que se muestra es la de DESPUES: si fuera la de antes,
    // el LED seguiria llevando corriente.
    expect(solucion.ok).toBe(true);
    const fuente = solucion.componentes.get("V1")!;
    expect(Math.abs(fuente.corrienteA)).toBeLessThan(1e-9);
  });

  it("la corriente que lo quemo estaba muy por encima del limite", () => {
    expect(quemaduras[0]!.magnitud).toBeGreaterThan(LIMITES.ledCorrienteMaxA);
    expect(quemaduras[0]!.limite).toBe(LIMITES.ledCorrienteMaxA);
  });

  it("el mensaje esta en lenguaje de estudiante", () => {
    const m = quemaduras[0]!.mensaje;
    expect(m).toMatch(/se quemó/i);
    expect(m).not.toMatch(/matriz|Newton|gmin|NaN/i);
  });
});

describe("el mismo LED con su resistencia de 330 Ω", () => {
  it("no se quema", () => {
    const c = malla(
      5,
      [
        crearComponente("resistencia", "R1", { valorOhm: 330 }),
        crearComponente("led", "LED1", { color: "rojo" }),
      ],
      [
        cable("w1", "V1:positivo", "R1:a"),
        cable("w2", "R1:b", "LED1:anodo"),
        cable("w3", "LED1:catodo", "V1:negativo"),
      ],
    );

    const r = resolverConQuemado(c);
    expect(r.quemaduras).toEqual([]);
    expect(r.circuito.componentes.every((x) => !x.estado.quemado)).toBe(true);
  });
});

describe("resistencia por potencia", () => {
  function conPotencia(potenciaW: number, tensionV: number) {
    return resolverConQuemado(
      malla(
        tensionV,
        [crearComponente("resistencia", "R1", { valorOhm: 100, potenciaW })],
        [
          cable("w1", "V1:positivo", "R1:a"),
          cable("w2", "R1:b", "V1:negativo"),
        ],
      ),
    );
  }

  it("una de 1/4 W con 10 V sobre 100 Ω se quema: disipa 1 W", () => {
    const r = conPotencia(0.25, 10);
    expect(r.quemaduras).toHaveLength(1);
    expect(r.quemaduras[0]!.motivo).toBe("potencia");
    expect(r.quemaduras[0]!.unidad).toBe("W");
  });

  it("la misma de 2 W aguanta", () => {
    expect(conPotencia(2, 10).quemaduras).toEqual([]);
  });

  it("justo por debajo del limite no se quema", () => {
    // 5 V sobre 100 Ω = 0,25 W exactos.
    expect(conPotencia(0.25, 5).quemaduras).toEqual([]);
  });

  it("respeta la potencia que se le puso, no la de por defecto", () => {
    expect(conPotencia(0.125, 4).quemaduras).toHaveLength(1);
    expect(conPotencia(1, 4).quemaduras).toEqual([]);
  });
});

describe("LED por tension inversa", () => {
  it("montado al reves con tension alta se quema", () => {
    const c = malla(
      12,
      [
        crearComponente("resistencia", "R1", { valorOhm: 1000 }),
        crearComponente("led", "LED1", { color: "rojo" }),
      ],
      [
        cable("w1", "V1:positivo", "R1:a"),
        cable("w2", "R1:b", "LED1:catodo"),
        cable("w3", "LED1:anodo", "V1:negativo"),
      ],
    );

    const r = resolverConQuemado(c);
    expect(r.quemaduras).toHaveLength(1);
    expect(r.quemaduras[0]!.motivo).toBe("tension-inversa");
    expect(r.quemaduras[0]!.mensaje).toMatch(/polaridad/i);
  });

  it("al reves pero con poca tension solo no enciende, no se rompe", () => {
    const c = malla(
      3,
      [
        crearComponente("resistencia", "R1", { valorOhm: 1000 }),
        crearComponente("led", "LED1", { color: "rojo" }),
      ],
      [
        cable("w1", "V1:positivo", "R1:a"),
        cable("w2", "R1:b", "LED1:catodo"),
        cable("w3", "LED1:anodo", "V1:negativo"),
      ],
    );
    expect(resolverConQuemado(c).quemaduras).toEqual([]);
  });
});

describe("diodo y zener", () => {
  it("un diodo de señal se quema por encima de 200 mA", () => {
    const c = malla(
      5,
      [
        crearComponente("resistencia", "R1", { valorOhm: 1, potenciaW: 100 }),
        crearComponente("diodo", "D1"),
      ],
      [
        cable("w1", "V1:positivo", "R1:a"),
        cable("w2", "R1:b", "D1:anodo"),
        cable("w3", "D1:catodo", "V1:negativo"),
      ],
    );

    const r = resolverConQuemado(c);
    const delDiodo = r.quemaduras.find((q) => q.componenteId === "D1");
    expect(delDiodo).toBeDefined();
    expect(delDiodo!.limite).toBe(LIMITES.diodoCorrienteMaxA);
  });

  it("un zener se quema al pasarse de su potencia", () => {
    const c = malla(
      24,
      [
        crearComponente("resistencia", "RS", { valorOhm: 47, potenciaW: 100 }),
        crearComponente("zener", "Z1", { tensionRupturaV: 5.1, potenciaW: 0.5 }),
      ],
      [
        cable("w1", "V1:positivo", "RS:a"),
        cable("w2", "RS:b", "Z1:catodo"),
        cable("w3", "Z1:anodo", "V1:negativo"),
      ],
    );

    const r = resolverConQuemado(c);
    const delZener = r.quemaduras.find((q) => q.componenteId === "Z1");
    expect(delZener).toBeDefined();
    expect(delZener!.motivo).toBe("potencia");
  });
});

describe("quemado en cascada", () => {
  it("al abrirse una rama, la otra puede llevarse la corriente y quemarse", () => {
    // Dos LED en paralelo sin limitadora: se queman los dos, uno tras otro.
    const c = malla(
      5,
      [
        crearComponente("led", "LED1", { color: "rojo" }),
        crearComponente("led", "LED2", { color: "rojo" }),
      ],
      [
        cable("w1", "V1:positivo", "LED1:anodo"),
        cable("w2", "LED1:catodo", "V1:negativo"),
        cable("w3", "V1:positivo", "LED2:anodo"),
        cable("w4", "LED2:catodo", "V1:negativo"),
      ],
    );

    const r = resolverConQuemado(c);
    expect(r.quemaduras.map((q) => q.componenteId).sort()).toEqual([
      "LED1",
      "LED2",
    ]);
    expect(r.solucion.ok).toBe(true);
  });

  it("el bucle termina siempre, no se queda dando vueltas", () => {
    const r = resolverConQuemado(ledSinLimitadora());
    expect(r.solucion.ok).toBe(true);
    // Y volver a resolver el resultado no quema nada mas.
    expect(resolverConQuemado(r.circuito).quemaduras).toEqual([]);
  });
});

describe("reemplazar un componente quemado", () => {
  it("un componente quemado sigue quemado si no se reemplaza", () => {
    const primero = resolverConQuemado(ledSinLimitadora());
    const segundo = resolverConQuemado(primero.circuito);
    expect(
      segundo.circuito.componentes.find((c) => c.id === "LED1")!.estado.quemado,
    ).toBe(true);
  });

  it("reemplazarlo lo deja como nuevo", () => {
    const { circuito } = resolverConQuemado(ledSinLimitadora());
    const reparado = reemplazarComponente(circuito, "LED1");
    expect(reparado.componentes.find((c) => c.id === "LED1")!.estado.quemado).toBe(
      false,
    );
  });

  it("pero si el circuito sigue mal, se vuelve a quemar", () => {
    const { circuito } = resolverConQuemado(ledSinLimitadora());
    const reparado = reemplazarComponente(circuito, "LED1");
    expect(resolverConQuemado(reparado).quemaduras).toHaveLength(1);
  });
});

describe("evaluarQuemado por separado", () => {
  it("no dictamina nada si el circuito no se pudo resolver", () => {
    const c = malla(5, [], []);
    const s = resolver(c);
    expect(evaluarQuemado(c, s)).toEqual([]);
  });

  it("no vuelve a quemar lo que ya esta quemado", () => {
    const c = ledSinLimitadora();
    const s = resolver(c);
    const primeras = evaluarQuemado(c, s);
    const marcado = marcarQuemados(c, primeras);
    expect(evaluarQuemado(marcado, resolver(marcado))).toEqual([]);
  });

  it("marcarQuemados no toca el circuito original", () => {
    const c = ledSinLimitadora();
    const s = resolver(c);
    marcarQuemados(c, evaluarQuemado(c, s));
    expect(c.componentes.find((x) => x.id === "LED1")!.estado.quemado).toBe(false);
  });
});
