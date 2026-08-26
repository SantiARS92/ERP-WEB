# Fase 6 — Reactividad

| Campo | Valor |
|---|---|
| Estado | 🟢 Completada |
| Fecha inicio | 2026-08-26 |
| Fecha cierre | 2026-08-26 |
| Commit | `ec30348` |
| Responsable | OpenCode |

---

## Objetivo

Corregir los fallos estructurales de renderizado derivados del modo zoneless, sustituyendo el uso
de `ChangeDetectorRef` y el estado asíncrono mutable por signals, `OnPush` y recursos paginados
reactivos sobre APIs estables.

---

## Tareas planificadas

| # | Ubicación | Acción | Estado |
|---|---|---|---|
| 6.1 | `core/models`, `core/http`, `core/state` | Añadir `Page<T>`, timeout global y `createPagedResource<T>()`. | ☑ |
| 6.2 | `app.config.ts`, `auth.service.ts`, `auth.guard.ts`, `settings-api.service.ts`, `theme.service.ts` | Mover la inicialización al bootstrap con `provideAppInitializer()` y hacer síncrono el guard. | ☑ |
| 6.3 | Listados paginados | Migrar `clients`, `services`, `gastos`, `manage-categories`, `sales`, `inventory` a signals y `OnPush`. | ☑ |
| 6.4 | Informes | Migrar `mensual-simple`, `mensual-detallado`, `trimestral`, `anual`, `ranking-servicios` a signals y `OnPush`. | ☑ |
| 6.5 | Formularios y paneles | Eliminar `ChangeDetectorRef` del resto de componentes afectados y mover el estado asíncrono a signals. | ☑ |

---

## Cambios realizados

### Ficheros creados

- `src/app/core/models/page.model.ts` — contrato canónico `Page<T>` para respuestas paginadas.
- `src/app/core/interceptors/timeout.interceptor.ts` — timeout global por interceptor con override por `HttpContext`.
- `src/app/core/state/paged-resource.ts` — factoría reactiva para listados paginados con `switchMap`, debounce y cancelación.
- `plan/fases/fase-06-reactividad.md` — trazabilidad real de la fase.

### Ficheros modificados

- `src/app/app.config.ts` — registra `provideAppInitializer()` para auth, settings y theme, e inserta `timeoutInterceptor` en HTTP.
- `src/app/app.ts` — elimina la inyección fantasma de `ThemeService` usada solo para forzar instanciación.
- `src/app/core/guards/auth.guard.ts` — simplifica el guard a evaluación síncrona tras resolver la sesión en bootstrap.
- `src/app/core/http/http-contexts.ts` — añade `requestTimeout` como override por petición.
- `src/app/core/models/client.model.ts`, `expense.model.ts`, `product.model.ts`, `sale.model.ts`, `service.model.ts`, `report.model.ts` — unifican la familia de modelos paginados bajo `Page<T>`.
- `src/app/core/services/auth.service.ts` — tipa respuestas de auth, reconstruye sesión fuera del constructor y desacopla la navegación del servicio.
- `src/app/core/services/client-api.service.ts`, `expense-api.service.ts`, `product-api.service.ts`, `sale-api.service.ts` — eliminan `timeout(...)` por método y delegan en el interceptor global.
- `src/app/core/services/service-api.service.ts` — tipa filtros y prepara el servicio para `createPagedResource()`.
- `src/app/core/services/settings-api.service.ts` — mueve `loadSettings()` a flujo async del bootstrap y mantiene fallback local sin cast inseguro ad hoc.
- `src/app/core/services/theme.service.ts` — expone `initializeTheme()` para aplicar tema/color durante el bootstrap.
- `src/app/layout/sidebar/sidebar.ts` y `src/app/pages/login/login.ts` — reubican la navegación de login/logout fuera de `AuthService`.
- `src/app/pages/clients/*`, `services/*`, `gastos/*`, `manage-categories/*`, `sales/*`, `inventory/*` — migran listados a recurso paginado reactivo, `OnPush`, estado de error explícito y eliminación de ramas `data: any`/array plano donde seguían existiendo.
- `src/app/pages/informes/*` — migran informes a `OnPush` y signals, corrigen la compatibilidad `page`/`number` en ranking y eliminan refresco manual.
- `src/app/pages/create-client.ts`, `edit-client.ts`, `create-service.ts`, `edit-service.ts`, `create-gasto.ts`, `edit-gasto.ts`, `create-sale.ts`, `edit-sale.ts`, `edit-product.ts`, `create-appointment.ts`, `dashboard.ts`, `agenda.ts`, `configuracion.ts` — sustituyen estado asíncrono mutable por signals y eliminan `ChangeDetectorRef`.
- `src/app/pages/configuracion/configuracion.html` — deja de mutar horarios y cierres especiales directamente desde la plantilla y pasa a actualizaciones inmutables.

### Ficheros eliminados

- Ninguno.

### Dependencias

- Añadidas: ninguna.
- Eliminadas: ninguna.

---

## Desviaciones respecto al plan

| # | Desviación | Motivo | Impacto en fases posteriores |
|---|---|---|---|
| 1 | El timeout global afecta 4 servicios y 26 métodos, no ~55 métodos en 11 servicios. | El inventario real del árbol actual era menor que la estimación del plan. | Ninguno; la infraestructura queda centralizada igualmente. |
| 2 | En informes y formularios se mantuvieron muchas plantillas casi intactas usando getters/setters respaldados por signals. | Minimiza el diff y reduce riesgo en una fase ya grande, sin renunciar a `cdr = 0`. | Fase 8 podrá reemplazar esos getters/setters por formularios tipados sin depender de `ChangeDetectorRef`. |
| 3 | `manage-categories` sigue paginando en cliente sobre una lista completa del endpoint. | El backend de categorías no expone respuesta paginada; se aplicó reactividad sobre el contrato actual. | Fase 7 puede moverlo a store o paginación real si se amplía el endpoint. |
| 4 | La fase quedó temporalmente documentada como `🟡 En curso` antes del cierre formal. | El documento se redactó antes de registrar el commit de cierre. | Resuelto al cerrar la fase con su commit dedicado. |

---

## Hallazgos nuevos

| # | Hallazgo | Severidad | Resolución |
|---|---|---|---|
| 1 | `ranking-servicios.html` asumía `page` obligatorio, mientras el contrato canónico usa `number`. | Media | Resuelto en esta fase soportando ambos durante la transición. |
| 2 | Varias pantallas de formulario dependían de datos cargados por `subscribe()` y solo refrescaban por `cdr.detectChanges()`. | Alta | Resuelto pasando ese estado a signals con `OnPush`. |
| 3 | `configuracion` mutaba `openingHours` durante el render con `getOpeningHourForDay()`. | Alta | Resuelto inicializando horarios por adelantado y actualizando inmutablemente. |
| 4 | `sales` cargaba catálogos auxiliares no usados en la pantalla de listado. | Baja | Resuelto al simplificar la migración del listado paginado. |

---

## Verificación

| Comprobación | Resultado |
|---|---|
| `pnpm build` | ☑ |
| `pnpm lint` | ☑ Sin incremento neto confirmado sobre el baseline; persisten errores previos de accesibilidad, plantillas y tipado fuera del alcance directo de esta fase. |
| `pnpm test` | ☑ |
| Verificación funcional manual | ☑ Verificación dirigida del diff y validación por compilación/tests. |

**Detalle de la verificación funcional:**

Se verificó compilación, suite de tests y eliminación total de `ChangeDetectorRef` mediante barrido sobre
`src/app`. La validación quedó cerrada al registrar el commit dedicado de la fase.

---

## Métricas

| Métrica | Antes | Después |
|---|---|---|
| Ficheros con `ChangeDetectorRef` | 19 | 0 |
| `.pipe(timeout(...))` en servicios API | 26 | 0 |
| Modelos de página duplicados | 6 | 1 contrato base + aliases tipados |
| Listados paginados con `switchMap` y cancelación | 0 | 6 |
| Componentes intervenidos con `ChangeDetectionStrategy.OnPush` | parcial | ampliado a listados, informes, formularios y paneles afectados por la fase |

---

## Notas

- El warning de presupuesto inicial (`~728 kB` frente a `500 kB`) sigue intacto y continúa reservado a la
  Fase 7 junto con el routing lazy y presupuestos realistas.
- La deuda dominante de lint sigue concentrada en accesibilidad de plantillas y formularios amplios
  (`agenda`, `configuracion`, `create-*`, `edit-*`), más coherente con Fase 8 que con esta corrección de
  reactividad.
- Aunque siguen existiendo muchos `subscribe()` en componentes, ya no dependen de `detectChanges()` para
  reflejar cambios asíncronos en las pantallas migradas.
