# Cobertura y huecos de factores

> Inventario vivo del 2026-10-31 · paquete base **2026.10** · datos curados en `src/data/factorGaps.json`.

La pestaña **Factores → Cobertura y huecos** cruza la capa base y la personalizada para responder cuatro preguntas: qué categoría falta, en qué país, para qué año/gas y con qué tipo de agua. Los huecos curados proponen una fuente oficial o abierta; **nunca** se aplican automáticamente.

---

## 1. Método

1. Se recorren todos los registros resueltos (base + personalizados activos).
2. Se cuenta cobertura por país y tipo (carbono/agua).
3. Se detectan señales de calidad:
   - factores sin desglose de gas;
   - agua con verde o gris en cero;
   - datos con más de 5 años;
   - países sin factor hídrico;
   - pendientes y screening.
4. Cada hueco curado se marca como **cubierto** si existe un registro compatible por tipo, categoría, país (o `GLOBAL`), año (±1) y componente de agua.
5. Los huecos abiertos se ordenan por prioridad alta, media y baja.

Un hueco cubierto no desaparece: queda visible y atenuado para conservar la memoria de la decisión.

---

## 2. Criterio de fuentes

Solo se proponen fuentes que cumplan al menos una condición:

- **Oficial**: agencia pública, norma o base intergubernamental.
- **Abierta**: licencia que permite uso comercial con atribución.
- **Agregador**: se acepta únicamente si su licencia comercial es explícita; si no, queda como candidato a revisar.

Toda propuesta entra como factor `pending` o `screening` hasta que una persona verifique valor, unidad, año, región y licencia.

---

## 3. Fuentes de descubrimiento

| Fuente | Uso previsto | Licencia / condición |
| --- | --- | --- |
| UK DESNZ / DEFRA | Conversión de energía, combustibles, transporte, refrigerantes y residuos. | Open Government Licence v3.0 |
| US EPA | GHG Emission Factors Hub y USEEIO para gasto. | Dominio público |
| IPCC EFDB / AR6 | Gases, GWP y factores de proceso. | Uso con atribución |
| EXIOBASE | Tablas input-output extendidas para Scope 3 de gasto. | Revisar licencia por versión |
| Open CEDA | Agregador de datos climáticos y ambientales. | Revisar licencia |
| Agribalyse (ADEME) | Alimentos y agricultura. | Licencia abierta, revisar versión |
| Water Footprint Network | Huella hídrica por producto. | Uso con atribución |
| WULCA / AWARE | Factores de escasez hídrica. | Uso con atribución |
| FAO / FAOSTAT / AQUASTAT | Agricultura, agua verde y balances. | CC BY 4.0 |
| COES / MINEM / MINAM | Red eléctrica, energía y residuos del Perú. | Datos abiertos del Estado peruano |
| ANA | Cuencas, agua azul y estándares de calidad. | Datos abiertos |
| OEFA | Fiscalización y residuos. | Datos abiertos |
| Smart Freight Centre (GLEC) | Logística y transporte de carga. | Uso con atribución |
| GHG Protocol / ISO | Referencia metodológica, no factor numérico. | Uso con atribución / referencia normativa |

---

## 4. Huecos curados

| ID | Prioridad | Tipo | Categoría | País | Año | Fuente principal |
| --- | --- | --- | --- | --- | ---: | --- |
| `gap_pe_electricity_2024` | Alta | Carbono | Energía | PE | 2024 | MINAM / COES |
| `gap_pe_water_ana` | Alta | Agua | Agua | PE | 2024 | ANA / MINAM |
| `gap_combustion_gas_split` | Alta | Carbono | Energía | GLOBAL | 2025 | DEFRA / IPCC / EPA |
| `gap_food_country` | Media | Carbono | Alimentación | PE | 2023 | Agribalyse / FAO |
| `gap_purchased_goods_spend` | Media | Carbono | Bienes | GLOBAL | 2023 | EXIOBASE / Open CEDA / USEEIO |
| `gap_events_water` | Media | Agua | Eventos | GLOBAL | 2024 | ISO 20121 / WFN |
| `gap_waste_pe` | Media | Carbono | Residuos | PE | 2023 | MINAM / IPCC / OEFA |
| `gap_refrigerants_ar6` | Alta | Carbono | Refrigerantes | GLOBAL | 2021 | IPCC AR6 / DEFRA |
| `gap_logistics_region` | Media | Carbono | Logística | PE | 2024 | GLEC / DEFRA |
| `gap_water_components` | Alta | Agua | Agua | GLOBAL | 2012 | WFN / AWARE |
| `gap_fao_agriculture` | Media | Agua | Alimentación | PE | 2023 | FAO AQUASTAT / ANA |
| `gap_custom_governance` | Alta | Carbono | Otros | GLOBAL | 2026 | GHG Protocol / ISO 14064-1 |

El listado exacto, con enlaces, justificación y acción, vive en `src/data/factorGaps.json` y se exporta como JSON desde la interfaz.

---

## 5. Lectura del inventario base

- **81 factores de carbono** y **38 de agua**; 119 registros únicos.
- **50 % verificados** al cierre de esta versión.
- **14 factores de carbono pendientes** de contraste anual.
- **32 factores de agua screening** y **13 con agua verde = 0**.
- **Todos los factores hídricos son `GLOBAL`**: no hay intensidad por cuenca ni país.
- Los países con factor eléctrico propio son PE, US, GB, ES, MX, CO, CL, AR, BR, DE, FR y EU.

Estas señales no se ocultan: aparecen como KPI en la pantalla, como advertencia en resultados y como sección de límites en el informe.

---

## 6. Convertir un hueco en factor

1. Abre **Cobertura y huecos**.
2. Pulsa **Crear factor desde este hueco**.
3. El formulario llega precargado con tipo, categoría, país, año, unidad y la primera fuente propuesta.
4. Completa valor, gases o componentes de agua, licencia y motivo.
5. Guarda. El hueco pasa a **Cubierto** y el factor queda disponible para el cálculo.

La creación no aplica la fuente automáticamente: la persona debe revisar la edición exacta, el valor y la licencia.

---

## 7. Mantenimiento

- Revisar los huecos de prioridad alta en cada actualización del paquete base.
- No cerrar un hueco con un agregador sin licencia comercial verificada.
- Al añadir un factor, comprobar que el `id` sea único entre carbono y agua.
- Ejecutar `npx vitest run` (incluye unicidad de IDs) y `npx tsc --noEmit`.
- Exportar la cobertura y adjuntarla al registro de cambios.
