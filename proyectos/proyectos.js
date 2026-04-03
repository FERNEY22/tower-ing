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
    link: "/proyectos/ferim/",
    destacado: true
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