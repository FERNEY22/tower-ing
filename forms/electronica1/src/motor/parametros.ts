/* =========================================================================
   parametros.ts — Modelos calibrados a lo que enseña el curso.

   POR QUE ESTE ARCHIVO EXISTE
   ---------------------------
   En clase se enseña el modelo de caida constante: 0,7 V en el diodo de
   silicio. Si el simulador devuelve 0,58 V —que es lo que sale con los
   parametros de catalogo de un 1N4148— el estudiante concluye que su calculo
   a mano esta mal, y la leccion se vuelve en su contra.

   Asi que Is y n de cada modelo se eligen para que la caida directa a la
   corriente tipica del curso coincida con lo que se enseña. No son los
   parametros del fabricante: son los parametros que hacen que el simulador
   diga lo mismo que el profesor.

   COMO SE ELIGE n
   ---------------
   n fija la pendiente, e Is se deriva de n y de la caida objetivo. El unico
   limite es que el exponente V/(n·Vt) en el punto de operacion se quede
   holgadamente por debajo de MOTOR.expArgMax (40): por encima el modelo
   pasa a su extension lineal y deja de representar el diodo.

   Con Vt = 25,852 mV, un LED azul de 3,1 V necesita n ≈ 3,2 para que el
   exponente se quede en 37. Con n = 2 daria 60 y el modelo no serviria.
   ========================================================================= */

import { MOTOR } from "@/config";
import type { ColorLed } from "./circuito";

/** Corriente a la que se especifica la caida directa en el curso. */
export const CORRIENTE_CALIBRACION_A = 0.02;

export interface ParametrosUnion {
  /** Corriente de saturacion inversa. */
  Is: number;
  /** Factor de idealidad. */
  n: number;
}

/**
 * Is que hace que la union caiga exactamente `vObjetivo` a `iObjetivo`.
 * Es la inversa de Shockley despejando Is.
 */
export function derivarIs(
  vObjetivo: number,
  iObjetivo: number,
  n: number,
): number {
  return iObjetivo / (Math.exp(vObjetivo / (n * MOTOR.Vt)) - 1);
}

/* --------------------------------------------------------- diodo de señal */

export const CAIDA_DIODO_SILICIO_V = 0.7;
const N_DIODO_SILICIO = 1.0;

export const DIODO_SILICIO: ParametrosUnion = {
  n: N_DIODO_SILICIO,
  Is: derivarIs(
    CAIDA_DIODO_SILICIO_V,
    CORRIENTE_CALIBRACION_A,
    N_DIODO_SILICIO,
  ),
};

/* ------------------------------------------------------------------- LEDs */

export interface ParametrosLed extends ParametrosUnion {
  caidaObjetivoV: number;
  /** Tolerancia con la que se acepta la calibracion, segun el curso. */
  toleranciaV: number;
}

function led(caidaObjetivoV: number, n: number, toleranciaV = 0.05): ParametrosLed {
  return {
    n,
    caidaObjetivoV,
    toleranciaV,
    Is: derivarIs(caidaObjetivoV, CORRIENTE_CALIBRACION_A, n),
  };
}

export const LED_POR_COLOR: Record<ColorLed, ParametrosLed> = {
  rojo: led(1.9, 2.0),
  verde: led(2.1, 2.2),
  azul: led(3.1, 3.2),
  blanco: led(3.1, 3.2),
};

/* ------------------------------------------------------------------ zener */

/**
 * La rama directa de un zener es la de un diodo de silicio corriente.
 * La de ruptura se modela con su propia pareja (Isbv, nz).
 */
export const ZENER_DIRECTO: ParametrosUnion = DIODO_SILICIO;

export const ZENER_RUPTURA = {
  /**
   * Corriente de fuga de la rama de ruptura. Aparece tal cual como fuga en
   * directa segun la formula de la especificacion, asi que tiene que ser
   * pequeña: 1 nA es despreciable frente a cualquier medida del curso.
   */
  Isbv: 1e-9,
  nz: 1.0,
  /** Corriente a la que se entiende especificada la tension de ruptura. */
  corrientePruebaA: 0.02,
} as const;

/**
 * La tension de ruptura que el estudiante escribe (5,1 V) es la que tiene el
 * zener A LA CORRIENTE DE PRUEBA, no el parametro interno del modelo. Entre
 * una y otra hay el codo de la exponencial, unos 0,43 V con estos valores.
 *
 * Sin esta correccion, un zener de "5,1 V" regularia a 5,53 V y el caso D de
 * la especificacion fallaria.
 */
export function tensionRupturaInterna(vzNominalV: number): number {
  const { Isbv, nz, corrientePruebaA } = ZENER_RUPTURA;
  const codoV = nz * MOTOR.Vt * Math.log(corrientePruebaA / Isbv + 1);
  // Un zener nominal mas pequeño que el codo no tiene sentido fisico; se
  // deja un minimo positivo en lugar de generar un modelo absurdo.
  return Math.max(0.1, vzNominalV - codoV);
}

/* ---------------------------------------------------- tabla de calibracion

   La consume la prueba automatica que exige la especificacion. Si alguna de
   estas cuatro no se cumple, el motor no esta listo.                        */

export interface Calibracion {
  etiqueta: string;
  /** Como construir el componente en la prueba. */
  tipo: "diodo" | "led";
  color?: ColorLed;
  caidaObjetivoV: number;
  toleranciaV: number;
}

export const CALIBRACIONES: readonly Calibracion[] = [
  {
    etiqueta: "Diodo de silicio",
    tipo: "diodo",
    caidaObjetivoV: CAIDA_DIODO_SILICIO_V,
    toleranciaV: 0.02,
  },
  {
    etiqueta: "LED rojo",
    tipo: "led",
    color: "rojo",
    caidaObjetivoV: 1.9,
    toleranciaV: 0.05,
  },
  {
    etiqueta: "LED verde",
    tipo: "led",
    color: "verde",
    caidaObjetivoV: 2.1,
    toleranciaV: 0.05,
  },
  {
    etiqueta: "LED azul",
    tipo: "led",
    color: "azul",
    caidaObjetivoV: 3.1,
    toleranciaV: 0.05,
  },
] as const;
