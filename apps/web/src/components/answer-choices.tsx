const RATING_OPTIONS = [
  { value: 1, label: '1 — very negative', color: '#c62828' },
  { value: 2, label: '2 — negative', color: '#ef6c00' },
  { value: 3, label: '3 — neutral', color: '#f9a825' },
  { value: 4, label: '4 — positive', color: '#7cb342' },
  { value: 5, label: '5 — very positive', color: '#2e7d32' },
] as const;

function SmileyIcon({ value, color }: { value: number; color: string }) {
  const mouth =
    value === 1
      ? 'M10 20c2.2-2.8 5.2-4.2 8-4.2S23.8 17.2 26 20'
      : value === 2
        ? 'M11 19c1.8-1.6 4-2.4 7-2.4s5.2.8 7 2.4'
        : value === 3
          ? 'M11 18.5h14'
          : value === 4
            ? 'M10 17c2.2 2.4 5.2 3.6 8 3.6s5.8-1.2 8-3.6'
            : 'M9 16c2.8 3.6 6.4 5.4 9 5.4s6.2-1.8 9-5.4';

  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className="choice-icon">
      <circle cx="18" cy="18" r="16" fill={color} />
      <circle cx="12.5" cy="14" r="2.2" fill="#1d1b16" />
      <circle cx="23.5" cy="14" r="2.2" fill="#1d1b16" />
      <path
        d={mouth}
        fill="none"
        stroke="#1d1b16"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TickIcon() {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className="choice-icon">
      <circle cx="18" cy="18" r="16" fill="#2e7d32" />
      <path
        d="M10 18.5l5 5 11-12"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className="choice-icon">
      <circle cx="18" cy="18" r="16" fill="#c62828" />
      <path
        d="M12 12l12 12M24 12L12 24"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RatingChoices({
  name,
  value,
  onChange,
}: {
  name: string;
  value?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="choice-row" role="radiogroup" aria-label="Rating from 1 to 5">
      {RATING_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={selected ? 'choice selected' : 'choice'}
            title={option.label}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              required={value === undefined}
            />
            <SmileyIcon value={option.value} color={option.color} />
            <span className="choice-caption">{option.value}</span>
          </label>
        );
      })}
    </div>
  );
}

export function YesNoChoices({
  name,
  value,
  onChange,
}: {
  name: string;
  value?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="choice-row" role="radiogroup" aria-label="Yes or no">
      <label
        className={value === true ? 'choice selected' : 'choice'}
        title="Yes"
      >
        <input
          type="radio"
          name={name}
          value="true"
          checked={value === true}
          onChange={() => onChange(true)}
          required={value === undefined}
        />
        <TickIcon />
        <span className="choice-caption">Yes</span>
      </label>
      <label
        className={value === false ? 'choice selected' : 'choice'}
        title="No"
      >
        <input
          type="radio"
          name={name}
          value="false"
          checked={value === false}
          onChange={() => onChange(false)}
          required={value === undefined}
        />
        <CrossIcon />
        <span className="choice-caption">No</span>
      </label>
    </div>
  );
}
