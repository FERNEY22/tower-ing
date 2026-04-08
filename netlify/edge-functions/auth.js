export default async function handler(req, context) {
  const password = Deno.env.get("PROTECTED_PAGE_PASSWORD");
  const cookie = req.headers.get("cookie") || "";

  if (cookie.includes("auth_session=valid")) {
    return context.next();
  }

  if (req.method === "POST") {
    const body = await req.text();
    const params = new URLSearchParams(body);
    if (params.get("password") === password) {
      return new Response("", {
        status: 302,
        headers: {
          Location: req.url,
          "Set-Cookie": "auth_session=valid; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400",
        },
      });
    }
  }

  return new Response(`
    <html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#111">
    <form method="POST" style="background:#222;padding:2rem;border-radius:8px;display:flex;flex-direction:column;gap:1rem">
      <h2 style="color:white;margin:0">Acceso restringido</h2>
      <input type="password" name="password" placeholder="Contraseña" style="padding:0.5rem;border-radius:4px;border:none"/>
      <button type="submit" style="padding:0.5rem;background:#0ea5e9;color:white;border:none;border-radius:4px;cursor:pointer">Entrar</button>
    </form></body></html>
  `, {
    status: 401,
    headers: { "Content-Type": "text/html" },
  });
}

export const config = { path: ["/dashboard/*", "/proyectos/*"] };