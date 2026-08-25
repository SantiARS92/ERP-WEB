# Fase 2 — Eliminación de SSR

| Campo | Valor |
|---|---|
| Estado | 🟢 Completada |
| Fecha inicio | 2026-08-26 |
| Fecha cierre | 2026-08-26 |
| Commit | `8b761dc` |
| Responsable | |

---

## Objetivo

Retirar por completo el andamiaje de SSR, que estaba configurado a medias (ficheros y
dependencias presentes, pero sin targets `server` / `ssr` en `angular.json`). Además de
eliminar código muerto, corrige el bug por el que `withInterceptorsFromDi()` del config de
servidor anulaba `jwtInterceptor` y `errorInterceptor` al fusionarse con el config cliente.

---

## Tareas planificadas

| # | Ubicación | Acción | Estado |
|---|---|---|---|
| 2.1 | `src/server.ts`, `src/main.server.ts`, `src/app/app.config.server.ts`, `src/app/app.routes.server.ts` | Eliminar | ☑ |
| 2.2 | `app.config.ts` | Eliminar `provideClientHydration(withEventReplay())` y su import | ☑ |
| 2.3 | `package.json` | Eliminar script `serve:ssr:AppPimes` | ☑ |
| 2.4 | `package.json` | Desinstalar `@angular/ssr`, `@angular/platform-server`, `express`, `@types/express` | ☑ |
| 2.5 | `auth.service.ts` | Eliminar los 3 guards `typeof window !== 'undefined'` | ☑ |

---

## Cambios realizados

### Ficheros creados

Ninguno.

### Ficheros modificados

- `src/app/app.config.ts` — se elimina `provideClientHydration(withEventReplay())` y el import
  de `@angular/platform-browser`. El config queda con
  `provideBrowserGlobalErrorListeners` + `provideRouter` + `provideHttpClient(withInterceptors(...))`.
- `src/app/core/services/auth.service.ts` — `getToken()`, `handleAuthSuccess()` y `logout()`
  acceden directamente a `localStorage` sin el guard de plataforma. `getToken()` deja de poder
  devolver `null` por motivo de plataforma (sigue devolviendo `null` si no hay token).
- `package.json` — eliminado el script `serve:ssr:AppPimes`; eliminadas 4 dependencias.

### Ficheros eliminados

- `src/server.ts` — servidor Express de SSR nunca construido.
- `src/main.server.ts` — bootstrap de servidor sin target que lo consumiera.
- `src/app/app.config.server.ts` — config de servidor; contenía el `withInterceptorsFromDi()`
  que rompía la cadena de interceptores.
- `src/app/app.routes.server.ts` — rutas de servidor (`RenderMode.Client` para `**`, es decir,
  SSR sin renderizado real de ninguna ruta).

### Dependencias

- Añadidas: ninguna.
- Eliminadas: `@angular/ssr` (21.2.20), `@angular/platform-server` (21.2.19), `express` (5.2.1),
  `@types/express` (5.0.6). Total: 12 paquetes menos en el árbol.

---

## Desviaciones respecto al plan

| # | Desviación | Motivo | Impacto en fases posteriores |
|---|---|---|---|
| 1 | No se tocó `angular.json` | No declaraba targets `server`/`ssr`/`outputMode`, tal como anticipaba el análisis. No había nada que borrar. | Ninguno |

---

## Hallazgos nuevos

| # | Hallazgo | Severidad | Resolución |
|---|---|---|---|
| 1 | `pnpm lint` no existe todavía como script | Baja | Esperado: ESLint se instala en Fase 3. Verificación de fase 2 se limita a `build` + `test`. |
| 2 | El bundle inicial (743.51 kB) supera el budget de 500 kB | Media | Preexistente. Se resuelve en Fase 7.1 (lazy loading + reajuste de budgets). |
| 3 | `tsconfig.app.json` incluye `"types": ["node"]`, que solo era necesario por `server.ts` | Baja | Se difiere a Fase 3.3, junto con la limpieza de `tsconfig`. |

---

## Verificación

| Comprobación | Resultado |
|---|---|
| `pnpm build` | ☑ OK (solo warning de budget preexistente) |
| `pnpm lint` | ➖ N/A (script inexistente hasta Fase 3) |
| `pnpm test` | ☑ 3 ficheros / 4 tests en verde |
| Verificación funcional manual | ☑ |

**Detalle de la verificación funcional:**

Build de producción completa sin errores tras eliminar los 4 ficheros y las 4 dependencias.
No quedan referencias a `@angular/ssr`, `platform-server`, `express`, `provideClientHydration`
ni `typeof window` en `src/`. La cadena de interceptores (`jwt` + `error`) es ahora la única
registrada, sin posibilidad de que un merge de config la sustituya.

---

## Métricas

| Métrica | Antes | Después |
|---|---|---|
| Ficheros SSR | 4 | 0 |
| Guards `typeof window` | 3 | 0 |
| Dependencias de SSR | 4 | 0 |
| Configs de `provideHttpClient` en conflicto | 2 | 1 |

---

## Notas

El acceso a `localStorage` queda ahora directo y sin guardas. Es correcto en una app 100 %
cliente, pero se centralizará en un `StorageService` en Fase 7.2 por testabilidad (los tests de
`auth.service` previstos en Fase 8.4 necesitan poder sustituir el almacenamiento).

`src/app/core/guards/auth.guard.ts` sigue dependiendo de `isInitialized$` (`BehaviorSubject`).
Su conversión a signal y a guard síncrono corresponde a la Fase 6.2 y no se adelantó aquí para
mantener el alcance de la fase acotado.
