/* =========================================================================
   PanelLecciones.tsx — Donde aterriza el estudiante despues de entrar.
   ========================================================================= */

import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CURSO, EVALUACION, bandaDe } from "@/config";
import { useSesion } from "@/estado/sesionStore";
import { almacen } from "@/plataforma/almacen";
import { estadoDeTodas, resumen, type EstadoLeccion } from "./desbloqueo";
import "./panel.css";

export function PanelLecciones() {
  const identidad = useSesion((s) => s.identidad);
  const progreso = useSesion((s) => s.progreso);
  const refrescar = useSesion((s) => s.refrescarProgreso);
  const salir = useSesion((s) => s.salir);
  const navegar = useNavigate();

  // Al volver de una leccion, el progreso puede haber cambiado.
  useEffect(() => {
    const alVolver = () => void refrescar();
    window.addEventListener("focus", alVolver);
    return () => window.removeEventListener("focus", alVolver);
  }, [refrescar]);

  const estados = useMemo(
    () => estadoDeTodas(progreso, almacen.ahora()),
    [progreso],
  );
  const total = useMemo(() => resumen(progreso), [progreso]);

  if (!identidad) return null;

  return (
    <div className="wrap">
      <header className="panel-top">
        <div>
          <div className="panel-nombre">{identidad.nombre}</div>
          <div className="hint">C.C. {identidad.ccMask}</div>
        </div>
        <div className="panel-marcador">
          <div>
            <div className="n">{total.promedio}</div>
            <div className="l">NOTA PROMEDIO</div>
          </div>
          <div className="sep" />
          <div>
            <div className="n">
              {total.aprobadas}/{total.total}
            </div>
            <div className="l">APROBADAS</div>
          </div>
        </div>
      </header>

      <div className="tarjetas">
        {estados.map((e) => (
          <TarjetaLeccion
            key={e.leccion.id}
            estado={e}
            alJugar={() => navegar(`/leccion/${e.leccion.id}`)}
          />
        ))}

        <article className="tarjeta libre">
          <div className="tarjeta-top">
            <span className="num">∞</span>
            <span className="pill abierta">Siempre disponible</span>
          </div>
          <div className="tema">Sin evaluación</div>
          <h3>Práctica libre</h3>
          <p className="desc">
            Lienzo vacío, todos los componentes, sin límite de tiempo. Puedes
            guardar tus circuitos y recuperarlos después.
          </p>
          <div className="cta">
            <button
              className="btn ghost wide"
              onClick={() => navegar("/practica-libre")}
            >
              Abrir el lienzo
            </button>
          </div>
        </article>
      </div>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <button className="btn ghost" onClick={() => void salir()}>
          Salir
        </button>
      </div>

      <footer className="legal">
        Se aprueba con {EVALUACION.umbralAprobacion} sobre {EVALUACION.escalaMax}.
        El tiempo se registra pero no afecta tu nota. · {CURSO.universidad}
      </footer>
    </div>
  );
}

function TarjetaLeccion({
  estado,
  alJugar,
}: {
  estado: EstadoLeccion;
  alJugar: () => void;
}) {
  const { leccion, clase, motivo, mejorNota, intentosRestantes } = estado;
  const bloqueada = clase === "cerrada" || clase === "sin-intentos";

  const etiqueta =
    clase === "aprobada"
      ? "✓ Aprobada"
      : clase === "abierta"
        ? "Disponible"
        : clase === "sin-intentos"
          ? "Sin intentos"
          : "Bloqueada";

  return (
    <article className={`tarjeta l${leccion.n}${bloqueada ? " bloqueada" : ""}`}>
      <div className="tarjeta-top">
        <span className="num">{leccion.n}</span>
        <span
          className={`pill ${
            clase === "aprobada"
              ? "hecha"
              : clase === "abierta"
                ? "abierta"
                : "cerrada"
          }`}
        >
          {etiqueta}
        </span>
      </div>

      <div className="tema">{leccion.tema}</div>
      <h3>{leccion.titulo}</h3>
      <p className="desc">{leccion.descripcion}</p>

      {clase === "aprobada" || mejorNota > 0 ? (
        <div className="nota">
          <span className="v">{mejorNota}</span>
          <span className="b">{bandaDe(mejorNota)}</span>
        </div>
      ) : null}

      {bloqueada && motivo ? <div className="motivo">{motivo}</div> : null}

      <div className="cta">
        <button
          className={`btn wide${clase === "aprobada" ? " ghost" : ""}`}
          disabled={bloqueada}
          onClick={alJugar}
        >
          {clase === "aprobada"
            ? `Repetir · quedan ${intentosRestantes}`
            : clase === "abierta"
              ? `Empezar · ${intentosRestantes} intento${intentosRestantes === 1 ? "" : "s"}`
              : "Bloqueada"}
        </button>
      </div>
    </article>
  );
}
