/* =========================================================================
   MotorLeccion.tsx — El flujo de una leccion, paso a paso.

   El lienzo es el mismo de la practica libre; lo que cambia es quien manda.
   Hasta el paso de reparar, el circuito se mira y se mide pero no se toca.
   ========================================================================= */

import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CURSO, EVALUACION, bandaDe } from "@/config";
import { useCircuito } from "@/estado/circuitoStore";
import {
  useLeccion,
  puedeEditar,
  puedeMedir,
  type PasoLeccion,
} from "@/estado/leccionStore";
import { useSesion } from "@/estado/sesionStore";
import { leccionPorId } from "./registro";
import { explicarDesglose } from "./calificacion";
import { BitacoraIA } from "./BitacoraIA";
import { CurvaIV } from "./CurvaIV";
import { Lienzo } from "@/vistas/Lienzo";
import "./leccion.css";

const TITULOS: Record<PasoLeccion, string> = {
  observar: "Observa",
  medir: "Mide",
  diagnosticar: "Diagnostica",
  reparar: "Repara",
  bitacora: "Bitácora",
  resultado: "Resultado",
};

const PASOS_VISIBLES: PasoLeccion[] = [
  "observar",
  "medir",
  "diagnosticar",
  "reparar",
];

export function MotorLeccion() {
  const { id } = useParams();
  const navegar = useNavigate();
  const identidad = useSesion((s) => s.identidad);

  const leccion = useLeccion((s) => s.leccion);
  const paso = useLeccion((s) => s.paso);
  const iniciar = useLeccion((s) => s.iniciar);
  const abandonar = useLeccion((s) => s.abandonar);

  const definicion = id ? leccionPorId(id) : undefined;

  useEffect(() => {
    if (definicion) iniciar(definicion);
    return () => abandonar();
  }, [definicion, iniciar, abandonar]);

  if (!definicion) {
    return (
      <div className="wrap">
        <h1>Esa lección no existe</h1>
        <Link to="/panel">Volver al panel</Link>
      </div>
    );
  }
  if (!identidad || !leccion) return null;

  return (
    <div className="wrap ancho">
      <header className="leccion-cabecera">
        <div>
          <div className="eyebrow">
            <span className="dot" /> {CURSO.codigo} · Lección {definicion.numero}
          </div>
          <h1 style={{ fontSize: "clamp(22px,3.4vw,32px)" }}>{definicion.titulo}</h1>
        </div>
        <button className="btn ghost" onClick={() => navegar("/panel")}>
          Salir de la lección
        </button>
      </header>

      <Progreso paso={paso} />

      {paso === "resultado" ? <Resultado /> : <Trabajo />}
    </div>
  );
}

/* --------------------------------------------------------------- progreso */

function Progreso({ paso }: { paso: PasoLeccion }) {
  const actual = PASOS_VISIBLES.indexOf(paso);

  return (
    <ol className="pasos" aria-label="Progreso de la lección">
      {PASOS_VISIBLES.map((p, i) => (
        <li
          key={p}
          className={
            "paso" +
            (i === actual ? " actual" : "") +
            (actual > i || paso === "bitacora" || paso === "resultado"
              ? " hecho"
              : "")
          }
        >
          <span className="paso-n">{i + 1}</span>
          {TITULOS[p]}
        </li>
      ))}
    </ol>
  );
}

/* ----------------------------------------------------------------- trabajo */

function Trabajo() {
  const paso = useLeccion((s) => s.paso);
  const leccion = useLeccion((s) => s.leccion);

  // La guía viaja dentro del panel lateral del lienzo. Así todo lo que no es
  // dibujo comparte una sola columna y el lienzo se queda con el resto.
  const guia = (
    <>
      {paso === "observar" && <PasoObservar />}
      {paso === "medir" && <PasoMedir />}
      {paso === "diagnosticar" && <PasoDiagnosticar />}
      {paso === "reparar" && <PasoReparar />}
      {paso === "bitacora" && <BitacoraIA />}

      {/* La lección 4 necesita ver la curva mientras barre el cursor. */}
      {leccion?.panel === "curva-iv" && paso !== "bitacora" && <CurvaIV />}
    </>
  );

  return (
    <Lienzo
      guia={guia}
      soloLectura={!puedeEditar(paso)}
      conMultimetro={puedeMedir(paso)}
      contextoExportacion={
        leccion ? `Lección ${leccion.numero} · ${leccion.titulo}` : undefined
      }
    />
  );
}

function PasoObservar() {
  const leccion = useLeccion((s) => s.leccion)!;
  const avanzar = useLeccion((s) => s.avanzar);

  return (
    <div className="guia">
      <h2>Observa</h2>
      <p>{leccion.intro}</p>
      <p className="sintoma">
        <strong>Síntoma:</strong> {leccion.sintoma}
      </p>
      <p className="hint">
        Todavía no puedes tocar el circuito. Míralo en las dos vistas: la física
        te enseña lo que verías en la mesa.
      </p>
      <button className="btn wide" onClick={avanzar}>
        Ya lo observé
      </button>
    </div>
  );
}

function PasoMedir() {
  const leccion = useLeccion((s) => s.leccion)!;
  const avanzar = useLeccion((s) => s.avanzar);
  const mediciones = useCircuito((s) => s.contadores.mediciones);

  return (
    <div className="guia">
      <h2>Mide</h2>
      <p>{leccion.pistaMedicion}</p>
      <p className="hint">
        Saca el multímetro del panel de la izquierda. Llevas{" "}
        <strong>{mediciones}</strong> medición(es).
      </p>
      {mediciones === 0 && (
        <p className="aviso-suave">
          Puedes pasar sin medir, pero entonces vas a diagnosticar adivinando.
        </p>
      )}
      <button className="btn wide" onClick={avanzar}>
        Ya medí, quiero diagnosticar
      </button>
    </div>
  );
}

function PasoDiagnosticar() {
  const leccion = useLeccion((s) => s.leccion)!;
  const declarar = useLeccion((s) => s.declararDiagnostico);
  const avanzar = useLeccion((s) => s.avanzar);
  const evaluacion = useLeccion((s) => s.evaluacion);
  const explicacion = useLeccion((s) => s.ultimaExplicacion);

  const yaAcerto = evaluacion.diagnosticos.some((d) => d.correcto);
  const fallidas = new Set(
    evaluacion.diagnosticos.filter((d) => !d.correcto).map((d) => d.opcion),
  );

  return (
    <div className="guia">
      <h2>Declara el diagnóstico</h2>
      <p>
        ¿Qué está pasando en este circuito? Elige una. Cuanto antes aciertes,
        más puntúa.
      </p>

      <ul className="opciones">
        {leccion.opciones.map((o, i) => (
          <li key={o.id}>
            <button
              className={
                "opcion" +
                (fallidas.has(i) ? " descartada" : "") +
                (yaAcerto && o.correcta ? " acertada" : "")
              }
              disabled={yaAcerto || fallidas.has(i)}
              onClick={() => declarar(o.id)}
            >
              {o.texto}
            </button>
          </li>
        ))}
      </ul>

      {explicacion && (
        <p className={"explicacion" + (yaAcerto ? " bien" : " mal")}>
          {explicacion}
        </p>
      )}

      {yaAcerto && (
        <button className="btn wide" onClick={avanzar}>
          Ahora sí, a reparar
        </button>
      )}
    </div>
  );
}

function PasoReparar() {
  const leccion = useLeccion((s) => s.leccion)!;
  const verificar = useLeccion((s) => s.verificarReparacion);
  const avanzar = useLeccion((s) => s.avanzar);
  const veredicto = useLeccion((s) => s.ultimaVerificacion);
  const verificada = useLeccion((s) => s.evaluacion.reparacionVerificada);

  return (
    <div className="guia">
      <h2>Repara</h2>
      <p>{leccion.objetivo}</p>
      <p className="hint">
        Ya puedes editar el circuito. Cambia lo que haga falta y verifica.
      </p>

      <button className="btn wide" onClick={verificar} disabled={verificada}>
        Verificar la reparación
      </button>

      {veredicto && (
        <p className={"explicacion" + (veredicto.ok ? " bien" : " mal")}>
          {veredicto.mensaje}
        </p>
      )}

      {verificada && (
        <button className="btn wide" onClick={avanzar} style={{ marginTop: 10 }}>
          Continuar
        </button>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- resultado */

function Resultado() {
  const nota = useLeccion((s) => s.nota);
  const evaluacion = useLeccion((s) => s.evaluacion);
  const guardando = useLeccion((s) => s.guardando);
  const error = useLeccion((s) => s.errorGuardado);
  const navegar = useNavigate();

  if (!nota) return null;
  const aprobado = nota.total >= EVALUACION.umbralAprobacion;

  return (
    <div className="card resultado">
      <div className="resultado-nota">
        <span className="numero">{nota.total}</span>
        <span className="sobre">sobre {EVALUACION.escalaMax}</span>
        <span className={"banda " + (aprobado ? "ok" : "no")}>
          {bandaDe(nota.total)}
        </span>
      </div>

      <table className="desglose">
        <tbody>
          {explicarDesglose(evaluacion, nota).map((f) => (
            <tr key={f.criterio}>
              <th>{f.criterio}</th>
              <td className="puntos">
                {f.puntos} / {f.sobre}
              </td>
              <td className="motivo">{f.motivo}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {guardando && <p className="hint">Guardando tu resultado…</p>}
      {error && <p className="err">{error}</p>}

      <button
        className="btn wide"
        style={{ marginTop: 16 }}
        onClick={() => navegar("/panel")}
        disabled={guardando}
      >
        Volver al panel
      </button>
    </div>
  );
}
