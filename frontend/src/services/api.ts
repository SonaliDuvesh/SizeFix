import type { FileAnalysisResult, ProcessRequestOptions, ProcessResult, SupportedFormatsResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE || "";

async function handleApiResponse<T>(res: Response, defaultError: string): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error_code || `${defaultError} (HTTP ${res.status})`);
    }
    return data as T;
  }

  // If response is HTML or text (e.g. 404 from Vercel edge or 502 Bad Gateway)
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        "Backend API not found (HTTP 404). If deployed on Vercel, ensure the FastAPI backend is deployed (e.g., on Render/Railway) and set VITE_API_BASE in Vercel Environment Variables."
      );
    }
    if (res.status === 502 || res.status === 503) {
      throw new Error("Backend service is currently unavailable or starting up. Please try again in a moment.");
    }
    const cleanMsg = text.replace(/<[^>]*>?/gm, "").trim().slice(0, 120);
    throw new Error(cleanMsg || `${defaultError} (HTTP ${res.status})`);
  }

  throw new Error("Received invalid non-JSON response from server.");
}

export class ApiService {
  static async checkHealth(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/health`);
    return handleApiResponse<{ status: string }>(res, "Backend server is not responding");
  }

  static async getSupportedFormats(): Promise<SupportedFormatsResponse> {
    const res = await fetch(`${API_BASE}/supported-formats`);
    return handleApiResponse<SupportedFormatsResponse>(res, "Failed to fetch supported formats");
  }

  static async analyzeFile(file: File): Promise<FileAnalysisResult> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      body: formData,
    });

    return handleApiResponse<FileAnalysisResult>(res, "Failed to analyze file");
  }

  static async processFile(file: File, options: ProcessRequestOptions): Promise<ProcessResult> {
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

    const res = await fetch(`${API_BASE}/process`, {
      method: "POST",
      body: formData,
    });

    return handleApiResponse<ProcessResult>(res, "Processing failed");
  }

  static getDownloadUrl(fileId: string): string {
    return `${API_BASE}/download/${fileId}`;
  }
}
