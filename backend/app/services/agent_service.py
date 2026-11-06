"""
Resume Analyzer Agent Service
Calls the Groq API (OpenAI-compatible) with a career coach system prompt
to analyze a job description against a resume.
Streams the response back token-by-token using Server-Sent Events (SSE).
"""

import json
import httpx
from typing import AsyncGenerator
from app.core.config import settings

GROQ_API_URL = settings.GROQ_API_URL
GROQ_API_KEY = settings.GROQ_API_KEY
MODEL = settings.GROQ_MODEL

SYSTEM_PROMPT = """You are an expert Resume & Career Coach AI Agent. Your job is to:
1. Analyze the provided Job Description thoroughly.
2. Analyze the provided Resume/CV content.
3. Provide a detailed, structured analysis that includes:
   - **Match Score**: An overall compatibility score (0-100%) between the resume and job description.
   - **Key Strengths**: Skills and experiences from the resume that align well with the job.
   - **Missing Skills / Gaps**: Important skills or requirements from the job description that are absent or weak in the resume.
   - **Keyword Analysis**: Important keywords from the job description and whether they appear in the resume.
   - **Actionable Recommendations**: Specific, concrete suggestions to improve the resume for this job.
   - **Summary**: A brief overall assessment.

Be honest, specific, and constructive. Format your response in clear sections using markdown-style headers (##)."""


def _build_messages(job_description: str, resume_content: str) -> list:
    user_message = (
        f"## Job Description:\n{job_description.strip()}\n\n"
        f"## Resume Content:\n{resume_content.strip()}\n\n"
        "Please analyze my resume against this job description and provide detailed feedback."
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]


async def stream_resume_analysis(
    job_description: str, resume_content: str
) -> AsyncGenerator[str, None]:
    """
    Streams the Groq response as Server-Sent Events (SSE).
    Yields SSE-formatted strings: 'data: <json>\\n\\n'
    Final event: 'data: [DONE]\\n\\n'
    """
    payload = {
        "model": MODEL,
        "messages": _build_messages(job_description, resume_content),
        "temperature": 0.7,
        "max_tokens": 2048,
        "stream": True,
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST", GROQ_API_URL, json=payload, headers=headers
        ) as response:
            response.raise_for_status()

            async for raw_line in response.aiter_lines():
                # Groq streams SSE lines like: "data: {...}" or "data: [DONE]"
                if not raw_line.startswith("data:"):
                    continue

                chunk_str = raw_line[len("data:"):].strip()

                if chunk_str == "[DONE]":
                    yield "data: [DONE]\n\n"
                    return

                try:
                    chunk = json.loads(chunk_str)
                    content = chunk["choices"][0]["delta"].get("content", "")
                    model_used = chunk.get("model", MODEL)

                    if content:
                        yield f"data: {json.dumps({'content': content, 'model': model_used})}\n\n"
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue


