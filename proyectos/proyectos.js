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
    id: "roles",
    titulo: "Sistema de Identificación de Roles Colaborativos",
    estado: "Finalizado",
    fecha: "Abril 2025",
    descripcion:
      "Formulario interactivo que analiza el comportamiento del usuario y le asigna un rol natural en equipos técnicos: Coordinador, Comunicador, Investigador o Analista.",
    tecnologias: ["HTML", "CSS", "JavaScript", "localStorage"],
    link: "#",
    destacado: false
  },
  {
    id: "dashboard",
    titulo: "Dashboard de Gestión de Equipos",
    estado: "Finalizado",
    fecha: "Abril 2025",
    descripcion:
      "Panel de control que visualiza en tiempo real los registros de estudiantes, permite eliminarlos, actualizar grupos y ver estadísticas por rol.",
    tecnologias: ["JavaScript", "Dashboard", "Grupos Equilibrados", "localStorage"],
    link: "#",
    destacado: false
  },
  {
    id: "portal",
    titulo: "Portal Educativo Towers Ing",
    estado: "En desarrollo",
    fecha: "",
    descripcion:
      "Plataforma central que integra formularios, dashboard, blog, CV y proyectos. Diseño moderno enfocado en ingeniería y educación.",
    tecnologias: ["HTML5", "CSS3", "Responsive", "UI/UX"],
    link: "#",
    destacado: false
  },
  {
    id: "formulario",
    titulo: "Formulario Dinámico con Preguntas Contextuales",
    estado: "Finalizado",
    fecha: "Marzo 2025",
    descripcion:
      "Formulario adaptativo que cambia preguntas según respuestas anteriores, con lógica de puntuación avanzada y retroalimentación inmediata.",
    tecnologias: ["JavaScript", "Lógica condicional", "Dinámico"],
    link: "#",
    destacado: false
  },
  {
    id: "exportador",
    titulo: "Exportador de Datos a Excel",
    estado: "Prototipo",
    fecha: "",
    descripcion:
      "Herramienta que permite exportar los registros del dashboard a formato Excel (CSV) para análisis externo.",
    tecnologias: ["JavaScript", "CSV", "Exportación"],
    link: "#",
    destacado: false
  },
  {
    id: "grupos",
    titulo: "Algoritmo de Formación de Grupos Equilibrados",
    estado: "Finalizado",
    fecha: "Febrero 2025",
    descripcion:
      "Motor de asignación que distribuye estudiantes en grupos con equilibrio de habilidades, basado en puntuaciones múltiples y preferencias secundarias.",
    tecnologias: ["Algoritmos", "JavaScript", "Optimización"],
    link: "#",
    destacado: false
  }
];