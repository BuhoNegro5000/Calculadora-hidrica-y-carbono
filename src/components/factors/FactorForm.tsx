import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from '../Icons';
import { Segmented } from '../ui';
import { useFactors } from '../../store/factors';
import {
  COUNTRY_OPTIONS, GAS_OPTIONS, UNIT_OPTIONS, co2eFromGases,
  customFactorId, emptyFactorRecord, factorDiff, gwpForFactorSet, isNegativeAllowed,
  qualityLabel, roleLabel, statusForQuality,
  type FactorKind, type FactorRecord, type FactorQuality, type GasAmount,
} from '../../engine/factorTypes';
import { cloneFactor } from '../../engine/factorTypes';
import { hasErrors, issueText, validateFactor } from '../../engine/factorOps';
import { categoryLabel, CATEGORY_LABELS, KindBadge, factorValueLabel } from './shared';

type Step = 0 | 1 | 2;

interface FactorFormProps {
  initial?: FactorRecord;
  base?: FactorRecord;
  mode: 'create' | 'edit' | 'duplicate';
  prefill?: Partial<FactorRecord>;
  onClose: () => void;
  onSaved: (record: FactorRecord) => void;
}

function defaultsFor(prefill?: Partial<FactorRecord>): FactorRecord {
  const base = emptyFactorRecord(prefill);
  return {
    ...base,
    id: prefill?.id ?? customFactorId(prefill?.kind ?? 'carbon'),
    changeReason: base.changeReason || 'Alta de factor personalizado',
    gases: base.gases.length ? base.gases : [{ gas: 'CO2', amount: 0, gwp: 1 }],
  };
}

export function FactorForm({ initial, base, mode, prefill, onClose, onSaved }: FactorFormProps) {
  const { lang } = useI18n();
  const { saveFactor, catalog, threshold, role, custom } = useFactors();
  const [step, setStep] = useState<Step>(0);
  const [confirmLarge, setConfirmLarge] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [draft, setDraft] = useState<FactorRecord>(() => {
    if (mode === 'duplicate' && initial) return { ...cloneFactor(initial, customFactorId(initial.kind)), ...prefill };
    if (mode === 'edit' && initial) {
      const next = { ...initial, ...prefill };
      // Un override nace con un motivo nuevo: no hereda el motivo de la capa base.
      if (initial.layer === 'base') next.changeReason = prefill?.changeReason ?? '';
      return next;
    }
    return defaultsFor(prefill);
  });

  const isEdit = mode === 'edit' && Boolean(initial);
  const existingCustom = isEdit && initial?.layer === 'custom' ? initial : undefined;
  const baseRecord = base ?? (initial?.baseId ? catalog.baseRecords.get(initial.baseId) : isEdit && initial?.layer === 'base' ? initial : undefined);
  const all = useMemo(() => [...catalog.baseRecords.values(), ...custom], [catalog.baseRecords, custom]);
  const issues = useMemo(() => validateFactor(draft, {
    base: baseRecord,
    existing: existingCustom,
    all,
    threshold,
    confirmLargeChange: confirmLarge,
    allowDuplicate: mode === 'duplicate',
  }), [draft, baseRecord, existingCustom, all, threshold, confirmLarge, mode]);

  const largeChange = issues.find((item) => item.code === 'large-change');
  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');
  const diff = baseRecord ? factorDiff(baseRecord, draft.value, draft.unit) : null;

  useEffect(() => {
    if (draft.gasDetail !== 'breakdown' || draft.kind !== 'carbon') return;
    if (!draft.gases.length) return;
    const computed = co2eFromGases(draft.gases, draft.gwpSet);
    if (Math.abs(computed - draft.value) > 0.0000001) {
      setDraft((current) => ({ ...current, value: Number(computed.toFixed(6)) }));
    }
    // Solo recalcula cuando cambia el desglose o el set de GWP.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.gases, draft.gwpSet, draft.gasDetail, draft.kind]);

  useEffect(() => {
    if (draft.kind !== 'water' || !draft.water) return;
    const total = draft.water.blue + draft.water.green + draft.water.grey;
    if (Math.abs(total - draft.value) > 0.0000001) {
      setDraft((current) => ({ ...current, value: Number(total.toFixed(6)) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.water, draft.kind]);

  const patch = (value: Partial<FactorRecord>) => setDraft((current) => ({ ...current, ...value }));
  const patchLabel = (key: 'label' | 'description' | 'notes', field: 'es' | 'en', value: string) => {
    setDraft((current) => ({
      ...current,
      [key]: { ...(current[key] ?? { es: '', en: '' }), [field]: value },
    }));
  };
  const setGas = (index: number, value: Partial<GasAmount>) => {
    setDraft((current) => ({
      ...current,
      gases: current.gases.map((gas, position) => (position === index ? { ...gas, ...value } : gas)),
    }));
  };
  const addGas = () => setDraft((current) => ({
    ...current,
    gases: [...current.gases, { gas: 'CH4', amount: 0 }],
  }));

  const save = () => {
    const result = saveFactor(draft, { base: baseRecord, confirmLargeChange: confirmLarge });
    if (!result.ok) return;
    onSaved(result.record ?? draft);
  };

  const canSave = !hasErrors(issues) && (!largeChange || confirmLarge) && role !== 'reader';
  const stepTitles = lang === 'es'
    ? ['Definición', 'Valor y gases', 'Fuente y control']
    : ['Definition', 'Value and gases', 'Source and control'];

  const fieldErrors = (field: string) => issues.filter((item) => item.field === field && item.severity === 'error');
  const fieldWarnings = (field: string) => issues.filter((item) => item.field === field && item.severity === 'warning');
  const FieldMessages = ({ field }: { field: string }) => (
    <>
      {fieldErrors(field).map((item, index) => <span className="factor-field-error" key={`e-${index}`}>{issueText(item, lang)}</span>)}
      {fieldWarnings(field).map((item, index) => <span className="factor-field-warn" key={`w-${index}`}>{issueText(item, lang)}</span>)}
    </>
  );

  return (
    <div className="factor-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="factor-modal" role="dialog" aria-modal="true" aria-labelledby="factor-form-title">
        <header className="factor-modal-head">
          <div>
            <p className="eyebrow no-rule">{mode === 'create' ? (lang === 'es' ? 'Nuevo factor' : 'New factor') : mode === 'duplicate' ? (lang === 'es' ? 'Duplicar factor' : 'Duplicate factor') : (lang === 'es' ? 'Editar factor' : 'Edit factor')}</p>
            <h2 id="factor-form-title">{draft.label[lang] || (lang === 'es' ? 'Factor sin nombre' : 'Unnamed factor')}</h2>
            <p className="small muted">
              {baseRecord
                ? (lang === 'es' ? `Capa personalizada · se crea un override de ${baseRecord.id}; el original no se modifica.` : `Custom layer · creates an override of ${baseRecord.id}; the original is untouched.`)
                : (lang === 'es' ? 'Capa personalizada · disponible de inmediato para cálculos.' : 'Custom layer · immediately available for calculations.')}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={lang === 'es' ? 'Cerrar' : 'Close'}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="factor-steps" aria-label={lang === 'es' ? 'Pasos del formulario' : 'Form steps'}>
          {stepTitles.map((title, index) => (
            <button
              key={title}
              type="button"
              className={step === index ? 'active' : step > index ? 'done' : ''}
              onClick={() => setStep(index as Step)}
            >
              <span>{step > index ? <Icon name="check" size={12} /> : index + 1}</span>
              {title}
            </button>
          ))}
        </div>

        <div className="factor-modal-body">
          {step === 0 && (
            <div className="factor-form-grid">
              <div className="factor-form-col">
                <div className="factor-form-section">
                  <h3>{lang === 'es' ? 'Tipo y actividad' : 'Type and activity'}</h3>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Tipo de factor' : 'Factor type'}</span>
                    <Segmented
                      value={draft.kind}
                      options={[
                        { value: 'carbon', label: lang === 'es' ? 'Carbono' : 'Carbon' },
                        { value: 'water', label: lang === 'es' ? 'Agua' : 'Water' },
                      ]}
                      onChange={(kind: FactorKind) => {
                        if (baseRecord) return;
                        setDraft((current) => ({
                          ...current,
                          kind,
                          gases: kind === 'carbon' ? current.gases : [],
                          gasDetail: kind === 'carbon' ? current.gasDetail : 'aggregate',
                          water: kind === 'water' ? (current.water ?? { blue: 0, green: 0, grey: 0 }) : undefined,
                          waterType: kind === 'water' ? 'mixed' : undefined,
                          unit: kind === 'water' && current.unit === 'kWh' ? 'm3' : current.unit,
                        }));
                      }}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Categoría' : 'Category'}</span>
                    <select className="select" value={draft.category} onChange={(event) => patch({ category: event.target.value })}>
                      {Object.entries(CATEGORY_LABELS).map(([id, labels]) => <option key={id} value={id}>{labels[lang]}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Alcance' : 'Scope'}</span>
                    <select className="select" value={draft.scope} onChange={(event) => patch({ scope: Number(event.target.value) as FactorRecord['scope'] })}>
                      <option value={1}>Scope 1</option>
                      <option value={2}>Scope 2</option>
                      <option value={3}>Scope 3</option>
                    </select>
                  </label>
                  {draft.scope === 3 && (
                    <label className="field">
                      <span className="field-label">{lang === 'es' ? 'Categoría Scope 3 (1-15)' : 'Scope 3 category (1-15)'}</span>
                      <input className="input" type="number" min={1} max={15} value={draft.scope3Category ?? ''} onChange={(event) => patch({ scope3Category: event.target.value ? Number(event.target.value) : undefined })} />
                    </label>
                  )}
                </div>
              </div>

              <div className="factor-form-col">
                <div className="factor-form-section">
                  <h3>{lang === 'es' ? 'Nombre y descripción' : 'Name and description'}</h3>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Nombre · español' : 'Name · Spanish'}</span>
                    <input className="input" value={draft.label.es} onChange={(event) => patchLabel('label', 'es', event.target.value)} placeholder={lang === 'es' ? 'Ej.: Electricidad de red · SEIN 2024' : ''} />
                    <FieldMessages field="label" />
                  </label>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Nombre · inglés' : 'Name · English'}</span>
                    <input className="input" value={draft.label.en} onChange={(event) => patchLabel('label', 'en', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Descripción · español' : 'Description · Spanish'}</span>
                    <textarea className="input" rows={2} value={draft.description.es} onChange={(event) => patchLabel('description', 'es', event.target.value)} />
                    <FieldMessages field="description" />
                  </label>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Descripción · inglés' : 'Description · English'}</span>
                    <textarea className="input" rows={2} value={draft.description.en} onChange={(event) => patchLabel('description', 'en', event.target.value)} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="factor-form-grid">
              <div className="factor-form-col">
                <div className="factor-form-section">
                  <div className="factor-section-head">
                    <h3>{draft.kind === 'carbon' ? (lang === 'es' ? 'Valor y gases' : 'Value and gases') : (lang === 'es' ? 'Componentes de agua' : 'Water components')}</h3>
                    <KindBadge kind={draft.kind} lang={lang} />
                  </div>

                  {draft.kind === 'carbon' ? (
                    <>
                      <label className="field">
                        <span className="field-label">{lang === 'es' ? 'Forma del dato' : 'Data form'}</span>
                        <Segmented
                          value={draft.gasDetail}
                          options={[
                            { value: 'breakdown', label: lang === 'es' ? 'Desglose por gas' : 'Gas breakdown' },
                            { value: 'aggregate', label: lang === 'es' ? 'CO₂e agregado' : 'Aggregate CO₂e' },
                          ]}
                          onChange={(gasDetail) => {
                            if (gasDetail === 'breakdown' && draft.gases.length === 0) {
                              patch({ gasDetail, gases: [{ gas: 'CO2', amount: draft.value, gwp: 1 }] });
                            } else {
                              patch({ gasDetail });
                            }
                          }}
                        />
                      </label>

                      {draft.gasDetail === 'breakdown' ? (
                        <div className="gas-table">
                          <div className="gas-row gas-head">
                            <span>{lang === 'es' ? 'Gas' : 'Gas'}</span>
                            <span>{lang === 'es' ? 'kg gas / unidad' : 'kg gas / unit'}</span>
                            <span>GWP</span>
                            <span />
                          </div>
                          {draft.gases.map((gas, index) => (
                            <div className="gas-row" key={`${gas.gas}-${index}`}>
                              <select className="select" value={gas.gas} onChange={(event) => setGas(index, { gas: event.target.value, gwp: gwpForFactorSet(event.target.value, draft.gwpSet) })}>
                                {GAS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                              <input className="input" type="number" step="any" min={isNegativeAllowed(draft.category) ? undefined : 0} value={gas.amount} onChange={(event) => setGas(index, { amount: Number(event.target.value) })} />
                              <input className="input" type="number" step="any" value={gas.gwp ?? gwpForFactorSet(gas.gas, draft.gwpSet) ?? ''} onChange={(event) => setGas(index, { gwp: event.target.value === '' ? undefined : Number(event.target.value) })} />
                              <button type="button" className="icon-btn" aria-label={lang === 'es' ? 'Quitar gas' : 'Remove gas'} onClick={() => patch({ gases: draft.gases.filter((_, position) => position !== index) })} disabled={draft.gases.length <= 1}>
                                <Icon name="trash" size={14} />
                              </button>
                            </div>
                          ))}
                          <div className="gas-actions">
                            <button type="button" className="btn btn-outline btn-sm" onClick={addGas}><Icon name="plus" size={13} /> {lang === 'es' ? 'Añadir gas' : 'Add gas'}</button>
                            <span className="tiny muted">Σ = <strong>{co2eFromGases(draft.gases, draft.gwpSet).toFixed(6)}</strong> kg CO₂e</span>
                          </div>
                          <FieldMessages field="gases" />
                        </div>
                      ) : (
                        <p className="factor-hint">
                          {lang === 'es'
                            ? 'Declaras CO₂e agregado sin desglose por gas. El factor se marcará como menor trazabilidad y aparecerá como hueco de gas.'
                            : 'You declare aggregate CO₂e without a gas breakdown. The factor will be flagged as lower traceability and appear in the gas gap.'}
                        </p>
                      )}

                      <div className="factor-inline-grid">
                        <label className="field">
                          <span className="field-label">{lang === 'es' ? 'Valor CO₂e' : 'CO₂e value'}</span>
                          <div className="input-group">
                            <input className="input" type="number" step="any" min={isNegativeAllowed(draft.category) ? undefined : 0} value={draft.value} onChange={(event) => patch({ value: Number(event.target.value) })} />
                            <span className="unit">kg CO₂e</span>
                          </div>
                          <FieldMessages field="value" />
                        </label>
                        <label className="field">
                          <span className="field-label">GWP</span>
                          <select className="select" value={draft.gwpSet} onChange={(event) => patch({ gwpSet: event.target.value as FactorRecord['gwpSet'] })}>
                            <option value="AR5">AR5 (2014)</option>
                            <option value="AR6">AR6 (2021)</option>
                          </select>
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="water-inputs">
                        {(['blue', 'green', 'grey'] as const).map((component) => (
                          <label className="field" key={component}>
                            <span className="field-label">{component === 'blue' ? (lang === 'es' ? 'Agua azul' : 'Blue water') : component === 'green' ? (lang === 'es' ? 'Agua verde' : 'Green water') : (lang === 'es' ? 'Agua gris' : 'Grey water')}</span>
                            <div className="input-group">
                              <input
                                className="input"
                                type="number"
                                step="any"
                                min={0}
                                value={draft.water?.[component] ?? 0}
                                onChange={(event) => patch({ water: { ...(draft.water ?? { blue: 0, green: 0, grey: 0 }), [component]: Number(event.target.value) } })}
                              />
                              <span className="unit">m³</span>
                            </div>
                          </label>
                        ))}
                      </div>
                      <div className="factor-inline-grid">
                        <label className="field">
                          <span className="field-label">{lang === 'es' ? 'Total' : 'Total'}</span>
                          <div className="input-group">
                            <input className="input" value={draft.value} readOnly />
                            <span className="unit">m³</span>
                          </div>
                        </label>
                        <label className="field">
                          <span className="field-label">{lang === 'es' ? 'Tipo de agua' : 'Water type'}</span>
                          <select className="select" value={draft.waterType ?? 'mixed'} onChange={(event) => patch({ waterType: event.target.value as FactorRecord['waterType'] })}>
                            <option value="blue">{lang === 'es' ? 'Azul' : 'Blue'}</option>
                            <option value="green">{lang === 'es' ? 'Verde' : 'Green'}</option>
                            <option value="grey">{lang === 'es' ? 'Gris' : 'Grey'}</option>
                            <option value="mixed">{lang === 'es' ? 'Mixta' : 'Mixed'}</option>
                          </select>
                        </label>
                      </div>
                      <FieldMessages field="water" />
                      <FieldMessages field="value" />
                    </>
                  )}
                </div>
              </div>

              <div className="factor-form-col">
                <div className="factor-form-section">
                  <h3>{lang === 'es' ? 'Unidad, región y año' : 'Unit, region and year'}</h3>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Unidad de actividad' : 'Activity unit'}</span>
                    <select className="select" value={draft.unit} onChange={(event) => patch({ unit: event.target.value as FactorRecord['unit'] })}>
                      {UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                    {baseRecord && baseRecord.unit !== draft.unit && (
                      <span className="factor-hint">{lang === 'es' ? `El factor base está en ${baseRecord.unit}; se convierte para comparar.` : `Base factor is in ${baseRecord.unit}; converted for comparison.`}</span>
                    )}
                    <FieldMessages field="unit" />
                  </label>
                  <div className="factor-inline-grid">
                    <label className="field">
                      <span className="field-label">{lang === 'es' ? 'País / región' : 'Country / region'}</span>
                      <select className="select" value={draft.country} onChange={(event) => patch({ country: event.target.value as FactorRecord['country'] })}>
                        {COUNTRY_OPTIONS.map((country) => <option key={country} value={country}>{country}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">{lang === 'es' ? 'Subregión (opcional)' : 'Subregion (optional)'}</span>
                      <input className="input" value={draft.region ?? ''} onChange={(event) => patch({ region: event.target.value })} placeholder={lang === 'es' ? 'Lima, SEIN, cuenca…' : 'Lima, grid, basin…'} />
                    </label>
                  </div>
                  <div className="factor-inline-grid">
                    <label className="field">
                      <span className="field-label">{lang === 'es' ? 'Año del dato' : 'Data year'}</span>
                      <input className="input" type="number" min={1990} max={new Date().getFullYear() + 1} value={draft.dataYear} onChange={(event) => patch({ dataYear: Number(event.target.value) })} />
                      <FieldMessages field="dataYear" />
                    </label>
                    <label className="field">
                      <span className="field-label">{lang === 'es' ? 'Incertidumbre' : 'Uncertainty'} (%)</span>
                      <input className="input" type="number" min={0} max={100} step="0.1" value={Math.round(draft.uncertainty * 1000) / 10} onChange={(event) => patch({ uncertainty: Math.min(1, Math.max(0, Number(event.target.value) / 100)) })} />
                      <FieldMessages field="uncertainty" />
                    </label>
                  </div>
                  {draft.kind === 'carbon' && (
                    <label className="field">
                      <span className="field-label">{lang === 'es' ? 'Factor de agua vinculado (opcional)' : 'Linked water factor (optional)'}</span>
                      <select className="select" value={draft.waterFactorId ?? ''} onChange={(event) => patch({ waterFactorId: event.target.value || undefined })}>
                        <option value="">{lang === 'es' ? 'Sin vínculo' : 'No link'}</option>
                        {[...catalog.water.values()].map((factor) => <option key={factor.id} value={factor.id}>{factor.label[lang]} · {factor.unit}</option>)}
                      </select>
                      <FieldMessages field="waterFactorId" />
                    </label>
                  )}
                  <label className="check">
                    <input type="checkbox" checked={Boolean(draft.direct)} onChange={(event) => patch({ direct: event.target.checked })} />
                    <span>{lang === 'es' ? 'Agua directa / emisión directa (Scope 1)' : 'Direct water / direct emission (Scope 1)'}</span>
                  </label>
                </div>

                {baseRecord && diff && (
                  <div className={`factor-diff-box ${Math.abs(diff.pct) > threshold ? 'warn' : ''}`}>
                    <div>
                      <small>{lang === 'es' ? 'Factor base' : 'Base factor'}</small>
                      <strong>{factorValueLabel(baseRecord, lang)}</strong>
                    </div>
                    <div>
                      <small>{lang === 'es' ? 'Tu valor' : 'Your value'}</small>
                      <strong>{factorValueLabel(draft, lang)}</strong>
                    </div>
                    <span className={`factor-diff ${diff.pct > 0 ? 'up' : 'down'}`}>{diff.pct > 0 ? '+' : ''}{diff.pct.toFixed(1)} %</span>
                    {Math.abs(diff.pct) > threshold && (
                      <label className="check mt-3">
                        <input type="checkbox" checked={confirmLarge} onChange={(event) => setConfirmLarge(event.target.checked)} />
                        <span>{lang === 'es' ? `Confirmo un cambio superior a ±${threshold} %.` : `I confirm a change beyond ±${threshold}%.`}</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="factor-form-grid">
              <div className="factor-form-col">
                <div className="factor-form-section">
                  <h3>{lang === 'es' ? 'Fuente y licencia' : 'Source and licence'}</h3>
                  <div className="factor-section-head">
                    <p className="tiny muted">{lang === 'es' ? 'Obligatorio: fuente, año y motivo. Si es dato primario propio, la URL puede quedar vacía.' : 'Required: source, year and reason. For own primary data the URL may be empty.'}</p>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowSuggestions((current) => !current)}>
                      <Icon name="wand" size={13} /> {lang === 'es' ? 'Sugerir fuente' : 'Suggest source'}
                    </button>
                  </div>
                  {showSuggestions && (
                    <div className="factor-suggestions">
                      <p className="tiny muted">{lang === 'es' ? 'Referencias comparables de la capa base. No se aplican automáticamente.' : 'Comparable base-layer references. Nothing is applied automatically.'}</p>
                      {[...catalog.records.values()]
                        .filter((record) => record.id !== draft.id && record.kind === draft.kind && record.category === draft.category)
                        .sort((a, b) => (a.unit === draft.unit ? -1 : 0) - (b.unit === draft.unit ? -1 : 0) || b.dataYear - a.dataYear)
                        .slice(0, 4)
                        .map((record) => (
                          <button
                            key={record.id}
                            type="button"
                            className="factor-suggestion"
                            onClick={() => {
                              patch({
                                sourceOrg: record.sourceOrg,
                                sourceTitle: record.sourceTitle,
                                sourceUrl: record.sourceUrl,
                                license: record.license,
                                publicationYear: record.publicationYear,
                                sourceId: record.sourceId,
                              });
                              setShowSuggestions(false);
                            }}
                          >
                            <strong>{record.label[lang]}</strong>
                            <span>{record.sourceOrg} · {record.dataYear} · {record.unit}</span>
                          </button>
                        ))}
                      {[...catalog.records.values()].filter((record) => record.kind === draft.kind && record.category === draft.category).length === 0 && (
                        <p className="tiny muted">{lang === 'es' ? 'No hay referencias comparables en la capa base.' : 'No comparable references in the base layer.'}</p>
                      )}
                    </div>
                  )}
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Organización o autor' : 'Organisation or author'}</span>
                    <input className="input" value={draft.sourceOrg} onChange={(event) => patch({ sourceOrg: event.target.value, sourceId: event.target.value === '' ? 'custom' : draft.sourceId })} placeholder={lang === 'es' ? 'MINAM, proveedor, medición propia…' : 'Ministry, supplier, own measurement…'} />
                    <FieldMessages field="sourceOrg" />
                  </label>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Cita o título' : 'Citation or title'}</span>
                    <input className="input" value={draft.sourceTitle} onChange={(event) => patch({ sourceTitle: event.target.value })} placeholder={lang === 'es' ? 'Resolución, informe, factura, medición…' : 'Resolution, report, invoice, measurement…'} />
                    <FieldMessages field="sourceTitle" />
                  </label>
                  <label className="field">
                    <span className="field-label">URL</span>
                    <input className="input" type="url" value={draft.sourceUrl} onChange={(event) => patch({ sourceUrl: event.target.value })} placeholder="https://…" />
                    <FieldMessages field="sourceUrl" />
                  </label>
                  <div className="factor-inline-grid">
                    <label className="field">
                      <span className="field-label">{lang === 'es' ? 'Licencia / condiciones' : 'Licence / terms'}</span>
                      <input className="input" value={draft.license} onChange={(event) => patch({ license: event.target.value })} placeholder={lang === 'es' ? 'Datos abiertos, CC BY 4.0, dato primario…' : 'Open data, CC BY 4.0, primary data…'} />
                      <FieldMessages field="license" />
                    </label>
                    <label className="field">
                      <span className="field-label">{lang === 'es' ? 'Año de publicación' : 'Publication year'}</span>
                      <input className="input" type="number" min={1990} max={new Date().getFullYear() + 1} value={draft.publicationYear} onChange={(event) => patch({ publicationYear: Number(event.target.value) })} />
                      <FieldMessages field="publicationYear" />
                    </label>
                  </div>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Fecha de descarga' : 'Download date'}</span>
                    <input className="input" type="date" value={draft.downloadedAt} onChange={(event) => patch({ downloadedAt: event.target.value })} />
                    <FieldMessages field="downloadedAt" />
                  </label>
                </div>
              </div>

              <div className="factor-form-col">
                <div className="factor-form-section">
                  <h3>{lang === 'es' ? 'Calidad y control' : 'Quality and control'}</h3>
                  <div className="factor-inline-grid">
                    <label className="field">
                      <span className="field-label">{lang === 'es' ? 'Etiqueta de calidad' : 'Quality label'}</span>
                      <select className="select" value={draft.quality} onChange={(event) => {
                        const quality = event.target.value as FactorQuality;
                        patch({ quality, status: statusForQuality(quality) });
                      }}>
                        <option value="official">{qualityLabel('official', lang)}</option>
                        <option value="literature">{qualityLabel('literature', lang)}</option>
                        <option value="primary">{qualityLabel('primary', lang)}</option>
                        <option value="estimated">{qualityLabel('estimated', lang)}</option>
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">{lang === 'es' ? 'Método' : 'Method'}</span>
                      <select className="select" value={draft.method} onChange={(event) => patch({ method: event.target.value as FactorRecord['method'] })}>
                        <option value="physical">{lang === 'es' ? 'Físico' : 'Physical'}</option>
                        <option value="spend">{lang === 'es' ? 'Gasto' : 'Spend-based'}</option>
                        <option value="proxy">{lang === 'es' ? 'Proxy' : 'Proxy'}</option>
                      </select>
                    </label>
                  </div>
                  <div className="factor-state-row">
                    <span className={`badge ${draft.status === 'verified' ? 'badge-ok' : draft.status === 'pending' ? 'badge-warn' : 'badge-info'}`}>{draft.status}</span>
                    <span className="badge">{draft.quality}</span>
                    <span className="badge badge-accent">{role === 'admin' ? (lang === 'es' ? 'Se aprobará al guardar' : 'Will be approved on save') : (lang === 'es' ? 'Quedará propuesto' : 'Will be proposed')}</span>
                  </div>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Notas · español' : 'Notes · Spanish'}</span>
                    <textarea className="input" rows={2} value={draft.notes?.es ?? ''} onChange={(event) => patchLabel('notes', 'es', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Notas · inglés' : 'Notes · English'}</span>
                    <textarea className="input" rows={2} value={draft.notes?.en ?? ''} onChange={(event) => patchLabel('notes', 'en', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Motivo del cambio' : 'Reason for change'} <span className="required">*</span></span>
                    <textarea className="input" rows={3} value={draft.changeReason ?? ''} onChange={(event) => patch({ changeReason: event.target.value })} placeholder={lang === 'es' ? 'Por qué se crea o modifica este factor…' : 'Why this factor is created or changed…'} />
                    <FieldMessages field="changeReason" />
                  </label>
                  {draft.quality === 'estimated' && (
                    <p className="factor-warning-note">
                      <Icon name="alert" size={14} />
                      {lang === 'es' ? 'Un factor estimado se marcará con insignia y advertencia en el informe final.' : 'An estimated factor will be badged and flagged in the final report.'}
                    </p>
                  )}
                </div>

                <div className="factor-review">
                  <p className="eyebrow no-rule">{lang === 'es' ? 'Revisión' : 'Review'}</p>
                  <div className="factor-review-row"><span>{lang === 'es' ? 'Resultado' : 'Result'}</span><strong>{factorValueLabel(draft, lang)}</strong></div>
                  <div className="factor-review-row"><span>{lang === 'es' ? 'Categoría' : 'Category'}</span><strong>{categoryLabel(draft.category, lang)} · S{draft.scope}</strong></div>
                  <div className="factor-review-row"><span>{lang === 'es' ? 'Cobertura' : 'Coverage'}</span><strong>{draft.country} · {draft.dataYear}</strong></div>
                  <div className="factor-review-row"><span>{lang === 'es' ? 'Fuente' : 'Source'}</span><strong>{draft.sourceOrg || '—'}</strong></div>
                  <div className="factor-review-row"><span>{lang === 'es' ? 'Versión' : 'Version'}</span><strong>v{existingCustom ? existingCustom.version + 1 : 1}</strong></div>
                </div>

                {errors.length > 0 && (
                  <div className="factor-error-box">
                    <strong>{lang === 'es' ? 'No se puede guardar todavía' : 'Cannot save yet'}</strong>
                    <ul>{errors.map((item, index) => <li key={index}>{issueText(item, lang)}</li>)}</ul>
                  </div>
                )}
                {warnings.length > 0 && errors.length === 0 && (
                  <div className="factor-warn-box">
                    <strong>{lang === 'es' ? 'Revisa antes de guardar' : 'Review before saving'}</strong>
                    <ul>{warnings.map((item, index) => <li key={index}>{issueText(item, lang)}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="factor-modal-foot">
          <div className="tiny muted">
            {role === 'reader'
              ? (lang === 'es' ? 'Rol Lector: solo consulta.' : 'Reader role: read-only.')
              : `${roleLabel(role, lang)} · ${existingCustom ? (lang === 'es' ? `versión actual v${existingCustom.version}` : `current version v${existingCustom.version}`) : baseRecord ? `override de ${baseRecord.id}` : 'nuevo factor'}`}
          </div>
          <div className="row gap-2">
            {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep((current) => (current - 1) as Step)}><Icon name="arrow-left" size={14} /> {lang === 'es' ? 'Atrás' : 'Back'}</button>}
            {step < 2 ? (
              <button type="button" className="btn btn-primary" onClick={() => setStep((current) => (current + 1) as Step)}>
                {lang === 'es' ? 'Continuar' : 'Continue'} <Icon name="arrow-right" size={14} />
              </button>
            ) : (
              <button type="button" className="btn btn-accent" onClick={save} disabled={!canSave}>
                <Icon name="check" size={15} /> {lang === 'es' ? 'Guardar factor' : 'Save factor'}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
