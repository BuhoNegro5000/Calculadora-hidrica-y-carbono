# Autoevaluación

> **Green Owl Labs · Calculadora de huella de carbono e hídrica · v1.0**
> Evaluación cerrada el **2026-10-30** · Datos **2026.10** · Entorno de verificación: build de producción servido en local (`npm run preview`).

---

## 1. Veredicto

**9,0 / 10.** La aplicación cumple el objetivo de ser un observatorio de huella, no una calculadora de una sola cifra. El motor es trazable, la interfaz tiene identidad propia y los límites se declaran. No llega a 10 por tres razones concretas: **14 factores siguen pendientes de verificación**, **32 de 38 factores de agua son screening** y la calidad se apoya en **12 tests de motor**, sin suite end-to-end ni pruebas con usuarios reales.

| Dimensión | Peso | Nota | Por qué |
| --- | ---: | ---: | --- |
| Rigor metodológico | 20 % | 9,0 | GHG Protocol, Scope 2 dual, GWP AR5/AR6, WFN/ISO 14046 y auditoría por línea. La incertidumbre es analítica, no Monte Carlo. |
| Trazabilidad de datos | 15 % | 8,0 | 119 factores y 34 fuentes, todos con estado y fecha. Cobertura desigual: 60 verificados, 14 pendientes, 45 screening. |
| Experiencia y producto | 20 % | 9,5 | Recorrido completo de medición a plan, con escenarios, informe y exportables. La usabilidad del modo Rápido no se probó con personas externas. |
| Ingeniería y calidad | 15 % | 8,5 | TypeScript estricto, Zod, build reproducible y rutas diferidas. Faltan tests de componentes, exportables y E2E. |
| Accesibilidad y rendimiento | 10 % | 9,5 | Lighthouse 100 en accesibilidad, buenas prácticas y SEO; 100 en rendimiento desktop y 94 en móvil. |
| Documentación y transparencia | 10 % | 9,5 | README, metodología, catálogo, roadmap y esta autoevaluación. El historial de cambios de factores aún es manual. |
| Identidad y originalidad | 10 % | 9,5 | Emblema, tipografía editorial, paleta, splash, búho reactivo y gráficos SVG propios. No parece una plantilla. |
| **Total ponderado** | **100 %** | **9,0** | |

La nota es una evaluación de producto y ingeniería, no una certificación. Una revisión acreditada de ISO 14064-1 o ISO 14046 exige verificación externa, datos primarios y un alcance distinto.

---

## 2. Cómo se evaluó

| Método | Qué se hizo |
| --- | --- |
| Revisión de código | Lectura del motor, datos, pantallas, estilos, persistencia, service worker y exportables. |
| Pruebas automatizadas | `npx vitest run`: 12 casos de referencia del motor. |
| Tipado y build | `npx tsc --noEmit` y `npm run build` sobre el árbol final. |
| Navegación real | Chrome headless/CDP sobre el build de producción: 9 rutas, chunks diferidos, consola y desbordamiento horizontal. |
| Lighthouse | Portada en escritorio y móvil; accesibilidad, buenas prácticas y SEO por separado. |
| Inspección de datos | Conteo programático de factores, estados y fuentes en los JSON. |
| Revisión visual | Capturas en escritorio y móvil, tema claro y oscuro, español e inglés. |

### Entorno

- Windows, Node.js 22, Chrome estable, Vite 7.
- Build estático servido con `vite preview` en `http://127.0.0.1:4174/`.
- Proyecto de prueba: “Hogar Lima”, persona/hogar, Perú, 26 líneas, 5,042 t CO₂e y 1.491 m³ de agua.
- Las cifras de Lighthouse son de este equipo y esta red local. No son una garantía universal.

---

## 3. Matriz de requisitos

### 3.1 Experiencia y producto

| Requisito | Evidencia | Estado | Límite |
| --- | --- | --- | --- |
| Splash de 2–3 s con emblema, mensajes y salto | `src/components/Splash.tsx`; cierre a 2,96 s; botón “Saltar”; `sessionStorage` evita repetirlo | Cumplido | El splash no se muestra si la sesión ya lo vio. |
| Onboarding de tres pasos | `src/screens/Onboarding.tsx`: entidad → límites/país → nivel de detalle | Cumplido | — |
| Wizard por categorías con progreso y ayudas | `src/screens/Wizard.tsx`; ayudas, unidades, valores típicos, progreso por categoría | Cumplido | — |
| Estimación asistida declarada | `applyEstimate()` en Wizard; guarda el supuesto y lo muestra en el informe | Cumplido | Son estimaciones de screening, no datos primarios. |
| Resultado vivo mientras se responde | `calculate()` en cada render del Wizard y contador animado | Cumplido | — |
| Resultados con total, intervalo y equivalencias | `src/screens/Results.tsx`; `useCountUp`, rango, árboles, vuelos, coche, piscinas, botellas | Cumplido | Las equivalencias son pedagogía, no métricas de impacto. |
| Comparación nacional, mundial y sectorial | `src/engine/benchmarks.ts`; barras y semáforo | Cumplido con límites | Los benchmarks son screening compilado, no objetivos científicos. |
| Desglose interactivo y búho reactivo | Sunburst, donut, filtros por categoría y `OwlFigure` según semáforo | Cumplido | — |
| Escenarios “¿y si…?” en vivo | `src/screens/Reduce.tsx`; palancas de vuelo, energía, coche, dieta y residuos | Cumplido | Las palancas son porcentajes sobre campos, no modelos predictivos. |
| Metas Net Zero/SBTi y brecha | Trayectoria 2030/2040/2050, reducción del 90 % y referencia lineal de 4,2 %/año | Cumplido con límites | La app dibuja la geometría; no certifica una meta SBTi. |
| Ranking de acciones por impacto/costo | `src/data/actions.ts`; `score = impacto / (costo + 0,5)` | Cumplido | Costos y esfuerzos son ordinales (1–3), no presupuestos. |
| Plan priorizado y residual | Selección de acciones, tope del 95 % y residual en Compensar | Cumplido | El tope evita prometer cero. |
| Compensación honesta | `src/screens/Compensate.tsx`; jerarquía evitar → reducir → compensar y criterios de calidad | Cumplido | No vende, emite ni retira créditos. |
| Informe de marca / PDF | `src/screens/Report.tsx` + CSS de impresión + `window.print()` | Cumplido con límites | El PDF depende del diálogo del navegador. |
| CSV, JSON y catálogo | `src/lib/export.ts`; BOM UTF-8, `sep=;`, una fila por línea, metadatos y fuentes | Cumplido | No hay `.xlsx` nativo; el CSV se abre en Excel. |
| Proyectos locales y comparación de periodos | `src/screens/Projects.tsx`; comparación A/B y borrado con confirmación | Cumplido | Solo `localStorage`; no hay sincronización. |
| Español/inglés y tema claro/oscuro/sistema | `src/i18n/`, `src/store/app.tsx`, tokens CSS | Cumplido | — |
| Multi-unidad y multi-moneda | Conversión tipada por dimensión; varios factores de gasto en USD | Parcial | No hay conversión de moneda ni entrada en PEN/EUR; los factores de gasto están denominados en USD. |
| Mobile-first y sin desbordamiento | Navegación inferior, rejillas apiladas; comprobado a 390 px en 9 rutas | Cumplido | — |

### 3.2 Rigor metodológico

| Requisito | Evidencia | Estado | Límite |
| --- | --- | --- | --- |
| GHG Protocol, Scope 1/2/3 | `src/engine/calculate.ts`; alcances y categorías Scope 3 | Cumplido | Es un inventario de screening, no una verificación. |
| Scope 2 dual location/market | Cálculo paralelo; el headline usa `scope2Method`; nunca se suman | Cumplido | Market sin instrumento contractual genera advertencia. |
| GWP AR5/AR6 y RF de aviación | `src/engine/gwp.ts`, `byGwp` y `valueRf` | Cumplido | El RF cambia la comparabilidad y se advierte. |
| ISO 14064-1 e ISO 20121 | Campos de límites, año base y preguntas de evento | Cumplido con límites | Se usan como estructura metodológica, no como certificación. |
| WFN e ISO 14046: azul/verde/gris | `src/data/waterFactors.json` y cálculo por línea | Cumplido con límites | El agua gris se simplifica por dilución. |
| Agua directa/indirecta y virtual | Separación en el resultado y en el CSV | Cumplido | — |
| Ponderación por escasez AWARE/WRI | `src/data/stress.json`; `blueScarce` sin alterar el total físico | Cumplido | Es a nivel país, no cuenca. |
| Unidades tipadas y conversión segura | `src/engine/units.ts`; `UnitMismatchError` ante dimensiones incompatibles | Cumplido | — |
| Incertidumbre propagada | Cuadratura de incertidumbres por línea y rango visible | Cumplido con límites | No modela correlaciones; no es Monte Carlo. |
| Auditoría línea a línea | `ResultLine` con cantidad, factor, fuente, año, estado, supuesto y frase de cálculo | Cumplido | — |
| Evitar doble conteo | Scope 2 una sola vez; dieta por alimento; preguntas informativas sin línea; agua virtual separada | Cumplido | — |
| Límites organizacionales y año base | Campos en proyecto y aviso al comparar | Cumplido | No hay recálculo histórico con factores de años anteriores. |
| Factores en JSON versionados, no en la UI | `src/data/*.json`; `DATA_VERSION` y validación Zod | Cumplido | La versión se incrementa a mano. |
| Cada factor con valor, unidad, fuente, año, región, incertidumbre y fecha | Esquema Zod en `src/engine/factors.ts` | Cumplido | — |
| Fuentes oficiales y estado pendiente visible | 34 fuentes; badges y advertencias para `pending`/`screening` | Cumplido | 14 pendientes y 32 de agua en screening. |
| Tests de referencia y validación cruzada | 32 casos: 12 del motor (electricidad, diésel, Scope 2, aviación/RF, agua, GWP, incertidumbre, unidades, escasez, directa/indirecta, market, escenario) y 20 del registro de factores (prioridad, versiones, importación, snapshots, enums) | Cumplido con límites | La validación cruzada es contra valores de referencia internos; no contra un tercero independiente. |

### 3.3 Ingeniería, accesibilidad y documentación

| Requisito | Evidencia | Estado | Límite |
| --- | --- | --- | --- |
| TypeScript estricto y build reproducible | `npx tsc --noEmit`; `npm run build` | Cumplido | — |
| Validación de datos en la frontera | Zod + integridad referencial; falla ante fuente o factor huérfano | Cumplido | — |
| Persistencia local y recuperación | `gol.projects.v1`, `gol.active.v1`, idioma, tema, splash y capa de factores en IndexedDB con espejo localStorage | Cumplido | Si se borra el almacenamiento, no hay copia en servidor. |
| Gestión auditable de factores | Capa base inmutable, overrides, versiones, reversión, papelera, auditoría, roles y aprobación local | Cumplido con límites | La gobernanza es local; no sustituye un repositorio organizacional con backend. |
| PWA offline | `public/sw.js`, manifest e iconos; probado con red emulada offline | Cumplido | La primera visita necesita red. Las rutas diferidas se cachean al visitarse; el shell y la portada quedan disponibles tras la primera carga. |
| WCAG AA | Contraste claro/oscuro, foco, teclado, etiquetas, encabezados y `prefers-reduced-motion` | Cumplido | No se hizo una auditoría manual con lector de pantalla. |
| Lighthouse > 90 | Escritorio 100; móvil 94; accesibilidad, buenas prácticas y SEO 100 en las 10 rutas, en tema claro y oscuro | Cumplido | La medición de rendimiento es de la portada; las demás rutas se auditaron en accesibilidad, buenas prácticas y SEO. |
| Carga inicial contenida | Rutas diferidas con `React.lazy`; 340 kB JS iniciales (105 kB gzip) y 118 kB CSS (24 kB gzip). El proveedor y el catálogo de factores (142 kB, 37 kB gzip) se cargan solo al entrar a una ruta que los usa. | Cumplido | La portada no descarga el catálogo; la primera visita a una ruta de cálculo sí. |
| Documentación | README, `METHODOLOGY.md`, `FACTORS.md`, `ROADMAP.md` y esta autoevaluación | Cumplido | — |
| Identidad propia, no plantilla | Emblema WebP, Fraunces/Manrope/IBM Plex Mono, paleta y SVG propios | Cumplido | — |

---

## 4. Verificación técnica reproducible

```bash
npx tsc --noEmit   # sin errores
npx vitest run     # 32/32 tests
npm run build      # build de producción correcto
```

### 4.1 Rendimiento

| Métrica | Escritorio | Móvil |
| --- | ---: | ---: |
| Lighthouse Performance | **100** | **94** |
| First Contentful Paint | 0,38 s | 2,1 s |
| Largest Contentful Paint | 0,58 s | 2,7 s |
| Total Blocking Time | 3 ms | 99 ms |
| Speed Index | 0,63 s | 2,1 s |
| Cumulative Layout Shift | 0,0015 | 0,0034 |

Condiciones: Lighthouse 12.8.2, Chrome headless, build de producción, portada, sin extensiones. El preset móvil aplica red y CPU emuladas; el escritorio usa el preset desktop. Los valores absolutos cambian con el equipo y la red.

### 4.2 Navegación verificada

Se recorrieron las 10 rutas con un proyecto sembrado en `localStorage`. Todas renderizaron su encabezado, sin errores de consola, sin desbordamiento horizontal y con sus chunks bajo demanda en estado 200:

`welcome`, `onboarding`, `measure`, `results`, `reduce`, `offset`, `report`, `transparency`, `projects`, `factors`.

También se verificó previamente: creación y recarga de un proyecto, cambio de tema e idioma, exportación CSV/JSON, informe imprimible, comparación de periodos, borrado con confirmación y recarga offline con el service worker.

En el gestor de factores se verificó en navegador: catálogo base de 119 registros, creación guiada de un factor (carbono, kWh, 0.5 kg CO₂e, fuente MINEM, calidad oficial) disponible al instante, importación CSV con vista previa (1 fila válida y 2 errores en la fila negativa), aplicación de la fila válida, paso a papelera con motivo, recuperación desde la papelera, override de `elec_pe` de 0,43 a 0,6 kg CO₂e/kWh con aviso de umbral de +39,5 %, restauración al valor base y auditoría con los seis movimientos. También se verificó el cambio ES/EN del módulo. Los flujos de importación, papelera y reversión se cubren además con las 20 pruebas del registro; no hay E2E automatizado.

### 4.3 Datos

| Catálogo | Factores | Verificados | Pendientes | Screening |
| --- | ---: | ---: | ---: | ---: |
| Carbono | 81 | 54 | 14 | 13 |
| Agua | 38 | 6 | 0 | 32 |
| **Total** | **119** | **60** | **14** | **45** |

- 34 fuentes registradas.
- 13 países/regiones con factor eléctrico.
- 13 benchmarks nacionales, 14 sectores y referencias por asistente.
- `DATA_VERSION`: 2026.10.
- Capa personalizada separada en IndexedDB; los IDs son únicos entre carbono y agua (corregida una colisión histórica en `water_bottle`).

El conteo se obtuvo directamente de los JSON, no de la documentación.

---

## 5. Lo que impide una nota mayor

1. **Cobertura verificada incompleta.** 14 factores pendientes y 32 de agua en screening. La app lo dice, pero un consultor que necesite defensa externa tendrá que sustituirlos.
2. **Incertidumbre simplificada.** La cuadratura asume independencia; no hay sensibilidad por línea ni Monte Carlo. Es suficiente para screening, no para una decisión de inversión de alto riesgo.
3. **Agua gris por dilución.** No modela DQO, nitrógeno, fósforo ni sustancia por sustancia.
4. **Benchmarks de screening.** Los promedios nacionales y sectoriales son referencias, no objetivos científicos. La UI lo declara, pero el usuario puede ignorarlo.
5. **Pruebas limitadas al motor y al registro de factores.** No hay tests de componentes, exportables, persistencia ni E2E. Los flujos se verificaron manualmente con CDP.
6. **Sin prueba de usabilidad con no expertos.** El modo Rápido está diseñado para menos de 5 minutos y tiene pocas preguntas, pero no se midió con una muestra de personas reales.
7. **Multi-moneda ausente.** Hay unidades tipadas, pero los factores de gasto están en USD y no se convierte moneda.
8. **Sin backend ni colaboración.** Es una decisión de privacidad y alcance, no un olvido; limita el uso corporativo multiusuario y la aprobación real de factores.
9. **PDF dependiente del navegador.** El CSS de impresión está cuidado, pero la paginación final puede variar entre navegadores.
10. **Gobernanza de factores local.** Hay historial, auditoría y roles simulados, pero no un repositorio central con identidad verificada ni bloqueo optimista entre dispositivos.
11. **Offline no es total en la primera sesión.** El shell y la portada quedan cacheados; una ruta diferida que nunca se visitó puede no estar disponible sin red.

---

## 6. Qué haría subir la nota

| Prioridad | Acción | Impacto esperado |
| --- | --- | --- |
| Alta | Verificar los 14 factores pendientes contra la edición exacta del año | +0,3 en datos |
| Alta | Promover a `verified` los factores de agua con fuente primaria contrastada | +0,2 en datos |
| Alta | Añadir tests de exportables, persistencia y E2E con Playwright | +0,3 en ingeniería |
| Alta | Cerrar los huecos de prioridad alta: red peruana 2024, agua ANA, combustibles con desglose de gas y refrigerantes AR6 | +0,3 en datos |
| Media | Análisis de sensibilidad por línea (tornado) y Monte Carlo acotado | +0,2 en rigor |
| Media | Agua gris por contaminante (DQO, N, P) | +0,2 en rigor |
| Media | Importar proyecto JSON y duplicar escenarios | +0,1 en producto |
| Media | Conversión de moneda declarada o factores de gasto locales | +0,1 en cobertura |
| Baja | Migrar la capa personalizada a backend con aprobación central e identidad verificada | +0,1 en gobernanza |
| Baja | Prueba de usabilidad con 5–8 personas no expertas | +0,1 en producto |

Con las tres primeras acciones, la evaluación honesta se acercaría a **9,3–9,4**. Un 10 exigiría, además, verificación externa y datos primarios: eso ya no es una aplicación, es un servicio de verificación.

---

## 7. Conclusión

La aplicación hace lo que promete y, sobre todo, **no promete lo que no puede**. La huella se reconstruye línea a línea, el Scope 2 no se suma dos veces, el agua se separa por color y la compensación aparece después de evitar y reducir. La identidad visual no es un tema aplicado a una plantilla: el emblema, la tipografía, los gráficos y el lenguaje forman un producto reconocible.

El resultado es una herramienta **seria para screening y gestión**, útil para una persona que quiere entender su huella y para un consultor que necesita un inventario exportable y revisable. No es una certificación, no es un mercado de créditos y no sustituye datos primarios. Esa honestidad es, precisamente, su mejor característica.

---

© Green Owl Labs · Documento de autoevaluación. Las cifras y enlaces se refieren a la versión 1.0 y a la versión de datos 2026.10.
