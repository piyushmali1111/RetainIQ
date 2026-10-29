import type { ShapFactor } from "../lib/types";
export function ShapExplainerBar({ factors }: { factors: ShapFactor[] }) {
  const max = Math.max(1, ...factors.map((f) => Math.abs(f.points)));
  return (
    <div className="factors">
      {factors.slice(0, 5).map((f) => (
        <div key={f.feature} className="factor">
          <div className="factor-label">
            <span>{f.label}</span>
            <span>
              {f.points > 0 ? "+" : ""}
              {f.points.toFixed(1)} pts
            </span>
          </div>
          <div className="factor-track">
            <i
              style={{
                width: Math.max(3, (Math.abs(f.points) / max) * 100) + "%",
                background:
                  f.points > 0
                    ? "linear-gradient(90deg,#ffacb7,#ff617b)"
                    : "#24bc9a",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
