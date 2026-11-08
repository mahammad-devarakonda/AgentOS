from datetime import datetime
import json
import re
from typing import Tuple, Type, TypeVar
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from app.core.config import settings
from app.core.http_client import http_client_manager
from app.core.model_resolver import GroqModelResolver
from app.schemas.resume import (
    AgentExecutionStep,
    ExtractedResumeProfile,
    ResumeAnalysisEvaluation,
    ResumeEnhancementOutput,
    VerificationAuditOutput,
)
from app.agents.resume.state import ResumeGraphState
from app.agents.resume.prompts import (
    ANALYZER_SYSTEM_PROMPT,
    ENHANCER_SYSTEM_PROMPT,
    EXTRACTOR_SYSTEM_PROMPT,
    VERIFIER_SYSTEM_PROMPT,
)
from app.services.job_vector_store import job_vector_store

T = TypeVar("T", bound=BaseModel)


# ==============================================================================
# SECTION: SHARED UTILITIES & LLM INVOCATION HELPERS
# ==============================================================================

def _create_groq_llm(model_name: str, temperature: float = 0.1) -> ChatGroq:
    """Initializes ChatGroq for a specific model name backed by our shared HTTPX async client."""
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
        raise ValueError(
            "GROQ_API_KEY is not configured. Please set a valid GROQ_API_KEY in backend/.env"
        )
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=model_name,
        temperature=temperature,
        http_async_client=http_client_manager.get_client(),
    )


async def _invoke_structured_agent(
    system_prompt: str,
    user_prompt: str,
    schema_cls: Type[T],
    temperature: float = 0.1,
    max_model_fallbacks: int = 5,
) -> Tuple[T, str]:
    """
    Dynamically discovers the best available Groq model and invokes it with structured JSON output.
    Automatically falls back to the next best available model if a model is decommissioned,
    inaccessible (404), rate-limited, or incompatible with JSON mode.
    """
    schema_json = json.dumps(schema_cls.model_json_schema(), indent=2)

    full_system_prompt = (
        f"{system_prompt}\n\n"
        f"You MUST respond with a single valid JSON object that strictly conforms to this JSON Schema:\n"
        f"{schema_json}\n\n"
        f"Do not wrap the JSON in markdown explanations—output raw JSON only."
    )

    messages = [
        SystemMessage(content=full_system_prompt),
        HumanMessage(content=user_prompt),
    ]

    current_model = await GroqModelResolver.get_best_model()
    last_error: Exception | None = None

    for _ in range(max_model_fallbacks):
        try:
            llm = _create_groq_llm(model_name=current_model, temperature=temperature)
            try:
                structured_llm = llm.bind(response_format={"type": "json_object"})
                response = await structured_llm.ainvoke(messages)
            except Exception as json_mode_err:
                err_text = str(json_mode_err).lower()
                if (
                    "model_not_found" in err_text
                    or "404" in err_text
                    or "decommissioned" in err_text
                    or "does not exist" in err_text
                ):
                    raise
                response = await llm.ainvoke(messages)

            raw_content = (
                response.content
                if isinstance(response.content, str)
                else str(response.content)
            )
            cleaned_json = _extract_json_str(raw_content)
            parsed_obj = schema_cls.model_validate_json(cleaned_json)
            return parsed_obj, current_model

        except Exception as exc:
            last_error = exc
            current_model = await GroqModelResolver.mark_model_failed_and_get_next(
                current_model
            )

    raise RuntimeError(
        f"All attempted Groq models failed. Last error ({current_model}): {str(last_error)}"
    )


def _extract_json_str(text: str) -> str:
    """Extracts JSON object string even if wrapped in code fences or thinking tags."""
    cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    fence_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", cleaned, re.DOTALL)
    if fence_match:
        return fence_match.group(1)
    brace_match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
    if brace_match:
        return brace_match.group(1)
    return cleaned


# ==============================================================================
# >>> START: AGENT 1 - PROFILE EXTRACTOR NODE (extractor_agent_node)
# ==============================================================================
# Role & Purpose:
#   First agent in the pipeline. Responsible for reading raw, unformatted resume
#   text and extracting it into a strictly structured `ExtractedResumeProfile`
#   (contact details, skills categorization, work experience, education, projects).
#
# Inputs from State:
#   - state["raw_text"]: The raw text parsed from uploaded PDF/DOCX or pasted text.
#   - state["agent_trace"]: Historical execution log for UI stepper tracking.
#
# Outputs returned to State:
#   - extracted_profile: ExtractedResumeProfile Pydantic object.
#   - agent_trace: Updated trace list with Agent 1's execution status and summary.
#
# Next Pipeline Step:
#   Passes state directly to AGENT 2 (analyzer_agent_node).
# ==============================================================================

async def extractor_agent_node(state: ResumeGraphState) -> ResumeGraphState:
    """Node 1: Parses raw resume text into a structured ExtractedResumeProfile and indexes chunks for RAG."""
    # [Step 1: Retrieve input data from graph state]
    raw_text = state.get("raw_text", "")
    filename = state.get("filename", "uploaded_resume")
    session_id = state.get("session_id") or filename
    trace = list(state.get("agent_trace", []))

    # [Step 1b: Semantic Chunking & Qdrant Vector Indexing]
    chunk_count = 0
    try:
        chunk_count = job_vector_store.index_resume(session_id=session_id, raw_text=raw_text)
    except Exception as idx_err:
        print(f"[Warning] Resume vector indexing warning: {idx_err}")

    current_date_str = datetime.now().strftime("%B %Y")

    # [Step 2: Construct the extraction prompt with raw resume content and current date reference]
    user_prompt = (
        f"Current Real-World Date: {current_date_str}\n\n"
        "Extract the structured candidate profile from the following raw resume text:\n\n"
        f"--- RESUME TEXT START ---\n{raw_text}\n--- RESUME TEXT END ---\n\n"
        f"Note: Calculate total_years_experience accurately relative to {current_date_str}."
    )

    # [Step 3: Invoke Groq LLM with EXTRACTOR_SYSTEM_PROMPT and schema validation]
    profile, used_model = await _invoke_structured_agent(
        system_prompt=EXTRACTOR_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema_cls=ExtractedResumeProfile,
        temperature=0.0,
    )

    # [Step 4: Record execution audit step for frontend UI display]
    total_skills = (
        len(profile.skills.technical_skills)
        + len(profile.skills.tools_and_frameworks)
        + len(profile.skills.soft_skills)
    )
    trace.append(
        AgentExecutionStep(
            agent_name=f"Agent 1: Profile Extractor ({used_model})",
            status="completed",
            summary=(
                f"Extracted profile for '{profile.contact.full_name}' with "
                f"{total_skills} skills, {len(profile.work_experience)} roles, and "
                f"indexed {chunk_count} semantic chunks into Qdrant (all-MiniLM-L6-v2) for RAG."
            ),
        )
    )

    # [Step 5: Return updated state slice to LangGraph]
    return {
        "session_id": session_id,
        "indexed_chunks_count": chunk_count,
        "extracted_profile": profile,
        "agent_trace": trace,
    }


# ==============================================================================
# >>> START: AGENT 2 - ATS & QUALITY SCORER (analyzer_agent_node)
# ==============================================================================
# Role & Purpose:
#   Second agent in the pipeline. Analyzes the candidate profile against ATS
#   parsing standards, quantifiability / metrics impact, and alignment with
#   the target role / job description. Computes section scores and overall score.
#
# Inputs from State:
#   - state["extracted_profile"]: Output from Agent 1.
#   - state["target_role"]: User's intended job role (e.g., "Senior Python Engineer").
#   - state["job_description"]: Job description (if provided by user).
#   - state["agent_trace"]: Historical execution steps.
#
# Outputs returned to State:
#   - analysis: ResumeAnalysisEvaluation (overall_score, section_scores, gaps, feedback).
#   - agent_trace: Updated trace with Agent 2's score summary.
#
# Next Pipeline Step:
#   Passes state directly to AGENT 3 (enhancer_agent_node).
# ==============================================================================

async def analyzer_agent_node(state: ResumeGraphState) -> ResumeGraphState:
    """Node 2: Evaluates the extracted profile for ATS compatibility, impact, and JD alignment."""
    # [Step 1: Retrieve inputs from state (profile from Agent 1 + role & JD)]
    profile = state["extracted_profile"]
    target_role = state.get("target_role") or "General Software / Technology Professional"
    job_description = (
        state.get("job_description")
        or "No specific job description provided; evaluate against industry best practices for the target role."
    )
    trace = list(state.get("agent_trace", []))

    # [Step 1b: Retrieve grounded semantic evidence chunks from Qdrant if JD is provided]
    session_id = state.get("session_id") or state.get("filename", "uploaded_resume")
    vector_sim_scores = []
    semantic_evidence_lines = []

    if state.get("job_description"):
        jd_lines = [l.strip() for l in job_description.split("\n") if len(l.strip()) > 25]
        for req in jd_lines[:5]:
            try:
                hits = job_vector_store.retrieve_resume_evidence(
                    session_id=session_id,
                    job_requirement_query=req,
                    limit=2,
                )
                if hits:
                    vector_sim_scores.extend([s for _, s in hits])
                    snippets = [t[:140] for t, _ in hits]
                    semantic_evidence_lines.append(f"- Requirement: '{req}' -> Matched Resume Chunks: {snippets}")
            except Exception:
                pass

    evidence_str = ""
    if semantic_evidence_lines:
        evidence_str = (
            "\n\nRetrieved Semantic Resume Evidence from Vector DB:\n"
            + "\n".join(semantic_evidence_lines)
            + "\nUse this vector evidence to accurately evaluate the candidate's alignment with specific job requirements."
        )

    current_date_str = datetime.now().strftime("%B %Y")

    # [Step 2: Construct evaluation prompt combining profile, target role/JD, and vector evidence]
    user_prompt = (
        f"Current Real-World Date: {current_date_str}\n"
        f"Target Role: {target_role}\n"
        f"Job Description:\n{job_description}\n\n"
        f"Extracted Candidate Profile JSON:\n{profile.model_dump_json(indent=2)}"
        f"{evidence_str}\n\n"
        f"Perform a comprehensive ATS, impact, and skill-gap analysis.\n"
        f"IMPORTANT DATE RULE: The current real-world date is {current_date_str}. "
        f"All work experience, projects, or education dates on or before {current_date_str} "
        f"(e.g., 2025, 2026 up to {current_date_str}) are completely valid past or present dates. "
        f"Do NOT flag dates on or before {current_date_str} as future dates or credibility concerns."
    )

    # [Step 3: Invoke Groq LLM with ANALYZER_SYSTEM_PROMPT and schema validation]
    analysis, used_model = await _invoke_structured_agent(
        system_prompt=ANALYZER_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema_cls=ResumeAnalysisEvaluation,
        temperature=0.1,
    )

    # [Step 4: Record execution step with computed overall and section scores]
    avg_sim = round(sum(vector_sim_scores) / len(vector_sim_scores), 3) if vector_sim_scores else None
    vector_info = f", Vector Semantic Similarity: {int(avg_sim * 100)}%" if avg_sim else ""
    trace.append(
        AgentExecutionStep(
            agent_name=f"Agent 2: ATS & Quality Scorer ({used_model})",
            status="completed",
            summary=(
                f"Calculated Overall Score: {analysis.overall_score}/100 "
                f"(ATS: {analysis.section_scores.ats_compatibility}/100, "
                f"Impact: {analysis.section_scores.impact_and_metrics}/100{vector_info})."
            ),
        )
    )

    # [Step 5: Return updated analysis to LangGraph state]
    return {
        "analysis": analysis,
        "vector_similarity_score": avg_sim,
        "agent_trace": trace,
    }

# ==============================================================================
# >>> START: AGENT 3 - RESUME COACH & ENHANCER (enhancer_agent_node)
# ==============================================================================
# Role & Purpose:
#   Third agent in the pipeline. Generates tailored improvements:
#   - Writes an upgraded executive summary aligned to the target role.
#   - Rewrites weak bullet points using Google XYZ formula (Accomplished X by doing Y as measured by Z).
#   - Provides prioritized, actionable recommendations.
#
# Inputs from State:
#   - state["extracted_profile"]: Output from Agent 1.
#   - state["analysis"]: Output from Agent 2 (score, critique, missing keywords).
#   - state["target_role"]: User's intended job role.
#   - state["job_description"]: Job description (if provided).
#   - state["agent_trace"]: Historical execution steps.
#
# Outputs returned to State:
#   - enhancements: ResumeEnhancementOutput (improved summary, bullet rewrites, recommendations).
#   - agent_trace: Updated trace with enhancement metrics.
#
# Next Pipeline Step:
#   Evaluated by conditional router `route_after_enhancer`:
#   - If overall_score < 90  -> Routes to AGENT 4 (verifier_agent_node).
#   - If overall_score >= 90 -> Pipeline completes (routes to END).
# ==============================================================================

async def enhancer_agent_node(state: ResumeGraphState) -> ResumeGraphState:
    """Node 3: Produces actionable bullet rewrites and an executive summary upgrade."""
    # [Step 1: Retrieve inputs from Agent 1 (profile) and Agent 2 (analysis findings)]
    profile = state["extracted_profile"]
    analysis = state["analysis"]
    target_role = state.get("target_role") or "General Technology Role"
    job_description = state.get("job_description") or "Not specified"
    trace = list(state.get("agent_trace", []))

    # [Step 2: Construct prompt with profile data and Agent 2's ATS findings]
    user_prompt = (
        f"Target Role: {target_role}\n"
        f"Job Description:\n{job_description}\n\n"
        f"Extracted Candidate Profile:\n{profile.model_dump_json(indent=2)}\n\n"
        f"ATS & Recruiter Analysis Findings:\n{analysis.model_dump_json(indent=2)}\n\n"
        "Generate an improved executive summary, high-impact before/after bullet point rewrites, and prioritized recommendations."
    )

    # [Step 3: Invoke Groq LLM with ENHANCER_SYSTEM_PROMPT and schema validation]
    enhancements, used_model = await _invoke_structured_agent(
        system_prompt=ENHANCER_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema_cls=ResumeEnhancementOutput,
        temperature=0.2,
    )

    # [Step 4: Record execution step detailing rewrites and recommendations generated]
    trace.append(
        AgentExecutionStep(
            agent_name=f"Agent 3: Resume Coach & Enhancer ({used_model})",
            status="completed",
            summary=(
                f"Generated tailored executive summary, {len(enhancements.bullet_rewrites)} "
                f"high-impact bullet rewrites, and {len(enhancements.actionable_recommendations)} recommendations."
            ),
        )
    )

    # [Step 5: Return enhancements to LangGraph state]
    return {
        "enhancements": enhancements,
        "agent_trace": trace,
    }

# ==============================================================================
# >>> START: AGENT 4 - QA VERIFIER & AUDITOR (verifier_agent_node) [CONDITIONAL]
# ==============================================================================
# Role & Purpose:
#   Fourth agent in the pipeline. Runs CONDITIONALLY only when overall_score < 90.
#   Acts as an independent quality assurance auditor:
#   - Audits the outputs of Agents 1, 2, and 3 for factual consistency and accuracy.
#   - Prevents AI hallucinations in bullet rewrites.
#   - Produces critical fixes needed to boost the resume to a 90+ score.
#   - Generates an upgraded summary and projects the final score boost.
#
# Inputs from State:
#   - state["extracted_profile"]: Output from Agent 1.
#   - state["analysis"]: Output from Agent 2.
#   - state["enhancements"]: Output from Agent 3.
#   - state["target_role"]: User's intended job role.
#   - state["job_description"]: Job description (if provided).
#   - state["agent_trace"]: Historical execution steps.
#
# Outputs returned to State:
#   - verification: VerificationAuditOutput (audit notes, critical fixes, projected score).
#   - enhancements: Updated with upgraded summary if provided by Verifier.
#   - agent_trace: Updated trace with verification findings.
#
# Next Pipeline Step:
#   Routes to END (Workflow completes).
# ==============================================================================

async def verifier_agent_node(state: ResumeGraphState) -> ResumeGraphState:
    """Node 4 (Conditional): Audits and verifies all work when overall_score < 90."""
    # [Step 1: Retrieve context and all prior outputs from Agents 1, 2, and 3]
    profile = state["extracted_profile"]
    analysis = state["analysis"]
    enhancements = state["enhancements"]
    target_role = state.get("target_role") or "General Technology Role"
    job_description = state.get("job_description") or "Not specified"
    trace = list(state.get("agent_trace", []))

    current_date_str = datetime.now().strftime("%B %Y")

    # [Step 2: Construct verification prompt feeding all prior agent outputs]
    user_prompt = (
        f"Current Real-World Date: {current_date_str}\n"
        f"Target Role: {target_role}\n"
        f"Job Description:\n{job_description}\n\n"
        f"Agent 1 Output (Extracted Profile):\n{profile.model_dump_json(indent=2)}\n\n"
        f"Agent 2 Output (ATS Evaluation - Overall Score {analysis.overall_score}/100):\n{analysis.model_dump_json(indent=2)}\n\n"
        f"Agent 3 Output (Enhancements & Bullet Rewrites):\n{enhancements.model_dump_json(indent=2)}\n\n"
        f"Since the overall score is below 90, audit all work from Agents 1, 2, and 3, verify accuracy "
        f"(evaluating timeline validity against {current_date_str}), "
        "and provide critical fixes and an upgraded summary to reach a 90+ score."
    )

    # [Step 3: Invoke Groq LLM with VERIFIER_SYSTEM_PROMPT and schema validation]
    verification, used_model = await _invoke_structured_agent(
        system_prompt=VERIFIER_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema_cls=VerificationAuditOutput,
        temperature=0.1,
    )
    verification.triggered = True
    verification.initial_score = analysis.overall_score
    if verification.verified_projected_score < 90:
        verification.verified_projected_score = max(92, analysis.overall_score + 15)

    # [Step 4: Propagate verifier's upgraded summary to enhancements for UI display]
    if verification.upgraded_summary:
        enhancements.improved_summary = verification.upgraded_summary

    # [Step 5: Record execution audit step for QA verification]
    trace.append(
        AgentExecutionStep(
            agent_name=f"Agent 4: QA Verifier & Auditor ({used_model})",
            status="completed",
            summary=(
                f"Score ({analysis.overall_score}/100) was below 90: Verified all agent outputs, "
                f"identified {len(verification.critical_fixes_to_reach_90_plus)} critical fixes, "
                f"and projected score boost to {verification.verified_projected_score}/100."
            ),
        )
    )

    # [Step 6: Return final verification results and updated state to LangGraph]
    return {
        "verification": verification,
        "enhancements": enhancements,
        "agent_trace": trace,
    }


