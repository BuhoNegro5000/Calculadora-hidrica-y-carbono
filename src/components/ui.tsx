import {
  useEffect, useId, useRef, useState, type ReactNode,
} from 'react';
import { Icon, type IconName } from './Icons';
import { useI18n } from '../i18n';
import { publicAsset } from '../lib/assets';

/* ── Animación de cifras ────────────────────────────────── */

export function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValue(target);
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    cancelAnimationFrame(frameRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

/* ── Progreso ───────────────────────────────────────────── */

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ ['--pct' as string]: `${pct}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 58, label }: { value: number; size?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="progress-ring" style={{ ['--size' as string]: `${size}px` }} role="img" aria-label={label ?? `${Math.round(pct)} %`}>
      <svg viewBox="0 0 60 60" width={size} height={size}>
        <circle className="track" cx="30" cy="30" r={radius} fill="none" strokeWidth="5" />
        <circle
          className="fill"
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
        />
      </svg>
      <span className="progress-ring__label">{Math.round(pct)}%</span>
    </div>
  );
}

/* ── Etiquetas ──────────────────────────────────────────── */

export function Chip({ children, tone = 'default', className = '' }: { children: ReactNode; tone?: 'default' | 'accent' | 'water' | 'warn'; className?: string }) {
  const cls = tone === 'accent'
    ? 'chip chip-accent'
    : tone === 'water'
      ? 'chip chip-water'
      : tone === 'warn'
        ? 'chip chip-warn'
        : 'chip';
  return <span className={`${cls} ${className}`.trim()}>{children}</span>;
}

export function Badge({ children, tone = 'default', dot = false }: { children: ReactNode; tone?: 'default' | 'ok' | 'warn' | 'danger' | 'info'; dot?: boolean }) {
  const cls = tone === 'default' ? 'badge' : `badge badge-${tone}`;
  return <span className={cls}>{dot && <span className="dot" />}{children}</span>;
}

/* ── Ayuda contextual ───────────────────────────────────── */

export function HelpTip({ text }: { text: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className={`tip ${open ? 'open' : ''}`}>
      <button
        type="button"
        aria-label={text}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((current) => !current)}
        onBlur={() => setOpen(false)}
      >
        <Icon name="info" size={13} />
      </button>
      <span className="tip-body" id={id} role="tooltip" aria-hidden={!open}>{text}</span>
    </span>
  );
}

/* ── Cabecera de sección ───────────────────────────────── */

export function SectionHead({
  eyebrow, title, lede, aside,
}: { eyebrow?: string; title: ReactNode; lede?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {aside}
    </div>
  );
}

/* ── Vacío ──────────────────────────────────────────────── */

export function EmptyState({
  icon = 'compass', title, text, action,
}: { icon?: IconName; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="feature-icon"><Icon name={icon} size={22} /></span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}

/* ── Búho reactivo ─────────────────────────────────────── */

export function OwlFigure({
  level = 'low', size = 120, className = '',
}: { level?: 'low' | 'medium' | 'high'; size?: number; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={`owl-figure ${level} ${className}`.trim()} style={{ width: size, height: size }}>
      <span className="owl-halo" aria-hidden="true" />
      <img src={publicAsset('brand-emblem.webp')} alt={t('app.name')} width={size} height={size} loading="lazy" />
    </div>
  );
}

/* ── Botón copiar ──────────────────────────────────────── */

export function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch { /* permisos del portapapeles */ }
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={15} />
      {copied ? copiedLabel : label}
    </button>
  );
}

/* ── Switch ────────────────────────────────────────────── */

export function Switch({
  checked, onChange, label, description,
}: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="track" aria-hidden="true" />
      <span>
        {label}
        {description && <span className="small muted" style={{ display: 'block', fontWeight: 500 }}>{description}</span>}
      </span>
    </label>
  );
}

/* ── Botones segmentados ───────────────────────────────── */

export function Segmented<T extends string>({
  value, options, onChange, label,
}: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label?: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ── Mini tarjeta de dato ──────────────────────────────── */

export function Datum({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="datum">
      <small>{label}</small>
      <strong>{value}</strong>
      {hint && <span className="tiny muted">{hint}</span>}
    </div>
  );
}

/* ── Confirmación inline ───────────────────────────────── */

export function useConfirm(): [boolean, () => void, () => void] {
  const [open, setOpen] = useState(false);
  return [open, () => setOpen(true), () => setOpen(false)];
}
