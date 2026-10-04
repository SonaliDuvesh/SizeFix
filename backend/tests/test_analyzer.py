import pytest
from pathlib import Path
from app.services.analyzer import analyze_file
from app.core.errors import CorruptedFileError

def test_analyze_jpeg(sample_jpeg_path: Path):
    result = analyze_file(sample_jpeg_path, "test_photo.jpg")
    assert result.filename == "test_photo.jpg"
    assert result.extension == "jpg"
    assert result.category == "image"
    assert result.is_supported is True
    assert result.mime_type == "image/jpeg"
    assert result.dimensions is not None
    assert result.dimensions.width == 1200
    assert result.dimensions.height == 800
    assert result.color_mode == "RGB"
    assert result.has_alpha is False
    assert "compress" in result.supported_operations

def test_analyze_png(sample_png_path: Path):
    result = analyze_file(sample_png_path, "test_graphic.png")
    assert result.category == "image"
    assert result.extension == "png"
    assert result.is_supported is True
    assert result.dimensions.width == 800
    assert result.dimensions.height == 600
    assert result.has_alpha is True
    assert result.color_mode == "RGBA"

def test_analyze_pdf(sample_pdf_path: Path):
    result = analyze_file(sample_pdf_path, "test_document.pdf")
    assert result.category == "document"
    assert result.extension == "pdf"
    assert result.is_supported is True
    assert result.pdf_pages == 2
    assert result.pdf_metadata is not None
    assert result.pdf_metadata.get("title") == "Test Invoice Document"

def test_analyze_corrupted_file(sample_corrupted_path: Path):
    with pytest.raises(CorruptedFileError):
        analyze_file(sample_corrupted_path, "corrupted.jpg")

def test_analyze_unsupported_file(sample_unsupported_path: Path):
    result = analyze_file(sample_unsupported_path, "archive.xyz")
    assert result.category == "unsupported"
    assert result.is_supported is False
    assert len(result.supported_operations) == 0
