/* =========================================================================
   l1-codigo-colores.ts — Lección 1: código de colores y ley de Ohm.

   Avería sembrada: la resistencia limitadora es de 100 kΩ donde debería ser
   de unos 680 Ω. Dos órdenes de magnitud, que es justo lo que se falla al
   leer mal el multiplicador de la tercera banda.

   El síntoma es que el LED no enciende. El estudiante tiene que leer las
   bandas en la vista física, predecir la corriente con la ley de Ohm y
   contrastar con lo que mide.
   ========================================================================= */

import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import { formatearAmperios, formatearOhm } from "@/motor/valores";
import type { Leccion, Verificacion } from "../tipos";

/** Corriente que se busca en el LED, y margen aceptado. */
const OBJETIVO_A = 0.01;
const MINIMO_A = 0.008;
const MAXIMO_A = 0.012;

export const LECCION_1: Leccion = {
  id: "l1",
  numero: 1,
  titulo: "Código de colores y ley de Ohm",

  intro:
    "Este circuito debería encender un LED rojo con unos 10 mA. Está montado " +
    "y alimentado con 9 V, pero el LED no enciende. Antes de tocar nada, " +
    "mira la resistencia en la vista física y lee sus bandas.",

  sintoma: "El LED no enciende, aunque el circuito está bien conectado.",

  pistaMedicion:
    "Mide la tensión en la resistencia y la corriente que circula. Compara " +
    "esa corriente con la que habías calculado leyendo las bandas.",

  objetivo:
    "Leer el código de colores, predecir la corriente con la ley de Ohm y " +
    "contrastarla con la medición.",

  circuitoInicial(): Circuito {
    return {
      // Trazado compacto: fuente y LED en vertical, retorno limpio por abajo.
      // El encuadre se ajusta al circuito, así que cada unidad de más aquí es
      // tamaño que pierden los símbolos en pantalla.
      componentes: [
        crearComponente("fuenteDC", "V1", { tensionV: 9 }, { x: 110, y: 230 }, 90),
        // La avería: 100 kΩ donde tocaban ~680 Ω.
        crearComponente(
          "resistencia",
          "R1",
          { valorOhm: 100000, toleranciaPct: 5, potenciaW: 0.25 },
          { x: 250, y: 140 },
        ),
        crearComponente("led", "LED1", { color: "rojo" }, { x: 390, y: 230 }, 90),
        crearComponente("tierra", "GND1", {}, { x: 110, y: 350 }),
      ],
      cables: [
        cable("w1", "V1:positivo", "R1:a"),
        cable("w2", "R1:b", "LED1:anodo"),
        cable("w3", "LED1:catodo", "V1:negativo"),
        cable("w4", "V1:negativo", "GND1:ref"),
      ],
    };
  },

  opciones: [
    {
      id: "a",
      texto:
        "La resistencia es de 100 kΩ y debería ser de unos 680 Ω: limita la " +
        "corriente a menos de 0,1 mA y el LED no llega a encender.",
      correcta: true,
      explicacion:
        "Exacto. Marrón-negro-amarillo es 10 × 10⁴ = 100 kΩ. Con 9 V y la " +
        "caída de 1,9 V del LED, quedan 7,1 V sobre la resistencia: 7,1 / " +
        "100 000 = 71 µA, unas 140 veces menos de lo necesario. El error " +
        "típico es confundir la banda del multiplicador.",
    },
    {
      id: "b",
      texto: "El LED está montado al revés: el ánodo y el cátodo cambiados.",
      correcta: false,
      explicacion:
        "No: si estuviera invertido, la tensión en el LED sería negativa y " +
        "casi toda la de la fuente caería sobre él. Mide el LED y verás que " +
        "está polarizado en directa, solo que con muy poca corriente.",
    },
    {
      id: "c",
      texto: "La fuente de 9 V no da tensión suficiente para un LED rojo.",
      correcta: false,
      explicacion:
        "No: un LED rojo enciende con 1,9 V. Con 9 V sobra de largo. Mide la " +
        "tensión entre los bornes de la fuente y compruébalo.",
    },
    {
      id: "d",
      texto: "El LED está quemado y por eso no conduce.",
      correcta: false,
      explicacion:
        "No: un LED quemado sería un circuito abierto y no circularía nada " +
        "en absoluto. Aquí sí circula corriente, solo que muy poca.",
    },
  ],

  verificar(circuito, solucion): Verificacion {
    const led = circuito.componentes.find((c) => c.id === "LED1");
    if (!led) {
      return {
        ok: false,
        mensaje:
          "Falta el LED. La reparación consiste en dimensionar la resistencia, " +
          "no en quitar el componente que quieres encender.",
      };
    }
    if (led.estado.quemado) {
      return {
        ok: false,
        mensaje:
          "El LED está quemado: te pasaste con la corriente. Reemplázalo y " +
          "pon una resistencia mayor.",
      };
    }
    if (!solucion?.ok) {
      return {
        ok: false,
        mensaje:
          "El circuito todavía no se puede resolver. Revisa los avisos de " +
          "montaje antes de verificar.",
      };
    }

    const resultado = solucion.componentes.get("LED1");
    const corriente = resultado ? resultado.corrienteA : 0;

    if (corriente < MINIMO_A) {
      return {
        ok: false,
        mensaje:
          `Por el LED circulan ${formatearAmperios(corriente)} y hacen falta ` +
          `unos ${formatearAmperios(OBJETIVO_A)}. La resistencia sigue siendo ` +
          "demasiado grande.",
      };
    }
    if (corriente > MAXIMO_A) {
      return {
        ok: false,
        mensaje:
          `Por el LED circulan ${formatearAmperios(corriente)}, más de los ` +
          `${formatearAmperios(MAXIMO_A)} que admite esta lección. Sube el ` +
          "valor de la resistencia o lo acabarás quemando.",
      };
    }

    const r1 = circuito.componentes.find((c) => c.id === "R1");
    const valor =
      r1 && r1.tipo === "resistencia"
        ? (r1.params as { valorOhm: number }).valorOhm
        : 0;

    return {
      ok: true,
      mensaje:
        `Correcto: con ${formatearOhm(valor)} circulan ` +
        `${formatearAmperios(corriente)} y el LED enciende como debe.`,
    };
  },
};
