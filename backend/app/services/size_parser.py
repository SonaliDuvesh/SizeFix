import re
from typing import Optional, Tuple
from app.core.errors import InvalidTargetSizeError

UNIT_MULTIPLIERS = {
    "B": 1,
    "BYTE": 1,
    "BYTES": 1,
    "KB": 1024,
    "K": 1024,
    "MB": 1024 ** 2,
    "M": 1024 ** 2,
    "GB": 1024 ** 3,
    "G": 1024 ** 3,
}

def format_bytes(size_bytes: int) -> str:
    """Converts byte count into a clean human-readable string."""
    if size_bytes < 0:
        return "0 B"
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        val = size_bytes / 1024
        return f"{val:.2f} KB".rstrip("0").rstrip(".") + (" KB" if not val.is_integer() else ".0 KB") if False else f"{val:.2f} KB"
    elif size_bytes < 1024 ** 3:
        val = size_bytes / (1024 ** 2)
        return f"{val:.2f} MB"
    else:
        val = size_bytes / (1024 ** 3)
        return f"{val:.2f} GB"

def parse_size_components(value: float, unit: str) -> int:
    """
    Parses numeric value and unit string into total bytes.
    Validates positive non-zero values and supported units.
    """
    if value is None:
        raise InvalidTargetSizeError("Target value cannot be null.")
        
    try:
        val = float(value)
    except (ValueError, TypeError):
        raise InvalidTargetSizeError(f"Invalid numeric target value: '{value}'.")
        
    if val <= 0:
        raise InvalidTargetSizeError(f"Target size must be strictly greater than zero (received {val}).")
        
    norm_unit = unit.strip().upper() if unit else "KB"
    if norm_unit not in UNIT_MULTIPLIERS:
        raise InvalidTargetSizeError(
            f"Unsupported size unit: '{unit}'. Supported units are: B, KB, MB, GB."
        )
        
    bytes_val = int(round(val * UNIT_MULTIPLIERS[norm_unit]))
    if bytes_val <= 0:
        raise InvalidTargetSizeError("Computed target size in bytes must be positive.")
    return bytes_val

def parse_size_string(size_str: str) -> int:
    """
    Parses strings like '500 KB', '1.5 MB', '0.5MB', '100kb', '1 GB' into bytes.
    """
    if not size_str or not size_str.strip():
        raise InvalidTargetSizeError("Size string cannot be empty.")
        
    cleaned = size_str.strip().replace(",", "")
    match = re.match(r"^([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)?$", cleaned)
    if not match:
        raise InvalidTargetSizeError(f"Cannot parse target size string: '{size_str}'. Format should be like '500 KB' or '1.5 MB'.")
        
    num_str, unit_str = match.groups()
    unit = unit_str if unit_str else "KB"
    return parse_size_components(float(num_str), unit)

def parse_target_input(
    target_size_str: Optional[str] = None,
    target_value: Optional[float] = None,
    target_unit: Optional[str] = None
) -> Optional[int]:
    """
    Unified resolver: accepts either a composite string or separate value & unit.
    """
    if target_value is not None:
        unit = target_unit or "KB"
        return parse_size_components(target_value, unit)
        
    if target_size_str is not None and target_size_str.strip():
        return parse_size_string(target_size_str)
        
    return None
