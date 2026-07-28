/* =========================================================================
   tiempoActivo.ts — Dos relojes.

   tiempoActivo:  suma de los intervalos con interaccion real. Se congela a
                  los TIEMPO.inactividadMs sin que el estudiante toque nada.
   tiempoPestana: tiempo total con la actividad abierta.

   La diferencia entre ambos es, por si sola, un dato interesante para el
   docente: distingue a quien piensa de quien dejo la pestaña abierta.

   No penaliza nada. Solo mide.
   ========================================================================= */

import { TIEMPO } from "@/config";

export interface Relojes {
  activoSeg: number;
  pestanaSeg: number;
  /** True si el estudiante lleva mas de TIEMPO.inactividadMs sin interactuar. */
  inactivo: boolean;
}

export class CronometroActividad {
  private inicio = 0;
  private ultimaInteraccion = 0;
  private activoMs = 0;
  private ultimoCorte = 0;
  private corriendo = false;
  private ahora: () => number;

  /** `ahora` se inyecta para poder probar sin esperar en tiempo real. */
  constructor(ahora: () => number = () => Date.now()) {
    this.ahora = ahora;
  }

  iniciar(): void {
    const t = this.ahora();
    this.inicio = t;
    this.ultimaInteraccion = t;
    this.ultimoCorte = t;
    this.activoMs = 0;
    this.corriendo = true;
  }

  /**
   * Se llama en cada interaccion real: clic, tecla, arrastre, medicion.
   * No en movimientos de raton sin boton ni en temporizadores.
   */
  marcarInteraccion(): void {
    if (!this.corriendo) return;
    const t = this.ahora();
    this.acumularHasta(t);
    this.ultimaInteraccion = t;
  }

  /** Acumula el tramo pendiente, descontando la inactividad. */
  private acumularHasta(t: number): void {
    const desdeUltimoCorte = t - this.ultimoCorte;
    if (desdeUltimoCorte <= 0) return;

    const inactivoDesde = this.ultimaInteraccion + TIEMPO.inactividadMs;
    // El tramo cuenta solo hasta el momento en que expiro la inactividad.
    const finComputable = Math.min(t, Math.max(this.ultimoCorte, inactivoDesde));
    const sumable = finComputable - this.ultimoCorte;
    if (sumable > 0) this.activoMs += sumable;
    this.ultimoCorte = t;
  }

  leer(): Relojes {
    const t = this.ahora();
    if (this.corriendo) this.acumularHasta(t);
    return {
      activoSeg: Math.max(0, Math.round(this.activoMs / 1000)),
      pestanaSeg: Math.max(0, Math.round((t - this.inicio) / 1000)),
      inactivo: t - this.ultimaInteraccion > TIEMPO.inactividadMs,
    };
  }

  /** True si la sesion lleva tanto tiempo sin interaccion que debe cerrarse. */
  get huerfana(): boolean {
    return this.ahora() - this.ultimaInteraccion > TIEMPO.sesionHuerfanaMs;
  }

  detener(): Relojes {
    const r = this.leer();
    this.corriendo = false;
    return r;
  }
}
