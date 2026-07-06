"""Configuracion de armonizacion del ETL de Apreciacion (Autoevaluacion ETITC).

Todo el conocimiento del dominio que varia entre anios vive aqui:
- que hoja y que columnas leer por anio (adaptadores)
- como mapear estamentos a un catalogo canonico
- como normalizar la escala a 0-100

La tabla de hechos usa el grano "una respuesta individual" y solo aplica a los
anios 2020, 2022 y 2025. El anio 2016 viene pre-agregado y se procesa aparte.
"""

from pathlib import Path

# Raiz de datos fuente (relativa a la carpeta apreciacion/)
BASE_DIR = Path(__file__).resolve().parents[1]
FUENTE_DIR = BASE_DIR / "Fuente"
SALIDA_DIR = BASE_DIR / "salida"

# --- Escala nativa por anio (como en los tableros originales) ---------------
# 2016 usa escala 1-5; 2020/2022/2025 usan 2-10. El promedio se muestra SIEMPRE
# en su escala nativa. La normalizacion a 0-100 (solo para el comparativo) es
# la convencion de los tableros: valor * (100 / escala_max)  => 1-5 x20, 2-10 x10.
ESCALA_MAX_ANIO = {2016: 5, 2020: 10, 2022: 10, 2025: 10}


def escala_label(anio):
    return "1–5" if ESCALA_MAX_ANIO.get(anio) == 5 else "2–10"


def a_100(promedio, anio):
    """Normaliza un promedio nativo a 0-100 segun la escala del anio (x20 / x10)."""
    if promedio is None:
        return None
    emax = ESCALA_MAX_ANIO.get(anio, 10)
    return round(float(promedio) * (100 / emax), 1)


# escala verbal (para nivel/distribucion): 2..10, 0 = no responde -> nulo
ESCALA_MIN = 2
ESCALA_MAX = 10


def normalizar_100(valor):
    """Lleva un valor de la escala 2..10 a 0..100. Devuelve None si es nulo/0."""
    if valor is None:
        return None
    try:
        v = float(valor)
    except (TypeError, ValueError):
        return None
    if v <= 0:  # 0 = no responde en 2020; cualquier <=0 es invalido
        return None
    v = max(ESCALA_MIN, min(ESCALA_MAX, v))
    return round((v - ESCALA_MIN) / (ESCALA_MAX - ESCALA_MIN) * 100, 2)


# --- Nivel verbal canonico (para distribuciones) ---------------------------
# Toda la escala 2..10 se agrupa en 5 niveles comunes a los 3 anios. Asi la
# distribucion de respuestas es comparable aunque el texto verbal varie.
NIVELES = [
    (1, "Muy bajo",       "#f85149"),   # 2  (No existe / No se cumple)
    (2, "Bajo",           "#db6d28"),   # 4  (No conoce / Insatisfactorio)
    (3, "Aceptable",      "#d29922"),   # 6  (Aceptablemente / Poco apropiado)
    (4, "Favorable",      "#3fb950"),   # 8  (Alto grado / Apropiado)
    (5, "Muy favorable",  "#2ea043"),   # 10 (Plenamente / Muy apropiado)
]
NIVEL_LABEL = {n: lbl for n, lbl, _ in NIVELES}


def nivel_de(valor):
    """Agrupa un valor 2..10 en nivel 1..5. None si nulo/0."""
    if valor is None:
        return None
    try:
        v = float(valor)
    except (TypeError, ValueError):
        return None
    if v <= 0:
        return None
    if v < 3:  return 1
    if v < 5:  return 2
    if v < 7:  return 3
    if v < 9:  return 4
    return 5


def limpiar_nombre(txt, prefijos=("FACTOR", "CARACTERISTICA", "CARACTERÍSTICA",
                                   "ASPECTO")):
    """Normaliza un nombre del modelo: quita 'FACTOR 1.', codigos 'FI-01', saltos
    de linea y espacios repetidos. Devuelve None si vacio."""
    import re
    if txt is None:
        return None
    s = " ".join(str(txt).split())          # colapsa espacios y saltos
    if not s or s.lower() == "nan":
        return None
    s = re.sub(r"^(F[IP]?-?\d+\.?\s*)", "", s)          # 'FI-01 ', 'F1. '
    for p in prefijos:
        s = re.sub(rf"^{p}\s*N?[°º]?\s*\d*\.?\s*", "", s, flags=re.IGNORECASE)
    return s.strip(" .-") or None


# --- Catalogo canonico de estamentos --------------------------------------
# Las claves son los nombres tal cual aparecen en cada anio (ya en Title/como
# vienen); el valor es la etiqueta canonica.
ESTAMENTO_CANONICO = {
    "estudiantes": "Estudiantes",
    "profesores": "Docentes",
    "docentes": "Docentes",
    "administrativos": "Administrativos",
    "funcionarios publicos": "Administrativos",
    "directivos": "Directivos",
    "egresados": "Egresados",
    "graduados": "Egresados",
    "empresarios": "Empleadores",
    "empleadores": "Empleadores",
}


def canonizar_estamento(valor):
    if valor is None:
        return "Sin dato"
    clave = str(valor).strip().lower()
    # normaliza acentos comunes del origen
    clave = (clave.replace("ú", "u").replace("ó", "o")
                  .replace("é", "e").replace("í", "i")
                  .replace("á", "a"))
    return ESTAMENTO_CANONICO.get(clave, str(valor).strip().title())


def canonizar_programa(valor):
    """Limpia el campo programa. Devuelve (programa_norm, es_multiple).

    Los respondientes que NO evaluaron un programa academico especifico
    (campo vacio, NaN, o textos tipo 'todos' / 'quiero evaluar todos los
    programas') se agrupan como INSTITUCIONAL: son la vision institucional y
    sirven de linea base del comparativo Programas vs Institucional. Asi no se
    pierden sus respuestas ni aparecen 'Nan'/'Todos' como programas falsos.
    """
    if valor is None:
        return ("INSTITUCIONAL", False)
    txt = str(valor).strip().strip(";").strip()
    low = txt.lower()
    if low in ("", "nan", "none", "todos") or low.startswith("quiero evaluar todos"):
        return ("INSTITUCIONAL", False)
    if ";" in txt:
        return ("MULTIPLE", True)
    return (txt.title(), False)


# --- Adaptadores por anio --------------------------------------------------
# Cada adaptador describe archivo, hoja y el mapeo columna_origen -> campo
# canonico. Los campos ausentes en un anio quedan como None.
# Campos canonicos: estamento, programa, sede, ciudad, genero, id_encuestado,
#                   factor, caracteristica, aspecto, codigo_pregunta,
#                   texto_pregunta, valor, codigo_llave (para extraer F/C/A)
ADAPTADORES = {
    2020: {
        # fuente EXACTA del tablero original (116.842 filas, prom 8.285)
        "archivo": "2020/Tablero_apreciación_2020.xlsx",
        "hoja": "RS20",
        "cols": {
            "Estamento": "estamento",
            "Programa": "programa",
            "Género": "genero",
            "ID_Estudiante": "id_encuestado",
            "Factor": "factor",
            "Característica": "caracteristica",
            "Aspecto": "aspecto",
            "Factor_cod": "factor_cod",
            "Caracteristica_cod": "caracteristica_cod",
            "Aspecto_cod": "aspecto_cod",
            "Código": "codigo_pregunta",
            "Respuesta": "valor",
        },
        "llave_codigo": "codigo_pregunta",
    },
    2022: {
        "archivo": "2022/Base_datos_sistematizada_apreciación_2022.xlsx",
        "hoja": "RS22",
        "cols": {
            "Estamento": "estamento",
            "Programa": "programa",
            "Facultad": "facultad",
            "Genero": "genero",
            "Factor": "factor",
            "Caracteristica": "caracteristica",
            "Aspecto": "aspecto",
            "Factor_cod": "factor_cod",
            "Caracteristica_cod": "caracteristica_cod",
            "Aspecto_cod": "aspecto_cod",
            "Codigo": "codigo_pregunta",
            "Valor": "valor",
        },
        "llave_codigo": None,  # ya trae *_cod explicitos
    },
    2025: {
        "archivo": "2025/Base_datos_sistematizada_apreciación_2025.xlsx",
        "hoja": "RS25",
        "cols": {
            "Encuesta": "estamento",          # en 2025 el estamento vive en 'Encuesta'
            "Programa": "programa",
            "Sede": "sede",
            "Genero": "genero",
            "Ciudad": "ciudad",
            "ID_Encuestado": "id_encuestado",
            "Factor": "factor_cod",           # aqui Factor YA es el codigo (F1)
            "Caracteristica": "caracteristica_cod",
            "Aspecto": "aspecto_cod",
            "Seccion": "seccion",             # agrupador legible (p.ej. 'PEI')
            "Sub_item": "texto_pregunta",     # el texto real de la pregunta
            "Respuesta_texto": "respuesta_texto",
            "Valor(2-10)": "valor",
        },
        "llave_codigo": None,
        "diccionario": "Diccionario_RS25",    # de aqui salen los nombres del modelo
    },
}

# Anio pre-agregado (naturaleza distinta: entra en la capa de agregados)
ADAPTADOR_2016 = {
    "programas": "2016/base_unificada_normalizada_Autoevaluacion_Programas_ETITC_2016.xlsx",
    "institucional": "2016/base_unificada_normalizada_Autoevaluacion__institucional_ETITC_2016.xlsx",
}
