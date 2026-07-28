/* =========================================================================
   multimetro.ts — Tres modos, y ninguno ideal.

   El instrumento no lee el circuito: SE MONTA en el circuito. Cada medida
   construye una copia del circuito con el multimetro dentro y la resuelve.
   Por eso el voltimetro carga la rama que mide y el amperimetro introduce su
   caida, igual que en la mesa del laboratorio.

   Medir con un instrumento ideal seria mas facil de programar y le enseñaria
   al estudiante algo que no es verdad.
   ========================================================================= */

import { MULTIMETRO } from "@/config";
import {
  crearCable,
  crearComponente,
  refDesdeClave,
  type Circuito,
} from "@/motor/circuito";
import { resolver } from "@/motor";
import { corrienteDe, tensionEntreNodos } from "@/motor/solverLineal";
import { construirRed, nodoDeTerminal } from "@/motor/circuito";
import {
  formatearAmperios,
  formatearOhm,
  formatearVoltios,
} from "@/motor/valores";

export type ModoMultimetro = "tension" | "corriente" | "resistencia";

export interface Medicion {
  modo: ModoMultimetro;
  /** Valor leido, o null si la lectura no es valida. */
  valor: number | null;
  /** Lo que se muestra en la pantalla del instrumento. */
  texto: string;
  valido: boolean;
  /** Explicacion cuando la lectura no vale o cuando algo salio mal. */
  advertencia?: string;
  /** True si la conexion provoco un cortocircuito. Se registra como evento. */
  cortocircuito?: boolean;
  /** Puntos medidos, para el registro. */
  puntos: string[];
}

const ID_MEDIDOR = "__DMM";
const ID_CABLE_A = "__DMM_a";
const ID_CABLE_B = "__DMM_b";

function pantallaVacia(
  modo: ModoMultimetro,
  advertencia: string,
  puntos: string[],
): Medicion {
  return { modo, valor: null, texto: "— — —", valido: false, advertencia, puntos };
}

function existeTerminal(circuito: Circuito, clave: string): boolean {
  const corte = clave.indexOf(":");
  if (corte < 0) return false;
  const comp = circuito.componentes.find((c) => c.id === clave.slice(0, corte));
  return !!comp?.terminales.some((t) => t.nombre === clave.slice(corte + 1));
}

/** Copia del circuito con un componente de dos patas intercalado entre A y B. */
function conMedidorEntre(
  circuito: Circuito,
  claveA: string,
  claveB: string,
  medidor: Circuito["componentes"][number],
  terminalA: string,
  terminalB: string,
): Circuito {
  return {
    componentes: [...circuito.componentes, medidor],
    cables: [
      ...circuito.cables,
      crearCable(ID_CABLE_A, refDesdeClave(claveA), {
        componenteId: ID_MEDIDOR,
        terminal: terminalA,
      }),
      crearCable(ID_CABLE_B, refDesdeClave(claveB), {
        componenteId: ID_MEDIDOR,
        terminal: terminalB,
      }),
    ],
  };
}

/** True si el circuito tiene alguna fuente conectada. */
export function tieneAlimentacion(circuito: Circuito): boolean {
  const cableados = new Set<string>();
  for (const c of circuito.cables) {
    cableados.add(`${c.desde.componenteId}:${c.desde.terminal}`);
    cableados.add(`${c.hasta.componenteId}:${c.hasta.terminal}`);
  }
  return circuito.componentes.some(
    (c) =>
      c.tipo === "fuenteDC" &&
      c.terminales.some((t) => cableados.has(`${c.id}:${t.nombre}`)),
  );
}

/* --------------------------------------------------------------- tension */

/**
 * Voltimetro entre dos terminales. Su resistencia interna de 10 MΩ se monta
 * de verdad, asi que carga el circuito: en un divisor de resistencias altas
 * la lectura no coincide con el calculo ideal, y eso es correcto.
 */
export function medirTension(
  circuito: Circuito,
  claveA: string,
  claveB: string,
): Medicion {
  const puntos = [claveA, claveB];

  if (claveA === claveB) {
    return pantallaVacia("tension", "Las dos puntas están en el mismo sitio.", puntos);
  }
  if (!existeTerminal(circuito, claveA) || !existeTerminal(circuito, claveB)) {
    return pantallaVacia("tension", "Alguna punta no está sobre un terminal.", puntos);
  }

  const medidor = crearComponente(
    "resistencia",
    ID_MEDIDOR,
    { valorOhm: MULTIMETRO.resistenciaVoltimetroOhm, potenciaW: 1e6 },
    { x: -1000, y: -1000 },
  );
  const conMedidor = conMedidorEntre(circuito, claveA, claveB, medidor, "a", "b");
  const solucion = resolver(conMedidor);

  if (!solucion.ok) {
    return pantallaVacia(
      "tension",
      "El circuito no se puede resolver, así que no hay nada que medir.",
      puntos,
    );
  }

  const red = construirRed(conMedidor);
  const valor = tensionEntreNodos(
    solucion,
    nodoDeTerminal(red, ID_MEDIDOR, "a"),
    nodoDeTerminal(red, ID_MEDIDOR, "b"),
  );

  return {
    modo: "tension",
    valor,
    texto: formatearVoltios(valor, 4),
    valido: true,
    puntos,
  };
}

/* -------------------------------------------------------------- corriente

   El amperimetro va EN SERIE. Se ofrecen las dos formas de conectarlo: la
   correcta, sustituyendo un cable, y la equivocada, en paralelo. La segunda
   existe justo para que el estudiante vea lo que pasa.                      */

/** Uso correcto: se abre un cable y el amperimetro ocupa su sitio. */
export function medirCorrienteEnSerie(
  circuito: Circuito,
  cableId: string,
): Medicion {
  const cable = circuito.cables.find((c) => c.id === cableId);
  if (!cable) {
    return pantallaVacia("corriente", "Ese cable ya no está.", []);
  }

  const claveA = `${cable.desde.componenteId}:${cable.desde.terminal}`;
  const claveB = `${cable.hasta.componenteId}:${cable.hasta.terminal}`;
  const puntos = [claveA, claveB];

  const medidor = crearComponente(
    "resistencia",
    ID_MEDIDOR,
    { valorOhm: MULTIMETRO.resistenciaAmperimetroOhm, potenciaW: 1e6 },
    { x: -1000, y: -1000 },
  );

  // El cable se retira: el amperimetro ocupa exactamente su lugar.
  const sinCable: Circuito = {
    ...circuito,
    cables: circuito.cables.filter((c) => c.id !== cableId),
  };
  const conMedidor = conMedidorEntre(sinCable, claveA, claveB, medidor, "a", "b");
  const solucion = resolver(conMedidor);

  if (!solucion.ok) {
    return pantallaVacia(
      "corriente",
      "El circuito no se puede resolver, así que no hay nada que medir.",
      puntos,
    );
  }

  const valor = corrienteDe(solucion, ID_MEDIDOR);
  return {
    modo: "corriente",
    valor,
    texto: formatearAmperios(valor, 4),
    valido: true,
    puntos,
  };
}

/**
 * Uso equivocado: el amperimetro en paralelo, sin abrir nada.
 *
 * Sus 0,1 Ω quedan puenteando lo que haya entre las dos puntas. Es el error
 * que hay que aprender a no cometer, asi que aqui no se impide: se hace, se
 * enseña la corriente disparada y se marca como cortocircuito.
 */
export function medirCorrienteEnParalelo(
  circuito: Circuito,
  claveA: string,
  claveB: string,
): Medicion {
  const puntos = [claveA, claveB];

  if (claveA === claveB) {
    return pantallaVacia("corriente", "Las dos puntas están en el mismo sitio.", puntos);
  }
  if (!existeTerminal(circuito, claveA) || !existeTerminal(circuito, claveB)) {
    return pantallaVacia("corriente", "Alguna punta no está sobre un terminal.", puntos);
  }

  const medidor = crearComponente(
    "resistencia",
    ID_MEDIDOR,
    { valorOhm: MULTIMETRO.resistenciaAmperimetroOhm, potenciaW: 1e6 },
    { x: -1000, y: -1000 },
  );
  const conMedidor = conMedidorEntre(circuito, claveA, claveB, medidor, "a", "b");
  const solucion = resolver(conMedidor);

  const advertencia =
    "Conectaste el amperímetro en paralelo. Sus 0,1 Ω puentean el circuito: " +
    "en el laboratorio real esto funde el fusible del instrumento. El " +
    "amperímetro va en serie, abriendo la conexión.";

  if (!solucion.ok) {
    return {
      ...pantallaVacia("corriente", advertencia, puntos),
      cortocircuito: true,
    };
  }

  const valor = corrienteDe(solucion, ID_MEDIDOR);
  return {
    modo: "corriente",
    valor,
    texto: formatearAmperios(valor, 4),
    valido: true,
    advertencia,
    cortocircuito: true,
    puntos,
  };
}

/* ----------------------------------------------------------- resistencia */

/** Tension de prueba del ohmimetro, como la pila interna de uno real. */
const TENSION_PRUEBA_V = 1;

/**
 * Ohmimetro. Solo funciona con el circuito sin alimentar: si hay una fuente
 * conectada, la lectura no vale y se dice por que.
 */
export function medirResistencia(
  circuito: Circuito,
  claveA: string,
  claveB: string,
): Medicion {
  const puntos = [claveA, claveB];

  if (claveA === claveB) {
    return pantallaVacia("resistencia", "Las dos puntas están en el mismo sitio.", puntos);
  }
  if (!existeTerminal(circuito, claveA) || !existeTerminal(circuito, claveB)) {
    return pantallaVacia("resistencia", "Alguna punta no está sobre un terminal.", puntos);
  }
  if (tieneAlimentacion(circuito)) {
    return pantallaVacia(
      "resistencia",
      "No se puede medir resistencia con el circuito alimentado. Desconecta " +
        "la fuente y vuelve a medir.",
      puntos,
    );
  }

  // Se aplica una tension conocida y se mide la corriente: R = V / I.
  const pila = crearComponente(
    "fuenteDC",
    ID_MEDIDOR,
    { tensionV: TENSION_PRUEBA_V },
    { x: -1000, y: -1000 },
  );
  const conMedidor = conMedidorEntre(
    circuito,
    claveA,
    claveB,
    pila,
    "positivo",
    "negativo",
  );
  const solucion = resolver(conMedidor);

  if (!solucion.ok) {
    return pantallaVacia(
      "resistencia",
      "No se pudo medir: revisa cómo están puestas las puntas.",
      puntos,
    );
  }

  const corriente = Math.abs(corrienteDe(solucion, ID_MEDIDOR));

  // Corriente despreciable = camino abierto. Un multimetro real muestra OL.
  if (!(corriente > 1e-9)) {
    return {
      modo: "resistencia",
      valor: Infinity,
      texto: "OL",
      valido: true,
      advertencia: "Circuito abierto entre las dos puntas.",
      puntos,
    };
  }

  const valor = TENSION_PRUEBA_V / corriente;
  return {
    modo: "resistencia",
    valor,
    texto: formatearOhm(valor),
    valido: true,
    puntos,
  };
}

/* --------------------------------------------------------------- fachada */

/** Medida entre dos puntas, segun el modo. */
export function medir(
  circuito: Circuito,
  modo: ModoMultimetro,
  claveA: string,
  claveB: string,
): Medicion {
  switch (modo) {
    case "tension":
      return medirTension(circuito, claveA, claveB);
    case "resistencia":
      return medirResistencia(circuito, claveA, claveB);
    case "corriente":
      // Dos puntas sobre terminales, sin abrir nada, es el montaje en
      // paralelo: el error clasico.
      return medirCorrienteEnParalelo(circuito, claveA, claveB);
  }
}

export const NOMBRE_MODO: Record<ModoMultimetro, string> = {
  tension: "Tensión (V)",
  corriente: "Corriente (A)",
  resistencia: "Resistencia (Ω)",
};
