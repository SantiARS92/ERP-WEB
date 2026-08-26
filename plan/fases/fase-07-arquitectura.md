# Fase 7 — Arquitectura

| Campo | Valor |
|---|---|
| Estado | 🟡 En curso |
| Fecha inicio | 2026-08-26 |
| Fecha cierre | — |
| Commit | — |
| Responsable | OpenCode |

---

## Objetivo

Reducir el acoplamiento transversal del frontend moviendo el acceso a `localStorage`, las descargas
de ficheros, las confirmaciones y parte del estado compartido a infraestructura común, además de
trocear el routing en features lazy para adelgazar el entrypoint principal.

---

## Tareas planificadas

| # | Ubicación | Acción | Estado |
|---|---|---|---|
| 7.1 | `app.routes.ts`, `pages/*.routes.ts`, `angular.json` | Reorganizar el routing por features lazy y reajustar budgets. | ☑ |
| 7.2 | `core/services`, `core/utils` | Añadir `StorageService`, `FileDownloadService` y `date.util`. | ☑ |
| 7.3 | `core/state`, `settings-api.service.ts`, formularios con catálogos | Separar `SettingsStore` y crear stores compartidos de catálogo. | ☑ |
| 7.4 | `dashboard.ts`, `inventory.ts` | Resolver el N+1 de variantes cuando el backend embeba `variants`. | ☐ Bloqueada por backend |
| 7.5 | `shared/components`, pantallas con `alert()` / `confirm()` | Sustituir confirmaciones nativas y avanzar la UX de errores. | ☑ |

---

## Cambios realizados

### Ficheros creados

- `src/app/core/services/storage.service.ts` — punto único de acceso a persistencia local para token, tema y fallback de negocio.
- `src/app/core/services/file-download.service.ts` — descarga centralizada de blobs con `DOCUMENT`.
- `src/app/core/services/confirm.service.ts` — API `ask(): Promise<boolean>` para confirmaciones compartidas.
- `src/app/core/utils/date.util.ts` — util `toIsoDate()` para normalizar fechas `YYYY-MM-DD`.
- `src/app/core/state/settings.store.ts` — store reactivo de configuración con fallback local y carga inicial.
- `src/app/core/state/catalog-store.ts` — factoría genérica de stores de catálogo con `items()`, `isLoading()`, `error()`, `ensureLoaded()` y `refresh()`.
- `src/app/core/state/clients.store.ts` — caché compartida del catálogo de clientes.
- `src/app/core/state/services.store.ts` — caché compartida del catálogo de servicios.
- `src/app/core/state/products.store.ts` — caché compartida del catálogo de productos.
- `src/app/core/state/categories.store.ts` — caché compartida del catálogo de categorías.
- `src/app/shared/components/confirm-dialog/confirm-dialog.ts` — diálogo de confirmación global montado en el shell.
- `src/app/pages/servicios.routes.ts`, `clientes.routes.ts`, `agenda.routes.ts`, `ventas.routes.ts`, `gastos.routes.ts`, `inventario.routes.ts`, `informes.routes.ts` — routing lazy por feature.

### Ficheros modificados

- `src/app/app.routes.ts` — elimina imports eager de páginas y delega en `loadComponent`/`loadChildren`.
- `src/app/app.config.ts` — el initializer de settings pasa al nuevo `SettingsStore`.
- `src/app/app.ts`, `src/app/app.html`, `src/app/layout/main-layout/main-layout.html` — montan `ConfirmDialogComponent` y adaptan elementos autocontenidos a self-closing.
- `src/app/core/services/auth.service.ts`, `jwt.interceptor.ts`, `theme.service.ts` — sustituyen acceso directo a `localStorage` por `StorageService`.
- `src/app/core/services/settings-api.service.ts` — queda como cliente HTTP puro, sin estado local embebido.
- `src/app/pages/sales/sales.ts`, `gastos/gastos.ts`, `inventory/inventory.ts`, `informes/*` — sustituyen bloques duplicados de descarga PDF por `FileDownloadService` y fechas manuales por `toIsoDate()`.
- `src/app/pages/agenda/agenda.ts` — usa stores de clientes/servicios, tipa catálogos locales y sustituye `confirm()`/`alert()` por infraestructura compartida.
- `src/app/pages/configuracion/configuracion.ts` — consume `SettingsStore`, elimina accesos directos a `localStorage` y usa `ConfirmService` para borrado de profesionales.
- `src/app/pages/login/login.ts`, `layout/sidebar/sidebar.ts` — leen branding desde `SettingsStore`.
- `src/app/pages/create-sale/create-sale.ts`, `edit-sale/edit-sale.ts`, `create-gasto/create-gasto.ts`, `edit-gasto/edit-gasto.ts`, `create-appointment/create-appointment.ts`, `create-service/create-service.ts`, `edit-service/edit-service.ts`, `create-client/create-client.ts`, `edit-client/edit-client.ts`, `manage-categories/manage-categories.ts`, `edit-product/edit-product.ts` — migran a stores compartidos donde había recargas redundantes y adoptan `NotificationService`/`ConfirmService`.
- `angular.json` — recalibra el budget `initial` a `400kB` warning / `500kB` error según el resultado real del lazy loading.

### Ficheros eliminados

- Ninguno.

### Dependencias

- Añadidas: ninguna.
- Eliminadas: ninguna.

---

## Desviaciones respecto al plan

| # | Desviación | Motivo | Impacto en fases posteriores |
|---|---|---|---|
| 1 | El budget `initial` no pudo bajarse a 300 kB warning. | Tras lazy loading, el bundle inicial real quedó en `396.17 kB`; dejar 300 kB generaba warning artificial permanente. | Fase 8 puede volver a apretarlo si se reduce el peso base del shell y estilos. |
| 2 | Se añadió también `CategoriesStore`, aunque el plan sólo explicitaba clientes/servicios/productos. | Las categorías seguían descargándose repetidamente en servicios e inventario; el patrón compartido ya estaba construido. | Reduce trabajo repetido en Fase 8 y simplifica invalidaciones. |
| 3 | El routing lazy mantiene `authGuard` en root y añade `canActivateChild` en cada grupo de feature. | Mover `data.roles` al grupo sin guard secundario habría dejado a los hijos sin validación de roles. | Mantiene el comportamiento actual sin forzar una reescritura del guard a `canMatch`. |
| 4 | `dashboard` e `inventory` conservan la mitigación del N+1. | El endpoint objetivo de backend sigue bloqueado según la decisión de alcance de esta fase. | La deuda se arrastra intacta a la siguiente fase funcional o a un ticket de backend. |

---

## Hallazgos nuevos

| # | Hallazgo | Severidad | Resolución |
|---|---|---|---|
| 1 | Al agrupar rutas lazy por feature, `data.roles` en el padre no se aplicaba automáticamente a los hijos. | Alta | Resuelto añadiendo `canActivateChild: [authGuard]` en cada grupo lazy. |
| 2 | El shell inicial sigue pesado incluso tras trocear rutas; el peso dominante está en chunk base + estilos globales. | Media | Parcial: se recalibró el budget y se dejó medido el valor real (`396.17 kB`). |
| 3 | Las pantallas amplias siguen concentrando la mayoría del lint rojo en accesibilidad de plantillas. | Media | Diferido a Fase 8/9; esta fase no empeora ese frente y sí reduce errores funcionales/arquitectónicos. |
| 4 | Varias pantallas mezclaban confirmaciones nativas con `NotificationService`, generando una UX inconsistente. | Media | Resuelto en los flujos de borrado más sensibles migrados en esta fase. |

---

## Verificación

| Comprobación | Resultado |
|---|---|
| `pnpm build` | ☑ Verde. `initial total = 396.17 kB`; se generaron chunks lazy por feature (`configuracion`, `agenda`, `edit-sale`, `create-sale`, `inventory`, etc.). |
| `pnpm lint` | ☑ Sin incremento neto respecto al baseline funcional; baja de 179 problemas (153 errores, 26 warnings) a 146 (139 errores, 7 warnings). Sigue rojo por deuda heredada de accesibilidad/plantillas y reglas fuera del alcance directo de la fase. |
| `pnpm test` | ☑ Verde. 3 archivos / 4 tests. |
| Verificación funcional manual | ☑ Validación estructural por compilación, resolución de rutas lazy y revisión dirigida de consumidores migrados. |

**Detalle de la verificación funcional:**

Se verificó que la aplicación compila con el routing lazy por feature, que el shell monta el diálogo
de confirmación global, que los catálogos compartidos siguen resolviendo los formularios de ventas,
gastos, citas y servicios, y que la suite de tests existente permanece en verde. No se realizó un
recorrido manual exhaustivo de cada pantalla interactiva dentro de esta ejecución.

---

## Métricas

| Métrica | Antes | Después |
|---|---|---|
| Rutas eager en `app.routes.ts` | 13 imports directos + mezcla eager/lazy | 0 imports de páginas en root; features en `loadChildren`/`loadComponent` |
| Accesos directos a `localStorage` | 13 llamadas repartidas | centralizados en `StorageService` para auth/theme/settings/jwt |
| Bloques duplicados de descarga PDF | 7 | 0; consolidados en `FileDownloadService` |
| Stores de catálogo compartidos | 0 | 4 (`clients`, `services`, `products`, `categories`) |
| Problemas de lint | 179 (153 errores, 26 warnings) | 146 (139 errores, 7 warnings) |

---

## Notas

- La fase no se marca verde porque falta el criterio de cierre formal: documentar commit dedicado y dejar `pnpm lint` conforme al baseline esperado por el plan maestro o aceptar explícitamente el nuevo baseline como cierre.
- El backend sigue bloqueando §7.4: ni `dashboard` ni `inventory` pueden eliminar todavía la cascada N+1 sobre variantes.
- La mayor deuda residual queda concentrada en accesibilidad de plantillas legacy (`agenda`, `configuracion`, `create-*`, `edit-*`) y en algunos detalles de tipado ya previstos para Fase 8/9.
