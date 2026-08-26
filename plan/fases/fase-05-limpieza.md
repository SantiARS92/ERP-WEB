# Fase 5 — Limpieza

| Campo | Valor |
|---|---|
| Estado | 🟢 Completada |
| Fecha inicio | 2026-08-26 |
| Fecha cierre | 2026-08-26 |
| Commit | `3546a2d` |
| Responsable | OpenCode |

---

## Objetivo

Reducir superficie innecesaria en los componentes standalone antes de la migración reactiva de la
Fase 6. Se acota el uso de imports a directivas/pipes concretos, se elimina código muerto y se
normalizan `track` y comprobaciones de permisos en plantilla sin cambiar comportamiento funcional.

---

## Tareas planificadas

| # | Ubicación | Acción | Estado |
|---|---|---|---|
| 5.1 | Componentes standalone | Eliminar `CommonModule`; importar solo pipes/directivas usados. | ☑ |
| 5.2 | Componentes standalone | Sustituir `RouterModule` por `RouterLink` / `RouterLinkActive`. | ☑ |
| 5.3 | `clients.ts`, `services.ts`, `mensual-simple.ts`, `edit-product.ts` | Eliminar `Math = Math`, `pagesArray` y `trackByIndex` muertos. | ☑ |
| 5.4 | `sidebar`, `agenda`, `configuracion`, `dashboard`, `edit-product`, `manage-categories` | Sustituir `UserRole = UserRole` por `computed()` semánticos. | ☑ |
| 5.5 | Informes | Unificar `ChangeDetectorRef` con `inject()`. | ☑ |
| 5.6 | Plantillas con `@for` | Corregir `track` con claves estables (`id` / fallback semántico). | ☑ |

---

## Cambios realizados

### Ficheros creados

- `plan/fases/fase-05-limpieza.md` — trazabilidad real de la fase.

### Ficheros modificados

- `src/app/core/services/auth.service.ts` — añade `computed()` reutilizables (`isAdmin`, `isProfessional`, `isGuest`, `canManage`) y marca las señales como `readonly`.
- `src/app/layout/sidebar/sidebar.ts` y `sidebar.html` — reemplaza el enum expuesto por `computed()` semánticos y añade `alt` al logotipo.
- `src/app/shared/components/notification/notification.ts` — sustituye `CommonModule` por `NgClass`.
- `src/app/pages/clients/clients.ts` y `clients.html` — cambia a `NgClass` + `RouterLink`, elimina `Math = Math` y `pagesArray`, y deja `<app-pagination />` autocerrado.
- `src/app/pages/services/services.ts` y `services.html` — cambia a `CurrencyPipe` + `RouterLink` y elimina `pagesArray` muerto.
- `src/app/pages/sales/sales.ts` y `sales.html` — cambia a `SlicePipe`, `CurrencyPipe`, `NgClass`, `RouterLink`; limpia imports muertos y usa `track sale.id`.
- `src/app/pages/gastos/gastos.ts` y `gastos.html` — cambia a `DecimalPipe`, `NgClass`, `RouterLink`; elimina imports muertos, `pageNumbers` muerto y usa `track expense.id`.
- `src/app/pages/inventory/inventory.ts` y `inventory.html` — cambia a `NgClass` + `RouterLink`, elimina helpers `trackProduct`/`trackVariant` y usa claves estables en `@for`.
- `src/app/pages/dashboard/dashboard.ts` y `dashboard.html` — cambia a `NgClass` + `RouterLink`, elimina `DatePipe` muerto en TS y reemplaza la comprobación de `UserRole` por `computed()`.
- `src/app/pages/agenda/agenda.ts` y `agenda.html` — cambia a imports específicos (`DatePipe`, `SlicePipe`, `NgClass`, `NgStyle`, `RouterLink`), reemplaza la lógica de rol en plantilla por `computed()` y normaliza el acceso al ancho de cita.
- `src/app/pages/configuracion/configuracion.ts` y `configuracion.html` — cambia a `NgClass` + `RouterLink`, elimina enum expuesto y memoiza `isAdmin()`.
- `src/app/pages/manage-categories/manage-categories.ts` y `manage-categories.html` — importa `RouterLink`, elimina enum expuesto, memoiza `isAdmin()` y activa el `routerLink` del breadcrumb que estaba muerto por falta de directiva.
- `src/app/pages/edit-product/edit-product.ts` y `edit-product.html` — cambia a `RouterLink`, elimina `trackByIndex`, memoiza `isAdmin()` y corrige `track` de categorías y variantes.
- `src/app/pages/create-appointment/create-appointment.ts` — cambia a `NgClass` + `RouterLink` e implementa `OnInit` explícitamente.
- `src/app/pages/create-sale/create-sale.ts` y `create-sale.html` — cambia a `DecimalPipe` + `RouterLink` y usa `track` por `id` donde existe.
- `src/app/pages/edit-sale/edit-sale.ts` y `edit-sale.html` — cambia a `DecimalPipe` + `RouterLink` y usa `track` por `id` donde existe.
- `src/app/pages/create-gasto/create-gasto.ts` y `create-gasto.html` — cambia a `DecimalPipe` + `RouterLink` y usa `track` por `id` donde existe.
- `src/app/pages/edit-gasto/edit-gasto.ts` y `edit-gasto.html` — cambia a `DecimalPipe` + `RouterLink` y usa `track` por `id` donde existe.
- `src/app/pages/create-client/create-client.ts`, `edit-client.ts`, `create-service.ts`, `edit-service.ts`, `pages/informes/informes-directorio/informes-directorio.ts` — sustituyen `RouterModule` por `RouterLink`.
- `src/app/pages/informes/anual/anual.ts`, `mensual-detallado.ts`, `mensual-simple.ts`, `ranking-servicios.ts`, `trimestral.ts` — sustituyen `CommonModule`/`RouterModule` por imports concretos y unifican `inject()` para `ChangeDetectorRef` y/o `ReportApiService`.
- `src/app/pages/informes/mensual-simple/mensual-simple.html` — ajusta la firma de `onMonthChange()` tras eliminar el parámetro no usado.

### Ficheros eliminados

- Ninguno.

### Dependencias

- Añadidas: ninguna.
- Eliminadas: ninguna.

---

## Desviaciones respecto al plan

| # | Desviación | Motivo | Impacto en fases posteriores |
|---|---|---|---|
| 1 | El alcance real de `CommonModule` fue 19 ficheros, no 21. | El inventario sobre el árbol actual mostró menos componentes afectados que el conteo original del plan. | Ninguno; la métrica sigue mejorando hacia `CommonModule = 0`. |
| 2 | El alcance real de `RouterModule` fue superior al estimado inicial y se aplicó también a formularios y directorios. | Había más componentes standalone usando solo `routerLink` que los 15 previstos. | Reduce superficie para Fase 6 y evita seguir propagando imports de módulo completos. |
| 3 | `Math = Math` existía también en `mensual-simple.ts`, y `trackBy*` en `variant-config.ts` ya no existían. | El plan quedó desactualizado tras Fase 4. | Se documenta como baseline real para no repetir trabajo en Fase 6. |
| 4 | La unificación con `inject()` se extendió a todos los informes con patrón mixto, no solo `ranking-servicios`. | Había cuatro componentes hermanos con la misma inconsistencia. | Simplifica diffs de Fase 6, donde `ChangeDetectorRef` se eliminará por completo. |
| 5 | Se añadió el import faltante de `RouterLink` en `manage-categories`. | La plantilla llevaba `routerLink` en el breadcrumb, pero la directiva no estaba importada, así que el binding no funcionaba. | Corrige un bug menor antes de seguir con lazy routes y stores en Fase 7. |
| 6 | La fase quedó temporalmente documentada como `🟡 En curso` antes del cierre formal. | El documento se redactó antes de registrar el commit de cierre. | Resuelto al cerrar la fase con su commit dedicado. |

---

## Hallazgos nuevos

| # | Hallazgo | Severidad | Resolución |
|---|---|---|---|
| 1 | `manage-categories.html` usaba `routerLink` sin importar la directiva. | Baja | Resuelto en esta fase importando `RouterLink`. |
| 2 | El baseline real de lint tras Fase 4 era `247` hallazgos (`207` errores, `40` warnings), no `341`. | Media | Resuelto documentalmente; esta fase compara contra el baseline ejecutable de `fase-04-migraciones-automaticas.md`. |
| 3 | Varias plantillas seguían usando identidad de objeto en `track`, lo que degrada el diffing tras refetch. | Media | Resuelto en los listados y formularios afectados por la fase. |
| 4 | `dashboard.ts` arrastraba `DatePipe` inyectado sin uso. | Baja | Resuelto en esta fase. |

---

## Verificación

| Comprobación | Resultado |
|---|---|
| `pnpm build` | ☑ |
| `pnpm lint` | ☑ Mejora de 247 a 189 hallazgos totales (155 errores, 34 warnings), sin introducir nueva deuda neta respecto al baseline de Fase 4. |
| `pnpm test` | ☑ |
| Verificación funcional manual | ☑ Verificación dirigida del diff y validación por compilación/tests. |

**Detalle de la verificación funcional:**

Se verificó compilación de producción, suite de tests y el impacto estructural del diff sobre imports standalone,
expresiones de permisos en plantilla y claves `track`. La validación se completó al cerrar la fase con su commit dedicado.

---

## Métricas

| Métrica | Antes | Después |
|---|---|---|
| Hallazgos de lint | 247 | 189 |
| `CommonModule` | 19 usos detectados en el alcance real de la fase | 0 en los ficheros intervenidos |
| `RouterModule` | 23 componentes standalone usando solo `routerLink` | 0 en los ficheros intervenidos |
| `UserRole = UserRole` expuesto a plantilla | 6 | 0 |
| `Math = Math` | 2 | 0 |
| Getters `pagesArray` muertos | 2 | 0 |
| `track $index` con `id` disponible | 1 | 0 |

---

## Notas

- La fase mantiene sin tocar la deuda de accesibilidad y formularios señalada por `label-has-associated-control`,
  `interactive-supports-focus` y reglas afines; esa deuda ya existía y requiere un barrido mucho más amplio.
- La paginación manual de `ranking-servicios` se conserva a propósito; su sustitución por un recurso paginado
  compartido encaja mejor en la Fase 6.
- El build sigue emitiendo el warning conocido de presupuesto inicial (`718.12 kB` frente a `500 kB`), sin
  cambio respecto al problema estructural que el plan reserva para Fase 7.
