# Gestor de factores

> **Versión del módulo: 1.0** · Paquete base: **2026.10** · Implementado en `/factors`.

El gestor convierte el catálogo en una herramienta de trabajo auditable: se puede consultar, filtrar, exportar, sobrescribir y ampliar sin destruir la capa base. Toda cifra usada en un cálculo conserva su factor, versión, capa y motivo.

---

## 1. Arquitectura

```
src/data/*.json            → capa BASE (solo lectura, versionada)
src/engine/factorTypes.ts  → esquema único FactorRecord + versiones + snapshots
src/engine/catalog.ts      → resolución base/custom y catálogo unificado
src/engine/factorOps.ts    → validación, overrides, CSV/JSON, diffs
src/engine/factorGaps.ts   → inventario y detección de huecos
src/store/factorDb.ts      → IndexedDB + espejo localStorage
src/store/factors.tsx      → estado React, CRUD, auditoría, roles
src/store/FactorScope.tsx  → proveedor diferido solo en rutas que usan factores
src/components/factors/*   → formulario, ficha, importación
src/screens/Factors.tsx    → catálogo, cobertura, auditoría y papelera
```

La aplicación resuelve el catálogo en memoria al cargar. La capa personalizada se superpone a la base; nunca se escribe en los JSON de origen. El proveedor se monta mediante `FactorScope` solo en rutas de cálculo, informe o gestión: la portada y el onboarding no descargan el catálogo.

### Regla de resolución

```
personalizado (activo) > base
```

- Un **override** conserva el `id` base y añade `baseId`, `baseValue` y `baseVersion`.
- Un **factor nuevo** usa un `id` propio con prefijo `cf_`.
- Un registro en papelera (`deletedAt`) se ignora al construir el catálogo: el cálculo vuelve a la base.
- Si el paquete base cambia, los overrides creados sobre otra versión se marcan para revisión.

---

## 2. Esquema obligatorio (`FactorRecord`)

| Campo | Obligatorio | Nota |
| --- | --- | --- |
| `id` | Sí | Único en carbono y agua. |
| `kind` | Sí | `carbon` o `water`. |
| `label`, `description` | Sí | Bilingüe ES/EN. |
| `category`, `scope` | Sí | Scope 1, 2 o 3. |
| `unit`, `value` | Sí | Unidad de actividad y valor. |
| `gases`, `gasDetail`, `gwpSet` | Carbono | `Σ(gas × GWP)` debe coincidir con `value` si hay desglose. |
| `water` | Agua | Azul + verde + gris = `value`. |
| `country`, `region` | Sí | `GLOBAL` o país; subregión opcional. |
| `dataYear`, `publicationYear` | Sí | Años plausibles (1990–actual+1). |
| `sourceId`, `sourceOrg`, `sourceTitle`, `sourceUrl` | Sí | URL puede omitirse solo si la calidad es `primary`. |
| `license`, `downloadedAt` | Sí | Condición de uso y fecha ISO. |
| `uncertainty` | Sí | 0–1; la UI la muestra en %. |
| `method`, `quality`, `status` | Sí | `physical/spend/proxy`, `official/literature/primary/estimated`. |
| `changeReason` | Sí | Mínimo 6 caracteres. |
| `version`, `history`, `approval` | Automático | Versionado y flujo de aprobación. |
| `baseId`, `baseValue`, `baseVersion` | Overrides | Trazabilidad contra la base. |

### Calidad y estado

| Calidad | Estado por defecto | Lectura |
| --- | --- | --- |
| `official` | `verified` | Fuente oficial contrastada. |
| `literature` | `pending` | Literatura o fuente secundaria. |
| `primary` | `pending` | Dato primario propio. |
| `estimated` | `screening` | Orden de magnitud; el informe lo advierte. |

Un factor sin fuente u marcado como estimado recibe un aviso explícito en el informe.

---

## 3. Flujo de trabajo

### Crear un factor (< 2 minutos)

1. **Factores → Nuevo factor**.
2. Paso 1: tipo, categoría, alcance, nombre y descripción.
3. Paso 2: unidad, valor, gases/GWP o componentes de agua, país y año.
4. Paso 3: fuente, licencia, fecha de descarga, calidad y motivo.
5. Guardar. El factor queda disponible de inmediato para el cálculo.

### Sobrescribir un factor base

1. Abre la ficha del factor base.
2. **Crear override**.
3. Cambia el valor (o unidad/año/país/notas).
4. Si el cambio supera el umbral configurado (±30 % por defecto), confirma explícitamente.
5. Guardar. La ficha muestra base vs. personalizado y el porcentaje de diferencia.

**Restaurar valor original** mueve el override a la papelera y el cálculo vuelve a la base. La base nunca se modifica.

### Versiones y reversión

Cada edición crea una versión nueva. Revertir no borra historia: añade otra versión con el valor antiguo y exige un motivo. El historial guarda valor, unidad, incertidumbre, año, país, fuente, licencia, notas y componentes de agua.

### Papelera

Eliminar mueve la copia personalizada a la papelera con motivo. Se puede recuperar. Solo un Administrador puede borrar definitivamente (purga).

---

## 4. Permisos y aprobación

| Rol | Puede |
| --- | --- |
| Lector | Consultar, filtrar, comparar y exportar. |
| Editor | Crear, editar, proponer, importar y enviar a papelera. |
| Administrador | Todo lo anterior + aprobar propuestas y purgar la papelera. |

El rol es local (por dispositivo) y se guarda en IndexedDB con espejo en `localStorage`.

Flujo opcional: un Editor crea un factor como `proposed`; un Administrador lo aprueba desde la ficha. Los factores nuevos se guardan con aprobación inmediata cuando el rol es Administrador.

---

## 5. Búsqueda, filtros y comparación

Filtros disponibles: texto libre, tipo, categoría, alcance, país/región, año, estado, capa y fuente. La búsqueda cubre id, etiquetas, descripción, categoría, país, fuente, motivo y año.

La comparación lado a lado muestra valor, capa, categoría, alcance, país/año, unidad, GWP, incertidumbre, calidad, estado, fuente, licencia, motivo y versión. Comparar no modifica nada.

---

## 6. Importación y exportación

Formatos:

- **CSV** con `;` o `,`, BOM y `sep=;` (compatible con Excel).
- **JSON** del gestor o respaldo completo.
- **XLS en HTML**; el `.xlsx` binario no se admite sin backend.

La importación siempre muestra una **vista previa** con filas válidas, errores y avisos. Nada se guarda hasta confirmar. Se valida:

- columnas obligatorias;
- unidades compatibles;
- rangos plausibles;
- duplicados por id y por etiqueta;
- valores negativos (solo créditos, captura o sumideros con justificación);
- `Σ(gas × GWP)` y suma azul + verde + gris;
- fuente, año, licencia y motivo.

Plantilla descargable con todas las columnas y una fila de ejemplo.

Exportaciones: CSV, Excel (`.xls` HTML), JSON, plantilla, respaldo completo y auditoría. El JSON de proyecto incluye el snapshot de factores usados.

---

## 7. Persistencia y respaldo

- **IndexedDB** `gol-factors`: almacenes `factors`, `audit`, `meta`.
- **Espejo** en `localStorage` (`gol.factors.custom.v1`, `gol.factors.audit.v1`, `gol.factors.role.v1`) para arranques sin IndexedDB.
- **Respaldo completo** descargable en JSON; la importación acepta el mismo formato.
- El umbral de cambio se guarda en `gol.factors.threshold.v1`.

El mismo esquema Zod/TypeScript está pensado para migrar a un backend sin cambiar la UI.

---

## 8. Snapshot de cálculo

Cada resultado guarda `factorSnapshot` con `id`, `kind`, `version`, `layer`, `value`, `unit`, `sourceId`, `dataYear` y `changeReason`. Cada línea guarda además `factorId`, `factorVersion`, `factorLayer` y `factorChangeReason`.

Consecuencia: un informe antiguo no cambia cuando se edita el factor. El informe incluye la sección **Factores personalizados utilizados** con fuente, año, motivo y advertencia de no verificación.

---

## 9. Validación automática

`npx vitest run` incluye pruebas de:

- prioridad de resolución y restauración de la base;
- detección de overrides sobre otra versión;
- conversión de unidades y rechazo de dimensiones incompatibles;
- CO₂e por GWP y GWP explícito;
- errores de importación (cabeceras, valores negativos, fuente y motivo);
- versionado y reversión;
- snapshots de cálculo y aviso de factores personalizados.

Resultado actual: **32 pruebas aprobadas** (12 del motor + 20 del registro de factores).

---

## 10. Límites conocidos

- Sin backend, sin autenticación real ni sincronización multiusuario.
- El rol y la aprobación son una simulación local de gobernanza.
- `.xlsx` binario no soportado; se usa CSV o XLS HTML.
- Sin conversión multimoneda.
- Sin pruebas E2E; la verificación de UI es manual.
- El PDF se genera con la impresión del navegador.
- La incertidumbre se combina por cuadratura, no por Monte Carlo.
