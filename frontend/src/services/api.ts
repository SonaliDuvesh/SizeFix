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
