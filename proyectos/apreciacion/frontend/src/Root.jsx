import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Home from "./Home";
import Login from "./Login";
import App from "./App.jsx";

// Controla el acceso: Home (público) → tableros (requiere sesión Firebase).
// El dashboard (App) NO se toca; solo se envuelve con una barra de sesión.
export default function Root() {
  const [user, setUser] = useState(undefined);   // undefined = cargando
  const [vista, setVista] = useState("home");     // home | app

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  const salir = () => signOut(auth).then(() => setVista("home"));

  if (user === undefined) {
    return <div className="auth-wrap"><div className="auth-loading">Cargando…</div></div>;
  }

  if (vista === "home") {
    return <Home user={user} onEntrar={() => setVista("app")} onLogout={salir} />;
  }

  // vista === "app": exige sesión
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
