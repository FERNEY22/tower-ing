/* =========================================================================
   sesionStore.ts — Identidad del estudiante y sesion de trabajo.

   Es lo unico global de la aplicacion en esta fase. El circuito vivo tendra
   su propio store (estado/circuitoStore.ts) a partir de la fase 4.
   ========================================================================= */

import { create } from "zustand";
import type { Identidad } from "@/plataforma/ingreso/identidad";
import type { ProgresoEstudiante } from "@/plataforma/almacen/esquema";
import { almacen } from "@/plataforma/almacen";
import { Logger, nuevaSesionId } from "@/plataforma/registro/logger";
import { CronometroActividad } from "@/plataforma/registro/tiempoActivo";

interface EstadoSesion {
  identidad: Identidad | null;
  progreso: ProgresoEstudiante;
  logger: Logger | null;
  cronometro: CronometroActividad | null;
  cargando: boolean;
  error: string | null;

  ingresar(identidad: Identidad): Promise<void>;
  refrescarProgreso(): Promise<void>;
  salir(): Promise<void>;
}

export const useSesion = create<EstadoSesion>((set, get) => ({
  identidad: null,
  progreso: {},
  logger: null,
  cronometro: null,
  cargando: false,
  error: null,

  async ingresar(identidad) {
    set({ cargando: true, error: null });
    try {
      await almacen.init();
      await almacen.registrarParticipante(
        identidad.ccHash,
        identidad.nombre,
        identidad.ccMask,
      );
      const progreso = await almacen.cargarProgreso(identidad.ccHash);

      const logger = new Logger({
        almacen,
        ccHash: identidad.ccHash,
        sesionId: nuevaSesionId(almacen.ahora()),
      });
      logger.iniciar();
      logger.emitir("session_start");

      const cronometro = new CronometroActividad(() => almacen.ahora());
      cronometro.iniciar();

      set({ identidad, progreso, logger, cronometro, cargando: false });
    } catch (e) {
      set({
        cargando: false,
        error: e instanceof Error ? e.message : "No se pudo conectar.",
      });
    }
  },

  async refrescarProgreso() {
    const { identidad } = get();
    if (!identidad) return;
    try {
      const progreso = await almacen.cargarProgreso(identidad.ccHash);
      set({ progreso });
    } catch {
      /* el panel sigue mostrando lo ultimo conocido */
    }
  },

  async salir() {
    const { logger } = get();
    if (logger) {
      logger.emitir("session_end");
      await logger.cerrar();
    }
    set({
      identidad: null,
      progreso: {},
      logger: null,
      cronometro: null,
      error: null,
    });
  },
}));
