import { describe, it, expect } from "vitest";
import {
  cable,
  claveTerminal,
  construirRed,
  crearComponente,
  gradoDeTerminal,
  nodoDeTerminal,
  refDesdeClave,
  terminalesDe,
  verificarIntegridad,
  type Circuito,
} from "@/motor/circuito";

/** Divisor resistivo del caso A: fuente 9 V, R1 = 1 k, R2 = 2 k. */
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

describe("terminales y polaridad", () => {
  it("cada tipo trae sus terminales con la polaridad correcta", () => {
    const led = crearComponente("led", "d1");
    expect(led.terminales.map((t) => t.nombre)).toEqual(["anodo", "catodo"]);
    expect(led.terminales.map((t) => t.polaridad)).toEqual(["anodo", "catodo"]);

    const r = crearComponente("resistencia", "r1");
    // La resistencia no tiene sentido de montaje, y eso es una afirmacion.
    expect(r.terminales.every((t) => t.polaridad === "ninguna")).toBe(true);

    const pot = crearComponente("potenciometro", "p1");
    expect(pot.terminales.map((t) => t.nombre)).toEqual(["a", "cursor", "b"]);
  });

  it("los parametros por defecto se pueden sobrescribir uno a uno", () => {
    const r = crearComponente("resistencia", "r1", { valorOhm: 330 });
    expect(r.params.valorOhm).toBe(330);
    expect(r.params.toleranciaPct).toBe(5); // el resto conserva el defecto
    expect(r.params.potenciaW).toBe(0.25);
  });

  it("los componentes nacen sin quemar", () => {
    expect(crearComponente("led", "d1").estado.quemado).toBe(false);
  });

  it("dos componentes del mismo tipo no comparten los terminales", () => {
    const a = crearComponente("led", "d1");
    const b = crearComponente("led", "d2");
    a.terminales[0]!.nombre = "cambiado";
    expect(b.terminales[0]!.nombre).toBe("anodo");
  });
});

describe("claves de terminal", () => {
  it("van y vuelven sin perder informacion", () => {
    const clave = claveTerminal("r1", "a");
    expect(clave).toBe("r1:a");
    expect(refDesdeClave(clave)).toEqual({ componenteId: "r1", terminal: "a" });
  });

  it("rechaza una clave mal formada", () => {
    expect(() => refDesdeClave("r1")).toThrow(/invalida/i);
  });
});

describe("integridad del circuito", () => {
  it("acepta un circuito bien formado", () => {
    expect(() => verificarIntegridad(divisor())).not.toThrow();
  });

  it("rechaza un cable hacia un terminal inexistente", () => {
    const c = divisor();
    c.cables.push(cable("wX", "r1:a", "r9:b"));
    expect(() => verificarIntegridad(c)).toThrow(/r9:b/);
  });

  it("rechaza ids repetidos", () => {
    const c = divisor();
    c.componentes.push(crearComponente("resistencia", "r1"));
    expect(() => verificarIntegridad(c)).toThrow(/dos componentes/i);
  });
});

describe("construccion de la red de nodos", () => {
  it("el divisor tiene exactamente tres nodos", () => {
    const red = construirRed(divisor());
    expect(red.nodos).toHaveLength(3);
  });

  it("los terminales unidos por un cable caen en el mismo nodo", () => {
    const red = construirRed(divisor());
    expect(nodoDeTerminal(red, "v1", "positivo")).toBe(
      nodoDeTerminal(red, "r1", "a"),
    );
    expect(nodoDeTerminal(red, "r1", "b")).toBe(nodoDeTerminal(red, "r2", "a"));
  });

  it("el punto medio del divisor es un nodo distinto de los extremos", () => {
    const red = construirRed(divisor());
    const alto = nodoDeTerminal(red, "v1", "positivo");
    const medio = nodoDeTerminal(red, "r1", "b");
    const bajo = nodoDeTerminal(red, "v1", "negativo");
    expect(new Set([alto, medio, bajo]).size).toBe(3);
  });

  it("todas las tierras son el mismo nodo aunque no haya cable entre ellas", () => {
    const c: Circuito = {
      componentes: [
        crearComponente("resistencia", "r1"),
        crearComponente("tierra", "gnd1"),
        crearComponente("tierra", "gnd2"),
      ],
      cables: [
        cable("w1", "r1:a", "gnd1:ref"),
        cable("w2", "r1:b", "gnd2:ref"),
      ],
    };
    const red = construirRed(c);
    expect(nodoDeTerminal(red, "gnd1", "ref")).toBe(
      nodoDeTerminal(red, "gnd2", "ref"),
    );
    // Y por tanto la resistencia queda en cortocircuito consigo misma.
    expect(nodoDeTerminal(red, "r1", "a")).toBe(nodoDeTerminal(red, "r1", "b"));
  });

  it("un terminal sin cable es un nodo propio", () => {
    const c: Circuito = {
      componentes: [crearComponente("resistencia", "r1")],
      cables: [],
    };
    const red = construirRed(c);
    expect(red.nodos).toHaveLength(2);
  });

  it("la numeracion es estable entre llamadas", () => {
    const c = divisor();
    const a = construirRed(c);
    const b = construirRed(c);
    for (const t of c.componentes.flatMap(terminalesDe)) {
      expect(a.nodoDe.get(t)).toBe(b.nodoDe.get(t));
    }
  });

  it("cada nodo lista los terminales que caen en el", () => {
    const red = construirRed(divisor());
    const medio = nodoDeTerminal(red, "r1", "b");
    expect(red.terminalesEn.get(medio)!.sort()).toEqual(["r1:b", "r2:a"]);
  });
});

describe("grado de un terminal", () => {
  it("cuenta los cables que llegan", () => {
    const c = divisor();
    expect(gradoDeTerminal(c, "r1:a")).toBe(1);
    expect(gradoDeTerminal(c, "v1:negativo")).toBe(2);
  });

  it("es cero en un terminal al aire", () => {
    const c: Circuito = {
      componentes: [crearComponente("resistencia", "r1")],
      cables: [],
    };
    expect(gradoDeTerminal(c, "r1:a")).toBe(0);
  });
});
