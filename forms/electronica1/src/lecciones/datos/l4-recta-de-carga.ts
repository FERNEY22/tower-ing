/* =========================================================================
   l4-recta-de-carga.ts — Lección 4: recta de carga y punto Q.

   Avería sembrada: una resistencia fija de 22 kΩ que deja el punto Q
   aplastado contra el origen. Al barrer el potenciómetro, Q apenas se mueve
   y la curva I-V no se recorre.

   Esta es la única lección con panel propio: la curva I-V del diodo con la
   recta de carga superpuesta y el punto Q desplazándose en vivo.
   ========================================================================= */

import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import { formatearAmperios } from "@/motor/valores";
import type { Leccion, Verificacion } from "../tipos";
import { corriente, problemasBasicos, resolverVariante } from "./ayudas";

/** El barrido completo del cursor tiene que cubrir al menos este recorrido. */
const CORRIENTE_MAXIMA_EXIGIDA_A = 0.006;
const CORRIENTE_MINIMA_EXIGIDA_A = 0.0015;
/** Y sin pasarse: el diodo de señal aguanta 200 mA. */
const CORRIENTE_TOPE_A = 0.05;

export const LECCION_4: Leccion = {
  id: "l4",
  numero: 4,
  titulo: "Recta de carga",

  intro:
    "Este circuito alimenta un diodo a través de una resistencia fija y un " +
    "potenciómetro en serie. La idea es recorrer la curva I-V del diodo " +
    "moviendo el cursor y ver cómo se desplaza el punto Q. Pero al barrer el " +
    "potenciómetro de un extremo al otro, el punto Q casi no se mueve.",

  sintoma:
    "El barrido completo del potenciómetro apenas cambia la corriente: el " +
    "punto Q se queda pegado al origen de la curva.",

  pistaMedicion:
    "Mueve el cursor del potenciómetro de 0 a 100 % y mira la corriente en " +
    "los dos extremos. Compara cuánto pesa el potenciómetro frente a la " +
    "resistencia fija en la resistencia total de la malla.",

  objetivo:
    "Dimensionar la resistencia fija para que el barrido del potenciómetro " +
    "recorra la región útil de la curva I-V.",

  panel: "curva-iv",

  circuitoInicial(): Circuito {
    return {
      componentes: [
        crearComponente("fuenteDC", "V1", { tensionV: 9 }, { x: 110, y: 250 }, 90),
        // La avería: 22 kΩ dominan la malla y el potenciómetro no pinta nada.
        crearComponente(
          "resistencia",
          "R1",
          { valorOhm: 22000, toleranciaPct: 5, potenciaW: 0.25 },
          { x: 220, y: 180 },
        ),
        crearComponente(
          "potenciometro",
          "P1",
          { totalOhm: 1000, cursor: 0.5 },
          { x: 350, y: 180 },
        ),
        crearComponente("diodo", "D1", {}, { x: 470, y: 250 }, 90),
        crearComponente("tierra", "GND1", {}, { x: 110, y: 370 }),
      ],
      cables: [
        cable("w1", "V1:positivo", "R1:a"),
        cable("w2", "R1:b", "P1:a"),
        // Como reóstato: se usa el cursor como segundo terminal, y el extremo
        // libre se ata al cursor. Es el montaje habitual, y de paso evita el
        // aviso de terminal al aire que no forma parte de la avería.
        cable("w3", "P1:b", "P1:cursor"),
        cable("w4", "P1:cursor", "D1:anodo"),
        cable("w5", "D1:catodo", "V1:negativo"),
        cable("w6", "V1:negativo", "GND1:ref"),
      ],
    };
  },

  opciones: [
    {
      id: "a",
      texto:
        "La resistencia fija de 22 kΩ domina la malla: el potenciómetro de " +
        "1 kΩ solo puede cambiar la resistencia total en un 4 %, así que el " +
        "punto Q apenas se desplaza.",
      correcta: true,
      explicacion:
        "Exacto. La recta de carga corta el eje de corriente en V/Rtotal. Con " +
        "22 kΩ fijos, mover el potiómetro entre 0 y 1 kΩ cambia Rtotal de " +
        "22 kΩ a 23 kΩ: la recta se mueve un pelo y Q con ella. Para que el " +
        "barrido sirva, la resistencia fija tiene que ser del orden del " +
        "potenciómetro o menor.",
    },
    {
      id: "b",
      texto:
        "El diodo está en inversa y por eso la corriente es tan pequeña en " +
        "todo el barrido.",
      correcta: false,
      explicacion:
        "No: mide la tensión entre ánodo y cátodo y verás que es positiva, " +
        "del orden de la caída directa. El diodo conduce; lo que pasa es que " +
        "le llega muy poca corriente.",
    },
    {
      id: "c",
      texto:
        "El potenciómetro está averiado: mover el cursor no cambia su " +
        "resistencia.",
      correcta: false,
      explicacion:
        "No: mide la resistencia del potenciómetro con el circuito sin " +
        "alimentar, moviendo el cursor. Responde perfectamente. El problema " +
        "es que su efecto queda enterrado por la resistencia fija.",
    },
    {
      id: "d",
      texto:
        "La fuente de 9 V es demasiado baja para recorrer la curva I-V del " +
        "diodo.",
      correcta: false,
      explicacion:
        "No: con 9 V y una caída de 0,7 V quedan 8,3 V para repartir. Es de " +
        "sobra; el problema está en cómo se reparten, no en cuánto hay.",
    },
  ],

  verificar(circuito, solucion): Verificacion {
    const basicos = problemasBasicos(circuito, solucion, [
      { id: "D1", nombre: "el diodo" },
      { id: "P1", nombre: "el potenciómetro" },
    ]);
    if (basicos) return basicos;

    // Lo que se verifica no es un punto: es que el BARRIDO sirva de algo.
    const enMinimo = resolverVariante(circuito, { P1: { cursor: 0 } });
    const enMaximo = resolverVariante(circuito, { P1: { cursor: 1 } });

    const iA = corriente(enMinimo, "D1");
    const iB = corriente(enMaximo, "D1");
    const alta = Math.max(iA, iB);
    const baja = Math.min(iA, iB);

    if (alta > CORRIENTE_TOPE_A) {
      return {
        ok: false,
        mensaje:
          `En un extremo del barrido circulan ${formatearAmperios(alta)}: te ` +
          "pasaste bajando la resistencia fija. Súbela antes de fundir el " +
          "diodo.",
      };
    }

    if (alta < CORRIENTE_MAXIMA_EXIGIDA_A) {
      return {
        ok: false,
        mensaje:
          `Con el cursor a tope solo llegas a ${formatearAmperios(alta)}. El ` +
          `barrido tiene que alcanzar al menos ` +
          `${formatearAmperios(CORRIENTE_MAXIMA_EXIGIDA_A)} para recorrer la ` +
          "región útil de la curva. La resistencia fija sigue mandando.",
      };
    }

    if (baja > CORRIENTE_MINIMA_EXIGIDA_A * 4) {
      return {
        ok: false,
        mensaje:
          "Ahora el potenciómetro casi no puede bajar la corriente: en el " +
          `extremo flojo todavía circulan ${formatearAmperios(baja)}. Con una ` +
          "resistencia fija tan pequeña, el barrido se queda en la parte alta " +
          "de la curva.",
      };
    }

    return {
      ok: true,
      mensaje:
        `Correcto: el barrido lleva la corriente de ${formatearAmperios(baja)} ` +
        `a ${formatearAmperios(alta)}. Ahora el punto Q recorre la curva I-V ` +
        "y se ve cómo la recta de carga gira al mover el cursor.",
    };
  },
};
