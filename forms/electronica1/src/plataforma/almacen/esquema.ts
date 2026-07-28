/* =========================================================================
   esquema.ts — Forma exacta de los datos bajo el nodo raiz "electronica1".

   electronica1/
     participantes/{ccHash}        -> Participante
     progreso/{ccHash}/{leccionId} -> ProgresoLeccion
     eventos/{ccHash}/{sesionId}   -> { [pushId]: EventoRegistrado }
     circuitos/{ccHash}            -> { [pushId]: CircuitoGuardado }

   La cedula completa NO aparece en ninguna parte. La clave es su hash y la
   unica forma legible es la mascara (••••678).
   ========================================================================= */

import type { TipoEvento } from "@/plataforma/registro/eventos";

/* ---------------------------------------------------------- participantes */

export interface Participante {
  /** Nombre completo tal como lo escribio el estudiante. */
  nombre: string;
  /** Unica representacion de la cedula que se persiste. Ej: "••••678" */
  ccMask: string;
  /** Epoch ms del servidor. */
  creado: number;
}

/* -------------------------------------------------------------- progreso */

/** Desglose de la rubrica, en la escala 0-100. */
export interface DesgloseNota {
  diagnostico: number;
  reparacion: number;
  eficiencia: number;
  cuidado: number;
  total: number;
}

/** Un intento de diagnostico dentro de una sesion de leccion. */
export interface IntentoDiagnostico {
  /** Indice de la opcion elegida en la lista de distractores. */
  opcion: number;
  /** Texto de la opcion, para que el docente no tenga que cruzar tablas. */
  etiqueta: string;
  correcto: boolean;
  /** Segundos de tiempo activo transcurridos hasta responder. */
  tSeg: number;
}

/** Resultado de una sesion de leccion. */
export interface ResultadoSesion {
  nota: number;
  desglose: DesgloseNota;
  aprobado: boolean;
  diagnosticos: IntentoDiagnostico[];
  reparacionesFallidas: number;
  /** Componentes quemados, contados por tipo. Ej: { led: 2, resistencia: 1 } */
  quemados: Record<string, number>;
  cortocircuitos: number;
  mediciones: number;
  /** Segundos con interaccion real. */
  tActivoSeg: number;
  /** Segundos con la pestaña abierta. La diferencia con el activo es un dato. */
  tPestanaSeg: number;
  /** Respuesta a la bitacora de IA de esta sesion. */
  bitacoraIA: string;
  /** Epoch ms. */
  ts: number;
}

/** Acumulado por estudiante y leccion. */
export interface ProgresoLeccion {
  nombre: string;
  /** Sesiones consumidas. Tope en INTENTOS.porLeccion. */
  intentos: number;
  mejorNota: number;
  aprobado: boolean;
  /** Epoch ms de la primera aprobacion. Usado por el desbloqueo. */
  aprobadoEn: number | null;
  /** Todas las entradas de bitacora, una por sesion. */
  bitacoraIA: string[];
  /** Resultado de la ultima sesion. */
  ultimo: ResultadoSesion | null;
}

/** Progreso completo de un estudiante: { l1: {...}, l2: {...} } */
export type ProgresoEstudiante = Record<string, ProgresoLeccion>;

/* --------------------------------------------------------------- eventos */

export interface EventoRegistrado {
  tipo: TipoEvento;
  /** Epoch ms en el cliente, corregido con el desfase del servidor. */
  t: number;
  /** Id de leccion, o "practica-libre", o null fuera de actividad. */
  leccion: string | null;
  /** Carga util especifica del tipo. */
  payload?: Record<string, unknown>;
}

/* -------------------------------------------------------------- circuitos */

export interface CircuitoGuardado {
  nombre: string;
  ts: number;
  /** Hash corto del circuito, el mismo de la marca de agua del PNG. */
  hash: string;
  /** Serializacion del modelo de circuito. Se tipa en la fase 1. */
  circuito: unknown;
}

/* ---------------------------------------------------- vista para docentes */

/** Fila aplanada que consume el panel docente. */
export interface FilaDocente {
  ccHash: string;
  ccMask: string;
  nombre: string;
  progreso: ProgresoEstudiante;
  /** Suma de las mejores notas. */
  acumulado: number;
  leccionesAprobadas: number;
  tActivoTotalSeg: number;
}
