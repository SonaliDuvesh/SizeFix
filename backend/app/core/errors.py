from typing import Any, Optional
from fastapi import HTTPException, status

class AppError(Exception):
    def __init__(
        self,
        error_code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[dict[str, Any]] = None
    ):
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> dict[str, Any]:
        res = {
            "success": False,
            "error_code": self.error_code,
            "message": self.message
        }
        if self.details:
            res["details"] = self.details
        return res

class UnsupportedFormatError(AppError):
    def __init__(self, message: str = "This file format is not currently supported.", details: Optional[dict] = None):
        super().__init__("UNSUPPORTED_FORMAT", message, status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, details)

class CorruptedFileError(AppError):
    def __init__(self, message: str = "The uploaded file appears to be corrupted or invalid.", details: Optional[dict] = None):
        super().__init__("CORRUPTED_FILE", message, status.HTTP_400_BAD_REQUEST, details)

class InvalidTargetSizeError(AppError):
    def __init__(self, message: str = "The target size specified is invalid.", details: Optional[dict] = None):
        super().__init__("INVALID_TARGET_SIZE", message, status.HTTP_400_BAD_REQUEST, details)

class TargetImpossibleError(AppError):
    def __init__(self, message: str = "The requested target size cannot be reached without unacceptable quality loss or corruption.", details: Optional[dict] = None):
        super().__init__("TARGET_IMPOSSIBLE", message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)

class FileTooLargeError(AppError):
    def __init__(self, message: str = "Uploaded file exceeds maximum allowable processing limit.", details: Optional[dict] = None):
        super().__init__("FILE_TOO_LARGE", message, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, details)

class ProcessingError(AppError):
    def __init__(self, message: str = "An error occurred during file processing.", details: Optional[dict] = None):
        super().__init__("PROCESSING_ERROR", message, status.HTTP_500_INTERNAL_SERVER_ERROR, details)

class UnsupportedConversionError(AppError):
    def __init__(self, message: str = "Conversion between the requested formats is not supported.", details: Optional[dict] = None):
        super().__init__("UNSUPPORTED_CONVERSION", message, status.HTTP_400_BAD_REQUEST, details)
