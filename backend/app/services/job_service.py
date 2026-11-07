import json
from typing import AsyncGenerator, Optional
from fastapi import HTTPException, UploadFile

from app.agents.job_search.graph import job_search_graph
from app.core.model_resolver import GroqModelResolver
from app.schemas.job_search import JobSearchProcessResponse
from app.utils.file_parser import extract_text_from_upload


class JobService:
    """Service layer orchestrating multi-agent job search and streaming execution."""

    @staticmethod
    async def process_uploaded_resume(
        file: UploadFile,
        target_role: Optional[str] = None,
        preferred_location: Optional[str] = None,
    ) -> JobSearchProcessResponse:
        raw_text = await extract_text_from_upload(file)
        return await JobService.process_raw_resume_text(
            raw_text=raw_text,
            filename=file.filename or "uploaded_resume",
            target_role=target_role,
            preferred_location=preferred_location,
        )

    @staticmethod
    async def process_raw_resume_text(
        raw_text: str,
        filename: str = "pasted_resume.txt",
        target_role: Optional[str] = None,
        preferred_location: Optional[str] = None,
    ) -> JobSearchProcessResponse:
        if len(raw_text.strip()) < 20:
            raise HTTPException(
                status_code=400,
                detail="Resume content is too short for job matching. Please provide a full resume.",
            )

        try:
            final_state = await job_search_graph.ainvoke(
                {
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

        return JobSearchProcessResponse(
            filename=filename,
            target_role=target_role,
            preferred_location=preferred_location,
            candidate_profile=final_state["candidate_profile"],
            market_parameters=final_state["market_parameters"],
            discovered_jobs=final_state.get("discovered_jobs", []),
            ranking_summary=final_state["ranking_summary"],
            agent_trace=final_state.get("agent_trace", []),
            raw_text_preview=raw_text[:500] + ("..." if len(raw_text) > 500 else ""),
        )

    @staticmethod
    async def stream_job_search(
        raw_text: str,
        filename: str = "uploaded_resume",
        target_role: Optional[str] = None,
        preferred_location: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Streams real-time NDJSON progress events as each of the 5 Job Search agents executes."""
        if len(raw_text.strip()) < 20:
            yield json.dumps(
                {
                    "type": "error",
                    "message": "Resume text is too short. Please provide a complete resume document.",
                }
            ) + "\n"
            return

        try:
            selected_model = await GroqModelResolver.get_best_model()
        except Exception:
            selected_model = "auto"

        # Step 0: Ingestion
        yield json.dumps(
            {
                "type": "step_update",
                "node_id": "document_parser",
                "agent_id": "parser",
                "status": "completed",
                "model": selected_model,
                "detail": f"Ingested {len(raw_text):,} characters from '{filename}'",
                "progress": 10,
            }
        ) + "\n"

        initial_state = {
            "filename": filename,
            "raw_text": raw_text,
            "target_role": target_role.strip() if target_role else None,
            "preferred_location": preferred_location.strip() if preferred_location else None,
            "agent_trace": [],
        }

        progress_mapping = {
            "job_parser_agent": (
                "parser",
                "Agent 1: Resume Parser & Profiler",
                25,
                "Parsed skills, seniority, and domain specializations",
            ),
            "market_synthesizer_agent": (
                "market",
                "Agent 2: Market Query Synthesizer",
                45,
                "Synthesized boolean search strings and market filters",
            ),
            "job_discovery_agent": (
                "discovery",
                "Agent 3: Multi-Board Discovery Agent",
                65,
                "Scanned tech boards and discovered live matching postings",
            ),
            "ats_matcher_agent": (
                "matcher",
                "Agent 4: ATS Fit & Relevance Matcher",
                85,
                "Calculated candidate compatibility and skill overlap scores",
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

            # Final completion payload
            final_response = JobSearchProcessResponse(
                filename=filename,
                target_role=target_role,
                preferred_location=preferred_location,
                candidate_profile=accumulated_state["candidate_profile"],
                market_parameters=accumulated_state["market_parameters"],
                discovered_jobs=accumulated_state.get("discovered_jobs", []),
                ranking_summary=accumulated_state["ranking_summary"],
                agent_trace=accumulated_state.get("agent_trace", []),
                raw_text_preview=raw_text[:500] + ("..." if len(raw_text) > 500 else ""),
            )

            yield json.dumps(
                {
                    "type": "complete",
                    "status": "success",
                    "progress": 100,
                    "result": final_response.model_dump(),
                }
            ) + "\n"

        except Exception as exc:
            yield json.dumps(
                {
                    "type": "error",
                    "message": f"Multi-agent execution encountered an error: {str(exc)}",
                }
            ) + "\n"


job_service = JobService()

