/* PUERTA DE LA FASE 1
   Los cinco fallos de construccion producen su mensaje pedagogico, y ninguno
   lanza una excepcion hacia la interfaz. */

import { describe, it, expect } from "vitest";
import {
  cable,
  crearComponente,
  nodoDeTerminal,
  type Circuito,
} from "@/motor/circuito";
import { validarTopologia, diagnosticosDe } from "@/motor/topologia";

/** Circuito correcto de referencia: divisor con tierra explicita. */
function divisorConTierra(): Circuito {
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

describe("circuito bien construido", () => {
  it("no produce ningun diagnostico", () => {
    const r = validarTopologia(divisorConTierra());
    expect(r.ok).toBe(true);
    expect(r.diagnosticos).toEqual([]);
  });

  it("toma la tierra como referencia", () => {
    const r = validarTopologia(divisorConTierra());
    expect(r.referencia?.origen).toBe("tierra");
    expect(r.referencia?.componenteId).toBe("gnd");
  });

  it("un interruptor abierto es valido, no un error", () => {
    const c = divisorConTierra();
    c.componentes.push(crearComponente("interruptor", "s1", { cerrado: false }));
    c.cables[0] = cable("w1", "v1:positivo", "s1:a");
    c.cables.push(cable("w5", "s1:b", "r1:a"));

    const r = validarTopologia(c);
    expect(r.ok).toBe(true);
    expect(r.diagnosticos).toEqual([]);
  });
});

/* ------------------------------------------------------- 1. sin referencia */

describe("1. no hay nodo de referencia", () => {
  it("asigna el negativo de la fuente y avisa sin bloquear", () => {
    const c = divisorConTierra();
    c.componentes = c.componentes.filter((x) => x.id !== "gnd");
    c.cables = c.cables.filter((w) => w.id !== "w4");

    const r = validarTopologia(c);
    expect(r.ok).toBe(true); // es un aviso, no un error
    const d = diagnosticosDe(r, "sin-referencia");
    expect(d).toHaveLength(1);
    expect(d[0]!.severidad).toBe("aviso");
    expect(d[0]!.mensaje).toMatch(/negativo de la fuente/i);
    expect(r.referencia?.origen).toBe("fuente");
    expect(r.referencia?.nodoId).toBe(nodoDeTerminal(r.red, "v1", "negativo"));
  });

  it("con varias fuentes elige la de menor tension", () => {
    const c: Circuito = {
      componentes: [
        crearComponente("fuenteDC", "v12", { tensionV: 12 }),
        crearComponente("fuenteDC", "v5", { tensionV: 5 }),
        crearComponente("resistencia", "r1"),
      ],
      cables: [
        cable("w1", "v12:positivo", "r1:a"),
        cable("w2", "r1:b", "v5:positivo"),
        cable("w3", "v5:negativo", "v12:negativo"),
      ],
    };
    const r = validarTopologia(c);
    expect(r.referencia?.componenteId).toBe("v5");
  });

  it("sin tierra y sin fuente es un error que bloquea", () => {
    const c: Circuito = {
      componentes: [
        crearComponente("resistencia", "r1"),
        crearComponente("resistencia", "r2"),
      ],
      cables: [cable("w1", "r1:a", "r2:a")],
    };
    const r = validarTopologia(c);
    expect(r.ok).toBe(false);
    expect(r.referencia).toBeNull();
    expect(diagnosticosDe(r, "sin-referencia")[0]!.severidad).toBe("error");
  });
});

/* --------------------------------------------------------- 2. nodo flotante */

describe("2. nodo flotante", () => {
  it("nombra el componente y el terminal que quedo suelto", () => {
    const c = divisorConTierra();
    // R3 colgada del punto medio por un solo extremo.
    c.componentes.push(crearComponente("resistencia", "r3", { valorOhm: 470 }));
    c.cables.push(cable("w5", "r1:b", "r3:a"));

    const r = validarTopologia(c);
    const d = diagnosticosDe(r, "nodo-flotante");
    expect(d).toHaveLength(1);
    expect(d[0]!.componentes).toEqual(["r3"]);
    expect(d[0]!.terminales).toEqual(["r3:b"]);
    expect(d[0]!.mensaje).toMatch(/terminal B de la resistencia/);
    expect(r.ok).toBe(true); // avisa, no bloquea: gmin lo resuelve
  });

  it("no confunde un terminal conectado con uno al aire", () => {
    const r = validarTopologia(divisorConTierra());
    expect(diagnosticosDe(r, "nodo-flotante")).toHaveLength(0);
  });

  it("un LED colgado de un solo terminal se señala por su nombre real", () => {
    const c = divisorConTierra();
    c.componentes.push(crearComponente("led", "d1"));
    c.cables.push(cable("w5", "r1:b", "d1:anodo"));

    const d = diagnosticosDe(validarTopologia(c), "nodo-flotante");
    expect(d[0]!.mensaje).toMatch(/terminal cátodo del LED/);
  });
});

/* ---------------------------------------------------- 3. cortocircuito */

describe("3. cortocircuito de fuente", () => {
  it("detecta los bornes unidos por un cable y bloquea", () => {
    const c = divisorConTierra();
    c.cables.push(cable("wX", "v1:positivo", "v1:negativo"));

    const r = validarTopologia(c);
    expect(r.ok).toBe(false);
    const d = diagnosticosDe(r, "cortocircuito-fuente");
    expect(d).toHaveLength(1);
    expect(d[0]!.severidad).toBe("error");
    expect(d[0]!.componentes).toEqual(["v1"]);
    expect(d[0]!.mensaje).toMatch(/directamente por un cable/i);
  });

  it("detecta el camino a traves de un interruptor cerrado", () => {
    const c = divisorConTierra();
    c.componentes.push(crearComponente("interruptor", "s1", { cerrado: true }));
    c.cables.push(cable("w5", "v1:positivo", "s1:a"));
    c.cables.push(cable("w6", "s1:b", "v1:negativo"));

    const r = validarTopologia(c);
    expect(r.ok).toBe(false);
    expect(diagnosticosDe(r, "cortocircuito-fuente")[0]!.mensaje).toMatch(
      /sin resistencia/i,
    );
  });

  it("el mismo interruptor abierto no es cortocircuito", () => {
    const c = divisorConTierra();
    c.componentes.push(crearComponente("interruptor", "s1", { cerrado: false }));
    c.cables.push(cable("w5", "v1:positivo", "s1:a"));
    c.cables.push(cable("w6", "s1:b", "v1:negativo"));

    const r = validarTopologia(c);
    expect(diagnosticosDe(r, "cortocircuito-fuente")).toHaveLength(0);
    expect(r.ok).toBe(true);
  });

  it("una resistencia entre los bornes no es cortocircuito", () => {
    const r = validarTopologia(divisorConTierra());
    expect(diagnosticosDe(r, "cortocircuito-fuente")).toHaveLength(0);
  });
});

/* ------------------------------------------------- 4. componente suelto */

describe("4. componente sin conectar", () => {
  it("avisa por cada componente sin un solo cable", () => {
    const c = divisorConTierra();
    c.componentes.push(crearComponente("led", "d1"));
    c.componentes.push(crearComponente("zener", "z1"));

    const d = diagnosticosDe(validarTopologia(c), "componente-suelto");
    expect(d.map((x) => x.componentes[0]).sort()).toEqual(["d1", "z1"]);
    expect(d[0]!.mensaje).toMatch(/no tiene ningún cable/i);
  });

  it("un componente suelto no dispara ademas nodo flotante", () => {
    const c = divisorConTierra();
    c.componentes.push(crearComponente("led", "d1"));

    const r = validarTopologia(c);
    expect(diagnosticosDe(r, "componente-suelto")).toHaveLength(1);
    expect(diagnosticosDe(r, "nodo-flotante")).toHaveLength(0);
  });

  it("no bloquea la simulacion", () => {
    const c = divisorConTierra();
    c.componentes.push(crearComponente("led", "d1"));
    expect(validarTopologia(c).ok).toBe(true);
  });
});

/* ------------------------------------------------ 5. grafo desconectado */

describe("5. subcircuito aislado", () => {
  it("agrupa la isla en un solo aviso con todos sus componentes", () => {
    const c = divisorConTierra();
    // Una malla completa que no toca el circuito principal.
    c.componentes.push(crearComponente("fuenteDC", "v2", { tensionV: 5 }));
    c.componentes.push(crearComponente("resistencia", "r9", { valorOhm: 220 }));
    c.cables.push(cable("wa", "v2:positivo", "r9:a"));
    c.cables.push(cable("wb", "r9:b", "v2:negativo"));

    const d = diagnosticosDe(validarTopologia(c), "grafo-desconectado");
    expect(d).toHaveLength(1);
    expect(d[0]!.componentes.sort()).toEqual(["r9", "v2"]);
    expect(d[0]!.mensaje).toMatch(/circuito aparte/i);
  });

  it("dos islas producen dos avisos", () => {
    const c = divisorConTierra();
    for (const n of ["1", "2"]) {
      c.componentes.push(crearComponente("fuenteDC", `vx${n}`, { tensionV: 5 }));
      c.componentes.push(crearComponente("resistencia", `rx${n}`));
      c.cables.push(cable(`wa${n}`, `vx${n}:positivo`, `rx${n}:a`));
      c.cables.push(cable(`wb${n}`, `rx${n}:b`, `vx${n}:negativo`));
    }
    expect(diagnosticosDe(validarTopologia(c), "grafo-desconectado")).toHaveLength(2);
  });

  it("el circuito conectado no produce el aviso", () => {
    expect(
      diagnosticosDe(validarTopologia(divisorConTierra()), "grafo-desconectado"),
    ).toHaveLength(0);
  });
});

/* -------------------------------------------------------------- contrato */

describe("contrato del motor con la interfaz", () => {
  it("un circuito vacio no rompe nada", () => {
    const r = validarTopologia({ componentes: [], cables: [] });
    expect(r.ok).toBe(false);
    expect(r.referencia).toBeNull();
    expect(r.diagnosticos).toHaveLength(1);
  });

  it("ningun diagnostico llega sin mensaje utilizable", () => {
    const c = divisorConTierra();
    c.componentes.push(crearComponente("led", "d1"));
    c.componentes.push(crearComponente("resistencia", "r3"));
    c.cables.push(cable("w5", "r1:b", "r3:a"));
    c.cables.push(cable("wX", "v1:positivo", "v1:negativo"));

    const r = validarTopologia(c);
    expect(r.diagnosticos.length).toBeGreaterThan(2);
    for (const d of r.diagnosticos) {
      expect(d.titulo.length).toBeGreaterThan(0);
      expect(d.mensaje.length).toBeGreaterThan(20);
      // Nada de jerga de solver en lo que ve el estudiante.
      expect(d.mensaje).not.toMatch(/matriz|singular|newton|gmin|MNA|NaN/i);
    }
  });

  it("los errores se distinguen de los avisos", () => {
    const c = divisorConTierra();
    c.cables.push(cable("wX", "v1:positivo", "v1:negativo"));
    c.componentes.push(crearComponente("led", "d1"));

    const r = validarTopologia(c);
    expect(r.diagnosticos.some((d) => d.severidad === "error")).toBe(true);
    expect(r.diagnosticos.some((d) => d.severidad === "aviso")).toBe(true);
    expect(r.ok).toBe(false); // basta un error para no poder resolver
  });
});
