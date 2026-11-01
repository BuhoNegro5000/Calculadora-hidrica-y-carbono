import type { ActionDef } from '../engine/types';

export const actions: ActionDef[] = [
  // Personas
  {
    id: 'p_flights_one_less',
    entity: ['person'],
    title: { es: 'Un vuelo largo menos al año', en: 'One fewer long-haul flight per year' },
    description: { es: 'Sustituye un viaje de largo radio por videoconferencia o por un destino más cercano. Es la acción de mayor impacto en la mayoría de huellas personales.', en: 'Replace one long-haul trip with video conferencing or a closer destination. It is the highest-impact action in most personal footprints.' },
    impactPct: 22, cost: 1, effort: 2, timeframe: { es: 'Este año', en: 'This year' }, sdg: 'SDG 13',
  },
  {
    id: 'p_diet_shift',
    entity: ['person'],
    title: { es: 'Dieta con menos carne roja', en: 'Diet with less red meat' },
    description: { es: 'Pasar de una dieta alta en carne a una baja en carne reduce la huella alimentaria y el agua verde asociada al pastoreo y al pienso.', en: 'Moving from a high-meat to a low-meat diet reduces the food footprint and the green water linked to grazing and feed.' },
    impactPct: 15, cost: 1, effort: 2, timeframe: { es: '3-6 meses', en: '3-6 months' }, sdg: 'SDG 12',
  },
  {
    id: 'p_renewable_tariff',
    entity: ['person'],
    title: { es: 'Electricidad con garantía renovable', en: 'Renewable-backed electricity' },
    description: { es: 'Contrata una tarifa con certificados verificables y declara el Scope 2 market-based por separado del location-based. No basta con “verde” en la factura: exige trazabilidad.', en: 'Choose a tariff with verifiable certificates and disclose market-based Scope 2 separately from location-based. A “green” label is not enough: require traceability.' },
    impactPct: 18, cost: 2, effort: 1, timeframe: { es: 'Próxima factura', en: 'Next bill' }, sdg: 'SDG 7',
  },
  {
    id: 'p_home_efficiency',
    entity: ['person'],
    title: { es: 'Aislar y bajar la demanda del hogar', en: 'Insulate and cut household demand' },
    description: { es: 'Aislamiento, ventanas, bombillas LED y termostato 1-2 °C más bajo. Mide kWh antes y después; la reducción real varía por clima.', en: 'Insulation, windows, LED lighting and a thermostat 1-2 °C lower. Measure kWh before and after; actual savings vary by climate.' },
    impactPct: 9, cost: 3, effort: 3, timeframe: { es: '6-18 meses', en: '6-18 months' }, sdg: 'SDG 11',
  },
  {
    id: 'p_car_shift',
    entity: ['person'],
    title: { es: 'Cambiar trayectos cortos a bici o bus', en: 'Shift short trips to bike or bus' },
    description: { es: 'Los trayectos menores a 5 km son los más fáciles de electrificar con piernas. Combínalo con teletrabajo cuando sea posible.', en: 'Trips under 5 km are the easiest to electrify with legs. Combine with remote work where possible.' },
    impactPct: 8, cost: 1, effort: 2, timeframe: { es: 'Este mes', en: 'This month' }, sdg: 'SDG 11',
  },
  {
    id: 'p_repair',
    entity: ['person'],
    title: { es: 'Reparar, reutilizar y comprar segunda mano', en: 'Repair, reuse and buy second-hand' },
    description: { es: 'Prolongar la vida de ropa y electrónica evita la parte de fabricación, que suele ser la mayor parte de su huella.', en: 'Extending the life of clothing and electronics avoids manufacturing emissions, usually the largest share of their footprint.' },
    impactPct: 5, cost: 1, effort: 1, timeframe: { es: 'Continuo', en: 'Ongoing' }, sdg: 'SDG 12',
  },
  {
    id: 'p_waste_sort',
    entity: ['person'],
    title: { es: 'Separar residuos y compostar', en: 'Separate waste and compost' },
    description: { es: 'Reduce el metano de vertedero y el agua gris. No compensa el consumo, pero es una base necesaria.', en: 'Cuts landfill methane and grey water. It does not offset consumption, but it is a necessary baseline.' },
    impactPct: 3, cost: 1, effort: 1, timeframe: { es: 'Este mes', en: 'This month' }, sdg: 'SDG 12',
  },

  // Empresas
  {
    id: 'c_renewable_ppa',
    entity: ['company'],
    title: { es: 'PPA o contrato renovable con trazabilidad', en: 'Traceable renewable PPA or contract' },
    description: { es: 'Reduce Scope 2 market-based. Reporta también location-based y evita sumar ambos. Documenta el instrumento contractual y su vigencia.', en: 'Reduces market-based Scope 2. Also report location-based and never add both. Document the contractual instrument and its validity.' },
    impactPct: 24, cost: 2, effort: 2, timeframe: { es: '6-12 meses', en: '6-12 months' }, sdg: 'SDG 7',
  },
  {
    id: 'c_energy_audit',
    entity: ['company'],
    title: { es: 'Auditoría energética y gestión de demanda', en: 'Energy audit and demand management' },
    description: { es: 'Medición por área, corrección de horarios y mantenimiento de HVAC. Prioriza medidas con retorno menor a 3 años.', en: 'Sub-metering by area, scheduling and HVAC maintenance. Prioritise measures with payback under 3 years.' },
    impactPct: 12, cost: 2, effort: 2, timeframe: { es: '6-18 meses', en: '6-18 months' }, sdg: 'SDG 9',
  },
  {
    id: 'c_freight',
    entity: ['company'],
    title: { es: 'Consolidar carga y cambiar a ferrocarril', en: 'Consolidate freight and shift to rail' },
    description: { es: 'Mejorar el fill rate y mover carga terrestre viable a tren reduce emisiones por tonelada·km. Requiere rediseñar rutas y almacenes.', en: 'Improving fill rate and moving viable road freight to rail cuts emissions per tonne·km. Requires route and warehouse redesign.' },
    impactPct: 8, cost: 2, effort: 3, timeframe: { es: '12-24 meses', en: '12-24 months' }, sdg: 'SDG 13',
  },
  {
    id: 'c_business_travel',
    entity: ['company'],
    title: { es: 'Política de viajes esenciales', en: 'Essential-travel policy' },
    description: { es: 'Prioriza videoconferencia, clase turista y rutas directas. Mide los viajes evitados, no solo los compensados.', en: 'Prioritise video conferencing, economy class and direct routes. Measure avoided trips, not just offset ones.' },
    impactPct: 15, cost: 1, effort: 2, timeframe: { es: '3-6 meses', en: '3-6 months' }, sdg: 'SDG 13',
  },
  {
    id: 'c_procurement',
    entity: ['company'],
    title: { es: 'Compras con criterio climático', en: 'Climate-aligned procurement' },
    description: { es: 'Sustituye factores de gasto por datos de proveedor. Incluye criterios de carbono en pliegos y compra servicios con menor intensidad.', en: 'Replace spend factors with supplier data. Add carbon criteria to tenders and buy lower-intensity services.' },
    impactPct: 9, cost: 2, effort: 3, timeframe: { es: '12-24 meses', en: '12-24 months' }, sdg: 'SDG 12',
  },
  {
    id: 'c_commute',
    entity: ['company'],
    title: { es: 'Plan de movilidad sostenible', en: 'Sustainable commuting plan' },
    description: { es: 'Bus, bici, teletrabajo y horarios escalonados. Mide el reparto modal antes y después.', en: 'Bus, bike, remote work and staggered hours. Measure modal share before and after.' },
    impactPct: 7, cost: 2, effort: 2, timeframe: { es: '6-12 meses', en: '6-12 months' }, sdg: 'SDG 11',
  },
  {
    id: 'c_waste',
    entity: ['company'],
    title: { es: 'Circularidad de residuos y agua', en: 'Waste and water circularity' },
    description: { es: 'Separa residuos, mide efluentes y reduce pérdidas de agua. El agua gris se gestiona con carga contaminante, no solo con volumen.', en: 'Separate waste, meter effluent and reduce water losses. Grey water is managed by pollutant load, not volume alone.' },
    impactPct: 4, cost: 2, effort: 2, timeframe: { es: '6-18 meses', en: '6-18 months' }, sdg: 'SDG 6',
  },

  // Eventos
  {
    id: 'e_venue_renewable',
    entity: ['event'],
    title: { es: 'Sede con energía renovable verificada', en: 'Venue with verified renewable energy' },
    description: { es: 'Incluye la energía en el pliego del venue y pide factura o certificado. No aceptes una declaración sin respaldo.', en: 'Include energy in the venue tender and request a bill or certificate. Do not accept an unsupported claim.' },
    impactPct: 12, cost: 2, effort: 2, timeframe: { es: 'Antes del evento', en: 'Before the event' }, sdg: 'SDG 7',
  },
  {
    id: 'e_public_transport',
    entity: ['event'],
    title: { es: 'Transporte público incluido en la entrada', en: 'Public transport included in the ticket' },
    description: { es: 'La mayor parte de la huella de un evento suele ser el viaje de los asistentes. Integra bus/tren, incentiva compartir coche y elige sedes bien conectadas.', en: 'Attendee travel is usually the largest event footprint. Integrate bus/rail, incentivise carpooling and choose well-connected venues.' },
    impactPct: 25, cost: 2, effort: 2, timeframe: { es: 'Diseño del evento', en: 'Event design' }, sdg: 'SDG 11',
  },
  {
    id: 'e_plant_forward',
    entity: ['event'],
    title: { es: 'Menús plant-forward por defecto', en: 'Plant-forward menus by default' },
    description: { es: 'Haz vegetariano el menú por defecto y ofrece la opción con carne. Reduce carbono y agua verde sin discurso moralista.', en: 'Make vegetarian the default and offer meat as an option. Cuts carbon and green water without moralising.' },
    impactPct: 10, cost: 1, effort: 1, timeframe: { es: 'Menú', en: 'Menu' }, sdg: 'SDG 12',
  },
  {
    id: 'e_reuse',
    entity: ['event'],
    title: { es: 'Montaje reutilizable y cero plástico de un uso', en: 'Reusable build and no single-use plastic' },
    description: { es: 'Moqueta, señalética y escenografía modular. Mide kilogramos reutilizados y residuos evitados.', en: 'Modular carpet, signage and staging. Measure kilograms reused and waste avoided.' },
    impactPct: 6, cost: 2, effort: 2, timeframe: { es: 'Producción', en: 'Production' }, sdg: 'SDG 12',
  },
  {
    id: 'e_local_hotel',
    entity: ['event'],
    title: { es: 'Alojamiento cercano y de bajo consumo', en: 'Nearby, low-impact accommodation' },
    description: { es: 'Prioriza hoteles con datos de energía y agua y reduce noches. La ubicación también reduce viajes locales.', en: 'Prioritise hotels with energy and water data and cut nights. Location also reduces local trips.' },
    impactPct: 7, cost: 2, effort: 2, timeframe: { es: 'Reservas', en: 'Bookings' }, sdg: 'SDG 11',
  },

  // Productos
  {
    id: 'pr_material',
    entity: ['product'],
    title: { es: 'Material reciclado o de menor huella', en: 'Recycled or lower-footprint material' },
    description: { es: 'Sustituye plástico virgen o aluminio primario por contenido reciclado verificado. Exige trazabilidad de la cadena.', en: 'Replace virgin plastic or primary aluminium with verified recycled content. Require chain-of-custody.' },
    impactPct: 22, cost: 2, effort: 3, timeframe: { es: 'Próximo ciclo', en: 'Next cycle' }, sdg: 'SDG 12',
  },
  {
    id: 'pr_ecodesign',
    entity: ['product'],
    title: { es: 'Ecodiseño para reparar y desmontar', en: 'Design for repair and disassembly' },
    description: { es: 'Menos material, uniones reversibles y repuestos disponibles. La vida útil extendida reduce la huella por uso.', en: 'Less material, reversible joints and available spare parts. Extended life cuts footprint per use.' },
    impactPct: 15, cost: 2, effort: 3, timeframe: { es: '12-24 meses', en: '12-24 months' }, sdg: 'SDG 12',
  },
  {
    id: 'pr_use_efficiency',
    entity: ['product'],
    title: { es: 'Eficiencia en la fase de uso', en: 'Use-phase efficiency' },
    description: { es: 'Si el uso domina la huella, la mayor palanca está en el consumo energético y en el comportamiento del usuario.', en: 'If use dominates the footprint, the biggest lever is energy consumption and user behaviour.' },
    impactPct: 18, cost: 2, effort: 2, timeframe: { es: 'Próxima versión', en: 'Next version' }, sdg: 'SDG 7',
  },
  {
    id: 'pr_logistics',
    entity: ['product'],
    title: { es: 'Distribución consolidada y local', en: 'Consolidated, local distribution' },
    description: { es: 'Menos transporte aéreo, cargas completas y centros de distribución cercanos al mercado.', en: 'Less air freight, full loads and distribution centres close to the market.' },
    impactPct: 7, cost: 2, effort: 2, timeframe: { es: '6-12 meses', en: '6-12 months' }, sdg: 'SDG 13',
  },
  {
    id: 'pr_eol',
    entity: ['product'],
    title: { es: 'Fin de vida y recuperación de materiales', en: 'End-of-life and material recovery' },
    description: { es: 'Diseña para reciclaje real (no teórico), financia la recogida y mide la tasa de recuperación.', en: 'Design for real (not theoretical) recycling, fund collection and measure the recovery rate.' },
    impactPct: 6, cost: 2, effort: 2, timeframe: { es: '12 meses', en: '12 months' }, sdg: 'SDG 12',
  },
];

export function actionsFor(entity: string): ActionDef[] {
  return actions.filter((action) => action.entity.includes(entity as never));
}
