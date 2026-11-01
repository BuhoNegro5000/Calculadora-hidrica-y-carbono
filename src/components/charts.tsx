import { useMemo, useState } from 'react';
import type { CategoryResult, FootprintResult } from '../engine/types';
import type { Lang } from '../engine/types';
import type { TrajectoryPoint } from '../engine/scenarios';
import { nf, smart, tonnes } from '../lib/format';

export interface Segment {
  id: string;
  label: string;
  value: number;
  color: string;
}

function arcPath(cx: number, cy: number, outer: number, inner: number, start: number, end: number): string {
  const a0 = start - Math.PI / 2;
  const a1 = end - Math.PI / 2;
  const large = end - start > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  const [x0, y0] = p(outer, a0);
  const [x1, y1] = p(outer, a1);
  const [x2, y2] = p(inner, a1);
  const [x3, y3] = p(inner, a0);
  return `M ${x0} ${y0} A ${outer} ${outer} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${inner} ${inner} 0 ${large} 0 ${x3} ${y3} Z`;
}

/* ── Dona simple ───────────────────────────────────────── */

export function Donut({
  segments, size = 240, thickness = 34, centerLabel, centerValue, centerHint, activeId, onActive, lang,
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  centerHint?: string;
  activeId?: string | null;
  onActive?: (id: string | null) => void;
  lang: Lang;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = (size - thickness) / 2;
  const inner = radius - thickness;
  const [internalActive, setInternalActive] = useState<string | null>(null);
  const active = activeId !== undefined ? activeId : internalActive;
  const setActive = onActive ?? setInternalActive;

  if (total <= 0) {
    return (
      <div className="chart-figure" style={{ minHeight: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="—">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        </svg>
        <div className="chart-center"><strong>0</strong><em>{lang === 'es' ? 'sin datos' : 'no data'}</em></div>
      </div>
    );
  }

  let cursor = 0;
  return (
    <div className="chart-figure" style={{ minHeight: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel}>
        <g>
          {segments.map((segment) => {
            const fraction = segment.value / total;
            const start = cursor * Math.PI * 2;
            cursor += fraction;
            const end = cursor * Math.PI * 2;
            const isActive = active === segment.id;
            return (
              <path
                key={segment.id}
                d={arcPath(
                  size / 2,
                  size / 2,
                  radius,
                  inner,
                  start,
                  Math.max(start + 0.0001, end),
                )}
                fill={segment.color}
                opacity={active && !isActive ? 0.55 : 1}
                tabIndex={0}
                role="button"
                aria-label={`${segment.label}: ${smart(segment.value, lang)}`}
                onMouseEnter={() => setActive(segment.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(segment.id)}
                onBlur={() => setActive(null)}
                style={{
                  transition: 'opacity 160ms ease, filter 160ms ease',
                  filter: isActive ? 'brightness(1.07) saturate(1.04)' : 'none',
                  cursor: 'pointer',
                }}
              />
            );
          })}
        </g>
      </svg>
      <div className="chart-center">
        {active ? (
          <>
            <small>{segments.find((segment) => segment.id === active)?.label}</small>
            <strong>{smart(segments.find((segment) => segment.id === active)?.value ?? 0, lang)}</strong>
            <em>{((segments.find((segment) => segment.id === active)?.value ?? 0) / total * 100).toFixed(0)} %</em>
          </>
        ) : (
          <>
            <small>{centerLabel}</small>
            <strong>{centerValue}</strong>
            <em>{centerHint}</em>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sunburst por alcance y categoría ──────────────────── */

const SCOPE_COLORS: Record<string, string> = {
  '1': 'var(--forest-500)',
  '2': 'var(--water-500)',
  '3': 'var(--amber-500)',
};

export function Sunburst({
  result, size = 300, lang, activeCategory, onActiveCategory,
}: {
  result: FootprintResult;
  size?: number;
  lang: Lang;
  activeCategory?: string | null;
  onActiveCategory?: (id: string | null) => void;
}) {
  const [internal, setInternal] = useState<string | null>(null);
  const active = activeCategory !== undefined ? activeCategory : internal;
  const setActive = onActiveCategory ?? setInternal;
  const total = result.totalKgCO2e;
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 4;
  const midRing = outer * 0.78;
  const innerRing = outer * 0.58;
  const hole = outer * 0.5;

  const scopes = useMemo(() => {
    const values = result.byScope;
    return [
      { id: '1', value: values['1'] },
      { id: '2', value: values['2'] },
      { id: '3', value: values['3'] },
    ].filter((scope) => scope.value > 0);
  }, [result.byScope]);

  const slices = useMemo(() => {
    let global = 0;
    const scopeSlices = scopes.map((scope) => {
      const start = global;
      const fraction = scope.value / (total || 1);
      global += fraction;
      return { ...scope, start, end: global, fraction };
    });

    const amounts = new Map<string, Record<string, number>>();
    for (const line of result.lines) {
      const entry = amounts.get(line.category) ?? { '1': 0, '2': 0, '3': 0 };
      entry[String(line.scope)] = (entry[String(line.scope)] ?? 0) + line.kgCO2e;
      amounts.set(line.category, entry);
    }

    const outerSlices: { category: CategoryResult; start: number; end: number; value: number }[] = [];
    for (const scopeSlice of scopeSlices) {
      let cursor = scopeSlice.start;
      for (const category of result.byCategory) {
        const value = amounts.get(category.id)?.[scopeSlice.id] ?? 0;
        if (value <= 0) continue;
        const fraction = value / (scopeSlice.value || 1);
        const start = cursor;
        cursor += fraction * scopeSlice.fraction;
        outerSlices.push({ category, start, end: cursor, value });
      }
    }
    return { scopeSlices, outerSlices };
  }, [result, scopes, total]);

  if (total <= 0) {
    return <div className="chart-figure" style={{ minHeight: size }}><div className="chart-center"><strong>0</strong><em>{lang === 'es' ? 'sin datos' : 'no data'}</em></div></div>;
  }

  const activeCat = result.byCategory.find((category) => category.id === active);

  return (
    <div className="chart-figure" style={{ minHeight: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={lang === 'es' ? 'Desglose por alcance y categoría' : 'Breakdown by scope and category'}>
        <circle cx={cx} cy={cy} r={outer + 2} fill="none" stroke="var(--line-soft)" />
        <circle cx={cx} cy={cy} r={hole - 2} fill="none" stroke="var(--line-soft)" />
        {slices.scopeSlices.map((scopeSlice) => (
          <path
            key={`scope-${scopeSlice.id}`}
            d={arcPath(cx, cy, midRing, innerRing, scopeSlice.start * Math.PI * 2, Math.max(scopeSlice.start * Math.PI * 2 + 0.0001, scopeSlice.end * Math.PI * 2))}
            fill={SCOPE_COLORS[scopeSlice.id]}
            opacity={0.26}
          />
        ))}
        {slices.outerSlices.map((slice) => {
          const isActive = active === slice.category.id;
          return (
            <path
              key={`${slice.category.id}-${slice.start}`}
              d={arcPath(
                cx,
                cy,
                outer,
                midRing + 3,
                slice.start * Math.PI * 2,
                Math.max(slice.start * Math.PI * 2 + 0.0001, slice.end * Math.PI * 2),
              )}
              fill={slice.category.color}
              opacity={active && !isActive ? 0.55 : 1}
              tabIndex={0}
              role="button"
              aria-label={`${slice.category.label[lang]}: ${smart(slice.value, lang)} kg CO₂e`}
              onMouseEnter={() => setActive(slice.category.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(slice.category.id)}
              onBlur={() => setActive(null)}
              style={{
                cursor: 'pointer',
                transition: 'opacity 160ms ease, filter 160ms ease',
                filter: isActive ? 'brightness(1.07) saturate(1.04)' : 'none',
              }}
            />
          );
        })}
        {slices.scopeSlices.map((scopeSlice) => {
          const mid = ((scopeSlice.start + scopeSlice.end) / 2) * Math.PI * 2;
          if (scopeSlice.fraction < 0.055) return null;
          const lr = (midRing + innerRing) / 2;
          return (
            <text
              key={`label-${scopeSlice.id}`}
              x={cx + Math.cos(mid - Math.PI / 2) * lr}
              y={cy + Math.sin(mid - Math.PI / 2) * lr}
              fill="var(--ink)"
              fontSize={size < 260 ? 8 : 9}
              fontFamily="var(--font-mono)"
              textAnchor="middle"
              dominantBaseline="middle"
              opacity={0.7}
            >
              {scopeSlice.id}
            </text>
          );
        })}
      </svg>
      <div className="chart-center">
        {activeCat ? (
          <>
            <small>{activeCat.label[lang]}</small>
            <strong>{smart(activeCat.kgCO2e / 1000, lang)}</strong>
            <em>t CO₂e · {nf(activeCat.percentage * 100, lang, 0)} %</em>
          </>
        ) : (
          <>
            <small>{lang === 'es' ? 'Total' : 'Total'}</small>
            <strong>{tonnes(total, lang)}</strong>
            <em>t CO₂e</em>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Trayectoria ───────────────────────────────────────── */

export function TrajectoryChart({
  points, lang, height = 280,
}: { points: TrajectoryPoint[]; lang: Lang; height?: number }) {
  if (points.length < 2) return null;
  const width = 720;
  const padding = { top: 22, right: 18, bottom: 34, left: 54 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...points.map((point) => point.baseline), 1);
  const x = (index: number) => padding.left + (index / (points.length - 1)) * innerW;
  const y = (value: number) => padding.top + innerH - (value / max) * innerH;
  const path = (key: 'baseline' | 'target' | 'scenario') => points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(point[key]).toFixed(1)}`)
    .join(' ');
  const years = points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 6) === 0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={lang === 'es' ? 'Trayectoria de reducción' : 'Reduction trajectory'} style={{ overflow: 'visible' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <g key={tick}>
          <line x1={padding.left} x2={width - padding.right} y1={y(max * tick)} y2={y(max * tick)} stroke="var(--line-soft)" strokeDasharray="2 5" />
          <text x={padding.left - 8} y={y(max * tick)} textAnchor="end" dominantBaseline="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink-faint)">
            {smart((max * tick) / 1000, lang)}
          </text>
        </g>
      ))}
      <text x={padding.left - 8} y={padding.top - 10} textAnchor="end" fontSize="8" fontFamily="var(--font-mono)" fill="var(--ink-faint)">t CO₂e</text>
      {years.map((point) => {
        const index = points.indexOf(point);
        return (
          <text key={point.year} x={x(index)} y={height - 10} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink-faint)">
            {point.year}
          </text>
        );
      })}
      <path d={path('baseline')} fill="none" stroke="var(--ink-300)" strokeWidth="1.5" strokeDasharray="4 5" />
      <path d={path('target')} fill="none" stroke="var(--forest-600)" strokeWidth="2" />
      <path d={path('scenario')} fill="none" stroke="var(--water-500)" strokeWidth="2.5" />
      {points.map((point, index) => (
        <g key={`dot-${point.year}`}>
          <circle cx={x(index)} cy={y(point.scenario)} r={index === 0 || index === points.length - 1 ? 4 : 2.2} fill="var(--water-500)" />
          <circle cx={x(index)} cy={y(point.target)} r={index === 0 || index === points.length - 1 ? 3.4 : 1.8} fill="var(--forest-600)" />
        </g>
      ))}
      <g>
        <line x1={x(points.length - 1)} x2={x(points.length - 1)} y1={y(points[points.length - 1].scenario)} y2={y(points[points.length - 1].target)} stroke="var(--amber)" strokeWidth="1.5" strokeDasharray="3 3" />
      </g>
    </svg>
  );
}

/* ── Barra de benchmark ────────────────────────────────── */

export function BenchmarkBar({
  value, reference, max, labelValue, labelRef,
}: { value: number; reference: number; max?: number; labelValue: string; labelRef: string }) {
  const ceiling = max ?? (Math.max(value, reference) * 1.25 || 1);
  const pct = Math.min(100, (value / ceiling) * 100);
  const refPct = Math.min(100, (reference / ceiling) * 100);
  return (
    <>
      <div className="bench-bar">
        <span className="fill" style={{ width: `${pct}%` }} />
        <span className="ref" style={{ left: `${refPct}%` }} />
      </div>
      <div className="bench-foot">
        <span>{labelValue}</span>
        <span>{labelRef}</span>
      </div>
    </>
  );
}
