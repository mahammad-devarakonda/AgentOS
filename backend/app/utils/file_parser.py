from fastapi import HTTPException, UploadFile
from app.agents.job_search.guardrails import (
    extract_text_from_bytes,
    validate_file_bytes,
)
from app.schemas.guardrails import (
    CorruptedFileError,
    DocumentGuardrailError,
    EmptyDocumentError,
    InsufficientTextError,
    ScannedDocumentError,
    UnsupportedFormatError,
)


async def extract_text_from_upload(file: UploadFile) -> str:
    """
    Extracts text from an uploaded resume file strictly in PDF or DOCX format.
    Enforces format validation, magic byte signature checks, PyMuPDF / python-docx extraction,
    and detects corrupted, empty, or scanned documents.
    """
    filename = (file.filename or "uploaded_resume").strip()
    content_bytes = await file.read()

    if not content_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")

    try:
        # Step 1: Binary validation (format, size, magic signature, archive integrity)
        validate_file_bytes(
            file_bytes=content_bytes,
            filename=filename,
            content_type=file.content_type,
        )

        # Step 2: Extract text using PyMuPDF (PDF) or python-docx (DOCX)
        extracted_text = extract_text_from_bytes(
            file_bytes=content_bytes,
            filename=filename,
        )
        return extracted_text

    except (UnsupportedFormatError, EmptyDocumentError) as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except ScannedDocumentError as err:
        raise HTTPException(status_code=422, detail=str(err)) from err
    except (CorruptedFileError, InsufficientTextError) as err:
        raise HTTPException(status_code=422, detail=str(err)) from err
    except DocumentGuardrailError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse resume document '{filename}': {str(exc)}",
        ) from exc
