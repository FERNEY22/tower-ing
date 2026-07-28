/* La maquinaria de la union PN, probada directamente. Los casos B, C y D
   la validan de extremo a extremo; aqui se comprueban las piezas que evitan
   que Newton explote, una a una. */

import { describe, it, expect } from "vitest";
import { MOTOR } from "@/config";
import {
  companionDe,
  evaluarUnion,
  limitarUnion,
  tensionCritica,
} from "@/motor/modelos/union";
import { evaluarZener, limitarZener } from "@/motor/modelos/zener";
import { evaluarLed, brilloDeLed } from "@/motor/modelos/led";
import { evaluarDiodo } from "@/motor/modelos/diodo";
import { DIODO_SILICIO, LED_POR_COLOR, derivarIs } from "@/motor/parametros";
import { cable, crearComponente, type Circuito } from "@/motor/circuito";
import { resolver, tieneNoLineales } from "@/motor";

describe("ecuacion de Shockley", () => {
  const { Is, n } = DIODO_SILICIO;

  it("en inversa profunda tiende a −Is", () => {
    expect(evaluarUnion(-5, Is, n).i).toBeCloseTo(-Is, 20);
  });

  it("en el origen no circula corriente", () => {
    expect(evaluarUnion(0, Is, n).i).toBe(0);
  });

  it("no decrece nunca", () => {
    // No se exige crecimiento estricto: en inversa profunda la curva es una
    // meseta plana en −Is y dos muestras vecinas dan el mismo double.
    let anterior = -Infinity;
    for (let v = -1; v <= 1.2; v += 0.05) {
      const i = evaluarUnion(v, Is, n).i;
      expect(i).toBeGreaterThanOrEqual(anterior);
      anterior = i;
    }
  });

  it("crece de verdad en la zona en la que se trabaja", () => {
    expect(evaluarUnion(0.75, Is, n).i).toBeGreaterThan(
      evaluarUnion(0.7, Is, n).i * 5,
    );
  });

  it("la conductancia nunca es negativa", () => {
    for (let v = -5; v <= 2; v += 0.1) {
      expect(evaluarUnion(v, Is, n).g).toBeGreaterThanOrEqual(0);
    }
  });

  it("da 20 mA en la caida para la que se calibro", () => {
    expect(evaluarDiodo(0.7).i).toBeCloseTo(0.02, 9);
  });
});

describe("saturacion del exponente", () => {
  const { Is, n } = DIODO_SILICIO;
  const vLimite = MOTOR.expArgMax * n * MOTOR.Vt;

  it("empalma sin salto: la extension arranca donde acaba la exponencial", () => {
    // Comparar dos puntos vecinos a secas no vale: en el limite la pendiente
    // es de cientos de miles de siemens, asi que dos tensiones separadas por
    // un nanovoltio dan corrientes que difieren en decimas de amperio sin que
    // haya discontinuidad ninguna. Lo que se comprueba es que el incremento
    // sea exactamente el que marca la tangente.
    const enLimite = evaluarUnion(vLimite, Is, n);
    const delta = 1e-6;
    const masAlla = evaluarUnion(vLimite + delta, Is, n);

    expect(masAlla.i - enLimite.i).toBeCloseTo(enLimite.g * delta, 6);
    expect(masAlla.g).toBeCloseTo(enLimite.g, 6);
  });

  it("por encima del limite la curva continua por su tangente", () => {
    // No se aplana: si la corriente quedara constante mientras la
    // conductancia sigue siendo enorme, el criterio de corriente no se
    // cumpliria jamas y Newton no terminaria nunca.
    const a = evaluarUnion(vLimite + 0.1, Is, n);
    const b = evaluarUnion(vLimite + 0.2, Is, n);
    expect(b.i).toBeGreaterThan(a.i);
    expect(a.g).toBeCloseTo(b.g, 6); // misma pendiente: es una recta
  });

  it("no desborda ni devuelve infinito con tensiones absurdas", () => {
    const r = evaluarUnion(100, Is, n);
    expect(Number.isFinite(r.i)).toBe(true);
    expect(Number.isFinite(r.g)).toBe(true);
  });
});

describe("modelo compañero", () => {
  const { Is, n } = DIODO_SILICIO;

  it("reproduce exactamente el punto en el que se linealizo", () => {
    const v = 0.65;
    const ev = evaluarUnion(v, Is, n);
    const c = companionDe(ev, v);
    expect(c.Geq * v + c.Ieq).toBeCloseTo(ev.i, 15);
  });

  it("la recta tangente queda por debajo de la exponencial, como debe", () => {
    const v = 0.6;
    const c = companionDe(evaluarUnion(v, Is, n), v);
    const vLejos = 0.7;
    const recta = c.Geq * vLejos + c.Ieq;
    expect(recta).toBeLessThan(evaluarUnion(vLejos, Is, n).i);
  });
});

describe("tension critica", () => {
  it("cae junto al codo del diodo de silicio", () => {
    const vcrit = tensionCritica(DIODO_SILICIO.Is, DIODO_SILICIO.n);
    expect(vcrit).toBeGreaterThan(0.6);
    expect(vcrit).toBeLessThan(0.8);
  });

  it("es mayor en un LED azul que en uno rojo", () => {
    const rojo = tensionCritica(LED_POR_COLOR.rojo.Is, LED_POR_COLOR.rojo.n);
    const azul = tensionCritica(LED_POR_COLOR.azul.Is, LED_POR_COLOR.azul.n);
    expect(azul).toBeGreaterThan(rojo);
  });
});

describe("limitacion del paso de tension", () => {
  const { n } = DIODO_SILICIO;
  const vcrit = tensionCritica(DIODO_SILICIO.Is, n);

  it("deja pasar los pasos pequeños sin tocarlos", () => {
    expect(limitarUnion(0.68, 0.675, n, vcrit)).toBe(0.68);
  });

  it("amortigua un salto de 0 V a 5 V", () => {
    const limitado = limitarUnion(5, 0, n, vcrit);
    expect(limitado).toBeLessThan(1);
    expect(limitado).toBeGreaterThan(0);
  });

  it("no toca la polarizacion inversa", () => {
    expect(limitarUnion(-3, 0, n, vcrit)).toBe(-3);
  });

  it("converge hacia el punto de operacion en pocos pasos", () => {
    let v = 0;
    for (let k = 0; k < 20; k++) v = limitarUnion(0.7, v, n, vcrit);
    expect(v).toBeCloseTo(0.7, 6);
  });
});

describe("modelo del zener", () => {
  const VZ = 5.1;

  it("en directa se comporta como un diodo de silicio", () => {
    expect(evaluarZener(0.7, VZ).i).toBeCloseTo(evaluarDiodo(0.7).i, 6);
  });

  it("entre cero y la ruptura apenas conduce", () => {
    expect(Math.abs(evaluarZener(-3, VZ).i)).toBeLessThan(1e-6);
  });

  it("en la ruptura conduce en sentido inverso", () => {
    expect(evaluarZener(-5.5, VZ).i).toBeLessThan(-1e-3);
  });

  it("da la corriente de prueba a la tension nominal", () => {
    // Es la correccion del codo: "5,1 V" es la tension A 20 mA.
    expect(evaluarZener(-VZ, VZ).i).toBeCloseTo(-0.02, 4);
  });

  it("no decrece en todo el rango", () => {
    // Entre cero y la ruptura hay una meseta de fuga constante: ahi la
    // curva es plana, no creciente. Lo que no puede es bajar, o Newton se
    // quedaria dando tumbos entre dos puntos.
    let anterior = -Infinity;
    for (let v = -7; v <= 1; v += 0.05) {
      const i = evaluarZener(v, VZ).i;
      expect(i).toBeGreaterThanOrEqual(anterior);
      anterior = i;
    }
  });

  it("crece con fuerza al entrar en ruptura", () => {
    expect(Math.abs(evaluarZener(-5.6, VZ).i)).toBeGreaterThan(
      Math.abs(evaluarZener(-5.4, VZ).i) * 2,
    );
  });

  it("la conductancia suma las dos ramas y nunca es negativa", () => {
    for (let v = -7; v <= 1; v += 0.1) {
      expect(evaluarZener(v, VZ).g).toBeGreaterThanOrEqual(0);
    }
  });

  it("un zener de 3,3 V rompe antes que uno de 12 V", () => {
    expect(Math.abs(evaluarZener(-4, 3.3).i)).toBeGreaterThan(
      Math.abs(evaluarZener(-4, 12).i),
    );
  });

  it("la limitacion protege tambien la zona de ruptura", () => {
    const limitado = limitarZener(-20, 0, VZ);
    expect(limitado).toBeGreaterThan(-20); // se amortiguo
  });
});

describe("LEDs por color", () => {
  it("cada color enciende a su tension", () => {
    expect(evaluarLed(1.9, "rojo").i).toBeCloseTo(0.02, 9);
    expect(evaluarLed(2.1, "verde").i).toBeCloseTo(0.02, 9);
    expect(evaluarLed(3.1, "azul").i).toBeCloseTo(0.02, 9);
  });

  it("a igual tension, el rojo conduce mucho mas que el azul", () => {
    expect(evaluarLed(2.0, "rojo").i).toBeGreaterThan(
      evaluarLed(2.0, "azul").i * 1000,
    );
  });

  it("el brillo crece con la corriente y se satura", () => {
    expect(brilloDeLed(0)).toBe(0);
    expect(brilloDeLed(-0.001)).toBe(0);
    expect(brilloDeLed(0.01)).toBeCloseTo(0.5, 6);
    expect(brilloDeLed(0.02)).toBe(1);
    expect(brilloDeLed(0.05)).toBe(1);
  });
});

describe("derivacion de Is", () => {
  it("es la inversa exacta de Shockley", () => {
    const n = 2;
    const Is = derivarIs(1.9, 0.02, n);
    expect(evaluarUnion(1.9, Is, n).i).toBeCloseTo(0.02, 12);
  });

  it("un n mayor exige un Is menor para la misma caida", () => {
    expect(derivarIs(2, 0.02, 3)).toBeGreaterThan(derivarIs(2, 0.02, 1));
  });
});

describe("eleccion del solver", () => {
  function circuitoCon(tipo: "resistencia" | "diodo"): Circuito {
    const elemento =
      tipo === "diodo"
        ? crearComponente("diodo", "x1")
        : crearComponente("resistencia", "x1", { valorOhm: 1000 });
    const entrada = tipo === "diodo" ? "x1:anodo" : "x1:a";
    const salida = tipo === "diodo" ? "x1:catodo" : "x1:b";

    return {
      componentes: [
        crearComponente("fuenteDC", "v1", { tensionV: 5 }),
        crearComponente("resistencia", "r1", { valorOhm: 1000 }),
        elemento,
        crearComponente("tierra", "gnd"),
      ],
      cables: [
        cable("w1", "v1:positivo", "r1:a"),
        cable("w2", "r1:b", entrada),
        cable("w3", salida, "v1:negativo"),
        cable("w4", "v1:negativo", "gnd:ref"),
      ],
    };
  }

  it("detecta cuando hay que iterar y cuando no", () => {
    expect(tieneNoLineales(circuitoCon("diodo"))).toBe(true);
    expect(tieneNoLineales(circuitoCon("resistencia"))).toBe(false);
  });

  it("un diodo sin conectar no obliga a iterar", () => {
    const c = circuitoCon("resistencia");
    c.componentes.push(crearComponente("led", "suelto"));
    expect(tieneNoLineales(c)).toBe(false);
  });

  it("resolver elige solo y devuelve lo mismo en el caso lineal", () => {
    const s = resolver(circuitoCon("resistencia"));
    expect(s.ok).toBe(true);
    expect(s.iteraciones).toBe(1);
  });

  it("un diodo quemado deja de ser no lineal: es un circuito abierto", () => {
    const c = circuitoCon("diodo");
    c.componentes.find((x) => x.id === "x1")!.estado.quemado = true;
    expect(tieneNoLineales(c)).toBe(false);

    const s = resolver(c);
    expect(s.ok).toBe(true);
    expect(Math.abs(s.componentes.get("r1")!.corrienteA)).toBeLessThan(1e-9);
  });
});
