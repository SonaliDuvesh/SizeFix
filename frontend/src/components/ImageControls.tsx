import React, { useState } from "react";
import { Sliders, ChevronDown, ChevronUp } from "lucide-react";
import type { ImageDimensions } from "../types";

interface ImageControlsProps {
  quality: number;
  onQualityChange: (q: number) => void;
  width: string;
  height: string;
  onWidthChange: (w: string) => void;
  onHeightChange: (h: string) => void;
  maintainAspect: boolean;
  onMaintainAspectChange: (val: boolean) => void;
  outputFormat: string;
  onOutputFormatChange: (fmt: string) => void;
  originalDimensions?: ImageDimensions;
  removeMetadata: boolean;
  onRemoveMetadataChange: (val: boolean) => void;
  progressive: boolean;
  onProgressiveChange: (val: boolean) => void;
}

export const ImageControls: React.FC<ImageControlsProps> = ({
  quality,
  onQualityChange,
  width,
  height,
  onWidthChange,
  onHeightChange,
  maintainAspect,
  onMaintainAspectChange,
  outputFormat,
  onOutputFormatChange,
  originalDimensions,
  removeMetadata,
  onRemoveMetadataChange,
  progressive,
  onProgressiveChange,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleScalePreset = (factor: number) => {
    if (!originalDimensions) return;
    const newW = Math.round(originalDimensions.width * factor);
    const newH = Math.round(originalDimensions.height * factor);
    onWidthChange(String(newW));
    onHeightChange(String(newH));
  };

  const handleWidthInput = (val: string) => {
    onWidthChange(val);
    if (maintainAspect && originalDimensions && val) {
      const numW = parseFloat(val);
      if (!isNaN(numW) && originalDimensions.width > 0) {
        const aspect = originalDimensions.height / originalDimensions.width;
        onHeightChange(String(Math.round(numW * aspect)));
      }
    }
  };

  const handleHeightInput = (val: string) => {
    onHeightChange(val);
    if (maintainAspect && originalDimensions && val) {
      const numH = parseFloat(val);
      if (!isNaN(numH) && originalDimensions.height > 0) {
        const aspect = originalDimensions.width / originalDimensions.height;
        onWidthChange(String(Math.round(numH * aspect)));
      }
    }
  };

  return (
    <div className="box-card-subtle mb-4">
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <Sliders size={18} color="var(--strong-raspberry)" />
        <h3 style={{ fontSize: "0.95rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          Image Tuning & Conversion
        </h3>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 700 }}>Quality Ceiling</label>
          <span className="mono" style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--strong-raspberry)" }}>
            {quality}%
          </span>
        </div>
        <input
          type="range"
          min="5"
          max="100"
          value={quality}
          onChange={(e) => onQualityChange(Number(e.target.value))}
          className="sharp-range"
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--secondary-text)", marginTop: "0.2rem" }}>
          <span>Smallest size (5%)</span>
          <span>Balanced (75%)</span>
          <span>Max Quality (100%)</span>
        </div>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.4rem" }}>
          Resolution / Dimensions
        </label>
        
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--secondary-text)", fontWeight: 600 }}>W (px)</span>
            <input
              type="number"
              placeholder={originalDimensions ? String(originalDimensions.width) : "Width"}
              value={width}
              onChange={(e) => handleWidthInput(e.target.value)}
              className="sharp-input"
            />
          </div>
          <span style={{ fontWeight: 800, alignSelf: "flex-end", marginBottom: "0.6rem" }}>×</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--secondary-text)", fontWeight: 600 }}>H (px)</span>
            <input
              type="number"
              placeholder={originalDimensions ? String(originalDimensions.height) : "Height"}
              value={height}
              onChange={(e) => handleHeightInput(e.target.value)}
              className="sharp-input"
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
          <label className="sharp-checkbox-label">
            <input
              type="checkbox"
              checked={maintainAspect}
              onChange={(e) => onMaintainAspectChange(e.target.checked)}
              className="sharp-checkbox"
            />
            <span>Maintain aspect ratio</span>
          </label>

          {originalDimensions && (
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {[1, 0.75, 0.5, 0.25].map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => handleScalePreset(scale)}
                  className="btn-secondary"
                  style={{ padding: "0.15rem 0.4rem", fontSize: "0.7rem" }}
                >
                  {scale * 100}%
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem" }}>
          Output Format
        </label>
        <select
          value={outputFormat}
          onChange={(e) => onOutputFormatChange(e.target.value)}
          className="sharp-select"
        >
          <option value="original">Original Format</option>
          
          <optgroup label="── IMAGE FORMATS ──">
            <option value="jpg">JPG / JPEG (.jpg) - Standard Photos</option>
            <option value="png">PNG (.png) - Lossless & Transparency</option>
            <option value="webp">WEBP (.webp) - Modern Compact Web</option>
            <option value="avif">AVIF (.avif) - Next-Gen Compression</option>
            <option value="heic">HEIC / HEIF (.heic) - iPhone/iOS Format</option>
            <option value="gif">GIF (.gif) - Graphics</option>
            <option value="bmp">BMP (.bmp) - Bitmap</option>
            <option value="tiff">TIFF (.tiff) - Print & Archival</option>
          </optgroup>

          <optgroup label="── DOCUMENT FORMATS ──">
            <option value="pdf">PDF (.pdf) - Convert Image to Document</option>
          </optgroup>
        </select>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: "none",
            border: "none",
            color: "var(--strong-raspberry)",
            fontWeight: 700,
            fontSize: "0.8rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            padding: "0.2rem 0",
          }}
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
        </button>

        {showAdvanced && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px dashed var(--border-subtle)" }}>
            <label className="sharp-checkbox-label">
              <input
                type="checkbox"
                checked={removeMetadata}
                onChange={(e) => onRemoveMetadataChange(e.target.checked)}
                className="sharp-checkbox"
              />
              <span>Strip EXIF & location metadata (Privacy + Size reduction)</span>
            </label>

            <label className="sharp-checkbox-label">
              <input
                type="checkbox"
                checked={progressive}
                onChange={(e) => onProgressiveChange(e.target.checked)}
                className="sharp-checkbox"
              />
              <span>Progressive encoding (Faster visual loading)</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
