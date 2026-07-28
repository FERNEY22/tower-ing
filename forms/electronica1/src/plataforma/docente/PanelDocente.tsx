/* =========================================================================
   PanelDocente.tsx — Lo que el docente necesita ver del grupo.

   Además de las notas, lo que dice de verdad cómo va el curso: cuántos
   intentos de diagnóstico hicieron falta y QUÉ opción eligieron, qué se
   quemó, cuántos cortocircuitos, cuánto midieron antes de diagnosticar y
   cuánto tiempo estuvieron activos de verdad.

   Una tabla de notas dice quién aprobó. Esto dice qué no se está entendiendo.
   ========================================================================= */

import { useEffect, useMemo, useState } from "react";
import { CURSO, EVALUACION, LECCIONES, bandaDe } from "@/config";
import { almacen } from "@/plataforma/almacen";
import type { FilaDocente, ProgresoLeccion } from "@/plataforma/almacen/esquema";
import { autenticacion, CONTRASENA_SIMULADA, type Docente } from "./auth";
import {
  csvBitacoras,
  csvDiagnosticos,
  csvResumen,
  descargarCsv,
} from "./exportarCSV";
import "./docente.css";

export function PanelDocente() {
  const [docente, setDocente] = useState<Docente | null>(null);
  const [comprobando, setComprobando] = useState(true);

  useEffect(() => {
    const dejarDeOir = autenticacion.observar((d) => {
      setDocente(d);
      setComprobando(false);
    });
    return dejarDeOir;
  }, []);

  if (comprobando) {
    return (
      <div className="wrap">
        <p className="hint">Comprobando la sesión…</p>
      </div>
    );
  }

  return docente ? <Tablero docente={docente} /> : <Ingreso />;
}

/* ---------------------------------------------------------------- ingreso */

function Ingreso() {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setError("");
    try {
      await autenticacion.iniciar(email.trim(), contrasena);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="wrap" style={{ maxWidth: 420 }}>
      <div className="eyebrow">
        <span className="dot" /> {CURSO.codigo} · Docente
      </div>
      <h1>Panel de resultados</h1>

      {autenticacion.esSimulada && (
        <p className="aviso-simulada">
          <strong>Modo desarrollo.</strong> No hay configuración de Firebase, así
          que esta autenticación es simulada y <em>no protege nada</em>. Entra
          con cualquier correo y la contraseña <code>{CONTRASENA_SIMULADA}</code>.
          En producción se usa Firebase Auth con el correo autorizado del
          docente.
        </p>
      )}

      <form className="card" style={{ marginTop: 16 }} onSubmit={entrar}>
        <label className="f" htmlFor="email">
          Correo
        </label>
        <input
          className="t"
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="f" htmlFor="contrasena">
          Contraseña
        </label>
        <input
          className="t"
          id="contrasena"
          type="password"
          autoComplete="current-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />

        <p className="err">{error}</p>
        <button className="btn wide" type="submit" disabled={entrando}>
          {entrando ? "Entrando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

/* --------------------------------------------------------------- tablero */

function Tablero({ docente }: { docente: Docente }) {
  const [filas, setFilas] = useState<FilaDocente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [desplegada, setDesplegada] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      await almacen.init();
      setFilas(await almacen.cargarGrupo());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer la base.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  return (
    <div className="wrap ancho">
      <header className="docente-cabecera">
        <div>
          <div className="eyebrow">
            <span className="dot" /> {CURSO.codigo} · {CURSO.periodo}
          </div>
          <h1 style={{ fontSize: "clamp(22px,3.4vw,32px)" }}>
            Resultados del grupo
          </h1>
        </div>
        <div className="docente-acciones">
          <span className="hint">{docente.email}</span>
          <button className="btn ghost" onClick={() => void cargar()}>
            Actualizar
          </button>
          <button
            className="btn ghost"
            onClick={() => descargarCsv("resumen.csv", csvResumen(filas))}
            disabled={!filas.length}
          >
            CSV resumen
          </button>
          <button
            className="btn ghost"
            onClick={() => descargarCsv("diagnosticos.csv", csvDiagnosticos(filas))}
            disabled={!filas.length}
          >
            CSV diagnósticos
          </button>
          <button
            className="btn ghost"
            onClick={() => descargarCsv("bitacoras-ia.csv", csvBitacoras(filas))}
            disabled={!filas.length}
          >
            CSV bitácoras
          </button>
          <button className="btn ghost" onClick={() => void autenticacion.cerrar()}>
            Salir
          </button>
        </div>
      </header>

      {error && <p className="err">{error}</p>}

      <Indicadores filas={filas} />

      {cargando ? (
        <p className="hint">Cargando resultados…</p>
      ) : !filas.length ? (
        <p className="hint">Todavía no hay ningún estudiante registrado.</p>
      ) : (
        <div className="tablawrap">
          <table className="tabla-grupo">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Cédula</th>
                {LECCIONES.map((l) => (
                  <th key={l.id} title={l.titulo}>
                    L{l.n}
                  </th>
                ))}
                <th>Promedio</th>
                <th>Aprob.</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <FilaEstudiante
                  key={f.ccHash}
                  fila={f}
                  desplegada={desplegada === f.ccHash}
                  alDesplegar={() =>
                    setDesplegada(desplegada === f.ccHash ? null : f.ccHash)
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ indicadores */

function Indicadores({ filas }: { filas: FilaDocente[] }) {
  const datos = useMemo(() => {
    let quemados = 0;
    let cortos = 0;
    let mediciones = 0;
    const aprobadasPorLeccion: Record<string, number> = {};

    for (const f of filas) {
      for (const l of LECCIONES) {
        const p = f.progreso[l.id];
        if (p?.aprobado) {
          aprobadasPorLeccion[l.id] = (aprobadasPorLeccion[l.id] ?? 0) + 1;
        }
        const u = p?.ultimo;
        if (!u) continue;
        quemados += Object.values(u.quemados).reduce((s, n) => s + n, 0);
        cortos += u.cortocircuitos;
        mediciones += u.mediciones;
      }
    }

    return { quemados, cortos, mediciones, aprobadasPorLeccion };
  }, [filas]);

  return (
    <div className="indicadores">
      <Indicador n={filas.length} etiqueta="ESTUDIANTES" />
      {LECCIONES.map((l) => (
        <Indicador
          key={l.id}
          n={`${datos.aprobadasPorLeccion[l.id] ?? 0}/${filas.length}`}
          etiqueta={`L${l.n} APROBADA`}
          titulo={l.titulo}
        />
      ))}
      <Indicador n={datos.mediciones} etiqueta="MEDICIONES" />
      <Indicador n={datos.quemados} etiqueta="COMPONENTES QUEMADOS" />
      <Indicador n={datos.cortos} etiqueta="CORTOCIRCUITOS" />
    </div>
  );
}

function Indicador({
  n,
  etiqueta,
  titulo,
}: {
  n: number | string;
  etiqueta: string;
  titulo?: string;
}) {
  return (
    <div className="indicador" title={titulo}>
      <div className="n">{n}</div>
      <div className="l">{etiqueta}</div>
    </div>
  );
}

/* ------------------------------------------------------------- fila y detalle */

function FilaEstudiante({
  fila,
  desplegada,
  alDesplegar,
}: {
  fila: FilaDocente;
  desplegada: boolean;
  alDesplegar: () => void;
}) {
  const promedio = Math.round(fila.acumulado / LECCIONES.length);

  return (
    <>
      <tr className="fila-estudiante" onClick={alDesplegar}>
        <td>
          <span className="desplegador">{desplegada ? "▾" : "▸"}</span>{" "}
          {fila.nombre}
        </td>
        <td className="mono">{fila.ccMask}</td>
        {LECCIONES.map((l) => (
          <td key={l.id} className="num">
            <CeldaLeccion progreso={fila.progreso[l.id]} />
          </td>
        ))}
        <td className="num destacado">{promedio}</td>
        <td className="num">
          {fila.leccionesAprobadas}/{LECCIONES.length}
        </td>
        <td className="num">{formatearDuracion(fila.tActivoTotalSeg)}</td>
      </tr>

      {desplegada && (
        <tr className="fila-detalle">
          <td colSpan={LECCIONES.length + 5}>
            <Detalle fila={fila} />
          </td>
        </tr>
      )}
    </>
  );
}

function CeldaLeccion({ progreso }: { progreso: ProgresoLeccion | undefined }) {
  if (!progreso) return <span className="sin-datos">—</span>;

  const aprobado = progreso.aprobado;
  return (
    <span className={"nota " + (aprobado ? "ok" : "no")}>
      {progreso.mejorNota}
      {progreso.intentos > 1 && <sup>{progreso.intentos}</sup>}
    </span>
  );
}

function Detalle({ fila }: { fila: FilaDocente }) {
  const conDatos = LECCIONES.filter((l) => fila.progreso[l.id]);

  if (!conDatos.length) {
    return <p className="hint">Sin lecciones hechas todavía.</p>;
  }

  return (
    <div className="detalle">
      {conDatos.map((l) => {
        const p = fila.progreso[l.id]!;
        const u = p.ultimo;
        const quemados = Object.entries(u?.quemados ?? {});

        return (
          <section key={l.id} className="detalle-leccion">
            <h4>
              Lección {l.n} · {l.titulo}
              <span className={"banda " + (p.aprobado ? "ok" : "no")}>
                {p.mejorNota} · {bandaDe(p.mejorNota)}
              </span>
            </h4>

            <dl className="detalle-datos">
              <div>
                <dt>Intentos de lección</dt>
                <dd>{p.intentos}</dd>
              </div>
              <div>
                <dt>Mediciones</dt>
                <dd>{u?.mediciones ?? 0}</dd>
              </div>
              <div>
                <dt>Reparaciones fallidas</dt>
                <dd>{u?.reparacionesFallidas ?? 0}</dd>
              </div>
              <div>
                <dt>Cortocircuitos</dt>
                <dd>{u?.cortocircuitos ?? 0}</dd>
              </div>
              <div>
                <dt>Tiempo activo</dt>
                <dd>{formatearDuracion(u?.tActivoSeg ?? 0)}</dd>
              </div>
              <div>
                <dt>Pestaña abierta</dt>
                <dd>{formatearDuracion(u?.tPestanaSeg ?? 0)}</dd>
              </div>
            </dl>

            {quemados.length > 0 && (
              <p className="detalle-quemados">
                <strong>Quemados:</strong>{" "}
                {quemados.map(([tipo, n]) => `${tipo} ×${n}`).join(", ")}
              </p>
            )}

            {u && u.diagnosticos.length > 0 && (
              <div className="detalle-diagnosticos">
                <strong>Diagnóstico, intento a intento:</strong>
                <ol>
                  {u.diagnosticos.map((d, i) => (
                    <li key={i} className={d.correcto ? "acierto" : "fallo"}>
                      {d.etiqueta}
                      <span className="hint"> · {d.tSeg} s</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {p.bitacoraIA.length > 0 && (
              <div className="detalle-bitacora">
                <strong>Bitácora de IA:</strong>
                {p.bitacoraIA.map((entrada, i) => (
                  <blockquote key={i}>{entrada}</blockquote>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- ayudas */

export function formatearDuracion(segundos: number): string {
  if (!segundos) return "—";
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export const UMBRAL = EVALUACION.umbralAprobacion;
