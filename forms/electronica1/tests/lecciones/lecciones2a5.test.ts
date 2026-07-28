/* =========================================================================
   PUERTA DE LA FASE 8

   Las lecciones 2 a 5, cada una completa: la avería sembrada produce su
   síntoma, la reparación correcta la da por buena y las equivocaciones
   típicas se rechazan con un mensaje que enseña.

   Todas corren sobre el mismo motor de lección que ya validó la fase 7.
   ========================================================================= */

import { describe, it, expect, beforeEach } from "vitest";
import { EVALUACION } from "@/config";
import { useCircuito } from "@/estado/circuitoStore";
import { useLeccion } from "@/estado/leccionStore";
import { useSesion } from "@/estado/sesionStore";
import { LECCIONES_IMPLEMENTADAS, leccionPorId } from "@/lecciones/registro";
import { validarLeccion, type Leccion } from "@/lecciones/tipos";
import { construirIdentidad } from "@/plataforma/ingreso/identidad";
import { almacen } from "@/plataforma/almacen";
import { AlmacenMemoria } from "@/plataforma/almacen/memoria";
import { corrienteDe, resolver, tensionDe } from "@/motor";
import { tensionDeSalidaL5 } from "@/lecciones/datos/l5-zener-regulador";
import { cable } from "@/motor/circuito";

function leccion() {
  return useLeccion.getState();
}
function lienzo() {
  return useCircuito.getState();
}

/** Lleva la lección hasta el paso de reparar, acertando el diagnóstico. */
function llegarAReparar(l: Leccion) {
  leccion().iniciar(l);
  leccion().avanzar();
  leccion().avanzar();
  leccion().declararDiagnostico(l.opciones.find((o) => o.correcta)!.id);
  leccion().avanzar();
  expect(leccion().paso).toBe("reparar");
}

beforeEach(() => {
  if (almacen instanceof AlmacenMemoria) almacen.limpiar();
  useLeccion.getState().abandonar();
  useCircuito.getState().limpiar();
});

/* ------------------------------------------------------------ estructura */

describe("las cinco lecciones están implementadas y bien formadas", () => {
  it("hay cinco", () => {
    expect(LECCIONES_IMPLEMENTADAS).toHaveLength(5);
  });

  it("cada una pasa la validación de estructura", () => {
    for (const l of LECCIONES_IMPLEMENTADAS) {
      expect(validarLeccion(l)).toEqual([]);
    }
  });

  it("los identificadores y los números son los del curso", () => {
    expect(LECCIONES_IMPLEMENTADAS.map((l) => l.id)).toEqual([
      "l1",
      "l2",
      "l3",
      "l4",
      "l5",
    ]);
    expect(LECCIONES_IMPLEMENTADAS.map((l) => l.numero)).toEqual([1, 2, 3, 4, 5]);
  });

  it("todos los distractores explican por qué no son", () => {
    for (const l of LECCIONES_IMPLEMENTADAS) {
      for (const o of l.opciones.filter((x) => !x.correcta)) {
        expect(o.explicacion).toMatch(/^No/);
      }
    }
  });

  it("ningún circuito de partida arranca con errores de montaje", () => {
    for (const l of LECCIONES_IMPLEMENTADAS) {
      const s = resolver(l.circuitoInicial());
      expect(s.ok, `${l.id} no resuelve`).toBe(true);
      expect(
        s.diagnosticos.filter((d) => d.severidad === "error"),
        `${l.id} tiene errores de topología`,
      ).toEqual([]);
    }
  });

  it("solo la lección 4 lleva panel propio", () => {
    const conPanel = LECCIONES_IMPLEMENTADAS.filter((l) => l.panel);
    expect(conPanel.map((l) => l.id)).toEqual(["l4"]);
  });

  it("ninguna avería sembrada quema nada al cargar la lección", () => {
    // Una lección que arranca con un componente ya destruido no tiene avería
    // que diagnosticar: tiene un cadáver. Le pasó a la 5, cuya resistencia
    // serie disipaba 0,58 W con una nominal de 0,5.
    for (const l of LECCIONES_IMPLEMENTADAS) {
      leccion().iniciar(l);
      const quemados = lienzo()
        .circuito.componentes.filter((c) => c.estado.quemado)
        .map((c) => c.id);
      expect(quemados, `${l.id} arranca con componentes quemados`).toEqual([]);
    }
  });

  it("y ninguna deja un componente al borde de su límite", () => {
    // Margen de al menos el 20 % sobre la potencia nominal, para que un
    // ajuste pequeño del estudiante no funda nada por sorpresa.
    for (const l of LECCIONES_IMPLEMENTADAS) {
      const c = l.circuitoInicial();
      const s = resolver(c);
      for (const comp of c.componentes) {
        if (comp.tipo !== "resistencia") continue;
        const nominal = (comp.params as { potenciaW: number }).potenciaW;
        const disipada = s.componentes.get(comp.id)?.potenciaW ?? 0;
        expect(
          disipada,
          `${l.id}/${comp.id} disipa ${disipada} W de ${nominal} W`,
        ).toBeLessThan(nominal * 0.8);
      }
    }
  });

  it("verificar el circuito de partida siempre falla: hay avería", () => {
    for (const l of LECCIONES_IMPLEMENTADAS) {
      const c = l.circuitoInicial();
      const veredicto = l.verificar(c, resolver(c));
      expect(veredicto.ok, `${l.id} da por buena su propia avería`).toBe(false);
      expect(veredicto.mensaje.length).toBeGreaterThan(30);
    }
  });
});

/* ------------------------------------------------------------- lección 2 */

describe("Lección 2 · el LED que se quema", () => {
  const L2 = leccionPorId("l2")!;

  it("arranca con el interruptor abierto: nada se ha quemado todavía", () => {
    leccion().iniciar(L2);
    const led = lienzo().circuito.componentes.find((c) => c.id === "LED1")!;
    expect(led.estado.quemado).toBe(false);
    expect(Math.abs(corrienteDe(lienzo().solucion!, "LED1"))).toBeLessThan(1e-6);
  });

  it("cerrar el interruptor sin resistencia funde el LED", () => {
    llegarAReparar(L2);
    lienzo().actualizarParams("S1", { cerrado: true });

    const led = lienzo().circuito.componentes.find((c) => c.id === "LED1")!;
    expect(led.estado.quemado).toBe(true);
  });

  it("verificar sin cerrar el interruptor pide cerrarlo", () => {
    llegarAReparar(L2);
    leccion().verificarReparacion();
    expect(leccion().ultimaVerificacion!.mensaje).toMatch(/sigue abierto/i);
  });

  it("con 330 Ω en serie y el interruptor cerrado, la da por buena", () => {
    llegarAReparar(L2);

    // Intercala la resistencia entre el interruptor y el LED.
    const r = lienzo().colocar("resistencia", { x: 420, y: 160 }, { valorOhm: 330 });
    lienzo().desconectar("w2");
    lienzo().conectar("S1:b", `${r}:a`);
    lienzo().conectar(`${r}:b`, "LED1:anodo");
    lienzo().actualizarParams("S1", { cerrado: true });

    leccion().verificarReparacion();
    expect(leccion().ultimaVerificacion!.ok).toBe(true);
    expect(corrienteDe(lienzo().solucion!, "LED1")).toBeGreaterThan(0.008);
  });

  it("una resistencia demasiado grande deja el LED sin encender", () => {
    llegarAReparar(L2);
    const r = lienzo().colocar("resistencia", { x: 420, y: 160 }, { valorOhm: 10000 });
    lienzo().desconectar("w2");
    lienzo().conectar("S1:b", `${r}:a`);
    lienzo().conectar(`${r}:b`, "LED1:anodo");
    lienzo().actualizarParams("S1", { cerrado: true });

    leccion().verificarReparacion();
    expect(leccion().ultimaVerificacion!.ok).toBe(false);
    expect(leccion().ultimaVerificacion!.mensaje).toMatch(/demasiado grande/i);
  });
});

/* ------------------------------------------------------------- lección 3 */

describe("Lección 3 · polarización directa e inversa", () => {
  const L3 = leccionPorId("l3")!;

  it("el diodo arranca en inversa y casi no circula corriente", () => {
    leccion().iniciar(L3);
    expect(tensionDe(lienzo().solucion!, "D1")).toBeLessThan(0);
    expect(Math.abs(corrienteDe(lienzo().solucion!, "D1"))).toBeLessThan(1e-6);
  });

  it("girar el diodo no arregla nada: mueve el dibujo, no las conexiones", () => {
    llegarAReparar(L3);
    lienzo().rotar("D1", 180);
    leccion().verificarReparacion();

    expect(leccion().ultimaVerificacion!.ok).toBe(false);
    expect(leccion().ultimaVerificacion!.mensaje).toMatch(/girarlo no basta/i);
  });

  it("cambiar los dos cables sí lo arregla, y cae 0,7 V", () => {
    llegarAReparar(L3);
    lienzo().desconectar("w2");
    lienzo().desconectar("w3");
    lienzo().conectar("R1:b", "D1:anodo");
    lienzo().conectar("D1:catodo", "LED1:anodo");

    leccion().verificarReparacion();
    expect(leccion().ultimaVerificacion!.ok).toBe(true);

    const v = tensionDe(lienzo().solucion!, "D1");
    expect(v).toBeGreaterThan(0.6);
    expect(v).toBeLessThan(0.8);
  });

  it("el distractor del diodo quemado explica cómo distinguirlo", () => {
    const opcion = L3.opciones.find((o) => o.id === "b")!;
    expect(opcion.explicacion).toMatch(/banda del cátodo|sin alimentar/i);
  });
});

/* ------------------------------------------------------------- lección 4 */

describe("Lección 4 · recta de carga", () => {
  const L4 = leccionPorId("l4")!;

  /** Corriente por el diodo con el cursor en una posición dada. */
  function corrienteCon(cursor: number): number {
    lienzo().actualizarParams("P1", { cursor });
    return corrienteDe(lienzo().solucion!, "D1");
  }

  it("con la avería, barrer el potenciómetro casi no mueve el punto Q", () => {
    leccion().iniciar(L4);
    const enCero = corrienteCon(0);
    const enUno = corrienteCon(1);
    // Menos de un 10 % de recorrido: el punto Q está clavado.
    expect(Math.abs(enUno - enCero) / Math.max(enCero, enUno)).toBeLessThan(0.1);
  });

  it("verificar sin tocar la resistencia fija falla y dice por qué", () => {
    llegarAReparar(L4);
    leccion().verificarReparacion();

    expect(leccion().ultimaVerificacion!.ok).toBe(false);
    expect(leccion().ultimaVerificacion!.mensaje).toMatch(/resistencia fija/i);
  });

  it("con 470 Ω el barrido recorre la región útil", () => {
    llegarAReparar(L4);
    lienzo().actualizarParams("R1", { valorOhm: 470 });
    leccion().verificarReparacion();

    expect(leccion().ultimaVerificacion!.ok).toBe(true);
  });

  it("y entonces el punto Q sí se mueve al barrer", () => {
    llegarAReparar(L4);
    lienzo().actualizarParams("R1", { valorOhm: 470 });

    const enCero = corrienteCon(0);
    const enUno = corrienteCon(1);
    expect(enCero).toBeGreaterThan(enUno * 2);
  });

  it("la corriente cambia de forma monótona con el cursor", () => {
    llegarAReparar(L4);
    lienzo().actualizarParams("R1", { valorOhm: 470 });

    let anterior = Infinity;
    for (const cursor of [0, 0.25, 0.5, 0.75, 1]) {
      const i = corrienteCon(cursor);
      expect(i).toBeLessThan(anterior);
      anterior = i;
    }
  });

  it("pasarse por abajo con la resistencia fija se rechaza", () => {
    llegarAReparar(L4);
    lienzo().actualizarParams("R1", { valorOhm: 1, potenciaW: 10 });
    leccion().verificarReparacion();
    expect(leccion().ultimaVerificacion!.ok).toBe(false);
  });
});

/* ------------------------------------------------------------- lección 5 */

describe("Lección 5 · el zener como regulador", () => {
  const L5 = leccionPorId("l5")!;

  /** Rehace el cableado del zener en la polaridad correcta. */
  function montarZenerBien() {
    lienzo().desconectar("w2");
    lienzo().desconectar("w4");
    lienzo().conectar("RS:b", "Z1:catodo");
    lienzo().conectar("Z1:anodo", "V1:negativo");
  }

  it("con el zener en directa la salida se queda en unos 0,7 V", () => {
    leccion().iniciar(L5);
    const vout = tensionDeSalidaL5(lienzo().circuito, lienzo().solucion);
    expect(vout).toBeGreaterThan(0.5);
    expect(vout).toBeLessThan(1);
  });

  it("verificar sin corregir la polaridad lo dice explícitamente", () => {
    llegarAReparar(L5);
    leccion().verificarReparacion();
    expect(leccion().ultimaVerificacion!.mensaje).toMatch(/sigue en directa/i);
  });

  it("montado en inversa regula a 5,1 V y la da por buena", () => {
    llegarAReparar(L5);
    montarZenerBien();
    leccion().verificarReparacion();

    expect(leccion().ultimaVerificacion!.ok).toBe(true);
    const vout = tensionDeSalidaL5(lienzo().circuito, lienzo().solucion);
    expect(vout).toBeGreaterThanOrEqual(5.0);
    expect(vout).toBeLessThanOrEqual(5.2);
  });

  it("la regulación se comprueba también con una carga más exigente", () => {
    llegarAReparar(L5);
    montarZenerBien();
    // Con una resistencia serie muy grande regula con 1 kΩ pero no aguanta más.
    lienzo().actualizarParams("RS", { valorOhm: 1200 });
    leccion().verificarReparacion();

    const v = leccion().ultimaVerificacion!;
    expect(v.ok).toBe(false);
    expect(v.mensaje).toMatch(/se hunde|no deja pasar corriente suficiente/i);
  });

  it("el mensaje de éxito informa de la potencia del zener", () => {
    llegarAReparar(L5);
    montarZenerBien();
    leccion().verificarReparacion();
    expect(leccion().ultimaVerificacion!.mensaje).toMatch(/disipa/i);
  });
});

/* ------------------------------------------------- una lección completa */

describe("recorrer una lección de las nuevas de punta a punta", () => {
  it("la lección 3 impecable saca la nota máxima y queda guardada", async () => {
    const identidad = await construirIdentidad("Ana Ruiz Marín", "1011111111");
    await useSesion.getState().ingresar(identidad);

    const L3 = leccionPorId("l3")!;
    leccion().iniciar(L3);
    leccion().avanzar();

    lienzo().activarInstrumento("tension");
    lienzo().ponerSonda("D1:anodo");
    lienzo().ponerSonda("D1:catodo");
    lienzo().desactivarInstrumento();

    leccion().avanzar();
    leccion().declararDiagnostico(L3.opciones.find((o) => o.correcta)!.id);
    leccion().avanzar();

    lienzo().desconectar("w2");
    lienzo().desconectar("w3");
    lienzo().conectar("R1:b", "D1:anodo");
    lienzo().conectar("D1:catodo", "LED1:anodo");
    leccion().verificarReparacion();
    leccion().avanzar();

    leccion().escribirBitacora("La IA me dijo que rotara el diodo; no bastaba.");
    await leccion().finalizar();

    expect(leccion().nota!.total).toBe(EVALUACION.escalaMax);

    const progreso = await almacen.cargarProgreso(identidad.ccHash);
    expect(progreso.l3!.aprobado).toBe(true);
    expect(progreso.l3!.ultimo!.mediciones).toBeGreaterThan(0);
    expect(progreso.l3!.bitacoraIA[0]).toMatch(/rotara/i);
  });
});

/* ------------------------------------------------------------ regresión */

describe("las lecciones no se pisan entre sí", () => {
  it("cada una carga su propio circuito al iniciarse", () => {
    for (const l of LECCIONES_IMPLEMENTADAS) {
      leccion().iniciar(l);
      const ids = lienzo()
        .circuito.componentes.map((c) => c.id)
        .sort();
      const esperados = l
        .circuitoInicial()
        .componentes.map((c) => c.id)
        .sort();
      expect(ids).toEqual(esperados);
    }
  });

  it("iniciar una lección pone los contadores a cero", () => {
    const L2 = leccionPorId("l2")!;
    leccion().iniciar(L2);
    lienzo().activarInstrumento("tension");
    lienzo().ponerSonda("V1:positivo");
    lienzo().ponerSonda("V1:negativo");
    expect(lienzo().contadores.mediciones).toBe(1);

    leccion().iniciar(leccionPorId("l3")!);
    expect(lienzo().contadores.mediciones).toBe(0);
    expect(lienzo().contadores.quemadosPorTipo).toEqual({});
  });

  it("un cable con el mismo nombre en dos lecciones no confunde nada", () => {
    // Todas usan w1, w2… y eso está bien: son circuitos independientes.
    leccion().iniciar(leccionPorId("l2")!);
    expect(lienzo().circuito.cables.find((c) => c.id === "w2")).toBeDefined();
    leccion().iniciar(leccionPorId("l5")!);
    expect(lienzo().circuito.cables.find((c) => c.id === "w2")).toBeDefined();
    expect(lienzo().circuito.cables).toHaveLength(6);
  });

  it("cable() sigue construyendo referencias válidas en todas", () => {
    expect(cable("wx", "A:a", "B:b").desde.componenteId).toBe("A");
  });
});
