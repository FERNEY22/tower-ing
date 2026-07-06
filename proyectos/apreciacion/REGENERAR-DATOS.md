# Reciclaje del backend — regenerar los datos

La app quedó **estática** (lee `frontend/public/datos/*.json`). El backend + ETL
**ya no corren en vivo**: solo sirven para **regenerar esos JSON** si algún día
cambian los datos.

## Pasos (solo cuando cambien los datos)

```bash
# 1) Reconstruir la base local desde salida/*.parquet + Excel de 2016
python etl/construir_local_sqlite.py

# 2) Levantar el backend contra esa base local
cd backend && python -m uvicorn app.main:app --port 8000

# 3) (otra terminal) Regenerar los snapshots JSON estáticos
python etl/construir_snapshots.py
```

Listo: los `frontend/public/datos/*.json` quedan actualizados y la app los usa.

> `data_local.db` / `main_local.db` son locales y regenerables (paso 1) — están en
> `.gitignore`, no se suben.
