"""Logica de Apreciacion (v3) — replica los tableros originales del Excel.

Dos vistas, como en las hojas Dash_20XX y Dash_Comparativo:
  - tablero(anio):     KPIs en ESCALA NATIVA (2016: 1-5; 2020+: 2-10),
                       promedio por factor y matriz Factor x Estamento.
  - comparativo(anio): mapa de calor Factor x Programa normalizado 0-100
                       (1-5 x20, 2-10 x10) con Institucional y Brecha.

Todo se sirve desde public.agg_factor (promedio nativo por
anio/estamento/programa/factor). Los conteos de encuestados salen de hecho_*.
"""

from functools import lru_cache
from collections import defaultdict

from sqlalchemy import text
from .db import get_engine

SCHEMA = "public"
ESCALA_MAX = {2016: 5, 2020: 10, 2022: 10, 2025: 10}
ANIOS_HECHO = (2020, 2022, 2025)
TODOS = "(todos)"   # sentinela en agg_encuestados (dimension agregada)

# ---------------------------------------------------------------------------
# Crosswalk canonico de FACTORES entre modelos (validado con el usuario).
# El modelo de acreditacion cambio entre anios y el mismo codigo Fx significa
# cosas distintas cada anio. Aqui se homologa cada (anio, factor_cod) al
# MODELO ACTUAL (CNA 2025), cuya numeracion F1..F12 es el estandar canonico.
# Permite mostrar la evolucion de un factor a traves de los anios.
CANON_FACTOR = {
    "F1":  "Identidad institucional",
    "F2":  "Gobierno institucional y transparencia",
    "F3":  "Desarrollo, gestión y sostenibilidad institucional",
    "F4":  "Mejoramiento continuo y autorregulación",
    "F5":  "Estructura y procesos académicos",
    "F6":  "Aportes de la investigación, la innovación, el desarrollo tecnológico y la creación",
    "F7":  "Impacto social",
    "F8":  "Visibilidad nacional e internacional",
    "F9":  "Bienestar institucional",
    "F10": "Comunidad de profesores",
    "F11": "Comunidad de estudiantes",
    "F12": "Comunidad de egresados",
}
CANON_EVOL = {
    "F1":  "Reformulado (Misión/PEI → Identidad institucional)",
    "F2":  "Escisión de «Organización, administración y gestión»",
    "F3":  "Fusión de organización/gestión + recursos físicos y financieros",
    "F4":  "Nuevo en el modelo actual (2025)",
    "F5":  "Reformulado (Procesos académicos → Estructura y procesos)",
    "F6":  "Nuevo desde 2020 (investigación e innovación)",
    "F7":  "Reformulado/fusión (Impacto egresados + Interacción con el entorno)",
    "F8":  "Sin respuestas en 2025",
    "F9":  "Se mantiene (renumerado F7 → F9)",
    "F10": "Reformulado (Profesores → Comunidad de profesores)",
    "F11": "Reformulado (Estudiantes → Comunidad de estudiantes)",
    "F12": "Reformulado (Impacto/Egresados → Comunidad de egresados)",
}
# (anio, factor_cod_de_ese_anio) -> factor_cod canonico (modelo 2025).
CROSSWALK = {
    2016: {"F1": "F1", "F2": "F11", "F3": "F10", "F4": "F5",
           "F7": "F9", "F8": "F2", "F9": "F12", "F10": "F3"},
    2020: {"F1": "F1", "F2": "F11", "F3": "F10", "F4": "F5", "F6": "F6",
           "F7": "F9", "F8": "F2", "F10": "F3"},
    2022: {"F1": "F1", "F2": "F11", "F3": "F10", "F4": "F12", "F5": "F5",
           "F6": "F5", "F7": "F7", "F9": "F7", "F10": "F3", "F11": "F2", "F12": "F3"},
    2025: {f"F{i}": f"F{i}" for i in range(1, 13)},
}
CANON_ORDEN = [f"F{i}" for i in range(1, 13)]

# Crosswalk de CARACTERISTICAS: solo linajes REALES (mismo item en >=2 anios,
# detectado por coincidencia de nombre y validado). La mayoria de
# caracteristicas son propias de un anio (el modelo se rehizo cada ciclo) y NO
# se homologan: se muestran como punto de su anio. Clave (anio, factor_cod del
# anio, caracteristica_cod) -> id de linaje.
LINAJE_NOMBRE = {
    "L_relevancia": "Relevancia académica y pertinencia social del programa",
    "L_organizacion": "Organización, administración y gestión",
    "L_comunicacion": "Sistemas de comunicación e información",
    "L_infraestructura": "Infraestructura física y tecnológica",
    "L_sist_eval": "Sistema de evaluación de estudiantes",
    "L_trabajos_est": "Trabajos de los estudiantes",
    "L_autorregulacion": "Evaluación y autorregulación del programa académico",
    "L_desarrollo_prof": "Desarrollo profesoral",
    "L_trayectoria": "Estímulos / Trayectoria profesoral",
    "L_numero_prof": "Número, dedicación, nivel de formación y experiencia",
    "L_produccion_doc": "Producción, pertinencia e impacto de material docente",
    "L_remuneracion": "Remuneración por méritos",
    "L_eval_prof": "Evaluación de profesores",
    "L_seleccion_prof": "Selección, vinculación y permanencia de profesores",
    "L_estatuto_prof": "Estatuto profesoral",
    "L_participacion_est": "Participación en actividades de formación integral",
}
CARACT_LINAJE = {
    (2020, "F1", "C3"): "L_relevancia",   (2022, "F1", "C2"): "L_relevancia",
    (2020, "F8", "C33"): "L_organizacion", (2022, "F11", "C41"): "L_organizacion",
    (2020, "F8", "C34"): "L_comunicacion", (2022, "F11", "C43"): "L_comunicacion",
    (2022, "F12", "C47"): "L_infraestructura", (2025, "F3", "C11"): "L_infraestructura",
    (2020, "F4", "C20"): "L_sist_eval",   (2022, "F5", "C22"): "L_sist_eval",
    (2020, "F4", "C21"): "L_trabajos_est", (2022, "F5", "C21"): "L_trabajos_est",
    (2020, "F4", "C22"): "L_autorregulacion", (2022, "F5", "C25"): "L_autorregulacion",
    (2020, "F3", "C11"): "L_desarrollo_prof", (2022, "F3", "C11"): "L_desarrollo_prof", (2025, "F10", "C31"): "L_desarrollo_prof",
    (2020, "F3", "C12"): "L_trayectoria", (2022, "F3", "C12"): "L_trayectoria", (2025, "F10", "C30"): "L_trayectoria",
    (2020, "F3", "C10"): "L_numero_prof", (2022, "F3", "C10"): "L_numero_prof",
    (2020, "F3", "C13"): "L_produccion_doc", (2022, "F3", "C13"): "L_produccion_doc",
    (2020, "F3", "C14"): "L_remuneracion", (2022, "F3", "C14"): "L_remuneracion",
    (2020, "F3", "C15"): "L_eval_prof", (2022, "F3", "C15"): "L_eval_prof",
    (2020, "F3", "C8"): "L_seleccion_prof", (2022, "F3", "C8"): "L_seleccion_prof",
    (2020, "F3", "C9"): "L_estatuto_prof", (2022, "F3", "C9"): "L_estatuto_prof",
    (2020, "F2", "C6"): "L_participacion_est", (2022, "F2", "C3"): "L_participacion_est",
}


def _label(anio):
    return "1–5" if ESCALA_MAX.get(anio) == 5 else "2–10"


def _rows(sql, **p):
    with get_engine().connect() as con:
        return _rows_con(con, sql, **p)


def _rows_con(con, sql, **p):
    """Ejecuta una consulta sobre una conexion ya abierta (evita reabrir
    conexion + pre_ping por cada consulta: menos viajes al pooler remoto)."""
    res = con.execute(text(sql), p)
    cols = res.keys()
    return [dict(zip(cols, r)) for r in res.fetchall()]


def _cond(estamento=None, programa=None, base=None):
    """Condicion SQL reutilizable (columnas estamento / programa_norm).

    base: segmentador grueso para 2016 (dos fuentes: institucional vs programas).
      'institucional' -> solo el grupo INSTITUCIONAL
      'programas'     -> solo los programas academicos (excluye INSTITUCIONAL/MULTIPLE)
    Un `programa` explicito tiene prioridad sobre `base`.
    """
    parts, params = [], {}
    if estamento:
        parts.append("estamento = :est"); params["est"] = estamento
    if programa:
        parts.append("programa_norm = :prog"); params["prog"] = programa
    elif base == "institucional":
        parts.append("programa_norm = 'INSTITUCIONAL'")
    elif base == "programas":
        parts.append("programa_norm NOT IN ('INSTITUCIONAL','MULTIPLE')")
    return ("".join(f" AND {p}" for p in parts), params)


def anios():
    return [r["anio"] for r in _rows(
        "SELECT DISTINCT anio FROM public.agg_factor ORDER BY anio")]


def filtros(anio):
    est = [r["estamento"] for r in _rows(
        "SELECT DISTINCT estamento FROM public.agg_factor "
        "WHERE anio=:a AND estamento<>'Sin dato' ORDER BY estamento", a=anio)]
    prog = [r["programa_norm"] for r in _rows(
        "SELECT DISTINCT programa_norm FROM public.agg_factor "
        "WHERE anio=:a AND programa_norm<>'INSTITUCIONAL' ORDER BY programa_norm", a=anio)]
    return {"estamento": est, "programa": prog}


def _encuestados(con, anio, estamento=None, programa=None, base=None):
    """Lee el conteo EXACTO de encuestados de agg_encuestados (precalculado).
    Cubre los 4 estados de filtro simples. Devuelve None si no aplica (2016,
    o 2022 sin IDs, o el estado 'todos los programas' que no se precalcula)."""
    if anio not in ANIOS_HECHO:
        return None
    est_key = estamento or TODOS
    if programa:
        prog_key = programa
    elif base == "institucional":
        prog_key = "INSTITUCIONAL"
    elif base == "programas":
        return None   # 'todos los programas juntos' no es un conteo aditivo
    else:
        prog_key = TODOS
    rows = _rows_con(con,
        "SELECT n_encuestados n FROM public.agg_encuestados "
        "WHERE anio=:a AND estamento=:e AND programa_norm=:p",
        a=anio, e=est_key, p=prog_key)
    return (rows[0]["n"] or None) if rows else None   # 0 -> n/d


def _pond(rows, campo, dec=2):
    """Promedio ponderado por n de `campo` sobre una lista de filas de agg_factor."""
    s = sum(float(r[campo]) * r["n"] for r in rows if r[campo] is not None)
    tot = sum(r["n"] for r in rows if r[campo] is not None)
    return round(s / tot, dec) if tot else None


def tablero(anio, estamento=None, programa=None, base=None):
    """Wrapper cacheado. Los datos solo cambian al recargar el ETL, asi que
    memorizamos la respuesta por (anio, filtros): la primera carga paga la
    conexion a Supabase, las siguientes son instantaneas. Usar precalentar()
    al iniciar el server para que incluso la primera navegacion sea rapida."""
    return _tablero(anio, estamento or None, programa or None, base or None)


@lru_cache(maxsize=256)
def _tablero(anio, estamento=None, programa=None, base=None):
    """Todo el tablero se resuelve en UNA sola conexion con 3 consultas:
    (1) el corte de agg_factor -> se agrega en Python (KPIs, factor, estamento,
    matriz); (2) distribucion precalculada; (3) encuestados precalculado.
    Antes eran ~6 consultas + un count(distinct) de 11 s sobre hecho_*."""
    cond, params = _cond(estamento, programa, base)
    params["a"] = anio
    NIV = {1: "Muy bajo", 2: "Bajo", 3: "Aceptable", 4: "Favorable", 5: "Muy favorable"}

    with get_engine().connect() as con:
        af = _rows_con(con,
            f"SELECT factor_cod, factor_nombre, estamento, programa_norm, "
            f"promedio, pct_fav, n FROM public.agg_factor WHERE anio=:a{cond}",
            **params)
        encuestados = _encuestados(con, anio, estamento, programa, base)
        distribucion = None
        facultades = None
        if anio in ANIOS_HECHO:
            dist_rows = _rows_con(con,
                f"SELECT nivel, sum(n) n FROM public.agg_distribucion "
                f"WHERE anio=:a{cond} GROUP BY nivel ORDER BY nivel", **params)
            distribucion = [{"nivel": r["nivel"], "label": NIV.get(r["nivel"]), "n": r["n"]}
                            for r in dist_rows]
            # nº de facultades con datos (hecho_* tiene columna facultad; 2016 no)
            fac_rows = _rows_con(con,
                f"SELECT count(DISTINCT facultad) c FROM public.hecho_{anio} "
                f"WHERE facultad IS NOT NULL AND lower(facultad) NOT IN ('nan','none',''){cond}",
                **params)
            facultades = fac_rows[0]["c"] or None if fac_rows else None

    # ---- agregacion en Python del corte agg_factor ------------------------
    by_factor, by_est, cel = {}, {}, {}
    for r in af:
        by_factor.setdefault(r["factor_cod"], []).append(r)
        by_est.setdefault(r["estamento"], []).append(r)
        cel.setdefault((r["factor_cod"], r["estamento"]), []).append(r)

    fnom = {}
    for r in af:
        fnom.setdefault(r["factor_cod"], r["factor_nombre"])

    por_factor = [{
        "cod": f, "nombre": fnom.get(f),
        "promedio": _pond(rs, "promedio"), "pct_fav": _pond(rs, "pct_fav", 1),
        "n": sum(x["n"] for x in rs),
    } for f, rs in sorted(by_factor.items())]

    por_estamento = sorted([{
        "nombre": e, "promedio": _pond(rs, "promedio"),
        "pct_fav": _pond(rs, "pct_fav", 1), "n": sum(x["n"] for x in rs),
    } for e, rs in by_est.items()], key=lambda x: (x["promedio"] or 0), reverse=True)

    estamentos = sorted(by_est)
    matriz = {}
    for (f, e), rs in cel.items():
        matriz.setdefault(f, {})[e] = _pond(rs, "promedio")

    total_n = sum(r["n"] for r in af)
    prom_gen = _pond(af, "promedio")
    fav_gen = _pond(af, "pct_fav")
    n_programas = len({r["programa_norm"] for r in af if r["programa_norm"] != "INSTITUCIONAL"})

    kpi = {"promedio": prom_gen, "pct_fav": round(fav_gen, 1) if fav_gen is not None else None,
           "n": total_n, "factores": len(by_factor), "programas": n_programas}

    return {
        "anio": anio, "escala": _label(anio), "escala_max": ESCALA_MAX.get(anio, 10),
        "kpis": {
            "promedio": kpi["promedio"], "pct_fav": kpi["pct_fav"],
            "n_respuestas": kpi["n"], "encuestados": encuestados,
            "factores": kpi["factores"], "programas": kpi["programas"] or None,
            "estamentos": len(by_est) or None,
            "facultades": facultades,
            "usuarios_por_programa": round(encuestados / kpi["programas"], 1)
                if encuestados and kpi["programas"] else None,
        },
        "por_factor": por_factor,
        "por_estamento": por_estamento,
        "distribucion": distribucion,
        "estamentos": estamentos,
        "matriz_factor_estamento": matriz,
    }


def comparativo(anio, estamento=None):
    return _comparativo(anio, estamento or None)


@lru_cache(maxsize=128)
def _comparativo(anio, estamento=None):
    """Factor x Programa normalizado 0-100 (convencion del tablero) con brecha
    frente al Institucional (= promedio ponderado de todos los programas)."""
    emax = ESCALA_MAX.get(anio, 10)
    factor_100 = f"round(promedio_pond * (100.0/{emax}), 1)"
    cond, params = _cond(estamento)
    params["a"] = anio

    # promedio por factor x programa (excluye INSTITUCIONAL como columna aparte)
    fp = _rows(
        f"SELECT factor_cod, max(factor_nombre) nombre, programa_norm, "
        f"sum(promedio*n)/nullif(sum(n),0) promedio_pond, sum(n) n "
        f"FROM public.agg_factor WHERE anio=:a{cond} "
        f"GROUP BY factor_cod, programa_norm", **params)

    # institucional por factor = respondentes SIN programa (grupo INSTITUCIONAL),
    # el punto de referencia del tablero. Si un factor no tiene ese grupo -> None.
    inst = {}
    acc = {}
    for r in fp:
        if r["programa_norm"] != "INSTITUCIONAL":
            continue
        f = r["factor_cod"]
        acc.setdefault(f, [0.0, 0])
        acc[f][0] += float(r["promedio_pond"]) * r["n"]
        acc[f][1] += r["n"]
    for f, (s, n) in acc.items():
        inst[f] = round((s / n) * (100.0 / emax), 1) if n else None

    EXCLUIR = ("INSTITUCIONAL", "MULTIPLE")
    programas = sorted({r["programa_norm"] for r in fp if r["programa_norm"] not in EXCLUIR})
    factores = []
    fnames = {}
    matriz = {}
    for r in fp:
        if r["programa_norm"] in EXCLUIR:
            continue
        f = r["factor_cod"]; fnames[f] = r["nombre"]
        matriz.setdefault(f, {})[r["programa_norm"]] = round(
            float(r["promedio_pond"]) * (100.0 / emax), 1)
    for f in sorted(matriz):
        factores.append({"cod": f, "nombre": fnames.get(f), "institucional": inst.get(f),
                         "valores": matriz[f]})

    # KPIs del comparativo
    prom_prog = [v for f in matriz.values() for v in f.values()]
    inst_vals = [v for v in inst.values() if v is not None]
    prom_prog_avg = round(sum(prom_prog) / len(prom_prog), 1) if prom_prog else None
    inst_avg = round(sum(inst_vals) / len(inst_vals), 1) if inst_vals else None
    # factor mas divergente (mayor brecha |prog_avg - inst| por factor)
    div = None
    for fr in factores:
        vals = list(fr["valores"].values())
        if not vals or fr["institucional"] is None:
            continue
        brecha = sum(vals) / len(vals) - fr["institucional"]
        if div is None or abs(brecha) > abs(div[1]):
            div = (fr["nombre"] or fr["cod"], round(brecha, 1))
    # mejor programa (mayor promedio a lo largo de factores)
    prog_avg = {}
    for f in matriz.values():
        for prog, v in f.items():
            prog_avg.setdefault(prog, []).append(v)
    mejor = max(((p, sum(vs)/len(vs)) for p, vs in prog_avg.items()),
               key=lambda x: x[1], default=(None, None))

    return {
        "anio": anio, "escala": _label(anio),
        "kpis": {
            "institucional": inst_avg, "prom_programas": prom_prog_avg,
            "brecha": round((prom_prog_avg - inst_avg), 1) if (prom_prog_avg and inst_avg) else None,
            "mejor_programa": mejor[0], "factor_divergente": div[0] if div else None,
            "n_programas": len(programas),
        },
        "programas": programas,
        "factores": factores,
    }


def historico():
    return _historico()


@lru_cache(maxsize=1)
def _historico():
    """Evolucion a traves de los anios, todo normalizado 0-100 (escala nativa
    x 100/escala_max), para comparar entre escalas distintas (2016 1-5, resto
    2-10). Devuelve:
      - factores:   los 12 factores CANONICOS (modelo actual) con su valor por
                    anio y el nombre que tenian ese anio (via CROSSWALK).
      - estamentos: valor global por estamento y anio (nucleo comparable).
    El valor de un factor/estamento en un anio = promedio ponderado por n de
    valor_100 sobre todas las filas de agg_factor que le corresponden."""
    rows = _rows(
        "SELECT anio, estamento, factor_cod, factor_nombre, promedio, n, "
        "escala_max FROM public.agg_factor")

    anios_set = set()
    fac_acc = defaultdict(lambda: [0.0, 0])     # (canon, anio) -> [sum(v100*n), sum n]
    fac_nom = defaultdict(dict)                  # (canon, anio) -> {factor_cod_orig: nombre}
    est_acc = defaultdict(lambda: [0.0, 0])     # (estamento, anio) -> [sum(v100*n), sum n]

    for r in rows:
        anio = r["anio"]
        if r["promedio"] is None or not r["n"]:
            continue
        anios_set.add(anio)
        emax = r["escala_max"] or ESCALA_MAX.get(anio, 10)
        v100 = float(r["promedio"]) * 100.0 / emax
        n = r["n"]
        canon = CROSSWALK.get(anio, {}).get(r["factor_cod"])
        if canon:
            fac_acc[(canon, anio)][0] += v100 * n
            fac_acc[(canon, anio)][1] += n
            fac_nom[(canon, anio)][r["factor_cod"]] = r["factor_nombre"]
        est = r["estamento"]
        if est and est != "Sin dato":
            est_acc[(est, anio)][0] += v100 * n
            est_acc[(est, anio)][1] += n

    anios = sorted(anios_set)

    def _avg(acc):
        s, n = acc
        return round(s / n, 1) if n else None

    factores = []
    for canon in CANON_ORDEN:
        valores, celdas = {}, {}
        for a in anios:
            key = (canon, a)
            valores[a] = _avg(fac_acc[key]) if key in fac_acc else None
            if key in fac_nom:
                # nombre(s) que tenia ese factor canonico en ese anio
                partes = sorted(f"{c}: {n}" for c, n in fac_nom[key].items())
                celdas[a] = " | ".join(partes)
            else:
                celdas[a] = None
        factores.append({
            "cod": canon, "nombre": CANON_FACTOR[canon], "evol": CANON_EVOL[canon],
            "valores": valores, "celdas": celdas,
        })

    # estamentos: incluir todos, ordenados por nº de anios con dato (desc)
    est_nombres = sorted({e for (e, _a) in est_acc})
    estamentos = []
    for e in est_nombres:
        valores = {a: (_avg(est_acc[(e, a)]) if (e, a) in est_acc else None) for a in anios}
        estamentos.append({"nombre": e, "valores": valores,
                           "n_anios": sum(1 for a in anios if valores[a] is not None)})
    estamentos.sort(key=lambda x: (-x["n_anios"], x["nombre"]))

    return {"anios": anios, "factores": factores, "estamentos": estamentos}


def historico_caracteristicas():
    return _historico_caracteristicas()


@lru_cache(maxsize=1)
def _historico_caracteristicas():
    """Evolucion de CARACTERISTICAS por factor canonico (2020/2022/2025; 2016 no
    tiene caracteristicas). Valor 0-100 = promedio de valor_100 de esa
    caracteristica ese anio (desde hecho_*). Las que tienen linaje real
    (CARACT_LINAJE) se conectan entre anios; el resto es punto de su anio."""
    data = {}   # canon -> { key: {nombre, linaje, valores{anio:v}} }
    for a in ANIOS_HECHO:
        rows = _rows(
            f"SELECT factor_cod, caracteristica_cod, max(caracteristica_nombre) nom, "
            f"sum(valor_100)/nullif(count(*),0) v FROM public.hecho_{a} "
            f"WHERE caracteristica_cod IS NOT NULL AND valor_100 IS NOT NULL "
            f"GROUP BY factor_cod, caracteristica_cod")
        for r in rows:
            canon = CROSSWALK.get(a, {}).get(r["factor_cod"])
            if not canon or r["v"] is None:
                continue
            lk = CARACT_LINAJE.get((a, r["factor_cod"], r["caracteristica_cod"]))
            if lk:
                key, nombre, linaje = lk, LINAJE_NOMBRE[lk], True
            else:
                key = f"{a}:{r['factor_cod']}:{r['caracteristica_cod']}"
                nombre, linaje = r["nom"], False
            slot = data.setdefault(canon, {}).setdefault(
                key, {"nombre": nombre, "linaje": linaje, "valores": {}})
            slot["valores"][a] = round(float(r["v"]), 1)

    factores = []
    for canon in CANON_ORDEN:
        cs = data.get(canon, {})
        items = [{"id": k, "nombre": v["nombre"], "linaje": v["linaje"],
                  "valores": v["valores"], "n_anios": len(v["valores"])}
                 for k, v in cs.items()]
        # linajes primero (mas años), luego propias de un año
        items.sort(key=lambda x: (not x["linaje"], -x["n_anios"], x["nombre"]))
        factores.append({"cod": canon, "nombre": CANON_FACTOR[canon],
                         "n_linajes": sum(1 for i in items if i["linaje"]),
                         "caracteristicas": items})
    return {"anios": list(ANIOS_HECHO), "factores": factores}


def instrumento_2025():
    return _instrumento_2025()


def _num(cod):
    """Nº incrustado en un código (F10 -> 10, C3 -> 3, A4 -> 4) para ordenar."""
    import re
    m = re.search(r"\d+", cod or "")
    return int(m.group()) if m else 999


@lru_cache(maxsize=1)
def _instrumento_2025():
    """Árbol del instrumento 2025: Factor → Característica → Aspecto → Pregunta,
    con puntaje 0-100, %favorable (nivel>=4) y n en cada nivel, y el desglose de
    estamentos que respondió cada pregunta. Solo 2025 (hecho_2025 tiene el texto
    de la pregunta; codigo_pregunta viene vacío)."""
    rows = _rows(
        "SELECT factor_cod, max(factor_nombre) fnom, caracteristica_cod, "
        "max(caracteristica_nombre) cnom, aspecto_cod, max(seccion) snom, "
        "texto_pregunta, estamento, avg(valor_100) v, "
        "100.0*sum(CASE WHEN nivel>=4 THEN 1 ELSE 0 END)/count(*) fav, count(*) n "
        "FROM public.hecho_2025 "
        "WHERE valor_100 IS NOT NULL AND texto_pregunta IS NOT NULL "
        "GROUP BY factor_cod, caracteristica_cod, aspecto_cod, texto_pregunta, estamento")

    # tree[f][c][a][pregunta] = [filas por estamento]
    tree, nom = {}, {}
    for r in rows:
        f, c, a, p = r["factor_cod"], r["caracteristica_cod"], r["aspecto_cod"], r["texto_pregunta"]
        tree.setdefault(f, {}).setdefault(c, {}).setdefault(a, {}).setdefault(p, []).append(r)
        nom[("f", f)] = r["fnom"]; nom[("c", f, c)] = r["cnom"]; nom[("a", f, c, a)] = r["snom"]

    def roll(items):
        """(promedio 0-100, %fav, n) ponderado por n de una lista de filas/nodos."""
        tot = sum(x["n"] for x in items)
        if not tot:
            return None, None, 0
        v = sum(x["v"] * x["n"] for x in items) / tot
        fav = sum(x["fav"] * x["n"] for x in items) / tot
        return round(v, 1), round(fav, 1), tot

    factores = []
    for f in sorted(tree, key=_num):
        cars = []
        for c in sorted(tree[f], key=_num):
            asps = []
            for a in sorted(tree[f][c], key=_num):
                pregs = []
                for p, filas in tree[f][c][a].items():
                    ests = sorted(({"nombre": x["estamento"], "promedio": round(x["v"], 1),
                                    "n": x["n"]} for x in filas),
                                  key=lambda e: -e["n"])
                    pv, pfav, pn = roll(filas)
                    pregs.append({"texto": p, "promedio": pv, "pct_fav": pfav,
                                  "n": pn, "estamentos": ests})
                pregs.sort(key=lambda x: -(x["promedio"] or 0))
                av, afav, an = roll([{"v": q["promedio"], "fav": q["pct_fav"], "n": q["n"]} for q in pregs])
                asps.append({"cod": a, "nombre": nom.get(("a", f, c, a)) or a,
                             "promedio": av, "pct_fav": afav, "n": an, "preguntas": pregs})
            cv, cfav, cn = roll([{"v": x["promedio"], "fav": x["pct_fav"], "n": x["n"]} for x in asps])
            cars.append({"cod": c, "nombre": nom.get(("c", f, c)) or c,
                         "promedio": cv, "pct_fav": cfav, "n": cn, "aspectos": asps})
        fv, ffav, fn = roll([{"v": x["promedio"], "fav": x["pct_fav"], "n": x["n"]} for x in cars])
        factores.append({"cod": f, "nombre": nom.get(("f", f)) or f,
                         "promedio": fv, "pct_fav": ffav, "n": fn, "caracteristicas": cars})

    # OJO: hay ITEMS que no son preguntas independientes sino opciones de una
    # matriz (textos cortos como "Su Calidad"), y algunos textos se repiten bajo
    # >1 aspecto. Reportamos ITEMS DISTINTOS (no nodos del arbol) para no inflar.
    textos = {a2["texto"] for f in factores for c in f["caracteristicas"]
              for a in c["aspectos"] for a2 in a["preguntas"]}
    n_nodos = sum(len(a["preguntas"]) for f in factores for c in f["caracteristicas"] for a in c["aspectos"])
    return {"anio": 2025, "n_items": len(textos), "n_nodos": n_nodos, "factores": factores}


def cobertura():
    return _cobertura()


def _cobertura_2016():
    """Lee las DOS bases 2016 del Excel (institucional + programas) — el 2016 no
    está en la BD (solo agregado a nivel de factor). Devuelve por factor canónico
    las características (deduplicadas por nombre, difuso, porque las dos bases las
    redactan distinto) y el nº de preguntas (unión de ambos cuestionarios)."""
    import re
    import unicodedata
    from pathlib import Path
    import openpyxl

    base = Path(__file__).resolve().parents[2] / "Fuente" / "2016"
    files = [base / "base_unificada_normalizada_Autoevaluacion__institucional_ETITC_2016.xlsx",
             base / "base_unificada_normalizada_Autoevaluacion_Programas_ETITC_2016.xlsx"]

    def toks(s):
        s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower()
        return set(w for w in re.sub(r"[^a-z0-9 ]", " ", s).split() if len(w) > 3)

    def leadnum(s):
        m = re.match(r"\s*(\d+)", str(s or ""))
        return int(m.group(1)) if m else None

    car_raw, preg = defaultdict(list), defaultdict(set)
    for f in files:
        if not f.exists():
            continue
        wb = openpyxl.load_workbook(f, read_only=True, data_only=True)
        ws = wb["Resultados_Preguntas"]
        rows = list(ws.iter_rows(values_only=True))
        hdr = [str(c) if c is not None else "" for c in rows[0]]

        def ci(name):
            for i, h in enumerate(hdr):
                if name.lower() in h.lower():
                    return i
            return None

        i_f, i_cn, i_c = ci("Factor"), ci("Nombre de la Caracter"), ci("Caracter")
        i_p, i_t = ci("Pregunta"), ci("Tipo de fila")
        for r in rows[1:]:
            if i_t is not None and r[i_t] and "pregunta" not in str(r[i_t]).lower():
                continue
            fn = leadnum(r[i_f]) if i_f is not None else None
            canon = CROSSWALK.get(2016, {}).get(f"F{fn}") if fn else None
            if not canon:
                continue
            cname = r[i_cn] if i_cn is not None else (r[i_c] if i_c is not None else None)
            if cname:
                car_raw[canon].append(str(cname).strip())
            if i_p is not None and r[i_p]:
                preg[canon].add(re.sub(r"\s+", " ", str(r[i_p]).strip().lower()))
        wb.close()

    def dedupe(names):
        uniq = []
        for nm in names:
            t = toks(nm)
            if not t:
                continue
            if any((len(t & u[0]) / len(t | u[0]) >= 0.6) or t <= u[0] or u[0] <= t for u in uniq):
                continue
            uniq.append((t, nm))
        return [u[1] for u in uniq]

    return {"car": {c: dedupe(v) for c, v in car_raw.items()},
            "preg": {c: len(v) for c, v in preg.items()}}


@lru_cache(maxsize=1)
def _cobertura():
    """Cobertura del instrumento por año (2016/20/22/25):
      - caracteristicas: nº por factor y año + cuáles son (nombres).
      - preguntas: nº por factor canónico y año.
    2020/22/25 salen de hecho_*; 2016 se lee de las dos bases del Excel (no está
    en la BD). Mide cómo cambia la profundidad del instrumento; NO es seguimiento
    de un ítem en el tiempo (los ítems no tienen identidad entre años)."""
    anios = [2016] + list(ANIOS_HECHO)  # 2016 se lee del Excel; el resto de la BD
    d16 = _cobertura_2016()

    # --- características por año (2020/22/25 desde hecho) ---
    car_lista, car_conteo = {}, {}
    for a in ANIOS_HECHO:
        rows = _rows(
            f"SELECT factor_cod, caracteristica_cod, max(caracteristica_nombre) nom, "
            f"avg(valor_100) v FROM public.hecho_{a} WHERE caracteristica_cod IS NOT NULL "
            f"GROUP BY factor_cod, caracteristica_cod")
        lst = []
        for r in rows:
            canon = CROSSWALK.get(a, {}).get(r["factor_cod"])
            lst.append({"cod": r["caracteristica_cod"], "nombre": r["nom"],
                        "factor": canon, "factor_nombre": CANON_FACTOR.get(canon, ""),
                        "promedio": round(float(r["v"]), 1) if r["v"] is not None else None})
        lst.sort(key=lambda x: (_num(x["factor"] or "F99"), x["cod"]))
        car_lista[a] = lst
        car_conteo[a] = len(lst)

    # características por factor canónico y año (+ nombres, para ver cuáles son)
    c_conteo, c_nombres = {}, {}
    for a in ANIOS_HECHO:
        for it in car_lista[a]:
            canon = it["factor"]
            if not canon:
                continue
            c_conteo.setdefault(canon, {}).setdefault(a, 0)
            c_conteo[canon][a] += 1
            c_nombres.setdefault(canon, {}).setdefault(a, []).append(it["nombre"])
    # fusionar 2016 (leído del Excel)
    for canon, nombres in d16["car"].items():
        c_conteo.setdefault(canon, {})[2016] = len(nombres)
        c_nombres.setdefault(canon, {})[2016] = nombres
    car_conteo[2016] = sum(len(n) for n in d16["car"].values())
    car_por_factor = []
    for canon in CANON_ORDEN:
        if canon not in c_conteo:
            continue
        car_por_factor.append({
            "cod": canon, "nombre": CANON_FACTOR[canon],
            "conteo": {a: c_conteo[canon].get(a, 0) for a in anios},
            "total": sum(c_conteo[canon].values()),
            "nombres": {a: c_nombres[canon].get(a, []) for a in anios},
        })

    # --- preguntas por factor canónico y año (+ detalle de cuáles) ---
    conteo = {}   # canon -> {anio: n}
    detalle = {}  # canon -> {anio: [{etq, v}]}
    for a, col in ((2020, "codigo_pregunta"), (2022, "codigo_pregunta"), (2025, "texto_pregunta")):
        rows = _rows(
            f"SELECT factor_cod, {col} etq, avg(valor_100) v, count(*) n FROM public.hecho_{a} "
            f"WHERE {col} IS NOT NULL GROUP BY factor_cod, {col}")
        for r in rows:
            canon = CROSSWALK.get(a, {}).get(r["factor_cod"])
            if not canon:
                continue
            conteo.setdefault(canon, {}).setdefault(a, 0)
            conteo[canon][a] += 1
            detalle.setdefault(canon, {}).setdefault(a, []).append(
                {"etq": r["etq"], "v": round(float(r["v"]), 1) if r["v"] is not None else None})

    for canon in detalle:
        for a in detalle[canon]:
            detalle[canon][a].sort(key=lambda x: -(x["v"] or 0))

    # fusionar 2016 (nº de preguntas, unión de las dos bases del Excel)
    for canon, n in d16["preg"].items():
        conteo.setdefault(canon, {})[2016] = n

    por_factor = []
    for canon in CANON_ORDEN:
        if canon not in conteo:
            continue
        por_factor.append({
            "cod": canon, "nombre": CANON_FACTOR[canon],
            "conteo": {a: conteo[canon].get(a, 0) for a in anios},
            "total": sum(conteo[canon].values()),
        })

    return {
        "anios": anios,
        "caracteristicas": {"conteo": car_conteo, "por_factor": car_por_factor, "lista": car_lista},
        "preguntas": {"por_factor": por_factor, "detalle": detalle},
    }


def limpiar_cache():
    """Vaciar tras recargar el ETL para que se relea de la BD."""
    _tablero.cache_clear()
    _comparativo.cache_clear()
    _historico.cache_clear()
    _historico_caracteristicas.cache_clear()
    _instrumento_2025.cache_clear()
    _cobertura.cache_clear()


def precalentar():
    """Precarga en cache las vistas mas comunes (cada anio sin filtros) para que
    la primera navegacion del usuario sea instantanea, sin pagar la conexion a
    Supabase en vivo. Se llama al iniciar el server (evento startup)."""
    for a in anios():
        try:
            tablero(a)
            comparativo(a)
        except Exception:
            pass   # si un anio falla, no bloquea el arranque
    try:
        historico()
        historico_caracteristicas()
        instrumento_2025()
        cobertura()
    except Exception:
        pass


def health():
    with get_engine().connect() as con:
        con.execute(text("SELECT 1"))
    return {"status": "ok", "fuente": "postgres (supabase, nube)"}
