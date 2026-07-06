"""Reconstruye public.agg_factor en ESCALA NATIVA desde las tablas de hechos.

Promedio nativo (2-10 para 2020/2022/2025), % favorable (nivel>=4) y n, por
anio/estamento/programa/factor. No re-lee los Excel: agrega por SQL sobre las
tablas ya cargadas. Luego incorpora 2016 (escala 1-5) con cargar_2016.

Uso: python etl/construir_agg.py
"""

import sys
from sqlalchemy import text
from db import get_engine

DDL = """
DROP TABLE IF EXISTS public.agg_factor;
CREATE TABLE public.agg_factor (
    anio            SMALLINT,
    estamento       TEXT,
    programa_norm   TEXT,
    factor_cod      TEXT,
    factor_nombre   TEXT,
    promedio        NUMERIC,   -- en escala nativa del anio
    escala_max      SMALLINT,  -- 5 (2016) o 10 (2020+)
    pct_fav         NUMERIC,   -- porcentaje favorable (nivel>=4)
    n               INTEGER
);
CREATE INDEX ix_agg_anio ON public.agg_factor (anio);
CREATE INDEX ix_agg_fac  ON public.agg_factor (factor_cod);
"""

INSERT_ANIO = """
INSERT INTO public.agg_factor
  (anio, estamento, programa_norm, factor_cod, factor_nombre,
   promedio, escala_max, pct_fav, n)
SELECT anio, estamento, programa_norm, factor_cod,
       max(factor_nombre),
       round(avg(valor), 3),
       10,
       round(100.0 * avg((nivel >= 4)::int), 1),
       count(*)
FROM public.hecho_{anio}
WHERE valor IS NOT NULL
GROUP BY anio, estamento, programa_norm, factor_cod;
"""


def main():
    eng = get_engine()
    with eng.begin() as con:
        con.exec_driver_sql(DDL)
        for anio in (2020, 2022, 2025):
            con.exec_driver_sql(INSERT_ANIO.format(anio=anio))
    with eng.connect() as con:
        for anio in (2020, 2022, 2025):
            n = con.execute(text("SELECT count(*) FROM public.agg_factor WHERE anio=:a"), {"a": anio}).scalar_one()
            print(f"· agg {anio}: {n} filas (factor×estamento×programa)")
    print("agg 2020/2022/2025 en escala nativa listo. Falta 2016 (cargar_2016.py).")


if __name__ == "__main__":
    sys.exit(main())
