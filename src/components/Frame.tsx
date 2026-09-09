import "./Frame.css";

/** Crosshair ticks scattered on the field, as registration marks. */
const MARKS: [number, number][] = [
  [12, 22],
  [88, 34],
  [26, 61],
  [72, 78],
  [46, 15],
  [93, 88],
];

export default function Frame() {
  return (
    <div className="frame" aria-hidden="true">
      {MARKS.map(([x, y]) => (
        <span key={`${x}-${y}`} className="frame-mark" style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
    </div>
  );
}
