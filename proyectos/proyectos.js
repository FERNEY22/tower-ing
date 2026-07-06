// =====================================================
// ARCHIVO DE DATOS DE PROYECTOS - TOWERS ING
// =====================================================
// Para agregar un nuevo proyecto, copia un objeto del
// array y cambia sus valores. La página se actualiza sola.
// =====================================================

const proyectos = [
  {
    id: "ferim",
    titulo: "FERIM – Plataforma Inmobiliaria",
    estado: "En desarrollo",
    fecha: "",
    descripcion:
      "Plataforma web de alquiler de inmuebles urbanos en Bogotá con geolocalización, gestión por roles (propietario, inquilino, técnico), solicitudes de reserva y mantenimiento, notificaciones por correo y asistencia inteligente con lenguaje natural.",
    tecnologias: ["React", "Node.js", "Express", "MongoDB", "JWT", "Cloudinary", "Google Maps API", "Nodemailer"],
    periodo: "2024 – Presente",
    link: "ferim/index.html",
    destacado: true,
    variante: "ferim"
  },
  {
    id: "biomo",
    titulo: "BIOMO — Monitoreo Comunitario de Biodiversidad",
    estado: "En desarrollo",
    fecha: "",
    descripcion:
      "Monitoreo comunitario participativo de biodiversidad en Sotaquirá, Boyacá: protocolos estandarizados, catálogo científico de especies y cartografía temática de páramos, degradación y cobertura del suelo.",
    tecnologias: ["Biodiversidad", "Cartografía temática", "Investigación de campo", "Catálogo científico"],
    periodo: "2025 – 2026",
    link: "biomo/index.html",
    destacado: true,
    variante: "biomo"
  },
  {
    id: "geovisor",
    titulo: "Geovisor Biodiversidad — Sotaquirá",
    estado: "Finalizado",
    fecha: "",
    descripcion:
      "Geovisor web interactivo de la biodiversidad de Sotaquirá: capas cartográficas, especies documentadas y mapas temáticos navegables directamente en el navegador.",
    tecnologias: ["Leaflet", "D3.js", "GeoJSON", "Mapas interactivos"],
    periodo: "2025 – Presente",
    link: "biomo/geovisorbiodiversidadFER/index.html",
    destacado: true,
    variante: "geo"
  },
  {
    id: "observatorio",
    titulo: "Observatorio Institucional ETITC",
    estado: "En desarrollo",
    fecha: "",
    descripcion:
      "Plataforma que reúne todo lo que la institución mide sobre sí misma —autoevaluación, pruebas externas, indicadores académicos y talento humano— consolidando datos dispersos en 8 capítulos temáticos para apoyar decisiones.",
    tecnologias: ["Visualización de datos", "Indicadores", "8 capítulos", "Análisis institucional"],
    periodo: "2026 – Presente",
    link: "observatorio/index.html",
    destacado: true,
    variante: "obs"
  },
  {
    id: "yuncar",
    titulo: "YUNCAR — Plataforma de Servicios Industriales",
    estado: "Finalizado",
    fecha: "",
    periodo: "2026 – Presente",
    descripcion:
      "Sitio web institucional full-stack (MVP en producción) para YUNCAR, mantenimiento y consultorías industriales en Bogotá. Frontend React/Vite, backend Node/Express, MongoDB Atlas y formulario de contacto con notificaciones por correo. Desplegado en dominio propio.",
    tecnologias: ["React", "Vite", "Node.js", "Express", "MongoDB Atlas", "Netlify", "Render"],
    link: "https://yuncar.co",
    destacado: true,
    variante: "yuncar",
    externo: true
  },
  {
    id: "apreciacion",
    titulo: "Apreciación — Autoevaluación Institucional ETITC",
    estado: "En desarrollo",
    fecha: "",
    descripcion:
      "Aplicación web que replica y moderniza los tableros de autoevaluación institucional de la ETITC (2016–2025): KPIs por factor y estamento, distribución de respuestas y comparativo Programas vs. Institucional con su brecha. Un pipeline ETL en Python consolida los tableros de Excel en base de datos y los expone vía API.",
    tecnologias: ["React", "Vite", "FastAPI", "Python", "pandas", "PostgreSQL", "Supabase", "Recharts"],
    periodo: "2025 – Presente",
    stats: [
      { n: "2016–2025", l: "Series históricas" },
      { n: "8", l: "Factores" },
      { n: "ETL → API", l: "Arquitectura" }
    ],
    link: "apreciacion/publicado/index.html",
    externo: false,
    destacado: true,
    variante: "apreciacion"
  }

  // =====================================================
  // PLANTILLA GENÉRICA (tarjeta del grid) — descomentar y
  // copiar para agregar un proyecto no destacado.
  // Si 'link' es "#", la tarjeta se muestra como "Próximamente".
  // =====================================================
  // ,{
  //   id: "mi-proyecto",
  //   titulo: "Título del proyecto",
  //   estado: "Finalizado",          // "Finalizado" | "En desarrollo" | otro → estilo prototipo
  //   fecha: "Mes Año",              // o usar 'periodo'
  //   descripcion:
  //     "Descripción breve del proyecto.",
  //   tecnologias: ["Tecnología 1", "Tecnología 2"],
  //   link: "ruta/index.html",       // "#" muestra "Próximamente"
  //   destacado: false
  // }
];