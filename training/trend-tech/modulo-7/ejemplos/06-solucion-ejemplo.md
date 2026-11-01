# 06 · Solución

> Ejemplo resuelto con una organización **ficticia** (Panadería Trigal).
> Issue #09 · Archivo: `docs/06-solucion.md`

## Solución en BPMN

- Carriles: Cliente · Sistema (formulario y hoja) · Administradora · Cocina
- Empieza cuando: el cliente abre el formulario de pedido
- Termina cuando: el cliente recoge la torta

![Solución](../assets/solucion.png)

## ¿Qué pasa con cada punto crítico?

| Punto crítico (docs/03) | En la solución | Estado |
|---|---|---|
| 1 · Se pierden detalles en el chat | Campos obligatorios: fecha, sabor, tamaño y mensaje | Resuelto |
| 2 · La cocina ve los cambios tarde | El pedido aparece en el tablero de la cocina al instante | Resuelto |
| 3 · Errores al copiar el mensaje | El mensaje pasa tal como lo escribió el cliente | Reducido |

## Flujo de información

![Flujo de información](../assets/flujo-informacion.png)

| De | A | Qué datos viajan |
|---|---|---|
| Cliente (formulario) | Hoja compartida | Fecha, sabor, tamaño, mensaje, contacto por rol |
| Hoja compartida | Tablero de cocina | Pedidos del día y su estado |
| Tablero de cocina | Cliente | Aviso de pedido listo |

## Declaración de uso de IA

Según el numeral 5.3 del Acuerdo 006 de 2025 de la universidad:

- Herramientas usadas: ninguna en este documento.
- Para qué: —
- Revisión del equipo: los diagramas se dibujaron en bpmn.io a partir del proceso actual.
