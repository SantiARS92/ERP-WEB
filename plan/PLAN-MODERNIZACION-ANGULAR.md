# Plan de modernización — `app-pimes` → Angular 21

> Documento maestro del refactor. Cada fase completada se documenta en `plan/fases/`.

| Campo | Valor |
|---|---|
| Proyecto | `app-pimes` (WEB-Autonomos) |
| Angular | 21.1.x |
| Gestor de paquetes | pnpm 10.33.0 |
| Fecha de análisis | 2026-08-25 |
| Estado global | 🟡 Fase 7 en curso |

---

## Índice

1. [Contexto y hallazgos críticos](#contexto-y-hallazgos-críticos)
2. [Decisiones cerradas](#decisiones-cerradas)
3. [Principios rectores](#principios-rectores)
4. [Fase 1 — Bloqueantes](#fase-1--bloqueantes)
5. [Fase 2 — Eliminación de SSR](#fase-2--eliminación-de-ssr)
6. [Fase 3 — Tooling](#fase-3--tooling)
7. [Fase 4 — Migraciones automáticas](#fase-4--migraciones-automáticas)
8. [Fase 5 — Limpieza](#fase-5--limpieza)
9. [Fase 6 — Reactividad](#fase-6--reactividad-núcleo)
10. [Fase 7 — Arquitectura](#fase-7--arquitectura)
11. [Fase 8 — Refactor profundo](#fase-8--refactor-profundo)
12. [Fase 9 — Limpieza y linting](#fase-9--limpieza-y-linting)
13. [Métricas objetivo](#métricas-objetivo)
14. [Trazabilidad](#trazabilidad)

---

## Contexto y hallazgos críticos

### El proyecto ya corre en modo zoneless

No existe `zone.js` en `node_modules`, ni entrada `polyfills` en `angular.json`, ni
`provideZonelessChangeDetection()` explícito. Angular 21 arranca zoneless por defecto.

**Implicación:** los 19 componentes con `ChangeDetectorRef.detectChanges()` manual **no son
deuda estética, son parches a bugs de renderizado**. Con estado en campos mutables y sin zona,
la UI solo se actualiza por *event listeners* de plantilla o por `detectChanges()` explícito.
Cualquier mutación desde un `setTimeout`, un `subscribe` o un callback sin `cdr` es un bug
latente de "la pantalla no se refresca".

La migración a signals (Fase 6) es **corrección estructural**, no cosmética.

### Datos mock sirviéndose como datos reales

6 ficheros sustituyen la respuesta del API por constantes `MOCK_*` cuando la petición falla:
`anual`, `mensual-simple`, `mensual-detallado`, `trimestral`, `ranking-servicios`, `inventory`.

Peor aún, `inventory.ts:103` muestra `MOCK_PRODUCTS` **cuando el backend devuelve una lista
vacía legítimamente** (inventario vacío sin filtros → aparecen productos ficticios).

En una aplicación de gestión con informes financieros, mostrar cifras inventadas ante un error
de red es el bug más grave del proyecto: el usuario no puede distinguir un informe real de uno
falso.

### Producción apunta a localhost

`angular.json` no declara `fileReplacements` en la configuración `production`. Todo el código
importa `environments/environment` (dev). La build de producción sale con
`apiUrl: 'http://localhost:8091'`.

### SSR configurado a medias

Existen `src/server.ts`, `src/main.server.ts`, `app.config.server.ts`, `app.routes.server.ts`,
las dependencias `@angular/ssr` / `platform-server` / `express`, y
`provideClientHydration(withEventReplay())`. Pero `angular.json` **no** declara `server`, `ssr`
ni `outputMode`. El script `serve:ssr:AppPimes` apunta a un artefacto que nunca se genera.

Además, `provideHttpClient(withInterceptorsFromDi())` en el config de servidor **anula**
`withInterceptors([jwt, error])` al fusionarse con el config cliente.

### Patrón N+1 en peticiones

`dashboard.ts:107` descarga 1000 productos y luego dispara una petición por cada producto con
variantes. `inventory.ts:122` repite el patrón en cada cambio de página.

---

## Decisiones cerradas

| # | Decisión | Elección |
|---|---|---|
| 1 | SSR | **Eliminar por completo** |
| 2 | Alcance | **Completo (fases 1–8)** |
| 3 | API de datos reactivos | **Estable**: `toSignal()` + `switchMap` (no `httpResource`, experimental) |
| 4 | Rama defensiva "array plano" | **Eliminar** del código que consume endpoints paginados |
| 5 | Botones de login rápido | **Eliminar por completo** |
| 6 | Datos mock | **Eliminación limpia**, estado de error real |
| 7 | N+1 de variantes | **Resolver en backend** (hay control; ya está a medio camino) |

---

## Principios rectores

1. **Cada fase deja el proyecto compilando y funcional.** Un commit por fase, verificable con
   `pnpm build` + `pnpm lint` + `pnpm test`.
2. **Automatizar antes que reescribir a mano**: usar los schematics oficiales de migración
   donde existan.
3. **ESLint temprano** (Fase 3) para que las fases siguientes tengan red de seguridad.
4. **Signals como única fuente de estado** en componentes; `ChangeDetectorRef` prohibido al
   final del proceso.

---

## FASE 1 — Bloqueantes

> **Riesgo:** bajo · **Impacto:** alto · **Estado:** 🟢 completada

| # | Ubicación | Acción |
|---|---|---|
| 1.1 | `angular.json` | Añadir `fileReplacements` en config `production` (`environment.ts` → `environment.prod.ts`). Mantener URL absoluta (el API vive en otro origen; una ruta relativa no sirve). |
| 1.2 | 6 ficheros | **Eliminar todos los `MOCK_*`** y sus ramas de fallback: `anual`, `mensual-simple`, `mensual-detallado`, `trimestral`, `ranking-servicios`, `inventory`. Sustituir por estado `error` explícito en plantilla + notificación. En `inventory.ts:103` **separar lista vacía de error**. |
| 1.3 | `login.ts:73-79`, `login.html` | Eliminar `loginWithRole()` y los botones de acceso rápido (credenciales `admin/1234`, `Elena/1234` hardcodeadas). |
| 1.4 | `login.ts:60` | Eliminar el `setTimeout(..., 1000)` "Simulate backend call". |
| 1.5 | `agenda.ts:63-67` | `setInterval` nunca limpiado → `interval(60000).pipe(takeUntilDestroyed())`. |
| 1.6 | `error.interceptor.ts` | Extraer `silentError` a `core/http/http-contexts.ts` (nuevo); corregir el `if/else` desalineado con `return throwError` duplicado. |
| 1.7 | `app.spec.ts` | Test roto (espera `h1` con "Hello, AppPimes" inexistente). Reescribir sobre el shell real. |
| 1.8 | `angular.json` | `cli.packageManager`: `"npm"` → `"pnpm"`. |
| 1.9 | `sales.ts`, `gastos.ts` | Corregir el orden `revokeObjectURL` / `a.remove()` en las descargas. |
| 1.10 | `dashboard.ts:107`, `inventory.ts:122` | **Mitigación temporal del N+1**: `forkJoin` → `mergeMap` con concurrencia limitada (4). Marcar con `TODO(api)` referenciando §7.4. |

**Verificación:** build de producción y comprobar que el bundle contiene la URL de producción.

---

## FASE 2 — Eliminación de SSR

> **Riesgo:** bajo · **Estado:** 🟢 completada

**Borrar:**

- `src/server.ts`
- `src/main.server.ts`
- `src/app/app.config.server.ts`
- `src/app/app.routes.server.ts`

**Modificar:**

- `app.config.ts` — eliminar `provideClientHydration(withEventReplay())` y su import.
- `package.json` — eliminar el script `serve:ssr:AppPimes`; desinstalar `@angular/ssr`,
  `@angular/platform-server`, `express`, `@types/express`.
- `auth.service.ts` — eliminar los 3 guards `typeof window !== 'undefined'`
  (`getToken`, `handleAuthSuccess`, `logout`).

**Corrige de paso:** el bug por el que `withInterceptorsFromDi()` del config de servidor
anulaba `jwtInterceptor` y `errorInterceptor`.

**Nota:** sin SSR, el acceso directo a `localStorage` deja de ser un error de plataforma. Aun
así se centraliza en un `StorageService` en Fase 7 por testabilidad.

---

## FASE 3 — Tooling

> **Riesgo:** bajo · **Habilita el resto** · **Estado:** 🟢 completada

| # | Acción |
|---|---|
| 3.1 | `ng add @angular-eslint/schematics` (con pnpm). Reglas: `@angular-eslint/template/prefer-control-flow`, `prefer-self-closing-tags`, `@angular-eslint/prefer-standalone`, `use-lifecycle-interface`, `no-empty-lifecycle-method`, `prefer-signals`, `@typescript-eslint/no-explicit-any` en **warn** (→ `error` en Fase 8). |
| 3.2 | `angular.json` → `projects.AppPimes.schematics`: `@schematics/angular:component` con `changeDetection: "OnPush"`, `style: "css"`, `skipTests: false`. |
| 3.3 | `tsconfig.json`: eliminar `experimentalDecorators: true` (innecesario en v21). |
| 3.4 | `app.config.ts`: añadir `provideZonelessChangeDetection()` **explícito** para documentar la estrategia y blindarla frente a cambios de default. |
| 3.5 | `index.html`: `lang="en"` → `lang="es"`; añadir `<meta name="description">` y `<meta name="theme-color">`. |
| 3.6 | Configurar el setup de `vitest` / `tsconfig.spec.json` y verificar que `pnpm test` ejecuta realmente. Fijar baseline verde. |

**Punto de control:** `pnpm lint` arroja **341 hallazgos** (296 errores, 45 warnings). Ese
listado es el backlog verificable de las fases 4–8; el desglose por regla está en
`plan/fases/fase-03-tooling.md`.

---

## FASE 4 — Migraciones automáticas

> **Riesgo:** bajo (schematics oficiales) · **Estado:** 🟢 completada

Ejecutar en orden, revisando el diff de cada una:

1. `ng generate @angular/core:control-flow` — migra los 24 `*ngFor` / `*ngIf` restantes a
   `@for` / `@if`. **Atención especial a `configuracion.html`** (522 líneas, íntegramente
   legacy, con un patrón `*ngIf ... ; else closedDay` que el schematic puede no resolver
   limpiamente).
2. `ng generate @angular/core:signal-input-migration` — `pagination.ts` (4 inputs),
   `variant-config.ts` (1 input).
3. `ng generate @angular/core:output-migration` — `pagination.pageChange`,
   `variant-config.variantsChange`.
4. `ng generate @angular/core:signal-queries-migration` — sin efecto probable; ejecutar por
   completitud.
5. Eliminar `standalone: true` explícito de los 31 componentes (default en v21).

**Refinamiento manual:**

- `variant-config.ts`: el par `input variants` + `output variantsChange` es literalmente un
  `model<InventoryVariant[]>()`. Convertirlo.
- `pagination.ts`: eliminar `ngOnChanges` + `calculatePages()` + `OnChanges`; `totalPages`,
  `visiblePages`, `fromRecord` y `toRecord` pasan a `computed()`.

---

## FASE 5 — Limpieza

> **Riesgo:** bajo · **Estado:** 🟢 completada

| # | Acción | Alcance |
|---|---|---|
| 5.1 | Eliminar `CommonModule`; importar solo los pipes usados (`DecimalPipe`, `DatePipe`, `CurrencyPipe`). | 21 ficheros |
| 5.2 | Sustituir `RouterModule` por `RouterLink` / `RouterLinkActive` standalone. | 15 ficheros |
| 5.3 | Eliminar `Math = Math` (`clients.ts:27`) y el getter `pagesArray` muerto. | 1 fichero |
| 5.4 | Sustituir `UserRole = UserRole` expuesto al template por `computed()` semánticos (`isAdmin`, `canManage`). | 5 ficheros |
| 5.5 | `constructor(private cdr: ChangeDetectorRef)` de `ranking-servicios.ts:45` → unificar con `inject()`. | 1 fichero |
| 5.6 | Revisar el `track` de los 48 `@for` (ningún `$index` donde exista `id` estable). Eliminar `trackByIndex/Name/Val` de `variant-config.ts`. | Global |

---

## FASE 6 — Reactividad (núcleo)

> **Riesgo:** medio · **Mayor volumen** · **Estado:** 🟢 completada

Corrige los bugs de renderizado derivados del modo zoneless.

### 6.1 Infraestructura previa

**`core/models/page.model.ts`** (nuevo) — `Page<T>` canónico. Unifica los **6 modelos de página
duplicados** (`ClientPage`, `ExpensePage`, `ProductPage`, `SalePage`, `ServicePage`,
`RankingResponse`). Con el contrato firme se **elimina la rama `else if (Array.isArray(data))`**
en `clients.ts:53`, `gastos.ts:59`, `sales.ts:84` y `services.ts:71`, junto con los `data: any`
asociados.

**`core/http/timeout.interceptor.ts`** (nuevo) — timeout global de 10 s con `HttpContextToken`
de override. Elimina `.pipe(timeout(...))` de ~55 métodos repartidos en 11 servicios API.

**`core/state/paged-resource.ts`** (nuevo) — factoría `createPagedResource<T>()` sobre APIs
estables:

```
filters: WritableSignal<F>
  → toObservable → debounceTime → distinctUntilChanged
  → switchMap(fetcher)          // cancela peticiones obsoletas
  → toSignal
expone: items() · totalElements() · totalPages() · isLoading() · error() · setPage() · setFilters()
```

El `switchMap` resuelve además las *race conditions* actuales en la búsqueda paginada.
Consumidores: `clients`, `sales`, `gastos`, `services`, `inventory`, `manage-categories`,
`ranking-servicios`.

### 6.2 Arranque de la aplicación

- `auth.service.ts` — sacar `reconstructSession()` del constructor →
  `provideAppInitializer()`. Convertir `isInitializedSubject: BehaviorSubject` →
  `isInitialized = signal(false)`. Con la sesión resuelta antes del bootstrap, **`authGuard`
  pasa a ser síncrono** (desaparece el `filter/take/map`).
- `settings-api.service.ts` — `loadSettings()` fuera del constructor →
  `provideAppInitializer()`.
- `theme.service.ts` — aplicación del tema en el initializer. Eliminar el
  `private themeService = inject(ThemeService)` fantasma de `app.ts:14` (campo nunca leído,
  inyectado solo para forzar instanciación).
- `auth.service.ts` — extraer `router.navigate()` de `handleAuthSuccess()` y `logout()`.

### 6.3 Migración de componentes (24 ficheros)

Patrón de conversión por componente:

- Campos mutables → `signal()`.
- Getters derivados → `computed()` (`pagesArray`, `combinationCount`, `fromRecord`,
  `toRecord`, totales de informes).
- `ngOnInit` + `.subscribe()` → `toSignal()` + `switchMap` sobre un signal de filtros.
- **Eliminar `ChangeDetectorRef`** e imports asociados (19 ficheros).
- Añadir `ChangeDetectionStrategy.OnPush`.
- Estado de error explícito en plantilla en lugar de `console.error` mudo.

**Orden sugerido** (de menor a mayor riesgo):

1. Listados con paginación: `clients`, `services`, `gastos`, `manage-categories`, `sales`,
   `inventory`.
2. Informes: `mensual-simple`, `mensual-detallado`, `trimestral`, `anual`,
   `ranking-servicios`, `informes-directorio`.
3. Formularios simples: `create-client`, `edit-client`, `create-service`, `edit-service`.
4. Formularios complejos: `create-sale`, `edit-sale`, `create-gasto`, `edit-gasto`,
   `edit-product`, `create-appointment`.
5. `dashboard`.
6. `agenda` y `configuracion` (se descomponen en Fase 8).

---

## FASE 7 — Arquitectura

> **Riesgo:** medio · **Estado:** 🔴 pendiente

### 7.1 Routing

- Convertir los **20 imports eager** a lazy (hoy solo 8 rutas usan `loadComponent`).
- Reorganizar en `loadChildren` por feature: `servicios.routes.ts`, `clientes.routes.ts`,
  `ventas.routes.ts`, `gastos.routes.ts`, `inventario.routes.ts`, `informes.routes.ts`.
- Eliminar la repetición de `data: { roles: [...] }` ×20 aplicándolo al nivel de grupo.
- `app.routes.ts`: 110 → ~25 líneas.
- Reajustar `budgets` a valores realistas post-lazy (p. ej. `initial` 300 kB warning /
  500 kB error).

### 7.2 Servicios nuevos

- **`core/services/storage.service.ts`** — único punto de acceso a `localStorage`.
  Consumidores: `auth`, `theme`, `settings`, `jwt.interceptor`.
- **`core/services/file-download.service.ts`** — consolida el bloque `createObjectURL` +
  `createElement('a')` + `click()` duplicado en 7 ficheros (`sales`, `gastos`, `inventory` y
  los 4 informes), inyectando `DOCUMENT`.
- **`core/utils/date.util.ts`** — unifica los `formatDate()` reimplementados en `sales.ts:143`
  y `agenda.ts`. Elimina el antipatrón `providers: [DatePipe]` de `agenda.ts:21`.

### 7.3 Estado compartido

- Separar `SettingsApiService` en `SettingsApi` (HTTP puro) y `SettingsStore` (signal + caché
  local). Elimina el cast `applyLocalStorageFallback({} as any)`.
- Stores de catálogo (`ClientsStore`, `ServicesStore`, `ProductsStore`): hoy `sales` descarga
  500 clientes + 200 servicios + 500 productos en cada entrada y `agenda` 1000 + 1000.

### 7.4 N+1 de variantes — resolución definitiva

> **Bloqueada** hasta que el endpoint esté disponible. El resto de la Fase 7 avanza sin ella.

**Contrato objetivo:** que `GET /api/products` devuelva `variants` (o al menos `variantCount`
y los agregados de stock) embebidos en cada elemento de `content`.

Una vez disponible:

- `dashboard.ts:107-129` → una sola petición; eliminar `forkJoin` / `mergeMap` y el
  `catchError` por producto.
- `inventory.ts:122-140` → eliminar `preloadVariants()` completo, incluida la mutación
  in-place de `target.variants` (incompatible con signals + `OnPush`).
- Revertir la mitigación §1.10.

### 7.5 UX de errores

- Sustituir los **25 `alert()` / `confirm()`** nativos por `NotificationService` y un
  `ConfirmDialogComponent` compartido.
- Purgar los `console.error` que duplican lo que ya notifica `errorInterceptor` (~80
  `console.*` totales; conservar solo diagnóstico real tras un `LoggerService`).

---

## FASE 8 — Refactor profundo

> **Riesgo:** alto · **Estado:** 🔴 pendiente

### 8.1 Reactive Forms tipados

Cero uso actual de `ReactiveFormsModule`; 24 componentes con `ngModel`. Migrar por volumen:

| Componente | `ngModel` | Acción |
|---|---|---|
| `configuracion` | 21 | Reactive Forms tipados |
| `edit-product` | 12 | Reactive Forms |
| `create-sale` / `edit-sale` | 11 c/u | Reactive Forms + `FormArray` para líneas |
| `create-gasto` / `edit-gasto` | 8 c/u | Reactive Forms |
| `variant-config`, `create/edit-client`, `create-appointment`, `agenda` | 6 c/u | Reactive Forms |
| `create/edit-service` | 5 c/u | Reactive Forms |
| Filtros de listados e informes | 1–3 | Conservar `ngModel` o binding sobre signal |

Usar `FormGroup<T>` con `NonNullableFormBuilder`.

### 8.2 Descomposición de componentes-dios

- **`agenda`** (458 L TS / 388 L HTML) → `AgendaWeekGrid`, `AgendaDayView`,
  `AppointmentModal`, `AgendaStore`.
- **`configuracion`** (328 L TS / 522 L HTML) → un componente por sección de acordeón
  (`PerfilSection`, `HorarioSection`, `ReglasSection`, `EquipoSection`) +
  `ConfiguracionShell`.

### 8.3 Tipado estricto

Eliminar los **29 `any`**: `res: any` en `auth.service.ts:61,67,73` (definir `LoginResponse`),
`allClients: any[]` / `allServices: any[]` en `agenda.ts`,
`appointmentStyles: {[id:number]: any}`, `data: any` en los listados. Subir
`no-explicit-any` a `error`.

### 8.4 Tests

Cobertura actual ≈ 0 (3 specs: uno roto, dos autogenerados). Objetivo mínimo:

- `auth.service` (login, logout, reconstrucción de sesión, `hasRole`)
- `authGuard` (autenticado / no autenticado / rol insuficiente)
- `jwt.interceptor` y `error.interceptor` (incluido `silentError`)
- `pagination` (cálculo de páginas visibles con elipsis — lógica no trivial y sin cobertura)
- `paged-resource` (factoría nueva)
- Smoke test de render por página

### 8.5 Rendimiento de carga

Self-hostear Inter y Material Symbols (~200 kB por CDN bloqueante en `index.html`) o al menos
aplicar `font-display: swap` y precarga selectiva.

---

## FASE 9 — Limpieza y linting

> **Riesgo:** bajo/medio · **Estado:** 🔴 pendiente

La fase 9 recoge la deuda residual de calidad que quedó fuera del cierre funcional de las fases 5 y 6.

### 9.1 Accesibilidad y plantilla

- Corregir los restos de `label-has-associated-control`, `click-events-have-key-events`,
  `interactive-supports-focus` y `alt-text` que siguen concentrados en pantallas amplias y legacy.
- Revisar formularios y componentes interactivos con `ngModel` para no duplicar deuda de accesibilidad.

### 9.2 Tipado y limpieza fina

- Eliminar `no-empty-constructor` en servicios API restantes.
- Reducir `no-inferrable-types`, `no-unused-vars` y `any` restantes donde siga habiendo ruido real.
- Mover a signals cualquier estado todavía mutado por conveniencia, si aporta claridad y no complica Fase 8.

### 9.3 Cierre de lint

- Ejecutar `pnpm lint` con el árbol ya estabilizado.
- Clasificar deuda heredada vs. regresión nueva.
- Dejar el proyecto en verde o, como mínimo, con un baseline explícito y acotado.

---

## Métricas objetivo

| Métrica | Antes | Después |
|---|---|---|
| `ChangeDetectorRef` | 19 | 0 |
| `CommonModule` | 21 | 0 |
| `*ngIf` / `*ngFor` | 24 | 0 |
| `any` | 29 | 0 |
| `alert` / `confirm` | 25 | 0 |
| `MOCK_*` | 6 ficheros | 0 |
| Modelos de página | 6 | 1 |
| Rutas eager | 20 | 0 |
| `.subscribe()` en componentes | 85 | ~5 |
| Ficheros SSR | 4 | 0 ✅ |

### Ficheros nuevos previstos

`core/http/http-contexts.ts` · `core/http/timeout.interceptor.ts` ·
`core/state/paged-resource.ts` · `core/models/page.model.ts` ·
`core/services/storage.service.ts` · `core/services/file-download.service.ts` ·
`core/utils/date.util.ts` · `shared/components/confirm-dialog/` · `eslint.config.js` ·
6 ficheros `*.routes.ts` por feature.

### Ficheros eliminados previstos

`src/server.ts` · `src/main.server.ts` · `src/app/app.config.server.ts` ·
`src/app/app.routes.server.ts`

---

## Trazabilidad

Cada fase completada genera un documento en `plan/fases/` siguiendo la plantilla
`plan/fases/_PLANTILLA.md`.

| Fase | Documento | Estado | Fecha | Commit |
|---|---|---|---|---|
| 1 — Bloqueantes | `fases/fase-01-bloqueantes.md` | 🟢 Completada | 2026-08-26 | `9f48799` |
| 2 — Eliminación SSR | `fases/fase-02-eliminacion-ssr.md` | 🟢 Completada | 2026-08-26 | `8b761dc` |
| 3 — Tooling | `fases/fase-03-tooling.md` | 🟢 Completada | 2026-08-26 | `2544e63` |
| 4 — Migraciones automáticas | `fases/fase-04-migraciones-automaticas.md` | 🟢 Completada | 2026-08-26 | `f058dfb` |
| 5 — Limpieza | `fases/fase-05-limpieza.md` | 🟢 Completada | 2026-08-26 | `3546a2d` |
| 6 — Reactividad | `fases/fase-06-reactividad.md` | 🟢 Completada | 2026-08-26 | `ec30348` |
| 7 — Arquitectura | `fases/fase-07-arquitectura.md` | 🟡 En curso | 2026-08-26 | — |
| 8 — Refactor profundo | `fases/fase-08-refactor-profundo.md` | 🔴 Pendiente | — | — |
| 9 — Limpieza y linting | `fases/fase-09-limpieza-y-linting.md` | 🔴 Pendiente | — | — |

**Leyenda:** 🔴 Pendiente · 🟡 En curso · 🟢 Completada · ⏸️ Bloqueada

### Criterio de cierre de fase

Una fase se marca 🟢 solo cuando:

1. `pnpm build` pasa sin errores.
2. `pnpm lint` no introduce hallazgos nuevos respecto al baseline de la fase anterior.
3. `pnpm test` está en verde.
4. El documento correspondiente en `plan/fases/` está redactado con el resultado real
   (incluidas las desviaciones respecto a lo planificado).
5. Existe un commit dedicado a la fase.
