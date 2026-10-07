import { PDFDocument } from "pdf-lib";
import type { FileAnalysisResult } from "../types";
import { formatBytes } from "./sizeParser";

export async function analyzeFileInBrowser(file: File): Promise<FileAnalysisResult> {
  const filename = file.name;
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const sizeBytes = file.size;
  const sizeHuman = formatBytes(sizeBytes);
  const mimeType = file.type || getMimeFromExt(ext);

  const imageExts = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif", "bmp", "tiff", "tif", "svg", "heic", "heif"]);
  const docExts = new Set(["pdf", "txt", "doc", "docx"]);

  let category: "image" | "document" | "unsupported" = "unsupported";
  if (imageExts.has(ext) || file.type.startsWith("image/")) {
    category = "image";
  } else if (docExts.has(ext) || file.type === "application/pdf") {
    category = "document";
  }

  if (category === "image") {
    try {
      const dimensions = await getImageDimensions(file);
      return {
        filename,
        extension: ext,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        size_human: sizeHuman,
        category: "image",
        is_supported: true,
        dimensions,
        color_mode: "RGB",
        has_alpha: ext === "png" || ext === "webp" || ext === "gif",
        supported_operations: [
          "reduce_file_size",
          "increase_file_size",
          "resize_dimensions",
          "adjust_quality",
          "format_conversion",
          "target_exact_size",
          "target_maximum_size",
          "target_size_range"
        ],
        recommendations: {
          recommended_format: "webp",
          tips: "WebP provides superior compression while preserving sharp detail."
        }
      };
    } catch {
      // Fallback if image dimensions fail to load
      return {
        filename,
        extension: ext,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        size_human: sizeHuman,
        category: "image",
        is_supported: true,
        supported_operations: ["reduce_file_size", "format_conversion"]
      };
    }
  }

  if (category === "document" && (ext === "pdf" || file.type === "application/pdf")) {
    let pages = 1;
    let title = "";
    let author = "";
    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pages = pdfDoc.getPageCount();
      title = pdfDoc.getTitle() || "";
      author = pdfDoc.getAuthor() || "";
    } catch {
      // ignore
    }

    return {
      filename,
      extension: ext,
      mime_type: "application/pdf",
      size_bytes: sizeBytes,
      size_human: sizeHuman,
      category: "document",
      is_supported: true,
      pdf_pages: pages,
      pdf_metadata: {
        title,
        author,
        pages
      },
      supported_operations: [
        "pdf_compression",
        "reduce_file_size",
        "increase_file_size",
        "target_exact_size",
        "target_maximum_size",
        "target_size_range"
      ],
      recommendations: {
        tips: "PDF optimization prunes unreferenced stream objects and deduplicates internal tables."
      }
    };
  }

  return {
    filename,
    extension: ext,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    size_human: sizeHuman,
    category: "unsupported",
    is_supported: false,
    supported_operations: []
  };
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

function getMimeFromExt(ext: string): string {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "gif":
      return "image/gif";
    case "bmp":
      return "image/bmp";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}
