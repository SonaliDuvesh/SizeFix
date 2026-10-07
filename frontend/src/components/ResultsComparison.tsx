import React, { useState } from "react";
import { AlertCircle, Download, RefreshCw, Copy, CheckCheck } from "lucide-react";
import confetti from "canvas-confetti";
import type { ProcessResult } from "../types";
import { ApiService } from "../services/api";

interface ResultsComparisonProps {
  result: ProcessResult;
  originalPreviewUrl?: string;
  onReset: () => void;
}

export const ResultsComparison: React.FC<ResultsComparisonProps> = ({
  result,
  originalPreviewUrl,
  onReset,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (result.target_reached || result.saved_bytes > 0) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#E94F7A", "#C92F5B", "#FFD6E2", "#8F2045"],
      });
    }
  }, [result]);

  const downloadUrl =
    result.blob_url ||
    result.download_url ||
    (result.output_file_id ? ApiService.getDownloadUrl(result.output_file_id) : "");

  const isImage = result.format !== "pdf";
  const isExpanded = (result.saved_bytes ?? 0) < 0 || result.output_size > result.original_size;
  const absPct = Math.abs(result.compression_ratio * 100).toFixed(1);

  const handleCopyInfo = () => {
    const text = `SizeFix Optimization: ${result.original_filename} (${result.original_size_human}) -> ${result.output_size_human} (${isExpanded ? `+${absPct}% larger` : `${absPct}% smaller`})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="box-card mb-6" style={{ padding: "1.75rem" }}>
      
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          background: result.target_reached ? "var(--accent-success-bg)" : "var(--soft-pink-1)",
          color: result.target_reached ? "var(--accent-success)" : "var(--dark-text)",
          border: `2px solid ${result.target_reached ? "var(--accent-success)" : "var(--border-color)"}`,
          padding: "0.85rem 1.25rem",
          boxShadow: "2px 2px 0px var(--border-color)",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {result.target_reached ? (
            <div style={{ background: "var(--accent-success)", color: "#FFFFFF", padding: "2px 6px", fontWeight: 900 }}>
              ✓
            </div>
          ) : (
            <AlertCircle size={20} color="var(--strong-raspberry)" />
          )}

          <span style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.95rem" }}>
            {result.target_reached
              ? `TARGET REACHED - ${result.output_size_human} ${result.target_size_human ? `/ ${result.target_size_human}` : ""}`
              : `TARGET ESTIMATE - ${result.output_size_human} (${result.reason || "Optimal encoding reached"})`}
          </span>
        </div>

        {result.target_size_human && (
          <span className="mono" style={{ fontSize: "0.8rem", fontWeight: 700 }}>
            Mode: {result.mode.toUpperCase()}
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <div className="box-card-subtle">
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--secondary-text)", textTransform: "uppercase" }}>
            ORIGINAL FILE
          </span>
          <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 900, marginTop: "0.2rem" }}>
            {result.original_size_human}
          </div>
          {result.original_width && result.original_height && (
            <span style={{ fontSize: "0.8rem", color: "var(--secondary-text)", fontWeight: 600 }}>
              {result.original_width} × {result.original_height} px
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--strong-raspberry)",
            color: "#FFFFFF",
            border: "2px solid var(--border-color)",
            padding: "0.5rem",
            boxShadow: "2px 2px 0px var(--border-color)",
          }}
        >
          <span style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>
            {isExpanded ? "EXPANDED" : "SAVED"}
          </span>
          <span className="mono" style={{ fontSize: "1.3rem", fontWeight: 900 }}>
            {result.saved_bytes_human}
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              background: "var(--bg-card)",
              color: "var(--strong-raspberry)",
              border: "1.5px solid var(--border-color)",
              padding: "1px 6px",
              marginTop: "2px",
            }}
          >
            {isExpanded ? `+${absPct}% LARGER` : `${absPct}% SMALLER`}
          </span>
        </div>

        <div className="box-card-subtle" style={{ borderColor: "var(--strong-raspberry)", borderLeftWidth: "6px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--strong-raspberry)", textTransform: "uppercase" }}>
            OPTIMIZED FILE
          </span>
          <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--strong-raspberry)", marginTop: "0.2rem" }}>
            {result.output_size_human}
          </div>
          {result.width && result.height && (
            <span style={{ fontSize: "0.8rem", color: "var(--secondary-text)", fontWeight: 600 }}>
              {result.width} × {result.height} px ({result.format.toUpperCase()})
            </span>
          )}
          {result.pages && (
            <span style={{ fontSize: "0.8rem", color: "var(--secondary-text)", fontWeight: 600 }}>
              {result.pages} Pages • Deflated & Cleaned
            </span>
          )}
        </div>
      </div>

      {isImage && originalPreviewUrl && downloadUrl && (
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Visual Quality Inspection
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--secondary-text)", fontWeight: 600 }}>
              Drag slider to compare Original vs Optimized
            </span>
          </div>

          <div
            style={{
              position: "relative",
              height: "300px",
              border: "2px solid var(--border-color)",
              boxShadow: "3px 3px 0px var(--border-color)",
              overflow: "hidden",
              background: "#222",
            }}
          >
            <img
              src={downloadUrl}
              alt="Optimized Preview"
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />

            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: `${sliderPosition}%`,
                overflow: "hidden",
                borderRight: "3px solid var(--primary-pink)",
              }}
            >
              <img
                src={originalPreviewUrl}
                alt="Original Preview"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  minWidth: "100%",
                }}
              />
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "ew-resize",
                zIndex: 10,
              }}
            />

            <div style={{ position: "absolute", top: 10, left: 10, pointerEvents: "none" }}>
              <span className="sharp-tag" style={{ background: "rgba(0,0,0,0.75)", color: "#FFFFFF", borderColor: "#FFF" }}>
                Original ({result.original_size_human})
              </span>
            </div>
            <div style={{ position: "absolute", top: 10, right: 10, pointerEvents: "none" }}>
              <span className="sharp-tag sharp-tag-raspberry">
                Optimized ({result.output_size_human})
              </span>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          paddingTop: "1.25rem",
          borderTop: "2px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", flex: 1, minWidth: "260px" }}>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={`optimized_${result.original_filename}`}
              className="btn-primary"
              style={{ padding: "0.85rem 1.75rem", fontSize: "1rem", flex: "1 1 auto" }}
            >
              <Download size={20} />
              DOWNLOAD OPTIMIZED FILE
            </a>
          )}

          <button
            type="button"
            onClick={handleCopyInfo}
            className="btn-secondary"
            title="Copy optimization summary"
            style={{ flex: "0 1 auto" }}
          >
            {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
            {copied ? "COPIED" : "COPY DETAILS"}
          </button>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="btn-secondary"
          style={{ width: "auto" }}
        >
          <RefreshCw size={16} /> PROCESS ANOTHER FILE
        </button>
      </div>
    </div>
  );
};
