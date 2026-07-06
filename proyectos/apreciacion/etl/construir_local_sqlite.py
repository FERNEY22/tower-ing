"""Construye una base LOCAL SQLite (data_local.db) con TODAS las tablas que usa
el backend, para trabajar sin Supabase (que quedó offline). Regenera los
agregados desde salida/hecho_respuesta.parquet (2020/22/25) + el Excel de 2016.

Uso: python etl/construir_local_sqlite.py
Luego apuntar apreciacion/.env: DATABASE_URL=sqlite+pysqlite:///<ruta>/main_local.db
(el backend ATTACHea data_local.db como 'public').
"""
import sqlite3
from pathlib import Path

import pandas as pd

import config as cfg
import cargar_2016 as c16

BASE = cfg.BASE_DIR
DATA = BASE / "data_local.db"
MAIN = BASE / "main_local.db"

COLS_HECHO = [
    "anio", "estamento", "programa_norm", "es_multiprograma", "facultad",
    "sede", "ciudad", "genero", "id_encuestado", "factor_cod",
    "caracteristica_cod", "aspecto_cod", "factor_nombre",
    "caracteristica_nombre", "aspecto_nombre", "seccion", "codigo_pregunta",
    "texto_pregunta", "respuesta_texto", "valor", "valor_100", "nivel", "fuente",
]
TODOS = "(todos)"


def main():
    for f in (DATA, MAIN):
        if f.exists():
            f.unlink()

    h = pd.read_parquet(BASE / "salida" / "hecho_respuesta.parquet")
    h["es_multiprograma"] = h["es_multiprograma"].astype("boolean")
    # el parquet viejo dejó 'Nan'/'Todos' en programa_norm; el modelo actual los
    # agrupa como INSTITUCIONAL (línea base del comparativo). Se re-mapea aquí.
    _NAN = {"nan", "todos", "none", "", "(todos)"}
    h["programa_norm"] = h["programa_norm"].map(
        lambda v: "INSTITUCIONAL" if str(v).strip().lower() in _NAN else v)

    # --- agg_factor (esquema enriquecido de 9 columnas) ---
    def favpct(s):
        return (s >= 8).mean() * 100

    agg = (h.dropna(subset=["valor"])
             .groupby(["anio", "estamento", "programa_norm", "factor_cod"], dropna=False)
             .agg(factor_nombre=("factor_nombre", "first"),
                  promedio=("valor", "mean"), pct_fav=("valor", favpct),
                  n=("valor", "size")).reset_index())
    agg["escala_max"] = 10
    a16 = pd.concat([c16.procesar_programas(), c16.procesar_institucional()], ignore_index=True)
    a16["anio"] = 2016
    a16["escala_max"] = 5
    agg_all = pd.concat([agg, a16], ignore_index=True)
    agg_all["promedio"] = agg_all["promedio"].round(3)
    agg_all["pct_fav"] = agg_all["pct_fav"].round(1)
    agg_cols = ["anio", "estamento", "programa_norm", "factor_cod", "factor_nombre",
                "promedio", "escala_max", "pct_fav", "n"]
    agg_all = agg_all[agg_cols]

    dim = pd.read_parquet(BASE / "salida" / "dim_modelo.parquet")

    # --- agg_encuestados (GROUPING SETS calculado en pandas) ---
    rows = []
    hi = h.dropna(subset=["id_encuestado"])
    for anio, g in hi.groupby("anio"):
        rows.append((anio, TODOS, TODOS, g["id_encuestado"].nunique()))
        for e, ge in g.groupby("estamento"):
            rows.append((anio, e, TODOS, ge["id_encuestado"].nunique()))
        for p, gp in g.groupby("programa_norm"):
            rows.append((anio, TODOS, p, gp["id_encuestado"].nunique()))
        for (e, p), gep in g.groupby(["estamento", "programa_norm"]):
            rows.append((anio, e, p, gep["id_encuestado"].nunique()))
    enc = pd.DataFrame(rows, columns=["anio", "estamento", "programa_norm", "n_encuestados"])

    # --- agg_distribucion ---
    dist = (h.dropna(subset=["nivel"])
              .groupby(["anio", "estamento", "programa_norm", "nivel"])
              .size().reset_index(name="n"))

    # --- escribir en data_local.db (nombres planos; el backend lo ATTACHea como public) ---
    con = sqlite3.connect(str(DATA))
    for anio, g in h.groupby("anio"):
        g[COLS_HECHO].to_sql(f"hecho_{anio}", con, if_exists="replace", index=False)
        print(f"  hecho_{anio}: {len(g):,}")
    agg_all.to_sql("agg_factor", con, if_exists="replace", index=False)
    dim.to_sql("dim_modelo", con, if_exists="replace", index=False)
    enc.to_sql("agg_encuestados", con, if_exists="replace", index=False)
    dist.to_sql("agg_distribucion", con, if_exists="replace", index=False)
    con.commit()
    con.close()
    # main_local.db vacío (el backend conecta aquí y ATTACHea data como public)
    sqlite3.connect(str(MAIN)).close()
    print(f"agg_factor={len(agg_all)} (años {sorted(agg_all['anio'].unique())}) "
          f"enc={len(enc)} dist={len(dist)} dim={len(dim)}")
    print(f"OK -> {DATA.name} + {MAIN.name}")


if __name__ == "__main__":
    main()
