const DONE = '#2e7d32';
const LEFT = '#e8e2d6';

function clampRate(rate: number): number {
  if (!Number.isFinite(rate) || rate < 0) {
    return 0;
  }
  if (rate > 1) {
    return 1;
  }
  return rate;
}

/** Donut for completion. Time O(1). */
export function CompletionDonut({
  completionCount,
  memberCount,
  completionRate,
}: {
  completionCount: number;
  memberCount: number;
  completionRate: number;
}) {
  const rate = clampRate(completionRate);
  const pct = Math.round(rate * 100);
  const radius = 54;
  const stroke = 14;
  const c = 2 * Math.PI * radius;
  const doneLen = c * rate;
  const pending = Math.max(0, memberCount - completionCount);

  return (
    <figure className="stat-visual">
      <svg
        viewBox="0 0 140 140"
        className="donut"
        role="img"
        aria-label={`${pct}% completion, ${completionCount} of ${memberCount} members`}
      >
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={LEFT}
          strokeWidth={stroke}
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={DONE}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${doneLen} ${c - doneLen}`}
          transform="rotate(-90 70 70)"
        />
        <text
          x="70"
          y="66"
          textAnchor="middle"
          className="donut-pct"
        >
          {pct}%
        </text>
        <text
          x="70"
          y="86"
          textAnchor="middle"
          className="donut-label"
        >
          complete
        </text>
      </svg>
      <figcaption className="stat-caption">
        <strong>{completionCount}</strong> submitted ·{' '}
        <strong>{pending}</strong> waiting
        {memberCount > 0 ? ` of ${memberCount}` : ''}
      </figcaption>
    </figure>
  );
}

function ratingColor(average: number): string {
  if (average < 1.75) {
    return '#c62828';
  }
  if (average < 2.75) {
    return '#ef6c00';
  }
  if (average < 3.5) {
    return '#f9a825';
  }
  if (average < 4.25) {
    return '#7cb342';
  }
  return '#2e7d32';
}

function ratingWord(average: number): string {
  if (average < 1.75) {
    return 'Struggling';
  }
  if (average < 2.75) {
    return 'Low';
  }
  if (average < 3.5) {
    return 'Okay';
  }
  if (average < 4.25) {
    return 'Strong';
  }
  return 'Excellent';
}

/** Horizontal 1–5 gauge for rating averages. Time O(1). */
export function RatingGauge({
  average,
  count,
}: {
  average: number;
  count: number;
}) {
  const value = Number.isFinite(average)
    ? Math.min(5, Math.max(1, average))
    : 1;
  const color = ratingColor(value);
  const fillPct = ((value - 1) / 4) * 100;

  return (
    <div className="rating-gauge" aria-label={`Average ${value.toFixed(1)} of 5`}>
      <div className="rating-gauge-head">
        <span className="rating-score" style={{ color }}>
          {value.toFixed(1)}
        </span>
        <span className="rating-word" style={{ color }}>
          {ratingWord(value)}
        </span>
        <span className="muted rating-count">
          {count} answer{count === 1 ? '' : 's'}
        </span>
      </div>
      <div className="rating-track" aria-hidden="true">
        <div
          className="rating-fill"
          style={{ width: `${fillPct}%`, background: color }}
        />
        <div className="rating-ticks">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mini yes/no split bar. Time O(1). */
export function YesNoSplit({
  yes,
  no,
}: {
  yes: number;
  no: number;
}) {
  const total = yes + no;
  const yesPct = total === 0 ? 0 : (yes / total) * 100;
  return (
    <div
      className="yesno-split"
      aria-label={`${yes} yes, ${no} no`}
    >
      <div className="yesno-bar" aria-hidden="true">
        <div className="yesno-yes" style={{ width: `${yesPct}%` }} />
        <div className="yesno-no" style={{ width: `${100 - yesPct}%` }} />
      </div>
      <p className="stat-caption">
        <span className="yes-label">Yes {yes}</span>
        {' · '}
        <span className="no-label">No {no}</span>
        {total > 0 ? ` (${Math.round(yesPct)}% yes)` : ''}
      </p>
    </div>
  );
}
