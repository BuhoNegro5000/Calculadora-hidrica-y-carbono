import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/app';
import { useFactors } from '../../store/factors';
import { Icon } from '../Icons';
import { Badge, Chip, Datum } from '../ui';
import {
  approvalLabel, factorDiff, gwpForFactorSet, methodLabel, qualityLabel,
  recordTotalWater, waterTypeLabel, type FactorRecord,
} from '../../engine/factorTypes';
import { baseUpdatedOverrides } from '../../engine/catalog';
import { dateLabel, nf, smart } from '../../lib/format';
import {
  ApprovalBadge, categoryLabel, factorValueLabel, KindBadge, LayerBadge, QualityBadge,
  ScopeChip, StatusBadge, shortSource,
} from './shared';

type Tab = 'detail' | 'history' | 'audit';

interface Props {
  record: FactorRecord;
  onClose: () => void;
  onEdit: (record: FactorRecord, base?: FactorRecord) => void;
  onDuplicate: (record: FactorRecord) => void;
  onCompare: (record: FactorRecord) => void;
  onUse: (record: FactorRecord) => void;
}

export function FactorDetail({
  record, onClose, onEdit, onDuplicate, onCompare, onUse,
}: Props) {
  const { lang } = useI18n();
  const { toast } = useApp();
  const {
    catalog, audit, role, deleteFactor, restoreBase, approveFactor, revertVersion,
  } = useFactors();
  const [tab, setTab] = useState<Tab>('detail');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [revertTarget, setRevertTarget] = useState<number | null>(null);
  const [revertReason, setRevertReason] = useState('');
  const [actionError, setActionError] = useState('');

  const base = useMemo(() => {
    if (record.baseId) return catalog.baseRecords.get(record.baseId);
    if (record.layer === 'base') return record;
    return undefined;
  }, [catalog.baseRecords, record]);

  const isCustom = record.layer === 'custom';
  const isOverride = Boolean(record.baseId);
  const diff = isCustom && base ? factorDiff(base, record.value, record.unit) : null;
  const history = [...(record.history ?? [])].sort((a, b) => b.version - a.version);
  const entries = audit.filter((entry) => entry.factorId === record.id).slice(0, 60);
  const baseMoved = baseUpdatedOverrides([record]).length > 0;
  const L = (es: string, en: string) => (lang === 'es' ? es : en);

  const run = (result: { ok: boolean; issues: { message: { es: string; en: string } }[] }, okMessage: string) => {
    if (!result.ok) {
      const first = result.issues[0];
      setActionError(first ? first.message[lang] : L('No se pudo completar la acción.', 'The action could not be completed.'));
      return false;
    }
    setActionError('');
    toast(okMessage);
    return true;
  };

  const doDelete = () => {
    if (deleteReason.trim().length < 6) {
      setActionError(L('Escribe el motivo de la eliminación (mínimo 6 caracteres).', 'Write the deletion reason (at least 6 characters).'));
      return;
    }
    if (run(deleteFactor(record.id, deleteReason.trim()), L('Factor movido a la papelera.', 'Factor moved to trash.'))) {
      onClose();
    }
  };

  const doRestoreBase = () => {
    if (run(restoreBase(record.id), L('Valor base restaurado. El override queda en la papelera.', 'Base value restored. The override is in the trash.'))) {
      onClose();
    }
  };

  const doApprove = () => {
    run(approveFactor(record.id), L('Factor aprobado para uso organizacional.', 'Factor approved for organisational use.'));
  };

  const doRevert = () => {
    if (revertTarget === null) return;
    if (revertReason.trim().length < 6) {
      setActionError(L('Explica el motivo de la reversión (mínimo 6 caracteres).', 'Explain the revert reason (at least 6 characters).'));
      return;
    }
    if (run(revertVersion(record.id, revertTarget, revertReason.trim()), L('Versión restaurada como una versión nueva.', 'Version restored as a new version.'))) {
      setRevertTarget(null);
      setRevertReason('');
    }
  };

  return (
    <div className="factor-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="factor-drawer" role="dialog" aria-modal="true" aria-labelledby="factor-detail-title">
        <header className="factor-drawer-head">
          <div className="row gap-2 wrap" style={{ marginBottom: 8 }}>
            <KindBadge kind={record.kind} lang={lang} />
            <LayerBadge record={record} lang={lang} />
            <QualityBadge record={record} lang={lang} />
            <StatusBadge record={record} lang={lang} />
            {isCustom && <ApprovalBadge record={record} lang={lang} />}
          </div>
          <h2 id="factor-detail-title">{record.label[lang] || record.label.es}</h2>
          <p className="small muted">{record.description[lang] || record.description.es}</p>
          <div className="factor-detail-value">
            <strong>{factorValueLabel(record, lang)}</strong>
            <span className="mono tiny">{record.id} · v{record.version}</span>
          </div>
          <button type="button" className="icon-btn factor-drawer-close" onClick={onClose} aria-label={L('Cerrar', 'Close')}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="factor-tabs" role="tablist" aria-label={L('Secciones del factor', 'Factor sections')}>
          {([
            ['detail', L('Ficha', 'Record')],
            ['history', L('Historial', 'History')],
            ['audit', L('Auditoría', 'Audit')],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              {label}
              {id === 'history' && history.length > 0 && <span className="tab-count">{history.length + 1}</span>}
              {id === 'audit' && entries.length > 0 && <span className="tab-count">{entries.length}</span>}
            </button>
          ))}
        </div>

        <div className="factor-drawer-body">
          {baseMoved && tab === 'detail' && (
            <div className="factor-alert">
              <Icon name="alert" size={16} />
              <div>
                <strong>{L('El factor base se actualizó', 'The base factor was updated')}</strong>
                <p>{L('Tu override se creó sobre otra versión del paquete de datos. Revisa el valor base y decide si mantienes tu ajuste.', 'Your override was created on another data package version. Review the base value and decide whether to keep your change.')}</p>
              </div>
            </div>
          )}

          {tab === 'detail' && (
            <>
              <section className="factor-detail-section">
                <h3>{L('Valor y trazabilidad', 'Value and traceability')}</h3>
                <div className="factor-datum-grid">
                  <Datum label={L('Categoría', 'Category')} value={categoryLabel(record.category, lang)} hint={`S${record.scope}`} />
                  <Datum label={L('Alcance', 'Scope')} value={<ScopeChip scope={record.scope} />} hint={record.scope3Category ? `Scope 3 · cat. ${record.scope3Category}` : undefined} />
                  <Datum label={L('Unidad de actividad', 'Activity unit')} value={record.unit} />
                  <Datum label={L('País / región', 'Country / region')} value={record.country === 'GLOBAL' ? L('Global', 'Global') : record.country} hint={record.region} />
                  <Datum label={L('Año del dato', 'Data year')} value={record.dataYear} />
                  <Datum label={L('Año de publicación', 'Publication year')} value={record.publicationYear} />
                  <Datum label={L('Incertidumbre', 'Uncertainty')} value={`±${nf(record.uncertainty * 100, lang, 1)} %`} />
                  <Datum label={L('Método', 'Method')} value={methodLabel(record.method, lang)} />
                  <Datum label={L('Calidad', 'Quality')} value={qualityLabel(record.quality, lang)} />
                  <Datum label={L('Aprobación', 'Approval')} value={approvalLabel(record.approval, lang)} hint={record.approvedBy} />
                </div>
              </section>

              {record.kind === 'carbon' ? (
                <section className="factor-detail-section">
                  <div className="factor-section-title">
                    <h3>{L('Gases y GWP', 'Gases and GWP')}</h3>
                    <Chip>{record.gwpSet}</Chip>
                  </div>
                  {record.gases.length > 0 ? (
                    <div className="table-wrap">
                      <table className="data factor-detail-table">
                        <thead>
                          <tr>
                            <th>{L('Gas', 'Gas')}</th>
                            <th className="right">{L('kg gas / unidad', 'kg gas / unit')}</th>
                            <th className="right">GWP</th>
                            <th className="right">kg CO₂e</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.gases.map((gas, index) => {
                            const gwp = gas.gwp ?? gwpForFactorSet(gas.gas, record.gwpSet) ?? 0;
                            return (
                              <tr key={`${gas.gas}-${index}`}>
                                <td className="mono">{gas.gas}</td>
                                <td className="right">{smart(gas.amount, lang)}</td>
                                <td className="right">{smart(gwp, lang)}</td>
                                <td className="right">{smart(gas.amount * gwp, lang)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="factor-hint">
                      {L('CO₂e agregado sin desglose por gas. Este factor aparece como hueco de gas en la pestaña Cobertura.', 'Aggregate CO₂e without gas breakdown. This factor appears as a gas gap in the Coverage tab.')}
                    </p>
                  )}
                  {record.byGwp && (
                    <div className="row gap-3 wrap mt-3">
                      {(['AR5', 'AR6'] as const).map((set) => record.byGwp?.[set] !== undefined && (
                        <span className="badge" key={set}>{set}: {smart(record.byGwp[set] as number, lang)} kg CO₂e</span>
                      ))}
                    </div>
                  )}
                </section>
              ) : (
                <section className="factor-detail-section">
                  <div className="factor-section-title">
                    <h3>{L('Componentes de agua', 'Water components')}</h3>
                    <Chip tone="water">{waterTypeLabel(record.waterType, lang)}</Chip>
                  </div>
                  <div className="water-breakdown">
                    {(['blue', 'green', 'grey'] as const).map((component) => {
                      const value = record.water?.[component] ?? 0;
                      const total = recordTotalWater(record) || 1;
                      return (
                        <div className={`water-component ${component}`} key={component}>
                          <span className="water-dot" />
                          <div>
                            <small>{component === 'blue' ? L('Azul', 'Blue') : component === 'green' ? L('Verde', 'Green') : L('Gris', 'Grey')}</small>
                            <strong>{smart(value, lang)} m³</strong>
                            <span className="tiny muted">{nf((value / total) * 100, lang, 0)} %</span>
                          </div>
                          <div className="water-bar"><span style={{ width: `${Math.min(100, (value / total) * 100)}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="factor-detail-section">
                <h3>{L('Fuente y licencia', 'Source and licence')}</h3>
                <div className="factor-source-card">
                  <div className="row between gap-3" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <strong>{record.sourceOrg}</strong>
                      <p className="small">{record.sourceTitle}</p>
                      <p className="tiny muted">{record.license} · {L('descargado', 'downloaded')} {dateLabel(record.downloadedAt, lang)}</p>
                    </div>
                    {record.sourceUrl && (
                      <a className="btn btn-outline btn-sm" href={record.sourceUrl} target="_blank" rel="noreferrer">
                        {shortSource(record)} <Icon name="external" size={13} />
                      </a>
                    )}
                  </div>
                  <p className="tiny muted mt-3 mono">sourceId: {record.sourceId}</p>
                </div>
              </section>

              {diff && base && (
                <section className="factor-detail-section">
                  <h3>{L('Comparación con la capa base', 'Comparison with the base layer')}</h3>
                  <div className="factor-base-compare">
                    <div>
                      <small>{L('Base', 'Base')}</small>
                      <strong>{factorValueLabel(base, lang)}</strong>
                      <span className="tiny muted">v{base.version} · {base.updatedAt.slice(0, 10)}</span>
                    </div>
                    <div>
                      <small>{L('Personalizado', 'Custom')}</small>
                      <strong>{factorValueLabel(record, lang)}</strong>
                      <span className="tiny muted">v{record.version} · {record.updatedAt.slice(0, 10)}</span>
                    </div>
                    <div className={`factor-delta ${diff.pct > 0 ? 'up' : 'down'}`}>
                      {diff.pct > 0 ? '+' : ''}{diff.pct.toFixed(1)} %
                    </div>
                  </div>
                  <p className="factor-hint">
                    {L('La capa base nunca se modifica. Al restaurar, el cálculo vuelve al valor original.', 'The base layer is never modified. Restoring makes calculations use the original value again.')}
                  </p>
                </section>
              )}

              <section className="factor-detail-section">
                <h3>{L('Notas', 'Notes')}</h3>
                <p className="small">{record.notes?.[lang] || record.notes?.es || L('Sin notas adicionales.', 'No additional notes.')}</p>
                {isCustom && (
                  <div className="factor-reason-box">
                    <span className="eyebrow no-rule">{L('Motivo registrado', 'Recorded reason')}</span>
                    <p>{record.changeReason || '—'}</p>
                    <span className="tiny muted">{record.createdBy} · {dateLabel(record.createdAt, lang)}</span>
                  </div>
                )}
              </section>
            </>
          )}

          {tab === 'history' && (
            <section className="factor-detail-section">
              <h3>{L('Versiones', 'Versions')}</h3>
              <p className="small muted">
                {L('Cada edición crea una versión nueva. Revertir no borra la historia: añade otra versión con el valor antiguo.', 'Every edit creates a new version. Reverting does not delete history: it adds another version with the old value.')}
              </p>
              <ol className="factor-timeline">
                <li className="current">
                  <span className="timeline-dot" />
                  <div>
                    <div className="row between gap-2">
                      <strong>v{record.version} · {L('actual', 'current')}</strong>
                      <span className="tiny muted">{dateLabel(record.updatedAt, lang)}</span>
                    </div>
                    <p>{factorValueLabel(record, lang)}</p>
                    <span className="tiny muted">{record.changeReason}</span>
                  </div>
                </li>
                {history.map((entry) => (
                  <li key={entry.version}>
                    <span className="timeline-dot" />
                    <div>
                      <div className="row between gap-2">
                        <strong>v{entry.version}</strong>
                        <span className="tiny muted">{dateLabel(entry.at, lang)}</span>
                      </div>
                      <p>{entry.value} {entry.unit} · {entry.sourceOrg} ({entry.dataYear})</p>
                      <span className="tiny muted">{entry.reason} · {entry.user}</span>
                      {isCustom && role !== 'reader' && (
                        <div className="mt-2">
                          {revertTarget === entry.version ? (
                            <div className="factor-inline-action">
                              <input
                                className="input"
                                value={revertReason}
                                onChange={(event) => setRevertReason(event.target.value)}
                                placeholder={L('Motivo de la reversión', 'Revert reason')}
                              />
                              <button type="button" className="btn btn-accent btn-sm" onClick={doRevert}>{L('Confirmar', 'Confirm')}</button>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRevertTarget(null)}>{L('Cancelar', 'Cancel')}</button>
                            </div>
                          ) : (
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => { setRevertTarget(entry.version); setRevertReason(''); setActionError(''); }}>
                              <Icon name="refresh" size={13} /> {L('Revertir a v', 'Revert to v')}{entry.version}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              {history.length === 0 && <p className="factor-hint">{L('Este factor aún no tiene versiones anteriores.', 'This factor has no earlier versions yet.')}</p>}
            </section>
          )}

          {tab === 'audit' && (
            <section className="factor-detail-section">
              <h3>{L('Registro inmutable', 'Immutable log')}</h3>
              <p className="small muted">{L('Altas, ediciones, importaciones y eliminaciones de este factor.', 'Creates, edits, imports and deletions for this factor.')}</p>
              <div className="factor-audit-list">
                {entries.map((entry) => (
                  <article className="factor-audit-item" key={entry.id}>
                    <div className="row between gap-2">
                      <Badge tone={entry.action === 'delete' ? 'warn' : entry.action === 'approve' ? 'ok' : 'info'}>{entry.action}</Badge>
                      <span className="tiny muted">{dateLabel(entry.at, lang)}</span>
                    </div>
                    <p className="small">{entry.reason}</p>
                    <span className="tiny muted">
                      {entry.user} · {entry.role}
                      {entry.version ? ` · v${entry.version}` : ''}
                      {entry.before?.value !== undefined ? ` · ${entry.before.value} → ${entry.after?.value ?? '—'}` : ''}
                    </span>
                  </article>
                ))}
                {entries.length === 0 && <p className="factor-hint">{L('Sin movimientos registrados todavía.', 'No movements recorded yet.')}</p>}
              </div>
            </section>
          )}

          {actionError && (
            <div className="factor-error-box" role="alert">
              <Icon name="alert" size={15} />
              <span>{actionError}</span>
            </div>
          )}
        </div>

        <footer className="factor-drawer-foot">
          <div className="row gap-2 wrap">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onUse(record)}>
              <Icon name="leaf" size={14} /> {L('Usar en cálculo', 'Use in calculation')}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onCompare(record)}>
              <Icon name="scale" size={14} /> {L('Comparar', 'Compare')}
            </button>
            {role !== 'reader' && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => onDuplicate(record)}>
                <Icon name="copy" size={14} /> {L('Duplicar', 'Duplicate')}
              </button>
            )}
          </div>
          <div className="row gap-2 wrap">
            {isCustom && record.approval === 'proposed' && role === 'admin' && (
              <button type="button" className="btn btn-accent btn-sm" onClick={doApprove}>
                <Icon name="check" size={14} /> {L('Aprobar', 'Approve')}
              </button>
            )}
            {isOverride && role !== 'reader' && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={doRestoreBase}>
                <Icon name="refresh" size={14} /> {L('Restaurar valor original', 'Restore original value')}
              </button>
            )}
            {role !== 'reader' && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onEdit(record, base)}>
                <Icon name="edit" size={14} /> {isCustom ? L('Editar', 'Edit') : L('Crear override', 'Create override')}
              </button>
            )}
            {isCustom && role !== 'reader' && !confirmDelete && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" size={14} /> {L('Eliminar', 'Delete')}
              </button>
            )}
          </div>
          {confirmDelete && (
            <div className="factor-delete-box">
              <p className="small">{L('Solo se elimina la copia personalizada. El factor base queda intacto y podrás recuperarla desde la papelera.', 'Only the custom copy is deleted. The base factor stays intact and you can recover it from the trash.')}</p>
              <input
                className="input"
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                placeholder={L('Motivo de la eliminación', 'Deletion reason')}
              />
              <div className="row gap-2 mt-2">
                <button type="button" className="btn btn-danger btn-sm" onClick={doDelete}>{L('Mover a papelera', 'Move to trash')}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setConfirmDelete(false); setDeleteReason(''); }}>{L('Cancelar', 'Cancel')}</button>
              </div>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}
