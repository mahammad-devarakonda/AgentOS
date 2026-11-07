from langgraph.graph import END, START, StateGraph
from app.agents.job_search.state import JobSearchGraphState
from app.agents.job_search.nodes import (
    job_parser_agent_node,
    market_synthesizer_agent_node,
    job_discovery_agent_node,
    ats_matcher_agent_node,
    opportunity_ranking_agent_node,
)


def build_job_search_graph():
    """Builds and compiles the LangGraph multi-agent workflow for Job Search."""
    workflow = StateGraph(JobSearchGraphState)

    # Register the 5 specialized agent nodes
    workflow.add_node("job_parser_agent", job_parser_agent_node)
    workflow.add_node("market_synthesizer_agent", market_synthesizer_agent_node)
    workflow.add_node("job_discovery_agent", job_discovery_agent_node)
    workflow.add_node("ats_matcher_agent", ats_matcher_agent_node)
    workflow.add_node("opportunity_ranking_agent", opportunity_ranking_agent_node)

    # Sequence of the multi-agent pipeline
    workflow.add_edge(START, "job_parser_agent")
    workflow.add_edge("job_parser_agent", "market_synthesizer_agent")
    workflow.add_edge("market_synthesizer_agent", "job_discovery_agent")
    workflow.add_edge("job_discovery_agent", "ats_matcher_agent")
    workflow.add_edge("ats_matcher_agent", "opportunity_ranking_agent")
    workflow.add_edge("opportunity_ranking_agent", END)

    return workflow.compile()


job_search_graph = build_job_search_graph()

