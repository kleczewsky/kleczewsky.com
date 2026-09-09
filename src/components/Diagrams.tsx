const RULE = "var(--rule-solid)";
const DIM = "var(--ink-faint)";
const HOT = "var(--primary)";

function Node({
  x,
  y,
  w = 44,
  h = 22,
  label,
  hot,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  hot?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="3"
        fill={hot ? "var(--primary-wash)" : "var(--panel-raised)"}
        stroke={hot ? HOT : RULE}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + 3.2}
        textAnchor="middle"
        fontSize="8"
        fontFamily="var(--f-mono)"
        fill={hot ? HOT : DIM}
      >
        {label}
      </text>
    </g>
  );
}

/** Backend: a request, the answer, and the three things that have to
    hold while it happens. */
function Backend() {
  return (
    <svg
      viewBox="0 0 260 132"
      role="img"
      aria-label="A request served by the application, with queue, database and payments behind it"
    >
      <g strokeWidth="1" fill="none">
        <path d="M60 66 H96" stroke={RULE} />
        <path d="M154 66 H176 M176 66 V26 H196" stroke={RULE} />
        <path d="M176 66 H196" stroke={RULE} />
        <path d="M176 66 V106 H196" stroke={RULE} />
      </g>
      <Node x={12} y={55} label="HTTP" />
      <Node x={96} y={52} w={58} h={28} label="APP" hot />
      <Node x={196} y={15} label="QUEUE" />
      <Node x={196} y={55} label="DB" />
      <Node x={196} y={95} label="PAY" />
      <circle cx="176" cy="66" r="2.5" fill={HOT} />
    </svg>
  );
}

/** Frontend: a widget rendering correctly inside a stranger's page. */
function Frontend() {
  return (
    <svg
      viewBox="0 0 260 132"
      role="img"
      aria-label="An embedded widget rendering inside a third-party page"
    >
      <rect x="12" y="12" width="236" height="108" rx="4" fill="var(--panel-sunk)" stroke={RULE} />
      <path d="M12 30 H248" stroke={RULE} strokeWidth="1" />
      {[22, 30, 38].map((cx) => (
        <circle key={cx} cx={cx} cy="21" r="2.5" fill={RULE} />
      ))}
      {[44, 56, 68].map((y, i) => (
        <rect
          key={y}
          x="24"
          y={y}
          width={[76, 60, 68][i]}
          height="5"
          rx="2"
          fill={RULE}
          opacity="0.5"
        />
      ))}
      {[86, 98].map((y, i) => (
        <rect
          key={y}
          x="24"
          y={y}
          width={[52, 70][i]}
          height="5"
          rx="2"
          fill={RULE}
          opacity="0.5"
        />
      ))}
      <rect
        x="126"
        y="42"
        width="108"
        height="64"
        rx="3"
        fill="var(--primary-wash)"
        stroke={HOT}
        strokeDasharray="3 3"
      />
      <text x="180" y="70" textAnchor="middle" fontSize="9" fontFamily="var(--f-mono)" fill={HOT}>
        WIDGET
      </text>
      <text x="180" y="86" textAnchor="middle" fontSize="7" fontFamily="var(--f-mono)" fill={DIM}>
        THEIR CSS
      </text>
    </svg>
  );
}

/** Takeover: a tangle on the left, the same system ordered on the
    right. */
function Takeover() {
  const tangle: [number, number][] = [
    [26, 30],
    [72, 58],
    [34, 88],
    [80, 24],
    [58, 100],
  ];
  return (
    <svg
      viewBox="0 0 260 132"
      role="img"
      aria-label="A tangled system on the left, the same system ordered on the right"
    >
      <g stroke={RULE} strokeWidth="1" fill="none" opacity="0.85">
        <path d="M26 30 L72 58 L34 88 L80 24 L58 100 L26 30" />
        <path d="M72 58 L58 100" />
      </g>
      {tangle.map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="4.5"
          fill="var(--panel-raised)"
          stroke={RULE}
        />
      ))}

      <path d="M104 66 H150" stroke={HOT} strokeWidth="1" />
      <path d="M144 61 L150 66 L144 71" stroke={HOT} strokeWidth="1" fill="none" />

      <g stroke={RULE} strokeWidth="1" fill="none">
        <path d="M188 30 H214 M188 54 H214 M188 78 H214 M188 102 H214" />
        <path d="M214 30 V102" />
      </g>
      {[30, 54, 78, 102].map((cy) => (
        <circle key={cy} cx="188" cy={cy} r="4.5" fill="var(--panel-raised)" stroke={RULE} />
      ))}
      <circle cx="214" cy="66" r="5.5" fill="var(--primary-wash)" stroke={HOT} />
    </svg>
  );
}

const DIAGRAMS = { backend: Backend, frontend: Frontend, takeover: Takeover };

export type DiagramKind = keyof typeof DIAGRAMS;

export function Diagram({ kind }: { kind: DiagramKind }) {
  const Picture = DIAGRAMS[kind];
  return <Picture />;
}

/** Watermark behind the work slab: a skyline from a seeded PRNG, so
    each study gets its own and it is identical on every load. */
export function SkylineMark({ seed }: { seed: number }) {
  let s = seed * 2654435761;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  const W = 600;
  const H = 200;
  const points: string[] = ["0,200"];
  let x = 0;
  let last = 150;
  while (x < W) {
    const w = 14 + rnd() * 42;
    const h = Math.max(40, Math.min(184, last + (rnd() - 0.5) * 110));
    points.push(`${x},${H - h}`, `${x + w},${H - h}`);
    last = h;
    x += w;
  }
  points.push(`${W},200`);

  return (
    <svg viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--rule-solid)"
        strokeWidth="1"
        opacity="0.5"
      />
    </svg>
  );
}
