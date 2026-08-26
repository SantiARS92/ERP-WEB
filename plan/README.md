# Carpeta `plan/`

Documentación y trazabilidad del refactor de modernización a Angular 21.

## Contenido

| Fichero | Propósito |
|---|---|
| `PLAN-MODERNIZACION-ANGULAR.md` | **Documento maestro.** Análisis, decisiones cerradas, las 8 fases y las métricas objetivo. |
| `fases/_PLANTILLA.md` | Plantilla a copiar al cerrar cada fase. |
| `fases/fase-NN-*.md` | Registro de cada fase completada. |

## Flujo de trabajo

1. Antes de empezar una fase, se marca 🟡 en la tabla de [Trazabilidad] del documento maestro.
2. Se copia `fases/_PLANTILLA.md` a `fases/fase-NN-<slug>.md`.
3. Se ejecuta la fase, anotando desviaciones y hallazgos nuevos **según ocurren**, no al final.
4. Se verifica: `pnpm build`, `pnpm lint`, `pnpm test` y prueba funcional manual.
5. Se cierra el documento de fase, se marca 🟢 en el maestro con fecha y SHA del commit.

Una fase **no** se marca como completada si queda cualquiera de las verificaciones en rojo.

[Trazabilidad]: ./PLAN-MODERNIZACION-ANGULAR.md#trazabilidad

## Estado actual

| Fase | Estado |
|---|---|
| 1 — Bloqueantes | 🔴 Pendiente |
| 2 — Eliminación SSR | 🔴 Pendiente |
| 3 — Tooling | 🔴 Pendiente |
| 4 — Migraciones automáticas | 🔴 Pendiente |
| 5 — Limpieza | 🔴 Pendiente |
| 6 — Reactividad | 🔴 Pendiente |
| 7 — Arquitectura | 🟢 Completada |
| 8 — Refactor profundo | 🔴 Pendiente |
