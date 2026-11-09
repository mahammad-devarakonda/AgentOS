from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    RESUME = "RESUME"
    NOT_RESUME = "NOT_RESUME"
    UNCERTAIN = "UNCERTAIN"


class ResumeClassificationResult(BaseModel):
    document_type: DocumentType = Field(
        ...,
        description="Classification verdict: RESUME, NOT_RESUME, or UNCERTAIN",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Classification confidence score between 0.0 and 1.0",
    )
    reason: str = Field(
        ...,
        description="Detailed explanation justifying the classification decision",
    )
    detected_sections: List[str] = Field(
        default_factory=list,
        description="List of detected standard resume sections (e.g., Summary, Experience, Education, Skills, Projects, Certifications)",
    )


class FileValidationResult(BaseModel):
    is_valid: bool = Field(..., description="Whether the file passed structural and signature validation")
    file_format: str = Field(default="", description="Detected format (e.g. PDF, DOCX)")
    file_size_bytes: int = Field(default=0, description="Size in bytes")
    mime_type: Optional[str] = Field(default=None, description="Validated MIME type")
    error: Optional[str] = Field(default=None, description="Validation failure reason if invalid")


# ==============================================================================
# GUARDRAIL EXCEPTION HIERARCHY
# ==============================================================================

class DocumentGuardrailError(ValueError):
    """Base exception for all document guardrail rejections (inherits from ValueError)."""
    pass


class UnsupportedFormatError(DocumentGuardrailError):
    """Raised when uploaded file is not a supported format (only PDF and DOCX accepted)."""
    pass


class CorruptedFileError(DocumentGuardrailError):
    """Raised when a file signature or structure is broken or unreadable."""
    pass


class EmptyDocumentError(DocumentGuardrailError):
    """Raised when an uploaded file is empty or contains zero pages / content."""
    pass


class InsufficientTextError(DocumentGuardrailError):
    """Raised when document does not contain sufficient readable text for analysis."""
    pass


class ScannedDocumentError(DocumentGuardrailError):
    """Raised when a scanned/image-only PDF is uploaded without readable text."""
    pass


class InvalidResumeError(DocumentGuardrailError):
    """Raised when document is determined to be an invoice, assignment, certificate, etc."""
    pass


class UncertainClassificationError(DocumentGuardrailError):
    """Raised when document classification confidence is below threshold or uncertain."""
    pass


class PromptInjectionDetectedError(DocumentGuardrailError):
    """Raised when adversarial prompt injection instructions are detected in upload."""
    pass


class DocumentExtractionError(DocumentGuardrailError):
    """Raised when an unrecoverable error occurs during text extraction."""
    pass


class DocumentValidationError(DocumentGuardrailError):
    """General document rejection error used by LangGraph routing."""
    pass
