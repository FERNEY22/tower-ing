/* =========================================================================
   l2-led-sin-resistencia.ts — Lección 2: el LED que se quema.

   Avería sembrada: el LED está conectado directamente a la fuente, sin nada
   que limite la corriente.

   DECISIÓN DE DISEÑO: el circuito viene con el interruptor ABIERTO. Así el
   estudiante tiene que diagnosticar ANTES de que pase nada, en lugar de ver
   el LED ya quemado y deducir hacia atrás. Prevenir la avería enseña más que
   contemplarla, y encaja con la regla del curso: primero diagnosticar.

   Si cierra el interruptor sin poner la resistencia, el LED se quema de
   verdad — y eso también enseña.
   ========================================================================= */

import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import { formatearAmperios } from "@/motor/valores";
import { LIMITES } from "@/config";
import type { Leccion, Verificacion } from "../tipos";
import { corriente, interruptorCerrado, problemasBasicos } from "./ayudas";

const MINIMO_A = 0.008;
const MAXIMO_A = 0.012;

export const LECCION_2: Leccion = {
  id: "l2",
  numero: 2,
  titulo: "El LED que se quema",

  intro:
    "Un compañero montó este circuito para encender un LED rojo con una " +
    "fuente de 5 V y dejó el interruptor abierto antes de irse. Míralo bien " +
    "en la vista física antes de que alguien lo cierre.",

  sintoma:
    "El interruptor está abierto. Si se cierra tal como está el circuito, " +
    "va a pasar algo.",

  pistaMedicion:
    "Mide la tensión de la fuente y recorre la malla. Pregúntate qué " +
    "limitaría la corriente por el LED si el interruptor se cerrara.",

  objetivo:
    "Identificar ánodo y cátodo, y dimensionar la resistencia limitadora " +
    "para unos 10 mA.",

  circuitoInicial(): Circuito {
    return {
      // El hueco entre el interruptor y el LED es donde el estudiante tiene
      // que intercalar la resistencia limitadora.
      componentes: [
        crearComponente("fuenteDC", "V1", { tensionV: 5 }, { x: 110, y: 230 }, 90),
        crearComponente(
          "interruptor",
          "S1",
          { cerrado: false },
          { x: 240, y: 140 },
        ),
        crearComponente("led", "LED1", { color: "rojo" }, { x: 400, y: 230 }, 90),
        crearComponente("tierra", "GND1", {}, { x: 110, y: 350 }),
      ],
      cables: [
        cable("w1", "V1:positivo", "S1:a"),
        cable("w2", "S1:b", "LED1:anodo"),
        cable("w3", "LED1:catodo", "V1:negativo"),
        cable("w4", "V1:negativo", "GND1:ref"),
      ],
    };
  },

  opciones: [
    {
      id: "a",
      texto:
        "No hay resistencia limitadora: al cerrar el interruptor, el LED " +
        "quedaría directamente sobre los 5 V y la corriente se dispararía " +
        "muy por encima de los 30 mA que aguanta.",
      correcta: true,
      explicacion:
        "Exacto. Un LED no limita su propia corriente: por encima de su " +
        "tensión de codo, la corriente crece de forma exponencial. Con 5 V y " +
        "una caída de 1,9 V, hay que colocar en serie una resistencia que " +
        "absorba 3,1 V. Para 10 mA salen 310 Ω, y el valor de catálogo más " +
        "cercano es 330 Ω.",
    },
    {
      id: "b",
      texto:
        "El LED está montado al revés: el cátodo mira hacia el positivo de " +
        "la fuente y por eso no encendería.",
      correcta: false,
      explicacion:
        "No: mira la cara plana y la pata corta en la vista física. El ánodo " +
        "está del lado del interruptor, que es lo correcto. El problema no es " +
        "la polaridad.",
    },
    {
      id: "c",
      texto:
        "El interruptor está averiado y por eso el circuito no conduce en " +
        "este momento.",
      correcta: false,
      explicacion:
        "No: el interruptor está simplemente abierto, que es un estado " +
        "normal. Ábrelo y ciérralo en el inspector y verás que responde. El " +
        "problema es lo que pasaría al cerrarlo.",
    },
    {
      id: "d",
      texto:
        "La fuente de 5 V no da tensión suficiente para encender un LED rojo.",
      correcta: false,
      explicacion:
        "No: un LED rojo enciende con unos 1,9 V. Con 5 V sobra; el problema " +
        "es justo el contrario, que sobra demasiado y nada limita la corriente.",
    },
  ],

  verificar(circuito, solucion): Verificacion {
    const basicos = problemasBasicos(circuito, solucion, [
      { id: "LED1", nombre: "el LED" },
      { id: "S1", nombre: "el interruptor" },
    ]);
    if (basicos) return basicos;

    if (!interruptorCerrado(circuito, "S1")) {
      return {
        ok: false,
        mensaje:
          "El interruptor sigue abierto. Ciérralo desde el inspector: una " +
          "reparación que no se puede probar no está verificada.",
      };
    }

    const i = corriente(solucion, "LED1");

    if (i < MINIMO_A) {
      return {
        ok: false,
        mensaje:
          `Por el LED circulan ${formatearAmperios(i)} y hacen falta unos ` +
          `${formatearAmperios(0.01)}. La resistencia que pusiste es demasiado ` +
          "grande: el LED enciende poco o nada.",
      };
    }
    if (i > MAXIMO_A) {
      return {
        ok: false,
        mensaje:
          `Por el LED circulan ${formatearAmperios(i)}. El objetivo son ` +
          `${formatearAmperios(0.01)} y el límite del componente son ` +
          `${formatearAmperios(LIMITES.ledCorrienteMaxA)}. Sube el valor de la ` +
          "resistencia antes de que lo fundas.",
      };
    }

    return {
      ok: true,
      mensaje:
        `Correcto: con el interruptor cerrado circulan ${formatearAmperios(i)} ` +
        "y el LED enciende sin acercarse a su límite. Eso es dimensionar una " +
        "resistencia limitadora.",
    };
  },
};
