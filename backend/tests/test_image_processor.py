from pathlib import Path
from PIL import Image
from app.services.analyzer import analyze_file
from app.processors.image_processor import ImageProcessor
from app.models.processing import ProcessRequestOptions

def test_jpeg_compression_and_quality(sample_jpeg_path: Path, tmp_path: Path):
    processor = ImageProcessor()
    out_path = tmp_path / "out.jpg"
    analysis = analyze_file(sample_jpeg_path, "test_photo.jpg")

    options = ProcessRequestOptions(
        quality=50,
        progressive=True,
        remove_metadata=True
    )

    result = processor.process(sample_jpeg_path, out_path, analysis, options)
    assert result.success is True
    assert result.output_size < result.original_size
    assert result.format == "jpg"
    assert result.compression_ratio > 0
    assert out_path.exists()

def test_jpeg_target_maximum_size(sample_jpeg_path: Path, tmp_path: Path):
    processor = ImageProcessor()
    out_path = tmp_path / "out_target.jpg"
    analysis = analyze_file(sample_jpeg_path, "test_photo.jpg")

    target_kb = 50
    target_bytes = target_kb * 1024

    options = ProcessRequestOptions(
        target_size=f"{target_kb} KB",
        target_mode="maximum"
    )

    result = processor.process(sample_jpeg_path, out_path, analysis, options)
    assert result.success is True
    assert result.output_size <= target_bytes or result.target_reached is True
    assert result.saved_bytes > 0
    assert out_path.exists()

def test_image_target_range_mode(sample_jpeg_path: Path, tmp_path: Path):
    processor = ImageProcessor()
    out_path = tmp_path / "out_range.jpg"
    analysis = analyze_file(sample_jpeg_path, "test_photo.jpg")

    target_kb = 60
    options = ProcessRequestOptions(
        target_size=f"{target_kb} KB",
        target_mode="range"
    )

    result = processor.process(sample_jpeg_path, out_path, analysis, options)
    assert result.success is True
    assert out_path.exists()
    assert result.output_size > 0

def test_png_to_webp_conversion(sample_png_path: Path, tmp_path: Path):
    processor = ImageProcessor()
    out_path = tmp_path / "out_graphic.webp"
    analysis = analyze_file(sample_png_path, "test_graphic.png")

    options = ProcessRequestOptions(
        output_format="webp",
        quality=80
    )

    result = processor.process(sample_png_path, out_path, analysis, options)
    assert result.success is True
    assert result.format == "webp"
    assert out_path.exists()

    with Image.open(out_path) as img:
        assert img.format == "WEBP"

def test_image_resizing_maintain_aspect_ratio(sample_jpeg_path: Path, tmp_path: Path):
    processor = ImageProcessor()
    out_path = tmp_path / "out_resized.jpg"
    analysis = analyze_file(sample_jpeg_path, "test_photo.jpg")

    options = ProcessRequestOptions(
        width=600,
        maintain_aspect_ratio=True
    )

    result = processor.process(sample_jpeg_path, out_path, analysis, options)
    assert result.success is True
    assert result.width == 600
    assert result.height == 400

def test_rgba_to_jpeg_conversion(sample_png_path: Path, tmp_path: Path):
    processor = ImageProcessor()
    out_path = tmp_path / "out_converted.jpg"
    analysis = analyze_file(sample_png_path, "test_graphic.png")

    options = ProcessRequestOptions(
        output_format="jpg",
        quality=85
    )

    result = processor.process(sample_png_path, out_path, analysis, options)
    assert result.success is True
    assert result.format == "jpg"
    with Image.open(out_path) as img:
        assert img.mode == "RGB"
