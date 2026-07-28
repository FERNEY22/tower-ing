/* =========================================================================
   api.ts — Interfaz de persistencia.

   Todo el juego habla con esta interfaz y nunca con Firebase directamente.
   Eso permite: (a) desarrollar sin nube, (b) probar el motor de leccion sin
   red, (c) cambiar de backend sin tocar el dominio.
   ========================================================================= */

import type {
  Participante,
  ProgresoEstudiante,
  ResultadoSesion,
  EventoRegistrado,
  CircuitoGuardado,
  FilaDocente,
} from "./esquema";

export interface Almacen {
  /** Arranca el backend y sincroniza el reloj. Idempotente. */
  init(): Promise<void>;

  /** Epoch ms corregido con el desfase del servidor. */
  ahora(): number;

  /** Crea el participante si no existe. Nunca sobrescribe el nombre previo. */
  registrarParticipante(
    ccHash: string,
    nombre: string,
    ccMask: string,
  ): Promise<Participante>;

  /** Progreso completo de un estudiante. {} si no tiene ninguno. */
  cargarProgreso(ccHash: string): Promise<ProgresoEstudiante>;

  /**
   * Guarda el resultado de una sesion de leccion.
   * Incrementa intentos, conserva la mejor nota y fija aprobadoEn la primera
   * vez que se aprueba. Devuelve el progreso actualizado de esa leccion.
   */
  guardarResultado(
    ccHash: string,
    leccionId: string,
    nombre: string,
    resultado: ResultadoSesion,
  ): Promise<ProgresoEstudiante>;

  /** Envia un lote de eventos. El logger decide cuando llamarlo. */
  registrarEventos(
    ccHash: string,
    sesionId: string,
    eventos: EventoRegistrado[],
  ): Promise<void>;

  /** Eventos de una sesion, para el detalle del panel docente. */
  cargarEventos(ccHash: string, sesionId: string): Promise<EventoRegistrado[]>;

  /** Guarda un circuito de practica libre. */
  guardarCircuito(ccHash: string, circuito: CircuitoGuardado): Promise<void>;

  /** Circuitos guardados por el estudiante, del mas reciente al mas antiguo. */
  cargarCircuitos(ccHash: string): Promise<CircuitoGuardado[]>;

  /** Todo el grupo, aplanado. Solo lo usa el panel docente. */
  cargarGrupo(): Promise<FilaDocente[]>;
}
