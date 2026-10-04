import React from "react";
import type { TargetMode } from "../types";

interface TargetModeSelectorProps {
  mode: TargetMode;
  onModeChange: (mode: TargetMode) => void;
}

export const TargetModeSelector: React.FC<TargetModeSelectorProps> = ({ mode, onModeChange }) => {
  const modes: { id: TargetMode; label: string; desc: string }[] = [
    { id: "maximum", label: "Maximum Size", desc: "Guarantees file stays strictly below target" },
    { id: "exact", label: "Closest Size", desc: "Attempts to hit exact size without quality corruption" },
    { id: "range", label: "Size Range", desc: "Optimizes file within target tolerance band" },
  ];

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem" }}>
        Optimization Mode
      </label>

      <div className="segmented-group">
        {modes.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`segmented-item ${mode === item.id ? "active" : ""}`}
            onClick={() => onModeChange(item.id)}
            title={item.desc}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--secondary-text)", marginTop: "0.35rem", fontWeight: 600 }}>
        {modes.find((m) => m.id === mode)?.desc}
      </p>
    </div>
  );
};
