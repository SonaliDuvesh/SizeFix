import type {
  FileAnalysisResult,
  ProcessRequestOptions,
  ProcessResult,
  SupportedFormatsResponse,
} from "../types";
import { analyzeFileInBrowser } from "./fileAnalyzer";
import { processImageInBrowser } from "./imageOptimizer";
import { processPdfInBrowser } from "./pdfOptimizer";

export class ApiService {
  static async checkHealth(): Promise<{ status: string; service: string }> {
    return {
      status: "ok",
      service: "SizeFix In-Browser Engine (100% Client-Side Pure TypeScript)",
    };
  }

  static async getSupportedFormats(): Promise<SupportedFormatsResponse> {
    return {
      images: ["jpg", "jpeg", "png", "webp", "avif", "gif", "bmp", "svg"],
      documents: ["pdf", "txt"],
      planned_formats: ["docx", "xlsx", "pptx", "zip"],
      supported_operations: [
        "reduce_file_size",
        "increase_file_size",
        "resize_dimensions",
        "adjust_quality",
        "format_conversion",
        "target_exact_size",
        "target_maximum_size",
        "target_size_range",
        "pdf_compression",
      ],
    };
  }

  static async analyzeFile(file: File): Promise<FileAnalysisResult> {
    return await analyzeFileInBrowser(file);
  }

  static async processFile(
    file: File,
    options: ProcessRequestOptions
  ): Promise<ProcessResult> {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isPdf = ext === "pdf" || file.type === "application/pdf";

    // Attempt high-performance backend processing via Vite proxy if available
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (options.target_size) formData.append("target_size", options.target_size);
      if (options.target_value !== undefined) formData.append("target_value", String(options.target_value));
      if (options.target_unit) formData.append("target_unit", options.target_unit);
      if (options.target_mode) formData.append("target_mode", options.target_mode);
      if (options.output_format && options.output_format !== "original") {
        formData.append("output_format", options.output_format);
      }
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
      formData.append("response_mode", "file");

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      const res = await fetch("/api/v1/process", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const metaStr = res.headers.get("X-Processing-Result");
        if (metaStr) {
          const parsed = JSON.parse(metaStr) as ProcessResult;
          parsed.blob_url = blobUrl;
          parsed.download_url = blobUrl;
          return parsed;
        }
      }
    } catch {
      // Backend unavailable or timed out; seamless fallback to client-side engine
    }

    if (isPdf) {
      return await processPdfInBrowser(file, options);
    } else {
      return await processImageInBrowser(file, options);
    }
  }

  static getDownloadUrl(fileIdOrBlobUrl: string): string {
    return fileIdOrBlobUrl;
  }
}
