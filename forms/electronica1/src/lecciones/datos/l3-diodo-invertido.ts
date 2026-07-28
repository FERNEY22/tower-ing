/* =========================================================================
   l3-diodo-invertido.ts — Lección 3: polarización directa e inversa.

   Avería sembrada: el diodo está montado al revés.

   El distractor bueno de esta lección es "el diodo está quemado": un diodo
   abierto y un diodo invertido dan LA MISMA lectura de tensión. Para
   distinguirlos hay que mirar la banda del cátodo en la vista física, o
   medir resistencia con el circuito sin alimentar. Eso es exactamente lo que
   se hace en el laboratorio.
   ========================================================================= */

import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import { formatearAmperios, formatearVoltios } from "@/motor/valores";
import type { Leccion, Verificacion } from "../tipos";
import { corriente, problemasBasicos, tension } from "./ayudas";

/** Caída directa que se enseña en el curso. */
const CAIDA_MINIMA_V = 0.6;
const CAIDA_MAXIMA_V = 0.8;
const CORRIENTE_MINIMA_A = 0.002;

export const LECCION_3: Leccion = {
  id: "l3",
  numero: 3,
  titulo: "Polarización directa e inversa",

  intro:
    "Este circuito debería encender el LED a través de un diodo de señal en " +
    "serie. Está alimentado con 5 V y bien conectado, pero no pasa nada. " +
    "Tienes el multímetro y las dos vistas.",

  sintoma: "El LED no enciende y prácticamente no circula corriente.",

  pistaMedicion:
    "Mide la tensión en cada componente de la malla. Cuando encuentres dónde " +
    "cae casi toda, pregúntate por qué: mira ese componente en la vista " +
    "física antes de decidir.",

  objetivo:
    "Diagnosticar la polarización con el multímetro y verificar la caída de " +
    "0,7 V del diodo en directa.",

  circuitoInicial(): Circuito {
    return {
      componentes: [
        crearComponente("fuenteDC", "V1", { tensionV: 5 }, { x: 110, y: 240 }, 90),
        crearComponente(
          "resistencia",
          "R1",
          { valorOhm: 470, toleranciaPct: 5, potenciaW: 0.25 },
          { x: 220, y: 140 },
        ),
        // La avería: cátodo hacia la fuente, así que bloquea.
        crearComponente("diodo", "D1", {}, { x: 340, y: 140 }),
        crearComponente("led", "LED1", { color: "verde" }, { x: 460, y: 240 }, 90),
        crearComponente("tierra", "GND1", {}, { x: 110, y: 360 }),
      ],
      cables: [
        cable("w1", "V1:positivo", "R1:a"),
        cable("w2", "R1:b", "D1:catodo"),
        cable("w3", "D1:anodo", "LED1:anodo"),
        cable("w4", "LED1:catodo", "V1:negativo"),
        cable("w5", "V1:negativo", "GND1:ref"),
      ],
    };
  },

  opciones: [
    {
      id: "a",
      texto:
        "El diodo D1 está montado al revés: su cátodo mira hacia la fuente, " +
        "así que queda polarizado en inversa y bloquea la corriente.",
      correcta: true,
      explicacion:
        "Exacto. Un diodo en inversa deja pasar apenas unos nanoamperios, así " +
        "que casi toda la tensión de la malla cae sobre él. En la vista física " +
        "la franja clara del cátodo está del lado de la resistencia, cuando " +
        "debería mirar hacia el LED.",
    },
    {
      id: "b",
      texto:
        "El diodo D1 está quemado y se comporta como un circuito abierto.",
      correcta: false,
      explicacion:
        "No, aunque la medida de tensión es idéntica: un diodo abierto también " +
        "se queda con toda la tensión. Para distinguirlos hay que mirar la " +
        "banda del cátodo en la vista física, o medir resistencia con el " +
        "circuito sin alimentar. Aquí la banda delata que está del revés.",
    },
    {
      id: "c",
      texto:
        "La resistencia de 470 Ω es demasiado grande y no deja pasar " +
        "corriente suficiente para encender el LED.",
      correcta: false,
      explicacion:
        "No: con 5 V y las caídas del diodo y del LED, 470 Ω dejarían pasar " +
        "unos 5 mA, de sobra para encenderlo. Además, mide la tensión en la " +
        "resistencia: es casi cero, señal de que la corriente la está " +
        "bloqueando otra cosa.",
    },
    {
      id: "d",
      texto: "El LED verde está montado al revés y por eso no enciende.",
      correcta: false,
      explicacion:
        "No: comprueba en la vista física que el ánodo del LED mira hacia el " +
        "diodo, que es lo correcto. Y aunque lo estuviera, la tensión no " +
        "caería donde está cayendo.",
    },
  ],

  verificar(circuito, solucion): Verificacion {
    const basicos = problemasBasicos(circuito, solucion, [
      { id: "D1", nombre: "el diodo" },
      { id: "LED1", nombre: "el LED" },
    ]);
    if (basicos) return basicos;

    const vDiodo = tension(solucion, "D1");
    const iDiodo = corriente(solucion, "D1");

    if (vDiodo < 0) {
      return {
        ok: false,
        mensaje:
          `El diodo sigue en inversa: mide ${formatearVoltios(vDiodo)} entre ` +
          "ánodo y cátodo. Cambia los dos cables de sitio para que el ánodo " +
          "mire hacia la fuente. Girarlo no basta: rotar mueve el dibujo, no " +
          "las conexiones.",
      };
    }

    if (iDiodo < CORRIENTE_MINIMA_A) {
      return {
        ok: false,
        mensaje:
          `El diodo ya está en directa, pero solo circulan ` +
          `${formatearAmperios(iDiodo)}. Revisa el resto de la malla: algo ` +
          "más está cortando el paso.",
      };
    }

    if (vDiodo < CAIDA_MINIMA_V || vDiodo > CAIDA_MAXIMA_V) {
      return {
        ok: false,
        mensaje:
          `El diodo cae ${formatearVoltios(vDiodo)}, fuera del entorno de los ` +
          "0,7 V que enseña el curso. Comprueba que la corriente está en el " +
          "orden de los miliamperios.",
      };
    }

    return {
      ok: true,
      mensaje:
        `Correcto: el diodo cae ${formatearVoltios(vDiodo)} en directa —los ` +
        `0,7 V del modelo— y circulan ${formatearAmperios(iDiodo)}. El LED ` +
        "enciende.",
    };
  },
};
