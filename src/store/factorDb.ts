/**
 * Persistencia de la capa personalizada.
 * Fuente de verdad: IndexedDB. Espejo: localStorage para lectura inmediata y
 * respaldo. Si IndexedDB no está disponible (modo privado, navegador antiguo),
 * la app sigue funcionando con localStorage y lo declara en la interfaz.
 */

import type { FactorAuditEntry, FactorRecord, FactorRole } from '../engine/factorTypes';

const DB_NAME = 'gol-factors';
const DB_VERSION = 1;
const STORE_FACTORS = 'factors';
const STORE_AUDIT = 'audit';
const STORE_META = 'meta';

const MIRROR = {
  factors: 'gol.factors.custom.v1',
  audit: 'gol.factors.audit.v1',
  role: 'gol.factors.role.v1',
} as const;

export interface FactorStoreSnapshot {
  factors: FactorRecord[];
  audit: FactorAuditEntry[];
  role: FactorRole;
  storage: 'indexeddb' | 'localstorage';
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin cuota o modo privado */ }
}

export function readFactorMirror(): FactorStoreSnapshot {
  const factors = readJson<FactorRecord[]>(MIRROR.factors);
  const audit = readJson<FactorAuditEntry[]>(MIRROR.audit);
  const role = readJson<FactorRole>(MIRROR.role);
  return {
    factors: Array.isArray(factors) ? factors : [],
    audit: Array.isArray(audit) ? audit : [],
    role: role === 'reader' || role === 'editor' || role === 'admin' ? role : 'admin',
    storage: 'localstorage',
  };
}

function mirrorFactors(factors: FactorRecord[]): void { writeJson(MIRROR.factors, factors); }
function mirrorAudit(audit: FactorAuditEntry[]): void { writeJson(MIRROR.audit, audit); }
export function mirrorRole(role: FactorRole): void { writeJson(MIRROR.role, role); }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_FACTORS)) db.createObjectStore(STORE_FACTORS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_AUDIT)) db.createObjectStore(STORE_AUDIT, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB'));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Error de IndexedDB'));
  });
}

async function getAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(store, 'readonly');
    return await requestToPromise(tx.objectStore(store).getAll() as IDBRequest<T[]>);
  } finally {
    db.close();
  }
}

async function put<T>(store: string, value: T): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(store, 'readwrite');
    await requestToPromise(tx.objectStore(store).put(value as unknown as { id: string }));
  } finally {
    db.close();
  }
}

async function remove(store: string, id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(store, 'readwrite');
    await requestToPromise(tx.objectStore(store).delete(id));
  } finally {
    db.close();
  }
}

export async function loadFactorStore(): Promise<FactorStoreSnapshot> {
  const mirror = readFactorMirror();
  try {
    const [factors, audit, meta] = await Promise.all([
      getAll<FactorRecord>(STORE_FACTORS),
      getAll<FactorAuditEntry>(STORE_AUDIT),
      getAll<{ id: string; value: unknown }>(STORE_META),
    ]);
    const storedRole = meta.find((item) => item.id === 'role')?.value;
    const role: FactorRole = storedRole === 'reader' || storedRole === 'editor' || storedRole === 'admin'
      ? storedRole
      : mirror.role;
    if (factors.length === 0 && mirror.factors.length > 0) {
      // Primera ejecución tras actualizar: sembrar IndexedDB desde el espejo.
      await Promise.all(mirror.factors.map((factor) => put(STORE_FACTORS, factor)));
      await Promise.all(mirror.audit.map((entry) => put(STORE_AUDIT, entry)));
      await put(STORE_META, { id: 'role', value: role });
      return { ...mirror, role };
    }
    return {
      factors,
      audit,
      role,
      storage: 'indexeddb',
    };
  } catch {
    return mirror;
  }
}

export async function persistFactor(record: FactorRecord): Promise<void> {
  try { await put(STORE_FACTORS, record); } catch { /* el espejo sigue disponible */ }
}

export async function persistFactors(records: FactorRecord[]): Promise<void> {
  await Promise.all(records.map((record) => persistFactor(record)));
}

export async function purgeFactor(id: string): Promise<void> {
  try { await remove(STORE_FACTORS, id); } catch { /* noop */ }
}

export async function persistAudit(entry: FactorAuditEntry): Promise<void> {
  try { await put(STORE_AUDIT, entry); } catch { /* noop */ }
}

export async function persistAudits(entries: FactorAuditEntry[]): Promise<void> {
  await Promise.all(entries.map((entry) => persistAudit(entry)));
}

export async function persistRole(role: FactorRole): Promise<void> {
  mirrorRole(role);
  try { await put(STORE_META, { id: 'role', value: role }); } catch { /* noop */ }
}

export function saveMirror(factors: FactorRecord[], audit: FactorAuditEntry[], role: FactorRole): void {
  mirrorFactors(factors);
  mirrorAudit(audit);
  mirrorRole(role);
}

export function exportBackup(factors: FactorRecord[], audit: FactorAuditEntry[], role: FactorRole): string {
  return JSON.stringify({
    schema: 'green-owl-labs/factor-backup@1',
    exportedAt: new Date().toISOString(),
    role,
    factors,
    audit,
  }, null, 2);
}
