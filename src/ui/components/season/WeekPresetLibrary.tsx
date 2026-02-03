import type { CSSProperties } from "react";
import type { WeekPreset } from "./presets";

type WeekPresetLibraryProps = {
  presets: WeekPreset[];
  onDragStart: (preset: WeekPreset) => void;
  onDragEnd: () => void;
  isBusy: boolean;
};

const focusColor: Record<string, string> = {
  base: "#3b82f6",
  deload: "#94a3b8",
  speed: "#22d3ee",
  "hill-power": "#f97316",
  mileage: "#22c55e",
  ultra: "#a855f7",
  heat: "#ef4444",
  taper: "#facc15",
  none: "#4b5563",
};

export default function WeekPresetLibrary({
  presets,
  onDragStart,
  onDragEnd,
  isBusy,
}: WeekPresetLibraryProps) {
  return (
    <div style={{ display: "grid", gap: "0.6rem" }}>
      {presets.map((preset) => {
        const accent = focusColor[preset.focus ?? "none"] ?? focusColor.none;
        return (
          <button
            key={preset.id}
            draggable={!isBusy}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", preset.id);
              onDragStart(preset);
            }}
            onDragEnd={onDragEnd}
            title={`${preset.name} · Focus: ${preset.focus ?? "None"} · Stress: ${preset.stress} · Volume: ${preset.volume} · Intensity: ${preset.intensity}`}
            style={{
              ...cardStyle,
              borderColor: accent,
              opacity: isBusy ? 0.6 : 1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{preset.name}</span>
              <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{preset.focus ?? "None"}</span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
              S:{preset.stress} · V:{preset.volume} · I:{preset.intensity}
            </div>
          </button>
        );
      })}
    </div>
  );
}

const cardStyle: CSSProperties = {
  padding: "0.6rem 0.75rem",
  borderRadius: "10px",
  border: "1px solid #1f2937",
  backgroundColor: "#0b1220",
  color: "#f5f5f5",
  textAlign: "left",
  cursor: "grab",
};
