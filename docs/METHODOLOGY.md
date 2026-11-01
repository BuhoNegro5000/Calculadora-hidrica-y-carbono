# Metodología

> Este documento explica **cómo calcula** Green Owl Labs. No sustituye una verificación ISO 14064-1, ISO 14046 ni una revisión de terceros.

Versión de datos: **2026.10** · Última revisión de este documento: **2026-10-29**

---

## 1. Alcance y límites

### 1.1 Entidades

| Entidad | Unidad de análisis | Denominador |
| --- | --- | --- |
| Persona / hogar | Hogar y sus actividades anuales | Personas del hogar |
| Empresa / organización | Organización con límites operacionales, financieros o de participación | Empleados |
| Evento | Evento con asistentes, sede, viajes y catering | Asistentes |
| Producto | Producto o servicio con materiales, fabricación, distribución, uso y fin de vida | Unidades producidas |

El proyecto guarda **límites** (`operational`, `financial`, `equity`), **periodo**, **año base**, **país**, **sector** (empresas), **set GWP**, **método de Scope 2** y **nivel de detalle**. Comparar dos proyectos sin revisar estos campos es una comparación inválida; la UI lo advierte.

### 1.2 Gases y GWP

- Se reporta en **CO₂ equivalente**.
- El proyecto elige **AR5** o **AR6**.
- Los factores con `byGwp` usan el valor del set elegido; si no existe, usan el valor base.
- La aviación puede activar **forzamiento radiativo (RF)** mediante `valueRf`. La UI advierte que el resultado no es directamente comparable con inventarios que solo reportan CO₂.

### 1.3 Scope 2 dual

Toda línea de electricidad calcula en paralelo:

```text
location = cantidad × factor de red del país
market   = cantidad × factor contractual (o factor de red si no hay)
```

El resultado headline usa `scope2Method` (`location` o `market`). **Nunca se suman location y market.** La UI muestra ambos y advierte si se eligió market sin factor contractual.

---

## 2. Fórmula base

Para cada línea:

```text
cantidad_canonica = convert(respuesta, unidad_respuesta, unidad_factor)
multiplicador      = opción seleccionada (clase de vuelo, etc.) o 1
valor_factor       = factor[GWP] o factor[RF] según corresponda
kg CO₂e            = cantidad_canonica × valor_factor × multiplicador
agua_azul          = cantidad_canonica × factor_agua.blue × multiplicador
agua_verde         = cantidad_canonica × factor_agua.green × multiplicador
agua_gris          = cantidad_canonica × factor_agua.grey × multiplicador
```

La conversión de unidades es **tipada por dimensión** (energía, volumen, masa, distancia, pasajero·km, tonelada·km, conteo, dinero, datos, tiempo, área). Una conversión entre dimensiones distintas lanza `UnitMismatchError`; no se corrige silenciosamente.

### 2.1 Líneas expertas

El modo experto permite añadir una línea con factor y cantidad propios. La línea conserva `factorId`, unidad, fuente, año, estado e incertidumbre. No se acepta un factor sin fuente registrada.

### 2.2 Dieta

Los perfiles de dieta (`dietProfiles.json`) definen kg/persona/año por alimento. El motor genera una línea por alimento con factor de carbono y, cuando existe, factor de agua. La reducción de carne y pescado se aplica solo a los alimentos cárnicos. Los perfiles y su fuente se muestran en la UI.

### 2.3 Residuos y agua gris

El agua gris se estima por **volumen de dilución** a partir de la carga contaminante y el estándar de calidad del cuerpo receptor. Es una simplificación declarada como screening; no reemplaza un análisis de calidad del agua por sustancia.

---

## 3. Agregación

```text
total_carbono      = Σ kg CO₂e de todas las líneas
total_location     = Σ líneas Scope 2 location + resto
total_market       = Σ líneas Scope 2 market + resto
por_alcance        = Σ por Scope 1, 2 y 3
por_categoría      = Σ por categoría de la entidad
agua_total         = azul + verde + gris
agua_directa       = líneas marcadas como directas
agua_indirecta     = resto
```

### 3.1 Incertidumbre

Se propaga por cuadratura, asumiendo independencia entre líneas:

```text
σ = sqrt( Σ (kgCO₂e_i × incertidumbre_i)² )
incertidumbre_relativa = σ / total
rango = [max(0, total − σ), total + σ]
```

Es una aproximación analítica de screening. **No es Monte Carlo**, no modela correlaciones entre factores y no sustituye un análisis de sensibilidad.

### 3.2 Completitud y confianza

```text
completitud = campos numéricos con dato propio / campos numéricos visibles
confianza   = 0,45 × completitud + 0,55 × proporción de kg CO₂e verificados
```

La confianza es una señal de calidad de datos, no una probabilidad estadística.

---

## 4. Benchmarks y semáforo

| Entidad | Referencia de carbono | Referencia de agua |
| --- | --- | --- |
| Persona | Promedio nacional per cápita × personas del hogar | Promedio nacional de consumo × personas del hogar |
| Empresa | t/empleado/año del sector × empleados | 120 m³/empleado/año (screening) |
| Evento | 25 kg CO₂e/asistente × asistentes | 0,3 m³/asistente × asistentes |
| Producto | Sin benchmark específico | Sin benchmark específico |

El semáforo compara el resultado con la referencia:

```text
ratio ≤ 0,75        → bajo
0,75 < ratio ≤ 1,25 → medio
ratio > 1,25        → alto
```

Los benchmarks son **referencias de screening**. No son objetivos científicos ni umbrales de sostenibilidad.

---

## 5. Escenarios y metas

### 5.1 Palancas

Cada palanca reduce un conjunto de campos (`fieldIds`) en un porcentaje. La dieta se modela aparte para no reducir el consumo de alimentos no cárnicos. El cálculo se rehace en vivo con el proyecto modificado, sin tocar el proyecto original.

### 5.2 Trayectoria

Para un año objetivo `T` y un año de inicio `S`:

```text
años = T − S
objetivo(y) = base × (1 − 0,9 × (y − S) / años)
escenario(y) = base × (escenario/base)^((y − S)/años)
```

La meta usa una reducción del **90 %** respecto de la base, alineada con la lógica de neutralización de SBTi 1,5 °C para el residual inevitable. La referencia anual lineal es **4,2 %/año**. La brecha se calcula contra la meta en el año objetivo.

> La app no certifica una meta SBTi. Solo muestra la geometría de la trayectoria y la brecha.

### 5.3 Plan de acciones

Cada acción tiene impacto estimado, costo (1–3), esfuerzo (1–3), plazo y ODS. El orden es:

```text
score = impacto / (costo + 0,5)
```

La reducción acumulada del plan se limita al **95 %** para no prometer un residual cero. El residual se calcula sobre el total actual y se usa en la pantalla de compensación.

---

## 6. Compensación

La jerarquía es explícita:

1. **Evitar** la emisión.
2. **Reducir** con eficiencia, electrificación, cambio de modo y dieta.
3. **Compensar** solo el residual inevitable.

Criterios de calidad evaluados en la UI:

- Adicionalidad demostrable.
- Permanencia y riesgo de reversión.
- MRV independiente y trazabilidad.
- Salvaguardas sociales y biodiversidad.
- Sin doble conteo ni doble uso.
- Transparencia sobre método e incertidumbre.

La app **no vende créditos**, no emite certificados y no declara neutralidad. Los costos son rangos indicativos de screening.

---

## 7. Agua y escasez

### 7.1 Colores

- **Azul**: agua superficial o subterránea consumida.
- **Verde**: agua de lluvia incorporada a cultivos o vegetación.
- **Gris**: agua necesaria para diluir contaminantes hasta cumplir un estándar.

### 7.2 Ponderación por escasez

Si el proyecto activa `waterStress`:

```text
agua_azul_escasa = agua_azul × AWARE_país
```

El total físico **no cambia**; se muestra una métrica adicional para decisiones en cuencas con estrés. Los factores AWARE y la categoría WRI se muestran en Transparencia. Es una ponderación de screening, no una evaluación de impacto de ciclo de vida completa.

### 7.3 Agua directa e indirecta

- **Directa**: uso en la operación o el hogar (riego, procesos, sanitarios).
- **Indirecta**: agua virtual incorporada en alimentos, bienes, energía y servicios.

La distinción se conserva en el resultado y en el exportable.

---

## 8. Auditoría línea a línea

Cada `ResultLine` conserva:

| Campo | Uso |
| --- | --- |
| `questionId`, `label`, `category` | Origen y clasificación. |
| `quantity`, `unit` | Dato de actividad. |
| `factorId`, `factorLabel`, `factorValue`, `factorUnit` | Factor aplicado. |
| `kgCO2e`, `kgCO2eLocation`, `kgCO2eMarket` | Resultado y dual Scope 2. |
| `water.blue/green/grey` | Huella hídrica. |
| `uncertaintyPct` | Incertidumbre del factor. |
| `source`, `factorYear`, `factorStatus` | Trazabilidad. |
| `assumptions` | Supuestos y estimaciones asistidas. |
| `method` | Método Scope 2 cuando aplica. |

La frase de cálculo (`auditSentence`) muestra la operación en lenguaje legible. El CSV incluye esa frase y todos los campos anteriores.

---

## 9. Evitar doble conteo

- Scope 2 se reporta una sola vez; location y market son vistas alternativas, no sumandos.
- La dieta genera líneas por alimento, no una línea agregada más el detalle.
- Las preguntas informativas (tipo de coche, clase de vuelo) no generan línea; solo modifican el factor o el multiplicador.
- Las líneas de agua virtual no suman carbono.
- Las líneas expertas se añaden una vez y conservan su propio `id`.
- El agua directa e indirecta se separan para evitar presentar el agua virtual como consumo operativo.

---

## 10. Recálculo y año base

El proyecto conserva `baseYear`, `periodStart` y `periodEnd`. Al cambiar factores o métodos, el resultado se recalcula con la versión de datos actual. Para comparar periodos:

1. Crea un proyecto por periodo.
2. Mantén la misma entidad, país y límites.
3. Revisa que el método GWP y Scope 2 sean comparables.
4. Usa la comparación de la pantalla **Proyecto**; la UI advierte si cambia la entidad.

No se reescribe el pasado: un cambio de factor se refleja en la versión de datos y en el exportable, no se aplica retroactivamente a un proyecto ya exportado.

---

## 11. Límites declarados

- Herramienta de screening y gestión, no verificación acreditada.
- Benchmarks de screening, no objetivos científicos.
- Agua gris simplificada por dilución.
- Incertidumbre analítica por cuadratura, sin correlaciones.
- Sin modelo completo de ciclo de vida para todas las categorías.
- Sin compra, emisión o retiro de créditos.
- Sin backend, cuentas ni colaboración.
- Factores pendientes y de screening visibles en la UI y en los exportables.

---

## 12. Referencias normativas

- GHG Protocol Corporate Accounting and Reporting Standard.
- GHG Protocol Scope 2 Guidance.
- GHG Protocol Corporate Value Chain (Scope 3) Standard.
- ISO 14064-1:2018.
- ISO 14046:2014.
- ISO 20121:2024 (eventos).
- Water Footprint Network Assessment Manual.
- IPCC AR5 y AR6 (GWP).
- AWARE / WULCA y WRI Aqueduct (escasez).
- DEFRA 2025, EPA eGRID/USEEIO, IEA, MINAM/COES, y reguladores eléctricos nacionales.

El catálogo completo, con ID, valor, unidad, región, año, incertidumbre, estado y fecha de verificación, está en [FACTORS.md](FACTORS.md) y en la pantalla **Transparencia**.
