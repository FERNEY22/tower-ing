/* =========================================================================
   diagnostico.ts — Como le habla el motor al estudiante.

   Regla del proyecto: el motor NUNCA lanza una excepcion tecnica hacia la
   interfaz. Todo lo que puede salir mal —un circuito mal construido, un
   solver que no converge— sale por aqui, en lenguaje de estudiante y
   diciendo que componente y que terminal estan implicados.

   Un "error" impide resolver el circuito. Un "aviso" no: se muestra y se
   sigue adelante.
   ========================================================================= */

import {
  capitalizar,
  conArticulo,
  frasePosesiva,
  terminalVisible,
  type TipoComponente,
} from "./circuito";

export type Severidad = "error" | "aviso";

export type CodigoDiagnostico =
  | "sin-referencia"
  | "nodo-flotante"
  | "cortocircuito-fuente"
  | "componente-suelto"
  | "grafo-desconectado"
  /** Reservado para la fase 3: Newton no convergio. */
  | "no-converge";

export interface Diagnostico {
  codigo: CodigoDiagnostico;
  severidad: Severidad;
  /** Titulo corto, para la cabecera del aviso. */
  titulo: string;
  /** Explicacion en lenguaje de estudiante. Nunca jerga de solver. */
  mensaje: string;
  /** Ids de los componentes implicados, para resaltarlos en el lienzo. */
  componentes: string[];
  /** Claves de terminal implicadas: "r1:a". */
  terminales: string[];
  /** Nodos implicados. */
  nodos: string[];
}

interface Parcial {
  componentes?: string[];
  terminales?: string[];
  nodos?: string[];
}

function crear(
  codigo: CodigoDiagnostico,
  severidad: Severidad,
  titulo: string,
  mensaje: string,
  extra: Parcial = {},
): Diagnostico {
  return {
    codigo,
    severidad,
    titulo,
    mensaje,
    componentes: extra.componentes ?? [],
    terminales: extra.terminales ?? [],
    nodos: extra.nodos ?? [],
  };
}

/* ------------------------------------------------------- catalogo de casos */

export const Diagnosticos = {
  /** No habia tierra y se asigno el negativo de una fuente. Aviso discreto. */
  referenciaAsignada(componenteId: string, terminal: string): Diagnostico {
    return crear(
      "sin-referencia",
      "aviso",
      "Se asignó una referencia",
      "No colocaste tierra, así que se tomó como referencia (0 V) el borne " +
        "negativo de la fuente de menor tensión. Todas las medidas de tensión " +
        "están referidas a ese punto. Coloca el símbolo de tierra si prefieres " +
        "elegirlo tú.",
      { componentes: [componenteId], terminales: [`${componenteId}:${terminal}`] },
    );
  },

  /** Ni tierra ni fuente: no hay contra que medir. */
  sinReferenciaPosible(): Diagnostico {
    return crear(
      "sin-referencia",
      "error",
      "El circuito no tiene referencia",
      "No hay tierra ni fuente de alimentación, así que no existe un punto de " +
        "0 V contra el cual medir. Coloca una fuente DC, o el símbolo de " +
        "tierra, y vuelve a intentarlo.",
    );
  },

  /** Un terminal cableado a nada. */
  nodoFlotante(
    componenteId: string,
    tipo: TipoComponente,
    terminal: string,
    nodoId: string,
  ): Diagnostico {
    return crear(
      "nodo-flotante",
      "aviso",
      "Hay un terminal al aire",
      `El terminal ${terminalVisible(terminal)} ${frasePosesiva(tipo)} ` +
        `(${componenteId}) no ` +
        "llega a ninguna parte: no tiene camino hasta la referencia. Por ahí " +
        "no puede circular corriente. Conéctalo o retira el componente.",
      {
        componentes: [componenteId],
        terminales: [`${componenteId}:${terminal}`],
        nodos: [nodoId],
      },
    );
  },

  /** Los dos bornes de una fuente unidos sin nada que limite la corriente. */
  cortocircuitoFuente(
    fuenteId: string,
    nodoId: string,
    porCable: boolean,
  ): Diagnostico {
    return crear(
      "cortocircuito-fuente",
      "error",
      "Cortocircuito en la fuente",
      `Los dos bornes de la fuente ${fuenteId} están unidos ` +
        (porCable
          ? "directamente por un cable"
          : "por un camino sin resistencia (cables e interruptores cerrados)") +
        ". Por ahí circularía una corriente enorme y en el laboratorio real se " +
        "quemaría algo. Intercala una resistencia antes de alimentar.",
      { componentes: [fuenteId], nodos: [nodoId] },
    );
  },

  /** Componente colocado pero sin ningun cable. */
  componenteSuelto(componenteId: string, tipo: TipoComponente): Diagnostico {
    return crear(
      "componente-suelto",
      "aviso",
      "Hay un componente sin conectar",
      `${capitalizar(conArticulo(tipo))} (${componenteId}) está en el lienzo ` +
        "pero no tiene ningún cable. Todavía no forma parte del circuito.",
      { componentes: [componenteId] },
    );
  },

  /** Islas de circuito que no tocan la referencia. */
  grafoDesconectado(componentesIds: string[], nodos: string[]): Diagnostico {
    return crear(
      "grafo-desconectado",
      "aviso",
      "Hay una parte aislada",
      "Estos componentes forman un circuito aparte que no se conecta con el " +
        `resto: ${componentesIds.join(", ")}. No participan en la solución. ` +
        "Revisa si te faltó un cable de unión.",
      { componentes: componentesIds, nodos },
    );
  },

  /** Fase 3: el solver no llego a una solucion. */
  noConverge(): Diagnostico {
    return crear(
      "no-converge",
      "error",
      "No se pudo resolver el circuito",
      "El simulador no encontró una solución estable. Casi siempre significa " +
        "que hay algo mal armado: un componente al revés, una fuente sin " +
        "resistencia, o un camino que no cierra. Revisa las conexiones y las " +
        "polaridades antes de volver a alimentar.",
    );
  },
};

/* ----------------------------------------------------------------- utiles */

export function hayErrores(diagnosticos: Diagnostico[]): boolean {
  return diagnosticos.some((d) => d.severidad === "error");
}

export function soloAvisos(diagnosticos: Diagnostico[]): Diagnostico[] {
  return diagnosticos.filter((d) => d.severidad === "aviso");
}
