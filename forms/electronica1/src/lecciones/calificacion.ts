/* =========================================================================
   calificacion.ts — La rubrica, escala 0 a 100.

   REGLA CENTRAL DEL CURSO: primero se mide y se declara el diagnostico,
   despues se repara. Reparar sin haber declarado diagnostico correcto NO
   puntua, por mucho que el circuito acabe funcionando.

   El objetivo explicito es romper el habito de cambiar cosas al azar hasta
   que la cosa encienda. Por eso los 30 puntos de reparacion estan
   condicionados al diagnostico, y no son independientes.

   El tiempo no aparece por ninguna parte: se registra para el docente, pero
   no penaliza a quien piensa antes de actuar.
   ========================================================================= */

import { EVALUACION } from "@/config";
import type { DesgloseNota, IntentoDiagnostico } from "@/plataforma/almacen/esquema";

export interface EstadoEvaluacion {
  /** Todos los intentos de diagnostico, en orden. */
  diagnosticos: IntentoDiagnostico[];
  /** True si la reparacion paso la verificacion de la leccion. */
  reparacionVerificada: boolean;
  /** Verificaciones de reparacion que no pasaron. */
  reparacionesFallidas: number;
  /** Componentes quemados, contados por tipo. */
  quemados: Record<string, number>;
  cortocircuitos: number;
}

export function estadoInicial(): EstadoEvaluacion {
  return {
    diagnosticos: [],
    reparacionVerificada: false,
    reparacionesFallidas: 0,
    quemados: {},
    cortocircuitos: 0,
  };
}

/** True si en algun momento se declaro el diagnostico correcto. */
export function acerto(diagnosticos: IntentoDiagnostico[]): boolean {
  return diagnosticos.some((d) => d.correcto);
}

/**
 * Puntos del criterio "diagnostico".
 *
 * Se degrada segun en que intento se acerto: 40 al primero, 20 al segundo,
 * 8 al tercero, 0 despues. Los valores estan en config.ts.
 */
export function puntosDiagnostico(diagnosticos: IntentoDiagnostico[]): number {
  const indice = diagnosticos.findIndex((d) => d.correcto);
  if (indice < 0) return 0;
  return EVALUACION.puntajeDiagnosticoPorIntento[indice] ?? 0;
}

/** Total de componentes quemados, sumando todos los tipos. */
export function totalQuemados(quemados: Record<string, number>): number {
  return Object.values(quemados).reduce((s, n) => s + n, 0);
}

function acotar(valor: number, maximo: number): number {
  return Math.max(0, Math.min(maximo, valor));
}

export function calificar(estado: EstadoEvaluacion): DesgloseNota {
  const { pesos } = EVALUACION;

  const diagnostico = acotar(
    puntosDiagnostico(estado.diagnosticos),
    pesos.diagnostico,
  );

  // Aqui vive la regla central: sin diagnostico correcto declarado, la
  // reparacion vale cero aunque el circuito funcione.
  const reparacion =
    estado.reparacionVerificada && acerto(estado.diagnosticos)
      ? pesos.reparacion
      : 0;

  const eficiencia = acotar(
    pesos.eficiencia -
      estado.reparacionesFallidas * EVALUACION.descuentoPorReparacionFallida,
    pesos.eficiencia,
  );

  const cuidado = acotar(
    pesos.cuidado -
      totalQuemados(estado.quemados) * EVALUACION.descuentoPorComponenteQuemado -
      estado.cortocircuitos * EVALUACION.descuentoPorCortocircuito,
    pesos.cuidado,
  );

  const total = Math.round(diagnostico + reparacion + eficiencia + cuidado);

  return {
    diagnostico,
    reparacion,
    eficiencia,
    cuidado,
    total: acotar(total, EVALUACION.escalaMax),
  };
}

/** Explicacion del desglose, para que el estudiante entienda su nota. */
export function explicarDesglose(
  estado: EstadoEvaluacion,
  desglose: DesgloseNota,
): { criterio: string; puntos: number; sobre: number; motivo: string }[] {
  const { pesos } = EVALUACION;
  const intento = estado.diagnosticos.findIndex((d) => d.correcto) + 1;
  const quemados = totalQuemados(estado.quemados);

  return [
    {
      criterio: "Diagnóstico",
      puntos: desglose.diagnostico,
      sobre: pesos.diagnostico,
      motivo:
        intento === 1
          ? "Acertaste al primer intento."
          : intento > 1
            ? `Acertaste en el intento ${intento}.`
            : "No llegaste a declarar el diagnóstico correcto.",
    },
    {
      criterio: "Reparación",
      puntos: desglose.reparacion,
      sobre: pesos.reparacion,
      motivo: !acerto(estado.diagnosticos)
        ? "Reparar sin haber declarado el diagnóstico correcto no puntúa."
        : estado.reparacionVerificada
          ? "La reparación quedó verificada."
          : "La reparación no llegó a verificarse.",
    },
    {
      criterio: "Eficiencia",
      puntos: desglose.eficiencia,
      sobre: pesos.eficiencia,
      motivo:
        estado.reparacionesFallidas === 0
          ? "Verificaste a la primera."
          : `${estado.reparacionesFallidas} verificación(es) fallida(s).`,
    },
    {
      criterio: "Cuidado",
      puntos: desglose.cuidado,
      sobre: pesos.cuidado,
      motivo:
        quemados === 0 && estado.cortocircuitos === 0
          ? "No quemaste nada ni provocaste cortocircuitos."
          : `${quemados} componente(s) quemado(s)` +
            (estado.cortocircuitos
              ? ` y ${estado.cortocircuitos} cortocircuito(s).`
              : "."),
    },
  ];
}
