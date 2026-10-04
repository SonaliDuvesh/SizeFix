import io
import math
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image, ImageOps

from app.core.config import settings
from app.core.errors import ProcessingError, TargetImpossibleError, UnsupportedConversionError
from app.models.analysis import FileAnalysisResult
from app.models.processing import ProcessRequestOptions, ProcessResult
from app.processors.base import BaseProcessor
from app.services.size_parser import format_bytes, parse_target_input

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIF_AVAILABLE = True
except Exception:
    HEIF_AVAILABLE = False

class ImageProcessor(BaseProcessor):
    def can_process(self, analysis: FileAnalysisResult) -> bool:
        return analysis.category == "image" and analysis.is_supported

    def _determine_target_format(self, original_ext: str, requested_format: Optional[str]) -> str:
        if requested_format and requested_format.lower() != "original":
            fmt = requested_format.lower().lstrip(".")
            if fmt == "jpeg":
                fmt = "jpg"
            if fmt not in settings.SUPPORTED_IMAGE_EXTENSIONS and fmt != "pdf":
                raise UnsupportedConversionError(f"Target format '{requested_format}' is not supported.")
            return fmt
        
        orig = original_ext.lower().lstrip(".")
        return "jpg" if orig == "jpeg" else orig

    def _prepare_image_for_format(self, img: Image.Image, target_fmt: str) -> Image.Image:
        target_fmt = target_fmt.lower()
        if target_fmt in ("jpg", "jpeg", "bmp", "pdf"):
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode != "RGBA":
                    img = img.convert("RGBA")
                background.paste(img, mask=img.split()[3])
                return background
            elif img.mode != "RGB":
                return img.convert("RGB")
        elif target_fmt == "png":
            if img.mode not in ("RGB", "RGBA", "L", "LA", "P"):
                return img.convert("RGBA")
        elif target_fmt == "webp":
            if img.mode not in ("RGB", "RGBA"):
                return img.convert("RGBA" if "A" in img.mode else "RGB")
        return img

    def _encode_to_bytes(
        self,
        img: Image.Image,
        target_fmt: str,
        quality: int = 85,
        progressive: bool = True,
        remove_metadata: bool = True
    ) -> bytes:
        buf = io.BytesIO()
        target_fmt = target_fmt.lower()
        save_kwargs = {}

        if target_fmt in ("jpg", "jpeg"):
            save_kwargs["format"] = "JPEG"
            save_kwargs["quality"] = max(1, min(100, quality))
            save_kwargs["optimize"] = True
            save_kwargs["progressive"] = progressive
        elif target_fmt == "pdf":
            if img.mode != "RGB":
                img = img.convert("RGB")
            img.save(buf, format="PDF", resolution=100.0)
            return buf.getvalue()
        elif target_fmt == "png":
            save_kwargs["format"] = "PNG"
            save_kwargs["optimize"] = True
            save_kwargs["compress_level"] = 9
            if quality < 90:
                colors = max(16, int((quality / 100.0) * 256))
                img = img.quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
        elif target_fmt == "webp":
            save_kwargs["format"] = "WEBP"
            save_kwargs["quality"] = max(1, min(100, quality))
            save_kwargs["method"] = 4
        elif target_fmt in ("heic", "heif"):
            if HEIF_AVAILABLE:
                save_kwargs["format"] = "HEIF"
                save_kwargs["quality"] = max(1, min(100, quality))
            else:
                save_kwargs["format"] = "JPEG"
                save_kwargs["quality"] = max(1, min(100, quality))
        elif target_fmt == "avif":
            save_kwargs["format"] = "AVIF"
            save_kwargs["quality"] = max(1, min(100, quality))
        elif target_fmt == "gif":
            save_kwargs["format"] = "GIF"
            save_kwargs["optimize"] = True
        elif target_fmt == "bmp":
            save_kwargs["format"] = "BMP"
        elif target_fmt in ("tiff", "tif"):
            save_kwargs["format"] = "TIFF"
            save_kwargs["compression"] = "tiff_deflate"
        else:
            save_kwargs["format"] = target_fmt.upper()

        if not remove_metadata and hasattr(img, "info"):
            if "exif" in img.info:
                save_kwargs["exif"] = img.info["exif"]
            if "icc_profile" in img.info:
                save_kwargs["icc_profile"] = img.info["icc_profile"]

        img.save(buf, **save_kwargs)
        return buf.getvalue()

    def _resize_image(
        self,
        img: Image.Image,
        target_w: Optional[int],
        target_h: Optional[int],
        maintain_aspect: bool = True,
        scale_factor: float = 1.0
    ) -> Image.Image:
        orig_w, orig_h = img.size
        
        if scale_factor != 1.0:
            new_w = max(1, int(round(orig_w * scale_factor)))
            new_h = max(1, int(round(orig_h * scale_factor)))
            return img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
        if not target_w and not target_h:
            return img

        if target_w and target_h and not maintain_aspect:
            return img.resize((target_w, target_h), Image.Resampling.LANCZOS)

        if target_w and not target_h:
            aspect = orig_h / orig_w
            new_h = max(1, int(round(target_w * aspect)))
            return img.resize((target_w, new_h), Image.Resampling.LANCZOS)

        if target_h and not target_w:
            aspect = orig_w / orig_h
            new_w = max(1, int(round(target_h * aspect)))
            return img.resize((new_w, target_h), Image.Resampling.LANCZOS)

        if target_w and target_h and maintain_aspect:
            ratio = min(target_w / orig_w, target_h / orig_h)
            new_w = max(1, int(round(orig_w * ratio)))
            new_h = max(1, int(round(orig_h * ratio)))
            return img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        return img

    def _search_optimal_encoding(
        self,
        base_img: Image.Image,
        target_fmt: str,
        target_bytes: int,
        mode: str,
        tolerance_pct: float = 0.01
    ) -> Tuple[bytes, int, Tuple[int, int], bool, Optional[str]]:
        norm_mode = (mode or "maximum").lower()
        min_bytes = int(target_bytes * 0.95)
        max_bytes = target_bytes if norm_mode == "maximum" else int(target_bytes * 1.05)

        best_data: Optional[bytes] = None
        best_quality = 85
        best_scale = 1.0
        best_size = 0
        best_dimensions = base_img.size
        best_diff = float("inf")
        target_reached = False

        base_max_bytes = len(self._encode_to_bytes(base_img, target_fmt, quality=95))
        needs_upscale = (target_bytes > base_max_bytes)

        if needs_upscale:
            scale_steps = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0, 2.2, 2.5]
        else:
            scale_steps = [1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2]

        for scale in scale_steps:
            scaled_img = self._resize_image(base_img, None, None, scale_factor=scale)
            
            low_q = 5
            high_q = 98
            max_iter = 12
            iter_count = 0
            
            while low_q <= high_q and iter_count < max_iter:
                iter_count += 1
                mid_q = (low_q + high_q) // 2
                data = self._encode_to_bytes(scaled_img, target_fmt, quality=mid_q)
                cur_size = len(data)
                diff = abs(cur_size - target_bytes)

                if diff < best_diff:
                    best_diff = diff
                    best_data = data
                    best_size = cur_size
                    best_quality = mid_q
                    best_scale = scale
                    best_dimensions = scaled_img.size

                if norm_mode == "maximum":
                    if cur_size <= target_bytes:
                        target_reached = True
                        low_q = mid_q + 1
                    else:
                        high_q = mid_q - 1
                elif norm_mode == "range":
                    if min_bytes <= cur_size <= max_bytes:
                        target_reached = True
                        return data, mid_q, scaled_img.size, True, f"Target reached within range [{format_bytes(min_bytes)} - {format_bytes(max_bytes)}]."
                    elif cur_size < min_bytes:
                        low_q = mid_q + 1
                    else:
                        high_q = mid_q - 1
                else:
                    if diff / target_bytes <= 0.005:
                        target_reached = True
                        return data, mid_q, scaled_img.size, True, f"Exact target reached ({format_bytes(cur_size)})."
                    if cur_size < target_bytes:
                        low_q = mid_q + 1
                    else:
                        high_q = mid_q - 1

            if norm_mode == "maximum" and target_reached and not needs_upscale:
                return best_data, best_quality, best_dimensions, True, "Target reached within maximum constraint."

        if norm_mode == "exact" and best_diff / target_bytes > 0.005:
            micro_steps = [
                best_scale * (1 + delta)
                for delta in [-0.04, -0.03, -0.02, -0.01, -0.005, 0.005, 0.01, 0.02, 0.03, 0.04]
                if 0.1 <= best_scale * (1 + delta) <= 3.0
            ]
            for m_scale in micro_steps:
                m_img = self._resize_image(base_img, None, None, scale_factor=m_scale)
                for q_offset in [-2, -1, 0, 1, 2]:
                    test_q = max(5, min(100, best_quality + q_offset))
                    data = self._encode_to_bytes(m_img, target_fmt, quality=test_q)
                    cur_size = len(data)
                    diff = abs(cur_size - target_bytes)
                    
                    if diff < best_diff:
                        best_diff = diff
                        best_data = data
                        best_size = cur_size
                        best_quality = test_q
                        best_dimensions = m_img.size
                        
                    if diff / target_bytes <= 0.003:
                        return best_data, best_quality, best_dimensions, True, f"Precision target reached ({format_bytes(best_size)})."

        if not best_data:
            lowest_img = self._resize_image(base_img, None, None, scale_factor=0.2)
            best_data = self._encode_to_bytes(lowest_img, target_fmt, quality=10)
            best_size = len(best_data)
            best_quality = 10
            best_dimensions = lowest_img.size

        if norm_mode == "exact" and best_size < target_bytes:
            pad_len = target_bytes - best_size
            best_data = best_data + (b"\x00" * pad_len)
            best_size = len(best_data)
            best_diff = 0
            target_reached = True
            reason = f"Target reached: {format_bytes(best_size)}."
        elif norm_mode == "maximum" and best_size > target_bytes:
            target_reached = False
            reason = f"Closest achievable size is {format_bytes(best_size)} ({best_size - target_bytes} bytes over target)."
        elif norm_mode == "exact" and best_diff / target_bytes > 0.02:
            target_reached = False
            reason = f"Closest achievable size is {format_bytes(best_size)} (difference: {abs(best_size - target_bytes)} bytes)."
        else:
            target_reached = True
            reason = f"Target reached: {format_bytes(best_size)}."

        return best_data, best_quality, best_dimensions, target_reached, reason

    def process(
        self,
        input_path: Path,
        output_path: Path,
        analysis: FileAnalysisResult,
        options: ProcessRequestOptions
    ) -> ProcessResult:
        original_size = analysis.size_bytes
        target_fmt = self._determine_target_format(analysis.extension, options.output_format)
        
        try:
            with Image.open(input_path) as raw_img:
                img = ImageOps.exif_transpose(raw_img) or raw_img
                img = img.copy()
        except Exception as e:
            raise ProcessingError(f"Failed to open source image: {str(e)}")

        orig_w, orig_h = img.size
        
        if options.width or options.height:
            img = self._resize_image(
                img,
                options.width,
                options.height,
                maintain_aspect=options.maintain_aspect_ratio
            )

        img = self._prepare_image_for_format(img, target_fmt)

        target_bytes = parse_target_input(
            options.target_size,
            options.target_value,
            options.target_unit
        )

        final_bytes: bytes
        applied_quality = options.quality or 85
        final_w, final_h = img.size
        target_reached = True
        reason = None

        if target_bytes is not None:
            final_bytes, applied_quality, (final_w, final_h), target_reached, reason = self._search_optimal_encoding(
                img,
                target_fmt,
                target_bytes,
                options.target_mode
            )
        else:
            quality = options.quality if options.quality is not None else 82
            final_bytes = self._encode_to_bytes(
                img,
                target_fmt,
                quality=quality,
                progressive=options.progressive,
                remove_metadata=options.remove_metadata
            )
            applied_quality = quality
            target_reached = True
            reason = f"Converted to {target_fmt.upper()} with requested parameters."

        output_size = len(final_bytes)
        output_path.write_bytes(final_bytes)

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
            format=target_fmt,
            mode=options.target_mode,
            closest_size=output_size if not target_reached else None,
            difference_bytes=abs(output_size - target_bytes) if target_bytes else None,
            reason=reason,
            quality=applied_quality,
            width=final_w,
            height=final_h,
            original_width=orig_w,
            original_height=orig_h
        )
