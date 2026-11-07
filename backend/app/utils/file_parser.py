import io
from fastapi import HTTPException, UploadFile
from pypdf import PdfReader
from docx import Document


async def extract_text_from_upload(file: UploadFile) -> str:
    """Extracts plain text from an uploaded PDF, DOCX, or TXT resume file."""
    filename = (file.filename or "").lower()
    content_bytes = await file.read()

    if not content_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        if filename.endswith(".pdf"):
            return _extract_from_pdf(content_bytes)
        elif filename.endswith(".docx"):
            return _extract_from_docx(content_bytes)
        elif filename.endswith(".txt") or filename.endswith(".md"):
            return content_bytes.decode("utf-8", errors="ignore").strip()
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload a PDF, DOCX, or TXT file.",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse resume document: {str(exc)}",
        ) from exc


def _extract_from_pdf(content_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(content_bytes))
    pages_text = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text.strip():
            pages_text.append(page_text.strip())
    full_text = "\n\n".join(pages_text).strip()
    if not full_text:
        raise HTTPException(
            status_code=422,
            detail="Could not extract readable text from the PDF. Ensure it is not a scanned image-only PDF.",
        )
    return full_text


def _extract_from_docx(content_bytes: bytes) -> str:
    doc = Document(io.BytesIO(content_bytes))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text and p.text.strip()]

    # Also extract text from tables if resume uses a tabular layout
    for table in doc.tables:
        for row in table.rows:
            row_cells = [cell.text.strip() for cell in row.cells if cell.text and cell.text.strip()]
            if row_cells:
                paragraphs.append(" | ".join(dict.fromkeys(row_cells)))

    full_text = "\n".join(paragraphs).strip()
    if not full_text:
        raise HTTPException(status_code=422, detail="Could not extract readable text from the DOCX file.")
    return full_text

