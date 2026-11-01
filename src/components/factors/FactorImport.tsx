import { useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { useApp } from '../../store/app';
import { useFactors } from '../../store/factors';
import { Icon } from '../Icons';
import { Chip } from '../ui';
import { parseFactorCsv, parseFactorJson, validateFactor, hasErrors, type CsvParseResult } from '../../engine/factorOps';
import type { FactorRecord } from '../../engine/factorTypes';
import { downloadFactorTemplate } from '../../lib/factorIO';
import { readFactorFile } from '../../lib/factorIO';
import { factorValueLabel, KindBadge } from './shared';

interface Props {
  onClose: () => void;
  onImported: (records: FactorRecord[]) => void;
}

type Preview = CsvParseResult & { format: string; fileName: string };

export function FactorImport({ onClose, onImported }: Props) {
  const { lang } = useI18n();
  const { toast } = useApp();
  const { catalog, custom, importFactors, role } = useFactors();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const L = (es: string, en: string) => (lang === 'es' ? es : en);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError('');
    setPreview(null);
    try {
      const { format, text } = await readFactorFile(file);
      if (format === 'json') {
        const parsed = parseFactorJson(text);
        if (parsed.error) {
          setError(parsed.error);
        } else {
          const errors: Preview['errors'] = [];
          const warnings: Preview['warnings'] = [];
          const records: FactorRecord[] = [];
          const all = [...catalog.baseRecords.values(), ...custom];
          parsed.records.forEach((record, index) => {
            const base = catalog.baseRecords.get(record.id);
            const issues = validateFactor(
              { ...record, layer: 'custom' },
              { base, existing: custom.find((item) => item.id === record.id && !item.deletedAt), all, confirmLargeChange: true, allowDuplicate: true },
            );
            const blockers = issues.filter((item) => item.severity === 'error');
            for (const item of blockers) {
              errors.push({ row: index + 1, field: item.field, message: item.message });
            }
            for (const item of issues.filter((entry) => entry.severity === 'warning')) {
              warnings.push({ row: index + 1, field: item.field, message: item.message });
            }
            if (!hasErrors(issues)) {
              records.push(record);
              all.push(record);
            }
          });
          setPreview({ records, errors, warnings, format, fileName: file.name });
        }
      } else {
        const parsed = parseFactorCsv(text, {
          baseRecords: catalog.baseRecords,
          all: [...catalog.baseRecords.values(), ...custom],
        });
        setPreview({ ...parsed, format, fileName: file.name });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L('No se pudo leer el archivo.', 'The file could not be read.'));
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!preview || preview.records.length === 0) return;
    const result = importFactors(preview.records);
    if (result.imported > 0) {
      toast(L(`${result.imported} factor(es) importados.`, `${result.imported} factor(s) imported.`));
      onImported(preview.records);
      onClose();
    } else {
      setError(L('Ningún registro superó la validación.', 'No record passed validation.'));
    }
  };

  return (
    <div className="factor-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="factor-modal factor-import" role="dialog" aria-modal="true" aria-labelledby="factor-import-title">
        <header className="factor-modal-head">
          <div>
            <p className="eyebrow no-rule">{L('Importar capa personalizada', 'Import custom layer')}</p>
            <h2 id="factor-import-title">{L('CSV, Excel o JSON con vista previa', 'CSV, Excel or JSON with preview')}</h2>
            <p className="small muted">
              {L('Se validan unidades, rangos, duplicados, fuente, año y motivo antes de aplicar. Nada se guarda hasta que confirmes.', 'Units, ranges, duplicates, source, year and reason are validated before applying. Nothing is saved until you confirm.')}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={L('Cerrar', 'Close')}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="factor-modal-body">
          <div className="factor-import-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => downloadFactorTemplate(lang)}>
              <Icon name="download" size={14} /> {L('Descargar plantilla', 'Download template')}
            </button>
            <span className="tiny muted">{L('Plantilla con todas las columnas obligatorias y una fila de ejemplo.', 'Template with every required column and a sample row.')}</span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json,.xls,.xlsx,.html,.htm,text/csv,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className={`factor-dropzone ${busy ? 'busy' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
          >
            <span className="factor-dropzone-icon"><Icon name="file" size={24} /></span>
            <strong>{busy ? L('Leyendo archivo…', 'Reading file…') : L('Elegir o arrastrar un archivo', 'Choose or drop a file')}</strong>
            <span className="tiny muted">{L('CSV con separador ; o , · JSON del gestor · XLS en HTML. El .xlsx binario no está soportado sin backend.', 'CSV with ; or , · manager JSON · HTML XLS. Binary .xlsx is not supported without a backend.')}</span>
          </button>

          {role === 'reader' && (
            <div className="factor-error-box">
              <Icon name="lock" size={15} />
              <span>{L('El rol Lector puede revisar la vista previa, pero no importar.', 'The Reader role can review the preview but cannot import.')}</span>
            </div>
          )}

          {error && (
            <div className="factor-error-box" role="alert">
              <Icon name="alert" size={15} />
              <span>{error}</span>
            </div>
          )}

          {preview && (
            <>
              <div className="factor-import-summary">
                <Chip tone="accent">{preview.fileName}</Chip>
                <Chip>{preview.format.toUpperCase()}</Chip>
                <Chip>{L('Válidos', 'Valid')}: {preview.records.length}</Chip>
                <Chip tone={preview.errors.length ? 'warn' : 'default'}>{L('Errores', 'Errors')}: {preview.errors.length}</Chip>
                <Chip>{L('Avisos', 'Warnings')}: {preview.warnings.length}</Chip>
              </div>

              {preview.errors.length > 0 && (
                <div className="factor-import-issues">
                  <h3>{L('Errores que impiden importar la fila', 'Errors that block the row')}</h3>
                  <ul>
                    {preview.errors.slice(0, 80).map((item, index) => (
                      <li key={`error-${index}`}>
                        <strong>{L('Fila', 'Row')} {item.row}</strong> · {item.field} · {item.message[lang]}
                      </li>
                    ))}
                  </ul>
                  {preview.errors.length > 80 && <p className="tiny muted">{L('Se muestran los primeros 80 errores.', 'Showing the first 80 errors.')}</p>}
                </div>
              )}

              {preview.warnings.length > 0 && (
                <div className="factor-import-issues warning">
                  <h3>{L('Avisos (la fila sí se puede importar)', 'Warnings (the row can still be imported)')}</h3>
                  <ul>
                    {preview.warnings.slice(0, 40).map((item, index) => (
                      <li key={`warn-${index}`}>
                        <strong>{L('Fila', 'Row')} {item.row}</strong> · {item.message[lang]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.records.length > 0 && (
                <div className="table-wrap factor-import-table">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>{L('Factor', 'Factor')}</th>
                        <th>{L('Categoría', 'Category')}</th>
                        <th>{L('Región', 'Region')}</th>
                        <th className="right">{L('Año', 'Year')}</th>
                        <th>{L('Fuente', 'Source')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.records.slice(0, 40).map((record) => (
                        <tr key={record.id}>
                          <td>
                            <div className="row gap-2 wrap">
                              <KindBadge kind={record.kind} lang={lang} />
                              <strong>{record.label[lang] || record.label.es}</strong>
                            </div>
                            <span className="tiny muted">{factorValueLabel(record, lang)}</span>
                          </td>
                          <td>{record.category} · S{record.scope}</td>
                          <td>{record.country}</td>
                          <td className="right">{record.dataYear}</td>
                          <td>{record.sourceOrg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.records.length > 40 && <p className="tiny muted" style={{ padding: 12 }}>{L(`Mostrando 40 de ${preview.records.length}.`, `Showing 40 of ${preview.records.length}.`)}</p>}
                </div>
              )}
            </>
          )}
        </div>

        <footer className="factor-modal-foot">
          <span className="tiny muted">
            {L('Los registros importados entran como capa personalizada y generan auditoría.', 'Imported records enter the custom layer and generate an audit entry.')}
          </span>
          <div className="row gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>{L('Cancelar', 'Cancel')}</button>
            <button
              type="button"
              className="btn btn-accent"
              onClick={apply}
              disabled={!preview || preview.records.length === 0 || role === 'reader'}
            >
              <Icon name="check" size={15} /> {L('Importar', 'Import')} {preview ? `(${preview.records.length})` : ''}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
