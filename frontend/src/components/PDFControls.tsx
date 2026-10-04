import React from "react";
import { FileCode } from "lucide-react";

interface PDFControlsProps {
  outputFormat: string;
  onOutputFormatChange: (fmt: string) => void;
  compressionLevel: "low" | "balanced" | "maximum";
  onCompressionLevelChange: (lvl: "low" | "balanced" | "maximum") => void;
  optimizeImages: boolean;
  onOptimizeImagesChange: (val: boolean) => void;
  removeMetadata: boolean;
  onRemoveMetadataChange: (val: boolean) => void;
  preserveText: boolean;
  onPreserveTextChange: (val: boolean) => void;
}

export const PDFControls: React.FC<PDFControlsProps> = ({
  outputFormat,
  onOutputFormatChange,
  compressionLevel,
  onCompressionLevelChange,
  optimizeImages,
  onOptimizeImagesChange,
  removeMetadata,
  onRemoveMetadataChange,
  preserveText,
  onPreserveTextChange,
}) => {
  return (
    <div className="box-card-subtle mb-4">
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <FileCode size={18} color="var(--strong-raspberry)" />
        <h3 style={{ fontSize: "0.95rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          PDF Tuning & Conversion
        </h3>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem" }}>
          Output Format
        </label>
        <select
          value={outputFormat}
          onChange={(e) => onOutputFormatChange(e.target.value)}
          className="sharp-select"
        >
          <optgroup label="── DOCUMENT FORMATS ──">
            <option value="original">PDF (.pdf) - Compressed Document</option>
            <option value="txt">TXT (.txt) - Extract Searchable Text</option>
          </optgroup>

          <optgroup label="── RENDER TO IMAGE ──">
            <option value="jpg">JPG / JPEG (.jpg) - Render to Image</option>
            <option value="png">PNG (.png) - High-Res Crisp Render</option>
            <option value="webp">WEBP (.webp) - Modern Compact Render</option>
          </optgroup>
        </select>
      </div>

      {(!outputFormat || outputFormat === "original" || outputFormat === "pdf") && (
        <>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Compression Profile
            </label>
            <select
              value={compressionLevel}
              onChange={(e) => onCompressionLevelChange(e.target.value as "low" | "balanced" | "maximum")}
              className="sharp-select"
            >
              <option value="low">Low Compression (Highest Visual Quality)</option>
              <option value="balanced">Balanced (Recommended for uploads & forms)</option>
              <option value="maximum">Maximum Compression (Smallest file size)</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <label className="sharp-checkbox-label">
              <input
                type="checkbox"
                checked={optimizeImages}
                onChange={(e) => onOptimizeImagesChange(e.target.checked)}
                className="sharp-checkbox"
              />
              <span>Recompress embedded raster images</span>
            </label>

            <label className="sharp-checkbox-label">
              <input
                type="checkbox"
                checked={removeMetadata}
                onChange={(e) => onRemoveMetadataChange(e.target.checked)}
                className="sharp-checkbox"
              />
              <span>Strip document metadata & author traces</span>
            </label>

            <label className="sharp-checkbox-label">
              <input
                type="checkbox"
                checked={preserveText}
                onChange={(e) => onPreserveTextChange(e.target.checked)}
                className="sharp-checkbox"
              />
              <span>Preserve searchable vector text (No flat rasterization)</span>
            </label>
          </div>
        </>
      )}
    </div>
  );
};
