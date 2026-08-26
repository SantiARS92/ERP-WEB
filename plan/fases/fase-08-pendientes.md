# Fase 8 — Pendientes de implementación

## Estado actual
- Build: OK
- Lint: OK
- Tests actuales: OK
- Cobertura de tests: mínima (solo 3 archivos / 4 tests)

## 8.1 Reactive Forms
Queda completar la migración de los componentes grandes y los formularios internos de alto volumen.

### Pendientes claros
- `agenda` / modal de edición de cita
- `configuracion`
- evaluación de variantes del inventario y otros modales internos si se justifican

### Completado
- `create-client` / `edit-client`
- `create-service` / `edit-service`
- `create-gasto` / `edit-gasto`
- `create-sale` / `edit-sale`
- `edit-product`
- `create-appointment`
- shared forms tipados

## 8.2 Descomposición de componentes grandes
Objetivo: separar lógica de presentación, reducir classes grandes y mejorar mantenibilidad.

### Prioritarios
- `agenda`
- `configuracion`

### Tareas asociadas
- extraer subcomponentes por secciones
- unificar estados en stores o servicios dedicados
- eliminar lógica duplicada entre creación y edición cuando exista shared form
- revisar template switching, dropdowns y modales

## 8.3 Tipado estricto
### Completado
- eliminar `any` en componentes/servicios revisados
- subir `@typescript-eslint/no-explicit-any` a `error`

### Pendiente
- recorrer el resto del proyecto para confirmar que no quedan `any` implícitos o indirectos
- revisar modelado de respuestas de API donde aún haya objetos demasiado flexibles
- reforzar tipos en `configuracion` y `agenda` durante su descomposición

## 8.4 Tests
### Estado actual
- `app.spec.ts`
- `main-layout.component.spec.ts`
- `sidebar.component.spec.ts`

### Pendientes
- `auth.service.spec.ts`
- `auth.guard.spec.ts`
- `auth.interceptor.spec.ts`
- `pagination.spec.ts`
- `paged-resource.service.spec.ts`
- smoke tests de rutas y componentes críticos
- evaluar cobertura mínima de formularios migrados

## 8.5 Rendimiento de carga / fuentes
### Completado
- eliminar dependencia de Google Fonts/CDN
- self-host de `Inter`
- self-host de `Material Symbols`
-`font-display: swap/block` en fuentes locales

### Pendiente
- validar impacto real en carga y consistencia entre navegadores
- revisar si hay más recursos externos innecesarios

## Documentación de fase
### Pendiente
- crear `plan/fases/fase-08-refactor-profundo.md`
- actualizar trazabilidad en `plan/PLAN-MODERNIZACION-ANGULAR.md`
- dejar claro qué quedo como deuda técnica controlada

## Nota
No se han hecho commits de estos cambios.
Este archivo es solo un registro de trabajo pendiente.
