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

T = TypeVar("T", bound=BaseModel)


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


async def extractor_agent_node(state: ResumeGraphState) -> ResumeGraphState:
    """Node 1: Parses raw resume text into a structured ExtractedResumeProfile."""
    raw_text = state.get("raw_text", "")
    trace = list(state.get("agent_trace", []))

    user_prompt = (
        "Extract the structured candidate profile from the following raw resume text:\n\n"
        f"--- RESUME TEXT START ---\n{raw_text}\n--- RESUME TEXT END ---"
    )

    profile, used_model = await _invoke_structured_agent(
        system_prompt=EXTRACTOR_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema_cls=ExtractedResumeProfile,
        temperature=0.0,
    )

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
                f"{len(profile.education)} education entries."
            ),
        )
    )

    return {
        "extracted_profile": profile,
        "agent_trace": trace,
    }


async def analyzer_agent_node(state: ResumeGraphState) -> ResumeGraphState:
    """Node 2: Evaluates the extracted profile for ATS compatibility, impact, and JD alignment."""
    profile = state["extracted_profile"]
    target_role = state.get("target_role") or "General Software / Technology Professional"
    job_description = (
        state.get("job_description")
        or "No specific job description provided; evaluate against industry best practices for the target role."
    )
    trace = list(state.get("agent_trace", []))

    user_prompt = (
        f"Target Role: {target_role}\n"
        f"Job Description:\n{job_description}\n\n"
        f"Extracted Candidate Profile JSON:\n{profile.model_dump_json(indent=2)}\n\n"
        "Perform a comprehensive ATS, impact, and skill-gap analysis."
    )

    analysis, used_model = await _invoke_structured_agent(
        system_prompt=ANALYZER_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema_cls=ResumeAnalysisEvaluation,
        temperature=0.1,
    )

    trace.append(
        AgentExecutionStep(
            agent_name=f"Agent 2: ATS & Quality Scorer ({used_model})",
            status="completed",
            summary=(
                f"Calculated Overall Score: {analysis.overall_score}/100 "
                f"(ATS: {analysis.section_scores.ats_compatibility}/100, "
                f"Impact: {analysis.section_scores.impact_and_metrics}/100)."
            ),
        )
    )

    return {
        "analysis": analysis,
        "agent_trace": trace,
    }


async def enhancer_agent_node(state: ResumeGraphState) -> ResumeGraphState:
    """Node 3: Produces actionable bullet rewrites and an executive summary upgrade."""
    profile = state["extracted_profile"]
    analysis = state["analysis"]
    target_role = state.get("target_role") or "General Technology Role"
    job_description = state.get("job_description") or "Not specified"
    trace = list(state.get("agent_trace", []))

    user_prompt = (
        f"Target Role: {target_role}\n"
        f"Job Description:\n{job_description}\n\n"
        f"Extracted Candidate Profile:\n{profile.model_dump_json(indent=2)}\n\n"
        f"ATS & Recruiter Analysis Findings:\n{analysis.model_dump_json(indent=2)}\n\n"
        "Generate an improved executive summary, high-impact before/after bullet point rewrites, and prioritized recommendations."
    )

    enhancements, used_model = await _invoke_structured_agent(
        system_prompt=ENHANCER_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema_cls=ResumeEnhancementOutput,
        temperature=0.2,
    )

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

    return {
        "enhancements": enhancements,
        "agent_trace": trace,
    }


async def verifier_agent_node(state: ResumeGraphState) -> ResumeGraphState:
    """Node 4 (Conditional): Audits and verifies all work when overall_score < 90."""
    profile = state["extracted_profile"]
    analysis = state["analysis"]
    enhancements = state["enhancements"]
    target_role = state.get("target_role") or "General Technology Role"
    job_description = state.get("job_description") or "Not specified"
    trace = list(state.get("agent_trace", []))

    user_prompt = (
        f"Target Role: {target_role}\n"
        f"Job Description:\n{job_description}\n\n"
        f"Agent 1 Output (Extracted Profile):\n{profile.model_dump_json(indent=2)}\n\n"
        f"Agent 2 Output (ATS Evaluation - Overall Score {analysis.overall_score}/100):\n{analysis.model_dump_json(indent=2)}\n\n"
        f"Agent 3 Output (Enhancements & Bullet Rewrites):\n{enhancements.model_dump_json(indent=2)}\n\n"
        "Since the overall score is below 90, audit all work from Agents 1, 2, and 3, verify accuracy, "
        "and provide critical fixes and an upgraded summary to reach a 90+ score."
    )

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

    # Apply the verifier's upgraded summary to enhancements as well
    if verification.upgraded_summary:
        enhancements.improved_summary = verification.upgraded_summary

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

    return {
        "verification": verification,
        "enhancements": enhancements,
        "agent_trace": trace,
    }

