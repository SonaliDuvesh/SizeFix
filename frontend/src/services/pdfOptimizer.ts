import { PDFDocument } from "pdf-lib";
import type { ProcessRequestOptions, ProcessResult } from "../types";
import { formatBytes, parseTargetBytes } from "./sizeParser";

export async function processPdfInBrowser(
  file: File,
  options: ProcessRequestOptions
): Promise<ProcessResult> {
  const originalSize = file.size;
  const originalFilename = file.name;
  const outFilename = `optimized_${originalFilename.replace(/\.[^/.]+$/, "")}.pdf`;

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });

  const pageCount = pdfDoc.getPageCount();

  if (options.remove_metadata !== false) {
    pdfDoc.setTitle("");
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer("SizeFix In-Browser Engine");
    pdfDoc.setCreator("SizeFix In-Browser Engine");
  }

  // Save PDF using compressed object streams
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  const targetBytes = parseTargetBytes(options.target_size, options.target_value, options.target_unit);
  const targetMode = options.target_mode || "maximum";

  let finalUint8Array: Uint8Array = compressedBytes;
  let targetReached = true;
  let reason = "PDF stream deflated and metadata sanitized";

  if (targetBytes && targetBytes > 0) {
    if (targetMode === "exact" && compressedBytes.byteLength < targetBytes) {
      // Pad to exact target size
      const padded = new Uint8Array(targetBytes);
      padded.set(compressedBytes, 0);
      // Fill remaining with safe null bytes / trailing comment
      const comment = new TextEncoder().encode(`\n% SizeFix Pad\n`);
      padded.set(comment, compressedBytes.byteLength);
      finalUint8Array = padded;
      targetReached = true;
      reason = "Padded to exact target byte size";
    } else if (targetMode === "maximum") {
      targetReached = finalUint8Array.byteLength <= targetBytes;
      reason = targetReached ? "PDF compressed below maximum target limit" : "Stream deflated to minimum natural size";
    } else if (targetMode === "range") {
      targetReached = Math.abs(finalUint8Array.byteLength - targetBytes) / targetBytes <= 0.1;
      reason = targetReached ? "Within target range" : "Compressed to optimal structure";
    }
  }

  const outputBlob = new Blob([finalUint8Array as unknown as BlobPart], { type: "application/pdf" });
  const outputSize = outputBlob.size;
  const blobUrl = URL.createObjectURL(outputBlob);
  const savedBytes = originalSize - outputSize;
  const compressionRatio = originalSize > 0 ? (originalSize - outputSize) / originalSize : 0;

  return {
    success: true,
    original_filename: originalFilename,
    output_filename: outFilename,
    original_size: originalSize,
    original_size_human: formatBytes(originalSize),
    output_size: outputSize,
    output_size_human: formatBytes(outputSize),
    target_size: targetBytes || undefined,
    target_size_human: targetBytes ? formatBytes(targetBytes) : undefined,
    target_reached: targetReached,
    compression_ratio: compressionRatio,
    saved_bytes: savedBytes,
    saved_bytes_human: formatBytes(Math.abs(savedBytes)),
    format: "PDF",
    mode: targetMode,
    reason,
    pages: pageCount,
    blob_url: blobUrl,
    download_url: blobUrl,
  };
}
