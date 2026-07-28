import { describe, it, expect } from "vitest";
import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import {
  ajustarAGrid,
  anclajesDe,
  cajaDelCircuito,
  componenteEn,
  contieneAlPunto,
  normalizarRotacion,
  puntoDeClave,
  rotarPunto,
  terminalCercano,
} from "@/vistas/compartido/geometria";
import {
  longitudDeRuta,
  puntoMedioDeRuta,
  puntosDeUnion,
  rutaComoPath,
  rutaDeCable,
  rutaOrtogonal,
} from "@/vistas/esquematica/enrutado";

describe("rotacion", () => {
  it("gira 90 grados en sentido horario", () => {
    expect(rotarPunto({ x: 10, y: 0 }, 90)).toEqual({ x: 0, y: 10 });
  });

  it("no deja residuos de coma flotante", () => {
    // Sin redondeo saldria x = 6,1e-16 y las comparaciones fallarian.
    const p = rotarPunto({ x: 30, y: 0 }, 90);
    expect(p.x).toBe(0);
    expect(p.y).toBe(30);
  });

  it("cuatro giros vuelven al punto de partida", () => {
    let p = { x: 30, y: 10 };
    for (let i = 0; i < 4; i++) p = rotarPunto(p, 90);
    expect(p).toEqual({ x: 30, y: 10 });
  });

  it("normaliza cualquier angulo a los cuatro de la rejilla", () => {
    expect(normalizarRotacion(360)).toBe(0);
    expect(normalizarRotacion(-90)).toBe(270);
    expect(normalizarRotacion(450)).toBe(90);
  });
});

describe("anclajes de los terminales", () => {
  it("una resistencia horizontal tiene los terminales a izquierda y derecha", () => {
    const r = crearComponente("resistencia", "R1", {}, { x: 100, y: 100 });
    const anclajes = anclajesDe(r);
    expect(anclajes.map((a) => a.punto)).toEqual([
      { x: 70, y: 100 },
      { x: 130, y: 100 },
    ]);
  });

  it("rotada 90 grados los tiene arriba y abajo", () => {
    const r = crearComponente("resistencia", "R1", {}, { x: 100, y: 100 }, 90);
    expect(anclajesDe(r).map((a) => a.punto)).toEqual([
      { x: 100, y: 70 },
      { x: 100, y: 130 },
    ]);
  });

  it("el anclaje conserva la polaridad, no solo la posicion", () => {
    const d = crearComponente("led", "LED1", {}, { x: 0, y: 0 });
    const anclajes = anclajesDe(d);
    expect(anclajes[0]!.polaridad).toBe("anodo");
    expect(anclajes[1]!.polaridad).toBe("catodo");
  });

  it("el potenciometro saca el cursor por arriba", () => {
    const p = crearComponente("potenciometro", "P1", {}, { x: 0, y: 0 });
    const cursor = anclajesDe(p).find((a) => a.terminal === "cursor")!;
    expect(cursor.punto).toEqual({ x: 0, y: -30 });
  });
});

describe("capturar terminales con el raton", () => {
  const circuito: Circuito = {
    componentes: [
      crearComponente("resistencia", "R1", {}, { x: 100, y: 100 }),
      crearComponente("resistencia", "R2", {}, { x: 300, y: 100 }),
    ],
    cables: [],
  };

  it("captura el terminal si se hace clic cerca", () => {
    expect(terminalCercano(circuito, { x: 72, y: 103 })?.clave).toBe("R1:a");
  });

  it("no captura nada si se hace clic lejos", () => {
    expect(terminalCercano(circuito, { x: 200, y: 200 })).toBeNull();
  });

  it("entre dos terminales cercanos gana el mas proximo", () => {
    const juntos: Circuito = {
      componentes: [
        crearComponente("resistencia", "R1", {}, { x: 100, y: 100 }),
        crearComponente("resistencia", "R2", {}, { x: 165, y: 100 }),
      ],
      cables: [],
    };
    // R1:b esta en 130, R2:a en 135. Un clic en 134 debe coger R2:a.
    expect(terminalCercano(juntos, { x: 134, y: 100 })?.clave).toBe("R2:a");
  });
});

describe("seleccionar componentes", () => {
  const circuito: Circuito = {
    componentes: [crearComponente("resistencia", "R1", {}, { x: 100, y: 100 })],
    cables: [],
  };

  it("el cuerpo se puede seleccionar", () => {
    expect(componenteEn(circuito, { x: 100, y: 100 })?.id).toBe("R1");
  });

  it("las patillas no cuentan como cuerpo", () => {
    expect(componenteEn(circuito, { x: 128, y: 100 })).toBeNull();
  });

  it("la caja gira con el componente", () => {
    const girada = crearComponente("resistencia", "R1", {}, { x: 100, y: 100 }, 90);
    expect(contieneAlPunto(girada, { x: 100, y: 118 })).toBe(true);
    expect(contieneAlPunto(girada, { x: 118, y: 100 })).toBe(false);
  });
});

describe("rejilla", () => {
  it("redondea al punto de rejilla mas cercano", () => {
    expect(ajustarAGrid({ x: 103, y: 197 })).toEqual({ x: 100, y: 200 });
    expect(ajustarAGrid({ x: -4, y: 5 })).toEqual({ x: -0, y: 10 });
  });
});

describe("enrutado ortogonal", () => {
  it("dos puntos alineados se unen con un solo tramo", () => {
    expect(rutaOrtogonal({ x: 0, y: 0 }, { x: 100, y: 0 })).toHaveLength(2);
    expect(rutaOrtogonal({ x: 0, y: 0 }, { x: 0, y: 100 })).toHaveLength(2);
  });

  it("en diagonal se traza con codos, nunca en diagonal", () => {
    const ruta = rutaOrtogonal({ x: 0, y: 0 }, { x: 100, y: 60 });
    expect(ruta).toHaveLength(4);

    // Cada tramo es horizontal o vertical, ninguno oblicuo.
    for (let i = 1; i < ruta.length; i++) {
      const a = ruta[i - 1]!;
      const b = ruta[i]!;
      expect(a.x === b.x || a.y === b.y).toBe(true);
    }
  });

  it("empieza y acaba exactamente en los terminales", () => {
    const desde = { x: 10, y: 20 };
    const hasta = { x: 90, y: 80 };
    const ruta = rutaOrtogonal(desde, hasta);
    expect(ruta[0]).toEqual(desde);
    expect(ruta[ruta.length - 1]).toEqual(hasta);
  });

  it("se convierte en un path de SVG", () => {
    expect(rutaComoPath([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toBe("M 0 0 L 10 0");
    expect(rutaComoPath([])).toBe("");
  });

  it("mide su longitud y encuentra su punto medio", () => {
    const ruta = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    expect(longitudDeRuta(ruta)).toBe(100);
    expect(puntoMedioDeRuta(ruta)).toEqual({ x: 50, y: 0 });
  });
});

describe("cables y puntos de union", () => {
  function circuitoConNodo(): Circuito {
    return {
      componentes: [
        crearComponente("resistencia", "R1", {}, { x: 100, y: 100 }),
        crearComponente("resistencia", "R2", {}, { x: 300, y: 100 }),
        crearComponente("resistencia", "R3", {}, { x: 300, y: 200 }),
      ],
      cables: [
        cable("w1", "R1:b", "R2:a"),
        cable("w2", "R1:b", "R3:a"),
      ],
    };
  }

  it("la ruta de un cable va de terminal a terminal", () => {
    const c = circuitoConNodo();
    const ruta = rutaDeCable(c, "w1")!;
    expect(ruta[0]).toEqual(puntoDeClave(c, "R1:b"));
    expect(ruta[ruta.length - 1]).toEqual(puntoDeClave(c, "R2:a"));
  });

  it("un cable inexistente no revienta", () => {
    expect(rutaDeCable(circuitoConNodo(), "w99")).toBeNull();
  });

  it("se dibuja punto donde confluyen tres o mas conexiones", () => {
    const c = circuitoConNodo();
    const uniones = puntosDeUnion(c);
    expect(uniones).toHaveLength(1);
    expect(uniones[0]).toEqual(puntoDeClave(c, "R1:b"));
  });

  it("una union de solo dos no lleva punto", () => {
    const c: Circuito = {
      componentes: [
        crearComponente("resistencia", "R1", {}, { x: 100, y: 100 }),
        crearComponente("resistencia", "R2", {}, { x: 300, y: 100 }),
      ],
      cables: [cable("w1", "R1:b", "R2:a")],
    };
    expect(puntosDeUnion(c)).toHaveLength(0);
  });
});

describe("caja del circuito", () => {
  it("envuelve todo con margen", () => {
    const c: Circuito = {
      componentes: [crearComponente("resistencia", "R1", {}, { x: 100, y: 100 })],
      cables: [],
    };
    const caja = cajaDelCircuito(c, 20);
    expect(caja.x).toBe(50); // terminal en 70, menos 20 de margen
    expect(caja.ancho).toBe(100);
  });

  it("un circuito vacio devuelve una caja utilizable", () => {
    const caja = cajaDelCircuito({ componentes: [], cables: [] });
    expect(caja.ancho).toBeGreaterThan(0);
    expect(caja.alto).toBeGreaterThan(0);
  });
});
