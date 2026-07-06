"""ETL de armonizacion (v2) — Apreciacion / Autoevaluacion ETITC.

Lee las bases sistematizadas heterogeneas (2020, 2022, 2025) y produce un
esquema canonico ENRIQUECIDO, centrado en el modelo de autoevaluacion:

  Factor -> Caracteristica -> Aspecto -> Pregunta  (con NOMBRES, no solo codigos)
  + respuesta verbal, nivel 1..5 (para distribuciones) y todos los cortes
    disponibles (programa, sede, ciudad, genero, facultad, estamento).

Salidas:
  salida/hecho_respuesta.parquet   tabla de hechos enriquecida
  salida/dim_modelo.parquet        el modelo por anio con nombres
  salida/agg_factor.parquet        promedios por anio/estamento/programa/factor
  salida/reporte_calidad.md        perfil de calidad

Uso: python etl/harmonizar.py
"""

import re
import sys
import pandas as pd

import config as cfg

RE_FACTOR = re.compile(r"F\s*0*(\d+)", re.IGNORECASE)
RE_CARACT = re.compile(r"C\s*0*(\d+)", re.IGNORECASE)
RE_ASPECTO = re.compile(r"A\s*0*(\d+)", re.IGNORECASE)


def _extraer(regex, texto, prefijo):
    if texto is None:
        return None
    m = regex.search(str(texto))
    return f"{prefijo}{int(m.group(1))}" if m else None


CAMPOS = [
    "anio", "estamento", "programa_norm", "es_multiprograma", "facultad",
    "sede", "ciudad", "genero", "id_encuestado",
    "factor_cod", "caracteristica_cod", "aspecto_cod",
    "factor_nombre", "caracteristica_nombre", "aspecto_nombre",
    "seccion", "codigo_pregunta", "texto_pregunta", "respuesta_texto",
    "valor", "valor_100", "nivel", "fuente",
]


def _mapas_diccionario(ruta, hoja):
    """Mapas (con clave STRING) codigo -> nombre del modelo desde el diccionario.
    Claves: 'F1' (factor), 'F1|C2' (caracteristica), 'F1|C2|A4' (aspecto)."""
    d = pd.read_excel(ruta, sheet_name=hoja, engine="openpyxl")
    d.columns = [str(c).strip().upper() for c in d.columns]

    def fca(cod):
        return (_extraer(RE_FACTOR, cod, "F"),
                _extraer(RE_CARACT, cod, "C"),
                _extraer(RE_ASPECTO, cod, "A"))

    fac, car, asp = {}, {}, {}
    for _, r in d.iterrows():
        f, c, a = fca(r.get("CODIGO"))
        if f and pd.notna(r.get("FACTOR")):
            fac.setdefault(f, cfg.limpiar_nombre(r["FACTOR"]))
        if f and c and pd.notna(r.get("CARACTERISTICA")):
            car.setdefault(f"{f}|{c}", cfg.limpiar_nombre(r["CARACTERISTICA"]))
        if f and c and a and pd.notna(r.get("ASPECTO")):
            asp.setdefault(f"{f}|{c}|{a}", cfg.limpiar_nombre(r["ASPECTO"]))
    return fac, car, asp


def _vect_codigo(existente, fuentes, prefijo):
    """Deriva un codigo tipo 'F1' de forma vectorizada: usa el valor existente y,
    donde falte, lo extrae por regex de las columnas 'fuentes' (Series)."""
    pat = rf"{prefijo}\s*0*(\d+)"
    res = existente.astype("string").str.strip()
    res = res.where(res.notna() & (res != "") & (res.str.lower() != "nan"), pd.NA)
    for fuente in fuentes:
        falta = res.isna()
        if not falta.any():
            break
        num = fuente[falta].astype("string").str.extract(pat, flags=re.IGNORECASE)[0]
        res.loc[falta] = (prefijo + num).where(num.notna(), pd.NA)
    return res


def procesar_anio(anio, adap):
    ruta = cfg.FUENTE_DIR / adap["archivo"]
    print(f"  · {anio}: leyendo {ruta.name} / {adap['hoja']} ...", flush=True)
    df = pd.read_excel(ruta, sheet_name=adap["hoja"], engine="openpyxl")
    df = df.rename(columns=adap["cols"])
    df = df[[c for c in df.columns if c in set(adap["cols"].values())]].copy()

    for campo in ("estamento", "programa", "facultad", "sede", "ciudad",
                  "genero", "id_encuestado", "factor", "caracteristica",
                  "aspecto", "factor_cod", "caracteristica_cod", "aspecto_cod",
                  "codigo_pregunta", "texto_pregunta", "seccion",
                  "respuesta_texto", "valor"):
        if campo not in df.columns:
            df[campo] = None

    df["anio"] = anio
    df["fuente"] = adap["archivo"]
    df["_llave"] = df[adap["llave_codigo"]] if adap.get("llave_codigo") else None

    df["estamento"] = df["estamento"].map(cfg.canonizar_estamento)
    prog = df["programa"].map(cfg.canonizar_programa)
    df["programa_norm"] = prog.map(lambda t: t[0])
    df["es_multiprograma"] = prog.map(lambda t: t[1])

    # codigos F/C/A (vectorizado)
    df["factor_cod"] = _vect_codigo(df["factor_cod"], [df["_llave"], df["factor"]], "F")
    df["caracteristica_cod"] = _vect_codigo(df["caracteristica_cod"], [df["_llave"], df["caracteristica"]], "C")
    df["aspecto_cod"] = _vect_codigo(df["aspecto_cod"], [df["_llave"], df["aspecto"]], "A")

    # nombres del modelo
    if adap.get("diccionario"):
        fac, car, asp = _mapas_diccionario(ruta, adap["diccionario"])
        fc = df["factor_cod"].astype("string")
        cc = df["caracteristica_cod"].astype("string")
        ac = df["aspecto_cod"].astype("string")
        df["factor_nombre"] = fc.map(fac)
        df["caracteristica_nombre"] = (fc + "|" + cc).map(car)
        df["aspecto_nombre"] = (fc + "|" + cc + "|" + ac).map(asp)
    else:
        df["factor_nombre"] = df["factor"].map(cfg.limpiar_nombre)
        df["caracteristica_nombre"] = df["caracteristica"].map(cfg.limpiar_nombre)
        df["aspecto_nombre"] = df["aspecto"].map(cfg.limpiar_nombre)

    # valor / nivel / respuesta verbal
    df["valor_100"] = df["valor"].map(cfg.normalizar_100)
    df["nivel"] = df["valor"].map(cfg.nivel_de)
    sin_verbal = df["respuesta_texto"].isna()
    df.loc[sin_verbal, "respuesta_texto"] = df.loc[sin_verbal, "nivel"].map(cfg.NIVEL_LABEL)

    return df[CAMPOS]


def construir_dim_modelo(hechos):
    cols = ["anio", "factor_cod", "factor_nombre", "caracteristica_cod",
            "caracteristica_nombre", "aspecto_cod", "aspecto_nombre"]
    dim = (hechos[cols].dropna(subset=["factor_cod"])
                       .drop_duplicates()
                       .sort_values(cols).reset_index(drop=True))
    return dim


def construir_agg(hechos):
    g = (hechos.dropna(subset=["valor_100"])
                .groupby(["anio", "estamento", "programa_norm", "factor_cod"], dropna=False)
                .agg(promedio_100=("valor_100", "mean"), n=("valor_100", "size"))
                .reset_index())
    g["promedio_100"] = g["promedio_100"].round(2)
    return g


def reporte_calidad(hechos, dim):
    L = ["# Reporte de calidad — Apreciacion (v2 enriquecida)\n"]
    L.append(f"- Total respuestas: **{len(hechos):,}**")
    L.append(f"- Con respuesta verbal: **{hechos['respuesta_texto'].notna().mean()*100:.0f}%**")
    L.append(f"- Con nombre de factor: **{hechos['factor_nombre'].notna().mean()*100:.0f}%**")
    L.append(f"- Con nombre de caracteristica: **{hechos['caracteristica_nombre'].notna().mean()*100:.0f}%**")
    L.append(f"- Nodos del modelo (anio×factor×caract×aspecto): **{len(dim):,}**")
    L.append("\n## Distribucion de niveles (global)")
    dist = hechos.dropna(subset=["nivel"]).groupby("nivel").size()
    dist.index = [cfg.NIVEL_LABEL[i] for i in dist.index]
    L.append(dist.to_frame("n").to_markdown())
    L.append("\n## Cortes disponibles por anio (valores distintos)")
    piv = hechos.groupby("anio").agg(
        programas=("programa_norm", "nunique"), sedes=("sede", "nunique"),
        ciudades=("ciudad", "nunique"), generos=("genero", "nunique"),
        estamentos=("estamento", "nunique"), factores=("factor_cod", "nunique"))
    L.append(piv.to_markdown())
    return "\n".join(L)


def main():
    cfg.SALIDA_DIR.mkdir(exist_ok=True)
    hechos = pd.concat([procesar_anio(a, ad) for a, ad in cfg.ADAPTADORES.items()],
                       ignore_index=True)
    dim = construir_dim_modelo(hechos)
    agg = construir_agg(hechos)

    hechos.to_parquet(cfg.SALIDA_DIR / "hecho_respuesta.parquet", index=False)
    dim.to_parquet(cfg.SALIDA_DIR / "dim_modelo.parquet", index=False)
    agg.to_parquet(cfg.SALIDA_DIR / "agg_factor.parquet", index=False)

    rep = reporte_calidad(hechos, dim)
    (cfg.SALIDA_DIR / "reporte_calidad.md").write_text(rep, encoding="utf-8")
    print(f"\nOK. hechos={len(hechos):,}  dim_modelo={len(dim):,}  agg={len(agg):,}")
    print("\n" + rep)


if __name__ == "__main__":
    sys.exit(main())
