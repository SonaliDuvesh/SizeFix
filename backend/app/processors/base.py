from abc import ABC, abstractmethod
from pathlib import Path
from app.models.analysis import FileAnalysisResult
from app.models.processing import ProcessRequestOptions, ProcessResult

class BaseProcessor(ABC):
    @abstractmethod
    def can_process(self, analysis: FileAnalysisResult) -> bool:
        """Determines if this processor can handle the given file type."""
        pass

    @abstractmethod
    def process(
        self,
        input_path: Path,
        output_path: Path,
        analysis: FileAnalysisResult,
        options: ProcessRequestOptions
    ) -> ProcessResult:
        """Processes the file according to the requested options."""
        pass
