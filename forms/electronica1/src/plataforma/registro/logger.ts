/* =========================================================================
   logger.ts — Emision y cola de envio de eventos.

   Realtime Database no aguanta una escritura por cada arrastre del raton, y
   tampoco tiene sentido pagarla. Los eventos se acumulan y se envian por
   lotes: cuando hay REGISTRO.loteMaxEventos acumulados, cuando pasan
   REGISTRO.loteIntervaloMs, o cuando la actividad se cierra.

   Que se registra y con cuanto detalle sale de config.ts. Con nivel 0 el
   logger queda inerte sin que ningun otro archivo se entere.
   ========================================================================= */

import { REGISTRO } from "@/config";
import { seRegistra, type TipoEvento } from "./eventos";
import type { EventoRegistrado } from "@/plataforma/almacen/esquema";
import type { Almacen } from "@/plataforma/almacen/api";

export interface OpcionesLogger {
  almacen: Almacen;
  ccHash: string;
  /** Identificador de esta sesion. Agrupa los eventos en la base. */
  sesionId: string;
  /** Leccion en curso, o "practica-libre", o null. Se puede cambiar. */
  leccion?: string | null;
}

export class Logger {
  private almacen: Almacen;
  private ccHash: string;
  private sesionId: string;
  private leccion: string | null;

  private cola: EventoRegistrado[] = [];
  private emitidos = 0;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private enviando: Promise<void> = Promise.resolve();

  constructor(opciones: OpcionesLogger) {
    this.almacen = opciones.almacen;
    this.ccHash = opciones.ccHash;
    this.sesionId = opciones.sesionId;
    this.leccion = opciones.leccion ?? null;
  }

  /** Arranca el envio periodico. */
  iniciar(): void {
    if (this.temporizador || REGISTRO.nivel === 0) return;
    this.temporizador = setInterval(() => {
      void this.vaciar();
    }, REGISTRO.loteIntervaloMs);
  }

  /** Cambia la leccion asociada a los eventos siguientes. */
  fijarLeccion(leccion: string | null): void {
    this.leccion = leccion;
  }

  /** Encola un evento. Barato: no toca la red. */
  emitir(tipo: TipoEvento, payload?: Record<string, unknown>): void {
    if (!seRegistra(tipo, REGISTRO.nivel)) return;
    if (this.emitidos >= REGISTRO.maxEventosPorSesion) return;

    const evento: EventoRegistrado = {
      tipo,
      t: this.almacen.ahora(),
      leccion: this.leccion,
    };
    if (payload) evento.payload = payload;

    this.cola.push(evento);
    this.emitidos += 1;

    if (this.cola.length >= REGISTRO.loteMaxEventos) void this.vaciar();
  }

  /** Envia lo que haya en la cola. Los envios se serializan entre si. */
  async vaciar(): Promise<void> {
    if (!this.cola.length) return this.enviando;
    const lote = this.cola;
    this.cola = [];

    this.enviando = this.enviando
      .then(() =>
        this.almacen.registrarEventos(this.ccHash, this.sesionId, lote),
      )
      .catch((e) => {
        // Perder telemetria nunca puede tumbar la actividad del estudiante.
        console.warn("No se pudo enviar el lote de eventos:", e);
      });

    return this.enviando;
  }

  /** Vacia la cola y detiene el envio periodico. */
  async cerrar(): Promise<void> {
    if (this.temporizador) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
    await this.vaciar();
  }

  /** Solo para pruebas e inspeccion. */
  get pendientes(): number {
    return this.cola.length;
  }
}

/** Identificador de sesion legible y ordenable: 20260726-a1b2c3 */
export function nuevaSesionId(ahora: number): string {
  const f = new Date(ahora);
  const fecha =
    f.getFullYear().toString() +
    String(f.getMonth() + 1).padStart(2, "0") +
    String(f.getDate()).padStart(2, "0");
  const azar = Math.random().toString(36).slice(2, 8);
  return `${fecha}-${azar}`;
}
