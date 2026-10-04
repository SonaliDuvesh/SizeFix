import React, { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFileSelect, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{
        border: isDragOver ? "3px dashed var(--strong-raspberry)" : "2px dashed var(--border-color)",
        background: isDragOver ? "var(--soft-pink-1)" : "var(--bg-surface)",
        padding: "3rem 1.5rem",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: isDragOver ? "6px 6px 0px var(--border-color)" : "var(--shadow-subtle)",
        transition: "all 0.15s ease",
        position: "relative",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleInputChange}
        disabled={disabled}
        accept="image/*,application/pdf,.bmp,.tiff,.tif,.avif"
      />

      <span style={{ position: "absolute", top: 8, left: 12, fontSize: "0.9rem", color: "var(--strong-raspberry)" }}>✦</span>
      <span style={{ position: "absolute", bottom: 8, right: 12, fontSize: "0.9rem", color: "var(--strong-raspberry)" }}>✧</span>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <div style={{
          width: "56px",
          height: "56px",
          background: "var(--strong-raspberry)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid var(--border-color)",
          boxShadow: "2px 2px 0px var(--border-color)"
        }}>
          <UploadCloud size={30} />
        </div>

        <div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>
            DROP YOUR FILE HERE
          </h2>
          <p style={{ color: "var(--secondary-text)", marginTop: "0.25rem", fontSize: "0.95rem", fontWeight: 600 }}>
            or click to browse from your computer
          </p>
        </div>

        <button type="button" className="btn-primary" style={{ padding: "0.6rem 1.5rem", fontSize: "0.85rem" }}>
          Browse Files
        </button>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.4rem", marginTop: "0.5rem" }}>
          {["JPG", "PNG", "WEBP", "PDF", "GIF", "BMP", "TIFF", "AVIF"].map((fmt) => (
            <span key={fmt} className="sharp-tag" style={{ fontSize: "0.75rem", background: "var(--bg-card)" }}>
              {fmt}
            </span>
          ))}
        </div>

        <span style={{ fontSize: "0.75rem", color: "var(--secondary-text)", fontWeight: 600 }}>
          Strict local processing • Max 200 MB
        </span>
      </div>
    </div>
  );
};
