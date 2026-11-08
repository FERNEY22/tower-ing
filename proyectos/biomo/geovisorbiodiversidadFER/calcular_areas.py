#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cálculo de superficies de las capas poligonales del geovisor de Sotaquirá.

Entrada  : index.html (las capas GeoJSON están embebidas como constantes `const GEO_* = {...};`)
Salida   : tablas en consola + areas_sotaquira.csv

MÉTODO
------
* CRS de publicación : EPSG:4326 (CRS84, grados)
* CRS de cálculo     : EPSG:9377 - MAGNA-SIRGAS 2018 / Origen-Nacional
                       (+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000
                        +y_0=2000000 +ellps=GRS80 +units=m)
                       Se usa para TODA operación geométrica (intersecciones, recortes,
                       uniones), porque es un plano métrico.
* Áreas absolutas    : geodésicas sobre el elipsoide GRS80 (algoritmo de Karney,
                       pyproj.Geod). NO se usa el área planar de 9377: al ser una
                       proyección conforme con k0 = 0.9992, el área planar subestima
                       el área real en ~0.159 % de forma sistemática en esta zona
                       (k^2 = 0.99842). Ver validación en el README.
* Denominador de %   : 28 466.66 ha = suma geodésica de las 30 veredas de Sotaquirá
                       (DANE, Nivel de Referencia de Veredas 2024, vigencia 2009).
                       Numerador y denominador salen así del mismo método.

CORRECCIONES APLICADAS A LOS DATOS DE ENTRADA (documentadas en el README)
------------------------------------------------------------------------
1. CRS mixto: 6 features de las clases agrológicas estaban almacenadas en coordenadas
   proyectadas (metros, EPSG:9377) dentro de archivos declarados en grados, y el visor
   no las dibujaba. Se PURGARON de index.html en la depuración 2026-09 (eran copias
   >=99 % de features ya presentes en grados). La detección por magnitud (|x| > 180)
   y la reproyección se conservan aquí como red de seguridad.
2. Agrupación por atributo, no por archivo. Dos defectos de exportación desde QGIS:
   · el archivo de Clase VI traía polígonos cuyo atributo CLASE dice VII; las filas
     VI y VII de este informe se arman filtrando por CLASE sobre ambos archivos.
   · "Erosión laminar" (78 features) es el superconjunto de las tres subclases del
     atributo CLAS; se reporta como total y se desglosa, nunca en paralelo.
3. Capa retirada: "Erosión por aluminio (Al3+)" era copia byte a byte de "Erosión
   climática". Se eliminó de index.html; ya no aparece en estas tablas.
4. Solapes internos: cada capa se disuelve (unary_union) antes de medir, de modo que
   el área informada nunca cuenta dos veces el mismo terreno.
5. Recorte: cada capa se intersecta con el límite municipal (unión de las 30 veredas).

Requisitos: pyproj >= 3.8, shapely >= 2.1   (ver .venv del proyecto)
Uso       : python calcular_areas.py
"""

import csv
import io
import json
import re
import sys

from pyproj import Geod, Transformer
from shapely.geometry import shape
from shapely.ops import transform as shp_transform, unary_union
from shapely.validation import make_valid

# ----------------------------------------------------------------------------- config
FUENTE_HTML = "index.html"
SALIDA_CSV = "areas_sotaquira.csv"

DENOMINADOR_HA = 28466.66        # suma geodésica de las 30 veredas (ver README)
REF_DANE_HA = 28494.81           # suma del atributo AREA_HA del servicio DANE 2024
REF_OFICIAL_HA = 28400.00        # 284 km² oficiales del municipio

A_9377 = Transformer.from_crs("EPSG:4326", "EPSG:9377", always_xy=True).transform
A_4326 = Transformer.from_crs("EPSG:9377", "EPSG:4326", always_xy=True).transform
GEOD = Geod(ellps="GRS80")

# Capas poligonales tal como las dibuja el panel del visor tras la depuración 2026-09.
# Cada fila: (claves de origen, etiqueta, filtro por atributo o None, sangría)
#   El filtro es (clave_atributo, valor): la fila se arma con los features que lo
#   declaran, vengan del archivo que vengan. Así la tabla coincide con el visor.
GRUPOS = [
    ("Clases agrológicas", [
        (["GEO_NILA_C3"], "Clase III · limitaciones de suelo y clima", None, 0),
        (["GEO_NILA_C4"], "Clase IV · limitaciones por erosión y suelo", None, 0),
        (["GEO_NILA_C5"], "Clase V · limitaciones hídricas y de suelo", None, 0),
        (["GEO_NILA_C6", "GEO_NILA_C7"], "Clase VI · limitaciones por relieve/clima",
         ("CLASE", "VI"), 0),
        (["GEO_NILA_C6", "GEO_NILA_C7"], "Clase VII · limitaciones por pendiente/erosión",
         ("CLASE", "VII"), 0),
        (["GEO_NILA_C8"], "Clase VIII · conservación y protección", None, 0),
    ]),
    ("Procesos de erosión", [
        (["GEO_NILA_ELAM"], "Erosión hídrica (total)", None, 0),
        (["GEO_NILA_ELAM"], "Erosión laminar", ("CLAS", "laminar"), 1),
        (["GEO_NILA_ELAM"], "Erosión laminar y en surcos", ("CLAS", "laminar y surcos"), 1),
        (["GEO_NILA_ELAM"], "Erosión por terraceo y laminar",
         ("CLAS", "terraceo y laminar"), 1),
        (["GEO_NILA_ECLIM"], "Erosión climática", None, 0),
    ]),
    ("Geomorfología", [
        (["GEO_MONTANAS"], "Montañas estructurales", None, 0),
        (["GEO_ALTIPLAN"], "Altiplanicie estructural", None, 0),
    ]),
    ("Cobertura del suelo (CORINE)", [
        (["GEO_BOSQUES"], "Bosques y áreas seminaturales", None, 0),
        (["GEO_AGRICOLAS"], "Territorios agrícolas", None, 0),
    ]),
    ("Ecosistemas estratégicos", [
        (["GEO_PARAMOS"], "Páramos (Guantiva–La Rusia / Iguaque–Merchán)", None, 0),
    ]),
]


# ------------------------------------------------------------------------- utilidades
def cargar_capas(ruta=FUENTE_HTML):
    """Extrae las constantes `const GEO_* = {...};` embebidas en el HTML."""
    patron = re.compile(r"^\s*const\s+(GEO_[A-Za-z0-9_]+)\s*=\s*(\{.*\})\s*;\s*$")
    capas = {}
    with io.open(ruta, encoding="utf-8") as fh:
        for linea in fh:
            m = patron.match(linea)
            if not m:
                continue
            try:
                datos = json.loads(m.group(2))
            except json.JSONDecodeError:
                continue
            if datos.get("type") == "FeatureCollection":
                capas[m.group(1)] = datos
    return capas


def _vertices(coords, salida):
    if isinstance(coords[0], (int, float)):
        salida.append(coords)
    else:
        for parte in coords:
            _vertices(parte, salida)


def en_metros(geometria):
    """True si las coordenadas son métricas (proyectadas) y no grados."""
    puntos = []
    _vertices(geometria["coordinates"], puntos)
    return max(abs(p[0]) for p in puntos) > 180


def geom_4326(feature):
    """Geometría válida en EPSG:4326, reproyectando si viene en metros (EPSG:9377)."""
    g = make_valid(shape(feature["geometry"]))
    if en_metros(feature["geometry"]):
        g = shp_transform(A_4326, g)
    return g


def ha_geodesica(g):
    """Área geodésica sobre el elipsoide GRS80, en hectáreas."""
    if g.is_empty:
        return 0.0
    return abs(GEOD.geometry_area_perimeter(g)[0]) / 10000.0


def ha_planar_9377(g):
    """Área planar en EPSG:9377, en hectáreas (solo para contraste)."""
    if g.is_empty:
        return 0.0
    return shp_transform(A_9377, g).area / 10000.0


def deduplicar(geoms, umbral=0.99):
    """Descarta geometrías que replican (>= umbral de solape mutuo) a otra previa."""
    conservadas, descartadas = [], []
    for g in geoms:
        a = ha_geodesica(g)
        es_dup = False
        for h in conservadas:
            if not g.intersects(h):
                continue
            inter = g.intersection(h)
            if inter.is_empty:
                continue
            ia = ha_geodesica(inter)
            b = ha_geodesica(h)
            if ia >= umbral * min(a, b) and abs(a - b) / max(a, b) < 0.01:
                es_dup = True
                break
        (descartadas if es_dup else conservadas).append(g)
    return conservadas, descartadas


# ------------------------------------------------------------------------------ main
def main():
    capas = cargar_capas()
    if "GEO_VEREDAS" not in capas:
        sys.exit("No se encontró GEO_VEREDAS en %s" % FUENTE_HTML)

    veredas = [geom_4326(f) for f in capas["GEO_VEREDAS"]["features"]]
    limite = unary_union(veredas)
    suma_veredas = sum(ha_geodesica(g) for g in veredas)

    print("=" * 96)
    print("SUPERFICIES DE LAS CAPAS POLIGONALES · GEOVISOR DE SOTAQUIRÁ (15763)")
    print("=" * 96)
    print("CRS publicación 4326 · CRS cálculo 9377 · áreas geodésicas GRS80 (Karney)")
    print()
    print("REFERENCIAS DE ÁREA MUNICIPAL")
    print("  Suma geodésica de las 30 veredas (denominador) : %10.2f ha" % suma_veredas)
    print("  Atributo AREA_HA del servicio DANE 2024         : %10.2f ha" % REF_DANE_HA)
    print("  Área oficial del municipio (284 km²)            : %10.2f ha" % REF_OFICIAL_HA)
    print("  Unión disuelta de las 30 veredas                : %10.2f ha" % ha_geodesica(limite))
    print()

    filas = []
    for grupo, capas_grupo in GRUPOS:
        print("-" * 96)
        print(grupo.upper())
        print("-" * 96)
        print("%-46s %4s %4s %10s %10s %7s" %
              ("capa", "n", "únic", "ha", "ha_9377", "% mun"))
        for claves, etiqueta, filtro, sangria in capas_grupo:
            feats = []
            for clave in claves:
                if clave not in capas:
                    continue
                for f in capas[clave]["features"]:
                    if not f.get("geometry"):
                        continue
                    if filtro and (f.get("properties") or {}).get(filtro[0]) != filtro[1]:
                        continue
                    feats.append(f)
            if not feats:
                continue
            etiqueta = ("  · " if sangria else "") + etiqueta
            geoms = [geom_4326(f) for f in feats]
            unicas, dups = deduplicar(geoms)
            disuelta = unary_union(unicas) if unicas else None
            recortada = disuelta.intersection(limite) if disuelta is not None else None

            ha = ha_geodesica(recortada) if recortada is not None else 0.0
            ha9377 = ha_planar_9377(recortada) if recortada is not None else 0.0
            pct = 100.0 * ha / DENOMINADOR_HA

            nota = " [%d dup]" % len(dups) if dups else ""
            print("%-46s %4d %4d %10.2f %10.2f %6.2f%%%s" %
                  (etiqueta[:46], len(feats), len(unicas), ha, ha9377, pct, nota))
            filas.append({
                "grupo": grupo, "capa": "+".join(claves), "etiqueta": etiqueta.strip(),
                "filtro": ("%s=%s" % filtro) if filtro else "",
                "n_features": len(feats), "n_unicas": len(unicas),
                "n_duplicadas": len(dups),
                "area_ha_geodesica": round(ha, 2),
                "area_ha_planar_9377": round(ha9377, 2),
                "pct_area_municipal": round(pct, 2),
            })
        print()

    with io.open(SALIDA_CSV, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)
    print("CSV escrito en %s" % SALIDA_CSV)


if __name__ == "__main__":
    main()
