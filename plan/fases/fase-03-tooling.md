# Fase 3 — Tooling

| Campo | Valor |
|---|---|
| Estado | 🟢 Completada |
| Fecha inicio | 2026-08-26 |
| Fecha cierre | 2026-08-26 |
| Commit | `2544e63` |
| Responsable | |

---

## Objetivo

Instalar y configurar la red de seguridad que habilita las fases 4–8: ESLint con las reglas de
Angular 21, schematics por defecto en `OnPush`, estrategia zoneless explícita y un baseline de
tests verde. El listado de hallazgos de `pnpm lint` pasa a ser el backlog verificable del resto
del refactor.

---

## Tareas planificadas

| # | Ubicación | Acción | Estado |
|---|---|---|---|
| 3.1 | `eslint.config.js` | `ng add @angular-eslint/schematics` + reglas de modernización | ☑ |
| 3.2 | `angular.json` | `schematics.@schematics/angular:component` → `OnPush`, `css`, `skipTests: false` | ☑ |
| 3.3 | `tsconfig.json` | Eliminar `experimentalDecorators` | ☑ |
| 3.4 | `app.config.ts` | `provideZonelessChangeDetection()` explícito | ☑ |
| 3.5 | `index.html` | `lang="es"`, `<meta name="description">`, `<meta name="theme-color">` | ☑ |
| 3.6 | vitest / `tsconfig.spec.json` | Verificar ejecución real de `pnpm test` y fijar baseline verde | ☑ |

---

## Cambios realizados

### Ficheros creados

- `eslint.config.js` — configuración flat de ESLint 10 generada por el schematic y ampliada con
  las reglas de la fase.

### Ficheros modificados

- `angular.json` — el schematic añade el target `lint`
  (`@angular-eslint/builder:lint`, patrones `src/**/*.ts` y `src/**/*.html`). Se añade el bloque
  `schematics` del proyecto con `changeDetection: "OnPush"`, `style: "css"`, `skipTests: false`
  para que todo componente nuevo nazca ya alineado con la Fase 6.
- `tsconfig.json` — eliminado `experimentalDecorators: true`. Angular 21 usa decoradores
  estándar de TypeScript 5; la opción legacy era ruido.
- `src/app/app.config.ts` — añadido `provideZonelessChangeDetection()`. El proyecto ya corría
  zoneless por *default* de v21; declararlo lo blinda frente a cambios de default y documenta la
  estrategia (que es la premisa de toda la Fase 6).
- `src/index.html` — `lang="en"` → `lang="es"`; añadidos `description` y `theme-color`.
- `package.json` — script `lint` y dependencias de ESLint.

### Ficheros eliminados

Ninguno.

### Dependencias

- Añadidas: `angular-eslint@21.4.0`, `eslint@10.9.1`, `typescript-eslint@8.68.0`
  (+ transitivas `@angular-eslint/*`).
- Eliminadas: ninguna.

---

## Desviaciones respecto al plan

| # | Desviación | Motivo | Impacto en fases posteriores |
|---|---|---|---|
| 1 | `pnpm test` ya funcionaba sin tocar nada | El builder `@angular/build:unit-test` con `vitest` + `jsdom` y `tsconfig.spec.json` (`types: ["vitest/globals"]`) ya estaba correctamente cableado desde Fase 1 (que reescribió `app.spec.ts`). 3.6 se limita a verificar y fijar baseline. | Ninguno |
| 2 | Añadido bloque `ignores` (`dist`, `out-tsc`, `.angular`, `node_modules`) no previsto | El target `lint` acota por `lintFilePatterns`, pero una invocación directa de `eslint .` habría recorrido artefactos de build. | Ninguno |
| 3 | Las reglas heredadas de `tseslint.configs.recommended`/`stylistic` aportan más hallazgos de los previstos | Vienen con el preset del schematic; no se desactivan porque señalan deuda real (`no-unused-vars`, `no-inferrable-types`, `prefer-inject`). | Amplían el backlog de Fase 5/8 |

---

## Hallazgos nuevos

| # | Hallazgo | Severidad | Resolución |
|---|---|---|---|
| 1 | 106 violaciones de `template/label-has-associated-control` — accesibilidad de formularios rota de forma sistemática | Media | Diferido a Fase 8.1 (migración a Reactive Forms toca los mismos templates) |
| 2 | 12 `click-events-have-key-events` + 12 `interactive-supports-focus`: elementos no interactivos con `(click)` | Media | Diferido a Fase 7.5 (UX) |
| 3 | 9 `prefer-inject`: constructores con DI clásica más allá del `ranking-servicios.ts` identificado en §5.5 | Baja | Ampliar el alcance de §5.5 a los 9 ficheros |
| 4 | 21 `no-unused-vars` y 28 `no-inferrable-types` | Baja | Fase 5 (limpieza) |
| 5 | 2 `template/alt-text` | Baja | Fase 7.5 |
| 6 | El budget `initial` ya se excede (743 kB / 500 kB) por rutas eager | Media | Fase 7.1 (lazy loading + reajuste de budgets) — ya contemplado |
| 7 | `prefer-control-flow` reporta 80 hallazgos, no 24 | Baja | El análisis original contaba directivas por fichero; la regla cuenta por ocurrencia. Fase 4 los resuelve con el schematic. |

---

## Verificación

| Comprobación | Resultado |
|---|---|
| `pnpm build` | ☑ (warning preexistente de budget `initial`) |
| `pnpm lint` | ☑ ejecuta — baseline fijado en 341 hallazgos |
| `pnpm test` | ☑ 3 ficheros / 4 tests en verde |
| Verificación funcional manual | ☑ |

**Detalle de la verificación funcional:**

Build de producción completa sin errores tras eliminar `experimentalDecorators` y añadir
`provideZonelessChangeDetection()`; la ausencia de regresión en el bootstrap confirma que la
app ya operaba zoneless de facto. Suite de tests verde antes y después de los cambios.

### Baseline de lint (referencia para fases 4–8)

**341 problemas — 296 errores, 45 warnings.**

| Regla | Nº |
|---|---|
| `@angular-eslint/template/label-has-associated-control` | 106 |
| `@angular-eslint/template/prefer-control-flow` | 80 |
| `@typescript-eslint/no-explicit-any` | 29 |
| `@typescript-eslint/no-inferrable-types` | 28 |
| `@typescript-eslint/no-unused-vars` | 21 |
| `@angular-eslint/prefer-signals` | 16 |
| `@angular-eslint/template/prefer-self-closing-tags` | 14 |
| `@angular-eslint/template/interactive-supports-focus` | 12 |
| `@angular-eslint/template/click-events-have-key-events` | 12 |
| `@angular-eslint/prefer-inject` | 9 |
| `@typescript-eslint/no-empty-function` | 3 |
| `@angular-eslint/use-lifecycle-interface` | 3 |
| `@typescript-eslint/consistent-indexed-object-style` | 2 |
| `@angular-eslint/template/alt-text` | 2 |
| `@typescript-eslint/no-unused-expressions` | 1 |
| `@typescript-eslint/array-type` | 1 |

Nota: `no-explicit-any` reporta 29, coincidiendo exactamente con el conteo manual del análisis
original (§8.3). `prefer-standalone` y `no-empty-lifecycle-method` no reportan nada: los 31
componentes ya son standalone y no hay hooks vacíos.

---

## Métricas

| Métrica | Antes | Después |
|---|---|---|
| Linter configurado | ❌ | ✅ ESLint 10 flat config |
| Hallazgos de lint | n/d | 341 (baseline) |
| `experimentalDecorators` | `true` | eliminado |
| Zoneless declarado | implícito | explícito |
| Tests en verde | 4/4 | 4/4 |

---

## Notas

- `@typescript-eslint/no-explicit-any` queda en **warn** deliberadamente; sube a `error` en la
  Fase 8.3, cuando los 29 `any` estén eliminados.
- `@angular-eslint/prefer-signals` también en **warn**: los 16 hallazgos son el backlog directo
  de las fases 4.2/4.3 (migración de `@Input`/`@Output`) y 6.3.
- Reglas del plan que sí quedan en `error` desde ya (`prefer-control-flow`,
  `prefer-self-closing-tags`, `prefer-standalone`, `use-lifecycle-interface`,
  `no-empty-lifecycle-method`) hacen que `pnpm lint` falle hasta la Fase 5. Es intencionado: el
  criterio de cierre de fase es «no introducir hallazgos nuevos respecto al baseline», no
  «lint en verde», hasta que el backlog se agote.
- No se ha desactivado ninguna regla del preset para no ocultar deuda.
- Cambio ajeno a la fase presente en el árbol de trabajo: `edit-product.ts` (cálculo de `stock`
  agregado de variantes). No forma parte de este commit.
