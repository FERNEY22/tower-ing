"""Precalcula tablas de apoyo para acelerar el tablero.

El tablero hacia `count(distinct id_encuestado)` en vivo sobre hecho_2025
(469k filas en Supabase) = ~11.5 s por carga. Aqui lo precalculamos UNA vez.

Crea dos tablas pequenas en public:
  - agg_encuestados(anio, estamento, programa_norm, n_encuestados)
       Conteo EXACTO de encuestados distintos para los 4 estados de filtro
       (todos / por estamento / por programa / ambos), via GROUPING SETS.
       Sentinela '(todos)' = dimension agregada. Necesario porque hay
       encuestados que aparecen en >1 grupo (no se pueden sumar conteos).
  - agg_distribucion(anio, estamento, programa_norm, nivel, n)
       Conteo de respuestas por nivel 1..5 al grano (estamento, programa).
       Es aditivo -> el tablero suma con los filtros que aplique.

Uso:  python -m etl.construir_agg_tablero   (desde la carpeta apreciacion/)
      o    python etl/construir_agg_tablero.py
"""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.db import get_engine          # reutiliza la conexion del backend (.env)
from sqlalchemy import text

ANIOS_HECHO = (2020, 2022, 2025)
TODOS = "(todos)"


def _exec(con, sql, **p):
    con.execute(text(sql), p)


def construir():
    eng = get_engine()
    with eng.begin() as con:
        # ---- agg_encuestados -------------------------------------------------
        _exec(con, "DROP TABLE IF EXISTS public.agg_encuestados")
        _exec(con, """
            CREATE TABLE public.agg_encuestados (
                anio          int  NOT NULL,
                estamento     text NOT NULL,
                programa_norm text NOT NULL,
                n_encuestados int  NOT NULL,
                PRIMARY KEY (anio, estamento, programa_norm)
            )""")
        # ---- agg_distribucion ------------------------------------------------
        _exec(con, "DROP TABLE IF EXISTS public.agg_distribucion")
        _exec(con, """
            CREATE TABLE public.agg_distribucion (
                anio          int  NOT NULL,
                estamento     text NOT NULL,
                programa_norm text NOT NULL,
                nivel         int  NOT NULL,
                n             int  NOT NULL,
                PRIMARY KEY (anio, estamento, programa_norm, nivel)
            )""")

        for anio in ANIOS_HECHO:
            t0 = time.time()
            # encuestados distintos por los 4 niveles de agregacion (exacto)
            _exec(con, f"""
                INSERT INTO public.agg_encuestados
                SELECT :a AS anio,
                       CASE WHEN GROUPING(estamento)=1     THEN :todos ELSE estamento END,
                       CASE WHEN GROUPING(programa_norm)=1 THEN :todos ELSE programa_norm END,
                       count(DISTINCT id_encuestado)
                FROM public.hecho_{anio}
                WHERE id_encuestado IS NOT NULL
                GROUP BY GROUPING SETS (
                    (), (estamento), (programa_norm), (estamento, programa_norm)
                )""", a=anio, todos=TODOS)
            # distribucion por nivel al grano (estamento, programa) — aditivo
            _exec(con, f"""
                INSERT INTO public.agg_distribucion
                SELECT :a, estamento, programa_norm, nivel, count(*)
                FROM public.hecho_{anio}
                WHERE nivel IS NOT NULL
                GROUP BY estamento, programa_norm, nivel""", a=anio)
            print(f"  {anio}: listo en {time.time()-t0:4.1f}s")

    # tamanos
    with eng.connect() as con:
        for t in ("agg_encuestados", "agg_distribucion"):
            n = con.execute(text(f"SELECT count(*) FROM public.{t}")).scalar()
            print(f"  {t}: {n} filas")
    print("OK.")


if __name__ == "__main__":
    construir()
