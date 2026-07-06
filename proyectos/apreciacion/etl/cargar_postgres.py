"""Carga a PostgreSQL — Apreciacion.

1. Ejecuta db/schema.sql (crea esquema, una tabla por anio, vista e indices).
2. Sube hecho_respuesta.parquet a la tabla del anio correspondiente via COPY.
3. Sube agg_factor.parquet a public.agg_factor.

Requiere .env con DATABASE_URL. Uso:
    python etl/cargar_postgres.py
"""

import sys
from pathlib import Path

import pandas as pd

from db import get_engine
import config as cfg

DB_DIR = cfg.BASE_DIR / "db"
SCHEMA_SQL = DB_DIR / "schema.sql"

# columnas de la tabla de hechos, en el orden del DDL (v2 enriquecido)
COLS_HECHO = [
    "anio", "estamento", "programa_norm", "es_multiprograma", "facultad",
    "sede", "ciudad", "genero", "id_encuestado", "factor_cod",
    "caracteristica_cod", "aspecto_cod", "factor_nombre",
    "caracteristica_nombre", "aspecto_nombre", "seccion", "codigo_pregunta",
    "texto_pregunta", "respuesta_texto", "valor", "valor_100", "nivel",
    "fuente",
]
COLS_AGG = ["anio", "estamento", "programa_norm", "factor_cod", "promedio_100", "n"]
COLS_DIM = ["anio", "factor_cod", "factor_nombre", "caracteristica_cod",
            "caracteristica_nombre", "aspecto_cod", "aspecto_nombre"]


def crear_esquema(eng):
    sql = SCHEMA_SQL.read_text(encoding="utf-8")
    with eng.begin() as con:
        con.exec_driver_sql(sql)
    print("· esquema creado (tablas por anio + vista + agregados)")


def _copy_df(pgconn, tabla, df, cols):
    """Sube un DataFrame a public.<tabla> via COPY. NaN -> NULL."""
    df = df[cols].copy()
    # columnas enteras con nulos: castear a Int64 para que COPY no reciba '5.0'
    for c in ("nivel", "anio", "n"):
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").astype("Int64")
    df = df.astype(object).where(pd.notnull(df), None)
    lista_cols = ", ".join(cols)
    sql = f"COPY public.{tabla} ({lista_cols}) FROM STDIN"
    with pgconn.cursor() as cur:
        with cur.copy(sql) as cp:
            for rec in df.itertuples(index=False, name=None):
                cp.write_row(rec)
    pgconn.commit()


def cargar_hechos(eng):
    hechos = pd.read_parquet(cfg.SALIDA_DIR / "hecho_respuesta.parquet")
    raw = eng.raw_connection()
    try:
        pgconn = raw.driver_connection  # conexion psycopg3 subyacente
        for anio, grupo in hechos.groupby("anio"):
            tabla = f"hecho_{anio}"
            _copy_df(pgconn, tabla, grupo, COLS_HECHO)
            print(f"· {tabla}: {len(grupo):,} filas")
    finally:
        raw.close()


def cargar_agg(eng):
    agg = pd.read_parquet(cfg.SALIDA_DIR / "agg_factor.parquet")
    raw = eng.raw_connection()
    try:
        pgconn = raw.driver_connection
        _copy_df(pgconn, "agg_factor", agg, COLS_AGG)
        print(f"· agg_factor: {len(agg):,} filas")
    finally:
        raw.close()


def cargar_dim(eng):
    dim = pd.read_parquet(cfg.SALIDA_DIR / "dim_modelo.parquet")
    raw = eng.raw_connection()
    try:
        pgconn = raw.driver_connection
        _copy_df(pgconn, "dim_modelo", dim, COLS_DIM)
        print(f"· dim_modelo: {len(dim):,} filas")
    finally:
        raw.close()


def verificar(eng):
    from sqlalchemy import text
    with eng.connect() as con:
        print("\nConteos en la base:")
        for t in ("hecho_2020", "hecho_2022", "hecho_2025", "agg_factor"):
            n = con.execute(text(f"SELECT count(*) FROM public.{t}")).scalar_one()
            print(f"   public.{t}: {n:,}")
        n = con.execute(text("SELECT count(*) FROM public.v_hecho")).scalar_one()
        print(f"   public.v_hecho (union historica): {n:,}")


def main():
    eng = get_engine()
    crear_esquema(eng)
    cargar_hechos(eng)
    cargar_dim(eng)
    cargar_agg(eng)
    verificar(eng)
    print("\nOK. Carga completa.")


if __name__ == "__main__":
    sys.exit(main())
