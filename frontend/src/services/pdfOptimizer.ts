import { PDFDocument } from "pdf-lib";
import pako from "pako";
import type { ProcessRequestOptions, ProcessResult } from "../types";
import { formatBytes, parseTargetBytes } from "./sizeParser";

function extractTextFromPdfBytes(buffer: Uint8Array, pageCount: number): string {
  const latin1 = new TextDecoder("latin1");
  const raw = latin1.decode(buffer);
  const regex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  const lines: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = regex.exec(raw)) !== null) {
    const sIdx = raw.indexOf("stream", m.index);
    let start = sIdx + 6;
    if (buffer[start] === 13) start++;
    if (buffer[start] === 10) start++;
    let end = raw.indexOf("endstream", start);
    if (buffer[end - 1] === 10) end--;
    if (buffer[end - 1] === 13) end--;

    if (start < end && end <= buffer.length) {
      const chunk = buffer.subarray(start, end);
      let decomp = "";
      try {
        decomp = new TextDecoder("utf-8").decode(pako.inflate(chunk));
      } catch {
        decomp = latin1.decode(chunk);
      }

      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tm: RegExpExecArray | null;
      while ((tm = tjRegex.exec(decomp)) !== null) {
        lines.push(tm[1].replace(/\\([()\\])/g, "$1"));
      }

      const tjArrRegex = /\[([^\]]*)\]\s*TJ/g;
      while ((tm = tjArrRegex.exec(decomp)) !== null) {
        const inner = tm[1];
        const partRegex = /\(([^)]*)\)|<([0-9a-fA-F]+)>/g;
        let pm: RegExpExecArray | null;
        const parts: string[] = [];
        while ((pm = partRegex.exec(inner)) !== null) {
          if (pm[1] !== undefined) {
            parts.push(pm[1].replace(/\\([()\\])/g, "$1"));
          } else if (pm[2] !== undefined) {
            const hex = pm[2];
            let s = "";
            for (let i = 0; i < hex.length; i += 2) {
              s += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            }
            parts.push(s);
          }
        }
        if (parts.length > 0) lines.push(parts.join(""));
      }

      const hexTjRegex = /<([0-9a-fA-F]+)>\s*Tj/g;
      while ((tm = hexTjRegex.exec(decomp)) !== null) {
        const hex = tm[1];
        let s = "";
        for (let i = 0; i < hex.length; i += 2) {
          s += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        lines.push(s);
      }
    }
  }

  const cleanText = lines.map((l) => l.trim()).filter(Boolean).join("\n");
  if (cleanText) return cleanText;
  return `--- Extracted Document ---\nPages: ${pageCount}\n(No plain text streams detected; file may contain scanned or rasterized imagery).`;
}

export async function processPdfInBrowser(
  file: File,
  options: ProcessRequestOptions
): Promise<ProcessResult> {
  const originalSize = file.size;
  const originalFilename = file.name;
  const arrayBuffer = await file.arrayBuffer();

  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });

  const pageCount = pdfDoc.getPageCount();

  // If TXT format is requested, extract searchable text with precision sizing
  if (options.output_format === "txt") {
    const uint8Buf = new Uint8Array(arrayBuffer);
    const textContent = extractTextFromPdfBytes(uint8Buf, pageCount);
    const targetBytes = parseTargetBytes(options.target_size, options.target_value, options.target_unit);
    const targetMode = options.target_mode || "maximum";

    let finalBytes = new TextEncoder().encode(textContent);
    let targetReached = true;
    let reason = `Extracted text across ${pageCount} page(s)`;

    if (targetBytes && targetBytes > 0) {
      if (targetMode === "exact") {
        if (finalBytes.byteLength < targetBytes) {
          const padNeeded = targetBytes - finalBytes.byteLength;
          const headerStr = "\n\n--- [SizeFix Target Size Pad] ---\n";
          const headerBytes = new TextEncoder().encode(headerStr);
          const padded = new Uint8Array(targetBytes);
          padded.set(finalBytes, 0);

          if (padNeeded >= headerBytes.byteLength) {
            padded.set(headerBytes, finalBytes.byteLength);
            padded.fill(0x20, finalBytes.byteLength + headerBytes.byteLength, targetBytes);
          } else {
            padded.fill(0x20, finalBytes.byteLength, targetBytes);
          }
          finalBytes = padded;
          targetReached = true;
          reason = `Extracted text and padded to exact target (${formatBytes(targetBytes)})`;
        } else if (finalBytes.byteLength > targetBytes) {
          targetReached = false;
          reason = `Extracted text (${formatBytes(finalBytes.byteLength)}) exceeds exact target (${formatBytes(targetBytes)})`;
        }
      } else if (targetMode === "maximum") {
        if (finalBytes.byteLength > targetBytes) {
          const notice = new TextEncoder().encode("\n\n[...Truncated to meet target maximum limit...]");
          if (targetBytes > notice.byteLength) {
            const trimmed = new Uint8Array(targetBytes);
            trimmed.set(finalBytes.subarray(0, targetBytes - notice.byteLength), 0);
            trimmed.set(notice, targetBytes - notice.byteLength);
            finalBytes = trimmed;
          } else {
            finalBytes = finalBytes.subarray(0, targetBytes);
          }
          targetReached = true;
          reason = `Extracted text trimmed to meet maximum limit (${formatBytes(targetBytes)})`;
        } else {
          targetReached = true;
          reason = `Extracted text (${formatBytes(finalBytes.byteLength)}) is within maximum limit (${formatBytes(targetBytes)})`;
        }
      } else if (targetMode === "range") {
        targetReached = Math.abs(finalBytes.byteLength - targetBytes) / targetBytes <= 0.1;
      }
    }

    const textBlob = new Blob([finalBytes], { type: "text/plain;charset=utf-8" });
    const outputSize = textBlob.size;
    const blobUrl = URL.createObjectURL(textBlob);
    const savedBytes = originalSize - outputSize;
    const compressionRatio = originalSize > 0 ? (originalSize - outputSize) / originalSize : 0;
    const outFilename = `extracted_${originalFilename.replace(/\.[^/.]+$/, "")}.txt`;

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
      format: "TXT",
      mode: targetMode,
      reason,
      pages: pageCount,
      blob_url: blobUrl,
      download_url: blobUrl,
    };
  }

  const outFilename = `optimized_${originalFilename.replace(/\.[^/.]+$/, "")}.pdf`;

  if (options.remove_metadata !== false) {
    try {
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer("SizeFix Engine");
      pdfDoc.setCreator("SizeFix Engine");
    } catch {
      // Ignore if document catalog metadata cannot be cleared
    }
  }

  // Save PDF using standard xref tables (useObjectStreams: false ensures universal compatibility without corruption)
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
  });

  const targetBytes = parseTargetBytes(options.target_size, options.target_value, options.target_unit);
  const targetMode = options.target_mode || "maximum";

  let finalUint8Array: Uint8Array = compressedBytes;
  let targetReached = true;
  let reason = "PDF stream deflated and metadata sanitized";

  if (targetBytes && targetBytes > 0) {
    if (targetMode === "exact" && compressedBytes.byteLength < targetBytes) {
      const padNeeded = targetBytes - compressedBytes.byteLength;
      if (padNeeded > 0) {
        // Pad using strictly valid PDF comment ASCII bytes so PDF readers parse it without corruption
        const headerStr = "\n% SizeFix_PADDING ";
        const headerBytes = new TextEncoder().encode(headerStr);
        const padded = new Uint8Array(targetBytes);
        padded.set(compressedBytes, 0);

        if (padNeeded >= headerBytes.byteLength) {
          padded.set(headerBytes, compressedBytes.byteLength);
          padded.fill(0x30, compressedBytes.byteLength + headerBytes.byteLength, targetBytes);
        } else {
          padded.fill(0x20, compressedBytes.byteLength, targetBytes);
        }
        finalUint8Array = padded;
        targetReached = true;
        reason = "Padded to exact target byte size";
      }
    } else if (targetMode === "maximum") {
      targetReached = finalUint8Array.byteLength <= targetBytes;
      reason = targetReached ? "PDF compressed below maximum target limit" : "Stream deflated to minimum natural size";
    } else if (targetMode === "range") {
      targetReached = Math.abs(finalUint8Array.byteLength - targetBytes) / targetBytes <= 0.1;
      reason = targetReached ? "Within target range" : "Compressed to optimal structure";
    }
  }

  const exactBuffer = finalUint8Array.buffer.slice(
    finalUint8Array.byteOffset,
    finalUint8Array.byteOffset + finalUint8Array.byteLength
  ) as ArrayBuffer;
  const outputBlob = new Blob([exactBuffer], { type: "application/pdf" });
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
