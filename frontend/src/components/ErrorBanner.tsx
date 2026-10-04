import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  return (
    <div
      style={{
        background: "var(--soft-pink-1)",
        color: "var(--deep-raspberry)",
        border: "2px solid var(--strong-raspberry)",
        padding: "1rem 1.25rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        boxShadow: "3px 3px 0px var(--border-color)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <AlertTriangle size={22} color="var(--strong-raspberry)" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ textTransform: "uppercase", fontSize: "0.85rem", letterSpacing: "0.03em" }}>
            Processing Error:
          </strong>{" "}
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{message}</span>
        </div>
      </div>

      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--deep-raspberry)",
          padding: "4px",
        }}
      >
        <X size={18} />
      </button>
    </div>
  );
};
