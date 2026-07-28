/* La huella del circuito. Su razón de ser: identificar montajes idénticos
   entregados por equipos distintos, y verificar que una captura corresponde
   al trabajo registrado. */

import { describe, it, expect } from "vitest";
import { EXPORTACION } from "@/config";
import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import { formaCanonica, hashCircuito } from "@/exportacion/hashCircuito";

function divisor(ids = { v: "V1", a: "R1", b: "R2", g: "GND1" }): Circuito {
  return {
    componentes: [
      crearComponente("fuenteDC", ids.v, { tensionV: 9 }, { x: 100, y: 200 }),
      crearComponente("resistencia", ids.a, { valorOhm: 1000 }, { x: 220, y: 120 }),
      crearComponente("resistencia", ids.b, { valorOhm: 2000 }, { x: 340, y: 200 }),
      crearComponente("tierra", ids.g, {}, { x: 100, y: 300 }),
    ],
    cables: [
      cable("w1", `${ids.v}:positivo`, `${ids.a}:a`),
      cable("w2", `${ids.a}:b`, `${ids.b}:a`),
      cable("w3", `${ids.b}:b`, `${ids.v}:negativo`),
      cable("w4", `${ids.v}:negativo`, `${ids.g}:ref`),
    ],
  };
}

describe("forma y longitud", () => {
  it("la huella tiene la longitud configurada y es hexadecimal en mayúsculas", async () => {
    const h = await hashCircuito(divisor());
    expect(h).toHaveLength(EXPORTACION.hashLongitud);
    expect(h).toMatch(/^[0-9A-F]+$/);
  });

  it("un circuito vacío también da huella, sin reventar", async () => {
    const h = await hashCircuito({ componentes: [], cables: [] });
    expect(h).toHaveLength(EXPORTACION.hashLongitud);
  });

  it("la misma entrada da siempre la misma huella", async () => {
    expect(await hashCircuito(divisor())).toBe(await hashCircuito(divisor()));
  });
});

describe("lo que NO cambia la huella", () => {
  it("mover los componentes por el lienzo", async () => {
    const a = divisor();
    const b = divisor();
    b.componentes[1]!.posicion = { x: 800, y: 40 };
    b.componentes[2]!.posicion = { x: 20, y: 500 };

    expect(await hashCircuito(b)).toBe(await hashCircuito(a));
  });

  it("rotarlos", async () => {
    const a = divisor();
    const b = divisor();
    b.componentes[1]!.rotacion = 90;
    expect(await hashCircuito(b)).toBe(await hashCircuito(a));
  });

  it("ponerles otros identificadores", async () => {
    // Dos equipos montan lo mismo y nombran distinto: es el mismo trabajo.
    const a = divisor();
    const b = divisor({ v: "V7", a: "RA", b: "RB", g: "TIERRA" });
    expect(await hashCircuito(b)).toBe(await hashCircuito(a));
  });

  it("declararlos en otro orden", async () => {
    const a = divisor();
    const b = divisor();
    b.componentes.reverse();
    b.cables.reverse();
    expect(await hashCircuito(b)).toBe(await hashCircuito(a));
  });

  it("nombrar los cables de otra manera", async () => {
    const a = divisor();
    const b = divisor();
    b.cables = b.cables.map((c, i) => ({ ...c, id: `cable_${i}` }));
    expect(await hashCircuito(b)).toBe(await hashCircuito(a));
  });
});

describe("lo que SÍ cambia la huella", () => {
  it("cambiar el valor de una resistencia", async () => {
    const a = divisor();
    const b = divisor();
    (b.componentes[1]!.params as { valorOhm: number }).valorOhm = 680;
    expect(await hashCircuito(b)).not.toBe(await hashCircuito(a));
  });

  it("cambiar la tensión de la fuente", async () => {
    const a = divisor();
    const b = divisor();
    (b.componentes[0]!.params as { tensionV: number }).tensionV = 12;
    expect(await hashCircuito(b)).not.toBe(await hashCircuito(a));
  });

  it("cambiar el cableado", async () => {
    const a = divisor();
    const b = divisor();
    b.cables.pop();
    expect(await hashCircuito(b)).not.toBe(await hashCircuito(a));
  });

  it("añadir un componente", async () => {
    const a = divisor();
    const b = divisor();
    b.componentes.push(crearComponente("led", "LED1"));
    expect(await hashCircuito(b)).not.toBe(await hashCircuito(a));
  });

  it("cambiar el tipo de un componente, recableando en consecuencia", async () => {
    const a = divisor();
    const b: Circuito = {
      componentes: [
        crearComponente("fuenteDC", "V1", { tensionV: 9 }),
        crearComponente("resistencia", "R1", { valorOhm: 1000 }),
        crearComponente("diodo", "D1"),
        crearComponente("tierra", "GND1"),
      ],
      cables: [
        cable("w1", "V1:positivo", "R1:a"),
        cable("w2", "R1:b", "D1:anodo"),
        cable("w3", "D1:catodo", "V1:negativo"),
        cable("w4", "V1:negativo", "GND1:ref"),
      ],
    };
    expect(await hashCircuito(b)).not.toBe(await hashCircuito(a));
    expect(formaCanonica(b)).toContain("diodo");
  });

  it("que un componente esté quemado", async () => {
    const a = divisor();
    const b = divisor();
    b.componentes[1]!.estado = { quemado: true };
    expect(await hashCircuito(b)).not.toBe(await hashCircuito(a));
  });

  it("un valor equivalente pero escrito distinto NO cuenta como distinto", async () => {
    const a = divisor();
    const b = divisor();
    (b.componentes[1]!.params as { valorOhm: number }).valorOhm = 1000.0;
    expect(await hashCircuito(b)).toBe(await hashCircuito(a));
  });
});

describe("forma canónica", () => {
  it("no menciona posiciones ni identificadores", () => {
    const canonica = formaCanonica(divisor());
    expect(canonica).not.toContain("R1");
    expect(canonica).not.toContain("V1");
    expect(canonica).not.toContain("posicion");
  });

  it("sí menciona los tipos y los valores", () => {
    const canonica = formaCanonica(divisor());
    expect(canonica).toContain("resistencia");
    expect(canonica).toContain("valorOhm=1000");
    expect(canonica).toContain("tensionV=9");
  });

  it("un circuito vacío se describe como tal", () => {
    expect(formaCanonica({ componentes: [], cables: [] })).toBe("vacio");
  });
});
