import os
import uuid
import re
from pathlib import Path
from typing import Generator
from contextlib import contextmanager
from app.core.config import settings
from app.core.errors import FileTooLargeError

def sanitize_filename(filename: str) -> str:
    """
    Sanitizes user-provided filename to prevent path traversal and shell injection.
    """
    if not filename:
        return "file"
    basename = os.path.basename(filename)
    cleaned = re.sub(r'[^a-zA-Z0-9_.\-\(\)\s]', '_', basename).strip()
    return cleaned or "file"

def generate_secure_temp_path(original_filename: str, prefix: str = "temp_") -> Path:
    """
    Generates a randomized, isolated temp file path in the application's temp directory.
    """
    safe_name = sanitize_filename(original_filename)
    ext = Path(safe_name).suffix
    unique_name = f"{prefix}{uuid.uuid4().hex}{ext}"
    return settings.TEMP_DIR / unique_name

@contextmanager
def safe_temp_file(original_filename: str) -> Generator[Path, None, None]:
    """
    Context manager that yields a temporary file path and cleans it up upon exit.
    """
    temp_path = generate_secure_temp_path(original_filename)
    try:
        yield temp_path
    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass

def validate_file_size(size_bytes: int):
    if size_bytes > settings.MAX_FILE_SIZE_BYTES:
        raise FileTooLargeError(
            f"File size ({size_bytes} bytes) exceeds limit of {settings.MAX_FILE_SIZE_BYTES} bytes."
        )
