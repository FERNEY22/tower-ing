import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

// Inicio de sesión (Firebase). Los usuarios se administran en la consola de
// Firebase del proyecto tower-ing; aquí solo se autentican.
export default function Login({ onVolver }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setError(""); setCargando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      // onAuthStateChanged (en Root) toma el control desde aquí.
    } catch (err) {
      const c = err.code || "";
      setError(
        ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(c)
          ? "Correo o contraseña incorrectos."
          : c === "auth/invalid-email" ? "Correo inválido."
          : c === "auth/too-many-requests" ? "Demasiados intentos. Espera un momento."
          : "No se pudo iniciar sesión. Intenta de nuevo."
      );
    } finally { setCargando(false); }
  }

  return (
    <div className="auth-wrap">
      <form className="login-card" onSubmit={entrar}>
        <div className="login-logo">🎓</div>
        <h2>Apreciación ETITC</h2>
        <p className="login-sub">Inicia sesión para acceder a los tableros de autoevaluación.</p>

        <label>Correo</label>
        <input type="email" value={email} autoComplete="username"
               onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required />

        <label>Contraseña</label>
        <input type="password" value={pass} autoComplete="current-password"
               onChange={(e) => setPass(e.target.value)} placeholder="••••••••" required />

        <button className="btn-login" type="submit" disabled={cargando}>
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>

        {error && <p className="login-error">{error}</p>}

        {onVolver && (
          <button type="button" className="login-volver" onClick={onVolver}>← Volver al inicio</button>
        )}
      </form>
    </div>
  );
}
