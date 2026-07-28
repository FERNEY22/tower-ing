/* =========================================================================
   PantallaIngreso.tsx — Ingreso obligatorio antes de cualquier actividad.
   ========================================================================= */

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CURSO } from "@/config";
import { useSesion } from "@/estado/sesionStore";
import {
  construirIdentidad,
  validarCedula,
  validarNombre,
} from "./identidad";

export function PantallaIngreso() {
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [mensaje, setMensaje] = useState("");
  const ingresar = useSesion((s) => s.ingresar);
  const cargando = useSesion((s) => s.cargando);
  const errorSesion = useSesion((s) => s.error);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const vn = validarNombre(nombre);
    if (!vn.ok) return setMensaje(vn.mensaje);
    const vc = validarCedula(cedula);
    if (!vc.ok) return setMensaje(vc.mensaje);

    setMensaje("");
    try {
      const identidad = await construirIdentidad(nombre, cedula);
      await ingresar(identidad);
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "No se pudo ingresar.");
    }
  }

  return (
    <div className="wrap">
      <div className="eyebrow">
        <span className="dot" /> {CURSO.codigo} · {CURSO.nombre}
      </div>
      <h1>Laboratorio de circuitos</h1>
      <p className="lead">
        Cinco lecciones con una avería sembrada en cada una, y un módulo de
        práctica libre. Primero se mide y se declara el diagnóstico; después se
        repara.
      </p>

      <form className="card" style={{ marginTop: 20 }} onSubmit={enviar}>
        <label className="f" htmlFor="nombre">
          Nombre completo
        </label>
        <input
          className="t"
          id="nombre"
          type="text"
          autoComplete="name"
          placeholder="Ej.: María Fernanda Gómez"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <label className="f" htmlFor="cedula">
          Cédula
        </label>
        <input
          className="t"
          id="cedula"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ej.: 1012345678"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
        />
        <p className="hint" style={{ marginTop: 6 }}>
          Tu cédula no se guarda completa: solo se registran los últimos tres
          dígitos y una clave derivada.
        </p>

        <p className="err">{mensaje || errorSesion || ""}</p>

        <button className="btn wide" type="submit" disabled={cargando}>
          {cargando ? "Conectando…" : "Entrar"}
        </button>
      </form>

      <footer className="legal">
        {CURSO.universidad} · {CURSO.programa} · {CURSO.periodo}
        <br />
        <Link to="/docente" className="enlace-docente">
          Acceso docente
        </Link>
      </footer>
    </div>
  );
}
