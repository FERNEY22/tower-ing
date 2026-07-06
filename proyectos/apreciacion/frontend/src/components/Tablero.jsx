import { colorNota, nfmt } from "../util";
import {
  BarrasNota, BarrasPct, Dona, Torta, RadarFactores, Gauge, NIVEL_COLOR,
} from "../charts";

function Kpi({ valor, etiqueta }) {
  return <div className="kpi"><b>{valor ?? "–"}</b><span>{etiqueta}</span></div>;
}

export default function Tablero({ data }) {
  if (!data) return <div className="loading">Cargando…</div>;
  const { kpis: k, escala, escala_max, por_factor: por_factor_raw, por_estamento, distribucion,
          estamentos, matriz_factor_estamento } = data;

  // ordenar factores numéricamente por el nº del código (F1, F2, … F10, F11) y no como texto
  const numFactor = (f) => { const m = String(f.cod).match(/\d+/); return m ? +m[0] : 999; };
  const por_factor = [...por_factor_raw].sort((a, b) => numFactor(a) - numFactor(b));

  const fFactor = por_factor.map((f) => ({ cod: f.cod, nombre: f.nombre || f.cod, valor: f.promedio }));
  const fFav = por_factor.map((f) => ({ nombre: f.nombre || f.cod, valor: f.pct_fav }));
  const fEst = (por_estamento || []).map((e) => ({ nombre: e.nombre, valor: e.promedio }));
  const partic = (por_estamento || []).map((e) => ({ nombre: e.nombre, valor: e.n }));
  const dona = distribucion?.length
    ? distribucion.map((d) => ({ nombre: d.label, valor: d.n, color: NIVEL_COLOR[d.label] }))
    : [{ nombre: "Favorable", valor: k.pct_fav ?? 0, color: "#16a34a" },
       { nombre: "No favorable", valor: 100 - (k.pct_fav ?? 0), color: "#ea580c" }];

  return (
    <>
      <div className="card kpi-strip">
        <div className="kpi-title">
          <span className="tablero-h">Tablero de resultados {data.anio}</span>
          <span className="muted">Autoevaluación ETITC · escala {escala}</span>
        </div>
        <div className="kpis">
          {/* Solo se muestran las tarjetas que ese año PUEDE calcular; las que no
              aplican (p.ej. Encuestados en 2016/2022, que no traen IDs) no se
              renderizan, en vez de quedar en blanco. */}
          {[
            ["Favorable", k.pct_fav != null ? `${k.pct_fav}%` : null],
            [data.anio === 2016 ? "Registros" : "Respuestas", k.n_respuestas],
            ["Encuestados", k.encuestados],
            ["Usuarios/prog.", k.usuarios_por_programa],
            ["Programas", k.programas],
            ["Facultades", k.facultades],
            ["Estamentos", k.estamentos],
            ["Factores", k.factores],
          ].filter(([, v]) => v != null).map(([l, v]) => (
            <Kpi key={l} valor={typeof v === "number" ? nfmt(v) : v} etiqueta={l} />
          ))}
        </div>
      </div>

      <div className="grid cols-3">
        <div className="card"><h2>Promedio general ({escala})</h2><Gauge valor={k.promedio} max={escala_max} label={`escala ${escala}`} /></div>
        <div className="card"><h2>Perfil por factor (radar)</h2><RadarFactores data={fFactor} max={escala_max} /></div>
        <div className="card"><h2>{distribucion?.length ? "Distribución de respuestas" : "Favorabilidad"}</h2><Dona data={dona} /></div>
      </div>

      <div className="grid cols-2">
        <div className="card"><h2>Promedio por factor · escala {escala}</h2><BarrasNota data={fFactor} max={escala_max} /></div>
        <div className="card"><h2>% Favorable por factor</h2><BarrasPct data={fFav} /></div>
      </div>

      <div className="grid cols-2">
        <div className="card"><h2>Promedio por estamento · escala {escala}</h2><BarrasNota data={fEst} max={escala_max} /></div>
        <div className="card"><h2>Participación por estamento</h2><Torta data={partic} /></div>
      </div>

      <div className="card">
        <h2>Mapa de calor — Factor × Estamento · escala {escala}</h2>
        <div className="scrollx">
          <table className="data matriz">
            <thead><tr><th className="l">Factor</th>{estamentos.map((e) => <th key={e} title={e}>{e.slice(0, 12)}</th>)}</tr></thead>
            <tbody>
              {por_factor.map((f) => (
                <tr key={f.cod}>
                  <td className="l cod-nom" title={f.nombre}><span className="cod">{f.cod}</span> {f.nombre ? f.nombre.slice(0, 34) : ""}</td>
                  {estamentos.map((e) => {
                    const v = matriz_factor_estamento[f.cod]?.[e];
                    return <td key={e}><div className="cell" style={{ background: colorNota(v, escala_max) }}>{v ?? ""}</div></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
