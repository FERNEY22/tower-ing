# 03 · Proceso actual

> Ejemplo resuelto con una organización **ficticia** (Panadería Trigal).
> Issue #04 · Archivo: `docs/03-proceso-actual.md`

## Proceso

- Nombre del proceso: pedido de torta personalizada
- Empieza cuando: el cliente escribe por WhatsApp
- Termina cuando: el cliente recibe la torta en el mostrador
- Carriles: Cliente · Administradora · Cocina

## Diagrama BPMN

![Proceso actual](../assets/proceso-actual.png)

## Pasos

| # | Carril | Tarea o decisión |
|---|---|---|
| 1 | Cliente | Escribe por WhatsApp con su pedido |
| 2 | Administradora | Responde y pregunta los detalles |
| 3 | Administradora | Anota el pedido en el cuaderno |
| 4 | Administradora | ¿Hay disponibilidad para la fecha? Sí → paso 5 · No → ofrece otra fecha |
| 5 | Administradora | Cobra el abono |
| 6 | Cocina | Revisa el cuaderno cada mañana |
| 7 | Cocina | Prepara y decora la torta |
| 8 | Cliente | Recoge la torta en el mostrador |

## Puntos críticos

| # | Qué pasa | Por qué pasa | Efecto |
|---|---|---|---|
| 1 | Se pierden la fecha, el sabor o el mensaje | Los detalles llegan sueltos en el chat | Reprocesos y clientes inconformes |
| 2 | La cocina no ve los cambios del día | Solo revisa el cuaderno en la mañana | Tortas con datos desactualizados |
| 3 | Errores en el mensaje de la torta | Se copia a mano | Rehacer la decoración |

## Fuentes

- Observación en el local y conversación con la administradora.

## Declaración de uso de IA

Según el numeral 5.3 del Acuerdo 006 de 2025 de la universidad:

- Herramientas usadas: ninguna en este documento.
- Para qué: —
- Revisión del equipo: el diagrama se construyó con lo observado en la visita.
