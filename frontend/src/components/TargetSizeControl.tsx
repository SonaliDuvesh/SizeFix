import React from "react";
import type { TargetUnit } from "../types";

interface TargetSizeControlProps {
  targetValue: string;
  targetUnit: TargetUnit;
  onValueChange: (val: string) => void;
  onUnitChange: (unit: TargetUnit) => void;
  originalSizeBytes?: number;
}

export const TargetSizeControl: React.FC<TargetSizeControlProps> = ({
  targetValue,
  targetUnit,
  onValueChange,
  onUnitChange,
}) => {
  const presets = [
    { label: "100 KB", value: "100", unit: "KB" as TargetUnit },
    { label: "200 KB", value: "200", unit: "KB" as TargetUnit },
    { label: "500 KB", value: "500", unit: "KB" as TargetUnit },
    { label: "1 MB", value: "1", unit: "MB" as TargetUnit },
    { label: "2 MB", value: "2", unit: "MB" as TargetUnit },
    { label: "5 MB", value: "5", unit: "MB" as TargetUnit },
  ];

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem" }}>
        Target File Size
      </label>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="number"
          step="any"
          min="0.1"
          placeholder="e.g. 500"
          value={targetValue}
          onChange={(e) => onValueChange(e.target.value)}
          className="sharp-input"
          style={{ flex: 2 }}
        />

        <select
          value={targetUnit}
          onChange={(e) => onUnitChange(e.target.value as TargetUnit)}
          className="sharp-select"
          style={{ flex: 1, fontWeight: 700 }}
        >
          <option value="KB">KB</option>
          <option value="MB">MB</option>
          <option value="GB">GB</option>
          <option value="B">Bytes</option>
        </select>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.6rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--secondary-text)", alignSelf: "center", marginRight: "0.2rem" }}>
          Presets:
        </span>
        {presets.map((preset) => {
          const isSelected = targetValue === preset.value && targetUnit === preset.unit;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                onValueChange(preset.value);
                onUnitChange(preset.unit);
              }}
              className="btn-secondary"
              style={{
                padding: "0.25rem 0.6rem",
                fontSize: "0.75rem",
                background: isSelected ? "var(--strong-raspberry)" : "var(--bg-card)",
                color: isSelected ? "#FFFFFF" : "var(--dark-text)",
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
