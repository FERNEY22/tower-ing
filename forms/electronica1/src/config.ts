/* =========================================================================
   config.ts — Parametros del curso y del juego.

   REGLA: ningun otro archivo define numeros de politica (intentos, pesos,
   umbrales, tiempos, tolerancias). Si hay que ajustar el juego despues del
   primer semestre, se ajusta AQUI y en ningun otro sitio.

   Electronica IFA00112 · Ingenieria Mecatronica · Universidad EAN · 2026-2
   ========================================================================= */

/* ------------------------------------------------------------------ CURSO */

export const CURSO = {
  codigo: "IFA00112",
  nombre: "Electrónica",
  programa: "Ingeniería Mecatrónica",
  universidad: "Universidad EAN",
  periodo: "2026-2",
} as const;

/* --------------------------------------------------------------- ALMACEN */

export const ALMACEN = {
  /** Nodo raiz en Realtime Database. Exclusivo de este proyecto. */
  nodoRaiz: "electronica1",
  /**
   * "memoria" permite desarrollar y probar sin tocar la nube.
   * Sin configuracion de Firebase se cae a "memoria" por si solo: asi el
   * proyecto arranca recien clonado, sin credenciales. VITE_ALMACEN manda
   * sobre esta deteccion.
   */
  backend: (import.meta.env?.VITE_ALMACEN ??
    (import.meta.env?.VITE_FB_DATABASE_URL ? "firebase" : "memoria")) as
    | "firebase"
    | "memoria",
} as const;

/* -------------------------------------------------------------- IDENTIDAD */

export const IDENTIDAD = {
  /** Longitud minima de cedula aceptada en el formulario de ingreso. */
  cedulaMinDigitos: 6,
  cedulaMaxDigitos: 12,
  nombreMinCaracteres: 5,
  /**
   * La cedula NUNCA se almacena completa. La clave del registro es un hash
   * SHA-256 truncado a esta longitud (hex). 16 hex = 64 bits: suficiente
   * para un curso, y no reversible por fuerza bruta trivial.
   */
  hashLongitud: 16,
  /** Digitos visibles al final de la mascara: 1012345678 -> ••••678 */
  mascaraDigitosVisibles: 3,
} as const;

/* --------------------------------------------------------------- LECCIONES */

export interface DefinicionLeccion {
  id: string;
  n: number;
  titulo: string;
  tema: string;
  descripcion: string;
  /** Que avería lleva sembrada, en lenguaje de docente. */
  averia: string;
}

export const LECCIONES: readonly DefinicionLeccion[] = [
  {
    id: "l1",
    n: 1,
    titulo: "Código de colores y ley de Ohm",
    tema: "Resistencias",
    descripcion:
      "Lee las bandas, predice la corriente y contrástala con la medición.",
    averia: "Resistencia de valor equivocado en dos órdenes de magnitud.",
  },
  {
    id: "l2",
    n: 2,
    titulo: "El LED que se quema",
    tema: "Diodos emisores",
    descripcion:
      "Identifica ánodo y cátodo, y dimensiona la resistencia para 10 mA.",
    averia: "LED conectado sin resistencia limitadora.",
  },
  {
    id: "l3",
    n: 3,
    titulo: "Polarización directa e inversa",
    tema: "El diodo",
    descripcion: "Diagnostica con el multímetro y verifica la caída de 0,7 V.",
    averia: "Diodo montado al revés.",
  },
  {
    id: "l4",
    n: 4,
    titulo: "Recta de carga",
    tema: "Punto de operación",
    descripcion:
      "Barre el potenciómetro y localiza el punto Q sobre la curva I-V.",
    averia: "Resistencia que sitúa el punto Q fuera de la región útil.",
  },
  {
    id: "l5",
    n: 5,
    titulo: "El zener como regulador",
    tema: "Regulación",
    descripcion: "Dimensiona Rs y comprueba la regulación con carga variable.",
    averia: "Zener invertido y, después, carga que excede su capacidad.",
  },
] as const;

export const PROGRESION = {
  /** La leccion N+1 se abre al aprobar la N. */
  desbloqueoPorAprobacion: true,
  /** Espera adicional tras aprobar, en minutos. 0 = sin espera. */
  esperaMinutos: 0,
  /** La practica libre esta disponible desde el primer momento. */
  practicaLibreSiempreAbierta: true,
} as const;

/* -------------------------------------------------------------- EVALUACION */

export const EVALUACION = {
  escalaMax: 100,
  umbralAprobacion: 60,

  /** Pesos de la rubrica. Deben sumar escalaMax. */
  pesos: {
    diagnostico: 40,
    reparacion: 30,
    eficiencia: 15,
    cuidado: 15,
  },

  /**
   * Puntaje del criterio "diagnostico" segun en que intento se acerto.
   * Indice 0 = primer intento. A partir del final del arreglo, 0 puntos.
   */
  puntajeDiagnosticoPorIntento: [40, 20, 8] as readonly number[],

  /** Cada verificacion de reparacion fallida descuenta de "eficiencia". */
  descuentoPorReparacionFallida: 5,

  /** Cada componente quemado descuenta de "cuidado". */
  descuentoPorComponenteQuemado: 5,

  /** Cada cortocircuito provocado descuenta de "cuidado". */
  descuentoPorCortocircuito: 5,

  /** Bandas de desempeño mostradas al estudiante. */
  bandas: [
    { min: 90, etiqueta: "Experto" },
    { min: 75, etiqueta: "Competente" },
    { min: 60, etiqueta: "Aprobado" },
    { min: 0, etiqueta: "En proceso" },
  ] as readonly { min: number; etiqueta: string }[],
} as const;

export const INTENTOS = {
  /** Sesiones de leccion por estudiante. Vale la mejor nota. */
  porLeccion: 3,
  /**
   * Los intentos de diagnostico y reparacion DENTRO de una sesion no se
   * bloquean: se penalizan y se registran. Es lo que permite medir destreza.
   */
  bloquearDiagnosticosInternos: false,
} as const;

/* ----------------------------------------------------------------- TIEMPO */

export const TIEMPO = {
  /** No hay cuenta regresiva. El cronometro sube y no penaliza. */
  cuentaRegresiva: false,
  /** Sin interaccion durante este lapso, el tiempo activo deja de correr. */
  inactividadMs: 90_000,
  /** Cierre automatico de sesion huerfana. Higiene de datos, no castigo. */
  sesionHuerfanaMs: 45 * 60_000,
  /** Cada cuanto se refresca el cronometro en pantalla. */
  refrescoCronometroMs: 1000,
} as const;

/* --------------------------------------------------------------- REGISTRO */

/** 0 = apagado · 1 = solo hitos · 2 = todo, incluido el cableado. */
export const NIVEL_REGISTRO_HITOS = 1;
export const NIVEL_REGISTRO_COMPLETO = 2;

export const REGISTRO = {
  nivel: NIVEL_REGISTRO_COMPLETO as 0 | 1 | 2,
  /** Se envia un lote cuando se acumulan estos eventos... */
  loteMaxEventos: 25,
  /** ...o cuando pasa este tiempo, lo que ocurra primero. */
  loteIntervaloMs: 15_000,
  /** Tope de eventos guardados por sesion, para no desbordar la base. */
  maxEventosPorSesion: 5000,
} as const;

/* ------------------------------------------------------------------ MOTOR */

export const MOTOR = {
  /** Tension termica a 300 K. */
  Vt: 0.025852,
  /** Conductancia de fuga de cada nodo a referencia. Evita matriz singular. */
  gmin: 1e-12,
  /** Valor inicial del escalonamiento de gmin cuando Newton no converge. */
  gminInicial: 1e-3,
  maxIteraciones: 100,
  /** Criterio de tension: |dv| < reltol*|v| + vntol */
  reltol: 1e-3,
  vntol: 1e-6,
  /** Criterio de corriente: el residuo debe bajar de aqui. */
  abstol: 1e-12,
  /**
   * Suelo de precision del criterio de corriente.
   *
   * abstol es absoluto, y eso deja de tener sentido cuando las corrientes del
   * circuito son enormes: comparar dos numeros de orden 1e5 nunca da una
   * diferencia menor que 1e-11, por bien resuelto que este. No es falta de
   * convergencia, es la precision del double.
   *
   * Con este termino el criterio queda en abstol + epsilon·|I|: intacto y
   * estricto en cualquier circuito normal (a 10 mA aporta 1e-16, o sea nada),
   * y realizable cuando la corriente se dispara.
   *
   * OJO: esto NO es el reltol de SPICE (1e-3). Con reltol el criterio de
   * corriente se volveria mas flojo que el de tension y dejaria de aportar
   * nada. Aqui son unos pocos ULP, nada mas.
   */
  epsilonCorriente: 1e-14,
  /** Saturacion del argumento de la exponencial, red de seguridad. */
  expArgMax: 40,
  /** Tamaño maximo de circuito admitido. */
  maxNodos: 50,
  /**
   * Suelo de resistencia al estampar. Un potenciometro con el cursor al
   * tope daria un tramo de 0 Ω y una conductancia infinita.
   */
  resistenciaMinimaOhm: 1e-3,
  /**
   * Por debajo de este pivote (relativo a la magnitud de la matriz) el
   * sistema se considera singular.
   *
   * Tiene que quedar MUY por debajo de gmin: un subcircuito flotante se
   * sostiene solo por gmin, y su ultimo pivote vale del orden de 1e-12. Con
   * un umbral mas alto, un circuito perfectamente resoluble se rechazaria.
   * Los sistemas de verdad singulares (dos fuentes iguales sobre los mismos
   * nodos) dan un pivote exactamente 0 y se detectan igual.
   */
  toleranciaPivote: 1e-18,
  /** Residuo relativo maximo admitido en la solucion, como segunda red. */
  toleranciaResiduo: 1e-6,
} as const;

/** Limites de destruccion de cada componente. */
export const LIMITES = {
  resistenciaPotenciaWDefecto: 0.25,
  ledCorrienteMaxA: 0.03,
  ledTensionInversaMaxV: 5,
  diodoCorrienteMaxA: 0.2,
  zenerPotenciaWDefecto: 0.5,
} as const;

/** Resistencias internas del multimetro. No es ideal, a proposito. */
export const MULTIMETRO = {
  resistenciaVoltimetroOhm: 10e6,
  resistenciaAmperimetroOhm: 0.1,
} as const;

/* ----------------------------------------------------------------- LIENZO

   El dibujo se encuadra sobre el circuito y se ajusta al monitor: usa el
   maximo de aqui abajo y, si no cabe, se reduce hasta caber. Nunca se sale.
   Antes el lienzo tenia un encuadre fijo de 900x560 metido en 330 px, o sea
   0,37 px por unidad: las bandas de una resistencia quedaban en 1,5 px y la
   leccion 1, que consiste en leerlas, no se podia hacer.                    */

export const LIENZO = {
  /** Pixeles por unidad de circuito, como maximo. 1,47 ≈ 4× de lo anterior. */
  pxPorUnidadMax: 1.47,
  /** Suelo, para que un circuito enorme siga siendo dibujable. */
  pxPorUnidadMin: 0.3,
  /** Aire alrededor del circuito, en unidades. Cada unidad cuesta dos de ancho. */
  margenEncuadre: 22,
  /** Encuadre minimo, para que un lienzo casi vacio no salga diminuto. */
  encuadreMinimo: { ancho: 420, alto: 300 },
  /** Parte de la altura de la ventana que puede ocupar el lienzo. */
  fraccionAltoVentana: 0.62,
  altoMinimoPx: 300,
} as const;

/* ------------------------------------------------------------- EXPORTACION */

export const EXPORTACION = {
  /** Longitud del hash corto del circuito impreso en la marca de agua. */
  hashLongitud: 8,
  escalaPng: 2,
} as const;

/* ----------------------------------------------------------------- HELPERS */

/** Banda de desempeño correspondiente a una nota 0-100. */
export function bandaDe(nota: number): string {
  const b = EVALUACION.bandas.find((x) => nota >= x.min);
  return b ? b.etiqueta : "En proceso";
}

/** True si la nota aprueba. */
export function aprueba(nota: number): boolean {
  return nota >= EVALUACION.umbralAprobacion;
}

/** Definicion de leccion por id, o undefined. */
export function leccionPorId(id: string): DefinicionLeccion | undefined {
  return LECCIONES.find((l) => l.id === id);
}
