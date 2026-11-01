/**
 * Estado React de la capa personalizada de factores.
 * Carga IndexedDB, expone el catálogo resuelto y centraliza altas, ediciones,
 * versiones, aprobaciones, papelera, importación y auditoría.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import {
  baseCatalog, baseFactorRecords, baseRecordById, baseUpdatedOverrides, buildCatalog,
  customRecordStatus, type FactorCatalog,
} from '../engine/catalog';
import {
  cloneFactor, customFactorId, DEFAULT_CHANGE_THRESHOLD, nextFactorVersion, nowIso,
  revertFactorVersion, type FactorAuditEntry, type FactorRecord, type FactorRole,
} from '../engine/factorTypes';
import {
  createOverride, hasErrors, validateFactor, type FactorIssue,
} from '../engine/factorOps';
import {
  exportBackup, loadFactorStore, persistAudit, persistFactor, persistRole,
  purgeFactor as purgeFactorDb, readFactorMirror, saveMirror,
} from './factorDb';

interface FactorSaveResult {
  ok: boolean;
  issues: FactorIssue[];
  record?: FactorRecord;
}

interface FactorValue {
  catalog: FactorCatalog;
  custom: FactorRecord[];
  activeCustom: FactorRecord[];
  deleted: FactorRecord[];
  audit: FactorAuditEntry[];
  role: FactorRole;
  setRole: (role: FactorRole) => void;
  threshold: number;
  setThreshold: (value: number) => void;
  loading: boolean;
  storage: 'indexeddb' | 'localstorage';
  baseUpdates: FactorRecord[];
  pendingApprovals: number;
  saveFactor: (
    record: FactorRecord,
    options?: { base?: FactorRecord; confirmLargeChange?: boolean },
  ) => FactorSaveResult;
  duplicateFactor: (id: string) => FactorSaveResult;
  deleteFactor: (id: string, reason: string) => FactorSaveResult;
  restoreFactor: (id: string) => FactorSaveResult;
  purgeFactor: (id: string) => FactorSaveResult;
  restoreBase: (id: string) => FactorSaveResult;
  approveFactor: (id: string) => FactorSaveResult;
  revertVersion: (id: string, version: number, reason: string) => FactorSaveResult;
  importFactors: (records: FactorRecord[]) => { ok: boolean; imported: number; issues: { id: string; issues: FactorIssue[] }[] };
  backupJson: () => string;
  reload: () => void;
}

const FactorContext = createContext<FactorValue | null>(null);

const THRESHOLD_KEY = 'gol.factors.threshold.v1';

function readThreshold(): number {
  try {
    const raw = Number(localStorage.getItem(THRESHOLD_KEY));
    if (Number.isFinite(raw) && raw >= 1 && raw <= 100) return raw;
  } catch { /* noop */ }
  return DEFAULT_CHANGE_THRESHOLD;
}

function auditId(): string {
  return `aud_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

function userFor(role: FactorRole): string {
  return role === 'admin' ? 'Administrador local' : role === 'editor' ? 'Editor local' : 'Lector local';
}

function summary(record: FactorRecord): Partial<FactorRecord> {
  return {
    id: record.id,
    value: record.value,
    unit: record.unit,
    dataYear: record.dataYear,
    country: record.country,
    sourceOrg: record.sourceOrg,
    version: record.version,
    approval: record.approval,
  };
}

export function FactorProvider({ children }: { children: ReactNode }) {
  const initial = readFactorMirror();
  const [custom, setCustom] = useState<FactorRecord[]>(initial.factors);
  const [audit, setAudit] = useState<FactorAuditEntry[]>(initial.audit);
  const [role, setRoleState] = useState<FactorRole>(initial.role);
  const [threshold, setThresholdState] = useState(readThreshold);
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState<'indexeddb' | 'localstorage'>('localstorage');

  useEffect(() => {
    let cancelled = false;
    loadFactorStore().then((snapshot) => {
      if (cancelled) return;
      setCustom(snapshot.factors);
      setAudit(snapshot.audit);
      setRoleState(snapshot.role);
      setStorage(snapshot.storage);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    saveMirror(custom, audit, role);
  }, [custom, audit, role]);

  const catalog = useMemo(() => buildCatalog(custom), [custom]);
  const activeCustom = useMemo(() => custom.filter((record) => !record.deletedAt), [custom]);
  const deleted = useMemo(() => custom.filter((record) => Boolean(record.deletedAt)), [custom]);
  const baseUpdates = useMemo(() => baseUpdatedOverrides(custom), [custom]);
  const pendingApprovals = useMemo(
    () => activeCustom.filter((record) => record.approval === 'proposed').length,
    [activeCustom],
  );

  const applyWrite = useCallback((record: FactorRecord, entry: FactorAuditEntry) => {
    setCustom((current) => {
      const exists = current.some((item) => item.id === record.id);
      return exists
        ? current.map((item) => (item.id === record.id ? record : item))
        : [record, ...current];
    });
    setAudit((current) => [entry, ...current]);
    void persistFactor(record);
    void persistAudit(entry);
  }, []);

  const makeAudit = useCallback((
    action: FactorAuditEntry['action'],
    factorId: string,
    label: string,
    reason: string,
    before?: Partial<FactorRecord>,
    after?: Partial<FactorRecord>,
    version?: number,
  ): FactorAuditEntry => ({
    id: auditId(),
    at: nowIso(),
    action,
    factorId,
    factorLabel: label,
    version,
    before,
    after,
    reason,
    user: userFor(role),
    role,
  }), [role]);

  const saveFactor = useCallback<FactorValue['saveFactor']>((record, options = {}) => {
    if (role === 'reader') {
      return {
        ok: false,
        issues: [{
          field: 'role',
          code: 'forbidden',
          severity: 'error',
          message: { es: 'El rol Lector no puede crear ni editar factores.', en: 'The Reader role cannot create or edit factors.' },
        }],
      };
    }
    const existing = custom.find((item) => item.id === record.id && !item.deletedAt);
    const base = options.base ?? (record.baseId ? baseRecordById.get(record.baseId) : baseRecordById.get(record.id));
    const all = [...baseFactorRecords, ...custom];
    const isOverride = Boolean(base && !existing);
    const reason = record.changeReason?.trim() || (isOverride ? 'Ajuste del factor base' : existing ? 'Actualización de factor' : 'Alta de factor personalizado');
    const draft: FactorRecord = {
      ...record,
      id: record.id || customFactorId(record.kind),
      layer: 'custom',
      changeReason: reason,
      status: customRecordStatus(record),
      approval: role === 'admin' ? 'approved' : 'proposed',
      approvedBy: role === 'admin' ? userFor(role) : undefined,
      updatedAt: nowIso(),
    };
    const issues = validateFactor(draft, {
      base,
      existing,
      all,
      threshold,
      confirmLargeChange: options.confirmLargeChange,
    });
    if (hasErrors(issues)) return { ok: false, issues };

    let next: FactorRecord;
    if (existing) {
      next = nextFactorVersion(existing, draft, { reason, user: userFor(role) });
    } else if (base) {
      next = createOverride(base, draft, { reason, user: userFor(role), role, threshold });
    } else {
      const at = nowIso();
      next = {
        ...draft,
        createdAt: at,
        updatedAt: at,
        createdBy: userFor(role),
        version: 1,
        history: [],
        baseId: undefined,
        baseValue: undefined,
        baseVersion: undefined,
      };
    }
    const action: FactorAuditEntry['action'] = existing ? 'update' : 'create';
    applyWrite(next, makeAudit(
      action,
      next.id,
      next.label.es || next.label.en,
      reason,
      existing ? summary(existing) : base ? summary(base) : undefined,
      summary(next),
      next.version,
    ));
    return { ok: true, issues, record: next };
  }, [applyWrite, custom, makeAudit, role, threshold]);

  const duplicateFactor = useCallback<FactorValue['duplicateFactor']>((id) => {
    if (role === 'reader') {
      return {
        ok: false,
        issues: [{
          field: 'role', code: 'forbidden', severity: 'error',
          message: { es: 'El rol Lector no puede duplicar factores.', en: 'The Reader role cannot duplicate factors.' },
        }],
      };
    }
    const source = catalog.records.get(id);
    if (!source) {
      return { ok: false, issues: [{ field: 'id', code: 'missing', severity: 'error', message: { es: 'Factor no encontrado.', en: 'Factor not found.' } }] };
    }
    const copy = cloneFactor(source, customFactorId(source.kind));
    const issues = validateFactor(copy, { all: [...baseFactorRecords, ...custom], allowDuplicate: true });
    if (hasErrors(issues)) return { ok: false, issues };
    const at = nowIso();
    const next = { ...copy, createdAt: at, updatedAt: at, approval: role === 'admin' ? 'approved' as const : 'proposed' as const, approvedBy: role === 'admin' ? userFor(role) : undefined };
    applyWrite(next, makeAudit('create', next.id, next.label.es, 'Duplicado de factor', summary(source), summary(next), 1));
    return { ok: true, issues, record: next };
  }, [applyWrite, catalog.records, custom, makeAudit, role]);

  const deleteFactor = useCallback<FactorValue['deleteFactor']>((id, reason) => {
    if (role === 'reader') {
      return { ok: false, issues: [{ field: 'role', code: 'forbidden', severity: 'error', message: { es: 'El rol Lector no puede eliminar factores.', en: 'The Reader role cannot delete factors.' } }] };
    }
    const existing = custom.find((item) => item.id === id && !item.deletedAt);
    if (!existing) {
      return { ok: false, issues: [{ field: 'id', code: 'missing', severity: 'error', message: { es: 'Solo se pueden eliminar factores personalizados.', en: 'Only custom factors can be deleted.' } }] };
    }
    const next = { ...existing, deletedAt: nowIso(), updatedAt: nowIso(), changeReason: reason };
    applyWrite(next, makeAudit('delete', id, existing.label.es, reason, summary(existing), summary(next), existing.version));
    return { ok: true, issues: [], record: next };
  }, [applyWrite, custom, makeAudit, role]);

  const restoreFactor = useCallback<FactorValue['restoreFactor']>((id) => {
    if (role === 'reader') {
      return { ok: false, issues: [{ field: 'role', code: 'forbidden', severity: 'error', message: { es: 'El rol Lector no puede restaurar factores.', en: 'The Reader role cannot restore factors.' } }] };
    }
    const existing = custom.find((item) => item.id === id && item.deletedAt);
    if (!existing) {
      return { ok: false, issues: [{ field: 'id', code: 'missing', severity: 'error', message: { es: 'No está en la papelera.', en: 'Not found in trash.' } }] };
    }
    const next = { ...existing, deletedAt: undefined, updatedAt: nowIso(), changeReason: 'Restaurado desde la papelera' };
    applyWrite(next, makeAudit('restore', id, existing.label.es, 'Restaurado desde la papelera', summary(existing), summary(next), existing.version));
    return { ok: true, issues: [], record: next };
  }, [applyWrite, custom, makeAudit, role]);

  const purgeFactor = useCallback<FactorValue['purgeFactor']>((id) => {
    if (role !== 'admin') {
      return { ok: false, issues: [{ field: 'role', code: 'forbidden', severity: 'error', message: { es: 'Solo el Administrador puede borrar definitivamente.', en: 'Only the Administrator can permanently delete.' } }] };
    }
    const existing = custom.find((item) => item.id === id && item.deletedAt);
    if (!existing) {
      return { ok: false, issues: [{ field: 'id', code: 'missing', severity: 'error', message: { es: 'Solo se purga desde la papelera.', en: 'Only trash items can be purged.' } }] };
    }
    setCustom((current) => current.filter((item) => item.id !== id));
    const entry = makeAudit('delete', id, existing.label.es, 'Borrado definitivo desde papelera', summary(existing), undefined, existing.version);
    setAudit((current) => [entry, ...current]);
    void purgeFactorDb(id);
    void persistAudit(entry);
    return { ok: true, issues: [], record: existing };
  }, [custom, makeAudit, role]);

  const restoreBase = useCallback<FactorValue['restoreBase']>((id) => {
    if (role === 'reader') {
      return { ok: false, issues: [{ field: 'role', code: 'forbidden', severity: 'error', message: { es: 'El rol Lector no puede restaurar el factor base.', en: 'The Reader role cannot restore the base factor.' } }] };
    }
    const existing = custom.find((item) => item.id === id && !item.deletedAt);
    if (!existing?.baseId) {
      return { ok: false, issues: [{ field: 'id', code: 'missing', severity: 'error', message: { es: 'No hay un override activo para este factor.', en: 'There is no active override for this factor.' } }] };
    }
    const next = { ...existing, deletedAt: nowIso(), updatedAt: nowIso(), changeReason: 'Restauración del valor base original' };
    applyWrite(next, makeAudit('restore-base', id, existing.label.es, 'Restauración del valor base original', summary(existing), summary(baseRecordById.get(id) ?? existing), existing.version));
    return { ok: true, issues: [], record: next };
  }, [applyWrite, custom, makeAudit, role]);

  const approveFactor = useCallback<FactorValue['approveFactor']>((id) => {
    if (role !== 'admin') {
      return { ok: false, issues: [{ field: 'role', code: 'forbidden', severity: 'error', message: { es: 'Solo el Administrador puede aprobar factores.', en: 'Only the Administrator can approve factors.' } }] };
    }
    const existing = custom.find((item) => item.id === id && !item.deletedAt);
    if (!existing) {
      return { ok: false, issues: [{ field: 'id', code: 'missing', severity: 'error', message: { es: 'Factor no encontrado.', en: 'Factor not found.' } }] };
    }
    const next = { ...existing, approval: 'approved' as const, approvedBy: userFor(role), updatedAt: nowIso() };
    applyWrite(next, makeAudit('approve', id, existing.label.es, 'Aprobación para uso organizacional', summary(existing), summary(next), existing.version));
    return { ok: true, issues: [], record: next };
  }, [applyWrite, custom, makeAudit, role]);

  const revertVersion = useCallback<FactorValue['revertVersion']>((id, version, reason) => {
    if (role === 'reader') {
      return { ok: false, issues: [{ field: 'role', code: 'forbidden', severity: 'error', message: { es: 'El rol Lector no puede revertir versiones.', en: 'The Reader role cannot revert versions.' } }] };
    }
    const existing = custom.find((item) => item.id === id && !item.deletedAt);
    if (!existing) {
      return { ok: false, issues: [{ field: 'id', code: 'missing', severity: 'error', message: { es: 'Factor no encontrado.', en: 'Factor not found.' } }] };
    }
    try {
      const next = revertFactorVersion(existing, version, { reason, user: userFor(role) });
      applyWrite(next, makeAudit('revert', id, existing.label.es, reason, summary(existing), summary(next), next.version));
      return { ok: true, issues: [], record: next };
    } catch (error) {
      return { ok: false, issues: [{ field: 'version', code: 'missing', severity: 'error', message: { es: error instanceof Error ? error.message : 'No se pudo revertir.', en: error instanceof Error ? error.message : 'Could not revert.' } }] };
    }
  }, [applyWrite, custom, makeAudit, role]);

  const importFactors = useCallback<FactorValue['importFactors']>((records) => {
    if (role === 'reader') {
      return { ok: false, imported: 0, issues: [{ id: 'role', issues: [{ field: 'role', code: 'forbidden', severity: 'error', message: { es: 'El rol Lector no puede importar.', en: 'The Reader role cannot import.' } }] }] };
    }
    const all = [...baseFactorRecords, ...custom];
    const failures: { id: string; issues: FactorIssue[] }[] = [];
    const accepted: FactorRecord[] = [];
    for (const record of records) {
      const existing = custom.find((item) => item.id === record.id && !item.deletedAt);
      const base = baseRecordById.get(record.id);
      const draft: FactorRecord = {
        ...record,
        layer: 'custom',
        status: customRecordStatus(record),
        approval: role === 'admin' ? 'approved' : 'proposed',
        approvedBy: role === 'admin' ? userFor(role) : undefined,
        updatedAt: nowIso(),
      };
      const issues = validateFactor(draft, { base, existing, all, allowDuplicate: true, confirmLargeChange: true });
      if (hasErrors(issues)) {
        failures.push({ id: record.id, issues });
        continue;
      }
      const next = existing
        ? nextFactorVersion(existing, draft, { reason: record.changeReason || 'Importación', user: userFor(role) })
        : base
          ? createOverride(base, draft, { reason: record.changeReason || 'Importación', user: userFor(role), role })
          : { ...draft, version: 1, history: [], createdAt: nowIso(), createdBy: userFor(role) };
      accepted.push(next);
      all.push(next);
    }
    if (accepted.length > 0) {
      setCustom((current) => {
        const ids = new Set(accepted.map((record) => record.id));
        return [...accepted, ...current.filter((record) => !ids.has(record.id))];
      });
      const entries = accepted.map((record) => makeAudit(
        'import', record.id, record.label.es, record.changeReason || 'Importación de factores',
        undefined, summary(record), record.version,
      ));
      setAudit((current) => [...entries, ...current]);
      void Promise.all(accepted.map((record) => persistFactor(record)));
      void Promise.all(entries.map((entry) => persistAudit(entry)));
    }
    return { ok: failures.length === 0, imported: accepted.length, issues: failures };
  }, [custom, makeAudit, role]);

  const setRole = useCallback((next: FactorRole) => {
    setRoleState(next);
    void persistRole(next);
    const entry: FactorAuditEntry = {
      id: auditId(),
      at: nowIso(),
      action: 'role',
      factorId: 'role',
      factorLabel: next,
      reason: 'Cambio de rol local',
      user: userFor(next),
      role: next,
    };
    setAudit((current) => [entry, ...current]);
    void persistAudit(entry);
  }, []);

  const setThreshold = useCallback((value: number) => {
    const next = Math.min(100, Math.max(1, Math.round(value)));
    setThresholdState(next);
    try { localStorage.setItem(THRESHOLD_KEY, String(next)); } catch { /* noop */ }
  }, []);

  const backupJson = useCallback(() => exportBackup(custom, audit, role), [custom, audit, role]);
  const reload = useCallback(() => {
    setLoading(true);
    loadFactorStore().then((snapshot) => {
      setCustom(snapshot.factors);
      setAudit(snapshot.audit);
      setRoleState(snapshot.role);
      setStorage(snapshot.storage);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const value = useMemo<FactorValue>(() => ({
    catalog,
    custom,
    activeCustom,
    deleted,
    audit,
    role,
    setRole,
    threshold,
    setThreshold,
    loading,
    storage,
    baseUpdates,
    pendingApprovals,
    saveFactor,
    duplicateFactor,
    deleteFactor,
    restoreFactor,
    purgeFactor,
    restoreBase,
    approveFactor,
    revertVersion,
    importFactors,
    backupJson,
    reload,
  }), [
    catalog, custom, activeCustom, deleted, audit, role, setRole, threshold, setThreshold,
    loading, storage, baseUpdates, pendingApprovals, saveFactor, duplicateFactor, deleteFactor,
    restoreFactor, purgeFactor, restoreBase, approveFactor, revertVersion, importFactors,
    backupJson, reload,
  ]);

  return <FactorContext.Provider value={value}>{children}</FactorContext.Provider>;
}

export function useFactors(): FactorValue {
  const value = useContext(FactorContext);
  if (!value) throw new Error('useFactors debe usarse dentro de FactorProvider');
  return value;
}

export { baseCatalog };
