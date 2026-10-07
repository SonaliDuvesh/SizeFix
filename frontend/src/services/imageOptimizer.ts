import type { ProcessRequestOptions, ProcessResult } from "../types";
import { formatBytes, parseTargetBytes } from "./sizeParser";

export async function processImageInBrowser(
  file: File,
  options: ProcessRequestOptions
): Promise<ProcessResult> {
  const originalSize = file.size;
  const originalFilename = file.name;
  const originalExt = originalFilename.split(".").pop()?.toLowerCase() || "jpg";

  // Determine output format
  let outFormat = options.output_format || "original";
  if (outFormat === "original") {
    outFormat = originalExt === "jpeg" ? "jpg" : originalExt;
  }
  if (!["jpg", "jpeg", "png", "webp"].includes(outFormat)) {
    outFormat = "webp";
  }

  const mimeType = outFormat === "png" ? "image/png" : outFormat === "webp" ? "image/webp" : "image/jpeg";
  const outExt = outFormat === "jpeg" ? "jpg" : outFormat;
  const outFilename = `optimized_${originalFilename.replace(/\.[^/.]+$/, "")}.${outExt}`;

  // Load Image into an HTMLImageElement
  const img = await loadImageFromFile(file);
  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  // Determine target dimensions
  let targetWidth = options.width || origWidth;
  let targetHeight = options.height || origHeight;

  if (options.width && !options.height && options.maintain_aspect_ratio !== false) {
    const aspect = origWidth / origHeight;
    targetHeight = Math.round(options.width / aspect);
  } else if (!options.width && options.height && options.maintain_aspect_ratio !== false) {
    const aspect = origWidth / origHeight;
    targetWidth = Math.round(options.height * aspect);
  }

  const targetBytes = parseTargetBytes(options.target_size, options.target_value, options.target_unit);
  const targetMode = options.target_mode || "maximum";

  let finalBlob: Blob;
  let finalQuality = (options.quality !== undefined ? options.quality : 80) / 100;
  let finalW: number = targetWidth;
  let finalH: number = targetHeight;
  let targetReached = true;
  let reason = "Optimal compression applied";

  if (targetBytes && targetBytes > 0) {
    // Binary search target size matching
    const result = await binarySearchImageTarget(
      img,
      mimeType,
      targetBytes,
      targetMode,
      targetWidth,
      targetHeight
    );
    finalBlob = result.blob;
    finalQuality = result.quality;
    finalW = result.width;
    finalH = result.height;
    targetReached = result.targetReached;
    reason = result.reason;
  } else {
    // Direct manual compression
    finalBlob = await renderCanvasToBlob(img, finalW, finalH, mimeType, finalQuality);
  }

  const outputSize = finalBlob.size;
  const blobUrl = URL.createObjectURL(finalBlob);
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
    format: outExt.toUpperCase(),
    mode: targetMode,
    reason,
    quality: Math.round(finalQuality * 100),
    width: finalW,
    height: finalH,
    original_width: origWidth,
    original_height: origHeight,
    blob_url: blobUrl,
    download_url: blobUrl,
  };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to parse image data"));
    };
    img.src = url;
  });
}

function renderCanvasToBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));

    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) {
      reject(new Error("Canvas context initialization failed"));
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // White background for JPEG if transparency
    if (mimeType === "image/jpeg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to export image blob"));
        }
      },
      mimeType,
      mimeType === "image/png" ? undefined : quality
    );
  });
}

async function binarySearchImageTarget(
  img: HTMLImageElement,
  mimeType: string,
  targetBytes: number,
  mode: "maximum" | "exact" | "range",
  baseWidth: number,
  baseHeight: number
): Promise<{
  blob: Blob;
  quality: number;
  width: number;
  height: number;
  targetReached: boolean;
  reason: string;
}> {
  let lowQ = 0.05;
  let highQ = 0.98;
  let bestBlob: Blob | null = null;
  let bestQ = 0.8;
  let bestScale = 1.0;

  // Phase 1: Search quality with base dimensions
  for (let i = 0; i < 7; i++) {
    const midQ = (lowQ + highQ) / 2;
    const blob = await renderCanvasToBlob(img, baseWidth, baseHeight, mimeType, midQ);

    if (!bestBlob) {
      bestBlob = blob;
      bestQ = midQ;
    }

    if (mode === "maximum") {
      if (blob.size <= targetBytes) {
        bestBlob = blob;
        bestQ = midQ;
        lowQ = midQ; // Try higher quality
      } else {
        highQ = midQ; // Reduce quality
      }
    } else {
      // exact or range
      if (Math.abs(blob.size - targetBytes) < Math.abs(bestBlob.size - targetBytes)) {
        bestBlob = blob;
        bestQ = midQ;
      }
      if (blob.size < targetBytes) {
        lowQ = midQ;
      } else {
        highQ = midQ;
      }
    }
  }

  // Phase 2: If size is still larger than target, downscale dimensions
  if (bestBlob && bestBlob.size > targetBytes && (mode === "maximum" || mode === "exact")) {
    let lowScale = 0.1;
    let highScale = 1.0;
    for (let i = 0; i < 6; i++) {
      const midScale = (lowScale + highScale) / 2;
      const w = Math.round(baseWidth * midScale);
      const h = Math.round(baseHeight * midScale);
      const blob = await renderCanvasToBlob(img, w, h, mimeType, Math.max(0.4, bestQ));

      if (mode === "maximum") {
        if (blob.size <= targetBytes) {
          bestBlob = blob;
          bestScale = midScale;
          lowScale = midScale;
        } else {
          highScale = midScale;
        }
      } else {
        if (Math.abs(blob.size - targetBytes) < Math.abs(bestBlob.size - targetBytes)) {
          bestBlob = blob;
          bestScale = midScale;
        }
        if (blob.size < targetBytes) {
          lowScale = midScale;
        } else {
          highScale = midScale;
        }
      }
    }
  }

  // Phase 3: If target is larger than natural maximum (file expansion requested)
  if (bestBlob && bestBlob.size < targetBytes && mode === "exact") {
    const padNeeded = targetBytes - bestBlob.size;
    if (padNeeded > 0) {
      bestBlob = await padBlob(bestBlob, padNeeded);
    }
  }

  const finalW = Math.round(baseWidth * bestScale);
  const finalH = Math.round(baseHeight * bestScale);
  const finalBlob = bestBlob || (await renderCanvasToBlob(img, finalW, finalH, mimeType, bestQ));

  let targetReached = false;
  if (mode === "maximum") {
    targetReached = finalBlob.size <= targetBytes;
  } else if (mode === "range") {
    targetReached = Math.abs(finalBlob.size - targetBytes) / targetBytes <= 0.08;
  } else {
    targetReached = Math.abs(finalBlob.size - targetBytes) / targetBytes <= 0.02 || finalBlob.size === targetBytes;
  }

  return {
    blob: finalBlob,
    quality: bestQ,
    width: finalW,
    height: finalH,
    targetReached,
    reason: targetReached ? "Target matched within tolerance" : "Closest possible compression achieved",
  };
}

async function padBlob(blob: Blob, padBytes: number): Promise<Blob> {
  const originalBuffer = await blob.arrayBuffer();
  const padding = new Uint8Array(padBytes); // Zero padding
  return new Blob([originalBuffer, padding], { type: blob.type });
}
