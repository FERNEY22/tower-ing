"""API de Apreciacion (v3) — replica los tableros del Excel.

    GET /api/health
    GET /api/anios                         -> [2016, 2020, 2022, 2025]
    GET /api/filtros?anio=
    GET /api/tablero?anio=&estamento=&programa=
    GET /api/comparativo?anio=&estamento=

Correr (desde backend/):  uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import servicios

app = FastAPI(title="Apreciacion ETITC — API", version="0.3.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def _startup():
    # precalienta la cache en un hilo aparte para no demorar el arranque
    import threading
    threading.Thread(target=servicios.precalentar, daemon=True).start()


@app.post("/api/cache/clear")
def cache_clear():
    servicios.limpiar_cache()
    return {"ok": True}


@app.get("/api/health")
def health():
    return servicios.health()


@app.get("/api/anios")
def anios():
    return servicios.anios()


@app.get("/api/filtros")
def filtros(anio: int = Query(...)):
    return servicios.filtros(anio)


@app.get("/api/tablero")
def tablero(anio: int = Query(...), estamento: str | None = None,
            programa: str | None = None, base: str | None = None):
    try:
        return servicios.tablero(anio, estamento, programa, base)
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/api/comparativo")
def comparativo(anio: int = Query(...), estamento: str | None = None):
    try:
        return servicios.comparativo(anio, estamento)
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/api/historico")
def historico():
    try:
        return servicios.historico()
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/api/historico_caracteristicas")
def historico_caracteristicas():
    try:
        return servicios.historico_caracteristicas()
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/api/instrumento2025")
def instrumento2025():
    try:
        return servicios.instrumento_2025()
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/api/cobertura")
def cobertura():
    try:
        return servicios.cobertura()
    except Exception as e:
        raise HTTPException(400, str(e))
