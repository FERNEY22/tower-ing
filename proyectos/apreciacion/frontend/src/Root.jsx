import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Home from "./Home";
import Login from "./Login";
import App from "./App.jsx";

// Controla el acceso: Home (PÚBLICO) → tableros (requieren sesión Firebase).
//
// Regla clave: el Home NO debe esperar a Firebase. Antes toda la app arrancaba
// en estado "cargando" a la espera de onAuthStateChanged; si ese callback no
// respondía (IndexedDB/almacenamiento bloqueado, modo incógnito, o init
// colgada), TODA la app —incluido el Home público— quedaba congelada en
// "Cargando…" y no se veía nada. Ahora el Home se pinta de inmediato y solo la
// entrada a los tableros consulta la sesión.
export default function Root() {
  const [user, setUser] = useState(undefined); // undefined = sesión resolviéndose
  const [vista, setVista] = useState("home");   // home | app

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    // Failsafe: si Firebase no responde en 3s, asumimos "sin sesión" para no
    // dejar la UI atascada. Solo actúa si el callback aún no llegó.
    const t = setTimeout(() => setUser((prev) => (prev === undefined ? null : prev)), 3000);
    return () => { unsub(); clearTimeout(t); };
  }, []);

  const salir = () => { signOut(auth).catch(() => {}); setVista("home"); };

  // HOME: público, se muestra siempre sin esperar a Firebase.
  if (vista === "home") {
    return <Home user={user || null} onEntrar={() => setVista("app")} onLogout={salir} />;
  }

  // TABLEROS: requieren sesión.
  if (user === undefined) {
    return <div className="auth-wrap"><div className="auth-loading">Verificando sesión…</div></div>;
  }
  if (!user) return <Login onVolver={() => setVista("home")} />;

  return (
    <>
      <div className="sesion-bar">
        <button className="sb-link" onClick={() => setVista("home")}>← Inicio</button>
        <span className="sb-user">👤 {user.email}</span>
        <button className="sb-out" onClick={salir}>Cerrar sesión</button>
      </div>
      <App />
    </>
  );
}
