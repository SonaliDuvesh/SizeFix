import React, { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

interface ProcessingStateProps {
  category: string;
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({ category }) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  const stages = category === "document"
    ? [
        "Analyzing PDF document structure...",
        "Inspecting embedded images and fonts...",
        "Applying stream deflation & garbage collection...",
        "Recompressing images to match target size...",
        "Finalizing linearized PDF...",
      ]
    : [
        "Analyzing image color palette & bit-depth...",
        "Evaluating multi-pass quality matrix...",
        "Applying Lanczos adaptive resampling...",
        "Executing binary-search compression encoder...",
        "Finalizing optimized file...",
      ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return 92;
        return prev + Math.floor(Math.random() * 12) + 5;
      });

      setStageIndex((prev) => {
        if (prev < stages.length - 1) return prev + 1;
        return prev;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [stages.length]);

  return (
    <div className="box-card mb-6" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.2rem", maxWidth: "540px", margin: "0 auto" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Loader2 size={24} color="var(--strong-raspberry)" style={{ animation: "spin 1s linear infinite" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            OPTIMIZING FILE...
          </h3>
          <Sparkles size={18} color="var(--strong-raspberry)" />
        </div>

        <div className="sharp-progress-track">
          <div className="sharp-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: "0.85rem", fontWeight: 700 }}>
          <span style={{ color: "var(--strong-raspberry)" }}>
            {stages[stageIndex]}
          </span>
          <span className="mono" style={{ color: "var(--dark-text)" }}>
            {progress}%
          </span>
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--secondary-text)", fontWeight: 600 }}>
          Processing locally on your device with native machine speed
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
