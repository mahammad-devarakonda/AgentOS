from langgraph.graph import END, START, StateGraph
from app.agents.resume.state import ResumeGraphState
from app.agents.resume.nodes import (
    analyzer_agent_node,
    enhancer_agent_node,
    extractor_agent_node,
    verifier_agent_node,
)


def route_after_enhancer(state: ResumeGraphState) -> str:
    """Conditional router: if overall_score < 90, route to verifier_agent; otherwise END."""
    analysis = state.get("analysis")
    if analysis and analysis.overall_score < 90:
        return "verifier_agent"
    return END


def build_resume_processing_graph():
    """Builds and compiles the LangGraph multi-agent workflow for Resume Processing."""
    workflow = StateGraph(ResumeGraphState)

    # Register specialized agent nodes
    workflow.add_node("extractor_agent", extractor_agent_node)
    workflow.add_node("analyzer_agent", analyzer_agent_node)
    workflow.add_node("enhancer_agent", enhancer_agent_node)
    workflow.add_node("verifier_agent", verifier_agent_node)

    # Define multi-agent pipeline edges
    workflow.add_edge(START, "extractor_agent")
    workflow.add_edge("extractor_agent", "analyzer_agent")
    workflow.add_edge("analyzer_agent", "enhancer_agent")

    # Conditional verification edge when score < 90
    workflow.add_conditional_edges(
        "enhancer_agent",
        route_after_enhancer,
        {
            "verifier_agent": "verifier_agent",
            END: END,
        },
    )
    workflow.add_edge("verifier_agent", END)

    return workflow.compile()


resume_processing_graph = build_resume_processing_graph()

