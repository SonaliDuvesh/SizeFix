import React from "react";
import { X, BookOpen } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(53, 20, 31, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        className="box-card"
        style={{
          maxWidth: "680px",
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "2rem",
          background: "var(--bg-main)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "2px solid var(--border-color)", paddingBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <BookOpen size={22} color="var(--strong-raspberry)" />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, textTransform: "uppercase" }}>
              SizeFix Guide & Capabilities
            </h2>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: "0.3rem 0.5rem" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", fontSize: "0.9rem" }}>
          <section>
            <h4 style={{ color: "var(--strong-raspberry)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              ✦ Target Size Modes
            </h4>
            <p><strong>Maximum Size:</strong> Guarantees the output stays at or below your target limit (e.g. for strict upload portals like passport or portal forms).</p>
            <p style={{ marginTop: "0.25rem" }}><strong>Closest Size:</strong> Tests optimal compression parameters to match your target without artificial corruption.</p>
          </section>

          <section>
            <h4 style={{ color: "var(--strong-raspberry)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              ✦ Supported Formats
            </h4>
            <p><strong>Images:</strong> JPG, JPEG, PNG, WEBP, AVIF, GIF, BMP, TIFF.</p>
            <p style={{ marginTop: "0.25rem" }}><strong>PDFs:</strong> Automatic stream deflation, metadata stripping, and embedded image downsampling preserving selectable vector text.</p>
          </section>

          <section>
            <h4 style={{ color: "var(--strong-raspberry)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              ✦ 100% Local Privacy Guarantee
            </h4>
            <p>All processing is executed on your local machine with Python & FastAPI. No files or personal metadata are ever sent to third-party cloud servers.</p>
          </section>
        </div>

        <div style={{ marginTop: "2rem", textAlign: "right" }}>
          <button onClick={onClose} className="btn-primary" style={{ padding: "0.6rem 1.5rem" }}>
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
};
