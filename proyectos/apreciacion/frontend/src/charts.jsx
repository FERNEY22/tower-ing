import {
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer, LabelList,
  PieChart, Pie, Legend, ReferenceLine, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, RadialBarChart, RadialBar,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { colorFrac } from "./util";

export const NIVEL_COLOR = {
  "Muy bajo": "#dc2626", "Bajo": "#ea580c", "Aceptable": "#d97706",
  "Favorable": "#16a34a", "Muy favorable": "#15803d",
};
export const PALETA = ["#2563eb", "#16a34a", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#db2777", "#65a30d"];
// paleta extendida a 12 para las 12 series de factores canónicos
export const PALETA12 = [
  "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#dc2626", "#0891b2",
  "#db2777", "#65a30d", "#0d9488", "#9333ea", "#c026d3", "#ca8a04",
];

const tip = {
  contentStyle: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
    color: "#1f2937", fontSize: 13, boxShadow: "0 2px 8px rgba(16,24,40,.12)" },
  labelStyle: { color: "#111827", fontWeight: 600 }, itemStyle: { color: "#374151" },
};
const AX = { fill: "#6b7280", fontSize: 12 };
const LBL = { fill: "#374151", fontSize: 12, fontWeight: 700 };
const cut = (t, n = 24) => (t && t.length > n ? t.slice(0, n - 1) + "…" : t);

export function BarrasNota({ data, max, unidad = "" }) {
  const h = Math.max(150, data.length * 30 + 20);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ left: 6, right: 42, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, max]} hide />
        <YAxis type="category" dataKey="nombre" width={166} tickLine={false} axisLine={false}
          tick={AX} tickFormatter={(t) => cut(t)} />
        <Tooltip {...tip} formatter={(v) => [`${v}${unidad}`, "Promedio"]} cursor={{ fill: "#00000008" }} />
        <Bar dataKey="valor" radius={[0, 5, 5, 0]} barSize={18} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={colorFrac(d.valor / max)} />)}
          <LabelList dataKey="valor" position="right" style={LBL} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarrasPct({ data }) {
  const h = Math.max(150, data.length * 30 + 20);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ left: 6, right: 44, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis type="category" dataKey="nombre" width={166} tickLine={false} axisLine={false} tick={AX} tickFormatter={(t) => cut(t)} />
        <Tooltip {...tip} formatter={(v) => [`${v}%`, "Favorable"]} cursor={{ fill: "#00000008" }} />
        <Bar dataKey="valor" radius={[0, 5, 5, 0]} barSize={18} fill="#16a34a" isAnimationActive={false}>
          <LabelList dataKey="valor" position="right" formatter={(v) => `${v}%`} style={LBL} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Dona({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="valor" nameKey="nombre" cx="50%" cy="50%"
          innerRadius={56} outerRadius={92} paddingAngle={2} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.color || PALETA[i % PALETA.length]} stroke="#fff" strokeWidth={2} />)}
        </Pie>
        <Tooltip {...tip} formatter={(v, n) => [v.toLocaleString("es-CO"), n]} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Torta({ data }) {
  // Se descartan estamentos sin participacion (n=0) y solo se etiquetan
  // dentro de la torta los segmentos grandes (>=6%): asi los pequenos
  // (p.ej. Empleadores/Directivos en 2022) no enciman sus leyendas.
  const d = (data || []).filter((x) => x.valor > 0);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={d} dataKey="valor" nameKey="nombre" cx="50%" cy="46%" outerRadius={84}
          label={(e) => (e.percent >= 0.06 ? `${(e.percent * 100).toFixed(0)}%` : "")}
          labelLine={false} isAnimationActive={false}>
          {d.map((x, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} stroke="#fff" strokeWidth={2} />)}
        </Pie>
        <Tooltip {...tip} formatter={(v, n) => [v.toLocaleString("es-CO"), n]} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle"
          formatter={(value, entry) => {
            const tot = d.reduce((s, x) => s + x.valor, 0);
            const pct = tot ? ((entry.payload.valor / tot) * 100).toFixed(1) : 0;
            return `${value} · ${pct}%`;
          }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RadarFactores({ data, max }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="cod" tick={{ fill: "#6b7280", fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, max]} tick={{ fill: "#9ca3af", fontSize: 10 }} angle={90} />
        <Radar dataKey="valor" stroke="#2563eb" fill="#2563eb" fillOpacity={0.35} isAnimationActive={false} />
        <Tooltip {...tip} formatter={(v, _n, p) => [v, p.payload.nombre || p.payload.cod]} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function Gauge({ valor, max, label }) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  const data = [{ name: "v", value: pct, fill: colorFrac(valor / max) }];
  return (
    <div style={{ position: "relative" }}>
      <ResponsiveContainer width="100%" height={200}>
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={210} endAngle={-30}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#eef1f5" }} isAnimationActive={false} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ position: "absolute", top: "52%", left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{valor}</div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
      </div>
    </div>
  );
}

// Evolución 0-100 a través de los años. `series`: [{ key, label, valores:{año:v}, color }].
// `highlight` (key) resalta una serie y atenúa las demás.
export function LineasEvolucion({ anios, series, highlight, height = 360, showLegend = true }) {
  const data = anios.map((a) => {
    const row = { anio: a };
    series.forEach((s) => { row[s.key] = s.valores[a] ?? s.valores[String(a)] ?? null; });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
        <CartesianGrid stroke="#eef1f5" vertical={false} />
        <XAxis dataKey="anio" tick={AX} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
        <YAxis domain={[0, 100]} tick={AX} tickLine={false} axisLine={false} width={34} />
        <Tooltip {...tip} formatter={(v, k) => [v == null ? "—" : v, k]} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />}
        {series.map((s, i) => {
          const on = !highlight || highlight === s.key;
          return (
            <Line key={s.key} dataKey={s.key} name={s.label}
              stroke={s.color || PALETA12[i % 12]}
              strokeWidth={highlight === s.key ? 3.5 : 2}
              strokeOpacity={on ? 1 : 0.2}
              dot={{ r: 2.5 }} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Barras verticales: una por año (conteo). data = [{ anio, valor }].
export function BarrasPorAnio({ data, color = "#2563eb", height = 250 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 10, top: 18, bottom: 4 }}>
        <CartesianGrid stroke="#eef1f5" vertical={false} />
        <XAxis dataKey="anio" tick={AX} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
        <YAxis tick={AX} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
        <Tooltip {...tip} formatter={(v) => [v, "Cantidad"]} cursor={{ fill: "#00000008" }} />
        <Bar dataKey="valor" fill={color} radius={[6, 6, 0, 0]} barSize={56} isAnimationActive={false}>
          <LabelList dataKey="valor" position="top" style={{ ...LBL, fontSize: 14 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Barras agrupadas por año dentro de cada categoría. data = [{ cod, "2020":n, ... }].
const COL_ANIO = { 2016: "#c7d2fe", 2020: "#93c5fd", 2022: "#3b82f6", 2025: "#1e3a8a" };
export function BarrasFactorAnio({ data, anios, height = 320 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 10, top: 16, bottom: 4 }}>
        <CartesianGrid stroke="#eef1f5" vertical={false} />
        <XAxis dataKey="cod" tick={AX} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
        <YAxis tick={AX} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
        <Tooltip {...tip} cursor={{ fill: "#00000008" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" />
        {anios.map((a) => (
          <Bar key={a} dataKey={String(a)} name={String(a)} fill={COL_ANIO[a] || "#2563eb"}
               radius={[3, 3, 0, 0]} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Barras APILADAS: x = año, un segmento por factor (composición del instrumento).
// data = [{ anio, F1:n, F2:n, ... }]. factores = [{cod, nombre}].
export function BarrasApiladasFactor({ data, factores, height = 360 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 10, top: 16, bottom: 4 }}>
        <CartesianGrid stroke="#eef1f5" vertical={false} />
        <XAxis dataKey="anio" tick={AX} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
        <YAxis tick={AX} tickLine={false} axisLine={false} width={34} allowDecimals={false} />
        <Tooltip {...tip} itemSorter={(i) => -i.value} />
        {factores.map((f, i) => (
          <Bar key={f.cod} dataKey={f.cod} stackId="p" name={`${f.cod} · ${f.nombre}`}
               fill={PALETA12[i % 12]} isAnimationActive={false}
               radius={i === factores.length - 1 ? [5, 5, 0, 0] : 0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarrasBrecha({ data }) {
  const h = Math.max(170, data.length * 30 + 20);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ left: 6, right: 42, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={["dataMin", "dataMax"]} hide />
        <YAxis type="category" dataKey="nombre" width={166} tickLine={false} axisLine={false} tick={AX} tickFormatter={(t) => cut(t)} />
        <Tooltip {...tip} formatter={(v) => [`${v > 0 ? "+" : ""}${v}`, "Brecha"]} cursor={{ fill: "#00000008" }} />
        <ReferenceLine x={0} stroke="#9ca3af" />
        <Bar dataKey="valor" radius={[3, 3, 3, 3]} barSize={16} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.valor >= 0 ? "#16a34a" : "#dc2626"} />)}
          <LabelList dataKey="valor" position="right" formatter={(v) => (v > 0 ? `+${v}` : v)} style={{ ...LBL, fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
