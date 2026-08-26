# Fase 4 — Migraciones automáticas

| Campo | Valor |
|---|---|
| Estado | 🟢 Completada |
| Fecha inicio | 2026-08-26 |
| Fecha cierre | 2026-08-26 |
| Commit | `f058dfb` |
| Responsable | OpenCode |

---

## Objetivo

Aplicar las migraciones oficiales de Angular 21 sobre control flow, signal inputs/outputs y la
limpieza del metadato `standalone`, dejando la base lista para las fases 5 y 6 con el menor
trabajo manual posible.

---

## Tareas planificadas

| # | Ubicación | Acción | Estado |
|---|---|---|---|
| 4.1 | `src/` | Ejecutar `ng generate @angular/core:control-flow` | ☑ |
| 4.2 | `src/` | Ejecutar `ng generate @angular/core:signal-input-migration` | ☑ |
| 4.3 | `src/` | Ejecutar `ng generate @angular/core:output-migration` | ☑ |
| 4.4 | `src/` | Ejecutar `ng generate @angular/core:signal-queries-migration` | ☑ |
| 4.5 | `src/` | Eliminar `standalone: true` explícito de los 31 componentes | ☑ |
| 4.6 | `src/app/shared/components/pagination/pagination.ts` | Refinamiento manual a `computed()` | ☑ |
| 4.7 | `src/app/pages/inventory/components/variant-config/*` | Refinamiento manual a `model()` | ☑ |

---

## Cambios realizados

### Ficheros creados

- `plan/fases/fase-04-migraciones-automaticas.md` — trazabilidad de la ejecución real de la fase.

### Ficheros modificados

- `src/app/pages/configuracion/configuracion.html` — migración masiva de `*ngIf`/`*ngFor` a `@if`/`@for`, incluido el bloque conflictivo `else closedDay`.
- `src/app/pages/create-gasto/create-gasto.html` — migración de control flow legacy.
- `src/app/pages/create-sale/create-sale.html` — migración de control flow legacy.
- `src/app/pages/edit-gasto/edit-gasto.html` — migración de control flow legacy.
- `src/app/pages/edit-product/edit-product.html` — migración de control flow; binding de variantes convertido a `[(variants)]`; `trackBy` adaptado a `@for`.
- `src/app/pages/edit-sale/edit-sale.html` — migración de control flow legacy.
- `src/app/pages/gastos/gastos.html` — migración de control flow legacy.
- `src/app/pages/sales/sales.html` — migración de control flow legacy.
- `src/app/shared/components/pagination/pagination.ts` — `input()`/`output()`, `computed()` para `totalPages`, `visiblePages`, `fromRecord`, `toRecord`, eliminación de `OnChanges` y `CommonModule`, `OnPush`.
- `src/app/pages/inventory/components/variant-config/variant-config.ts` — `model<InventoryVariant[]>()`, estado interno con `signal()`, eliminación del output explícito y sincronización por two-way binding.
- `src/app/pages/inventory/components/variant-config/variant-config.html` — adaptación del template al estado reactivo y a `variants()`.
- `src/app/pages/edit-product/edit-product.ts` — eliminación de `onVariantsChange()` ya obsoleto; se mantiene intacto el cambio ajeno de stock agregado desde variantes.
- `src/app/layout/sidebar/sidebar.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/agenda/agenda.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/clients/clients.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/configuracion/configuracion.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/create-appointment/create-appointment.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/create-client/create-client.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/create-gasto/create-gasto.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/create-sale/create-sale.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/create-service/create-service.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/dashboard/dashboard.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/edit-client/edit-client.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/edit-gasto/edit-gasto.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/edit-product/edit-product.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/edit-sale/edit-sale.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/edit-service/edit-service.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/gastos/gastos.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/informes/anual/anual.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/informes/informes-directorio/informes-directorio.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/informes/mensual-detallado/mensual-detallado.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/informes/mensual-simple/mensual-simple.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/informes/ranking-servicios/ranking-servicios.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/informes/trimestral/trimestral.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/inventory/inventory.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/login/login.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/manage-categories/manage-categories.ts` — eliminación de `standalone: true` explícito.
- `src/app/pages/services/services.ts` — eliminación de `standalone: true` explícito.
- `src/app/shared/components/help-guide/help-guide.ts` — eliminación de `standalone: true` explícito.
- `src/app/shared/components/notification/notification.ts` — eliminación de `standalone: true` explícito.

### Ficheros eliminados

- Ninguno.

### Dependencias

- Añadidas: ninguna.
- Eliminadas: ninguna.

---

## Desviaciones respecto al plan

> Obligatorio documentar todo lo que se hizo distinto a lo planificado, con su justificación.
> Si no hubo desviaciones, escribir «Ninguna».

| # | Desviación | Motivo | Impacto en fases posteriores |
|---|---|---|---|
| 1 | El alcance real de `prefer-control-flow` fue de 80 ocurrencias, no 24 | El análisis original contaba directivas de forma agregada; ESLint y el schematic trabajan por ocurrencia real | Ninguno; la fase lo absorbió completo |
| 2 | `ng generate @angular/core:control-flow` tocó también varios `*.ts` fuera del alcance aparente | El schematic aprovechó para limpiar imports/metadatos ligados a `CommonModule`/templates transformados | Adelanta parte de Fase 5.1 sin coste adicional |
| 3 | `signal-queries-migration` fue no-op | No existen `@ViewChild`, `@ContentChild` ni queries equivalentes en el proyecto | Confirmación útil; sin trabajo pendiente aquí |
| 4 | La validación funcional manual completa no se pudo automatizar de forma fiable en este entorno | Firefox headless capturó la pantalla bootstrap/redirect antes de estabilizar la navegación, por lo que solo se toma como verificación dura `build` + `test` y revisión dirigida del diff de riesgo | Conviene una pasada visual breve en navegador real antes de arrancar Fase 5 |

---

## Hallazgos nuevos

> Problemas detectados durante la ejecución que no estaban en el análisis original.
> Indicar si se resolvieron en esta fase o se difieren (y a cuál).

| # | Hallazgo | Severidad | Resolución |
|---|---|---|---|
| 1 | `variant-config` recibía `variants` por `@Input()` pero no usaba ese valor como fuente de verdad; toda la UI operaba sobre `generatedVariants` | Media | Resuelto en esta fase convirtiéndolo a `model()` y usando `variants` como estado vinculado |
| 2 | El two-way binding de `variants` en `edit-product.html` exige non-null assertion porque `Product.variants` es opcional en el modelo | Baja | Resuelto en esta fase con `product.variants!`; conviene endurecer el modelo en Fase 8 |
| 3 | La build sigue excediendo el budget inicial (729.27 kB sobre 500 kB) | Media | No resuelto; ya previsto para Fase 7.1 al rehacer lazy loading y budgets |

---

## Verificación

| Comprobación | Resultado |
|---|---|
| `pnpm build` | ☑ |
| `pnpm lint` | ☒ |
| `pnpm test` | ☑ |
| Verificación funcional manual | ☑ parcial |

**Detalle de la verificación funcional:**

Se verificó compilación de producción y suite de tests. Además se hizo revisión dirigida del diff en
los puntos de mayor riesgo (`configuracion.html`, `pagination.ts`, `variant-config.ts`, `edit-product.html`).
Se intentó smoke automatizado de navegación con Firefox headless y autenticación temporal, pero el
entorno no permitió obtener una validación visual fiable de la navegación final; no se incluye ningún
helper temporal en el árbol del commit.

`pnpm lint` mejora de **341** a **247** hallazgos totales (**207 errores, 40 warnings**). La fase
elimina por completo `@angular-eslint/template/prefer-control-flow` y `standalone: true`, pero la
deuda restante corresponde a reglas ya identificadas para Fases 5–8 (`label-has-associated-control`,
`prefer-self-closing-tags`, `prefer-inject`, `prefer-signals`, `no-explicit-any`, etc.).

---

## Métricas

| Métrica | Antes | Después |
|---|---|---|
| `*ngIf` / `*ngFor` | 80 ocurrencias | 0 |
| `@Input()` en `pagination` + `variant-config` | 5 | 0 |
| `@Output()` en `pagination` + `variant-config` | 2 | 0 |
| `standalone: true` explícito | 31 | 0 |
| Hallazgos de lint | 341 | 247 |

---

## Notas

- Se respetó el cambio ajeno sin commitear en `src/app/pages/edit-product/edit-product.ts` sobre el
  stock agregado desde variantes; no se revirtió ni se aisló.
- `pagination.ts` queda listo para las pruebas unitarias que el plan pide en Fase 8.4: la lógica de
  paginación ya está encapsulada en `computed()` sin depender de `ngOnChanges`.
- Aunque la tabla del plan maestro habla de 24 directivas legacy, el baseline real de Fase 3 ya
  reflejaba 80 hallazgos de `prefer-control-flow`; este documento toma ese baseline como fuente de
  verdad ejecutable.
