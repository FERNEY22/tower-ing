"""Congela las respuestas del backend en JSON estáticos (modo sin servidor).

Lee del backend en http://127.0.0.1:8000 (debe estar corriendo) y genera en
frontend/public/datos/ un archivo por endpoint. El frontend, en modo estático,
lee esos JSON en vez de la API. Volver a correr esto SOLO si cambian los datos.

Uso: python etl/construir_snapshots.py
"""
import json
import urllib.request
from pathlib import Path

BASE = "http://127.0.0.1:8000/api"
OUT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "datos"


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def q(**p):
    from urllib.parse import urlencode
    return "?" + urlencode({k: v for k, v in p.items() if v not in (None, "")})


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    anios = get("/anios")
    save("anios", anios)

    # singletons (sin parámetros)
    for name, path in [("historico", "/historico"),
                       ("historico_caracteristicas", "/historico_caracteristicas"),
                       ("instrumento2025", "/instrumento2025"),
                       ("cobertura", "/cobertura")]:
        save(name, get(path))

    filtros, tablero, comparativo = {}, {}, {}
    n_tab = n_comp = 0
    for a in anios:
        f = get(f"/filtros{q(anio=a)}")
        filtros[str(a)] = f
        ests = [""] + f.get("estamento", [])
        progs = [""] + f.get("programa", [])
        bases = ["", "institucional", "programas"] if a == 2016 else [""]

        for est in ests:
            # comparativo: solo depende del estamento
            key_c = f"{a}|{est}"
            if key_c not in comparativo:
                comparativo[key_c] = get(f"/comparativo{q(anio=a, estamento=est)}")
                n_comp += 1
            # tablero: estamento × (base / programa) según la lógica de la UI
            for base in bases:
                if base == "":
                    for prog in progs:
                        key = f"{a}|{est}|{prog}|"
                        tablero[key] = get(f"/tablero{q(anio=a, estamento=est, programa=prog)}")
                        n_tab += 1
                else:
                    key = f"{a}|{est}||{base}"
                    tablero[key] = get(f"/tablero{q(anio=a, estamento=est, base=base)}")
                    n_tab += 1
        print(f"  {a}: tablero+comparativo generados")

    save("filtros", filtros)
    save("tablero", tablero)
    save("comparativo", comparativo)
    print(f"OK -> {OUT} | tablero={n_tab} comparativo={n_comp} años={anios}")


def save(name, data):
    (OUT / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
