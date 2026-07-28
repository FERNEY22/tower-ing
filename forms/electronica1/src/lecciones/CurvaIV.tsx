/* =========================================================================
   CurvaIV.tsx — Curva I-V del diodo con la recta de carga y el punto Q.

   Las dos cosas que hay que ver a la vez:
     · la curva del diodo, que es del componente y no cambia;
     · la recta de carga, que es del resto del circuito y gira al mover el
       potenciometro.

   El punto Q es su interseccion, y es exactamente la solucion que ya calculo
   el motor: aqui no se resuelve nada otra vez, solo se dibuja.
   ========================================================================= */

import { useMemo } from "react";
import { useCircuito } from "@/estado/circuitoStore";
import { evaluarDiodo } from "@/motor/modelos/diodo";
import { formatearAmperios, formatearVoltios } from "@/motor/valores";
import "./curvaIV.css";

const ANCHO = 300;
const ALTO = 220;
const MARGEN = { izq: 46, der: 12, arr: 12, aba: 34 };

interface Datos {
  /** Tension de la fuente: donde la recta de carga corta el eje horizontal. */
  tensionFuenteV: number;
  /** Resistencia total de la malla, que da la pendiente de la recta. */
  resistenciaTotalOhm: number;
  puntoQ: { v: number; i: number } | null;
}

/**
 * Saca los datos del circuito resuelto. La resistencia total no se busca
 * componente a componente: se deduce del propio punto de operacion, que es
 * mas robusto ante como haya cableado el estudiante.
 */
function leerDatos(): Datos {
  const { circuito, solucion } = useCircuito.getState();

  const fuente = circuito.componentes.find((c) => c.tipo === "fuenteDC");
  const tensionFuenteV = fuente
    ? (fuente.params as { tensionV: number }).tensionV
    : 0;

  const diodo = solucion?.componentes.get("D1");
  if (!solucion?.ok || !diodo || diodo.corrienteA <= 0) {
    return { tensionFuenteV, resistenciaTotalOhm: 0, puntoQ: null };
  }

  return {
    tensionFuenteV,
    resistenciaTotalOhm: (tensionFuenteV - diodo.tensionV) / diodo.corrienteA,
    puntoQ: { v: diodo.tensionV, i: diodo.corrienteA },
  };
}

export function CurvaIV() {
  // Se suscribe al circuito y a la solucion para redibujar en cada cambio:
  // es lo que hace que el punto Q se mueva en vivo con el cursor.
  const solucion = useCircuito((s) => s.solucion);
  const circuito = useCircuito((s) => s.circuito);

  const datos = useMemo(() => leerDatos(), [solucion, circuito]);
  const { tensionFuenteV, resistenciaTotalOhm, puntoQ } = datos;

  // Escalas. El eje de corriente se ajusta a la recta de carga, que es
  // siempre el valor mas alto que puede alcanzarse.
  const vMax = 1.0;
  const iMax = useMemo(() => {
    const porRecta =
      resistenciaTotalOhm > 0 ? tensionFuenteV / resistenciaTotalOhm : 0.01;
    return Math.max(porRecta * 1.15, puntoQ ? puntoQ.i * 1.4 : 0, 0.001);
  }, [tensionFuenteV, resistenciaTotalOhm, puntoQ]);

  const x = (v: number) =>
    MARGEN.izq + (v / vMax) * (ANCHO - MARGEN.izq - MARGEN.der);
  const y = (i: number) =>
    ALTO - MARGEN.aba - (i / iMax) * (ALTO - MARGEN.arr - MARGEN.aba);

  /** Curva del diodo, muestreada hasta salirse por arriba. */
  const curva = useMemo(() => {
    const puntos: string[] = [];
    for (let v = 0; v <= vMax; v += 0.005) {
      const i = evaluarDiodo(v).i;
      if (i > iMax * 1.2) break;
      puntos.push(`${x(v).toFixed(1)},${y(i).toFixed(1)}`);
    }
    return puntos.join(" ");
  }, [iMax]);

  /** Recta de carga: de (Vfuente, 0) a (0, Vfuente/Rtotal). */
  const recta =
    resistenciaTotalOhm > 0
      ? {
          x1: x(Math.min(tensionFuenteV, vMax)),
          y1: y(
            tensionFuenteV > vMax
              ? (tensionFuenteV - vMax) / resistenciaTotalOhm
              : 0,
          ),
          x2: x(0),
          y2: y(tensionFuenteV / resistenciaTotalOhm),
        }
      : null;

  return (
    <div className="curva-iv">
      <h3>Curva I-V y recta de carga</h3>

      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="curva-svg">
        {/* ejes */}
        <line
          x1={MARGEN.izq}
          y1={ALTO - MARGEN.aba}
          x2={ANCHO - MARGEN.der}
          y2={ALTO - MARGEN.aba}
          className="eje"
        />
        <line
          x1={MARGEN.izq}
          y1={MARGEN.arr}
          x2={MARGEN.izq}
          y2={ALTO - MARGEN.aba}
          className="eje"
        />

        <text x={ANCHO - MARGEN.der} y={ALTO - 10} className="eje-rotulo fin">
          V (V)
        </text>
        <text x={6} y={MARGEN.arr + 8} className="eje-rotulo">
          I (mA)
        </text>

        {/* marcas del eje de corriente */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={MARGEN.izq - 4}
              y1={y(iMax * f)}
              x2={ANCHO - MARGEN.der}
              y2={y(iMax * f)}
              className="rejilla-eje"
            />
            <text x={MARGEN.izq - 7} y={y(iMax * f) + 3} className="marca-eje">
              {(iMax * f * 1000).toFixed(1)}
            </text>
          </g>
        ))}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <text
            key={f}
            x={x(vMax * f)}
            y={ALTO - MARGEN.aba + 14}
            className="marca-eje centrada"
          >
            {(vMax * f).toFixed(2).replace(".", ",")}
          </text>
        ))}

        <polyline points={curva} className="curva-diodo" />

        {recta && (
          <line
            x1={recta.x1}
            y1={recta.y1}
            x2={recta.x2}
            y2={recta.y2}
            className="recta-carga"
          />
        )}

        {puntoQ && (
          <g className="punto-q">
            <line
              x1={MARGEN.izq}
              y1={y(puntoQ.i)}
              x2={x(puntoQ.v)}
              y2={y(puntoQ.i)}
              className="guia-q"
            />
            <line
              x1={x(puntoQ.v)}
              y1={ALTO - MARGEN.aba}
              x2={x(puntoQ.v)}
              y2={y(puntoQ.i)}
              className="guia-q"
            />
            <circle cx={x(puntoQ.v)} cy={y(puntoQ.i)} r={5} />
            <text x={x(puntoQ.v) + 9} y={y(puntoQ.i) - 7} className="etiqueta-q">
              Q
            </text>
          </g>
        )}
      </svg>

      <dl className="curva-datos">
        <div>
          <dt>Punto Q</dt>
          <dd>
            {puntoQ
              ? `${formatearVoltios(puntoQ.v, 3)} · ${formatearAmperios(puntoQ.i, 3)}`
              : "sin solución"}
          </dd>
        </div>
        <div>
          <dt>R total</dt>
          <dd>
            {resistenciaTotalOhm > 0
              ? `${Math.round(resistenciaTotalOhm).toLocaleString("es-CO")} Ω`
              : "—"}
          </dd>
        </div>
      </dl>

      <p className="hint">
        Mueve el cursor del potenciómetro y mira cómo gira la recta de carga y
        se desplaza Q sobre la curva.
      </p>
    </div>
  );
}
