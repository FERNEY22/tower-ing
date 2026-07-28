/* =========================================================================
   PUERTA DE LA FASE 3 (1/6) — Calibracion de las caidas directas (§2.3)

   El punto pedagogico del motor. Si el simulador dice 0,58 V donde el curso
   enseña 0,7 V, el estudiante concluye que su calculo a mano esta mal.

   La comprobacion es de circuito completo, no de la formula: se alimenta el
   elemento a traves de una resistencia dimensionada para que circulen ~20 mA
   y se mide lo que el simulador entrega, pasando por MNA y por Newton.
   ========================================================================= */

import { describe, it, expect } from "vitest";
import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import { resolver } from "@/motor";
import { CALIBRACIONES, CORRIENTE_CALIBRACION_A } from "@/motor/parametros";
import type { ColorLed } from "@/motor/circuito";

/**
 * Fuente + resistencia + elemento en serie. La resistencia se calcula para
 * que por la rama circulen aproximadamente 20 mA con la caida esperada.
 */
function bancoDePruebas(
  tipo: "diodo" | "led",
  color: ColorLed | undefined,
  caidaEsperadaV: number,
): Circuito {
  const alimentacionV = caidaEsperadaV + 5;
  const resistenciaOhm = 5 / CORRIENTE_CALIBRACION_A;

  const elemento =
    tipo === "led"
      ? crearComponente("led", "d1", { color: color ?? "rojo" })
      : crearComponente("diodo", "d1");

  return {
    componentes: [
      crearComponente("fuenteDC", "v1", { tensionV: alimentacionV }),
      crearComponente("resistencia", "r1", { valorOhm: resistenciaOhm }),
      elemento,
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

describe("calibracion de caidas directas", () => {
  for (const cal of CALIBRACIONES) {
    describe(cal.etiqueta, () => {
      const s = resolver(bancoDePruebas(cal.tipo, cal.color, cal.caidaObjetivoV));
      const elemento = s.componentes.get("d1")!;

      it("el circuito converge", () => {
        expect(s.ok).toBe(true);
        expect(s.diagnosticos).toEqual([]);
      });

      it(`circula del orden de ${CORRIENTE_CALIBRACION_A * 1000} mA`, () => {
        expect(elemento.corrienteA).toBeGreaterThan(0.015);
        expect(elemento.corrienteA).toBeLessThan(0.025);
      });

      it(`cae ${cal.caidaObjetivoV} V ± ${cal.toleranciaV}`, () => {
        expect(Math.abs(elemento.tensionV - cal.caidaObjetivoV)).toBeLessThanOrEqual(
          cal.toleranciaV,
        );
      });
    });
  }
});

describe("coherencia entre colores de LED", () => {
  function caidaDe(color: ColorLed): number {
    const objetivo = color === "rojo" ? 1.9 : color === "verde" ? 2.1 : 3.1;
    const s = resolver(bancoDePruebas("led", color, objetivo));
    return s.componentes.get("d1")!.tensionV;
  }

  it("el orden por color es el que se enseña: rojo < verde < azul", () => {
    expect(caidaDe("rojo")).toBeLessThan(caidaDe("verde"));
    expect(caidaDe("verde")).toBeLessThan(caidaDe("azul"));
  });

  it("blanco y azul comparten caida", () => {
    expect(caidaDe("blanco")).toBeCloseTo(caidaDe("azul"), 6);
  });

  it("el diodo de silicio cae bastante menos que cualquier LED", () => {
    const s = resolver(bancoDePruebas("diodo", undefined, 0.7));
    expect(s.componentes.get("d1")!.tensionV).toBeLessThan(caidaDe("rojo") - 1);
  });
});
