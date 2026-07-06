"""Incorpora 2016 (pre-agregado, escala 1-5) a public.agg_factor.

2016 no tiene respuestas individuales sino puntajes por factor ya calculados:
  - Programas:     'Calificacion (1-5)' -> promedio nativo 1-5 directo.
                   % favorable = % alto grado + % plenamente.
  - Institucional: 'Calif. Factor (0-100)' -> se lleva a 1-5 (/20).
                   % favorable = columna '% Favorable'.

Se inserta en escala NATIVA (escala_max=5) para replicar el tablero original.
Idempotente. Uso: python etl/cargar_2016.py
"""

import sys
import pandas as pd
from sqlalchemy import text

from db import get_engine
import config as cfg

DIR = cfg.FUENTE_DIR / "2016"
F_INS = DIR / "base_unificada_normalizada_Autoevaluacion__institucional_ETITC_2016.xlsx"
F_PRO = DIR / "base_unificada_normalizada_Autoevaluacion_Programas_ETITC_2016.xlsx"


def _col(df, sub):
    for c in df.columns:
        if sub.lower() in str(c).lower():
            return c
    raise KeyError(sub)


def procesar_programas():
    df = pd.read_excel(F_PRO, sheet_name="RS2016P")
    prog = _col(df, "Programa"); est = _col(df, "Estamento")
    nfac = _col(df, "N° Factor"); corto = _col(df, "Factor (corto)")
    calif = _col(df, "Calificaci")
    alto = _col(df, "alto grado"); pleno = _col(df, "plenamente")
    d = df[[prog, est, nfac, corto, calif, alto, pleno]].dropna(subset=[calif, nfac])
    d.columns = ["prog", "estamento", "nfac", "nombre", "calif", "alto", "pleno"]
    d["estamento"] = d["estamento"].map(cfg.canonizar_estamento)
    d["programa_norm"] = d["prog"].map(lambda v: cfg.canonizar_programa(v)[0])
    d["factor_cod"] = "F" + d["nfac"].astype(int).astype(str)
    d["fav"] = (d["alto"].fillna(0) + d["pleno"].fillna(0)) * 100
    g = (d.groupby(["estamento", "programa_norm", "factor_cod"])
           .agg(factor_nombre=("nombre", "first"),
                promedio=("calif", "mean"), pct_fav=("fav", "mean"),
                n=("calif", "size")).reset_index())
    return g


def procesar_institucional():
    df = pd.read_excel(F_INS, sheet_name="RS2016INS")
    fac = "Factor"; nom = _col(df, "Nombre del Factor")
    est = _col(df, "Estamento"); calif = _col(df, "Calif. Factor")
    favc = _col(df, "% Favorable")
    d = df[[fac, nom, est, calif, favc]].dropna(subset=[calif, fac])
    d.columns = ["nfac", "nombre", "estamento", "calif100", "fav"]
    d["estamento"] = d["estamento"].map(cfg.canonizar_estamento)
    d["factor_cod"] = "F" + d["nfac"].astype(int).astype(str)
    d["promedio"] = d["calif100"].astype(float) / 20.0        # 0-100 -> 1-5
    d["pct_fav"] = d["fav"].astype(float) * 100
    d["programa_norm"] = "INSTITUCIONAL"
    g = (d.groupby(["estamento", "programa_norm", "factor_cod"])
           .agg(factor_nombre=("nombre", "first"),
                promedio=("promedio", "mean"), pct_fav=("pct_fav", "mean"),
                n=("promedio", "size")).reset_index())
    return g


def main():
    todo = pd.concat([procesar_programas(), procesar_institucional()], ignore_index=True)
    todo["anio"] = 2016
    todo["escala_max"] = 5
    todo["promedio"] = todo["promedio"].round(3)
    todo["pct_fav"] = todo["pct_fav"].round(1)
    cols = ["anio", "estamento", "programa_norm", "factor_cod", "factor_nombre",
            "promedio", "escala_max", "pct_fav", "n"]

    eng = get_engine()
    with eng.begin() as con:
        con.execute(text("DELETE FROM public.agg_factor WHERE anio=2016"))
    todo[cols].to_sql("agg_factor", eng, schema="public",
                      if_exists="append", index=False, method="multi", chunksize=400)
    with eng.connect() as con:
        anios = con.execute(text("SELECT DISTINCT anio FROM public.agg_factor ORDER BY anio")).scalars().all()
    print(f"OK 2016: {len(todo)} filas (escala 1-5). Serie: {anios}")


if __name__ == "__main__":
    sys.exit(main())
