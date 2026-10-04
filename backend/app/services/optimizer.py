from pathlib import Path
from typing import Optional
from app.core.errors import UnsupportedFormatError
from app.models.analysis import FileAnalysisResult
from app.models.processing import ProcessRequestOptions, ProcessResult
from app.processors.image_processor import ImageProcessor
from app.processors.pdf_processor import PDFProcessor

class OptimizationManager:
    def __init__(self):
        self.processors = [
            ImageProcessor(),
            PDFProcessor()
        ]

    def get_processor(self, analysis: FileAnalysisResult):
        for proc in self.processors:
            if proc.can_process(analysis):
                return proc
        raise UnsupportedFormatError(
            f"No processor registered to handle format '{analysis.extension}' ({analysis.mime_type})."
        )

    def optimize(
        self,
        input_path: Path,
        output_path: Path,
        analysis: FileAnalysisResult,
        options: ProcessRequestOptions
    ) -> ProcessResult:
        processor = self.get_processor(analysis)
        return processor.process(
            input_path=input_path,
            output_path=output_path,
            analysis=analysis,
            options=options
        )

optimizer_service = OptimizationManager()
