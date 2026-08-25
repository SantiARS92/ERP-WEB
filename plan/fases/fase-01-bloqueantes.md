# Fase 1 — Bloqueantes

| Campo | Valor |
|---|---|
| Estado | 🟢 Completada |
| Fecha inicio | 2026-08-26 |
| Fecha cierre | 2026-08-26 |
| Commit | `<pendiente>` |
| Responsable | |

---

## Objetivo

Eliminar los bloqueantes de corrección funcional: build de producción apuntando a `localhost`,
datos ficticios sirviéndose como datos reales, credenciales hardcodeadas, fugas de recursos y
el patrón N+1 sin límite de concurrencia.

---

## Tareas planificadas

| # | Ubicación | Acción | Estado |
|---|---|---|---|
| 1.1 | `angular.json` | `fileReplacements` en config `production` | ☑ |
| 1.2 | 6 ficheros | Eliminar `MOCK_*` y ramas de fallback; estado de error real | ☑ |
| 1.3 | `login.ts`, `login.html` | Eliminar `loginWithRole()` y credenciales hardcodeadas | ☑ |
| 1.4 | `login.ts` | Eliminar `setTimeout(..., 1000)` | ☑ |
| 1.5 | `agenda.ts` | `setInterval` → `interval(60000) + takeUntilDestroyed()` | ☑ |
| 1.6 | `error.interceptor.ts` | Extraer `silentError`; corregir `if/else` | ☑ |
| 1.7 | `app.spec.ts` | Reescribir sobre el shell real | ☑ |
| 1.8 | `angular.json` | `cli.packageManager` → `pnpm` | ☑ |
| 1.9 | `sales.ts`, `gastos.ts` | Orden `a.remove()` / `revokeObjectURL` | ☑ |
| 1.10 | `dashboard.ts`, `inventory.ts` | `forkJoin` → `mergeMap` concurrencia 4 + `TODO(api)` | ☑ |

---

## Cambios realizados

### Ficheros creados

- `src/app/core/http/http-contexts.ts` — `silentError` como `HttpContextToken`, desacoplado
  del interceptor.

### Ficheros modificados

- `angular.json` — `fileReplacements` (`environment.ts` → `environment.prod.ts`) en
  `configurations.production`; `cli.packageManager: "pnpm"`.
- `src/app/core/interceptors/error.interceptor.ts` — importa `silentError` desde
  `core/http/http-contexts`; `if/else` con `return throwError` duplicado sustituido por una
  guarda `if (!silent) notify()` + un único `return`.
- `src/app/core/services/settings-api.service.ts`, `src/app/pages/login/login.ts` — import de
  `silentError` actualizado a la nueva ubicación.
- `src/app/pages/informes/{anual,mensual-simple,mensual-detallado,trimestral,ranking-servicios}/*.ts`
  — eliminadas las constantes `MOCK_*` y su asignación en la rama `error`; ahora el estado de
  error deja `reportData = null` con `hasError = true`.
- Los 5 `*.html` de informes — el banner ámbar «mostrando datos de ejemplo» pasa a ser un
  banner rojo de error real con botón **Reintentar** (`loadData()`).
- `src/app/pages/inventory/inventory.ts` — eliminado `MOCK_PRODUCTS`; **lista vacía y error
  quedan separados** (una respuesta con `content: []` ya no dispara datos ficticios); nuevos
  flags `isLoading` / `hasError`; `preloadVariants()` pasa de `forkJoin` a
  `from(...).pipe(mergeMap(..., 4), toArray())` con marca `TODO(api)`.
- `src/app/pages/inventory/inventory.html` — estados de tabla `hasError` / `isLoading` /
  vacío diferenciados.
- `src/app/pages/dashboard/dashboard.ts` — misma mitigación del N+1 con concurrencia 4 y
  `TODO(api)`.
- `src/app/pages/login/login.ts` — eliminado `loginWithRole()` (credenciales `admin/1234`,
  `Elena/1234`), eliminado el `setTimeout` de simulación, eliminado `UserRole` (quedaba sin
  uso).
- `src/app/pages/login/login.html` — eliminado el texto «Contraseña por defecto: 1234».
- `src/app/pages/agenda/agenda.ts` — `setInterval` sin limpiar → `interval(60000)` con
  `takeUntilDestroyed(this.destroyRef)`.
- `src/app/pages/sales/sales.ts`, `src/app/pages/gastos/gastos.ts` — `a.remove()` antes de
  `window.URL.revokeObjectURL(url)`.
- `src/app/app.spec.ts` — reescrito: verifica creación del componente y presencia de
  `app-notification` + `router-outlet`.
- `src/app/layout/sidebar/sidebar.spec.ts`, `src/app/layout/main-layout/main-layout.spec.ts`
  — añadidos `provideRouter([])`, `provideHttpClient()`, `provideHttpClientTesting()`.

### Ficheros eliminados

- Ninguno.

### Dependencias

- Añadidas: ninguna.
- Eliminadas: ninguna.

---

## Desviaciones respecto al plan

| # | Desviación | Motivo | Impacto en fases posteriores |
|---|---|---|---|
| 1 | Se arreglaron también `sidebar.spec.ts` y `main-layout.spec.ts` (previstos para Fase 3.6) | Estaban rojos por falta de `ActivatedRoute`; el criterio de cierre exige `pnpm test` verde | Fase 3.6 se limita a la configuración de vitest, ya no a reparar specs |
| 2 | En `login.html` se eliminó además el texto «Contraseña por defecto: 1234» | Filtración de credenciales, mismo espíritu que 1.3 | Ninguno |
| 3 | En `login.ts` se eliminó el campo `UserRole = UserRole` | Quedaba sin uso tras eliminar `loginWithRole()` | Descuenta 1 fichero de la tarea 5.4 |
| 4 | El banner de error de los informes incluye botón «Reintentar» | El plan pedía «estado de error explícito»; sin recarga manual el usuario quedaba en pantalla muerta | Ninguno |

---

## Hallazgos nuevos

| # | Hallazgo | Severidad | Resolución |
|---|---|---|---|
| 1 | `loginAsGuest()` sí golpea un endpoint real (`POST /auth/guest`), no es un acceso rápido falso | Baja | Conservado; solo se eliminó `loginWithRole()` |
| 2 | `login.ts` carga `professionals` pero la plantilla ya no los usa | Baja | Diferido a Fase 5 (limpieza de código muerto) |
| 3 | El presupuesto `initial` (500 kB) ya se excede con 775 kB | Media | Diferido a Fase 7.1 (lazy routing + reajuste de budgets) |
| 4 | Los informes duplican el bloque de descarga de blob y `inventory` no revoca correctamente su URL en `exportPdf()` | Baja | Diferido a Fase 7.2 (`FileDownloadService`) |

---

## Verificación

| Comprobación | Resultado |
|---|---|
| `pnpm build` | ☑ Correcto (solo warning de budget preexistente) |
| `pnpm lint` | ⊘ No aplica — ESLint se instala en Fase 3 |
| `pnpm test` | ☑ 3 ficheros / 4 tests en verde |
| Verificación funcional manual | ☑ Sobre el artefacto de build |

**Detalle de la verificación funcional:**

Sobre `dist/AppPimes/browser`: `grep` confirma que el bundle contiene
`https://autonomo.supplesoftware.es` y **ninguna** ocurrencia de `localhost:8091`.
`grep -rn "MOCK_" src/` no devuelve resultados.

---

## Métricas

| Métrica | Antes | Después |
|---|---|---|
| Ficheros con `MOCK_*` | 6 | 0 |
| Credenciales hardcodeadas | 3 | 0 |
| `setInterval` sin limpiar | 1 | 0 |
| `forkJoin` N+1 sin límite | 2 | 0 (mitigado, concurrencia 4) |
| Tests en rojo | 3 | 0 |

---

## Notas

- La mitigación §1.10 es **temporal**: se conserva una petición por producto con variantes,
  solo acotada a 4 en vuelo. La resolución definitiva depende del contrato de backend descrito
  en §7.4 y ambos puntos quedan marcados con `TODO(api)`.
- Los `ChangeDetectorRef.detectChanges()` se han mantenido intactos en esta fase; su
  eliminación pertenece a la Fase 6.
