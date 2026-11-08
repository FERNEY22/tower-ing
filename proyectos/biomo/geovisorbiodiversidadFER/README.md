# Geovisor de biodiversidad y suelos de Sotaquirá (Boyacá)

Visor cartográfico web de una sola página para el municipio de **Sotaquirá (DANE 15763)**,
Boyacá, Colombia. Reúne en dos módulos temáticos —**degradación de suelos** y
**biodiversidad**— 44 capas conmutables sobre cartografía oficial colombiana, con ventanas
emergentes de atributos, leyenda dinámica y vistas predefinidas.

Desarrollado por **Ferney Torres** ([tower-ing.com](https://tower-ing.com)) sobre la
recolección de información y la cartografía temática del equipo de investigación de la
**Universidad EAN** (Rodriguez · Castillo · García · Millán · Torres Ome), 2025.

Las cifras que produce este visor sustentan las Tablas III y IV y la Sección IV de un
artículo presentado a **AmITIC-TEDUCA 2026**. Su auditoría completa está en
[`INFORME_AUDITORIA.md`](INFORME_AUDITORIA.md).

---

## Cómo ejecutarlo

Todo el visor es **un solo archivo**, `index.html` (3,99 MB), con la cartografía embebida:
no hay backend, ni build, ni peticiones de datos en tiempo de ejecución. Solo necesita
servirse por HTTP para que el navegador cargue los mapas base:

```bash
python -m http.server 8000
# abrir http://127.0.0.1:8000/index.html
```

Abrirlo con `file://` funciona parcialmente, pero algunos navegadores bloquean las peticiones
a los servidores de teselas. Dependencias externas, ambas desde CDN: **Leaflet 1.9.4** y
**Leaflet.markercluster 1.5.3**.

### Estructura

| Archivo | Contenido |
|---|---|
| `index.html` | El visor completo: HTML, CSS, JS y 40 colecciones GeoJSON embebidas |
| `capas NILA/` | Capas fuente exportadas desde QGIS, con un `README.md` que advierte de tres trampas de nomenclatura y CRS antes de reutilizarlas |
| `descartadas/` | Capa retirada por daño de exportación, conservada como evidencia de trazabilidad |
| `calcular_areas.py` | Cálculo reproducible de superficies por capa → `areas_sotaquira.csv` |
| `areas_sotaquira.csv` | Superficies y porcentajes de todas las capas poligonales |
| `INFORME_AUDITORIA.md` | Auditoría de datos, método, cifras y limitaciones |

---

## Fuentes oficiales por capa

Toda la cartografía procede de entidades oficiales colombianas. Las capas temáticas se
elaboraron a partir de esos insumos base; no son productos oficiales en sí mismas.

### Base territorial

| Capa | n | Insumo base |
|---|---:|---|
| Departamento de Boyacá | 1 | IGAC · límite administrativo departamental |
| Municipios | 123 | IGAC · límites municipales (los 123 municipios de Boyacá) |
| Vías principales | 19 | Natural Earth · escala global |
| Hidrografía local | 3 | Elaboración propia sobre insumo IGAC |
| Veredas de Sotaquirá | 30 | **DANE · Nivel de Referencia de Veredas 2024** (`VIGENCIA = 2009`, `FUENTE = CATASTRO IGAC`) |

### Módulo A · Degradación de suelos

| Capa | n | Insumo base |
|---|---:|---|
| Clases agrológicas III, IV, V, VI, VII, VIII | 3 · 5 · 1 · 1 · 5 · 3 | IGAC · Estudio General de Suelos de Boyacá (2004, 1:100.000) · clasificación agrológica |
| Erosión hídrica (total) | 78 | IGAC · Estudio General de Suelos de Boyacá |
| └ Erosión laminar | 23 | idem, atributo `CLAS = laminar` |
| └ Erosión laminar y en surcos | 34 | idem, atributo `CLAS = laminar y surcos` |
| └ Erosión por terraceo y laminar | 21 | idem, atributo `CLAS = terraceo y laminar` |
| Erosión climática | 3 | IGAC · Estudio General de Suelos de Boyacá |
| Montañas estructurales · Altiplanicie estructural | 15 · 13 | IGAC · Estudio General de Suelos (2004) · geomorfología |
| Bosques y áreas seminaturales · Territorios agrícolas | 147 · 126 | IDEAM · CORINE Land Cover Colombia (1:100.000) |

Las tres subclases de erosión están **contenidas** en la capa total: no se suman entre sí ni
con ella. El visor lo impone: activar el total apaga las subclases y viceversa.

### Módulo B · Biodiversidad

| Capa | n | Insumo base |
|---|---:|---|
| Páramos (Guantiva–La Rusia, Iguaque–Merchán) | 3 | MinAmbiente · delimitación oficial: **Res. 1296 del 28/06/2017** y **Res. 1555 del 26/09/2016** |
| Afectación baja · Susceptibilidad de suelos | 2 · 2 | Análisis propio sobre insumo IGAC |
| 16 capas de especies (registros regionales) | 4.018 puntos | **GBIF.org** · compilación propia |
| 2 capas de especies con registros dentro de Sotaquirá | 9 puntos | Subconjunto espacial de las anteriores |
| Cámaras trampa · Flora · Fauna registradas | 5 · 5 · 5 | Autoría propia · ilustrativo, no es monitoreo real |

**Licencias de los registros GBIF.** Los 4.027 puntos embebidos conservan su licencia
original: 2.599 **CC BY-NC 4.0** (uso no comercial), 611 **CC BY 4.0** y 817 **CC0 1.0**.
Cada punto guarda además institución, colección, catálogo y `recordedBy`, tal como los
publica GBIF. Quien reutilice estos datos debe respetar esas licencias y citar a GBIF y a
las instituciones publicadoras (IAvH, UNAL, UdeA, MVZ, UCaldas, entre otras).

---

## Método cartográfico

### Sistemas de referencia

| Uso | CRS |
|---|---|
| **Publicación** (lo que viaja en el GeoJSON y dibuja Leaflet) | **EPSG:4326** · CRS84, grados |
| **Cálculo geométrico** (intersecciones, uniones, recortes) | **EPSG:9377** · MAGNA-SIRGAS 2018 / Origen-Nacional |

EPSG:9377 es **Transverse Mercator**, no Lambert:

```
+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +units=m
```

Se usa para toda operación geométrica porque es un plano métrico nacional. La reproyección
4326 → 9377 se validó con cinco controles independientes (ancla en el origen, reimplementación
propia de la serie de Krüger, ida y vuelta, k² teórico y k² implícito en los datos); el detalle
está en la §1 del informe de auditoría.

### Áreas: geodésicas, no planares

Las hectáreas se miden **sobre el elipsoide GRS80 con el algoritmo de Karney**
(`pyproj.Geod`), no en el plano de 9377. Razón: 9377 es una proyección **conforme, no
equivalente**; con k₀ = 0,9992 el área planar subestima el área real en **0,159 %** de forma
sistemática en esta zona (k² ≈ 0,99842). El CSV incluye ambas columnas para contraste.

### Recorte al límite municipal

Cada capa se **disuelve** (`unary_union`, para no contar dos veces el mismo terreno) y se
**intersecta con el límite municipal**, definido como la **unión de las 30 veredas de
Sotaquirá** del Nivel de Referencia de Veredas DANE 2024 (`DPTOMPIO = 15763`).

El denominador de todos los porcentajes es **28.466,66 ha**, la suma geodésica de esas 30
veredas — numerador y denominador salen así del mismo método. Referencias de contraste:
28.494,81 ha (atributo `AREA_HA` del DANE) y 28.400 ha (284 km² oficiales). El polígono
municipal de la capa `GEO_MUNICIPIOS` mide 29.208,98 ha, un 2,6 % más, y **no** se usa como
denominador.

Para reproducir las superficies:

```bash
python -m venv .venv
# Linux/macOS: source .venv/bin/activate   ·   Windows: .venv\Scripts\activate
pip install "pyproj>=3.8" "shapely>=2.1"
python calcular_areas.py     # imprime las tablas y reescribe areas_sotaquira.csv
```

---

## Cómo regenerar los GeoJSON embebidos

Las capas viven dentro de `index.html` como constantes de una sola línea:

```js
const GEO_NILA_C3 = {"type":"FeatureCollection","features":[ ... ]};
```

`calcular_areas.py` las lee con esa expectativa exacta, así que el formato hay que
respetarlo al regenerarlas:

1. **Exportar desde QGIS** en GeoJSON, CRS **EPSG:4326 (CRS84)**, con los atributos que usan
   los popups (`UCS_CP`, `CLASE`, `SUBCLASE`, `GRUPO`, `UCS`, `CARACT`, `LIMIT`, `USO`,
   `USOS_REC`, `PRACT`, `AREA_HA` para clases agrológicas; `TIPO`, `CLAS`, `GRA`, `AREA_HA`
   para erosión; `nivel_2`, `nivel_3`, `codigo`, `leyenda` para CORINE). Los originales están
   en `capas NILA/`.
2. **Simplificar** la geometría a ~7 m de tolerancia; es lo aplicado a las capas actuales y
   mantiene el archivo manejable sin deformar los límites a la escala de trabajo (1:100.000).
3. **Serializar en una sola línea**, UTF-8 sin escapes ASCII y sin espacios entre separadores
   — equivalente a `json.dumps(datos, ensure_ascii=False, separators=(',', ':'))` — y
   sustituir la línea `const GEO_XXX = {...};` correspondiente.
4. **Verificar el round-trip** antes de reemplazar: releer la línea, parsearla y comprobar
   que `json.dumps(...)` devuelve exactamente los mismos bytes. Es la comprobación que se usó
   en las depuraciones de 2026-09 y evita corrupciones silenciosas.
5. **Filtrar lo que no pertenece al municipio o al planeta**:
   - veredas: conservar solo `DPTOMPIO = 15763`;
   - municipios: solo códigos DANE que empiecen por `15` (Boyacá);
   - cualquier capa: descartar features con `|longitud| > 180`, que son coordenadas
     proyectadas (metros) dentro de un archivo declarado en grados y que Leaflet sitúa fuera
     del planeta.
6. **No escribir conteos a mano.** Las entradas del panel derivan su badge de
   `features.length`, y así debe seguir: es lo que garantiza que el rótulo no se desincronice
   de los datos.
7. Volver a correr `calcular_areas.py` y comprobar que los controles de coherencia siguen
   cuadrando (geomorfología ≈ 97 %, CORINE ≈ 99 %, clases agrológicas ≈ 97 % del municipio).

La capa de veredas se verificó contra el servicio oficial del DANE:

```
https://portalgis.dane.gov.co/mparcgis/rest/services/NIVEL_DE_REFERENCIA_DE_VEREDAS/
Serv_CapasNivelReferenciaVeredas_2024/MapServer/1/query
  ?where=CODIGO_VER+LIKE+'15763%'
  &outFields=CODIGO_VER,NOMBRE_VER,AREA_HA,VIGENCIA,FUENTE
  &returnGeometry=false&f=json
```

Devuelve exactamente los 30 registros que trae el visor.

---

## Limitaciones conocidas

Están documentadas una a una en la §4 y la §5 de [`INFORME_AUDITORIA.md`](INFORME_AUDITORIA.md).
Resumen:

### De la capa de veredas

- **Desempalme con Cómbita.** La capa original traía 51 features: las 30 de Sotaquirá y 21 de
  municipios vecinos, resultado de recortar la capa nacional contra un polígono municipal de
  otro vintage. Veinte eran astillas de 0,02 a 1,38 ha; la vigésimo primera, `15204008`
  (Cómbita), aportaba **707,3 ha en 47 fragmentos** — un desacuerdo sistemático entre ambas
  capas a lo largo de ~7 km² del límite sur. Las 21 se eliminaron.
- **Dos veredas con geometría generalizada.** Frente al `AREA_HA` oficial del DANE:
  **BOSIGAS CENTRO** −5,21 % (376,99 vs 397,73 ha) y **CARREÑO** −1,59 % (1.194,61 vs
  1.213,86 ha). Las otras 28 caen entre −0,48 % y +0,42 %. Son ~40 ha sobre 28.400: sin
  efecto en los totales, pero conviene no citar el área de esas dos veredas por separado.
- **30 veredas, no 26.** Las 30 son el nivel de referencia DANE 2024; las 26 que circulan en
  fichas de Corpoboyacá y en el mapa veredal de Planeación de Boyacá vienen de base IGAC
  1988. Son vintages distintos, no un error.

### Capas retiradas por daño de exportación

Auditando las 40 colecciones con hash de geometría aparecieron tres defectos originados al
exportar desde QGIS. Los tres están corregidos:

- **«Erosión por aluminio (Al³⁺)» — capa retirada.** Era **idéntica byte a byte** a «Erosión
  climática»: mismo payload, misma geometría, mismos atributos (ambas declaraban
  `UCS_CP = "Erosión climática"`). No existía tal capa. El archivo fuente dañado se conserva
  en [`descartadas/`](descartadas/) solo como evidencia de trazabilidad; no debe volver a
  embeberse.
- **«Clase VI» contenía polígonos de Clase VII.** El archivo mezclaba unidades `VIIps1` y
  `VIIcs1` con la única `VIs1` real. Las capas VI y VII se arman ahora **filtrando por el
  atributo `CLASE`**, no por el archivo de origen: Clase VI son 352,55 ha (1,24 % del
  municipio), no 1.852,96 ha.
- **«Erosión laminar» era un superconjunto.** Sus 78 polígonos contienen las tres subclases;
  las capas «laminar y en surcos» y «terraceo y laminar» eran exactamente subconjuntos suyos.
  Sumar las tres entradas del panel daba **117,9 % del municipio**. Ahora hay un total
  explícito con sus subclases, mutuamente excluyentes.
- **Features que el visor nunca dibujaba — purgados.** Seis polígonos de las clases
  agrológicas estaban almacenados en metros (EPSG:9377) dentro de archivos declarados en
  grados, y eran duplicados ≥99,5 % de otros ya presentes. También se retiraron dos
  municipios ajenos a Boyacá que habían entrado al recortar la capa nacional: **Yacopí**
  (Cundinamarca, sin geometría) y **Bolívar** (Santander, geometría degenerada de área nula).

### Otras

- **«Erosión climática» comparte geometría con la Clase III.** Es legítimo —ambas describen
  la misma unidad cartográfica de suelos desde dos atributos— pero son 1.919,48 ha vistas dos
  veces: no se suman.
- **Registros GBIF con coordenada repetida.** Hay muchos puntos sobre la misma coordenada
  (1.032 en *Quercus humboldtii*, 482 en *Zonotrichia capensis*). Se verificó que **no son
  registros duplicados**: ningún par comparte número de catálogo. Es redondeo de coordenada y
  repetición de localidad, propios de GBIF.
- **Sesgo de digitalización.** Solo **9 de los 4.018 registros GBIF** caen dentro del polígono
  de Sotaquirá. Varias especies del listado están presentes en el municipio pero sin registro
  digitalizado: el mapa muestra esfuerzo de muestreo, no solo distribución real.
- **Los grupos temáticos se solapan entre sí.** Clases agrológicas, erosión, geomorfología y
  CORINE son lecturas distintas del mismo territorio; solo tienen sentido de partición dentro
  de cada grupo.
- **Rendimiento.** El payload de 3,99 MB viaja completo en la primera carga (405 ms en
  localhost, sin latencia de red). La vista «Biodiversidad regional» instancia 4.157 features
  en 134 ms. El visor está pensado para escritorio; en móvil la barra lateral se pliega.

---

## Créditos y licencia de los datos

- **IGAC** — límites administrativos y Estudio General de Suelos de Boyacá (2004, 1:100.000).
- **DANE** — Nivel de Referencia de Veredas 2024.
- **IDEAM** — CORINE Land Cover Colombia (1:100.000).
- **MinAmbiente** — delimitación oficial de páramos (Res. 1296/2017 y 1555/2016).
- **GBIF.org** y las instituciones publicadoras — registros de biodiversidad, cada uno con su
  licencia (CC0 / CC BY 4.0 / CC BY-NC 4.0).
- **Natural Earth** — vías principales.
- Mapas base: OpenStreetMap, OpenTopoMap (CC-BY-SA) y Esri World Imagery.

Los datos de terceros conservan sus licencias de origen. Antes de reutilizar los registros
GBIF en un contexto comercial, revise que la parte CC BY-NC 4.0 lo permita.
