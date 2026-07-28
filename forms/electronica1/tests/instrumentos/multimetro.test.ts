/* El multimetro no lee el circuito: se monta en el. Estas pruebas comprueban
   que sus resistencias internas se notan, que el amperimetro en paralelo hace
   lo que hace en el laboratorio, y que el ohmimetro se niega a medir con el
   circuito alimentado. */

import { describe, it, expect } from "vitest";
import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import {
  medir,
  medirCorrienteEnParalelo,
  medirCorrienteEnSerie,
  medirResistencia,
  medirTension,
  tieneAlimentacion,
} from "@/instrumentos/multimetro";
import { MULTIMETRO } from "@/config";

/** Divisor del caso A: 9 V, 1 kΩ y 2 kΩ. */
function divisor(): Circuito {
  return {
    componentes: [
      crearComponente("fuenteDC", "V1", { tensionV: 9 }),
      crearComponente("resistencia", "R1", { valorOhm: 1000 }),
      crearComponente("resistencia", "R2", { valorOhm: 2000 }),
      crearComponente("tierra", "GND1"),
    ],
    cables: [
      cable("w1", "V1:positivo", "R1:a"),
      cable("w2", "R1:b", "R2:a"),
      cable("w3", "R2:b", "V1:negativo"),
      cable("w4", "V1:negativo", "GND1:ref"),
    ],
  };
}

/** Dos resistencias sueltas, sin fuente. */
function sinAlimentar(): Circuito {
  return {
    componentes: [
      crearComponente("resistencia", "R1", { valorOhm: 1000 }),
      crearComponente("resistencia", "R2", { valorOhm: 2000 }),
    ],
    cables: [cable("w1", "R1:b", "R2:a")],
  };
}

describe("voltimetro", () => {
  it("mide la caida de R2: los 6 V del caso A", () => {
    const m = medirTension(divisor(), "R2:a", "R2:b");
    expect(m.valido).toBe(true);
    expect(m.valor!).toBeCloseTo(6, 3);
  });

  it("invertir las puntas cambia el signo", () => {
    const directa = medirTension(divisor(), "R2:a", "R2:b").valor!;
    const invertida = medirTension(divisor(), "R2:b", "R2:a").valor!;
    expect(invertida).toBeCloseTo(-directa, 6);
  });

  it("mide la tension de la fuente entre sus bornes", () => {
    expect(medirTension(divisor(), "V1:positivo", "V1:negativo").valor!).toBeCloseTo(
      9,
      3,
    );
  });

  it("sus 10 MΩ cargan el circuito: la lectura NO es la ideal", () => {
    // Con 1 kΩ y 2 kΩ la carga apenas se nota, pero existe.
    const m = medirTension(divisor(), "R2:a", "R2:b");
    expect(m.valor!).not.toBe(6);
    expect(Math.abs(m.valor! - 6)).toBeLessThan(0.01);
  });

  it("con resistencias muy altas la carga se hace evidente", () => {
    // Divisor de 10 MΩ + 10 MΩ: el voltimetro queda en paralelo con la de
    // abajo y la lectura baja de 4,5 V a unos 3 V. Es la razon por la que en
    // el laboratorio se mide con instrumentos de alta impedancia.
    const c: Circuito = {
      componentes: [
        crearComponente("fuenteDC", "V1", { tensionV: 9 }),
        crearComponente("resistencia", "R1", { valorOhm: 10e6 }),
        crearComponente("resistencia", "R2", { valorOhm: 10e6 }),
        crearComponente("tierra", "GND1"),
      ],
      cables: [
        cable("w1", "V1:positivo", "R1:a"),
        cable("w2", "R1:b", "R2:a"),
        cable("w3", "R2:b", "V1:negativo"),
        cable("w4", "V1:negativo", "GND1:ref"),
      ],
    };

    const m = medirTension(c, "R2:a", "R2:b");
    expect(m.valor!).toBeLessThan(4);
    expect(m.valor!).toBeGreaterThan(2.5);
  });

  it("rechaza las dos puntas en el mismo sitio", () => {
    const m = medirTension(divisor(), "R2:a", "R2:a");
    expect(m.valido).toBe(false);
    expect(m.advertencia).toMatch(/mismo sitio/i);
  });

  it("rechaza una punta sobre un terminal que no existe", () => {
    expect(medirTension(divisor(), "R2:a", "R9:b").valido).toBe(false);
  });
});

describe("amperimetro en serie", () => {
  it("mide los 3 mA del caso A al abrir un cable", () => {
    const m = medirCorrienteEnSerie(divisor(), "w2");
    expect(m.valido).toBe(true);
    expect(Math.abs(m.valor!)).toBeCloseTo(0.003, 5);
  });

  it("no marca cortocircuito: es la forma correcta de conectarlo", () => {
    expect(medirCorrienteEnSerie(divisor(), "w2").cortocircuito).toBeUndefined();
  });

  it("sus 0,1 Ω apenas alteran la medida, pero estan", () => {
    // 3000 Ω + 0,1 Ω: el efecto es de una parte en treinta mil.
    const m = medirCorrienteEnSerie(divisor(), "w2");
    expect(Math.abs(m.valor!)).toBeLessThan(0.003);
    expect(MULTIMETRO.resistenciaAmperimetroOhm).toBe(0.1);
  });

  it("avisa si el cable ya no esta", () => {
    expect(medirCorrienteEnSerie(divisor(), "w99").valido).toBe(false);
  });
});

describe("amperimetro en paralelo: el error del laboratorio", () => {
  const m = medirCorrienteEnParalelo(divisor(), "R2:a", "R2:b");

  it("se marca como cortocircuito", () => {
    expect(m.cortocircuito).toBe(true);
  });

  it("explica el error sin impedirlo", () => {
    expect(m.advertencia).toMatch(/en serie/i);
    expect(m.advertencia).toMatch(/fusible/i);
  });

  it("la corriente se dispara: puentea la resistencia que mide", () => {
    // Sin el instrumento pasarian 3 mA; con el en paralelo sobre R2, la
    // corriente se va por sus 0,1 Ω.
    expect(Math.abs(m.valor!)).toBeGreaterThan(0.008);
  });

  it("en paralelo sobre la propia fuente es todavia peor", () => {
    const sobreLaFuente = medirCorrienteEnParalelo(
      divisor(),
      "V1:positivo",
      "V1:negativo",
    );
    expect(sobreLaFuente.cortocircuito).toBe(true);
    if (sobreLaFuente.valido) {
      expect(Math.abs(sobreLaFuente.valor!)).toBeGreaterThan(1);
    }
  });

  it("medir() con dos puntas en modo corriente es el montaje en paralelo", () => {
    const porFachada = medir(divisor(), "corriente", "R2:a", "R2:b");
    expect(porFachada.cortocircuito).toBe(true);
  });
});

describe("ohmimetro", () => {
  it("se niega a medir con el circuito alimentado", () => {
    const m = medirResistencia(divisor(), "R2:a", "R2:b");
    expect(m.valido).toBe(false);
    expect(m.advertencia).toMatch(/alimentado/i);
    expect(m.texto).toBe("— — —");
  });

  it("mide bien con el circuito sin alimentar", () => {
    const m = medirResistencia(sinAlimentar(), "R1:a", "R1:b");
    expect(m.valido).toBe(true);
    expect(m.valor!).toBeCloseTo(1000, 0);
  });

  it("mide dos resistencias en serie como su suma", () => {
    const m = medirResistencia(sinAlimentar(), "R1:a", "R2:b");
    expect(m.valor!).toBeCloseTo(3000, 0);
  });

  it("muestra OL en un camino abierto", () => {
    const c: Circuito = {
      componentes: [
        crearComponente("resistencia", "R1", { valorOhm: 1000 }),
        crearComponente("resistencia", "R2", { valorOhm: 1000 }),
      ],
      cables: [],
    };
    const m = medirResistencia(c, "R1:a", "R2:a");
    expect(m.texto).toBe("OL");
    expect(m.valor).toBe(Infinity);
  });

  it("detecta si el circuito tiene fuente conectada", () => {
    expect(tieneAlimentacion(divisor())).toBe(true);
    expect(tieneAlimentacion(sinAlimentar())).toBe(false);
  });

  it("una fuente en el lienzo pero sin cablear no cuenta como alimentacion", () => {
    const c = sinAlimentar();
    c.componentes.push(crearComponente("fuenteDC", "V1", { tensionV: 9 }));
    expect(tieneAlimentacion(c)).toBe(false);
    expect(medirResistencia(c, "R1:a", "R1:b").valido).toBe(true);
  });
});

describe("el instrumento no deja rastro en el circuito", () => {
  it("medir no modifica el circuito que se le pasa", () => {
    const c = divisor();
    const antes = JSON.stringify(c);

    medirTension(c, "R2:a", "R2:b");
    medirCorrienteEnSerie(c, "w2");
    medirCorrienteEnParalelo(c, "R2:a", "R2:b");
    medirResistencia(c, "R2:a", "R2:b");

    expect(JSON.stringify(c)).toBe(antes);
  });

  it("cada medida registra los puntos medidos", () => {
    const m = medirTension(divisor(), "R2:a", "R2:b");
    expect(m.puntos).toEqual(["R2:a", "R2:b"]);
  });
});
