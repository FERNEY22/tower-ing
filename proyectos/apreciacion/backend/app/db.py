"""Conexion del backend a PostgreSQL (Supabase, en la nube).

Lee DATABASE_URL del mismo archivo .env del proyecto (una sola configuracion).
La base en la nube es la UNICA fuente de verdad: aqui no se leen archivos
locales de datos.
"""

import os
from pathlib import Path
from functools import lru_cache

from dotenv import load_dotenv
from sqlalchemy import create_engine, event

# apreciacion/.env  (backend/app/db.py -> parents[2] = apreciacion/)
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


@lru_cache
def get_engine():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("Falta DATABASE_URL en apreciacion/.env")
    # Modo LOCAL (sin Supabase): SQLite con data_local.db montada como esquema
    # 'public' via ATTACH, para que las consultas 'public.tabla' funcionen igual.
    if url.startswith("sqlite"):
        main = (BASE_DIR / "main_local.db").as_posix()
        data = (BASE_DIR / "data_local.db").as_posix()
        eng = create_engine(f"sqlite+pysqlite:///{main}",
                            connect_args={"check_same_thread": False}, future=True)

        @event.listens_for(eng, "connect")
        def _attach_public(dbapi_con, _rec):
            dbapi_con.execute(f"ATTACH DATABASE '{data}' AS public")

        return eng
    return create_engine(url, pool_pre_ping=True, pool_size=5, future=True)
