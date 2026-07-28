/* =========================================================================
   l5-zener-regulador.ts — Lección 5: el zener como regulador.

   Avería sembrada, en dos tiempos como pide la especificación:
     1. El zener está montado en directa, así que recorta a 0,7 V en vez de
        regular a 5,1 V.
     2. La verificación no se conforma con que regule en el punto en el que
        el estudiante lo deja: vuelve a resolver el circuito con una carga
        más exigente y comprueba que sigue regulando.

   Es la antesala de la fuente regulada, primer hito del curso.
   ========================================================================= */

import {
  cable,
  construirRed,
  crearComponente,
  nodoDeTerminal,
  type Circuito,
} from "@/motor/circuito";
import { formatearVatios, formatearVoltios } from "@/motor/valores";
import type { Solucion } from "@/motor/solverLineal";
import type { Leccion, Verificacion } from "../tipos";
import { componente, problemasBasicos, resolverVariante, tension } from "./ayudas";

const VOUT_MINIMA_V = 5.0;
const VOUT_MAXIMA_V = 5.2;
/** Carga exigente con la que se comprueba que la regulación aguanta. */
const CARGA_DURA_OHM = 220;

/** Tensión de salida: la del nodo donde se juntan Rs, el zener y la carga. */
function tensionDeSalida(circuito: Circuito, solucion: Solucion | null): number {
  if (!solucion?.ok) return 0;
  try {
    const red = construirRed(circuito);
    return solucion.tensiones.get(nodoDeTerminal(red, "RL", "a")) ?? 0;
  } catch {
    return 0;
  }
}

export const LECCION_5: Leccion = {
  id: "l5",
  numero: 5,
  titulo: "El zener como regulador",

  intro:
    "Este es un regulador con zener: 12 V de entrada, una resistencia serie " +
    "y un zener de 5,1 V que debería mantener la salida estable para la " +
    "carga. La salida no está donde tendría que estar.",

  sintoma:
    "La carga recibe menos de 1 V en lugar de los 5,1 V que debería " +
    "entregar el regulador.",

  pistaMedicion:
    "Mide la tensión en la carga y la del zener. Fíjate en el signo, y " +
    "después mira en la vista física hacia dónde apunta la franja del cátodo.",

  objetivo:
    "Montar el zener en la polaridad correcta y comprobar que la regulación " +
    "aguanta cuando la carga se vuelve más exigente.",

  circuitoInicial(): Circuito {
    return {
      componentes: [
        crearComponente("fuenteDC", "V1", { tensionV: 12 }, { x: 110, y: 250 }, 90),
        // 1 W, no 1/4: con el zener en directa esta resistencia disipa
        // 0,58 W. Con una de 1/4 W se quemaría nada más cargar la lección y
        // el estudiante llegaría a un circuito ya destruido, sin avería que
        // diagnosticar. En un montaje real, aquí va una de 1 W.
        crearComponente(
          "resistencia",
          "RS",
          { valorOhm: 220, toleranciaPct: 5, potenciaW: 1 },
          { x: 240, y: 170 },
        ),
        // La avería: ánodo hacia arriba, así que trabaja en directa.
        crearComponente(
          "zener",
          "Z1",
          { tensionRupturaV: 5.1, potenciaW: 0.5 },
          { x: 350, y: 250 },
          90,
        ),
        crearComponente(
          "resistencia",
          "RL",
          { valorOhm: 1000, toleranciaPct: 5, potenciaW: 0.5 },
          { x: 460, y: 250 },
          90,
        ),
        crearComponente("tierra", "GND1", {}, { x: 110, y: 370 }),
      ],
      cables: [
        cable("w1", "V1:positivo", "RS:a"),
        cable("w2", "RS:b", "Z1:anodo"),
        cable("w3", "RS:b", "RL:a"),
        cable("w4", "Z1:catodo", "V1:negativo"),
        cable("w5", "RL:b", "V1:negativo"),
        cable("w6", "V1:negativo", "GND1:ref"),
      ],
    };
  },

  opciones: [
    {
      id: "a",
      texto:
        "El zener está montado en directa: su ánodo mira hacia la resistencia " +
        "serie, así que se comporta como un diodo común y recorta la salida a " +
        "unos 0,7 V en vez de regular a 5,1 V.",
      correcta: true,
      explicacion:
        "Exacto. Un zener regula trabajando en INVERSA, en su zona de ruptura: " +
        "el cátodo va al lado positivo. Montado en directa es un diodo " +
        "cualquiera y fija 0,7 V. En la vista física, la franja del cátodo " +
        "debería mirar hacia la resistencia serie.",
    },
    {
      id: "b",
      texto:
        "La resistencia serie de 220 Ω es demasiado grande y no deja llegar " +
        "tensión suficiente a la carga.",
      correcta: false,
      explicacion:
        "No: mide la tensión en la resistencia serie. Está cayendo casi toda " +
        "la de la fuente precisamente porque algo aguas abajo está fijando la " +
        "salida muy baja. Con 220 Ω y esta carga sobra corriente.",
    },
    {
      id: "c",
      texto: "El zener está quemado y por eso no regula.",
      correcta: false,
      explicacion:
        "No: un zener quemado sería un circuito abierto y la salida subiría " +
        "hasta repartirse solo entre la resistencia serie y la carga, no " +
        "bajaría a 0,7 V. Que la salida esté clavada en 0,7 V delata un diodo " +
        "conduciendo en directa.",
    },
    {
      id: "d",
      texto:
        "La carga de 1 kΩ consume demasiada corriente y hunde la salida del " +
        "regulador.",
      correcta: false,
      explicacion:
        "No: con 5,1 V, una carga de 1 kΩ pide 5 mA, y por la resistencia " +
        "serie pueden pasar más de 30. Sobra margen. Prueba a quitar " +
        "mentalmente la carga: la salida seguiría en 0,7 V.",
    },
  ],

  verificar(circuito, solucion): Verificacion {
    const basicos = problemasBasicos(circuito, solucion, [
      { id: "Z1", nombre: "el zener" },
      { id: "RS", nombre: "la resistencia serie" },
      { id: "RL", nombre: "la carga" },
    ]);
    if (basicos) return basicos;

    const vZener = tension(solucion, "Z1");
    if (vZener > 0) {
      return {
        ok: false,
        mensaje:
          `El zener sigue en directa: mide ${formatearVoltios(vZener)} entre ` +
          "ánodo y cátodo. Intercambia sus dos cables para que el cátodo mire " +
          "hacia la resistencia serie. Rotarlo no sirve: mueve el dibujo, no " +
          "las conexiones.",
      };
    }

    const vout = tensionDeSalida(circuito, solucion);
    if (vout < VOUT_MINIMA_V || vout > VOUT_MAXIMA_V) {
      return {
        ok: false,
        mensaje:
          `La salida está en ${formatearVoltios(vout)} y debería quedar entre ` +
          `${formatearVoltios(VOUT_MINIMA_V)} y ${formatearVoltios(VOUT_MAXIMA_V)}. ` +
          "Revisa la resistencia serie: tiene que dejar pasar corriente " +
          "suficiente para que el zener entre en ruptura.",
      };
    }

    // Segunda parte de la avería: ¿aguanta una carga más exigente?
    const conCargaDura = resolverVariante(circuito, {
      RL: { valorOhm: CARGA_DURA_OHM },
    });
    const voutDuro = tensionDeSalida(circuito, conCargaDura);

    if (voutDuro < VOUT_MINIMA_V - 0.2) {
      return {
        ok: false,
        mensaje:
          `Regula bien con la carga actual, pero al exigirle más (una carga ` +
          `de ${CARGA_DURA_OHM} Ω) la salida se hunde hasta ` +
          `${formatearVoltios(voutDuro)}. La resistencia serie no deja pasar ` +
          "corriente suficiente: el zener se queda sin margen y sale de " +
          "ruptura.",
      };
    }

    const potenciaZener = solucion?.componentes.get("Z1")?.potenciaW ?? 0;

    return {
      ok: true,
      mensaje:
        `Correcto: la salida queda en ${formatearVoltios(vout)} y aguanta ` +
        `${formatearVoltios(voutDuro)} incluso con una carga de ` +
        `${CARGA_DURA_OHM} Ω. El zener disipa ${formatearVatios(potenciaZener)}, ` +
        "dentro de lo suyo. Esto es un regulador.",
    };
  },
};

/** Se exporta para las pruebas: comprobar la salida sin duplicar la lógica. */
export { tensionDeSalida as tensionDeSalidaL5 };

/** El componente de la carga, para que las pruebas puedan tocarlo. */
export function cargaDe(circuito: Circuito) {
  return componente(circuito, "RL");
}
