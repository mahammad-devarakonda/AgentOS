import io
import logging
import re
import zipfile
from typing import Any, Dict, List, Optional, Tuple

import docx
import pymupdf

from app.core.config import settings
from app.schemas.guardrails import (
    CorruptedFileError,
    DocumentExtractionError,
    DocumentGuardrailError,
    DocumentType,
    EmptyDocumentError,
    FileValidationResult,
    InsufficientTextError,
    InvalidResumeError,
    PromptInjectionDetectedError,
    ResumeClassificationResult,
    ScannedDocumentError,
    UncertainClassificationError,
    UnsupportedFormatError,
)

logger = logging.getLogger(__name__)

# ==============================================================================
# SECTION KEYWORDS & ANTI-PATTERN SIGNATURES
# ==============================================================================

RESUME_SECTION_KEYWORDS = [
    "experience",
    "work history",
    "employment",
    "education",
    "skills",
    "projects",
    "summary",
    "professional summary",
    "profile",
    "certifications",
    "qualifications",
    "technologies",
    "curriculum vitae",
    "resume",
    "work experience",
]

RESUME_SECTION_PATTERNS = {
    "Summary": [
        r"\b(?:professional\s+)?summary\b",
        r"\bexecutive\s+summary\b",
        r"\bprofile\b",
        r"\babout\s+me\b",
        r"\bcareer\s+objective\b",
        r"\bobjective\b",
    ],
    "Experience": [
        r"\bwork\s+experience\b",
        r"\bprofessional\s+experience\b",
        r"\bwork\s+history\b",
        r"\bemployment\s+history\b",
        r"\bemployment\b",
        r"\bexperience\b",
    ],
    "Education": [
        r"\beducation\b",
        r"\bacademics\b",
        r"\bacademic\s+background\b",
        r"\bqualifications\b",
    ],
    "Skills": [
        r"\btechnical\s+skills\b",
        r"\bcore\s+competencies\b",
        r"\btechnologies\b",
        r"\btech\s+stack\b",
        r"\bskills\b",
    ],
    "Projects": [
        r"\btechnical\s+projects\b",
        r"\bkey\s+projects\b",
        r"\bpersonal\s+projects\b",
        r"\bacademic\s+projects\b",
        r"\bprojects\b",
    ],
    "Certifications": [
        r"\bcertifications\b",
        r"\bcertificates\b",
        r"\blicenses\b",
    ],
}

# Negative Indicators / Anti-Patterns
INVOICE_PATTERNS = [
    r"\btax\s+invoice\b",
    r"\binvoice\s*(?:#|no\.?|num(?:ber)?)\b",
    r"\bbill\s+to\b",
    r"\bship\s+to\b",
    r"\bdue\s+date\b",
    r"\bamount\s+due\b",
    r"\btotal\s+due\b",
    r"\bbalance\s+due\b",
    r"\bremit\s+to\b",
    r"\bpayment\s+terms\b",
    r"\bunit\s+price\b",
    r"\bsubtotal\b",
    r"\bp\.o\.?\s*#\b",
]

ASSIGNMENT_PATTERNS = [
    r"\bassignment\s*(?:#|\d+|one|two|three|four)?\b",
    r"\bhomework\s*(?:#|\d+)?\b",
    r"\blab\s+report\b",
    r"\bproblem\s+set\b",
    r"\bstudent\s*id\b",
    r"\broll\s*(?:no\.?|number)\b",
    r"\bsubmitted\s+to\s*:\b",
    r"\binstructor\s*:\b",
    r"\bprofessor\s*:\b",
    r"\bcourse\s*code\b",
    r"\bdepartment\s+of\s+[A-Za-z\s]+(?:engineering|science|arts)\b",
]

CERTIFICATE_PATTERNS = [
    r"\bthis\s+is\s+to\s+certify\s+that\b",
    r"\bcertificate\s+of\s+(?:completion|achievement|participation|excellence)\b",
    r"\bis\s+hereby\s+awarded\s+to\b",
    r"\bhas\s+successfully\s+completed\b",
    r"\bin\s+witness\s+whereof\b",
    r"\bconferred\s+upon\b",
]

COVER_LETTER_PATTERNS = [
    r"\bdear\s+(?:hiring\s+manager|recruiter|sir|madam|mr\.|ms\.|mrs\.|team|talent\s+acquisition)\b",
    r"\bto\s+whom\s+it\s+may\s+concern\b",
    r"\bi\s+am\s+writing\s+to\s+apply\s+for\b",
    r"\bplease\s+accept\s+my\s+application\b",
    r"\bi\s+am\s+thrilled\s+to\s+apply\b",
    r"\bsincerely\s*,\b",
    r"\byours\s+sincerely\s*,\b",
    r"\byours\s+faithfully\s*,\b",
]

PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions",
    r"disregard\s+(?:all\s+)?(?:previous|prior)\s+instructions",
    r"you\s+are\s+now\s+(?:a|an)\b",
    r"system\s*override",
    r"system\s*prompt\s*:",
    r"bypass\s+(?:all\s+)?guardrails?",
    r"classify\s+(?:this\s+)?(?:as\s+)?(?:a\s+)?resume",
    r"output\s+confidence\s*(?::|=)\s*1(?:\.0)?",
    r"set\s+confidence\s*(?::|=)\s*1(?:\.0)?",
]

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/x-zip-compressed",
    "application/zip",
    "application/octet-stream",
}


# ==============================================================================
# 1. FILE VALIDATION
# ==============================================================================

def validate_file_bytes(
    file_bytes: bytes,
    filename: str,
    content_type: Optional[str] = None,
) -> FileValidationResult:
    """
    Validates file extension, magic signature, MIME types, and internal file structure.
    Rejects corrupted, oversized, renamed, or unsupported files.
    """
    clean_filename = (filename or "").strip()
    lower_filename = clean_filename.lower()

    # Check extension
    matched_ext = next((ext for ext in ALLOWED_EXTENSIONS if lower_filename.endswith(ext)), None)
    if not matched_ext:
        raise UnsupportedFormatError(
            f"Unsupported file format for '{clean_filename}'. The application only accepts genuine resumes in PDF (.pdf) and DOCX (.docx) formats."
        )

    # Check size
    file_size = len(file_bytes)
    if file_size == 0:
        raise EmptyDocumentError(f"Uploaded file '{clean_filename}' is empty (0 bytes).")

    max_bytes = settings.MAX_RESUME_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise DocumentGuardrailError(
            f"Uploaded file '{clean_filename}' ({file_size / (1024 * 1024):.1f} MB) exceeds maximum allowed size of {settings.MAX_RESUME_FILE_SIZE_MB} MB."
        )

    # Validate PDF signature and structure
    if matched_ext == ".pdf":
        # Magic bytes: %PDF- in first 1024 bytes
        if b"%PDF-" not in file_bytes[:1024]:
            raise UnsupportedFormatError(
                f"File '{clean_filename}' has a .pdf extension but lacks a valid PDF binary signature. Renamed files are rejected."
            )

        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            if doc.is_encrypted:
                # Try empty password, reject if protected
                if not doc.authenticate(""):
                    raise CorruptedFileError(
                        f"PDF file '{clean_filename}' is password-protected or encrypted. Unencrypted resumes are required."
                    )
            if len(doc) == 0:
                raise EmptyDocumentError(f"PDF document '{clean_filename}' contains 0 pages.")
        except DocumentGuardrailError:
            raise
        except Exception as exc:
            raise CorruptedFileError(
                f"PDF file '{clean_filename}' is corrupted or cannot be parsed: {str(exc)}"
            ) from exc

        return FileValidationResult(
            is_valid=True,
            file_format="PDF",
            file_size_bytes=file_size,
            mime_type=content_type or "application/pdf",
        )

    # Validate DOCX signature and structure
    if matched_ext == ".docx":
        # Magic bytes: PK\x03\x04
        if not file_bytes.startswith(b"PK\x03\x04"):
            raise UnsupportedFormatError(
                f"File '{clean_filename}' has a .docx extension but lacks a valid ZIP/DOCX binary signature. Renamed files are rejected."
            )

        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                namelist = z.namelist()
                if "word/document.xml" not in namelist:
                    raise UnsupportedFormatError(
                        f"File '{clean_filename}' is a ZIP archive but not a genuine DOCX document (missing word/document.xml)."
                    )
                # Test archive integrity
                bad_entry = z.testzip()
                if bad_entry:
                    raise CorruptedFileError(
                        f"DOCX archive for '{clean_filename}' is corrupted at entry '{bad_entry}'."
                    )
            # Verify python-docx parsing
            docx.Document(io.BytesIO(file_bytes))
        except DocumentGuardrailError:
            raise
        except zipfile.BadZipFile as exc:
            raise CorruptedFileError(
                f"DOCX file '{clean_filename}' is corrupted or is not a valid ZIP container."
            ) from exc
        except Exception as exc:
            raise CorruptedFileError(
                f"DOCX document '{clean_filename}' failed structural parsing: {str(exc)}"
            ) from exc

        return FileValidationResult(
            is_valid=True,
            file_format="DOCX",
            file_size_bytes=file_size,
            mime_type=content_type or "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

    raise UnsupportedFormatError(f"Unsupported file format for '{clean_filename}'.")


# ==============================================================================
# 2. DOCUMENT EXTRACTION
# ==============================================================================

def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """
    Extracts text from PDF (using PyMuPDF) or DOCX (using python-docx).
    Detects empty documents, insufficient readable text, and scanned PDFs.
    """
    clean_filename = (filename or "").strip()
    lower_filename = clean_filename.lower()

    if lower_filename.endswith(".pdf"):
        return _extract_from_pdf_pymupdf(file_bytes, clean_filename)
    elif lower_filename.endswith(".docx"):
        return _extract_from_docx_python_docx(file_bytes, clean_filename)
    else:
        raise UnsupportedFormatError(
            f"Unsupported file format for '{clean_filename}'. Text extraction supports only PDF and DOCX."
        )


def _extract_from_pdf_pymupdf(file_bytes: bytes, filename: str) -> str:
    try:
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        raise CorruptedFileError(f"Unable to open PDF '{filename}': {str(exc)}") from exc

    pages_text = []
    total_images = 0

    for page in doc:
        page_text = page.get_text() or ""
        if page_text.strip():
            pages_text.append(page_text.strip())
        try:
            total_images += len(page.get_images())
        except Exception:
            pass

    full_text = "\n\n".join(pages_text).strip()

    # Check for empty / scanned PDF
    if len(full_text) < settings.MIN_RESUME_TEXT_CHARS:
        # Check if scanned PDF with images
        if total_images > 0:
            # Try OCR if available
            ocr_text = _try_ocr_pymupdf(doc)
            if ocr_text and len(ocr_text.strip()) >= settings.MIN_RESUME_TEXT_CHARS:
                return ocr_text.strip()
            raise ScannedDocumentError(
                f"Scanned image-only PDF detected in '{filename}'. "
                f"No machine-readable text was found ({total_images} images detected). "
                f"Please upload a PDF containing selectable text or an OCR-processed document."
            )

        if not full_text:
            raise EmptyDocumentError(f"Could not extract any readable text from '{filename}'. Document is empty.")

        raise InsufficientTextError(
            f"Document '{filename}' contains insufficient readable text ({len(full_text)} characters, "
            f"minimum required is {settings.MIN_RESUME_TEXT_CHARS}). A complete resume is required."
        )

    return full_text


def _try_ocr_pymupdf(doc: pymupdf.Document) -> Optional[str]:
    """Attempts OCR on PDF pages using PyMuPDF get_textpage_ocr if supported."""
    try:
        pages_ocr = []
        for page in doc:
            try:
                # get_textpage_ocr uses Tesseract if installed
                tp = page.get_textpage_ocr()
                t = tp.extractText() if hasattr(tp, "extractText") else tp.get_text()
                if t and t.strip():
                    pages_ocr.append(t.strip())
            except Exception:
                pass
        if pages_ocr:
            return "\n\n".join(pages_ocr)
    except Exception:
        pass
    return None


def _extract_from_docx_python_docx(file_bytes: bytes, filename: str) -> str:
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
    except Exception as exc:
        raise CorruptedFileError(f"Unable to parse DOCX file '{filename}': {str(exc)}") from exc

    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text and p.text.strip()]

    # Extract tables
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text and c.text.strip()]
            if cells:
                paragraphs.append(" | ".join(dict.fromkeys(cells)))

    full_text = "\n".join(paragraphs).strip()

    if not full_text:
        raise EmptyDocumentError(f"Could not extract any text from DOCX file '{filename}'. Document is empty.")

    if len(full_text) < settings.MIN_RESUME_TEXT_CHARS:
        raise InsufficientTextError(
            f"DOCX document '{filename}' contains insufficient readable text ({len(full_text)} characters, "
            f"minimum required is {settings.MIN_RESUME_TEXT_CHARS}). A complete resume is required."
        )

    return full_text


# ==============================================================================
# 3. PROMPT INJECTION & STRUCTURAL ANALYSIS
# ==============================================================================

def detect_prompt_injection(text: str) -> Tuple[bool, str]:
    """
    Detects potential adversarial prompt injection instructions within untrusted document text.
    """
    lower_text = text.lower()
    for pattern in PROMPT_INJECTION_PATTERNS:
        match = re.search(pattern, lower_text)
        if match:
            return True, f"Detected injection pattern matching: '{match.group(0)}'"
    return False, ""


def detect_resume_sections(text: str) -> List[str]:
    """
    Identifies standard resume sections present in the document.
    """
    lower_text = text.lower()
    detected = []
    for section_name, patterns in RESUME_SECTION_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, lower_text):
                detected.append(section_name)
                break
    return detected


def deterministic_resume_check(
    text: str, filename: str
) -> Tuple[Optional[ResumeClassificationResult], Dict[str, Any]]:
    """
    Performs fast deterministic checks for prompt injection, non-resume anti-patterns
    (invoices, assignments, certificates, cover letters), and structural features.
    """
    lower_text = text.lower()

    # 1. Prompt Injection Check
    is_injection, injection_detail = detect_prompt_injection(text)
    if is_injection:
        return (
            ResumeClassificationResult(
                document_type=DocumentType.NOT_RESUME,
                confidence=1.0,
                reason=f"Document rejected: Adversarial prompt injection instruction detected ({injection_detail}).",
                detected_sections=[],
            ),
            {"is_injection": True},
        )

    # 2. Anti-Pattern: Invoices / Bills
    invoice_matches = [p for p in INVOICE_PATTERNS if re.search(p, lower_text)]
    if len(invoice_matches) >= 2 or (len(invoice_matches) >= 1 and re.search(r"\btax\s+invoice\b|\binvoice\s*#", lower_text)):
        return (
            ResumeClassificationResult(
                document_type=DocumentType.NOT_RESUME,
                confidence=0.98,
                reason="Document rejected: Financial invoice or billing document detected, not a candidate resume.",
                detected_sections=[],
            ),
            {"anti_pattern": "invoice"},
        )

    # 3. Anti-Pattern: Academic Assignments / Homework
    assignment_matches = [p for p in ASSIGNMENT_PATTERNS if re.search(p, lower_text)]
    if len(assignment_matches) >= 2 or (
        len(assignment_matches) >= 1 and re.search(r"\bassignment\s*(?:#|\d+|one|two)\b|\bhomework\b", lower_text)
    ):
        return (
            ResumeClassificationResult(
                document_type=DocumentType.NOT_RESUME,
                confidence=0.96,
                reason="Document rejected: Academic homework assignment or lab report detected, not a candidate resume.",
                detected_sections=[],
            ),
            {"anti_pattern": "assignment"},
        )

    # 4. Anti-Pattern: Certificates of Completion / Awards
    cert_matches = [p for p in CERTIFICATE_PATTERNS if re.search(p, lower_text)]
    if len(cert_matches) >= 1 and len(text.splitlines()) < 25:
        return (
            ResumeClassificationResult(
                document_type=DocumentType.NOT_RESUME,
                confidence=0.98,
                reason="Document rejected: Certificate of completion or award citation detected, not a candidate resume.",
                detected_sections=["Certifications"],
            ),
            {"anti_pattern": "certificate"},
        )

    # 5. Anti-Pattern: Standalone Cover Letter
    # A cover letter has greeting/sign-off but lacks genuine structured work experience and education blocks
    detected_sections = detect_resume_sections(text)
    cover_letter_matches = [p for p in COVER_LETTER_PATTERNS if re.search(p, lower_text)]
    if len(cover_letter_matches) >= 1:
        # Check if it has genuine structured resume sections (Experience AND Education)
        has_core_resume_structure = "Experience" in detected_sections and (
            "Education" in detected_sections or "Skills" in detected_sections
        )
        if not has_core_resume_structure:
            return (
                ResumeClassificationResult(
                    document_type=DocumentType.NOT_RESUME,
                    confidence=0.95,
                    reason="Document rejected: Standalone cover letter detected without structured resume sections (Experience, Education, Skills).",
                    detected_sections=detected_sections,
                ),
                {"anti_pattern": "cover_letter"},
            )

    # Structural feature collection
    has_email = bool(re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text))
    has_phone = bool(re.search(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", text))
    has_date_ranges = bool(
        re.search(r"\b(20\d\d|19\d\d)\s*[-–—to]+\s*(20\d\d|present|current)\b", lower_text)
    )

    metadata = {
        "detected_sections": detected_sections,
        "has_email": has_email,
        "has_phone": has_phone,
        "has_date_ranges": has_date_ranges,
        "section_count": len(detected_sections),
    }

    return None, metadata


# ==============================================================================
# 4. RESUME CLASSIFICATION ENGINE (GROQ + DETERMINISTIC HYBRID)
# ==============================================================================

async def classify_resume_document(
    raw_text: str,
    filename: str,
    force_offline: bool = False,
) -> ResumeClassificationResult:
    """
    Classifies an extracted document into RESUME, NOT_RESUME, or UNCERTAIN.
    Combines deterministic rules, prompt injection sanitization, structural analysis,
    and LLM-based classification with Groq.
    """
    # Step 1: Deterministic check
    deterministic_result, meta = deterministic_resume_check(raw_text, filename)
    if deterministic_result:
        return deterministic_result

    detected_sections = meta.get("detected_sections", [])
    has_email = meta.get("has_email", False)
    has_date_ranges = meta.get("has_date_ranges", False)

    # Step 2: Attempt LLM Classification with Groq
    if not force_offline and settings.GROQ_API_KEY and settings.GROQ_API_KEY != "your_groq_api_key_here":
        try:
            from app.agents.job_search.nodes import _invoke_structured_job_agent
            from app.agents.job_search.prompts import RESUME_CLASSIFICATION_SYSTEM_PROMPT

            # Protect against prompt injection by strictly separating data inside XML tags
            # and limiting input length for classification
            truncated_text = raw_text[:8000].replace("<untrusted_document_content>", "").replace("</untrusted_document_content>", "")
            user_prompt = (
                f"Analyze the document titled '{filename}' to classify whether it is a candidate resume:\n\n"
                f"<untrusted_document_content>\n"
                f"{truncated_text}\n"
                f"</untrusted_document_content>\n\n"
                f"Provide your classification verdict adhering strictly to the ResumeClassificationResult schema."
            )

            classification, _ = await _invoke_structured_job_agent(
                system_prompt=RESUME_CLASSIFICATION_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                schema_cls=ResumeClassificationResult,
                temperature=0.0,
            )

            # Reconcile detected sections if LLM omitted them
            if not classification.detected_sections and detected_sections:
                classification.detected_sections = detected_sections

            return classification
        except Exception as llm_err:
            logger.warning(f"Groq LLM resume classification failed, falling back to deterministic rules: {llm_err}")

    # Step 3: Fallback Deterministic Classification
    return _fallback_deterministic_classifier(raw_text, filename, meta)


def _fallback_deterministic_classifier(
    raw_text: str, filename: str, meta: Dict[str, Any]
) -> ResumeClassificationResult:
    """
    Robust rule-based classifier used when Groq is offline or during testing.
    """
    detected_sections = meta.get("detected_sections", [])
    has_email = meta.get("has_email", False)
    has_date_ranges = meta.get("has_date_ranges", False)

    # Require minimum core resume sections:
    # A genuine resume must typically have Experience or Education or Skills
    has_experience = "Experience" in detected_sections
    has_education = "Education" in detected_sections
    has_skills = "Skills" in detected_sections

    core_section_count = sum([has_experience, has_education, has_skills])

    # Clear Resume: has at least 2 core sections, or 1 core section + contact/date ranges
    if (core_section_count >= 2) or (core_section_count >= 1 and (has_email or has_date_ranges)):
        confidence = 0.92 if core_section_count >= 2 and (has_email or has_date_ranges) else 0.86
        return ResumeClassificationResult(
            document_type=DocumentType.RESUME,
            confidence=confidence,
            reason=f"Verified genuine candidate resume with detected sections: {', '.join(detected_sections)}.",
            detected_sections=detected_sections,
        )

    # If no core sections detected at all
    if core_section_count == 0:
        return ResumeClassificationResult(
            document_type=DocumentType.NOT_RESUME,
            confidence=0.92,
            reason=f"Document '{filename}' lacks standard resume sections (Experience, Education, Skills).",
            detected_sections=detected_sections,
        )

    # Borderline / Sparse content
    return ResumeClassificationResult(
        document_type=DocumentType.UNCERTAIN,
        confidence=0.60,
        reason=f"Document '{filename}' has insufficient evidence to confirm as a candidate resume.",
        detected_sections=detected_sections,
    )


# ==============================================================================
# 5. BACKWARD-COMPATIBLE VALIDATOR FUNCTION
# ==============================================================================

def _validate_resume_document(raw_text: str, filename: str) -> None:
    """
    Backward-compatible pre-flight guardrail.
    Validates that text represents a genuine candidate resume.
    """
    deterministic_result, meta = deterministic_resume_check(raw_text, filename)
    if deterministic_result:
        if deterministic_result.document_type != DocumentType.RESUME:
            raise InvalidResumeError(deterministic_result.reason)

    classification = _fallback_deterministic_classifier(raw_text, filename, meta)
    if classification.document_type == DocumentType.NOT_RESUME:
        raise InvalidResumeError(classification.reason)
    if classification.document_type == DocumentType.UNCERTAIN:
        raise UncertainClassificationError(classification.reason)
    if classification.confidence < settings.RESUME_CONFIDENCE_THRESHOLD:
        raise UncertainClassificationError(
            f"Resume classification confidence ({classification.confidence:.2f}) below threshold ({settings.RESUME_CONFIDENCE_THRESHOLD})."
        )
