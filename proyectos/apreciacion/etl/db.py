"""Conexion a PostgreSQL — leida de forma segura desde variables de entorno.

La cadena con contrasena vive en el archivo .env (ignorado por git), nunca en
el codigo. Se lee con python-dotenv. Uso:

    from db import get_engine
    eng = get_engine()

O como script para probar la conexion:

    python etl/db.py
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Carga apreciacion/.env (un nivel arriba de etl/)
BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


def get_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "Falta DATABASE_URL. Copia .env.example a .env y pon tu cadena de "
            "conexion (ver instrucciones dentro del archivo)."
        )
    return url


def get_engine():
    """Devuelve un SQLAlchemy Engine. pool_pre_ping evita conexiones muertas."""
    return create_engine(get_url(), pool_pre_ping=True, future=True)


def probar():
    """Prueba la conexion e imprime version del servidor. No expone la clave."""
    try:
        eng = get_engine()
        with eng.connect() as con:
            ver = con.execute(text("SELECT version()")).scalar_one()
        host = get_url().split("@")[-1].split("/")[0]
        print(f"OK conexion a {host}")
        print(f"   {ver}")
        return 0
    except Exception as e:  # noqa: BLE001
        print(f"ERROR de conexion: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(probar())
