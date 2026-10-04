# SizeFix Core Processing Engine

A high-performance, local-first file size optimization, conversion, and analysis engine built with Python & FastAPI.

---

## 1. Project Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application entrypoint & middleware
│   ├── api/
│   │   ├── __init__.py
│   │   └── endpoints.py         # REST API endpoints (/analyze, /process, /download, /supported-formats)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py            # Global configuration, formats, and limits
│   │   ├── errors.py            # Structured application error definitions
│   │   └── security.py          # Secure temp file management & sanitization
│   ├── models/
│   │   ├── __init__.py
│   │   ├── analysis.py          # File metadata & analysis response schemas
│   │   └── processing.py        # Optimization options & result models
│   ├── processors/
│   │   ├── __init__.py
│   │   ├── base.py              # BaseProcessor abstract interface
│   │   ├── image_processor.py   # Adaptive image compression, resizing, format conversion
│   │   └── pdf_processor.py     # PDF deflation, structure optimization & image downsampling
│   ├── services/
│   │   ├── __init__.py
│   │   ├── analyzer.py          # Non-destructive file inspection
│   │   ├── converter.py         # Format conversion registry
│   │   ├── optimizer.py         # Processor dispatcher & orchestrator
│   │   └── size_parser.py       # Size unit parser (KB, MB, GB, B)
│   └── utils/
│       └── __init__.py
├── tests/
│   ├── conftest.py              # Pytest fixtures for test files (JPG, PNG, PDF, WEBP, corrupted)
│   ├── test_analyzer.py         # Tests for file analysis & metadata extraction
│   ├── test_api.py              # End-to-end integration tests for FastAPI routes
│   ├── test_image_processor.py  # Tests for JPEG, PNG, WEBP compression & resizing
│   ├── test_pdf_processor.py    # Tests for PDF structure & image optimization
│   └── test_size_parser.py      # Tests for size string parsing & unit conversion
├── requirements.txt
└── README.md
```

---

## 2. Requirements & Dependencies

- **Python 3.10+** (Tested on Python 3.14)
- **FastAPI & Uvicorn**: Async REST API framework
- **Pillow & Pillow-Heif**: Image manipulation, encoding, and AVIF support
- **PyMuPDF (fitz) & PyPDF**: Document stream optimization, image downsampling, and metadata cleaning
- **Pydantic**: Data validation and serialization
- **Pytest & HTTPX**: Testing suite

---

## 3. Installation Instructions

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate  # On Linux/macOS
# or .venv\Scripts\activate on Windows

# Install required dependencies
pip install -r requirements.txt
```

---

## 4. Running the Backend Server

```bash
# Start FastAPI server on port 8000 with auto-reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

---

## 5. API Documentation

### `GET /supported-formats`
Returns supported file formats, extensions, planned formats, and available operations.

### `POST /analyze`
Non-destructively inspects an uploaded file.
- **Request**: Multipart Form (`file: UploadFile`)
- **Response**:
```json
{
  "filename": "photo.jpg",
  "extension": "jpg",
  "mime_type": "image/jpeg",
  "size_bytes": 2984512,
  "size_human": "2.85 MB",
  "category": "image",
  "is_supported": true,
  "dimensions": {
    "width": 1920,
    "height": 1080
  },
  "color_mode": "RGB",
  "has_alpha": false,
  "supported_operations": [
    "compress",
    "resize",
    "quality_adjust",
    "convert",
    "target_size"
  ]
}
```

### `POST /process`
Optimizes, resizes, compresses, or converts a file.
- **Parameters (Multipart Form)**:
  - `file`: Upload file
  - `target_size`: e.g. `"500 KB"`, `"1.5 MB"` (Optional)
  - `target_value`: Numeric value (Optional)
  - `target_unit`: `"KB"`, `"MB"`, `"GB"`, `"B"` (Optional)
  - `target_mode`: `"maximum"`, `"exact"`, `"range"` (Default: `"maximum"`)
  - `output_format`: `"jpg"`, `"png"`, `"webp"`, `"avif"`, `"pdf"`, etc. (Optional)
  - `quality`: Integer `1-100` (Optional manual override)
  - `width`: Integer width (Optional)
  - `height`: Integer height (Optional)
  - `maintain_aspect_ratio`: Boolean (Default: `true`)
  - `remove_metadata`: Boolean (Default: `true`)
  - `progressive`: Boolean (Default: `true`)
  - `pdf_compression_level`: `"low"`, `"balanced"`, `"maximum"` (Default: `"balanced"`)
  - `pdf_optimize_images`: Boolean (Default: `true`)
  - `response_mode`: `"json"` (returns metadata & download token) or `"file"` (streams file with `X-Processing-Result` header)

- **Sample JSON Response**:
```json
{
  "success": true,
  "original_filename": "photo.jpg",
  "output_filename": "out_abc123_photo.jpg",
  "original_size": 2984512,
  "original_size_human": "2.85 MB",
  "output_size": 498112,
  "output_size_human": "486.44 KB",
  "target_size": 512000,
  "target_size_human": "500.00 KB",
  "target_reached": true,
  "compression_ratio": 0.8331,
  "saved_bytes": 2486400,
  "saved_bytes_human": "2.37 MB",
  "format": "jpg",
  "mode": "maximum",
  "quality": 74,
  "width": 1920,
  "height": 1080,
  "output_file_id": "out_abc123_photo.jpg"
}
```

### `GET /download/{file_id}`
Downloads the processed file generated by `/process`.

---

## 6. Test Suite & Verification

Run tests with `pytest`:
```bash
PYTHONPATH=. .venv/bin/pytest -v
```

### Test Coverage (25 Passed):
- `test_size_parser.py`: String parsing, unit conversion, invalid value handling, unit validation
- `test_analyzer.py`: Non-destructive inspection of JPEG, PNG, and PDF, error states on corrupted files
- `test_image_processor.py`: Quality adjustment, target maximum/exact search, PNG to WEBP, Lanczos aspect-ratio resizing, RGBA to RGB conversion
- `test_pdf_processor.py`: Deflate structure optimization, metadata stripping, embedded image recompression, text preservation
- `test_api.py`: FastAPI routes, multipart uploads, file streaming, structured error handling

---

## 7. Supported Formats & Capabilities

| Format | Read / Analyze | Compress | Resize | Convert | Target Size Search |
|---|---|---|---|---|---|
| **JPEG / JPG** | Yes | Yes (Progressive) | Yes | Yes | Yes (Adaptive Binary Search) |
| **PNG** | Yes | Yes (Lossless/Quantized) | Yes | Yes | Yes |
| **WEBP** | Yes | Yes | Yes | Yes | Yes |
| **AVIF** | Yes | Yes | Yes | Yes | Yes |
| **GIF** | Yes | Yes | Yes | Yes | Limited |
| **BMP** | Yes | Uncompressed | Yes | Yes | Conversion Recommended |
| **TIFF** | Yes | Deflate | Yes | Yes | Conversion Recommended |
| **PDF** | Yes | Yes (Garbage/Deflate/Downsample) | Pages preserved | No | Yes (Adaptive Image Scaling) |

---

## 8. Known Limitations & Architecture Guarantees

1. **No Artificial Corruption**: The engine will never pad random garbage bytes to simulate hitting an arbitrary byte count. When a target cannot be naturally reached, it provides an honest status and closest possible size.
2. **Text Preservation in PDFs**: PDF compression operates strictly on streams and embedded raster images, preserving searchable vector text and page counts.
3. **Local Privacy**: All processing runs on local compute without external network dependencies.
