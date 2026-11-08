import json
from typing import AsyncGenerator, Optional
from fastapi import HTTPException, UploadFile

from app.agents.resume.graph import resume_processing_graph
from app.core.model_resolver import GroqModelResolver
from app.schemas.resume import ResumeProcessResponse
from app.services.conversation_service import conversation_service
from app.utils.file_parser import extract_text_from_upload


class ResumeService:
    """Service layer orchestrating document text extraction and LangGraph execution."""

    @staticmethod
    async def process_uploaded_resume(
        file: UploadFile,
        target_role: Optional[str] = None,
        job_description: Optional[str] = None,
    ) -> ResumeProcessResponse:
        raw_text = await extract_text_from_upload(file)
        return await ResumeService.process_raw_resume_text(
            raw_text=raw_text,
            filename=file.filename or "uploaded_resume",
            target_role=target_role,
            job_description=job_description,
        )

    @staticmethod
    async def process_raw_resume_text(
        raw_text: str,
        filename: str = "pasted_resume.txt",
        target_role: Optional[str] = None,
        job_description: Optional[str] = None,
    ) -> ResumeProcessResponse:
        if len(raw_text.strip()) < 20:
            raise HTTPException(
                status_code=400,
                detail="Resume text is too short to analyze. Please provide a complete resume.",
            )

        try:
            final_state = await resume_processing_graph.ainvoke(
                {
                    "filename": filename,
                    "raw_text": raw_text,
                    "target_role": target_role.strip() if target_role else None,
                    "job_description": job_description.strip() if job_description else None,
                    "agent_trace": [],
                }
            )
        except ValueError as val_err:
            raise HTTPException(status_code=400, detail=str(val_err)) from val_err
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Multi-agent resume processing failed: {str(exc)}",
            ) from exc

        response = ResumeProcessResponse(
            filename=filename,
            target_role=target_role,
            extracted_profile=final_state["extracted_profile"],
            analysis=final_state["analysis"],
            enhancements=final_state["enhancements"],
            verification=final_state.get("verification"),
            agent_trace=final_state.get("agent_trace", []),
            raw_text_preview=raw_text[:500] + ("..." if len(raw_text) > 500 else ""),
        )

        try:
            conversation_service.record_resume_analysis(
                filename=filename,
                target_role=target_role,
                job_description=job_description,
                raw_text=raw_text,
                result=response.model_dump(),
            )
        except Exception as log_err:
            print(f"[Warning] Failed to record resume analysis history: {log_err}")

        return response

    @staticmethod
    async def stream_resume_processing(
        raw_text: str,
        filename: str = "uploaded_resume",
        target_role: Optional[str] = None,
        job_description: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Streams real-time NDJSON progress events as each LangGraph agent node executes."""
        if len(raw_text.strip()) < 20:
            yield json.dumps(
                {
                    "type": "error",
                    "message": "Resume text is too short to analyze. Please provide a complete resume.",
                }
            ) + "\n"
            return

        try:
            selected_model = await GroqModelResolver.get_best_model()
        except Exception:
            selected_model = "auto"

        # Step 1: Document parsed
        yield json.dumps(
            {
                "type": "step_update",
                "node_id": "document_parser",
                "status": "completed",
                "model": selected_model,
                "detail": f"Extracted {len(raw_text):,} characters from '{filename}'",
                "progress": 15,
            }
        ) + "\n"

        # Step 2: Notify that Agent 1 (Extractor) is now running
        yield json.dumps(
            {
                "type": "step_update",
                "node_id": "extractor_agent",
                "status": "running",
                "model": selected_model,
                "detail": f"Agent 1 is parsing contact info, skills, work history & education using {selected_model}...",
                "progress": 25,
            }
        ) + "\n"

        initial_state = {
            "filename": filename,
            "raw_text": raw_text,
            "target_role": target_role.strip() if target_role else None,
            "job_description": job_description.strip() if job_description else None,
            "agent_trace": [],
        }

        accumulated_state = dict(initial_state)

        try:
            async for chunk in resume_processing_graph.astream(
                initial_state, stream_mode="updates"
            ):
                for node_name, node_output in chunk.items():
                    accumulated_state.update(node_output)
                    traces = accumulated_state.get("agent_trace", [])
                    latest_summary = traces[-1].summary if traces else "Completed step"
                    latest_agent_label = traces[-1].agent_name if traces else node_name

                    if node_name == "extractor_agent":
                        yield json.dumps(
                            {
                                "type": "step_update",
                                "node_id": "extractor_agent",
                                "status": "completed",
                                "agent_label": latest_agent_label,
                                "detail": latest_summary,
                                "progress": 45,
                            }
                        ) + "\n"
                        yield json.dumps(
                            {
                                "type": "step_update",
                                "node_id": "analyzer_agent",
                                "status": "running",
                                "detail": "Agent 2 is scoring ATS compatibility, quantified metrics, and role alignment...",
                                "progress": 55,
                            }
                        ) + "\n"

                    elif node_name == "analyzer_agent":
                        yield json.dumps(
                            {
                                "type": "step_update",
                                "node_id": "analyzer_agent",
                                "status": "completed",
                                "agent_label": latest_agent_label,
                                "detail": latest_summary,
                                "progress": 70,
                            }
                        ) + "\n"
                        yield json.dumps(
                            {
                                "type": "step_update",
                                "node_id": "enhancer_agent",
                                "status": "running",
                                "detail": "Agent 3 is rewriting weak bullet points and crafting executive summary...",
                                "progress": 78,
                            }
                        ) + "\n"

                    elif node_name == "enhancer_agent":
                        analysis_obj = accumulated_state.get("analysis")
                        overall_score = analysis_obj.overall_score if analysis_obj else 0

                        yield json.dumps(
                            {
                                "type": "step_update",
                                "node_id": "enhancer_agent",
                                "status": "completed",
                                "agent_label": latest_agent_label,
                                "detail": latest_summary,
                                "progress": 85 if overall_score < 90 else 100,
                            }
                        ) + "\n"

                        if overall_score < 90:
                            yield json.dumps(
                                {
                                    "type": "step_update",
                                    "node_id": "verifier_agent",
                                    "status": "running",
                                    "detail": (
                                        f"Score is {overall_score}/100 (< 90 threshold) — Agent 4 (QA Verifier) "
                                        "is auditing all agent work and verifying 90+ score fixes..."
                                    ),
                                    "progress": 92,
                                }
                            ) + "\n"
                        else:
                            yield json.dumps(
                                {
                                    "type": "step_update",
                                    "node_id": "verifier_agent",
                                    "status": "skipped",
                                    "agent_label": "Agent 4: QA Verifier (Skipped — Score >= 90)",
                                    "detail": f"Overall score is {overall_score}/100 (>= 90). Secondary verification not required.",
                                    "progress": 100,
                                }
                            ) + "\n"

                    elif node_name == "verifier_agent":
                        yield json.dumps(
                            {
                                "type": "step_update",
                                "node_id": "verifier_agent",
                                "status": "completed",
                                "agent_label": latest_agent_label,
                                "detail": latest_summary,
                                "progress": 100,
                            }
                        ) + "\n"

            final_response = ResumeProcessResponse(
                filename=filename,
                target_role=target_role,
                extracted_profile=accumulated_state["extracted_profile"],
                analysis=accumulated_state["analysis"],
                enhancements=accumulated_state["enhancements"],
                verification=accumulated_state.get("verification"),
                agent_trace=accumulated_state.get("agent_trace", []),
                raw_text_preview=raw_text[:500] + ("..." if len(raw_text) > 500 else ""),
            )

            try:
                conversation_service.record_resume_analysis(
                    filename=filename,
                    target_role=target_role,
                    job_description=job_description,
                    raw_text=raw_text,
                    result=final_response.model_dump(),
                )
            except Exception as log_err:
                print(f"[Warning] Failed to record resume analysis history: {log_err}")

            yield json.dumps(
                {
                    "type": "complete",
                    "progress": 100,
                    "result": final_response.model_dump(),
                }
            ) + "\n"

        except Exception as exc:
            yield json.dumps(
                {
                    "type": "error",
                    "message": f"Multi-agent resume processing failed: {str(exc)}",
                }
            ) + "\n"


resume_service = ResumeService()
