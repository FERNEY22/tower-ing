import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { color100, nfmt } from "../util";

// Explorador jerárquico del instrumento 2025:
// Factor → Característica → Aspecto → Pregunta (con estamentos por pregunta).
export default function Instrumento() {
  const [tree, setTree] = useState(null);
  const [open, setOpen] = useState(() => new Set());
  const [q, setQ] = useState("");

  useEffect(() => { api.instrumento2025().then(setTree).catch(() => setTree(null)); }, []);

  const toggle = (id) =>
    setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ids de todos los nodos plegables (factor/caract/aspecto) para expandir/colapsar todo
  const todosIds = useMemo(() => {
    if (!tree) return [];
    const ids = [];
    tree.factores.forEach((f) => {
      ids.push(f.cod);
      f.caracteristicas.forEach((c) => {
        ids.push(`${f.cod}/${c.cod}`);
        c.aspectos.forEach((a) => ids.push(`${f.cod}/${c.cod}/${a.cod}`));
      });
    });
    return ids;
  }, [tree]);

  if (!tree) return <div className="loading">Cargando instrumento 2025…</div>;

  const ql = q.trim().toLowerCase();
  const matchPreg = (p) => !ql || p.texto.toLowerCase().includes(ql);

  return (
    <>
      <div className="card kpi-strip">
        <div className="kpi-title">
          <span className="tablero-h">Modelo actual · 2025</span>
          <span className="muted">Preguntas aplicadas y su relación con aspecto, característica, factor y estamento</span>
        </div>
        <div className="kpis">
          <div className="kpi"><b className="xl">{tree.n_items}</b><span>Ítems evaluados</span></div>
          <div className="kpi"><b>{tree.factores.length}</b><span>Factores</span></div>
          <div className="kpi"><b>{tree.factores.reduce((s, f) => s + f.caracteristicas.length, 0)}</b><span>Características</span></div>
          <div className="kpi"><b>{tree.factores.reduce((s, f) => s + f.caracteristicas.reduce((t, c) => t + c.aspectos.length, 0), 0)}</b><span>Aspectos</span></div>
        </div>
      </div>

      <div className="card">
        <div className="instr-tools">
          <input className="buscador" placeholder="Buscar pregunta…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="tabs">
            <button onClick={() => setOpen(new Set(todosIds))}>Expandir todo</button>
            <button onClick={() => setOpen(new Set())}>Colapsar</button>
          </div>
          <span className="leyenda-heat">
            <span className="hswatch" style={{ background: color100(55) }} /> bajo
            <span className="hswatch" style={{ background: color100(78) }} /> medio
            <span className="hswatch" style={{ background: color100(95) }} /> alto
          </span>
        </div>

        <div className="arbol">
          {tree.factores.map((f) => {
            const abierto = open.has(f.cod) || !!ql;
            return (
              <div key={f.cod} className="rama">
                <Nodo nivel={1} cod={f.cod} nombre={f.nombre} prom={f.promedio} fav={f.pct_fav} n={f.n}
                      abierto={abierto} onToggle={() => toggle(f.cod)} />
                {abierto && f.caracteristicas.map((c) => {
                  const idC = `${f.cod}/${c.cod}`;
                  const abC = open.has(idC) || !!ql;
                  return (
                    <div key={idC} className="rama">
                      <Nodo nivel={2} cod={c.cod} nombre={c.nombre} prom={c.promedio} fav={c.pct_fav} n={c.n}
                            abierto={abC} onToggle={() => toggle(idC)} />
                      {abC && c.aspectos.map((a) => {
                        const idA = `${idC}/${a.cod}`;
                        const abA = open.has(idA) || !!ql;
                        const pregs = a.preguntas.filter(matchPreg);
                        if (ql && !pregs.length) return null;
                        return (
                          <div key={idA} className="rama">
                            <Nodo nivel={3} cod={a.cod} nombre={a.nombre} prom={a.promedio} fav={a.pct_fav} n={a.n}
                                  abierto={abA} onToggle={() => toggle(idA)} />
                            {abA && (
                              <div className="preguntas">
                                {pregs.map((p, i) => <Pregunta key={i} p={p} />)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Nodo({ nivel, cod, nombre, prom, fav, n, abierto, onToggle }) {
  return (
    <button className={`nodo nivel-${nivel}`} onClick={onToggle} aria-expanded={abierto}>
      <span className="chev">{abierto ? "▾" : "▸"}</span>
      <span className="cod">{cod}</span>
      <span className="nom">{nombre}</span>
      <span className="metrics">
        <span className="fav">{fav != null ? `${fav}%` : ""}</span>
        <span className="nn">{nfmt(n)}</span>
        <span className="score" style={{ background: color100(prom) }}>{prom ?? "–"}</span>
      </span>
    </button>
  );
}

function Pregunta({ p }) {
  return (
    <div className="pregunta">
      <span className="score sm" style={{ background: color100(p.promedio) }}>{p.promedio ?? "–"}</span>
      <div className="pcontent">
        <div className="ptexto">{p.texto}</div>
        <div className="pchips">
          {p.estamentos.map((e) => (
            <span className="chip" key={e.nombre} title={`${nfmt(e.n)} respuestas`}>
              <span className="dot" style={{ background: color100(e.promedio) }} />
              {e.nombre} <b>{e.promedio}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
