/* =========================================================================
   CircuitosGuardados.tsx — Guardar y recuperar circuitos propios.
   ========================================================================= */

import { useEffect, useState } from "react";
import { usePractica } from "@/estado/practicaStore";
import { useSesion } from "@/estado/sesionStore";
import "./practica.css";

export function CircuitosGuardados() {
  const [nombre, setNombre] = useState("");
  const identidad = useSesion((s) => s.identidad);

  const guardados = usePractica((s) => s.guardados);
  const guardando = usePractica((s) => s.guardando);
  const cargando = usePractica((s) => s.cargando);
  const error = usePractica((s) => s.error);
  const aviso = usePractica((s) => s.aviso);
  const refrescar = usePractica((s) => s.refrescar);
  const guardar = usePractica((s) => s.guardar);
  const recuperar = usePractica((s) => s.recuperar);
  const limpiarAviso = usePractica((s) => s.limpiarAviso);

  useEffect(() => {
    if (identidad) void refrescar();
  }, [identidad, refrescar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(limpiarAviso, 4000);
    return () => clearTimeout(t);
  }, [aviso, limpiarAviso]);

  async function alGuardar() {
    await guardar(nombre);
    setNombre("");
  }

  return (
    <section className="guardados">
      <h2>Mis circuitos</h2>

      <div className="guardar-fila">
        <input
          className="t"
          type="text"
          placeholder="Nombre del circuito"
          value={nombre}
          maxLength={60}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void alGuardar();
          }}
        />
        <button className="btn" onClick={() => void alGuardar()} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>

      {aviso && <p className="guardado-aviso">{aviso}</p>}
      {error && <p className="err">{error}</p>}

      {cargando ? (
        <p className="hint">Cargando tus circuitos…</p>
      ) : guardados.length === 0 ? (
        <p className="hint">
          Todavía no has guardado ninguno. Los circuitos guardados se recuperan
          tal cual, listos para seguir editándolos.
        </p>
      ) : (
        <ul className="lista-guardados">
          {guardados.map((g) => (
            <li key={g.hash + g.ts}>
              <div className="guardado-datos">
                <strong>{g.nombre}</strong>
                <span className="hint">
                  {new Date(g.ts).toLocaleString("es-CO", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}{" "}
                  · {g.hash}
                </span>
              </div>
              <button className="btn ghost" onClick={() => recuperar(g.hash)}>
                Recuperar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
