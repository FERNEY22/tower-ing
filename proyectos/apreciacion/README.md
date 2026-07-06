# Apreciación — Autoevaluación institucional ETITC

App de analítica de las encuestas de apreciación/autoevaluación (modelo de
acreditación) de la ETITC. Lee los datos históricos, los unifica y sirve
**tableros interactivos por año y la evaluación histórica completa**.

No es un HTML estático: es una base de datos real + un backend en Python donde
vive la lógica de análisis + un frontend que consume una API.

## Arquitectura

```
Excel (Fuente/)  ──►  ETL Python  ──►  PostgreSQL (nube)  ──►  FastAPI  ──►  React + Vite
  4 años              (pandas)         Supabase/Neon          (análisis)     (tableros)
  heterogéneos        armoniza         hechos + agregados     endpoints      gráficos
                                                              + Firebase auth (token)
```

- **ETL (`etl/`)** — Python/pandas. Unifica los años (columnas y escalas
  distintas) a un esquema canónico y calcula agregados. Genera Parquet +
  reporte de calidad. De solo lectura sobre `Fuente/`.
- **PostgreSQL gestionado** — servidor real e independiente (Supabase o Neon),
  consultable con cualquier cliente SQL. Guarda la tabla de hechos + dimensiones
  + agregados.
- **Backend (`backend/`)** — FastAPI. La **lógica de apreciación** vive aquí como
  módulos Python (promedios ponderados, brechas por estamento, tendencia
  histórica). Endpoints REST + carga de nuevos datos (`/upload`).
- **Auth** — Firebase Auth (solo identidad). FastAPI verifica el token; la BD
  vive aparte. Auth y datos están desacoplados.
- **Frontend (`frontend/`)** — React + Vite. Tableros dinámicos, filtros por
  año/estamento/programa/factor, y vista histórica 2016→2025.

## Modelo de datos

Jerarquía del instrumento: **Factor → Característica → Aspecto → Pregunta**,
segmentado por Año · Estamento · Programa · Facultad · Sede · Género · Ciudad.

### Decisiones de armonización (ver `etl/config.py`)

| Tema | Regla |
|------|-------|
| Escala | 2020/2022/2025 usan escala verbal **2–10**. Se normaliza a **0–100**: `(v−2)/8×100`. |
| Nulos | En 2020 el valor `0` = *no responde / no aplica* → se trata como **nulo**. |
| 2016 | Viene **pre-agregado** (porcentajes/puntajes por pregunta) → entra en la capa de **agregados**, no en la tabla de hechos. |
| Estamentos | Catálogo canónico: `Profesores/Docentes→Docentes`, `Empresarios/Empleadores→Empleadores`, `Funcionarios Públicos→Administrativos`. |
| Programa | Cadenas multi-programa (`;`) → `MÚLTIPLE`; vacío → `INSTITUCIONAL`. |
| Llave histórica | El **Factor (F1–F10)** y la **Característica** son estables entre años; el Aspecto se numera distinto cada año. |

### Volumen

| Año | Filas de respuesta | Naturaleza |
|-----|-------------------:|-----------|
| 2016 | ~1.500 | pre-agregado |
| 2020 | 96.170 | respuesta individual |
| 2022 | 255.874 | respuesta individual |
| 2025 | 469.055 | respuesta individual |

~820k filas — pequeño para Postgres; el reto es la *armonización*, no el volumen.

## Cómo correr

### 1. ETL (no requiere la nube)
```powershell
cd etl
pip install -r requirements.txt
python harmonizar.py      # -> salida/hecho_respuesta.parquet + reporte_calidad.md
```

### 2. Cargar a Postgres (requiere `.env` con DATABASE_URL)
```powershell
python etl/cargar_postgres.py    # crea esquema (tabla por año) + carga hechos
python etl/cargar_2016.py        # incorpora 2016 a los agregados
```

### 3. Backend (FastAPI, lee de la nube)
```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
# API en http://127.0.0.1:8000  ·  demo en /  ·  docs en /docs
```

### 4. Frontend (React + Vite)
```powershell
cd frontend
npm install
npm run dev      # http://localhost:5173 (proxy /api -> :8000)
```

## Endpoints

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/anios` | años disponibles (2016, 2020, 2022, 2025) |
| `GET /api/estamentos` | catálogo de estamentos |
| `GET /api/tablero?anio=&estamento=&programa=` | resumen de un año |
| `GET /api/historico?estamento=&programa=` | serie histórica por factor |

## Despliegue (cuando esté al 100%)

- **Frontend → Netlify** (`npm run build`, publicar `dist/`; `VITE_API_URL` = URL de Render).
- **Backend → Render** (servicio web Python; variable de entorno `DATABASE_URL`).

## Estado

- [x] Perfilado y decisiones de armonización
- [x] ETL de armonización (2020/2022/2025) + reporte de calidad
- [x] Incorporar 2016 a la capa de agregados
- [x] Provisionar Postgres (Supabase) + carga (una tabla por año + vista histórica)
- [x] Backend FastAPI (endpoints + módulos de análisis) + demo en navegador
- [x] Frontend React + Vite (tableros por año + histórico)
- [ ] Auth Firebase (verificación de token)
- [ ] `/api/upload` para recibir Excel nuevos
- [ ] Despliegue Netlify + Render
