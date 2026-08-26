# Fase 9 — Limpieza y linting

| Campo | Valor |
|---|---|
| Estado | 🔴 Pendiente |
| Fecha inicio | — |
| Fecha cierre | — |
| Commit | — |
| Responsable | — |

---

## Objetivo

Cerrar la deuda residual de calidad que sigue fuera del alcance de las fases funcionales y de reactividad:
accesibilidad de plantillas, tipado, constructores vacíos, señales no adoptadas y pequeños restos de
código muerto. Esta fase debe dejar `pnpm lint` en verde o, al menos, bajar la deuda a una base acotada y
explicada.

---

## Tareas planificadas

| # | Ubicación | Acción | Estado |
|---|---|---|---|
| 9.1 | Plantillas amplias | Corregir `label-has-associated-control`, `click-events-have-key-events`, `interactive-supports-focus` y `alt-text`. | ☐ |
| 9.2 | Servicios API | Eliminar constructores vacíos y tipar respuestas y métodos donde siga habiendo `any` o tipos inferrables innecesarios. | ☐ |
| 9.3 | `notification.service.ts` y servicios afines | Migrar el estado restante a signals donde aporte valor y eliminar `no-inferrable-types`. | ☐ |
| 9.4 | Componentes con `ngModel` y formularios legacy | Reducir el ruido de lint y preparar la transición de Fase 8. | ☐ |
| 9.5 | Baseline de lint | Ejecutar `pnpm lint`, clasificar deuda heredada y dejar el árbol sin regresiones nuevas. | ☐ |

---

## Cambios realizados

### Ficheros creados

- `plan/fases/fase-09-limpieza-y-linting.md` — trazabilidad prevista para la fase de deuda residual.

### Ficheros modificados

- Ninguno todavía.

### Ficheros eliminados

- Ninguno.

### Dependencias

- Añadidas: ninguna.
- Eliminadas: ninguna.

---

## Desviaciones respecto al plan

| # | Desviación | Motivo | Impacto en fases posteriores |
|---|---|---|---|
| 1 | La fase se crea antes de empezar el trabajo. | El plan necesitaba un destino explícito para la deuda de lint y limpieza que quedó fuera de Fase 5 y Fase 6. | Ninguno; formaliza el backlog pendiente. |

---

## Hallazgos nuevos

| # | Hallazgo | Severidad | Resolución |
|---|---|---|---|
| 1 | La deuda de lint residual sigue concentrada en accesibilidad de plantillas y formularios legacy. | Media | Pendiente |
| 2 | Existen servicios con constructores vacíos y tipos inferrables que siguen generando ruido. | Baja | Pendiente |
| 3 | Parte del estado aún usa patrones previos a signals por conveniencia, no por necesidad. | Baja | Pendiente |

---

## Verificación

| Comprobación | Resultado |
|---|---|
| `pnpm build` | ☐ |
| `pnpm lint` | ☐ |
| `pnpm test` | ☐ |
| Verificación funcional manual | ☐ |

**Detalle de la verificación funcional:**

Pendiente de ejecución.

---

## Métricas

| Métrica | Antes | Después |
|---|---|---|
| Hallazgos de lint heredados | 189 | — |
| Plantillas con deuda accesible | múltiples | — |
| Constructores vacíos | varios | — |
| `any` restantes | varios | — |

---

## Notas

- Esta fase nace como continuación natural tras Fase 6, no como corrección de funcionalidad.
- Si el lint queda en verde antes de agotar todas las tareas, la fase puede cerrarse con menor alcance real
  y una nota de deuda residual explícita.
