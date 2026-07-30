/* =========================================================================
   App.tsx — Rutas y guarda de ingreso.

   Nadie llega a una leccion sin haber pasado por la pantalla de ingreso.
   ========================================================================= */

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useParams,
} from "react-router-dom";
import { PantallaIngreso } from "@/plataforma/ingreso/PantallaIngreso";
import { PanelLecciones } from "@/plataforma/panel/PanelLecciones";
import { PracticaLibre } from "@/practica/PracticaLibre";
import { MotorLeccion } from "@/lecciones/MotorLeccion";
import { estaImplementada } from "@/lecciones/registro";
import { PanelDocente } from "@/plataforma/docente/PanelDocente";
import { useSesion } from "@/estado/sesionStore";
import { leccionPorId } from "@/config";

/**
 * Prefijo del que cuelgan todas las rutas. El juego vive en un subdirectorio
 * del sitio (tower-ing.com/forms/electronica1/), asi que "/panel" es en
 * realidad "/forms/electronica1/panel".
 *
 * Sale de BASE_URL —el `base` de vite.config.ts— y no de una cadena escrita a
 * mano, para que no puedan desincronizarse: si el base cambia y el basename no,
 * ninguna ruta coincide, todo cae en el comodin "*" y la aplicacion se queda
 * rebotando contra la raiz del dominio.
 *
 * En desarrollo BASE_URL vale "/" y esto queda en "", que es lo correcto.
 */
const RAIZ = import.meta.env.BASE_URL.replace(/\/+$/, "");

function Protegida({ children }: { children: React.ReactNode }) {
  const identidad = useSesion((s) => s.identidad);
  if (!identidad) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Marcador de posicion hasta que el motor y el lienzo esten listos. */
function EnConstruccion({ titulo, desde }: { titulo: string; desde: string }) {
  return (
    <div className="wrap">
      <div className="eyebrow">
        <span className="dot" /> {desde}
      </div>
      <h1>{titulo}</h1>
      <p className="lead">
        Esta pantalla se construye en las fases siguientes: primero el modelo de
        circuito y el solver, después el lienzo y las lecciones.
      </p>
      {/* Link, no <a>: una recarga completa perderia la sesion en memoria. */}
      <p style={{ marginTop: 18 }}>
        <Link to="/panel">Volver al panel</Link>
      </p>
    </div>
  );
}

function RutaLeccion() {
  const { id } = useParams();
  const declarada = id ? leccionPorId(id) : undefined;
  if (!declarada) return <Navigate to="/panel" replace />;

  // Declarada en config pero todavia sin circuito ni distractores: llega en
  // la fase 8.
  if (!id || !estaImplementada(id)) {
    return (
      <EnConstruccion
        titulo={declarada.titulo}
        desde={`Lección ${declarada.n} · ${declarada.tema}`}
      />
    );
  }
  return <MotorLeccion />;
}

function Inicio() {
  const identidad = useSesion((s) => s.identidad);
  if (identidad) return <Navigate to="/panel" replace />;
  return <PantallaIngreso />;
}

export default function App() {
  return (
    <BrowserRouter basename={RAIZ}>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route
          path="/panel"
          element={
            <Protegida>
              <PanelLecciones />
            </Protegida>
          }
        />
        <Route
          path="/leccion/:id"
          element={
            <Protegida>
              <RutaLeccion />
            </Protegida>
          }
        />
        <Route
          path="/practica-libre"
          element={
            <Protegida>
              <PracticaLibre />
            </Protegida>
          }
        />
        {/* El panel docente tiene su propia autenticación: no pasa por la
            sesión de estudiante. */}
        <Route path="/docente" element={<PanelDocente />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
