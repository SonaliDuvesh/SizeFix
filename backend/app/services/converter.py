from typing import Dict, List

SUPPORTED_CONVERSIONS_MAP: Dict[str, Dict[str, List[str]]] = {
    "image": {
        "IMAGE": ["jpg", "jpeg", "png", "webp", "avif", "heic", "gif", "bmp", "tiff"],
        "DOCUMENT": ["pdf", "txt"]
    },
    "document": {
        "IMAGE": ["jpg", "png", "webp"],
        "DOCUMENT": ["pdf", "txt", "docx"]
    }
}

def get_available_formats_for_file(extension: str, category: str) -> Dict[str, List[str]]:
    ext = extension.lower().lstrip(".")
    
    if category == "image":
        return {
            "IMAGE": ["jpg", "png", "webp", "avif", "heic", "gif", "bmp", "tiff"],
            "DOCUMENT": ["pdf"]
        }
    elif ext == "pdf":
        return {
            "IMAGE": ["jpg", "png", "webp"],
            "DOCUMENT": ["pdf", "txt"]
        }
    elif ext in ("docx", "txt", "xlsx", "pptx"):
        return {
            "DOCUMENT": ["pdf", "txt", "docx"]
        }
    return {
        "IMAGE": ["jpg", "png", "webp"],
        "DOCUMENT": ["pdf"]
    }
