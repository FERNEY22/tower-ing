/* =========================================================================
   PUERTA DE LA FASE 7

   La lección 1, de principio a fin, con la nota correcta.

   Se recorre el flujo con las mismas acciones que dispara el estudiante:
   observar → medir → diagnosticar → reparar → verificar → bitácora.
   ========================================================================= */

import { describe, it, expect, beforeEach } from "vitest";
import { EVALUACION } from "@/config";
import { useCircuito } from "@/estado/circuitoStore";
import { useLeccion, puedeEditar, puedeMedir } from "@/estado/leccionStore";
import { useSesion } from "@/estado/sesionStore";
import { LECCION_1 } from "@/lecciones/datos/l1-codigo-colores";
import { validarLeccion } from "@/lecciones/tipos";
import { construirIdentidad } from "@/plataforma/ingreso/identidad";
import { almacen } from "@/plataforma/almacen";
import { AlmacenMemoria } from "@/plataforma/almacen/memoria";
import { corrienteDe } from "@/motor";
import { bandasDe, leerBandas } from "@/vistas/fisica/bandasColor";

function leccion() {
  return useLeccion.getState();
}
function lienzo() {
  return useCircuito.getState();
}

/** Recorre observar → medir → diagnosticar. */
function llegarADiagnosticar() {
  leccion().iniciar(LECCION_1);
  leccion().avanzar(); // observar → medir
  leccion().avanzar(); // medir → diagnosticar
}

/** Id de la opción correcta de la lección. */
const CORRECTA = LECCION_1.opciones.find((o) => o.correcta)!.id;
const INCORRECTA = LECCION_1.opciones.find((o) => !o.correcta)!.id;

beforeEach(() => {
  useLeccion.getState().abandonar();
  useCircuito.getState().limpiar();
  // El almacén es un singleton de módulo: sin vaciarlo, los intentos de una
  // prueba se suman a los de la siguiente.
  if (almacen instanceof AlmacenMemoria) almacen.limpiar();
});

describe("la lección está bien definida", () => {
  it("pasa la validación de estructura", () => {
    expect(validarLeccion(LECCION_1)).toEqual([]);
  });

  it("tiene una sola opción correcta y varios distractores", () => {
    expect(LECCION_1.opciones.filter((o) => o.correcta)).toHaveLength(1);
    expect(LECCION_1.opciones.length).toBeGreaterThanOrEqual(4);
  });

  it("cada distractor explica por qué no es", () => {
    for (const o of LECCION_1.opciones.filter((x) => !x.correcta)) {
      expect(o.explicacion).toMatch(/^No:/);
    }
  });
});

describe("la avería sembrada", () => {
  it("la resistencia está dos órdenes de magnitud por encima", () => {
    const c = LECCION_1.circuitoInicial();
    const r1 = c.componentes.find((x) => x.id === "R1")!;
    expect((r1.params as { valorOhm: number }).valorOhm).toBe(100000);
  });

  it("sus bandas son legibles y corresponden al valor sembrado", () => {
    // Es lo que el estudiante tiene que leer en la vista física.
    expect(leerBandas(bandasDe(100000, 5))).toBe("marrón, negro, amarillo, oro");
  });

  it("el LED casi no conduce: ese es el síntoma", () => {
    leccion().iniciar(LECCION_1);
    const corriente = corrienteDe(lienzo().solucion!, "LED1");
    expect(corriente).toBeLessThan(0.0002);
    expect(corriente).toBeGreaterThan(0);
  });

  it("el circuito de partida no tiene errores de montaje", () => {
    leccion().iniciar(LECCION_1);
    expect(lienzo().solucion!.ok).toBe(true);
    expect(lienzo().solucion!.diagnosticos).toEqual([]);
  });

  it("y nada se quema al arrancar", () => {
    leccion().iniciar(LECCION_1);
    expect(lienzo().circuito.componentes.every((c) => !c.estado.quemado)).toBe(true);
  });
});

describe("el flujo no se puede saltar", () => {
  it("empieza en observar", () => {
    leccion().iniciar(LECCION_1);
    expect(leccion().paso).toBe("observar");
  });

  it("no se llega a reparar sin declarar el diagnóstico correcto", () => {
    llegarADiagnosticar();
    leccion().avanzar();
    expect(leccion().paso).toBe("diagnosticar");
  });

  it("fallar el diagnóstico tampoco abre la reparación", () => {
    llegarADiagnosticar();
    leccion().declararDiagnostico(INCORRECTA);
    leccion().avanzar();
    expect(leccion().paso).toBe("diagnosticar");
  });

  it("acertar sí la abre", () => {
    llegarADiagnosticar();
    leccion().declararDiagnostico(CORRECTA);
    leccion().avanzar();
    expect(leccion().paso).toBe("reparar");
  });

  it("no se llega a la bitácora sin verificar la reparación", () => {
    llegarADiagnosticar();
    leccion().declararDiagnostico(CORRECTA);
    leccion().avanzar();
    leccion().avanzar();
    expect(leccion().paso).toBe("reparar");
  });

  it("el circuito solo se puede editar en el paso de reparar", () => {
    expect(puedeEditar("observar")).toBe(false);
    expect(puedeEditar("diagnosticar")).toBe(false);
    expect(puedeEditar("reparar")).toBe(true);
  });

  it("el multímetro está desde el paso de medir", () => {
    expect(puedeMedir("observar")).toBe(false);
    expect(puedeMedir("medir")).toBe(true);
    expect(puedeMedir("reparar")).toBe(true);
  });
});

describe("declarar el diagnóstico", () => {
  it("una respuesta incorrecta se registra y explica por qué no es", () => {
    llegarADiagnosticar();
    leccion().declararDiagnostico(INCORRECTA);

    expect(leccion().evaluacion.diagnosticos).toHaveLength(1);
    expect(leccion().evaluacion.diagnosticos[0]!.correcto).toBe(false);
    expect(leccion().ultimaExplicacion).toMatch(/^No:/);
  });

  it("se puede reintentar tras fallar", () => {
    llegarADiagnosticar();
    leccion().declararDiagnostico(INCORRECTA);
    leccion().declararDiagnostico(CORRECTA);

    expect(leccion().evaluacion.diagnosticos).toHaveLength(2);
    expect(leccion().evaluacion.diagnosticos[1]!.correcto).toBe(true);
  });

  it("una vez acertado no se vuelve a responder", () => {
    llegarADiagnosticar();
    leccion().declararDiagnostico(CORRECTA);
    leccion().declararDiagnostico(INCORRECTA);
    expect(leccion().evaluacion.diagnosticos).toHaveLength(1);
  });

  it("cada intento guarda qué opción se eligió", () => {
    llegarADiagnosticar();
    leccion().declararDiagnostico(INCORRECTA);
    const registro = leccion().evaluacion.diagnosticos[0]!;
    expect(registro.etiqueta.length).toBeGreaterThan(20);
    expect(typeof registro.tSeg).toBe("number");
  });
});

describe("reparar y verificar", () => {
  function llegarAReparar() {
    llegarADiagnosticar();
    leccion().declararDiagnostico(CORRECTA);
    leccion().avanzar();
  }

  it("verificar sin arreglar nada falla y lo explica", () => {
    llegarAReparar();
    leccion().verificarReparacion();

    expect(leccion().ultimaVerificacion!.ok).toBe(false);
    expect(leccion().ultimaVerificacion!.mensaje).toMatch(/demasiado grande/i);
    expect(leccion().evaluacion.reparacionesFallidas).toBe(1);
  });

  it("poner 680 Ω la da por buena", () => {
    llegarAReparar();
    lienzo().actualizarParams("R1", { valorOhm: 680 });
    leccion().verificarReparacion();

    expect(leccion().ultimaVerificacion!.ok).toBe(true);
    expect(leccion().evaluacion.reparacionVerificada).toBe(true);
  });

  it("pasarse de corriente sin llegar a quemar avisa de que sube el valor", () => {
    // 330 Ω dan unos 21 mA: por encima de los 12 que pide la lección, pero
    // por debajo de los 30 que funden el LED.
    llegarAReparar();
    lienzo().actualizarParams("R1", { valorOhm: 330 });
    leccion().verificarReparacion();

    const v = leccion().ultimaVerificacion!;
    expect(v.ok).toBe(false);
    expect(v.mensaje).toMatch(/sube el valor/i);
    expect(
      lienzo().circuito.componentes.find((c) => c.id === "LED1")!.estado.quemado,
    ).toBe(false);
  });

  it("quemar el LED no cuela como reparación", () => {
    llegarAReparar();
    lienzo().actualizarParams("R1", { valorOhm: 1, potenciaW: 10 });
    leccion().verificarReparacion();

    expect(leccion().ultimaVerificacion!.ok).toBe(false);
    expect(leccion().ultimaVerificacion!.mensaje).toMatch(/quemado/i);
  });

  it("quitar el LED tampoco", () => {
    llegarAReparar();
    lienzo().eliminar("LED1");
    leccion().verificarReparacion();

    expect(leccion().ultimaVerificacion!.ok).toBe(false);
    expect(leccion().ultimaVerificacion!.mensaje).toMatch(/falta el LED/i);
  });

  it("una verificación buena tras varias fallidas las cuenta todas", () => {
    llegarAReparar();
    leccion().verificarReparacion();
    lienzo().actualizarParams("R1", { valorOhm: 10000 });
    leccion().verificarReparacion();
    lienzo().actualizarParams("R1", { valorOhm: 680 });
    leccion().verificarReparacion();

    expect(leccion().evaluacion.reparacionesFallidas).toBe(2);
    expect(leccion().evaluacion.reparacionVerificada).toBe(true);
  });
});

describe("la lección completa, de principio a fin", () => {
  async function recorrerImpecable() {
    const identidad = await construirIdentidad("María Fernanda Gómez", "1012345678");
    await useSesion.getState().ingresar(identidad);

    leccion().iniciar(LECCION_1);
    leccion().avanzar(); // observar → medir

    // Mide la corriente en serie, como pide la lección.
    lienzo().activarInstrumento("corriente");
    lienzo().medirEnCable(lienzo().circuito.cables[0]!.id);
    lienzo().desactivarInstrumento();

    leccion().avanzar(); // medir → diagnosticar
    leccion().declararDiagnostico(CORRECTA);
    leccion().avanzar(); // diagnosticar → reparar

    lienzo().actualizarParams("R1", { valorOhm: 680 });
    leccion().verificarReparacion();
    leccion().avanzar(); // reparar → bitácora

    leccion().escribirBitacora(
      "Le pregunté a una IA y me dijo 470 Ω; al calcularlo salían 680.",
    );
    await leccion().finalizar();

    return identidad;
  }

  it("acaba en el resultado con la nota máxima", async () => {
    await recorrerImpecable();

    expect(leccion().paso).toBe("resultado");
    expect(leccion().nota!.total).toBe(EVALUACION.escalaMax);
  });

  it("el desglose reparte los cuatro criterios completos", async () => {
    await recorrerImpecable();
    const n = leccion().nota!;
    expect(n.diagnostico).toBe(EVALUACION.pesos.diagnostico);
    expect(n.reparacion).toBe(EVALUACION.pesos.reparacion);
    expect(n.eficiencia).toBe(EVALUACION.pesos.eficiencia);
    expect(n.cuidado).toBe(EVALUACION.pesos.cuidado);
  });

  it("el LED acaba encendido con la corriente que pedía la lección", async () => {
    await recorrerImpecable();
    const corriente = corrienteDe(lienzo().solucion!, "LED1");
    expect(corriente).toBeGreaterThan(0.008);
    expect(corriente).toBeLessThan(0.012);
  });

  it("el resultado queda guardado con todo lo que hizo el estudiante", async () => {
    const identidad = await recorrerImpecable();
    const progreso = await almacen.cargarProgreso(identidad.ccHash);

    const l1 = progreso.l1!;
    expect(l1.intentos).toBe(1);
    expect(l1.mejorNota).toBe(EVALUACION.escalaMax);
    expect(l1.aprobado).toBe(true);
    expect(l1.ultimo!.mediciones).toBeGreaterThan(0);
    expect(l1.ultimo!.diagnosticos).toHaveLength(1);
    expect(l1.bitacoraIA[0]).toMatch(/470/);
  });

  it("el tiempo se registra pero no afecta a la nota", async () => {
    await recorrerImpecable();
    const identidad = useSesion.getState().identidad!;
    const progreso = await almacen.cargarProgreso(identidad.ccHash);

    expect(progreso.l1!.ultimo!.tActivoSeg).toBeGreaterThanOrEqual(0);
    expect(progreso.l1!.ultimo!.tPestanaSeg).toBeGreaterThanOrEqual(0);
    expect(leccion().nota!.total).toBe(EVALUACION.escalaMax);
  });
});

describe("una lección hecha a trompicones", () => {
  it("falla dos veces el diagnóstico y quema el LED: aprueba raspando o no", async () => {
    const identidad = await construirIdentidad("Juan Pérez Rojas", "1098765432");
    await useSesion.getState().ingresar(identidad);

    leccion().iniciar(LECCION_1);
    leccion().avanzar();
    leccion().avanzar();

    const malas = LECCION_1.opciones.filter((o) => !o.correcta);
    leccion().declararDiagnostico(malas[0]!.id);
    leccion().declararDiagnostico(malas[1]!.id);
    leccion().declararDiagnostico(CORRECTA);
    leccion().avanzar();

    // Se pasa de corriente y quema el LED.
    lienzo().actualizarParams("R1", { valorOhm: 1, potenciaW: 10 });
    leccion().verificarReparacion();

    // Lo reemplaza y ahora sí lo hace bien.
    // Con 1 Ω no solo se fue el LED: la resistencia también disipó de más.
    // Y el orden importa: reemplazar con el circuito todavía mal vuelve a
    // quemarlo al instante, así que primero se arregla la causa.
    lienzo().actualizarParams("R1", { valorOhm: 680 });
    for (const c of [...lienzo().circuito.componentes]) {
      if (c.estado.quemado) lienzo().reemplazar(c.id);
    }
    leccion().verificarReparacion();
    leccion().avanzar();

    leccion().escribirBitacora("No consulté ninguna IA.");
    await leccion().finalizar();

    const n = leccion().nota!;
    // Acertó al tercer intento, falló una verificación y quemó un LED.
    expect(n.diagnostico).toBeGreaterThan(0);
    expect(n.diagnostico).toBeLessThan(EVALUACION.pesos.diagnostico);
    expect(n.reparacion).toBe(EVALUACION.pesos.reparacion);
    expect(n.eficiencia).toBeLessThan(EVALUACION.pesos.eficiencia);
    expect(n.cuidado).toBeLessThan(EVALUACION.pesos.cuidado);
    expect(n.total).toBeLessThan(EVALUACION.escalaMax);
    expect(n.total).toBeGreaterThan(0);
  });

  it("los quemados quedan registrados por tipo", async () => {
    const identidad = await construirIdentidad("Ana Ruiz Marín", "1011111111");
    await useSesion.getState().ingresar(identidad);

    leccion().iniciar(LECCION_1);
    leccion().avanzar();
    leccion().avanzar();
    leccion().declararDiagnostico(CORRECTA);
    leccion().avanzar();

    lienzo().actualizarParams("R1", { valorOhm: 1, potenciaW: 10 });
    leccion().verificarReparacion();
    // Con 1 Ω no solo se fue el LED: la resistencia también disipó de más.
    // Y el orden importa: reemplazar con el circuito todavía mal vuelve a
    // quemarlo al instante, así que primero se arregla la causa.
    lienzo().actualizarParams("R1", { valorOhm: 680 });
    for (const c of [...lienzo().circuito.componentes]) {
      if (c.estado.quemado) lienzo().reemplazar(c.id);
    }
    leccion().verificarReparacion();
    leccion().avanzar();
    await leccion().finalizar();

    const progreso = await almacen.cargarProgreso(identidad.ccHash);
    expect(progreso.l1!.ultimo!.quemados.led).toBeGreaterThanOrEqual(1);
  });
});
