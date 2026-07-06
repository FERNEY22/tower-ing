import { useEffect, useState } from "react";
import { api } from "./api";
import Tablero from "./components/Tablero";
import Comparativo from "./components/Comparativo";
import Instrumento from "./components/Instrumento";

const ANIOS = [2016, 2020, 2022, 2025];

export default function App() {
  const [tab, setTab] = useState("tablero");
  const [anio, setAnio] = useState(2025);
  const [opts, setOpts] = useState({ estamento: [], programa: [] });
  const [estamento, setEstamento] = useState("");
  const [programa, setPrograma] = useState("");
  const [base, setBase] = useState("");   // 2016: '', 'institucional', 'programas'
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    setEstamento(""); setPrograma(""); setBase("");
    api.filtros(anio).then(setOpts).catch((e) => setError(String(e)));
  }, [anio]);

  useEffect(() => {
    if (tab === "instrumento") { setData(null); setCargando(false); setError(null); return; }
    let vivo = true;
    setCargando(true); setError(null); setData(null);
    const f = { estamento, ...(tab === "tablero" ? { programa, base } : {}) };
    const p = tab === "tablero" ? api.tablero(anio, f) : api.comparativo(anio, { estamento });
    p.then((d) => vivo && setData(d))
      .catch((e) => vivo && setError(String(e)))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [tab, anio, estamento, programa, base]);

  const esInstr = tab === "instrumento";

  return (
    <div className="app">
      <header className="top">
        <h1>Apreciación ETITC</h1>
        <p className="sub">Autoevaluación institucional 2016–2025 · tableros por año y comparativo Programas vs Institucional.</p>
      </header>

      <div className="toolbar">
        {!esInstr && (
        <div className="field">
          <label>Año</label>
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
            {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        )}
        {tab === "tablero" && anio === 2016 && (
          <div className="field">
            <label>Base 2016</label>
            <select value={base} onChange={(e) => { setBase(e.target.value); setPrograma(""); }}>
              <option value="">Todas</option>
              <option value="institucional">Institucional</option>
              <option value="programas">Programas</option>
            </select>
          </div>
        )}
        {!esInstr && opts.estamento.length > 0 && (
          <div className="field">
            <label>Estamento</label>
            <select value={estamento} onChange={(e) => setEstamento(e.target.value)}>
              <option value="">Todos</option>
              {opts.estamento.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        )}
        {tab === "tablero" && opts.programa.length > 0 && base === "" && (
          <div className="field">
            <label>Programa</label>
            <select value={programa} onChange={(e) => setPrograma(e.target.value)}>
              <option value="">Todos</option>
              {opts.programa.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        )}
        <div className="tabs">
          <button className={tab === "tablero" ? "on" : ""} onClick={() => setTab("tablero")}>Tablero</button>
          <button className={tab === "comparativo" ? "on" : ""} onClick={() => setTab("comparativo")}>Comparativo</button>
          <button className={tab === "instrumento" ? "on" : ""} onClick={() => setTab("instrumento")}>Modelo actual</button>
        </div>
      </div>

      {error && <div className="error">⚠ {error}<br /><span className="muted">No se pudieron cargar los datos de /datos. Sirve la carpeta dist con un servidor estático (no abras index.html con doble clic).</span></div>}
      {/* Se valida la FORMA de `data` contra la pestaña: al cambiar de pestaña,
          `data` conserva un instante la forma anterior (el reset vive en un
          useEffect posterior). Sin esta guarda, el componente recibiría datos
          de otra vista y reventaría (pantalla en blanco). */}
      {!error && tab === "tablero" && (
        cargando || !data?.por_factor
          ? <div className="loading">Cargando datos…</div>
          : <Tablero data={data} />)}
      {!error && tab === "comparativo" && (
        cargando || !data?.factores
          ? <div className="loading">Cargando datos…</div>
          : <Comparativo data={data} />)}
      {!error && esInstr && <Instrumento />}
    </div>
  );
}
