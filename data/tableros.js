/* Registro de tableros del hub Data Connection.
   Para agregar uno: añadir un objeto al final (el orden es el de las tarjetas). */
window.TABLEROS = [
  {
    id: "roles",
    titulo: "Roles colaborativos",
    descripcion: "Estudiantes registrados, roles y grupos formados en tiempo real.",
    url: "roles.html",
    fuente: "Firebase",
    estado: "activo"
  },
  {
    id: "trendtech",
    titulo: "TREND+TECH · Avance de equipos",
    descripcion: "Seguimiento del avance de los equipos del curso TREND+TECH.",
    url: "trendtech.html",
    fuente: "Google Sheets",
    estado: "activo"
  }
];
