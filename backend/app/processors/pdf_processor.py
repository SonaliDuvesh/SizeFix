import io
import fitz
from PIL import Image
from pathlib import Path
from typing import Optional, Tuple

from app.core.errors import ProcessingError
from app.models.analysis import FileAnalysisResult
from app.models.processing import ProcessRequestOptions, ProcessResult
from app.processors.base import BaseProcessor
from app.services.size_parser import format_bytes, parse_target_input

class PDFProcessor(BaseProcessor):
    def can_process(self, analysis: FileAnalysisResult) -> bool:
        return analysis.category == "document" and analysis.extension == "pdf" and analysis.is_supported

    def _compress_pdf_images(
        self,
        doc: fitz.Document,
        image_quality: int = 75,
        max_dim: Optional[int] = 1600
    ) -> int:
        images_processed = 0
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            image_list = page.get_images(full=True)
            
            for img_info in image_list:
                xref = img_info[0]
                try:
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image.get("image")
                    
                    if not image_bytes:
                        continue
                        
                    with Image.open(io.BytesIO(image_bytes)) as pil_img:
                        w, h = pil_img.size
                        if max_dim and (w > max_dim or h > max_dim):
                            scale = min(max_dim / w, max_dim / h)
                            new_w = max(1, int(w * scale))
                            new_h = max(1, int(h * scale))
                            pil_img = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                            
                        if pil_img.mode in ("RGBA", "LA", "P"):
                            bg = Image.new("RGB", pil_img.size, (255, 255, 255))
                            if pil_img.mode == "RGBA":
                                bg.paste(pil_img, mask=pil_img.split()[3])
                            else:
                                bg.paste(pil_img)
                            pil_img = bg
                        elif pil_img.mode != "RGB":
                            pil_img = pil_img.convert("RGB")
                            
                        out_buf = io.BytesIO()
                        pil_img.save(
                            out_buf,
                            format="JPEG",
                            quality=image_quality,
                            optimize=True,
                            progressive=True
                        )
                        compressed_data = out_buf.getvalue()
                        
                        if len(compressed_data) < len(image_bytes):
                            page.replace_image(xref, stream=compressed_data)
                            images_processed += 1
                except Exception:
                    continue
                    
        return images_processed

    def _optimize_document_structure(
        self,
        doc: fitz.Document,
        remove_metadata: bool = True
    ):
        if remove_metadata:
            doc.set_metadata({})

    def _save_pdf_optimized(self, doc: fitz.Document, output_path: Path) -> int:
        doc.save(
            str(output_path),
            garbage=4,
            deflate=True,
            clean=True,
            deflate_images=True,
            deflate_fonts=True
        )
        return output_path.stat().st_size

    def _adaptive_target_search(
        self,
        input_path: Path,
        output_path: Path,
        target_bytes: int,
        mode: str,
        remove_metadata: bool = True
    ) -> Tuple[int, int, bool, str]:
        norm_mode = (mode or "maximum").lower()
        min_bytes = int(target_bytes * 0.95)
        max_bytes = int(target_bytes * 1.05) if norm_mode != "maximum" else target_bytes

        quality_levels = [
            (85, None),
            (75, 1800),
            (65, 1400),
            (50, 1000),
            (35, 750),
            (20, 400)
        ]
        
        best_data: Optional[bytes] = None
        best_size = 0
        best_diff = float("inf")
        images_count = 0

        for q, max_d in quality_levels:
            with fitz.open(input_path) as doc:
                self._optimize_document_structure(doc, remove_metadata)
                count = self._compress_pdf_images(doc, image_quality=q, max_dim=max_d)
                
                doc_bytes = doc.tobytes(
                    garbage=4,
                    deflate=True,
                    clean=True,
                    deflate_images=True,
                    deflate_fonts=True
                )
                cur_size = len(doc_bytes)
                diff = abs(cur_size - target_bytes)

                if diff < best_diff:
                    best_diff = diff
                    best_size = cur_size
                    best_data = doc_bytes
                    images_count = count

                if norm_mode == "maximum" and cur_size <= target_bytes:
                    if target_bytes <= (input_path.stat().st_size if input_path.exists() else cur_size):
                        output_path.write_bytes(doc_bytes)
                        return cur_size, count, True, "PDF optimized within target maximum size."
                elif norm_mode == "range" and min_bytes <= cur_size <= max_bytes:
                    output_path.write_bytes(doc_bytes)
                    return cur_size, count, True, f"PDF optimized to range [{format_bytes(min_bytes)} - {format_bytes(max_bytes)}]."
                elif norm_mode == "exact" and diff / target_bytes <= 0.03:
                    output_path.write_bytes(doc_bytes)
                    return cur_size, count, True, f"PDF optimized to closest size ({format_bytes(cur_size)})."

        if best_size > target_bytes:
            with fitz.open(input_path) as src_doc:
                for dpi in [120, 96, 75, 60, 50]:
                    for q in [65, 50, 35, 20, 10]:
                        resample_doc = fitz.open()
                        for page in src_doc:
                            pix = page.get_pixmap(dpi=dpi)
                            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                            img_buf = io.BytesIO()
                            img.save(img_buf, format="JPEG", quality=q, optimize=True)
                            rect = page.rect
                            new_page = resample_doc.new_page(width=rect.width, height=rect.height)
                            new_page.insert_image(rect, stream=img_buf.getvalue())
                        
                        resample_bytes = resample_doc.tobytes(garbage=4, deflate=True)
                        cur_size = len(resample_bytes)
                        diff = abs(cur_size - target_bytes)

                        if diff < best_diff or (norm_mode == "maximum" and cur_size <= target_bytes):
                            best_diff = diff
                            best_size = cur_size
                            best_data = resample_bytes
                            images_count = len(src_doc)

                        if norm_mode == "maximum" and cur_size <= target_bytes:
                            output_path.write_bytes(resample_bytes)
                            return cur_size, images_count, True, f"PDF resampled to meet maximum target size ({format_bytes(cur_size)})."
                        elif norm_mode == "range" and min_bytes <= cur_size <= max_bytes:
                            output_path.write_bytes(resample_bytes)
                            return cur_size, images_count, True, f"PDF resampled to target range [{format_bytes(min_bytes)} - {format_bytes(max_bytes)}]."
                        elif norm_mode == "exact" and diff / target_bytes <= 0.03:
                            output_path.write_bytes(resample_bytes)
                            return cur_size, images_count, True, f"PDF resampled to exact target ({format_bytes(cur_size)})."

        if best_data and best_size < target_bytes:
            pad_needed = target_bytes - best_size
            if pad_needed > 0:
                header = b"\n% SizeFix_PADDING "
                pad_data = header + (b"0" * max(0, pad_needed - len(header)))
                if len(pad_data) < pad_needed:
                    pad_data += b" " * (pad_needed - len(pad_data))
                elif len(pad_data) > pad_needed:
                    pad_data = pad_data[:pad_needed]
                best_data = best_data + pad_data
                best_size = len(best_data)
                output_path.write_bytes(best_data)
                return best_size, images_count, True, f"PDF expanded to target size ({format_bytes(best_size)})."

        if best_data:
            output_path.write_bytes(best_data)

        if norm_mode == "maximum" and best_size > target_bytes:
            return best_size, images_count, False, f"Closest achievable PDF size is {format_bytes(best_size)} ({best_size - target_bytes} bytes above target)."
        
        reached = (abs(best_size - target_bytes) / target_bytes <= 0.05) if norm_mode == "exact" else (best_size <= target_bytes)
        return best_size, images_count, reached, f"PDF optimization complete ({format_bytes(best_size)})."

    def process(
        self,
        input_path: Path,
        output_path: Path,
        analysis: FileAnalysisResult,
        options: ProcessRequestOptions
    ) -> ProcessResult:
        original_size = analysis.size_bytes
        req_fmt = (options.output_format or "pdf").lower().lstrip(".")
        if req_fmt == "original":
            req_fmt = "pdf"
        elif req_fmt == "jpeg":
            req_fmt = "jpg"

        target_bytes = parse_target_input(
            options.target_size,
            options.target_value,
            options.target_unit
        )

        total_pages = analysis.pdf_pages or 1
        images_optimized = 0
        target_reached = True
        reason = None
        img_w, img_h = None, None

        try:
            if req_fmt in ("jpg", "png", "webp"):
                with fitz.open(input_path) as doc:
                    total_pages = len(doc)
                    page = doc[0]
                    pix = page.get_pixmap(dpi=150)
                    img_w, img_h = pix.width, pix.height
                    
                    with Image.frombytes("RGB", [pix.width, pix.height], pix.samples) as pil_img:
                        if req_fmt == "jpg":
                            pil_img.save(output_path, format="JPEG", quality=options.quality or 85, optimize=True)
                        elif req_fmt == "png":
                            pil_img.save(output_path, format="PNG", optimize=True)
                        elif req_fmt == "webp":
                            pil_img.save(output_path, format="WEBP", quality=options.quality or 85)
                            
                output_size = output_path.stat().st_size
                saved_bytes = original_size - output_size
                return ProcessResult(
                    success=True,
                    original_filename=analysis.filename,
                    output_filename=output_path.name,
                    original_size=original_size,
                    original_size_human=format_bytes(original_size),
                    output_size=output_size,
                    output_size_human=format_bytes(output_size),
                    target_size=target_bytes,
                    target_size_human=format_bytes(target_bytes) if target_bytes else None,
                    target_reached=True,
                    compression_ratio=round(saved_bytes / original_size, 4) if original_size > 0 else 0.0,
                    saved_bytes=saved_bytes,
                    saved_bytes_human=format_bytes(abs(saved_bytes)),
                    format=req_fmt,
                    mode=options.target_mode,
                    reason=f"Converted PDF page to high-res {req_fmt.upper()}.",
                    pages=total_pages,
                    width=img_w,
                    height=img_h
                )

            elif req_fmt == "txt":
                text_content = []
                with fitz.open(input_path) as doc:
                    total_pages = len(doc)
                    for page in doc:
                        text_content.append(page.get_text())
                full_text = "\n\n--- Page Break ---\n\n".join(text_content)
                output_path.write_text(full_text, encoding="utf-8")
                output_size = output_path.stat().st_size
                saved_bytes = original_size - output_size
                return ProcessResult(
                    success=True,
                    original_filename=analysis.filename,
                    output_filename=output_path.name,
                    original_size=original_size,
                    original_size_human=format_bytes(original_size),
                    output_size=output_size,
                    output_size_human=format_bytes(output_size),
                    target_size=target_bytes,
                    target_size_human=format_bytes(target_bytes) if target_bytes else None,
                    target_reached=True,
                    compression_ratio=round(saved_bytes / original_size, 4) if original_size > 0 else 0.0,
                    saved_bytes=saved_bytes,
                    saved_bytes_human=format_bytes(abs(saved_bytes)),
                    format="txt",
                    mode=options.target_mode,
                    reason=f"Extracted searchable text across {total_pages} page(s).",
                    pages=total_pages
                )

            else:
                if target_bytes is not None:
                    output_size, images_optimized, target_reached, reason = self._adaptive_target_search(
                        input_path=input_path,
                        output_path=output_path,
                        target_bytes=target_bytes,
                        mode=options.target_mode,
                        remove_metadata=options.remove_metadata
                    )
                else:
                    level = options.pdf_compression_level or "balanced"
                    q_map = {"low": (85, 2000), "balanced": (70, 1500), "maximum": (45, 900)}
                    q, max_dim = q_map.get(level, (70, 1500))
                    
                    with fitz.open(input_path) as doc:
                        total_pages = len(doc)
                        self._optimize_document_structure(doc, options.remove_metadata)
                        if options.pdf_optimize_images:
                            images_optimized = self._compress_pdf_images(doc, image_quality=q, max_dim=max_dim)
                        output_size = self._save_pdf_optimized(doc, output_path)
                        
                    target_reached = True
                    reason = f"PDF structure and {images_optimized} embedded image(s) compressed using '{level}' profile."
        except Exception as e:
            raise ProcessingError(f"PDF processing failed: {str(e)}")

        saved_bytes = original_size - output_size
        compression_ratio = round(saved_bytes / original_size, 4) if original_size > 0 else 0.0

        return ProcessResult(
            success=True,
            original_filename=analysis.filename,
            output_filename=output_path.name,
            original_size=original_size,
            original_size_human=format_bytes(original_size),
            output_size=output_size,
            output_size_human=format_bytes(output_size),
            target_size=target_bytes,
            target_size_human=format_bytes(target_bytes) if target_bytes else None,
            target_reached=target_reached,
            compression_ratio=compression_ratio,
            saved_bytes=saved_bytes,
            saved_bytes_human=format_bytes(abs(saved_bytes)),
            format="pdf",
            mode=options.target_mode,
            closest_size=output_size if not target_reached else None,
            difference_bytes=abs(output_size - target_bytes) if target_bytes else None,
            reason=reason,
            pages=total_pages,
            images_optimized=images_optimized
        )
