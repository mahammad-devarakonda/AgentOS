from langgraph.graph import END, START, StateGraph
from app.agents.job_search.state import JobSearchGraphState
from app.agents.job_search.nodes import (
    file_validation_node,
    document_extraction_node,
    resume_classification_node,
    reject_document_node,
    route_after_file_validation,
    route_after_document_extraction,
    route_after_classification,
    job_parser_agent_node,
    market_synthesizer_agent_node,
    job_discovery_agent_node,
    ats_matcher_agent_node,
    opportunity_ranking_agent_node,
)


def build_job_search_graph():
    """Builds and compiles the production-guarded LangGraph multi-agent workflow for Job Search."""
    workflow = StateGraph(JobSearchGraphState)

    # 1. Register Guardrail Nodes
    workflow.add_node("file_validation", file_validation_node)
    workflow.add_node("document_extraction", document_extraction_node)
    workflow.add_node("resume_classification", resume_classification_node)
    workflow.add_node("reject_document", reject_document_node)

    # 2. Register the 5 specialized agent nodes
    workflow.add_node("job_parser_agent", job_parser_agent_node)
    workflow.add_node("market_synthesizer_agent", market_synthesizer_agent_node)
    workflow.add_node("job_discovery_agent", job_discovery_agent_node)
    workflow.add_node("ats_matcher_agent", ats_matcher_agent_node)
    workflow.add_node("opportunity_ranking_agent", opportunity_ranking_agent_node)

    # 3. Guardrail Ingestion & Validation Pipeline
    workflow.add_edge(START, "file_validation")

    workflow.add_conditional_edges(
        "file_validation",
        route_after_file_validation,
        {
            "document_extraction": "document_extraction",
            "reject_document": "reject_document",
        },
    )

    workflow.add_conditional_edges(
        "document_extraction",
        route_after_document_extraction,
        {
            "resume_classification": "resume_classification",
            "reject_document": "reject_document",
        },
    )

    # 4. Conditional Routing based on Resume Classification
    # Valid resume (Confidence >= 0.85) -> job_parser_agent
    # Invalid / Uncertain / Prompt Injection -> reject_document
    workflow.add_conditional_edges(
        "resume_classification",
        route_after_classification,
        {
            "job_parser_agent": "job_parser_agent",
            "reject_document": "reject_document",
        },
    )

    workflow.add_edge("reject_document", END)

    # 5. Core Multi-Agent Pipeline
    workflow.add_edge("job_parser_agent", "market_synthesizer_agent")
    workflow.add_edge("market_synthesizer_agent", "job_discovery_agent")
    workflow.add_edge("job_discovery_agent", "ats_matcher_agent")
    workflow.add_edge("ats_matcher_agent", "opportunity_ranking_agent")
    workflow.add_edge("opportunity_ranking_agent", END)

    return workflow.compile()


job_search_graph = build_job_search_graph()

