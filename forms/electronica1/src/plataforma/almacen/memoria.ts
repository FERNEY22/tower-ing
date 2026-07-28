/* =========================================================================
   memoria.ts — Implementacion en memoria del Almacen.

   Sirve para desarrollar sin credenciales y para las pruebas automaticas.
   Es la referencia de comportamiento: firebase.ts debe comportarse igual.
   ========================================================================= */

import type { Almacen } from "./api";
import type {
  Participante,
  ProgresoEstudiante,
  ProgresoLeccion,
  ResultadoSesion,
  EventoRegistrado,
  CircuitoGuardado,
  FilaDocente,
} from "./esquema";
import { aprueba } from "@/config";

interface Base {
  participantes: Record<string, Participante>;
  progreso: Record<string, ProgresoEstudiante>;
  eventos: Record<string, Record<string, EventoRegistrado[]>>;
  circuitos: Record<string, CircuitoGuardado[]>;
}

function baseVacia(): Base {
  return { participantes: {}, progreso: {}, eventos: {}, circuitos: {} };
}

function progresoInicial(nombre: string): ProgresoLeccion {
  return {
    nombre,
    intentos: 0,
    mejorNota: 0,
    aprobado: false,
    aprobadoEn: null,
    bitacoraIA: [],
    ultimo: null,
  };
}

/** Copia profunda barata: los datos son JSON puro por diseño. */
function clonar<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class AlmacenMemoria implements Almacen {
  private base: Base = baseVacia();

  async init(): Promise<void> {
    /* nada que inicializar */
  }

  ahora(): number {
    return Date.now();
  }

  /** Solo para pruebas: deja la base como recien creada. */
  limpiar(): void {
    this.base = baseVacia();
  }

  async registrarParticipante(
    ccHash: string,
    nombre: string,
    ccMask: string,
  ): Promise<Participante> {
    const existente = this.base.participantes[ccHash];
    if (existente) return clonar(existente);
    const p: Participante = { nombre, ccMask, creado: this.ahora() };
    this.base.participantes[ccHash] = p;
    return clonar(p);
  }

  async cargarProgreso(ccHash: string): Promise<ProgresoEstudiante> {
    return clonar(this.base.progreso[ccHash] ?? {});
  }

  async guardarResultado(
    ccHash: string,
    leccionId: string,
    nombre: string,
    resultado: ResultadoSesion,
  ): Promise<ProgresoEstudiante> {
    const delEstudiante = (this.base.progreso[ccHash] ??= {});
    const actual = (delEstudiante[leccionId] ??= progresoInicial(nombre));

    actual.nombre = nombre;
    actual.intentos += 1;
    if (resultado.nota > actual.mejorNota) actual.mejorNota = resultado.nota;
    if (aprueba(resultado.nota) && !actual.aprobado) {
      actual.aprobado = true;
      actual.aprobadoEn = this.ahora();
    }
    if (resultado.bitacoraIA.trim()) {
      actual.bitacoraIA.push(resultado.bitacoraIA.trim());
    }
    actual.ultimo = clonar(resultado);

    return clonar(delEstudiante);
  }

  async registrarEventos(
    ccHash: string,
    sesionId: string,
    eventos: EventoRegistrado[],
  ): Promise<void> {
    if (!eventos.length) return;
    const porEstudiante = (this.base.eventos[ccHash] ??= {});
    const sesion = (porEstudiante[sesionId] ??= []);
    sesion.push(...clonar(eventos));
  }

  async cargarEventos(
    ccHash: string,
    sesionId: string,
  ): Promise<EventoRegistrado[]> {
    return clonar(this.base.eventos[ccHash]?.[sesionId] ?? []);
  }

  async guardarCircuito(
    ccHash: string,
    circuito: CircuitoGuardado,
  ): Promise<void> {
    const lista = (this.base.circuitos[ccHash] ??= []);
    lista.push(clonar(circuito));
  }

  async cargarCircuitos(ccHash: string): Promise<CircuitoGuardado[]> {
    const lista = this.base.circuitos[ccHash] ?? [];
    return clonar(lista).sort((a, b) => b.ts - a.ts);
  }

  async cargarGrupo(): Promise<FilaDocente[]> {
    return Object.keys(this.base.participantes)
      .map((ccHash) => {
        const p = this.base.participantes[ccHash]!;
        const progreso = this.base.progreso[ccHash] ?? {};
        return construirFila(ccHash, p, progreso);
      })
      .sort((a, b) => b.acumulado - a.acumulado);
  }
}

/** Aplanado compartido por los dos backends. */
export function construirFila(
  ccHash: string,
  participante: Participante,
  progreso: ProgresoEstudiante,
): FilaDocente {
  let acumulado = 0;
  let leccionesAprobadas = 0;
  let tActivoTotalSeg = 0;

  for (const l of Object.values(progreso)) {
    acumulado += l.mejorNota;
    if (l.aprobado) leccionesAprobadas += 1;
    if (l.ultimo) tActivoTotalSeg += l.ultimo.tActivoSeg;
  }

  return {
    ccHash,
    ccMask: participante.ccMask,
    nombre: participante.nombre,
    progreso: clonar(progreso),
    acumulado,
    leccionesAprobadas,
    tActivoTotalSeg,
  };
}
