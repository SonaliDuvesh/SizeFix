import React, { useState, useEffect } from "react";
import { X, Server, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { getApiBaseUrl, setCustomBackendUrl, DEFAULT_RENDER_BACKEND } from "../services/api";

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerUpdated?: () => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  onServerUpdated,
}) => {
  const [urlInput, setUrlInput] = useState<string>("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      const current = getApiBaseUrl();
      setUrlInput(current || DEFAULT_RENDER_BACKEND);
      setTestStatus("idle");
      setTestMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async (testUrl?: string) => {
    const target = (testUrl !== undefined ? testUrl : urlInput).trim().replace(/\/+$/, "");
    setTestStatus("testing");
    setTestMessage("Pinging backend server...");

    try {
      const pingUrl = target ? `${target}/health` : "/health";
      const res = await fetch(pingUrl);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setTestStatus("success");
        setTestMessage(
          `Connected successfully! ${data.service ? `(${data.service})` : "Server responded with 200 OK"}`
        );
      } else {
        setTestStatus("error");
        setTestMessage(`Server responded with HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage(
        "Could not connect to server. If using a free Render instance, it may be waking up from sleep (~30-50s)."
      );
    }
  };

  const handleSave = () => {
    const cleaned = urlInput.trim().replace(/\/+$/, "");
    setCustomBackendUrl(cleaned);
    if (onServerUpdated) onServerUpdated();
    onClose();
  };

  const handleReset = () => {
    setUrlInput(DEFAULT_RENDER_BACKEND);
    setCustomBackendUrl(null);
    handleTest(DEFAULT_RENDER_BACKEND);
  };

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
          maxWidth: "580px",
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "2rem",
          background: "var(--bg-main)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            borderBottom: "2px solid var(--border-color)",
            paddingBottom: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Server size={22} color="var(--strong-raspberry)" />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, textTransform: "uppercase" }}>
              Backend API Server Settings
            </h2>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: "0.3rem 0.5rem" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", fontSize: "0.9rem" }}>
          <div>
            <label style={{ display: "block", fontWeight: 700, marginBottom: "0.5rem" }}>
              Render Backend API URL:
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://your-render-service.onrender.com"
                style={{
                  flex: 1,
                  padding: "0.6rem 0.8rem",
                  border: "2px solid var(--border-color)",
                  background: "var(--bg-surface)",
                  color: "inherit",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                }}
              />
              <button
                onClick={() => handleTest()}
                disabled={testStatus === "testing"}
                className="btn-secondary"
                style={{ padding: "0.6rem 1rem", whiteSpace: "nowrap" }}
              >
                {testStatus === "testing" ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  "Test Connection"
                )}
              </button>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--secondary-text)", marginTop: "0.35rem", display: "block" }}>
              Default: <code>{DEFAULT_RENDER_BACKEND}</code>
            </span>
          </div>

          {testStatus !== "idle" && (
            <div
              style={{
                padding: "0.75rem",
                border: "2px solid var(--border-color)",
                background:
                  testStatus === "success"
                    ? "rgba(46, 125, 50, 0.15)"
                    : testStatus === "error"
                    ? "rgba(211, 47, 47, 0.15)"
                    : "var(--bg-surface)",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.6rem",
              }}
            >
              {testStatus === "success" && <CheckCircle size={18} color="#2e7d32" style={{ flexShrink: 0, marginTop: "2px" }} />}
              {testStatus === "error" && <AlertCircle size={18} color="#d32f2f" style={{ flexShrink: 0, marginTop: "2px" }} />}
              {testStatus === "testing" && <RefreshCw size={18} className="animate-spin" style={{ flexShrink: 0, marginTop: "2px" }} />}
              <span style={{ fontSize: "0.85rem" }}>{testMessage}</span>
            </div>
          )}

          <div
            style={{
              padding: "0.85rem",
              background: "var(--bg-surface)",
              border: "2px solid var(--border-color)",
              fontSize: "0.8rem",
              lineHeight: "1.4",
            }}
          >
            <strong>💡 Hosting on GitHub Pages & Render:</strong>
            <ul style={{ paddingLeft: "1.2rem", marginTop: "0.4rem" }}>
              <li>GitHub Pages hosts the frontend as a static web application.</li>
              <li>The frontend communicates with your FastAPI backend hosted on Render.</li>
              <li>Free Render backend instances sleep after 15 minutes of inactivity and take ~30–50 seconds to wake up on the first request.</li>
            </ul>
          </div>
        </div>

        <div
          style={{
            marginTop: "1.75rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <button onClick={handleReset} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
            Reset to Default
          </button>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={onClose} className="btn-secondary" style={{ padding: "0.5rem 1rem" }}>
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary" style={{ padding: "0.5rem 1.5rem" }}>
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
