# Factores y fuentes

> **Versión de datos: 2026.10** · Última verificación del catálogo: **2026-10-29**
>
> Cada factor incluye valor, unidad, fuente, año, región, incertidumbre, estado y fecha de verificación. Ningún factor vive en la interfaz.

---

## 1. Resumen

| Catálogo | Factores | Verificados | Pendientes | Screening |
| --- | ---: | ---: | ---: | ---: |
| Carbono | 81 | 54 | 14 | 13 |
| Agua | 38 | 6 | 0 | 32 |
| **Total** | **119** | **60** | **14** | **45** |

- **34 fuentes** registradas en `src/data/sources.json`.
- **10 categorías** de factores de carbono: energía, refrigerantes, transporte, eventos, alimentación, bienes, digital, residuos, agua y logística.
- **13 países/regiones** cubiertos por el factor eléctrico: PE, US, GB, ES, MX, CO, CL, AR, BR, DE, FR, EU y GLOBAL.
- **13 benchmarks** nacionales de carbono y agua, 14 sectores y referencias por asistente a evento.

### Estados

| Estado | Significado | Uso en la UI |
| --- | --- | --- |
| `verified` | Valor contrastado contra la fuente citada en la fecha indicada. | Badge verde. |
| `pending` | Fuente oficial identificada, pero el valor debe confirmarse contra la edición exacta del año del proyecto. | Badge ámbar y advertencia en resultados. |
| `screening` | Estimación de orden de magnitud, con incertidumbre alta o supuestos. | Badge azul y advertencia en resultados. |

Un factor `pending` no se oculta: se muestra, se exporta y se advierte. La app falla al cargar si una fuente o un factor referenciado no existe.

---

## 2. Estructura de un factor

### Carbono

```json
{
  "id": "car_gasoline",
  "label": { "es": "Coche de gasolina (km)", "en": "Petrol car (km)" },
  "category": "mobility",
  "scope": 1,
  "unit": "km",
  "value": 0.163,
  "byGwp": { "AR5": 0.163, "AR6": 0.163 },
  "uncertainty": 0.12,
  "sourceId": "defra2025",
  "country": "GLOBAL",
  "year": 2025,
  "lastVerified": "2026-10-29",
  "status": "verified",
  "waterFactorId": "water_car"
}
```

Campos relevantes:

- `scope`: 1, 2 o 3.
- `scope3Category`: categoría del Scope 3 cuando aplica.
- `byGwp`: valor específico para AR5 y/o AR6.
- `valueRf`: valor con forzamiento radiativo (aviación).
- `waterFactorId`: vínculo con un factor de agua.
- `direct`: marca agua directa.
- `notes`: aclaraciones metodológicas bilingües.

### Agua

```json
{
  "id": "water_beef",
  "label": { "es": "Carne de vacuno (kg)", "en": "Beef (kg)" },
  "unit": "kg",
  "blue": 0.55,
  "green": 14.5,
  "grey": 0.8,
  "uncertainty": 0.35,
  "sourceId": "wfn_food",
  "country": "GLOBAL",
  "year": 2012,
  "lastVerified": "2026-10-29",
  "status": "screening"
}
```

Los tres colores son **m³ por unidad del factor**. No se suman entre sí para comparar con benchmarks de un solo color sin declararlo.

---

## 3. Fuentes registradas

| ID | Organización | Documento | Año | URL |
| --- | --- | --- | --- | --- |
| `defra2025` | UK DESNZ / DEFRA | Greenhouse gas reporting: conversion factors 2025 (condensed set) | 2025 | https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025 |
| `ipcc_ar5` | IPCC | Fifth Assessment Report, WG1, Chapter 8: Anthropogenic and Natural Radiative Forcing | 2014 | https://www.ipcc.ch/report/ar5/wg1/ |
| `ipcc_ar6` | IPCC | Sixth Assessment Report, WG1, Chapter 7: The Earth's Energy Budget, Climate Feedbacks and Climate Sensitivity | 2021 | https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-7/ |
| `epa_egrid` | US EPA | Emissions & Generation Resource Integrated Database (eGRID) 2022 | 2024 | https://www.epa.gov/egrid |
| `iea` | International Energy Agency | Emissions Factors 2023 / World Energy Outlook | 2023 | https://www.iea.org/data-and-statistics |
| `minam_pe` | MINAM Perú | Factores de emisión del SEIN para el cálculo de la huella de carbono | 2022 | https://www.gob.pe/minam |
| `coes_pe` | COES SINAC | Estadísticas anuales del SEIN y factor de emisión del sistema eléctrico | 2023 | https://www.coes.org.pe/Portal/publicaciones/estadisticas |
| `ree_es` | Red Eléctrica de España | Emisiones de CO2 asociadas a la generación de electricidad en España | 2023 | https://www.ree.es/es/datos/generacion/no-renovables-detalle-emisiones-CO2 |
| `semarnat_mx` | SEMARNAT / CRE México | Factor de emisión del Sistema Eléctrico Nacional | 2023 | https://www.gob.mx/semarnat |
| `xm_co` | XM Colombia | Factor de emisión de gases de efecto invernadero del SIN | 2023 | https://www.xm.com.co/ |
| `coord_cl` | Coordinador Eléctrico Nacional de Chile | Factores de emisión del Sistema Eléctrico Nacional | 2023 | https://www.coordinador.cl/ |
| `cammesa_ar` | CAMMESA Argentina | Factor de emisión del Sistema Interconectado Nacional | 2023 | https://www.cammesa.com/ |
| `mcti_br` | MCTI Brasil | Fator médio de emissão do Sistema Interligado Nacional | 2023 | https://www.gov.br/mcti/ |
| `uba_de` | Umweltbundesamt (UBA) Alemania | Strom- und Wärmeversorgung: CO2-Emissionen pro Kilowattstunde | 2023 | https://www.umweltbundesamt.de/ |
| `rte_fr` | RTE Francia | Bilan électrique et intensité carbone de l'électricité | 2023 | https://www.rte-france.com/ |
| `eea_eu` | European Environment Agency | Greenhouse gas emission intensity of electricity generation in Europe | 2023 | https://www.eea.europa.eu/data-and-maps/daviz/co2-emission-intensity-14 |
| `poore_nemecek` | Poore & Nemecek, Science | Reducing food's environmental impacts through producers and consumers | 2018 | https://doi.org/10.1126/science.aaq0216 |
| `wfn_food` | Water Footprint Network / Mekonnen & Hoekstra | The green, blue and grey water footprint of crops and animal products | 2012 | https://www.waterfootprint.org/resources/interactive-tools/product-gallery/ |
| `wfn` | Water Footprint Network | Water Footprint Assessment Manual y National Water Footprint Explorer | 2011 | https://www.waterfootprint.org/resources/interactive-tools/national-water-footprint-explorer/ |
| `aware` | WULCA / Boulay et al. | AWARE characterization factors for water scarcity (v1.2) | 2018 | https://wulca-waterlca.org/aware/ |
| `wri_aqueduct` | World Resources Institute | Aqueduct 4.0 Water Risk Atlas | 2023 | https://www.wri.org/aqueduct |
| `epa_useeio` | US EPA | US Environmentally-Extended Input-Output (USEEIO) supply chain emission factors | 2021 | https://www.epa.gov/useio |
| `iea_4e` | IEA 4E TCP | Network energy use and emissions of data transmission | 2020 | https://www.iea-4e.org/ |
| `carbon_trust` | Carbon Trust | Carbon impact of video streaming (white paper) | 2021 | https://www.carbontrust.com/resources/carbon-impact-of-video-streaming |
| `wrap` | WRAP UK | Valuing our clothes: the cost of UK fashion | 2017 | https://wrap.org.uk/resources/report/valuing-our-clothes-cost-uk-fashion |
| `gfn` | Global Footprint Network | National Footprint and Biocapacity Accounts (2023 edition) | 2023 | https://footprintnetwork.org/resources/data/ |
| `ghg_protocol` | GHG Protocol | Corporate Accounting and Reporting Standard; Scope 2 Guidance; Corporate Value Chain (Scope 3) Standard | 2015 | https://ghgprotocol.org/standards |
| `iso_14064` | ISO | ISO 14064-1:2018 Greenhouse gases — Quantification and reporting at organization level | 2018 | https://www.iso.org/standard/66453.html |
| `iso_14046` | ISO | ISO 14046:2014 Environmental management — Water footprint — Principles, requirements and guidelines | 2014 | https://www.iso.org/standard/43243.html |
| `iso_20121` | ISO | ISO 20121:2024 Event sustainability management systems | 2024 | https://www.iso.org/standard/86389.html |
| `hotel_footprint` | International Tourism Partnership / Greenview | Hotel Footprinting Tool — Cornell Hotel Sustainability Benchmarking Index | 2023 | https://www.hotelfootprints.org/ |
| `ana_pe` | Autoridad Nacional del Agua (ANA), Perú | Programa Huella Hídrica y Certificado Azul | 2023 | https://www.gob.pe/ana |
| `fao` | FAO | FAOSTAT and Water accounting in agriculture | 2023 | https://www.fao.org/faostat/ |
| `benchmark_compilation` | Green Owl Labs · compilación | Promedios sectoriales y por asistente a evento a partir de CDP, EPA, OWID y literatura ISO 20121; valores de screening | 2024 | https://ghgprotocol.org/ |

---

## 4. Factores no verificados

Los siguientes factores se muestran con su estado real. No se presentan como verificados.

### 4.1 Pendientes (14)

| ID | Fuente | Motivo |
| --- | --- | --- |
| `elec_pe` | MINAM / COES | El factor del SEIN cambia cada año; confirmar edición del periodo. |
| `elec_us` | EPA eGRID | Confirmar año de eGRID y subregión. |
| `elec_es` | REE | Confirmar mezcla y factor del año del proyecto. |
| `elec_mx` | SEMARNAT / CRE | Confirmar factor del año. |
| `elec_co` | XM | Confirmar factor del año. |
| `elec_cl` | Coordinador Eléctrico | Confirmar factor del año. |
| `elec_ar` | CAMMESA | Confirmar factor del año. |
| `elec_br` | MCTI | Confirmar factor del año. |
| `elec_de` | UBA | Confirmar factor del año. |
| `elec_fr` | RTE | Confirmar factor del año. |
| `elec_eu` | EEA | Confirmar factor del año. |
| `air_freight` | DEFRA 2025 | Confirmar factor y tratamiento de RF. |
| `sea_freight` | DEFRA 2025 | Confirmar factor y alcance. |
| `hotel_night` | Hotel Footprinting | Confirmar país, categoría y año. |

### 4.2 Screening (13 de carbono)

`elec_global`, `car_ev`, `taxi`, `meal_standard`, `meal_vegetarian`, `water_bottle`, `electronics_usd`, `services_usd`, `it_usd`, `furniture_usd`, `digital_gb`, `streaming_hour`, `event_materials`.

Son estimaciones de orden de magnitud para gasto, digital, eventos o agua embotellada. Se declaran como screening y elevan la incertidumbre.

### 4.3 Agua

32 de 38 factores de agua son de screening, principalmente agua virtual de alimentos y productos. Los 6 verificados corresponden a factores directos y de proceso con fuente contrastada. El detalle exacto está en `src/data/waterFactors.json` y en el catálogo exportable.

---

## 5. Benchmarks y escasez

### Benchmarks

Archivo: `src/data/benchmarks.json`.

- Carbono per cápita: 1,6 t (PE) a 14,5 t (US); global 4,7 t.
- Agua per cápita: 1.200 m³ (CO) a 2.842 m³ (US); global 1.385 m³.
- Sectores: 2 t/empleado (servicios) a 25 t/empleado (energía).
- Eventos: 25 kg CO₂e/asistente y 0,3 m³/asistente.

Son valores de **screening** compilados. No son objetivos científicos ni umbrales de sostenibilidad.

### Escasez

Archivo: `src/data/stress.json`. Factor AWARE y categoría WRI por país:

| País | AWARE | WRI |
| --- | ---: | --- |
| PE | 2,2 | High |
| US | 2,1 | Low-Medium |
| GB | 1,4 | Low |
| ES | 3,6 | High |
| MX | 3,0 | High |
| CO | 1,2 | Low |
| CL | 4,4 | Extremely High |
| AR | 2,4 | Medium-High |
| BR | 1,0 | Low |
| DE | 2,1 | Low-Medium |
| FR | 2,0 | Low-Medium |
| EU | 2,4 | Medium-High |
| GLOBAL | 2,2 | Medium-High |

La ponderación por escasez es opcional y no altera el total físico.

---

## 6. Protocolo de actualización

1. **Identificar** el factor y la fuente primaria.
2. **Descargar** la edición exacta del año y guardar la URL.
3. **Extraer** valor, unidad, región, año e incertidumbre.
4. **Convertir** a la unidad canónica del catálogo y documentar la conversión.
5. **Añadir o actualizar** `lastVerified` en formato ISO (`YYYY-MM-DD`).
6. **Asignar estado**:
   - `verified` solo si el valor se contrastó contra la fuente citada.
   - `pending` si la fuente es oficial pero falta confirmar la edición.
   - `screening` si es una estimación de orden de magnitud.
7. **Validar** con `npx vitest run` y `npx tsc --noEmit`.
8. **Exportar** el catálogo y revisar que no haya referencias huérfanas.
9. **Registrar** el cambio en el historial de versión de datos.

### Reglas de integridad

- Un `sourceId` debe existir en `sources.json`.
- Un `waterFactorId` debe existir en `waterFactors.json`.
- Un factor con `byGwp` debe tener al menos AR5 o AR6.
- Los IDs de factor deben ser únicos.
- La app falla al arrancar si se incumple cualquiera de estas reglas.

### Versionado

`DATA_VERSION` vive en `src/lib/export.ts` y se incluye en el JSON de proyecto y en el catálogo. Un cambio de valor, fuente o estado debe incrementar la versión. Los proyectos exportados conservan la versión con la que se generaron.

---

## 7. Cómo revisar un factor en la app

1. Abre **Transparencia**.
2. Filtra por tipo (carbono/agua) y estado (verificado/pendiente/screening).
3. Busca por ID, etiqueta, fuente o país.
4. Revisa valor, unidad, región, año, incertidumbre, fuente y fecha.
5. Descarga el **catálogo JSON** para una revisión externa.

La tabla muestra el valor del factor tal como se usa. Para factores con GWP dual, muestra AR5 y AR6.

---

## 8. Capa personalizada y gestor de factores

Además del catálogo base, la app incluye un gestor en **Factores** (`#/factors`) con:

- catálogo filtrable por tipo, categoría, alcance, país, año, estado, capa y fuente;
- overrides de la capa base sin modificar el JSON original;
- factores nuevos con fuente, año, licencia, motivo y `Σ(gas × GWP)`;
- versiones, reversión, papelera, duplicado, comparación y auditoría inmutable;
- roles Lector/Editor/Administrador y flujo opcional de aprobación;
- importación CSV/JSON con vista previa y exportación CSV/Excel/JSON;
- snapshot del factor en cada cálculo para que los informes antiguos no cambien;
- análisis de cobertura y huecos por país, año, gas y tipo de agua.

Documentación detallada:

- [`docs/FACTOR_MANAGER.md`](FACTOR_MANAGER.md)
- [`docs/FACTOR_GAPS.md`](FACTOR_GAPS.md)

Regla de integridad adicional: los identificadores deben ser únicos **entre** carbono y agua. Un `waterFactorId` no puede colisionar con el `id` de un factor de carbono.
