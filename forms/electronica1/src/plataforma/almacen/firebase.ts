/* =========================================================================
   firebase.ts — Implementacion del Almacen sobre Realtime Database.

   SDK modular (v12), no compat. Nodo raiz exclusivo: ALMACEN.nodoRaiz.
   Este proyecto no comparte datos con ninguna otra experiencia.

   Las escrituras de progreso van por transaccion: dos pestañas abiertas no
   pueden pisarse el contador de intentos.
   ========================================================================= */

import {
  getDatabase,
  ref,
  child,
  get,
  set,
  push,
  update,
  onValue,
  runTransaction,
  serverTimestamp,
  type Database,
} from "firebase/database";

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
import { construirFila } from "./memoria";
import { obtenerApp } from "./firebaseApp";
import { ALMACEN, aprueba } from "@/config";

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

export class AlmacenFirebase implements Almacen {
  private db: Database | null = null;
  private desfaseMs = 0;
  private listo = false;

  async init(): Promise<void> {
    if (this.listo) return;
    this.db = getDatabase(obtenerApp());

    // Reloj del servidor: el desbloqueo de lecciones y las marcas de tiempo
    // no deben depender del reloj local del estudiante.
    await new Promise<void>((resolve) => {
      const r = ref(this.db!, ".info/serverTimeOffset");
      onValue(r, (snap) => {
        this.desfaseMs = (snap.val() as number) ?? 0;
        resolve();
      });
    });

    this.listo = true;
  }

  ahora(): number {
    return Date.now() + this.desfaseMs;
  }

  private raiz() {
    if (!this.db) throw new Error("Almacen no inicializado: llama a init().");
    return ref(this.db, ALMACEN.nodoRaiz);
  }

  async registrarParticipante(
    ccHash: string,
    nombre: string,
    ccMask: string,
  ): Promise<Participante> {
    const r = child(this.raiz(), `participantes/${ccHash}`);
    const res = await runTransaction(r, (actual: Participante | null) => {
      if (actual) return actual; // nunca se sobrescribe
      return { nombre, ccMask, creado: serverTimestamp() };
    });
    const val = res.snapshot.val() as Participante | null;
    return val ?? { nombre, ccMask, creado: this.ahora() };
  }

  async cargarProgreso(ccHash: string): Promise<ProgresoEstudiante> {
    const snap = await get(child(this.raiz(), `progreso/${ccHash}`));
    return (snap.val() as ProgresoEstudiante | null) ?? {};
  }

  async guardarResultado(
    ccHash: string,
    leccionId: string,
    nombre: string,
    resultado: ResultadoSesion,
  ): Promise<ProgresoEstudiante> {
    const r = child(this.raiz(), `progreso/${ccHash}/${leccionId}`);
    await runTransaction(r, (actual: ProgresoLeccion | null) => {
      const p = actual ?? progresoInicial(nombre);
      p.nombre = nombre;
      p.intentos = (p.intentos ?? 0) + 1;
      if (resultado.nota > (p.mejorNota ?? 0)) p.mejorNota = resultado.nota;
      if (aprueba(resultado.nota) && !p.aprobado) {
        p.aprobado = true;
        p.aprobadoEn = this.ahora();
      }
      const nota = resultado.bitacoraIA?.trim();
      if (nota) p.bitacoraIA = [...(p.bitacoraIA ?? []), nota];
      p.ultimo = resultado;
      return p;
    });
    return this.cargarProgreso(ccHash);
  }

  async registrarEventos(
    ccHash: string,
    sesionId: string,
    eventos: EventoRegistrado[],
  ): Promise<void> {
    if (!eventos.length) return;
    // Un solo update multi-ruta en lugar de N escrituras sueltas.
    const base = child(this.raiz(), `eventos/${ccHash}/${sesionId}`);
    const lote: Record<string, EventoRegistrado> = {};
    for (const ev of eventos) {
      const clave = push(base).key;
      if (clave) lote[clave] = ev;
    }
    await update(base, lote);
  }

  async cargarEventos(
    ccHash: string,
    sesionId: string,
  ): Promise<EventoRegistrado[]> {
    const snap = await get(child(this.raiz(), `eventos/${ccHash}/${sesionId}`));
    const val = (snap.val() as Record<string, EventoRegistrado> | null) ?? {};
    return Object.values(val).sort((a, b) => a.t - b.t);
  }

  async guardarCircuito(
    ccHash: string,
    circuito: CircuitoGuardado,
  ): Promise<void> {
    const base = child(this.raiz(), `circuitos/${ccHash}`);
    await set(push(base), circuito);
  }

  async cargarCircuitos(ccHash: string): Promise<CircuitoGuardado[]> {
    const snap = await get(child(this.raiz(), `circuitos/${ccHash}`));
    const val = (snap.val() as Record<string, CircuitoGuardado> | null) ?? {};
    return Object.values(val).sort((a, b) => b.ts - a.ts);
  }

  async cargarGrupo(): Promise<FilaDocente[]> {
    // Se leen participantes y progreso, nunca eventos: el detalle fino se
    // pide bajo demanda al desplegar una fila.
    const [pSnap, gSnap] = await Promise.all([
      get(child(this.raiz(), "participantes")),
      get(child(this.raiz(), "progreso")),
    ]);
    const participantes =
      (pSnap.val() as Record<string, Participante> | null) ?? {};
    const progreso =
      (gSnap.val() as Record<string, ProgresoEstudiante> | null) ?? {};

    return Object.keys(participantes)
      .map((ccHash) =>
        construirFila(ccHash, participantes[ccHash]!, progreso[ccHash] ?? {}),
      )
      .sort((a, b) => b.acumulado - a.acumulado);
  }
}
