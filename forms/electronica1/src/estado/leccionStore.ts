/* =========================================================================
   leccionStore.ts — La sesion de leccion.

   Flujo: observar → medir → diagnosticar → reparar → verificar → bitácora.

   La regla central del curso esta metida en el FLUJO, no solo en la rubrica:
   al lienzo editable no se llega hasta haber declarado el diagnostico. No es
   que reparar antes puntue cero; es que no se puede. El objetivo explicito
   es romper el habito de cambiar cosas al azar hasta que encienda.
   ========================================================================= */

import { create } from "zustand";
import { INTENTOS } from "@/config";
import type { Leccion } from "@/lecciones/tipos";
import {
  calificar,
  estadoInicial,
  type EstadoEvaluacion,
} from "@/lecciones/calificacion";
import type {
  DesgloseNota,
  IntentoDiagnostico,
  ResultadoSesion,
} from "@/plataforma/almacen/esquema";
import { useCircuito } from "./circuitoStore";
import { useSesion } from "./sesionStore";
import { almacen } from "@/plataforma/almacen";
import { CronometroActividad } from "@/plataforma/registro/tiempoActivo";

export type PasoLeccion =
  | "observar"
  | "medir"
  | "diagnosticar"
  | "reparar"
  | "bitacora"
  | "resultado";

/** Orden del flujo. No se puede saltar ninguno. */
const ORDEN: PasoLeccion[] = [
  "observar",
  "medir",
  "diagnosticar",
  "reparar",
  "bitacora",
  "resultado",
];

interface EstadoLeccionStore {
  leccion: Leccion | null;
  paso: PasoLeccion;
  evaluacion: EstadoEvaluacion;
  /** Ultima respuesta a un diagnostico, para mostrar la explicacion. */
  ultimaExplicacion: string | null;
  /** Resultado de la ultima verificacion de reparacion. */
  ultimaVerificacion: { ok: boolean; mensaje: string } | null;
  bitacoraIA: string;
  nota: DesgloseNota | null;
  cronometro: CronometroActividad | null;
  guardando: boolean;
  errorGuardado: string | null;

  iniciar(leccion: Leccion): void;
  avanzar(): void;
  declararDiagnostico(opcionId: string): void;
  verificarReparacion(): void;
  escribirBitacora(texto: string): void;
  finalizar(): Promise<void>;
  abandonar(): void;
}

export const useLeccion = create<EstadoLeccionStore>((set, get) => ({
  leccion: null,
  paso: "observar",
  evaluacion: estadoInicial(),
  ultimaExplicacion: null,
  ultimaVerificacion: null,
  bitacoraIA: "",
  nota: null,
  cronometro: null,
  guardando: false,
  errorGuardado: null,

  iniciar(leccion) {
    // El circuito con la averia se carga en el mismo store que usa la
    // practica libre: el lienzo es el mismo, cambia quien lo gobierna.
    const circuito = useCircuito.getState();
    circuito.cargar(leccion.circuitoInicial());
    circuito.reiniciarContadores();

    const cronometro = new CronometroActividad(() => almacen.ahora());
    cronometro.iniciar();

    useSesion.getState().logger?.fijarLeccion(leccion.id);
    useSesion.getState().logger?.emitir("lesson_start", { leccion: leccion.id });

    set({
      leccion,
      paso: "observar",
      evaluacion: estadoInicial(),
      ultimaExplicacion: null,
      ultimaVerificacion: null,
      bitacoraIA: "",
      nota: null,
      cronometro,
      guardando: false,
      errorGuardado: null,
    });
  },

  avanzar() {
    const { paso, evaluacion } = get();
    const siguiente = ORDEN[ORDEN.indexOf(paso) + 1];
    if (!siguiente) return;

    // No se pasa a reparar sin diagnostico correcto declarado. Es la regla
    // central del curso, y aqui es una barrera, no una penalizacion.
    if (siguiente === "reparar" && !evaluacion.diagnosticos.some((d) => d.correcto)) {
      return;
    }
    // Ni a la bitacora sin haber verificado la reparacion.
    if (siguiente === "bitacora" && !evaluacion.reparacionVerificada) return;

    get().cronometro?.marcarInteraccion();
    set({ paso: siguiente });
  },

  declararDiagnostico(opcionId) {
    const { leccion, evaluacion, cronometro } = get();
    if (!leccion || get().paso !== "diagnosticar") return;
    // Una vez acertado, no se vuelve a responder.
    if (evaluacion.diagnosticos.some((d) => d.correcto)) return;

    const opcion = leccion.opciones.find((o) => o.id === opcionId);
    if (!opcion) return;

    cronometro?.marcarInteraccion();
    const relojes = cronometro?.leer();

    const intento: IntentoDiagnostico = {
      opcion: leccion.opciones.indexOf(opcion),
      etiqueta: opcion.texto,
      correcto: opcion.correcta,
      tSeg: relojes?.activoSeg ?? 0,
    };

    useSesion.getState().logger?.emitir("diagnosis_submitted", {
      opcion: opcion.id,
      correcto: opcion.correcta,
      intento: evaluacion.diagnosticos.length + 1,
    });

    set({
      evaluacion: {
        ...evaluacion,
        diagnosticos: [...evaluacion.diagnosticos, intento],
      },
      ultimaExplicacion: opcion.explicacion,
    });
  },

  verificarReparacion() {
    const { leccion, evaluacion, cronometro } = get();
    if (!leccion || get().paso !== "reparar") return;

    cronometro?.marcarInteraccion();
    const { circuito, solucion } = useCircuito.getState();
    const veredicto = leccion.verificar(circuito, solucion);

    useSesion.getState().logger?.emitir("repair_submitted", {
      ok: veredicto.ok,
      intento: evaluacion.reparacionesFallidas + 1,
    });

    set({
      ultimaVerificacion: veredicto,
      evaluacion: {
        ...evaluacion,
        reparacionVerificada: veredicto.ok,
        reparacionesFallidas: veredicto.ok
          ? evaluacion.reparacionesFallidas
          : evaluacion.reparacionesFallidas + 1,
      },
    });
  },

  escribirBitacora(texto) {
    set({ bitacoraIA: texto });
  },

  async finalizar() {
    const { leccion, evaluacion, bitacoraIA, cronometro } = get();
    if (!leccion) return;

    const contadores = useCircuito.getState().contadores;
    const evaluacionFinal: EstadoEvaluacion = {
      ...evaluacion,
      quemados: contadores.quemadosPorTipo,
      cortocircuitos: contadores.cortocircuitos,
    };

    const nota = calificar(evaluacionFinal);
    const relojes = cronometro?.detener();

    set({ nota, paso: "resultado", guardando: true, errorGuardado: null });

    const identidad = useSesion.getState().identidad;
    if (!identidad) {
      set({ guardando: false });
      return;
    }

    const resultado: ResultadoSesion = {
      nota: nota.total,
      desglose: nota,
      aprobado: nota.total >= 60,
      diagnosticos: evaluacionFinal.diagnosticos,
      reparacionesFallidas: evaluacionFinal.reparacionesFallidas,
      quemados: evaluacionFinal.quemados,
      cortocircuitos: evaluacionFinal.cortocircuitos,
      mediciones: contadores.mediciones,
      tActivoSeg: relojes?.activoSeg ?? 0,
      tPestanaSeg: relojes?.pestanaSeg ?? 0,
      bitacoraIA: bitacoraIA.trim(),
      ts: almacen.ahora(),
    };

    const logger = useSesion.getState().logger;
    logger?.emitir("lesson_complete", { leccion: leccion.id, nota: nota.total });

    try {
      await almacen.guardarResultado(
        identidad.ccHash,
        leccion.id,
        identidad.nombre,
        resultado,
      );
      await useSesion.getState().refrescarProgreso();
      set({ guardando: false });
    } catch (e) {
      set({
        guardando: false,
        errorGuardado:
          e instanceof Error
            ? e.message
            : "No se pudo guardar el resultado. Revisa tu conexión.",
      });
    }

    await logger?.vaciar();
  },

  abandonar() {
    useSesion.getState().logger?.fijarLeccion(null);
    set({
      leccion: null,
      paso: "observar",
      evaluacion: estadoInicial(),
      ultimaExplicacion: null,
      ultimaVerificacion: null,
      bitacoraIA: "",
      nota: null,
      cronometro: null,
    });
  },
}));

/* ----------------------------------------------------------------- ayudas */

/** True si en este paso el estudiante puede tocar el circuito. */
export function puedeEditar(paso: PasoLeccion): boolean {
  return paso === "reparar";
}

/** True si en este paso tiene el multimetro disponible. */
export function puedeMedir(paso: PasoLeccion): boolean {
  return paso === "medir" || paso === "diagnosticar" || paso === "reparar";
}

/** Intentos de leccion que le quedan al estudiante, segun el progreso. */
export function intentosRestantes(usados: number): number {
  return Math.max(0, INTENTOS.porLeccion - usados);
}
