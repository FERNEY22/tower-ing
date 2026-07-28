/* =========================================================================
   Lienzo.tsx — El editor completo: paleta, lienzo, inspector y avisos.

   El boton de alternar vista ya esta puesto; la vista fisica llega en la
   fase 5 y entrara por aqui sin tocar nada mas, porque las dos leen el mismo
   modelo y la misma geometria.
   ========================================================================= */

import { useEffect, type ReactNode } from "react";
import type { ColorLed, Componente, TipoComponente } from "@/motor/circuito";
import { crearComponente, etiquetaDe } from "@/motor/circuito";
import { formatearOhm, e12MasCercano, formatearVatios } from "@/motor/valores";
import { useCircuito } from "@/estado/circuitoStore";
import { RenderEsquematica } from "./esquematica/RenderEsquematica";
import { RenderFisica } from "./fisica/RenderFisica";
import { MiniaturaSimbolo } from "./esquematica/simbolos";
import { Multimetro } from "@/instrumentos/PanelMultimetro";
import { BotonExportar } from "@/exportacion/BotonExportar";
import "./lienzo.css";

const PALETA: TipoComponente[] = [
  "fuenteDC",
  "resistencia",
  "potenciometro",
  "interruptor",
  "diodo",
  "led",
  "zener",
  "tierra",
];

/**
 * Dónde aterriza un componente nuevo. En cascada y compacto: el encuadre se
 * ajusta al circuito, así que dispersarlos por el lienzo lo obligaría a
 * alejarse y todo se vería más pequeño.
 */
function posicionLibre(n: number) {
  return { x: 150 + (n % 4) * 110, y: 130 + Math.floor(n / 4) * 90 };
}

export interface PropsLienzo {
  /** En una lección, hasta el paso de reparar el circuito no se toca. */
  soloLectura?: boolean;
  /** El multímetro aparece a partir del paso de medir. */
  conMultimetro?: boolean;
  /** Qué se escribe en la marca de agua del PNG. Sin esto no hay exportación. */
  contextoExportacion?: string;
  /**
   * Contenido propio de quien usa el lienzo — en una lección, la guía del
   * paso. Va arriba del panel lateral, con la paleta y el inspector debajo.
   *
   * Todo lo que no es dibujo comparte una sola columna: el lienzo se queda
   * con el resto del ancho, que es lo que hace falta para que los símbolos
   * se vean.
   */
  guia?: ReactNode;
}

export function Lienzo({
  soloLectura = false,
  conMultimetro = true,
  contextoExportacion,
  guia,
}: PropsLienzo = {}) {
  const circuito = useCircuito((s) => s.circuito);
  const solucion = useCircuito((s) => s.solucion);
  const seleccion = useCircuito((s) => s.seleccion);
  const cableDesde = useCircuito((s) => s.cableDesde);
  const aviso = useCircuito((s) => s.aviso);
  const vista = useCircuito((s) => s.vista);

  const colocar = useCircuito((s) => s.colocar);
  const rotar = useCircuito((s) => s.rotar);
  const eliminar = useCircuito((s) => s.eliminar);
  const limpiar = useCircuito((s) => s.limpiar);
  const empezarCable = useCircuito((s) => s.empezarCable);
  const cambiarVista = useCircuito((s) => s.cambiarVista);
  const limpiarAviso = useCircuito((s) => s.limpiarAviso);

  const componente = circuito.componentes.find((c) => c.id === seleccion) ?? null;

  // Teclas de trabajo: rotar, borrar y cancelar el cable en curso.
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      const escribiendo =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement;
      if (escribiendo) return;

      if (e.key === "Escape") empezarCable(null);
      if (!seleccion) return;
      if (e.key === "r" || e.key === "R") rotar(seleccion);
      if (e.key === "Delete" || e.key === "Backspace") eliminar(seleccion);
    }
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [seleccion, rotar, eliminar, empezarCable]);

  // El aviso de cableado se retira solo: no merece un boton de cerrar.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(limpiarAviso, 3500);
    return () => clearTimeout(t);
  }, [aviso, limpiarAviso]);

  return (
    <div className="editor">
      <main className="lienzo">
        <div className="lienzo-barra">
          <span className="hint">
            {soloLectura
              ? "Circuito en observación: puedes mirarlo y medirlo, no modificarlo."
              : cableDesde
                ? `Cableando desde ${cableDesde} · Esc para cancelar`
                : "Clic en un terminal para empezar un cable · R rota · Supr borra"}
          </span>
          {aviso && <span className="lienzo-aviso">{aviso}</span>}
        </div>

        {vista === "esquematica" ? (
          <RenderEsquematica soloLectura={soloLectura} />
        ) : (
          <RenderFisica soloLectura={soloLectura} />
        )}

        <Quemados />
        <Diagnosticos />
      </main>

      <aside className="panel-lateral">
        {guia}

        <div className="tarjeta-panel acciones-lienzo">
          <button className="btn ghost" onClick={() => cambiarVista()}>
            Vista: {vista === "esquematica" ? "esquemática" : "física"}
          </button>
          {contextoExportacion && <BotonExportar contexto={contextoExportacion} />}
          {!soloLectura && (
            <button className="btn ghost" onClick={limpiar}>
              Vaciar el lienzo
            </button>
          )}
        </div>

        {!soloLectura && (
          <div className="tarjeta-panel">
            <h2 className="titulo-panel">Componentes</h2>
            <div className="paleta-lista">
              {PALETA.map((tipo) => (
                <button
                  key={tipo}
                  className="paleta-item"
                  onClick={() =>
                    colocar(tipo, posicionLibre(circuito.componentes.length))
                  }
                >
                  <MiniaturaSimbolo componente={crearComponente(tipo, "muestra")} />
                  <span>{etiquetaDe(tipo)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="tarjeta-panel inspector">
          {componente ? (
            <Inspector componente={componente} />
          ) : (
            <p className="hint">
              Selecciona un componente para ver y cambiar sus valores.
            </p>
          )}

          {solucion?.ok && (
            <div className="resumen">
              <h3>Solución</h3>
              <p className="hint">
                {solucion.iteraciones === 1
                  ? "Resuelto de una vez (circuito lineal)."
                  : `Convergió en ${solucion.iteraciones} iteraciones.`}
              </p>
            </div>
          )}
        </div>

        {conMultimetro && (
          <div className="tarjeta-panel">
            <Multimetro />
          </div>
        )}
      </aside>
    </div>
  );
}

/* --------------------------------------------------------------- quemados */

function Quemados() {
  const circuito = useCircuito((s) => s.circuito);
  const reemplazar = useCircuito((s) => s.reemplazar);
  const quemados = circuito.componentes.filter((c) => c.estado.quemado);

  if (!quemados.length) return null;

  return (
    <ul className="quemados">
      {quemados.map((c) => (
        <li key={c.id} className="quemado-aviso">
          <div>
            <strong>Se quemó {c.id}</strong>
            <span>{c.estado.motivoQuemado}</span>
          </div>
          <button className="btn ghost" onClick={() => reemplazar(c.id)}>
            Reemplazar
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------------------------------------- diagnosticos */

function Diagnosticos() {
  const solucion = useCircuito((s) => s.solucion);
  if (!solucion?.diagnosticos.length) return null;

  return (
    <ul className="diagnosticos">
      {solucion.diagnosticos.map((d, i) => (
        <li key={i} className={`diag ${d.severidad}`}>
          <strong>{d.titulo}</strong>
          <span>{d.mensaje}</span>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------- inspector */

function Inspector({ componente }: { componente: Componente }) {
  const actualizar = useCircuito((s) => s.actualizarParams);
  const rotar = useCircuito((s) => s.rotar);
  const eliminar = useCircuito((s) => s.eliminar);
  const solucion = useCircuito((s) => s.solucion);
  const resultado = solucion?.componentes.get(componente.id);

  return (
    <div className="inspector-caja">
      <h3>
        {componente.id} · {etiquetaDe(componente.tipo)}
      </h3>

      <Campos componente={componente} alCambiar={actualizar} />

      {solucion?.ok && resultado && componente.tipo !== "tierra" && (
        <dl className="medidas">
          <div>
            <dt>Tensión</dt>
            <dd>{resultado.tensionV.toFixed(4).replace(".", ",")} V</dd>
          </div>
          <div>
            <dt>Corriente</dt>
            <dd>{(resultado.corrienteA * 1000).toFixed(4).replace(".", ",")} mA</dd>
          </div>
          <div>
            <dt>Potencia</dt>
            <dd>{formatearVatios(resultado.potenciaW)}</dd>
          </div>
        </dl>
      )}

      <div className="inspector-acciones">
        <button className="btn ghost" onClick={() => rotar(componente.id)}>
          Rotar
        </button>
        <button className="btn ghost" onClick={() => eliminar(componente.id)}>
          Eliminar
        </button>
      </div>
    </div>
  );
}

function Campos({
  componente,
  alCambiar,
}: {
  componente: Componente;
  alCambiar: (id: string, params: Record<string, unknown>) => void;
}) {
  const p = componente.params as Record<string, unknown>;

  switch (componente.tipo) {
    case "resistencia":
      return (
        <>
          <label className="f" htmlFor="valor">
            Valor · {formatearOhm(p.valorOhm as number)}
          </label>
          <input
            className="t"
            id="valor"
            type="number"
            min={1}
            value={p.valorOhm as number}
            onChange={(e) =>
              alCambiar(componente.id, { valorOhm: Number(e.target.value) })
            }
            onBlur={(e) =>
              alCambiar(componente.id, {
                // Al salir del campo se ajusta a un valor que existe en una
                // gaveta: la leccion 1 trata justamente de eso.
                valorOhm: e12MasCercano(Number(e.target.value)),
              })
            }
          />
          <label className="f" htmlFor="potencia">
            Potencia nominal (W)
          </label>
          <input
            className="t"
            id="potencia"
            type="number"
            step={0.25}
            min={0.05}
            value={p.potenciaW as number}
            onChange={(e) =>
              alCambiar(componente.id, { potenciaW: Number(e.target.value) })
            }
          />
        </>
      );

    case "potenciometro":
      return (
        <>
          <label className="f" htmlFor="total">
            Resistencia total · {formatearOhm(p.totalOhm as number)}
          </label>
          <input
            className="t"
            id="total"
            type="number"
            min={1}
            value={p.totalOhm as number}
            onChange={(e) =>
              alCambiar(componente.id, { totalOhm: Number(e.target.value) })
            }
          />
          <label className="f" htmlFor="cursor">
            Cursor · {Math.round((p.cursor as number) * 100)} %
          </label>
          <input
            id="cursor"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={p.cursor as number}
            onChange={(e) =>
              alCambiar(componente.id, { cursor: Number(e.target.value) })
            }
          />
        </>
      );

    case "fuenteDC":
      return (
        <>
          <label className="f" htmlFor="tension">
            Tensión (V)
          </label>
          <input
            className="t"
            id="tension"
            type="number"
            step={0.1}
            value={p.tensionV as number}
            onChange={(e) =>
              alCambiar(componente.id, { tensionV: Number(e.target.value) })
            }
          />
        </>
      );

    case "interruptor":
      return (
        <label className="f interruptor">
          <input
            type="checkbox"
            checked={p.cerrado as boolean}
            onChange={(e) =>
              alCambiar(componente.id, { cerrado: e.target.checked })
            }
          />{" "}
          Cerrado
        </label>
      );

    case "led":
      return (
        <>
          <label className="f" htmlFor="color">
            Color
          </label>
          <select
            className="t"
            id="color"
            value={p.color as ColorLed}
            onChange={(e) =>
              alCambiar(componente.id, { color: e.target.value as ColorLed })
            }
          >
            <option value="rojo">Rojo · 1,9 V</option>
            <option value="verde">Verde · 2,1 V</option>
            <option value="azul">Azul · 3,1 V</option>
            <option value="blanco">Blanco · 3,1 V</option>
          </select>
        </>
      );

    case "zener":
      return (
        <>
          <label className="f" htmlFor="vz">
            Tensión de ruptura (V)
          </label>
          <input
            className="t"
            id="vz"
            type="number"
            step={0.1}
            min={0.5}
            value={p.tensionRupturaV as number}
            onChange={(e) =>
              alCambiar(componente.id, {
                tensionRupturaV: Number(e.target.value),
              })
            }
          />
        </>
      );

    default:
      return <p className="hint">Este componente no tiene ajustes.</p>;
  }
}
