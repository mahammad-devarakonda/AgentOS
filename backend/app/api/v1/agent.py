from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from app.schemas.agent import ResumeAnalyzeRequest
from app.services.agent_service import stream_resume_analysis
import httpx

router = APIRouter(prefix="/agent", tags=["Agent"])


@router.post(
    "/analyze-resume",
    summary="Stream resume analysis against a job description using the Groq AI agent",
    response_class=StreamingResponse,
)
async def analyze_resume_endpoint(body: ResumeAnalyzeRequest):
    """
    Accepts a job description and resume content, streams the Groq LLM response
    back to the client as Server-Sent Events (SSE).
    """
    try:
        generator = stream_resume_analysis(
            job_description=body.job_description,
            resume_content=body.resume_content,
        )
        return StreamingResponse(
            generator,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    except httpx.HTTPStatusError as exc:
        detail = f"Groq API error {exc.response.status_code}: {exc.response.text}"
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not reach Groq API: {exc}",
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent error: {str(exc)}",
        )
