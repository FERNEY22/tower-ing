# Capas fuente (exportación QGIS)

Estos archivos son las **exportaciones originales desde QGIS**, anteriores a la depuración
del visor (2026-09). Se conservan como insumo y evidencia: **el visor no los lee**, su
cartografía está embebida en `../index.html`.

Tres advertencias antes de reutilizarlos, todas verificadas por hash de geometría y
documentadas en `../INFORME_AUDITORIA.md`:

**1. Tres archivos rotulados «Clase VI» contienen polígonos cuyo atributo `CLASE` dice VII.**

| Archivo | `CLASE` real |
|---|---|
| `Clase VI limitaciones por pendiente O relieve y suelo.geojson` | VII |
| `Clase VI, limitaciones por clima  y suelo.geojson` (doble espacio) | VII |
| `Clase VI, limitaciones por clima y suelo.geojson` | VII |
| `Clase VI, limitaciones por suelo.geojson` | **VI** — la única Clase VI real (352,55 ha) |

El visor agrupa por el atributo `CLASE`, no por el nombre del archivo. Si se reembeben
guiándose por los nombres, la Clase VI vuelve a inflarse de 352,55 a 1.852,96 ha.

**2. Tres archivos están en coordenadas proyectadas (metros, EPSG:9377) pese a no declarar
CRS, y duplican a su gemelo en grados.** Leaflet los sitúa fuera del planeta, así que sus
features nunca se dibujaron; se purgaron del visor.

| Archivo en metros | Duplica a | Solape |
|---|---|---|
| `Clase IV con limitaciones por erosión y suelo.geojson` (4 features) | `Clase IV, limitaciones por erosión y suelo.geojson` | 100 % |
| `Clase VI, limitaciones por clima y suelo.geojson` (1 feature) | `Clase VI, limitaciones por clima  y suelo.geojson` | 100 % |
| `Clase VII con limitaciones por pendiente y suelo.geojson` (1 feature) | `Clase VI limitaciones por pendiente O relieve y suelo.geojson` | 100 % |

Regla al reembeber: descartar todo feature con `|longitud| > 180`.

**3. `Erosion laminar.geojson` (78 features) es el superconjunto** de
`Erosion laminar y surcos.geojson` (34) y `Erosion terraceo y laminar.geojson` (21), según su
propio atributo `CLAS`. Las tres no se suman entre sí: juntas darían 117,9 % del municipio.

`Erosion climatica.geojson` comparte geometría con `Clase III con limitaciones de suelo y
clima.geojson`: es la misma unidad de suelos leída desde dos atributos, no dos superficies.
La copia dañada `Erosion por aluminio.geojson` se movió a `../descartadas/`.
