-- Esquema de Apreciacion (v2, enriquecido y centrado en el modelo).
-- Una tabla de hechos POR ANIO + vista UNION + dimension del modelo + agregados.
-- Idempotente.

CREATE SCHEMA IF NOT EXISTS apreciacion;

DROP VIEW IF EXISTS public.v_hecho;
DROP TABLE IF EXISTS public.hecho_2020;
DROP TABLE IF EXISTS public.hecho_2022;
DROP TABLE IF EXISTS public.hecho_2025;

CREATE TABLE public.hecho_2020 (
    anio                   SMALLINT,
    estamento              TEXT,
    programa_norm          TEXT,
    es_multiprograma       BOOLEAN,
    facultad               TEXT,
    sede                   TEXT,
    ciudad                 TEXT,
    genero                 TEXT,
    id_encuestado          TEXT,
    factor_cod             TEXT,
    caracteristica_cod     TEXT,
    aspecto_cod            TEXT,
    factor_nombre          TEXT,
    caracteristica_nombre  TEXT,
    aspecto_nombre         TEXT,
    seccion                TEXT,
    codigo_pregunta        TEXT,
    texto_pregunta         TEXT,
    respuesta_texto        TEXT,
    valor                  NUMERIC,
    valor_100              NUMERIC,
    nivel                  SMALLINT,
    fuente                 TEXT
);
CREATE TABLE public.hecho_2022 (LIKE public.hecho_2020 INCLUDING ALL);
CREATE TABLE public.hecho_2025 (LIKE public.hecho_2020 INCLUDING ALL);

-- indices por tabla para los filtros del tablero (explicitos: sin %s, que
-- psycopg confundiria con placeholders de parametros)
CREATE INDEX ix_h2020_fac ON public.hecho_2020 (factor_cod);
CREATE INDEX ix_h2020_est ON public.hecho_2020 (estamento);
CREATE INDEX ix_h2020_prog ON public.hecho_2020 (programa_norm);
CREATE INDEX ix_h2020_niv ON public.hecho_2020 (nivel);
CREATE INDEX ix_h2022_fac ON public.hecho_2022 (factor_cod);
CREATE INDEX ix_h2022_est ON public.hecho_2022 (estamento);
CREATE INDEX ix_h2022_prog ON public.hecho_2022 (programa_norm);
CREATE INDEX ix_h2022_niv ON public.hecho_2022 (nivel);
CREATE INDEX ix_h2025_fac ON public.hecho_2025 (factor_cod);
CREATE INDEX ix_h2025_est ON public.hecho_2025 (estamento);
CREATE INDEX ix_h2025_prog ON public.hecho_2025 (programa_norm);
CREATE INDEX ix_h2025_niv ON public.hecho_2025 (nivel);

CREATE VIEW public.v_hecho AS
    SELECT * FROM public.hecho_2020
    UNION ALL SELECT * FROM public.hecho_2022
    UNION ALL SELECT * FROM public.hecho_2025;

-- Dimension del modelo (por anio, con NOMBRES) ------------------------------
DROP TABLE IF EXISTS public.dim_modelo;
CREATE TABLE public.dim_modelo (
    anio                   SMALLINT,
    factor_cod             TEXT,
    factor_nombre          TEXT,
    caracteristica_cod     TEXT,
    caracteristica_nombre  TEXT,
    aspecto_cod            TEXT,
    aspecto_nombre         TEXT
);
CREATE INDEX ix_dim_anio_fac ON public.dim_modelo (anio, factor_cod);

-- Agregados (incluye 2016 pre-agregado) -------------------------------------
DROP TABLE IF EXISTS public.agg_factor;
CREATE TABLE public.agg_factor (
    anio            SMALLINT,
    estamento       TEXT,
    programa_norm   TEXT,
    factor_cod      TEXT,
    promedio_100    NUMERIC,
    n               INTEGER
);
CREATE INDEX ix_agg_anio ON public.agg_factor (anio);
CREATE INDEX ix_agg_fac  ON public.agg_factor (factor_cod);
