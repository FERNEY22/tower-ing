# Auditoría de datos del geovisor de Sotaquirá
## Cifras para AmITIC-TEDUCA 2026 · Tablas III y IV · Sección IV

Primera versión: 2026-09-16. **Revisión del 2026-09-17, con el visor ya depurado.**
Todas las cifras son reproducibles con `calcular_areas.py`
(entorno de cálculo: pyproj 3.8.0, shapely 2.1.2, PROJ 9.8.1, base EPSG v12.029).

> **Estado:** los tres defectos de datos detectados en la auditoría están **resueltos en
> `index.html`**. Las cifras de este informe y lo que dibuja el visor coinciden capa por
> capa. El detalle de qué se retiró y por qué está en la §4.

---

## 0. Método

| Parámetro | Valor |
|---|---|
| CRS de publicación | EPSG:4326 (CRS84, grados) |
| CRS de cálculo geométrico | EPSG:9377 · MAGNA-SIRGAS 2018 / Origen-Nacional |
| Definición 9377 | `+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +units=m` |
| Áreas absolutas | Geodésicas sobre elipsoide GRS80 (algoritmo de Karney, `pyproj.Geod`) |
| Denominador de los % | 28.466,66 ha |
| Agrupación de las filas | Por el **atributo que declara cada polígono**, no por el archivo de origen |

**Por qué las hectáreas absolutas van en geodésica y no en el plano de 9377.** EPSG:9377 es
Transverse Mercator, una proyección **conforme, no equivalente**. Con k₀ = 0,9992 el área
medida en el plano equivale al área elipsoidal real multiplicada por k². En Sotaquirá
k ∈ [0,99920256 · 0,99922071], de modo que el área planar **subestima el área real en
0,159 %** de forma sistemática. Las intersecciones, uniones y recortes sí se calculan en
9377 porque es un plano métrico; solo la medición final de superficie es geodésica.

### Referencias de área municipal

| Referencia | ha |
|---|---:|
| **Suma geodésica de las 30 veredas (denominador de los %)** | **28.466,66** |
| Atributo `AREA_HA` del servicio DANE 2024 | 28.494,81 |
| Área oficial del municipio (284 km²) | 28.400,00 |
| Unión disuelta de las 30 veredas | 28.455,77 |
| Polígono municipal de la capa `GEO_MUNICIPIOS` | 29.208,98 |

Las tres primeras caen dentro de un 0,33 % entre sí. La cuarta (polígono municipal de la
capa interna del visor) está 2,6 % por encima: ver limitación conocida en §5.

---

## 1. Validación de la reproyección 4326 → 9377

Cinco controles independientes.

| Control | Resultado |
|---|---|
| Ancla en el origen: (−73°, 4°) → (5.000.000, 2.000.000) | residual 0,0 m (exacto) |
| Reimplementación propia (serie de Krüger/Snyder 6.º orden) vs PROJ | discrepancia máx. **1,3 × 10⁻⁷ m** |
| Ida y vuelta 4326 → 9377 → 4326 | residual máx. **3,5 × 10⁻¹⁰ m** |
| k² teórico en la zona | 0,99842 |
| **k² implícito en los datos** (área planar ÷ área geodésica, 30 veredas) | **0,99842102** vs 0,99841880 teórico |

El último control es el más fuerte: shapely midiendo en el plano y el algoritmo de Karney
midiendo sobre el elipsoide concuerdan en el factor de distorsión predicho por la teoría
con un error de 2,2 × 10⁻⁶.

**Control empírico contra 30 valores publicados.** Comparando cada vereda medida contra su
`AREA_HA` oficial: mediana −0,19 %, media −0,37 %, rango −5,21 % a +0,42 %. Consistente con
el efecto k² (−0,16 %) más generalización menor.

---

## 2. TABLA CONSOLIDADA PARA EL PAPER

Áreas geodésicas, recortadas al límite municipal (unión de las 30 veredas), disueltas por
capa para no contar dos veces el mismo terreno. **`n` = features que el visor dibuja**;
tras la depuración de la §4 no hay features ocultas ni duplicadas en ninguna capa.

| Capa | n dibujadas | ha (geodésica) | % del área municipal |
|---|---:|---:|---:|
| **Clases agrológicas** (capacidad de uso) | | | |
| Clase III · limitaciones de suelo y clima | 3 | 1.919,48 | 6,74 % |
| Clase IV · limitaciones por erosión y suelo | 5 | 4.873,52 | 17,12 % |
| Clase V · limitaciones hídricas y de suelo | 1 | 157,16 | 0,55 % |
| Clase VI · limitaciones por relieve/clima | 1 | 352,55 | 1,24 % |
| Clase VII · limitaciones por pendiente/erosión | 5 | 7.889,38 | 27,71 % |
| Clase VIII · conservación y protección | 3 | 12.532,63 | 44,03 % |
| *Suma de las seis clases* | *18* | *27.724,72* | *97,39 %* |
| **Procesos de erosión** | | | |
| Erosión hídrica · **total** | 78 | 17.764,27 | 62,40 % |
| └ Erosión laminar | 23 | 1.974,16 | 6,93 % |
| └ Erosión laminar y en surcos | 34 | 13.109,12 | 46,05 % |
| └ Erosión por terraceo y laminar | 21 | 2.683,91 | 9,43 % |
| Erosión climática | 3 | 1.919,48 | 6,74 % |
| **Geomorfología** | | | |
| Montañas estructurales | 15 | 10.621,76 | 37,31 % |
| Altiplanicie estructural | 13 | 17.048,09 | 59,89 % |
| **Cobertura del suelo (CORINE)** | | | |
| Bosques y áreas seminaturales | 147 | 12.457,76 | 43,76 % |
| Territorios agrícolas | 126 | 15.851,05 | 55,68 % |
| **Ecosistemas estratégicos** | | | |
| Páramos (Guantiva–La Rusia / Iguaque–Merchán) | 3 | 10.142,10 | 35,63 % |

**Reglas de lectura, para que la tabla no se sume mal:**

1. Las tres filas sangradas (`└`) son **subclases del total de erosión hídrica**, no capas
   paralelas. Se suman entre ellas (1.974,16 + 13.109,12 + 2.683,91 = 17.767,19 ha, que
   coincide con el total de 17.764,27 salvo 2,92 ha de solapes internos entre polígonos),
   **pero nunca se suman al total**.
2. Los seis grupos temáticos **se solapan entre sí**: son lecturas distintas del mismo
   territorio. Solo tienen sentido de partición dentro de cada grupo.
3. Controles de coherencia: las seis clases agrológicas suman 97,39 % del municipio,
   geomorfología 97,20 % y CORINE 99,44 %, como corresponde a tres particiones del
   territorio medidas de forma independiente.
4. «Erosión climática» comparte geometría con la Clase III (misma UCS de origen): son
   1.919,48 ha vistas dos veces, no 3.838,96 ha.

La versión en CSV está en `areas_sotaquira.csv`, con las columnas adicionales de área
planar en 9377 y de procedencia (archivo y filtro de atributo de cada fila).

---

## 3. Traslape páramo × territorios agrícolas

Intersección calculada en EPSG:9377, dentro del límite municipal. Ninguna de las dos capas
fue afectada por la depuración: las cifras no cambian.

| Magnitud | Valor |
|---|---:|
| Páramo dentro del municipio | 10.142,10 ha (35,63 % del municipio) |
| Territorios agrícolas dentro del municipio | 15.851,05 ha (55,68 % del municipio) |
| **Traslape** | **2.608,09 ha** |
| **% del área de páramo afectada** | **25,72 %** |
| % del área agrícola que está sobre páramo | 16,45 % |
| % del área municipal | 9,16 % |
| Contraste: mismo traslape en planar 9377 | 2.603,95 ha |

### Desglose por complejo

| Complejo | Páramo en el municipio | Traslape | % afectado | n polígonos |
|---|---:|---:|---:|---:|
| Guantiva – La Rusia | 3.506,26 ha | 1.654,55 ha | **47,19 %** | 1 |
| Iguaque – Merchán | 6.635,85 ha | 953,54 ha | 14,37 % | 2 |

El dato fuerte para el paper: **casi la mitad del páramo de Guantiva–La Rusia dentro de
Sotaquirá está bajo cobertura agrícola.**

### Composición CORINE del traslape (nivel 3)

| Cobertura | ha | % del traslape |
|---|---:|---:|
| 2.3.1. Pastos limpios | 1.113,87 | 42,6 % |
| 2.4.2. Mosaico de pastos y cultivos | 796,78 | 30,5 % |
| 2.4.4. Mosaico de pastos con espacios naturales | 321,94 | 12,3 % |
| 2.3.3. Pastos enmalezados | 302,34 | 11,6 % |
| 2.4.3. Mosaico de cultivos, pastos y espacios naturales | 77,69 | 3,0 % |
| Suma por feature (control) | 2.612,61 | |

La suma por feature excede en 4,52 ha al traslape disuelto (2.608,09 ha) por solapes
internos entre polígonos CORINE. La cifra a citar es la disuelta.

### Respaldo normativo de la capa de páramos

| Complejo | Acto administrativo | Fuente |
|---|---|---|
| Guantiva – La Rusia | Resolución N.º 1296 del 28 de junio de 2017 | Minambiente |
| Iguaque – Merchán | Resolución N.º 1555 del 26 de septiembre de 2016 | Minambiente |

---

## 4. Defectos de datos hallados y cómo se resolvieron

Todos provienen de la exportación desde QGIS. **Los tres están corregidos en `index.html`
(depuración del 2026-09-17).**

### 4.1 «Erosión laminar» era un superconjunto, no una clase paralela

La capa rotulada *Erosión laminar* (78 features) contiene, según su propio atributo `CLAS`,
las tres subclases: laminar (23), laminar y surcos (34), terraceo y laminar (21). Las capas
*Erosión laminar y en surcos* y *Erosión por terraceo y laminar* eran **exactamente esos
subconjuntos** (verificado por hash de geometría: 34/34 y 21/21 features presentes en la
capa madre).

Sumar las tres filas del panel daba 33.557,30 ha = **117,9 % del municipio**. Imposible.

**Resuelto:** la capa madre pasó a llamarse **«Erosión hídrica (total)»** y las tres
subclases cuelgan de ella, sangradas con `└`, incluida la subclase *laminar* pura (23
features) que antes no tenía entrada propia. Panel y leyenda las tratan como **excluyentes**:
activar el total apaga las subclases y viceversa, también desde los presets y desde
«activar todo el grupo». Ya no es posible pintarlas ni leerlas como sumables.

### 4.2 La capa «Clase VI» contenía polígonos de Clase VII

Tres de sus cuatro features tenían atributo `CLASE = VII` (UCS_CP `VIIps1`, `VIIcs1`).
Solo una (`VIs1`, 352,55 ha) es realmente Clase VI.

**Resuelto:** las capas VI y VII se arman filtrando por el atributo `CLASE` sobre ambos
archivos, no por el archivo de origen. Efecto en las cifras:

| Clase | Antes (por archivo) | **Ahora (por atributo)** |
|---|---:|---:|
| VI | 1.852,96 ha · 6,51 % | **352,55 ha · 1,24 %** |
| VII | 7.305,74 ha · 25,66 % | **7.889,38 ha · 27,71 %** |

> Una estimación preliminar daba 7.891,24 ha para la Clase VII: esa cifra salía de
> deduplicar archivo por archivo antes de unir. El valor correcto bajo el método documentado
> —y el que el visor dibuja— es **7.889,38 ha**.

### 4.3 «Erosión por aluminio» era una copia de «Erosión climática» · CAPA RETIRADA

`GEO_NILA_EAL` y `GEO_NILA_ECLIM` eran **idénticas byte a byte**: mismo payload JSON de
18.219 bytes, misma geometría, mismos atributos (ambas declaraban `UCS_CP = "Erosión
climática"`, `CLASE = III`). No existía capa de erosión por aluminio: era un artefacto de
exportación.

**Resuelto:** la capa se retiró por completo del visor — payload GeoJSON, capa Leaflet,
entrada del panel, preset de erosión y leyenda. No queda ninguna referencia.

Queda constancia de que «Erosión climática» **sigue compartiendo geometría con la Clase
III** (diferencia simétrica 5,7 × 10⁻¹⁸ deg², ruido numérico). Es legítimo: ambas describen
la misma unidad cartográfica de suelos desde dos atributos distintos. No se suman.

### 4.4 Features que el visor nunca dibujaba · PURGADOS

Seis features de las clases agrológicas estaban almacenadas en coordenadas **proyectadas
(metros, EPSG:9377)** dentro de archivos declarados en grados: 4 en Clase IV, 1 en Clase VI,
1 en Clase VII. Leaflet las situaba fuera del planeta, así que **el visor nunca las
dibujaba**, pero engordaban el panel y el archivo. Las seis eran duplicados (99,5–99,8 % de
solape) de features ya presentes en grados.

**Resuelto:** purgadas de `index.html` (−119.501 bytes). Junto con ellas se eliminaron de
`GEO_MUNICIPIOS` los dos municipios ajenos a Boyacá que habían entrado al recortar la capa
nacional: **Yacopí** (Cundinamarca, DANE 25885), sin geometría (`"geometry": null`), y
**Bolívar** (Santander, DANE 68101), con una geometría degenerada de área nula. La capa
queda en los **123 municipios de Boyacá**, exactos.

Efecto en los badges del panel, que ahora **igualan lo que se dibuja**:

| Capa | Badge antes | Badge ahora |
|---|---:|---:|
| Clase IV | 9 | **5** |
| Clase VI | 4 | **1** |
| Clase VII | 4 | **5** |
| Municipios | 125 | **123** |

Todos los conteos del panel se derivan ahora de `features.length`; ninguno está escrito a
mano, de modo que el rótulo no puede volver a desincronizarse de los datos.

La purga movió la Clase IV de 4.873,13 a **4.873,52 ha** (+0,39 ha): la deduplicación
anterior conservaba la copia en metros y descartaba su gemela en grados; ahora se mide
exactamente el polígono que el visor dibuja.

---

## 5. Limitaciones conocidas

### De la capa de veredas

- **Desempalme Sotaquirá–Cómbita.** La capa original traía 51 features: 30 de Sotaquirá
  (`DPTOMPIO = 15763`) y 21 de municipios vecinos, resultado de recortar la capa nacional de
  veredas contra un polígono municipal de otro vintage. Veinte eran astillas de 0,02 a
  1,38 ha (7,8 ha en total, índice Polsby-Popper 0,0006–0,02, todas multiparte de 2 a 77
  fragmentos). La vigésimo primera, `15204008` (Cómbita), aportaba **707,3 ha en 47 partes**:
  un desacuerdo sistemático entre ambas capas sobre ~7 km² del límite sur. Las 21 se
  eliminaron.
- **Dos veredas con geometría generalizada.** Frente al `AREA_HA` oficial:
  BOSIGAS CENTRO −5,21 % (376,99 vs 397,73 ha) y CARREÑO −1,59 % (1.194,61 vs 1.213,86 ha).
  Las otras 28 caen entre −0,48 % y +0,42 %. Atribuible a generalización al preparar la capa
  del visor; 40 ha sobre 28.400, sin efecto en los totales.
- **30 veredas, no 26.** Las 30 son el Nivel de Referencia de Veredas DANE 2024 (atributos
  `VIGENCIA = 2009`, `FUENTE = CATASTRO IGAC`), verificado contra el servicio oficial:
  coincidencia uno a uno de los 30 `CODIGO_VER`, sin sobrantes ni faltantes. Las 26 provienen
  de las fichas de Corpoboyacá y del mapa veredal de Planeación de Boyacá sobre base
  cartográfica IGAC 1988. Son vintages distintos, no un error.

Consulta de verificación:

```
https://portalgis.dane.gov.co/mparcgis/rest/services/NIVEL_DE_REFERENCIA_DE_VEREDAS/
Serv_CapasNivelReferenciaVeredas_2024/MapServer/1/query
  ?where=CODIGO_VER+LIKE+'15763%'
  &outFields=CODIGO_VER,NOMBRE_VER,AREA_HA,VIGENCIA,FUENTE
  &returnGeometry=false&f=json
```

Devuelve 30 registros (confirmado con `returnCountOnly=true` → `{"count":30}`;
`maxRecordCount` de la capa = 2000, sin truncamiento).

### De las demás capas

- **Polígono municipal interno.** El feature de Sotaquirá dentro de `GEO_MUNICIPIOS` mide
  29.208,98 ha, un 2,6 % por encima de las referencias oficiales. Por eso el denominador de
  todos los porcentajes es la suma de las 30 veredas y no ese polígono.
- **`GEO_MUNICIPIOS` ya contiene exactamente los 123 municipios de Boyacá.** Traía dos
  features ajenos al departamento, ambos retirados: **Yacopí** (Cundinamarca, DANE 25885),
  que venía sin geometría, y **Bolívar** (Santander, DANE 68101), cuyo polígono era un
  fragmento degenerado de **área nula** (bbox de 1,5 × 0,7 km al noroeste, fuera de Boyacá)
  aunque su atributo `MpArea` declaraba 1.008,86 km². Ninguno aportaba superficie al mapa;
  sí falseaban el conteo. El popup del departamento también dice ahora 123 municipios.
- **Registros GBIF con coordenada repetida.** Las capas de especies tienen muchos puntos
  sobre la misma coordenada (1.032 en *Quercus humboldtii*, 482 en *Zonotrichia capensis*).
  **No son registros duplicados**: se verificó que ningún par comparte número de catálogo.
  Es redondeo de coordenada y repetición de localidad, propios de GBIF. No se tocaron.
- **Auditoría de duplicados completa.** Se aplicó hash de geometría (SHA-1, coordenadas a
  1 × 10⁻⁷) a las 40 colecciones y a sus 4.666 features. No quedan capas idénticas salvo el
  par legítimo Clase III / Erosión climática (§4.3), ni capas vacías, truncadas, con anillos
  sin cerrar o con geometrías fuera del rango de coordenadas.

---

## 6. Desempeño técnico

**Entorno de medición:** Chrome 148, Windows 11 x64, 16 núcleos, 16 GB RAM, servidor HTTP
local. **Todas las cifras de esta sección se midieron sobre el archivo depurado.**

### Peso

| Componente | Bytes | MB | % |
|---|---:|---:|---:|
| `index.html` completo | 4.181.335 | 3,99 | 100 % |
| **GeoJSON embebidos (40 colecciones)** | **4.102.191** | **3,91** | **98,1 %** |
| · polígonos y líneas | 2.078.325 | 1,98 | 49,7 % |
| · puntos (registros de especies) | 2.023.866 | 1,93 | 48,4 % |
| HTML + CSS + JS | 79.144 | 0,08 | 1,9 % |

La depuración quitó **134.279 bytes (−3,1 %)** frente a los 4.315.614 bytes originales:
18.219 de la capa de aluminio, 119.501 de los seis features en metros, 144 de Yacopí y 364
de Bolívar, contra unos 4.000 de código nuevo.

Toda la cartografía viaja embebida en el HTML: no hay peticiones de datos en tiempo de
ejecución. Únicas dependencias externas: Leaflet 1.9.4 y Leaflet.markercluster 1.5.3 (CDN
unpkg).

### Features y capas

| Magnitud | Antes | **Ahora** |
|---|---:|---:|
| Colecciones GeoJSON embebidas | 41 | **40** |
| Features con geometría en el payload | 4.675 | **4.665** |
| **Capas conmutables en el panel** | 44 | **44** |
| Filas visibles del panel (capas + 6 subencabezados) | 50 | **50** |

> **Sobre el «27 capas» del manuscrito:** el panel expone **44 capas conmutables**
> (base 5 · degradación 15 · biodiversidad 24) repartidas en 10 grupos temáticos; las «50»
> de la versión anterior de este informe contaban también los 6 subencabezados
> (🐦 AVES, 🌳 FLORA…), que no son capas. Sigue pendiente definir a qué subconjunto se
> refiere la cifra de 27 antes de citarla.

### Tiempos de carga

| Métrica | Primera carga | Cargas siguientes (Leaflet en caché) |
|---|---:|---:|
| `responseEnd` | 84 ms | 21–34 ms |
| `domInteractive` | 388 ms | 206–218 ms |
| `loadEventEnd` | **405 ms** | **216 · 217 · 224 ms** |

Cuatro navegaciones con URL distinta (sin caché de documento) sobre el archivo depurado. La
primera incluye la descarga en frío de Leaflet y markercluster desde unpkg; las tres
siguientes no. Medido en localhost: **no incluye latencia de red para el payload propio**;
en producción hay que sumar la transferencia de 3,99 MB. La referencia anterior a la
depuración era 764 ms de primera carga sobre 4,12 MB.

Heap JS tras la carga inicial: 30 MB; 69 MB con el preset de biodiversidad regional activo.

### Tiempo de activación por preset

Activación sincrónica, una sola por carga limpia en el caso del preset pesado.

| Preset | Capas activas | Features dibujadas | Tiempo |
|---|---:|---:|---:|
| Geomorfología (`d_geomorf`) | 4 | 154 | 5,6 ms |
| Clases agrológicas (`d_clases`) | 8 | 144 | 5,7 ms |
| Erosión (`d_erosion`) | 4 | 207 | 18,0 ms |
| Coberturas (`d_cobertura`) | 4 | 399 | 23,4 ms |
| **Biodiversidad regional (`b_regional`) — el más pesado** | **22** | **4.157** | **133,9 ms** |

El preset de erosión pasó de 7 entradas a **4 capas y 207 features** (de los cuales 81 son
polígonos de erosión: el total de erosión hídrica más erosión climática). Antes activaba 139
polígonos de erosión, 58 de ellos repintando geometría ya dibujada.

**Observación de robustez:** encadenar activaciones repetidas del preset pesado sin dejar
respirar al hilo principal bloquea el renderer más de 45 s (reconstrucción del clustering en
cada ciclo). En uso normal —una activación por interacción— el coste es el de la tabla.

---

## 7. Historial de correcciones

### Correcciones aplicadas a `index.html`

**Depuración del 2026-09-16**

1. `GEO_VEREDAS` filtrada a `DPTOMPIO = 15763`: 51 → 30 features (−57.530 bytes).
   Verificado round-trip byte-idéntico antes de reemplazar.
2. Rótulo y `count` de veredas derivados de `GEO_VEREDAS.features.length`.
3. Join de `Name` desde `NOMBRE_VER` del servicio DANE (+260 bytes). Nombres verbatim, sin
   tildes ni correcciones: `CORRIZAL ALTO`, `AVENDANOS`, `CARRENO`, `CATOBA`, `SOTAQUIRA`,
   `GUAGUANI`.

**Depuración del 2026-09-17**

4. **Capa «Erosión por aluminio (Al³⁺)» retirada** por completo (§4.3).
5. **Clases VI y VII reagrupadas por el atributo `CLASE`** mediante el helper
   `porAtributo()`; los payloads originales quedan intactos y auditables (§4.2).
6. **«Erosión hídrica (total)» + tres subclases excluyentes**, con el mecanismo `FAMILIES` /
   `setLayer()` que impide tener a la vez el total y una subclase (§4.1).
7. **Purga de los 6 features en metros y de los municipios ajenos a Boyacá** (Yacopí y
   Bolívar); round-trip byte-idéntico verificado antes de reescribir cada colección (§4.4).
8. **Todos los conteos del panel derivados de `features.length`.**
9. **Pestaña Info corregida**: área 291,6 → **284 km²** (cifra oficial, coherente con las
   28.466,66 ha medidas); altitud → **2.860 m s. n. m.**, cota de la cabecera municipal que
   usa el proyecto, en lugar del atributo `MpAltitud = 2650` de la capa de municipios; se
   añadió **Veredas: 30 (DANE 2024)**, derivado de la capa. Se retiró la fila «Rural 75 %»
   por no tener fuente verificable. **La población se mantiene en 11.425 hab.**, la cifra
   del proyecto: solo debe actualizarse contra las proyecciones municipales oficiales del
   DANE, no contra fuentes secundarias. El popup del departamento pasó de «125 municipios»
   a **123**, que es la cifra real de Boyacá.

### Verificación de cada corrección

Sobre el archivo resultante se comprueba, de forma automática: los conteos de cada capa
contra los features realmente instanciados en Leaflet; la ausencia total de la capa retirada
(payload, capa, entrada de panel, preset y leyenda); la exclusividad entre el total de
erosión hídrica y sus subclases, incluida la ruta del «activar todo el grupo» y la de los
presets; que ningún preset apunte a un identificador de capa inexistente; que no quede
ningún feature con `|longitud| > 180`; y que ningún municipio quede sin geometría. Se
verifica además que el visor cargue en el navegador sin errores de consola.

Las reescrituras de colecciones GeoJSON se hacen siempre con verificación de round-trip
byte a byte antes de reemplazar la línea correspondiente.

### Archivos del proyecto

| Archivo | Contenido |
|---|---|
| `index.html` | El visor completo, con la cartografía embebida |
| `README.md` | Descripción, fuentes por capa, método y procedimiento de regeneración |
| `INFORME_AUDITORIA.md` | Este documento |
| `calcular_areas.py` | Script reproducible de la §2, con la agrupación por atributo y el método documentado en el encabezado |
| `areas_sotaquira.csv` | Tabla de la §2 en CSV, con área planar y procedencia por fila |
| `capas NILA/` | Exportaciones QGIS de origen, con las advertencias de nomenclatura y CRS de su propio README |
| `descartadas/` | Capa retirada por daño de exportación, conservada como evidencia |

### Cuestiones abiertas

- **El «27 capas» del manuscrito** no corresponde a ningún subconjunto identificado del
  panel, que expone 44 capas conmutables. Hay que definir a qué se refiere antes de citarlo.
- **Población y altitud de la pestaña Info** (11.425 hab. y 2.860 m s. n. m.) son las cifras
  que el proyecto viene usando. Si se actualizan, debe ser contra las proyecciones de
  población municipal del DANE y una fuente de altitud citable, no contra fuentes
  secundarias. Queda por decidir si se repone la fila «Rural %», retirada por no tener
  fuente verificable.
