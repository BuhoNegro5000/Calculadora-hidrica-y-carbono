# Roadmap

> Estado: **v1.0 · octubre 2026**. Esta es una aplicación estática local-first, sin backend. El roadmap prioriza rigor y confianza antes que funciones vistosas.

---

## 1. Principios de priorización

1. **Trazabilidad antes que cobertura.** Un factor nuevo solo entra si tiene fuente, año, unidad, región e incertidumbre.
2. **No greenwashing.** Ninguna función puede presentar compensación como neutralidad.
3. **Accesibilidad y rendimiento son requisitos**, no mejoras posteriores.
4. **Local-first por defecto.** Cualquier sincronización futura debe ser opcional y explícita.
5. **La incertidumbre se muestra.** No se oculta para que el número se vea más limpio.

---

## 2. Completado en v1.0

### Producto

- [x] Splash animado con emblema, mensajes y opción de saltar.
- [x] Onboarding de tres pasos y wizard por categorías.
- [x] Modos rápido, estándar y experto para cuatro entidades.
- [x] Resultados con total, intervalo, equivalencias, benchmarks, alcances, categorías y agua.
- [x] Semáforo y búho reactivo.
- [x] Escenarios “¿y si…?” con trayectoria y metas 2030/2040/2050.
- [x] Plan de acciones ordenado por impacto/costo.
- [x] Compensación con jerarquía evitar → reducir → compensar.
- [x] Informe imprimible/PDF de marca.
- [x] Exportables CSV, JSON de proyecto y catálogo de factores.
- [x] Proyectos locales, comparación de periodos y borrado.
- [x] Español/inglés, tema claro/oscuro/sistema.
- [x] PWA con service worker y carga offline.

### Motor

- [x] GHG Protocol, Scope 1/2/3, ISO 14064-1 e ISO 20121.
- [x] Scope 2 dual location/market.
- [x] GWP AR5/AR6 y RF de aviación.
- [x] WFN e ISO 14046: azul, verde y gris; directa/indirecta.
- [x] Agua virtual y ponderación AWARE/WRI opcional.
- [x] Conversión tipada de unidades.
- [x] Incertidumbre por cuadratura.
- [x] Auditoría línea a línea.
- [x] Validación Zod e integridad referencial.
- [x] 12 tests de referencia.

### Calidad

- [x] TypeScript estricto.
- [x] Lighthouse 100 en accesibilidad, buenas prácticas y SEO en 9 rutas.
- [x] Lighthouse 100 en rendimiento de escritorio y 94 en móvil (portada, build final).
- [x] Code-splitting por ruta y carga bajo demanda del motor y los datos.
- [x] Contraste verificado en claro y oscuro.
- [x] Encabezados ordenados y foco visible.
- [x] `prefers-reduced-motion`.
- [x] Responsive mobile-first sin desbordamiento a 390 px.
- [x] Recarga offline probada con `npm run preview`.

---

## 3. Siguiente (v1.1) — rigor y confianza

### Datos

- [ ] **Verificar los 14 factores pendientes** contra la edición exacta del año del proyecto.
  - Electricidad: PE, US, ES, MX, CO, CL, AR, BR, DE, FR, EU.
  - Carga aérea y marítima.
  - Noche de hotel.
- [ ] Revisar los 32 factores de agua de screening y promover a `verified` los que tengan fuente primaria contrastada.
- [ ] Añadir factores eléctricos de Italia, Portugal, Canadá y Australia.
- [ ] Añadir factores de refrigerantes R-454B, R-32 y R-1234yf con GWP AR6.
- [ ] Documentar la incertidumbre de cada benchmark y separar benchmarks nacionales de objetivos.
- [ ] Publicar un historial de cambios de factores con diff y fecha.

### Metodología

- [ ] Análisis de sensibilidad por línea (tornado chart) además de la cuadratura.
- [ ] Opción de Monte Carlo acotado para usuarios expertos.
- [ ] Modelo de agua gris por contaminante (DQO, N, P) en lugar de dilución simple.
- [ ] Factores de escasez a nivel de cuenca, no solo país.
- [ ] Soporte de múltiples años base y recálculo con factores históricos.
- [ ] Guía de asignación para productos con coproducción.

### Producto

- [ ] Importar un proyecto JSON exportado.
- [ ] Duplicar un proyecto para comparar escenarios sin recrearlo.
- [ ] Añadir notas y evidencias por línea (enlace o referencia documental).
- [ ] Vista de “inventario” filtrable y ordenable.
- [ ] Comparador de dos proyectos con desglose por categoría, no solo totales.
- [ ] Modo presentación para reuniones.
- [ ] Plantillas por sector con preguntas y acciones precargadas.

### Ingeniería

- [x] Code-splitting por ruta y carga bajo demanda del motor y los datos.
- [ ] Tests de componentes y de exportables.
- [ ] Tests end-to-end con Playwright.
- [ ] Presupuesto de rendimiento en CI.
- [ ] Verificación automatizada de enlaces de fuentes.
- [ ] Internacionalización de números y fechas en todos los formatos.

---

## 4. Después (v1.2+) — escala y colaboración

- [ ] Backend opcional para organizaciones, con cifrado y control de acceso.
- [ ] Roles: analista, revisor, aprobador.
- [ ] Historial de versiones de proyecto y auditoría de cambios.
- [ ] Comentarios por línea y flujo de revisión.
- [ ] Integración con factores personalizados de la organización.
- [ ] API de solo lectura para reportes.
- [ ] Conectores a facturas eléctricas y de combustible (CSV/API).
- [ ] Escenarios multi-año con CAPEX/OPEX y curva de adopción.
- [ ] Módulo de cadena de suministro con cuestionarios a proveedores.
- [ ] Reporte alineado a CSRD/ESRS, GRI y CDP (mapeo, no certificación).

---

## 5. Cola de verificación de factores

| Prioridad | Factor | Qué falta | Fuente prevista |
| --- | --- | --- | --- |
| Alta | `elec_pe` | Confirmar factor del SEIN del año y unidad | MINAM / COES |
| Alta | `elec_mx` | Confirmar factor del año | SEMARNAT / CRE |
| Alta | `elec_cl` | Confirmar factor del año | Coordinador Eléctrico |
| Alta | `elec_ar` | Confirmar factor del año | CAMMESA |
| Alta | `elec_br` | Confirmar factor del año | MCTI |
| Alta | `air_freight` | Confirmar factor y RF | DEFRA 2025 |
| Alta | `sea_freight` | Confirmar alcance y unidad | DEFRA 2025 |
| Media | `hotel_night` | Confirmar país y categoría | Hotel Footprinting |
| Media | `elec_us` | Confirmar subregión | EPA eGRID |
| Media | `elec_es` | Confirmar mezcla anual | REE |
| Media | `elec_de` | Confirmar factor anual | UBA |
| Media | `elec_fr` | Confirmar factor anual | RTE |
| Media | `elec_eu` | Confirmar factor anual | EEA |
| Media | `elec_co` | Confirmar factor anual | XM |

---

## 6. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Factor desactualizado | Resultado engañoso | Estado `pending`, fecha de verificación y versión de datos visible. |
| Benchmark interpretado como objetivo | Decisiones equivocadas | Etiqueta de screening y texto explicativo. |
| Compensación leída como neutralidad | Greenwashing | Jerarquía explícita, sin venta de créditos, disclaimer permanente. |
| Incertidumbre subestimada | Falsa precisión | Cuadratura declarada, rango visible y límites documentados. |
| Chunk inicial grande | Carga inicial lenta | Rutas diferidas y datos bajo demanda; presupuesto de rendimiento en CI como siguiente paso. |
| Dependencia de `localStorage` | Pérdida de datos | Exportables JSON/CSV y aviso de almacenamiento local. |
| PDF dependiente del navegador | Formato inconsistente | CSS de impresión probado; PDF generado por el navegador. |

---

## 7. Criterios de “listo” para una nueva función

- Tiene fuente o método documentado.
- Muestra incertidumbre o límites.
- Funciona en claro y oscuro.
- Pasa teclado y contraste.
- No introduce greenwashing.
- Tiene test o verificación manual registrada.
- Se explica en README o docs.
- No rompe la carga offline.
