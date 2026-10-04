from pathlib import Path
import fitz
from app.services.analyzer import analyze_file
from app.processors.pdf_processor import PDFProcessor
from app.models.processing import ProcessRequestOptions

def test_pdf_structure_and_image_compression(sample_pdf_path: Path, tmp_path: Path):
    processor = PDFProcessor()
    out_path = tmp_path / "out_optimized.pdf"
    analysis = analyze_file(sample_pdf_path, "test_document.pdf")

    options = ProcessRequestOptions(
        pdf_compression_level="maximum",
        pdf_optimize_images=True,
        remove_metadata=True
    )

    result = processor.process(sample_pdf_path, out_path, analysis, options)
    assert result.success is True
    assert result.format == "pdf"
    assert out_path.exists()
    assert result.pages == 2

    with fitz.open(out_path) as doc:
        assert len(doc) == 2
        text_p1 = doc[0].get_text()
        assert "Official Application Document" in text_p1
        assert "searchable text must remain intact" in text_p1

def test_pdf_target_size_mode(sample_pdf_path: Path, tmp_path: Path):
    processor = PDFProcessor()
    out_path = tmp_path / "out_target.pdf"
    analysis = analyze_file(sample_pdf_path, "test_document.pdf")

    options = ProcessRequestOptions(
        target_size="25 KB",
        target_mode="maximum"
    )

    result = processor.process(sample_pdf_path, out_path, analysis, options)
    assert result.success is True
    assert result.format == "pdf"
    assert out_path.exists()
