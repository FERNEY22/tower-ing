/* =========================================================================
   LienzoSVG.tsx — El lienzo interactivo, compartido por las dos vistas.

   Aqui esta TODO lo que no depende de como se dibuje un componente: la
   rejilla, los cables, los terminales, las etiquetas de medida y el manejo
   del raton. Lo unico que cambia entre la vista esquematica y la fisica es
   el simbolo que se pinta dentro de cada componente.

   Que las dos vistas compartan este archivo no es una comodidad: es lo que
   garantiza que un terminal este en el mismo punto en las dos y que alternar
   no descoloque nada. Si cada vista tuviera su propia interaccion, tarde o
   temprano se separarian.
   ========================================================================= */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as EventoPuntero,
  type ReactNode,
} from "react";
import { LIENZO } from "@/config";
import type { Componente, Punto } from "@/motor/circuito";
import { claveDeRef } from "@/motor/circuito";
import { useCircuito } from "@/estado/circuitoStore";
import {
  anclajesDe,
  cajaDelCircuito,
  componenteEn,
  puntoDeClave,
  terminalCercano,
} from "./geometria";
import {
  puntosDeUnion,
  rutaComoPath,
  rutaDeCable,
  rutaOrtogonal,
} from "@/vistas/esquematica/enrutado";
import { brilloDeLed } from "@/motor";
import type { ResultadoComponente } from "@/motor/solverLineal";
import { formatearAmperios, formatearVoltios } from "@/motor/valores";

type Arrastre =
  | { modo: "ninguno" }
  | { modo: "componente"; id: string; desfase: Punto };

/** Lo que necesita saber un dibujante de componentes. */
export interface ContextoDibujo {
  componente: Componente;
  /** Resultado de la simulacion, si el circuito esta resuelto. */
  resultado: ResultadoComponente | undefined;
  /** 0..1. Solo tiene sentido en un LED. */
  brillo: number;
  /**
   * Rotacion del componente. La necesitan los simbolos que llevan texto: los
   * signos + y − de una fuente girada quedarian de lado si no se
   * contrarrotan.
   */
  rotacion: number;
}

export interface PropsLienzoSVG {
  variante: "esquematica" | "fisica";
  dibujar(contexto: ContextoDibujo): ReactNode;
  /** Los puntos de union son convencion de esquematico, no de montaje real. */
  mostrarUniones?: boolean;
  /**
   * En los primeros pasos de una leccion el circuito se mira y se mide, pero
   * no se toca. Medir sigue permitido: es justo lo que se pide hacer.
   */
  soloLectura?: boolean;
}

export function LienzoSVG({
  variante,
  dibujar,
  mostrarUniones = true,
  soloLectura = false,
}: PropsLienzoSVG) {
  const svgRef = useRef<SVGSVGElement>(null);
  const marcoRef = useRef<HTMLDivElement>(null);
  const [arrastre, setArrastre] = useState<Arrastre>({ modo: "ninguno" });
  const [puntero, setPuntero] = useState<Punto | null>(null);
  const [anchoMarco, setAnchoMarco] = useState(0);
  const [altoVentana, setAltoVentana] = useState(() =>
    typeof window === "undefined" ? 900 : window.innerHeight,
  );

  const circuito = useCircuito((s) => s.circuito);
  const solucion = useCircuito((s) => s.solucion);
  const seleccion = useCircuito((s) => s.seleccion);
  const cableDesde = useCircuito((s) => s.cableDesde);
  const instrumento = useCircuito((s) => s.instrumento);
  const mover = useCircuito((s) => s.mover);
  const seleccionar = useCircuito((s) => s.seleccionar);
  const empezarCable = useCircuito((s) => s.empezarCable);
  const conectar = useCircuito((s) => s.conectar);
  const desconectar = useCircuito((s) => s.desconectar);
  const ponerSonda = useCircuito((s) => s.ponerSonda);
  const medirEnCable = useCircuito((s) => s.medirEnCable);

  /* ------------------------------------------------- ajuste al monitor

     Se mide el hueco disponible y se elige la escala: el maximo de config,
     salvo que no quepa. Solo se observa el ANCHO; la altura se toma de la
     ventana. Observar tambien la altura realimentaria el bucle, porque el
     alto del marco lo fija el propio dibujo.                              */

  useEffect(() => {
    const elemento = marcoRef.current;
    if (!elemento || typeof ResizeObserver === "undefined") return;

    const observador = new ResizeObserver((entradas) => {
      const ancho = Math.round(entradas[0]?.contentRect.width ?? 0);
      setAnchoMarco((previo) => (previo === ancho ? previo : ancho));
    });
    observador.observe(elemento);

    const alRedimensionar = () => setAltoVentana(window.innerHeight);
    window.addEventListener("resize", alRedimensionar);

    return () => {
      observador.disconnect();
      window.removeEventListener("resize", alRedimensionar);
    };
  }, []);

  /** Encuadre: la caja del circuito, nunca menor que el mínimo de config. */
  const encuadre = useMemo(() => {
    const caja = cajaDelCircuito(circuito, LIENZO.margenEncuadre);
    const ancho = Math.max(caja.ancho, LIENZO.encuadreMinimo.ancho);
    const alto = Math.max(caja.alto, LIENZO.encuadreMinimo.alto);
    // El aire que sobra se reparte a los dos lados: el circuito queda centrado.
    return {
      x: caja.x - (ancho - caja.ancho) / 2,
      y: caja.y - (alto - caja.alto) / 2,
      ancho,
      alto,
    };
  }, [circuito]);

  const pxPorUnidad = useMemo(() => {
    if (anchoMarco <= 0) return LIENZO.pxPorUnidadMax;
    const altoDisponible = Math.max(
      LIENZO.altoMinimoPx,
      altoVentana * LIENZO.fraccionAltoVentana,
    );
    return Math.max(
      LIENZO.pxPorUnidadMin,
      Math.min(
        LIENZO.pxPorUnidadMax,
        anchoMarco / encuadre.ancho,
        altoDisponible / encuadre.alto,
      ),
    );
  }, [anchoMarco, altoVentana, encuadre]);

  /** Coordenadas del raton en el sistema del SVG, no en el de la pantalla. */
  function aCoordenadas(e: EventoPuntero): Punto {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };

    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const local = p.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  function alBajar(e: EventoPuntero) {
    const punto = aCoordenadas(e);

    // 1. Terminal. Con el multimetro en la mano se apoya una punta; si no,
    //    se empieza o se cierra un cable.
    const anclaje = terminalCercano(circuito, punto);
    if (anclaje) {
      if (instrumento.activo) {
        ponerSonda(anclaje.clave);
      } else if (soloLectura) {
        // Nada: en modo lectura un terminal no empieza un cable.
      } else if (cableDesde && cableDesde !== anclaje.clave) {
        conectar(cableDesde, anclaje.clave);
      } else {
        empezarCable(anclaje.clave);
      }
      return;
    }

    // 2. Cuerpo de un componente: se selecciona y se arrastra.
    const comp = componenteEn(circuito, punto);
    if (comp) {
      seleccionar(comp.id);
      empezarCable(null);
      if (!soloLectura) {
        setArrastre({
          modo: "componente",
          id: comp.id,
          desfase: { x: punto.x - comp.posicion.x, y: punto.y - comp.posicion.y },
        });
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      }
      return;
    }

    // 3. Vacio: se cancela lo que hubiera en curso.
    seleccionar(null);
    empezarCable(null);
  }

  function alMover(e: EventoPuntero) {
    const punto = aCoordenadas(e);
    setPuntero(punto);
    if (arrastre.modo === "componente") {
      mover(arrastre.id, {
        x: punto.x - arrastre.desfase.x,
        y: punto.y - arrastre.desfase.y,
      });
    }
  }

  const uniones = mostrarUniones ? puntosDeUnion(circuito) : [];
  const anclajeVivo = puntero ? terminalCercano(circuito, puntero) : null;

  return (
    <div className="lienzo-marco" ref={marcoRef}>
    <svg
      ref={svgRef}
      className={`lienzo-svg vista-${variante}`}
      width={Math.round(encuadre.ancho * pxPorUnidad)}
      height={Math.round(encuadre.alto * pxPorUnidad)}
      viewBox={`${encuadre.x} ${encuadre.y} ${encuadre.ancho} ${encuadre.alto}`}
      onPointerDown={alBajar}
      onPointerMove={alMover}
      onPointerUp={() => setArrastre({ modo: "ninguno" })}
      onPointerLeave={() => {
        setArrastre({ modo: "ninguno" });
        setPuntero(null);
      }}
    >
      <defs>
        <pattern id="rejilla" width={10} height={10} patternUnits="userSpaceOnUse">
          <circle cx={0} cy={0} r={0.6} className="punto-rejilla" />
        </pattern>
      </defs>
      <rect
        x={encuadre.x}
        y={encuadre.y}
        width={encuadre.ancho}
        height={encuadre.alto}
        fill="url(#rejilla)"
      />

      {/* ----------------------------------------------------------- cables */}
      <g className="cables">
        {circuito.cables.map((cable) => {
          const ruta = rutaDeCable(circuito, cable.id);
          if (!ruta) return null;
          return (
            <path
              key={cable.id}
              d={rutaComoPath(ruta)}
              className={
                "cable" +
                (instrumento.activo && instrumento.modo === "corriente"
                  ? " medible"
                  : "")
              }
              onPointerDown={(e) => {
                // Con el amperimetro seleccionado, pinchar un cable es
                // abrirlo e intercalar el instrumento: el uso correcto.
                if (instrumento.activo && instrumento.modo === "corriente") {
                  e.stopPropagation();
                  medirEnCable(cable.id);
                }
              }}
              onDoubleClick={() => {
                if (!instrumento.activo && !soloLectura) desconectar(cable.id);
              }}
            >
              <title>
                {claveDeRef(cable.desde)} → {claveDeRef(cable.hasta)}
                {instrumento.activo && instrumento.modo === "corriente"
                  ? " · clic para medir la corriente aquí"
                  : " · doble clic para quitarlo"}
              </title>
            </path>
          );
        })}

        {cableDesde && puntero && (
          <path
            d={rutaComoPath(
              rutaOrtogonal(puntoDeClave(circuito, cableDesde) ?? puntero, puntero),
            )}
            className="cable en-curso"
          />
        )}
      </g>

      {mostrarUniones && (
        <g className="uniones">
          {uniones.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3.5} className="union" />
          ))}
        </g>
      )}

      {/* ------------------------------------------------------ componentes */}
      {circuito.componentes.map((comp) => {
        const resultado = solucion?.componentes.get(comp.id);
        const brillo =
          comp.tipo === "led" && resultado && solucion?.ok
            ? brilloDeLed(resultado.corrienteA)
            : 0;

        return (
          <g
            key={comp.id}
            className={
              "componente" +
              (seleccion === comp.id ? " seleccionado" : "") +
              (comp.estado.quemado ? " quemado" : "")
            }
            transform={`translate(${comp.posicion.x} ${comp.posicion.y}) rotate(${comp.rotacion})`}
          >
            <g className="simbolo">
              {dibujar({
                componente: comp,
                resultado,
                brillo,
                rotacion: comp.rotacion,
              })}
            </g>

            {anclajesDe(comp).map((a) => (
              <circle
                key={a.terminal}
                cx={a.punto.x - comp.posicion.x}
                cy={a.punto.y - comp.posicion.y}
                r={3}
                className={
                  "terminal" +
                  (cableDesde === a.clave ? " origen" : "") +
                  (anclajeVivo?.clave === a.clave ? " apuntado" : "")
                }
              >
                <title>
                  {a.componenteId} · {a.terminal}
                </title>
              </circle>
            ))}
          </g>
        );
      })}

      {/* ------------------------------------------------------------- humo

          Un componente quemado se marca en el lienzo. Sin esto, el
          estudiante ve que el circuito "dejo de funcionar" sin entender
          por que.                                                          */}
      <g className="humos">
        {circuito.componentes
          .filter((c) => c.estado.quemado)
          .map((c) => (
            <g key={c.id} className="humo" transform={`translate(${c.posicion.x} ${c.posicion.y})`}>
              <path
                className="voluta"
                d="M 0 -14 c -7 -6 6 -12 -1 -19 c -6 -6 5 -11 -1 -17"
              />
              <path
                className="voluta lenta"
                d="M 9 -14 c -6 -5 5 -10 -1 -16 c -5 -5 4 -9 -1 -14"
              />
              <title>{c.estado.motivoQuemado ?? "Componente quemado"}</title>
            </g>
          ))}
      </g>

      {/* ------------------------------------------------------------ sondas */}
      {instrumento.activo && (
        <g className="sondas">
          {[instrumento.sondaA, instrumento.sondaB].map((clave, i) => {
            if (!clave) return null;
            const p = puntoDeClave(circuito, clave);
            if (!p) return null;
            return (
              <g key={i} className={"sonda" + (i === 1 ? " segunda" : "")}>
                <circle cx={p.x} cy={p.y} r={7} />
                <line x1={p.x} y1={p.y} x2={p.x + 16} y2={p.y - 22} />
              </g>
            );
          })}
        </g>
      )}

      {/* --------------------------------------------------------- etiquetas */}
      <g className="etiquetas">
        {circuito.componentes.map((comp) => {
          if (comp.tipo === "tierra") return null;
          const resultado = solucion?.componentes.get(comp.id);

          return (
            <text
              key={comp.id}
              x={comp.posicion.x}
              y={comp.posicion.y + 34}
              className="etiqueta"
            >
              <tspan className="ref">{comp.id}</tspan>
              {solucion?.ok && resultado && (
                <tspan className="medida" dx={6}>
                  {formatearVoltios(resultado.tensionV, 3)} ·{" "}
                  {formatearAmperios(resultado.corrienteA, 3)}
                </tspan>
              )}
            </text>
          );
        })}
      </g>
    </svg>
    </div>
  );
}
