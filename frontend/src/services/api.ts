import type { FileAnalysisResult, ProcessRequestOptions, ProcessResult, SupportedFormatsResponse } from "../types";

export const DEFAULT_RENDER_BACKEND = "https://sizefix-api.onrender.com";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("sizefix_backend_url");
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
  }

  const envBase = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();
  if (envBase) {
    return envBase.replace(/\/+$/, "");
  }

  // If in local dev on localhost/127.0.0.1, use relative paths so Vite proxy forwards to local backend
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "";
  }

  // Fallback for GitHub Pages and production static deployments
  return DEFAULT_RENDER_BACKEND;
}

export function setCustomBackendUrl(url: string | null) {
  if (typeof window !== "undefined") {
    if (url && url.trim()) {
      localStorage.setItem("sizefix_backend_url", url.trim().replace(/\/+$/, ""));
    } else {
      localStorage.removeItem("sizefix_backend_url");
    }
  }
}

async function handleApiResponse<T>(res: Response, defaultError: string): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error_code || `${defaultError} (HTTP ${res.status})`);
    }
    return data as T;
  }

  // If response is HTML or text (e.g. 404/405 from static edge rewrite or 502 Bad Gateway)
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    if (res.status === 404 || res.status === 405) {
      throw new Error(
        `Backend API endpoint unreachable (${res.status === 405 ? "HTTP 405" : "HTTP 404"}). Ensure your Render backend is running, or configure your backend URL in the header 'Server' settings.`
      );
    }
    if (res.status === 502 || res.status === 503) {
      throw new Error("Backend service on Render is waking up or starting. Free Render instances take ~30-50 seconds to boot from sleep. Please wait a moment and try again.");
    }
    const cleanMsg = text.replace(/<[^>]*>?/gm, "").trim().slice(0, 120);
    throw new Error(cleanMsg || `${defaultError} (HTTP ${res.status})`);
  }

  throw new Error("Received invalid non-JSON response from server.");
}

export class ApiService {
  static async checkHealth(): Promise<{ status: string }> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/health`);
    return handleApiResponse<{ status: string }>(res, "Backend server is not responding");
  }

  static async getSupportedFormats(): Promise<SupportedFormatsResponse> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/supported-formats`);
    return handleApiResponse<SupportedFormatsResponse>(res, "Failed to fetch supported formats");
  }

  static async analyzeFile(file: File): Promise<FileAnalysisResult> {
    const base = getApiBaseUrl();
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${base}/analyze`, {
      method: "POST",
      body: formData,
    });

    return handleApiResponse<FileAnalysisResult>(res, "Failed to analyze file");
  }

  static async processFile(file: File, options: ProcessRequestOptions): Promise<ProcessResult> {
    const base = getApiBaseUrl();
    const formData = new FormData();
    formData.append("file", file);

    if (options.target_size) formData.append("target_size", options.target_size);
    if (options.target_value !== undefined) formData.append("target_value", String(options.target_value));
    if (options.target_unit) formData.append("target_unit", options.target_unit);
    if (options.target_mode) formData.append("target_mode", options.target_mode);
    if (options.output_format) formData.append("output_format", options.output_format);
    if (options.quality !== undefined) formData.append("quality", String(options.quality));
    if (options.width !== undefined) formData.append("width", String(options.width));
    if (options.height !== undefined) formData.append("height", String(options.height));
    if (options.maintain_aspect_ratio !== undefined) formData.append("maintain_aspect_ratio", String(options.maintain_aspect_ratio));
    if (options.remove_metadata !== undefined) formData.append("remove_metadata", String(options.remove_metadata));
    if (options.progressive !== undefined) formData.append("progressive", String(options.progressive));
    if (options.pdf_compression_level) formData.append("pdf_compression_level", options.pdf_compression_level);
    if (options.pdf_optimize_images !== undefined) formData.append("pdf_optimize_images", String(options.pdf_optimize_images));
    if (options.pdf_downsample_dpi) formData.append("pdf_downsample_dpi", String(options.pdf_downsample_dpi));
    if (options.pdf_preserve_text !== undefined) formData.append("pdf_preserve_text", String(options.pdf_preserve_text));

    formData.append("response_mode", "json");

    const res = await fetch(`${base}/process`, {
      method: "POST",
      body: formData,
    });

    return handleApiResponse<ProcessResult>(res, "Processing failed");
  }

  static getDownloadUrl(fileId: string): string {
    const base = getApiBaseUrl();
    return `${base}/download/${fileId}`;
  }
}
