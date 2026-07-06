// Home de Apreciación: cabezote + descripción del proceso + pie de página.
// Es la primera página; el botón "Entrar a los tableros" lleva al dashboard
// (que exige inicio de sesión).

const FACTORES = [
  "Identidad institucional", "Gobierno institucional y transparencia",
  "Desarrollo, gestión y sostenibilidad", "Mejoramiento continuo y autorregulación",
  "Estructura y procesos académicos", "Investigación, innovación y creación",
  "Impacto social", "Bienestar institucional",
  "Comunidad de profesores", "Comunidad de estudiantes", "Comunidad de egresados",
];
const ESTAMENTOS = ["Estudiantes", "Docentes", "Egresados", "Administrativos", "Directivos", "Empleadores"];
const ETAPAS = [
  ["1", "Planeación y diseño", "Se define el modelo de autoevaluación y se construyen los instrumentos (encuestas) por estamento, alineados al modelo de acreditación del CNA."],
  ["2", "Aplicación", "Se sensibiliza a la comunidad y se aplican las encuestas: estudiantes, docentes, egresados, administrativos, directivos y empleadores valoran la institución y los programas."],
  ["3", "Sistematización", "Un pipeline ETL consolida las respuestas de todos los años, normaliza escalas y homologa el modelo (factores, características, aspectos y preguntas)."],
  ["4", "Análisis", "Se calculan promedios, % favorable y brechas por factor, característica, programa y estamento, y se comparan Programas vs. Institucional y la evolución histórica."],
  ["5", "Mejoramiento", "Los resultados alimentan los planes de mejoramiento continuo, la rendición de cuentas y la toma de decisiones institucional."],
];

export default function Home({ user, onEntrar, onLogout }) {
  return (
    <div className="home">
      {/* ── Cabezote ── */}
      <header className="home-header">
        <div className="home-header-in">
          <div className="brand">
            <span className="brand-logo">🎓</span>
            <div>
              <b>Apreciación ETITC</b>
              <span>Autoevaluación Institucional · 2016–2025</span>
            </div>
          </div>
          <div className="home-actions">
            {user && <span className="home-user" title={user.email}>👤 {user.email}</span>}
            <button className="btn-enter" onClick={onEntrar}>Entrar a los tableros →</button>
            {user && <button className="btn-out" onClick={onLogout}>Salir</button>}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="home-hero-in">
          <h1>El proceso de apreciación de la ETITC</h1>
          <p>
            La <b>apreciación</b> es la valoración que hace la comunidad académica sobre la calidad de la
            Escuela Tecnológica Instituto Técnico Central y de sus programas. Esta plataforma consolida y
            moderniza esos resultados de <b>2016 a 2025</b> en tableros interactivos.
          </p>
          <button className="btn-enter big" onClick={onEntrar}>Entrar a los tableros →</button>
        </div>
      </section>

      {/* ── Contenido ── */}
      <main className="home-main">
        <div className="home-grid">
          <article className="home-card">
            <h2>¿Qué es?</h2>
            <p>
              Es el proceso mediante el cual la ETITC examina, de forma <b>sistemática y participativa</b>, la
              calidad institucional y de sus programas. Recoge la <b>percepción y valoración</b> de sus
              estamentos frente a los distintos factores de calidad, como insumo del proceso de autoevaluación.
            </p>
          </article>

          <article className="home-card">
            <h2>¿Para qué sirve?</h2>
            <ul>
              <li><b>Mejoramiento continuo</b> de la institución y los programas.</li>
              <li><b>Acreditación de alta calidad</b> ante el CNA.</li>
              <li><b>Rendición de cuentas</b> a la comunidad y grupos de interés.</li>
              <li><b>Toma de decisiones</b> informada con evidencia.</li>
            </ul>
          </article>

          <article className="home-card">
            <h2>¿Qué evalúa?</h2>
            <p>
              El modelo organiza la evaluación en una jerarquía:
              <b> Factor → Característica → Aspecto → Pregunta</b>, respondida por cada estamento en una
              escala de valoración (1–5 en 2016; 2–10 desde 2020).
            </p>
            <div className="chips-title">Factores del modelo actual</div>
            <div className="chips">{FACTORES.map((f) => <span key={f} className="chip-f">{f}</span>)}</div>
            <div className="chips-title">Estamentos que responden</div>
            <div className="chips">{ESTAMENTOS.map((e) => <span key={e} className="chip-e">{e}</span>)}</div>
          </article>

          <article className="home-card">
            <h2>¿Qué encontrarás en los tableros?</h2>
            <ul>
              <li><b>Tablero por año</b>: KPIs, promedio y % favorable por factor y estamento.</li>
              <li><b>Comparativo</b> Programas vs. Institucional, con la brecha por factor.</li>
              <li><b>Evolución histórica</b> de factores, estamentos y características.</li>
              <li><b>Modelo actual (2025)</b>: explorador de preguntas por factor, característica y aspecto.</li>
            </ul>
          </article>
        </div>

        <section className="home-etapas">
          <h2 className="etapas-title">Etapas del proceso</h2>
          <div className="etapas">
            {ETAPAS.map(([n, t, d]) => (
              <div key={n} className="etapa">
                <div className="etapa-n">{n}</div>
                <div><b>{t}</b><p>{d}</p></div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Pie de página ── */}
      <footer className="home-footer">
        <div className="home-footer-in">
          <div>
            <b>Escuela Tecnológica Instituto Técnico Central — ETITC</b>
            <span>Autoevaluación Institucional · Plataforma de apreciación 2016–2025</span>
          </div>
          <div className="foot-right">
            <span>Modelo CNA · Factores, características, aspectos y preguntas</span>
            <span className="muted-foot">Acceso restringido · inicio de sesión requerido</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
