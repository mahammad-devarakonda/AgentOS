import json
import uuid
from typing import AsyncGenerator, Optional
from fastapi import HTTPException, UploadFile

from app.agents.job_search.graph import job_search_graph
from app.core.model_resolver import GroqModelResolver
from app.schemas.job_search import JobSearchProcessResponse
from app.services.conversation_service import conversation_service


class JobService:
    """Service layer orchestrating multi-agent job search and streaming execution with production guardrails."""

    @staticmethod
    async def process_uploaded_resume(
        file: UploadFile,
        target_role: Optional[str] = None,
        preferred_location: Optional[str] = None,
    ) -> JobSearchProcessResponse:
        content_bytes = await file.read()
        filename = file.filename or "uploaded_resume"
        session_id = f"job_search_{uuid.uuid4().hex[:10]}"

        try:
            final_state = await job_search_graph.ainvoke(
                {
                    "session_id": session_id,
                    "filename": filename,
                    "file_bytes": content_bytes,
                    "content_type": file.content_type,
                    "target_role": target_role.strip() if target_role else None,
                    "preferred_location": preferred_location.strip() if preferred_location else None,
                    "agent_trace": [],
                }
            )
        except ValueError as val_err:
            raise HTTPException(status_code=400, detail=str(val_err)) from val_err
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Multi-agent job search failed: {str(exc)}",
            ) from exc

        try:
            selected_model = await GroqModelResolver.get_best_model()
        except Exception:
            selected_model = "llama-3.3-70b-versatile"

        raw_text = final_state.get("raw_text", "")
        response = JobSearchProcessResponse(
            filename=filename,
            target_role=target_role,
            preferred_location=preferred_location,
            candidate_profile=final_state["candidate_profile"],
            market_parameters=final_state["market_parameters"],
            discovered_jobs=final_state.get("discovered_jobs", []),
            ranking_summary=final_state["ranking_summary"],
            agent_trace=final_state.get("agent_trace", []),
            raw_text_preview=raw_text[:500] + ("..." if len(raw_text) > 500 else ""),
            model=selected_model,
        )

        try:
            conversation_service.record_job_search(
                filename=filename,
                target_role=target_role,
                preferred_location=preferred_location,
                raw_text=raw_text,
                result=response.model_dump(),
                model=selected_model,
            )
        except Exception as log_err:
            print(f"[Warning] Failed to record job search history: {log_err}")

        return response

    @staticmethod
    async def process_raw_resume_text(
        raw_text: str,
        filename: str = "pasted_resume.txt",
        target_role: Optional[str] = None,
        preferred_location: Optional[str] = None,
    ) -> JobSearchProcessResponse:
        session_id = f"job_search_{uuid.uuid4().hex[:10]}"

        try:
            final_state = await job_search_graph.ainvoke(
                {
                    "session_id": session_id,
                    "filename": filename,
                    "raw_text": raw_text,
                    "target_role": target_role.strip() if target_role else None,
                    "preferred_location": preferred_location.strip() if preferred_location else None,
                    "agent_trace": [],
                }
            )
        except ValueError as val_err:
            raise HTTPException(status_code=400, detail=str(val_err)) from val_err
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Multi-agent job search failed: {str(exc)}",
            ) from exc

        try:
            selected_model = await GroqModelResolver.get_best_model()
        except Exception:
            selected_model = "llama-3.3-70b-versatile"

        response = JobSearchProcessResponse(
            filename=filename,
            target_role=target_role,
            preferred_location=preferred_location,
            candidate_profile=final_state["candidate_profile"],
            market_parameters=final_state["market_parameters"],
            discovered_jobs=final_state.get("discovered_jobs", []),
            ranking_summary=final_state["ranking_summary"],
            agent_trace=final_state.get("agent_trace", []),
            raw_text_preview=raw_text[:500] + ("..." if len(raw_text) > 500 else ""),
            model=selected_model,
        )

        try:
            conversation_service.record_job_search(
                filename=filename,
                target_role=target_role,
                preferred_location=preferred_location,
                raw_text=raw_text,
                result=response.model_dump(),
                model=selected_model,
            )
        except Exception as log_err:
            print(f"[Warning] Failed to record job search history: {log_err}")

        return response

    @staticmethod
    async def stream_job_search(
        raw_text: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        filename: str = "uploaded_resume",
        content_type: Optional[str] = None,
        target_role: Optional[str] = None,
        preferred_location: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Streams real-time NDJSON progress events across guardrail validation and the 5 Job Search agents."""
        try:
            selected_model = await GroqModelResolver.get_best_model()
        except Exception:
            selected_model = "auto"

        session_id = f"job_search_{uuid.uuid4().hex[:10]}"
        initial_state = {
            "session_id": session_id,
            "filename": filename,
            "file_bytes": file_bytes,
            "content_type": content_type,
            "raw_text": raw_text or "",
            "target_role": target_role.strip() if target_role else None,
            "preferred_location": preferred_location.strip() if preferred_location else None,
            "agent_trace": [],
        }

        progress_mapping = {
            "file_validation": (
                "guardrail_file",
                "Guardrail: File Validation",
                8,
                "Validated binary signature, MIME type, and structural integrity",
            ),
            "document_extraction": (
                "guardrail_extract",
                "Guardrail: Text Extraction",
                16,
                "Extracted text via PyMuPDF (PDF) / python-docx (DOCX)",
            ),
            "resume_classification": (
                "guardrail_classify",
                "Guardrail: Resume Classification",
                25,
                "Classified document authenticity and checked prompt injection defense",
            ),
            "job_parser_agent": (
                "parser",
                "Agent 1: Resume Parser & Profiler",
                40,
                "Parsed skills, seniority, and domain specializations",
            ),
            "market_synthesizer_agent": (
                "market",
                "Agent 2: Market Query Synthesizer",
                55,
                "Synthesized boolean search strings and market filters",
            ),
            "job_discovery_agent": (
                "discovery",
                "Agent 3: Multi-Board Discovery Agent",
                70,
                "Scanned tech boards and queried Qdrant vector store (all-MiniLM-L6-v2)",
            ),
            "ats_matcher_agent": (
                "matcher",
                "Agent 4: ATS Fit & Relevance Matcher",
                85,
                "RAG-evaluated candidate compatibility using Qdrant vector retrieval",
            ),
            "opportunity_ranking_agent": (
                "ranking",
                "Agent 5: Opportunity Ranking Agent",
                100,
                "Ranked top opportunities and synthesized strategic pitch guidance",
            ),
        }

        accumulated_state = dict(initial_state)

        try:
            async for event in job_search_graph.astream(initial_state):
                for node_name, node_output in event.items():
                    accumulated_state.update(node_output)

                    if node_name in progress_mapping:
                        agent_id, title, progress_pct, default_detail = progress_mapping[node_name]
                        trace = accumulated_state.get("agent_trace", [])
                        latest_summary = trace[-1].summary if trace else default_detail

                        yield json.dumps(
                            {
                                "type": "step_update",
                                "node_id": node_name,
                                "agent_id": agent_id,
                                "agent_name": title,
                                "status": "completed",
                                "model": selected_model,
                                "detail": latest_summary,
                                "progress": progress_pct,
                            }
                        ) + "\n"

            # Check if execution ended with an unhandled error
            if accumulated_state.get("error"):
                yield json.dumps(
                    {
                        "type": "error",
                        "message": accumulated_state["error"],
                    }
                ) + "\n"
                return

            candidate_profile = accumulated_state.get("candidate_profile")
            market_params = accumulated_state.get("market_parameters")
            ranking_summary = accumulated_state.get("ranking_summary")

            if not candidate_profile or not market_params or not ranking_summary:
                yield json.dumps(
                    {
                        "type": "error",
                        "message": "Pipeline did not complete full candidate evaluation.",
                    }
                ) + "\n"
                return

            final_text = accumulated_state.get("raw_text", "")
            final_response = JobSearchProcessResponse(
                filename=filename,
                target_role=target_role,
                preferred_location=preferred_location,
                candidate_profile=candidate_profile,
                market_parameters=market_params,
                discovered_jobs=accumulated_state.get("discovered_jobs", []),
                ranking_summary=ranking_summary,
                agent_trace=accumulated_state.get("agent_trace", []),
                raw_text_preview=final_text[:500] + ("..." if len(final_text) > 500 else ""),
                model=selected_model,
            )

            try:
                conversation_service.record_job_search(
                    filename=filename,
                    target_role=target_role,
                    preferred_location=preferred_location,
                    raw_text=final_text,
                    result=final_response.model_dump(),
                    model=selected_model,
                )
            except Exception as log_err:
                print(f"[Warning] Failed to record job search history: {log_err}")

            yield json.dumps(
                {
                    "type": "complete",
                    "status": "success",
                    "progress": 100,
                    "model": selected_model,
                    "result": final_response.model_dump(),
                }
            ) + "\n"

        except Exception as exc:
            yield json.dumps(
                {
                    "type": "error",
                    "message": f"{str(exc)}",
                }
            ) + "\n"


job_service = JobService()
