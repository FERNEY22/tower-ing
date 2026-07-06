import { Fragment, useEffect, useState } from "react";
import { color100, ordenarProgramas, areaPrograma } from "../util";
import { BarrasNota, BarrasBrecha, LineasEvolucion, PALETA12, BarrasPorAnio, BarrasApiladasFactor } from "../charts";
import { api } from "../api";

export default function Comparativo({ data }) {
  const [hist, setHist] = useState(null);
  const [histC, setHistC] = useState(null);
  const [cob, setCob] = useState(null);
  const [modo, setModo] = useState("factores");   // factores | estamentos
  const [hl, setHl] = useState(null);             // factor resaltado en la línea

  useEffect(() => {
    api.historico().then(setHist).catch(() => setHist(null));
    api.historicoCaracteristicas().then(setHistC).catch(() => setHistC(null));
    api.cobertura().then(setCob).catch(() => setCob(null));
  }, []);

  if (!data) return <div className="loading">Cargando…</div>;
  const { kpis: k } = data;

  // agrupar programas por FACULTAD (fuente oficial ETITC) y, dentro, por nivel
  const programas = ordenarProgramas(data.programas);

  // ordenar factores numéricamente por el nº del código (F1, F2, … F10, F11) y no como texto
  const numFactor = (f) => { const m = String(f.cod).match(/\d+/); return m ? +m[0] : 999; };
  const factores = [...data.factores].sort((a, b) => numFactor(a) - numFactor(b));

  // brecha por factor = promedio de programas - institucional
  const brecha = factores.map((f) => {
    const vals = Object.values(f.valores);
    const prom = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return { nombre: f.nombre || f.cod, valor: prom != null && f.institucional != null ? +(prom - f.institucional).toFixed(1) : 0 };
  });

  // ranking de programas por promedio (0-100) a lo largo de factores
  const rank = {};
  factores.forEach((f) => Object.entries(f.valores).forEach(([p, v]) => {
    (rank[p] ??= []).push(v);
  }));
  const ranking = Object.entries(rank)
    .map(([p, vs]) => ({ nombre: p, valor: +(vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <>
      <div className="card kpi-strip">
        <div className="kpi-title">
          <span className="tablero-h">Programas vs Institucional · {data.anio}</span>
          <span className="muted">Escala 0–100 · Brecha = programa − institucional</span>
        </div>
        <div className="kpis">
          <div className="kpi"><b className="xl">{k.institucional ?? "–"}</b><span>Institucional</span></div>
          <div className="kpi"><b>{k.prom_programas ?? "–"}</b><span>Prom. programas</span></div>
          <div className="kpi"><b style={{ color: k.brecha < 0 ? "#f85149" : "#3fb950" }}>{k.brecha > 0 ? "+" : ""}{k.brecha ?? "–"}</b><span>Brecha</span></div>
          <div className="kpi"><b className="sm">{k.mejor_programa ?? "–"}</b><span>Mejor programa</span></div>
          <div className="kpi"><b>{k.n_programas}</b><span>Nº programas</span></div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h2>Brecha por factor (programas − institucional)</h2>
          <BarrasBrecha data={brecha} />
        </div>
        <div className="card">
          <h2>Ranking de programas (0–100)</h2>
          <div className="scrolly"><BarrasNota data={ranking} max={100} /></div>
        </div>
      </div>

      {hist && <SeccionHistorica hist={hist} modo={modo} setModo={setModo} hl={hl} setHl={setHl} />}

      {histC && <SeccionCaracteristicas histC={histC} />}

      {cob && <SeccionCobCaract cob={cob} />}

      {cob && <SeccionCobPreg cob={cob} />}

      <div className="card">
        <h2>Mapa de calor — Programa × Factor (0–100)</h2>
        <div className="scrollx">
          <table className="data matriz">
            <thead>
              <tr>
                <th className="l">Programa</th>
                {factores.map((f) => (
                  <th key={f.cod} title={f.nombre} className="prog-th"><span className="cod">{f.cod}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="inst-row">
                <td className="l cod-nom"><b>Institucional</b></td>
                {factores.map((f) => (
                  <td key={f.cod} title={f.nombre}><div className="cell inst" style={{ background: color100(f.institucional) }}>{f.institucional ?? ""}</div></td>
                ))}
              </tr>
              {programas.map((p, i) => {
                const area = areaPrograma(p).area;
                const nuevaArea = i === 0 || areaPrograma(programas[i - 1]).area !== area;
                return (
                  <Fragment key={p}>
                    {nuevaArea && (
                      <tr className="area-row">
                        <td className="l area-lbl" colSpan={factores.length + 1}>{area}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="l cod-nom" title={p}>{p.slice(0, 34)}</td>
                      {factores.map((f) => {
                        const v = f.valores[p];
                        const b = v != null && f.institucional != null ? +(v - f.institucional).toFixed(1) : null;
                        return <td key={f.cod} title={`${f.nombre}${b != null ? ` · brecha ${b > 0 ? "+" : ""}${b}` : ""}`}><div className="cell" style={{ background: color100(v) }}>{v ?? ""}</div></td>;
                      })}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const corto = (t, n = 40) => (t && t.length > n ? t.slice(0, n - 1) + "…" : t || "");
// del texto "F1: NOMBRE" deja solo el nombre para la celda de la tabla
const soloNombre = (celda) => (celda ? celda.split(" | ").map((s) => s.replace(/^F\d+:\s*/, "")).join(" | ") : "—");

function SeccionHistorica({ hist, modo, setModo, hl, setHl }) {
  const { anios, factores, estamentos } = hist;

  const series = (modo === "factores"
    ? factores.map((f, i) => ({ key: f.cod, label: `${f.cod} · ${corto(f.nombre, 24)}`, valores: f.valores, color: PALETA12[i % 12] }))
    : estamentos.map((e, i) => ({ key: e.nombre, label: e.nombre, valores: e.valores, color: PALETA12[i % 12] }))
  ).filter((s) => anios.some((a) => s.valores[a] != null));

  return (
    <div className="card">
      <div className="hist-head">
        <h2>Evolución histórica {anios[0]}–{anios[anios.length - 1]} · 0–100</h2>
        <div className="tabs">
          <button className={modo === "factores" ? "on" : ""} onClick={() => setModo("factores")}>Factores</button>
          <button className={modo === "estamentos" ? "on" : ""} onClick={() => setModo("estamentos")}>Estamentos</button>
        </div>
      </div>
      <p className="muted" style={{ marginTop: -4 }}>
        Normalizado 0–100 para comparar escalas distintas (2016 = 1–5; 2020+ = 2–10). Factores homologados al modelo actual (CNA 2025).
      </p>

      <div className="grid hist-grid">
        <div>
          <LineasEvolucion anios={anios} series={series} highlight={modo === "factores" ? hl : null} showLegend={false} />
          <ul className="leyenda-lista">
            {series.map((s) => (
              <li key={s.key}
                  className={"leg-item" + (hl === s.key ? " on" : "")}
                  onMouseEnter={() => modo === "factores" && setHl(s.key)}
                  onMouseLeave={() => setHl(null)}>
                <span className="sw" style={{ background: s.color }} />
                <span className="leg-txt">{s.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="scrollx">
          <table className="data hist-tabla">
            <thead>
              <tr>
                <th className="l">Factor (F1–F12)</th>
                {anios.map((a) => <th key={a}>{a}</th>)}
                <th className="l sint">Síntesis · estándar actual</th>
              </tr>
            </thead>
            <tbody>
              {factores.map((f) => (
                <tr key={f.cod}
                    className={hl === f.cod ? "row-hl" : ""}
                    onMouseEnter={() => setHl(f.cod)} onMouseLeave={() => setHl(null)}>
                  <td className="l">
                    <span className="cod">{f.cod}</span> <span title={f.nombre}>{corto(f.nombre, 26)}</span>
                  </td>
                  {anios.map((a) => {
                    const v = f.valores[a];
                    return (
                      <td key={a} className="hist-cell" title={soloNombre(f.celdas[a])}>
                        <div className="hv" style={{ background: color100(v), opacity: v == null ? 0.25 : 1 }}>{v ?? "—"}</div>
                        <div className="hn">{corto(soloNombre(f.celdas[a]), 22)}</div>
                      </td>
                    );
                  })}
                  <td className="l sint">
                    <b>{corto(f.nombre, 34)}</b>
                    <div className="hn">{f.evol}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SeccionCaracteristicas({ histC }) {
  const { anios, factores } = histC;
  // por defecto, el factor con más linajes (el más informativo)
  const porDefecto = [...factores].sort((a, b) => b.n_linajes - a.n_linajes)[0]?.cod;
  const [sel, setSel] = useState(porDefecto);
  const f = factores.find((x) => x.cod === sel) || factores[0];

  const linajes = (f?.caracteristicas || []).filter((c) => c.linaje);
  const propias = (f?.caracteristicas || []).filter((c) => !c.linaje);
  const series = linajes.map((c, i) => ({
    key: c.id, label: corto(c.nombre, 34), valores: c.valores, color: PALETA12[i % 12],
  }));

  return (
    <div className="card">
      <div className="hist-head">
        <h2>Características por factor · evolución {anios[0]}–{anios[anios.length - 1]}</h2>
        <div className="field">
          <label>Factor</label>
          <select value={sel} onChange={(e) => setSel(e.target.value)}>
            {factores.map((x) => (
              <option key={x.cod} value={x.cod}>{x.cod} · {corto(x.nombre, 30)} ({x.n_linajes} linaje{x.n_linajes === 1 ? "" : "s"})</option>
            ))}
          </select>
        </div>
      </div>
      <p className="muted" style={{ marginTop: -4 }}>
        Solo se conectan como línea las características con <b>linaje real</b> entre años (mismo ítem homologado). Las demás se listan como propias de su año (el modelo de características se rehízo cada ciclo). 2016 no tiene características.
      </p>

      <div className="grid hist-grid">
        <div>
          {series.length
            ? <LineasEvolucion anios={anios} series={series} height={320} />
            : <div className="loading" style={{ minHeight: 200 }}>Este factor no tiene características con linaje entre años.</div>}
        </div>

        <div className="scrollx">
          <h3 className="sub-h">Características propias de un año ({propias.length})</h3>
          <table className="data caract-tabla">
            <thead>
              <tr><th className="l">Característica</th>{anios.map((a) => <th key={a}>{a}</th>)}</tr>
            </thead>
            <tbody>
              {propias.map((c) => (
                <tr key={c.id}>
                  <td className="l" title={c.nombre}>{corto(c.nombre, 40)}</td>
                  {anios.map((a) => {
                    const v = c.valores[a];
                    return <td key={a} className="hist-cell">{v != null
                      ? <div className="hv" style={{ background: color100(v) }}>{v}</div>
                      : <span className="muted">·</span>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Nº de CARACTERÍSTICAS por factor y año: barras apiladas + matriz (tooltip = cuáles) ---
function SeccionCobCaract({ cob }) {
  const { anios } = cob;
  const por_factor = cob.caracteristicas.por_factor;
  const n = (f, a) => f.conteo[a] ?? f.conteo[String(a)] ?? 0;
  const nombresDe = (f, a) => (f.nombres?.[a] ?? f.nombres?.[String(a)] ?? []);
  const data = anios.map((a) => {
    const row = { anio: a };
    por_factor.forEach((f) => { row[f.cod] = n(f, a); });
    return row;
  });
  const totalAnio = (a) => por_factor.reduce((s, f) => s + n(f, a), 0);
  const totalGen = por_factor.reduce((s, f) => s + f.total, 0);

  return (
    <div className="card">
      <h2>Características por factor y año</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        Composición del instrumento: cuántas características tuvo cada factor por año (2020/2022/2025). Cada color es un factor; pasa el mouse por una celda para ver <i>cuáles</i> son. (2016 no evaluó a nivel de característica.)
      </p>
      <div className="grid hist-grid">
        <div><BarrasApiladasFactor data={data} factores={por_factor} /></div>
        <div className="scrollx">
          <table className="data hist-tabla">
            <thead>
              <tr><th className="l">Factor</th>{anios.map((a) => <th key={a}>{a}</th>)}</tr>
            </thead>
            <tbody>
              {por_factor.map((f, i) => (
                <tr key={f.cod}>
                  <td className="l" title={f.nombre}>
                    <span className="sw-sq" style={{ background: PALETA12[i % 12] }} />
                    <span className="cod">{f.cod}</span> {corto(f.nombre, 26)}
                  </td>
                  {anios.map((a) => {
                    const v = n(f, a);
                    const nombres = nombresDe(f, a);
                    return (
                      <td key={a} className="hist-cell" title={nombres.length ? nombres.join(" · ") : "sin características este año"}>
                        <span className={"cnt" + (v ? "" : " cero")}>{v}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="inst-row">
                <td className="l"><b>Total características</b></td>
                {anios.map((a) => <td key={a} className="hist-cell"><b>{totalAnio(a)}</b></td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Nº de PREGUNTAS por factor y año: barras apiladas (factores por año) + matriz ---
function SeccionCobPreg({ cob }) {
  const { anios } = cob;
  const { por_factor } = cob.preguntas;
  const n = (f, a) => f.conteo[a] ?? f.conteo[String(a)] ?? 0;
  const data = anios.map((a) => {
    const row = { anio: a };
    por_factor.forEach((f) => { row[f.cod] = n(f, a); });
    return row;
  });
  const totalAnio = (a) => por_factor.reduce((s, f) => s + n(f, a), 0);
  const totalGen = por_factor.reduce((s, f) => s + f.total, 0);

  return (
    <div className="card">
      <h2>Preguntas por factor y año</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        Composición del instrumento: cuántas preguntas incluyó cada factor por año (2020/2022/2025). Cada color es un factor; la tabla es la leyenda con los conteos exactos.
      </p>
      <div className="grid hist-grid">
        <div><BarrasApiladasFactor data={data} factores={por_factor} /></div>
        <div className="scrollx">
          <table className="data hist-tabla">
            <thead>
              <tr><th className="l">Factor</th>{anios.map((a) => <th key={a}>{a}</th>)}</tr>
            </thead>
            <tbody>
              {por_factor.map((f, i) => (
                <tr key={f.cod}>
                  <td className="l" title={f.nombre}>
                    <span className="sw-sq" style={{ background: PALETA12[i % 12] }} />
                    <span className="cod">{f.cod}</span> {corto(f.nombre, 26)}
                  </td>
                  {anios.map((a) => {
                    const v = n(f, a);
                    return <td key={a} className="hist-cell"><span className={"cnt" + (v ? "" : " cero")}>{v}</span></td>;
                  })}
                </tr>
              ))}
              <tr className="inst-row">
                <td className="l"><b>Total preguntas</b></td>
                {anios.map((a) => <td key={a} className="hist-cell"><b>{totalAnio(a)}</b></td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
