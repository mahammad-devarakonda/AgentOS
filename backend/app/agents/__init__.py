"""Multi-agent pipelines for AgentOS.

Divided into:
- app.agents.resume: Multi-agent pipeline for ATS analysis, scoring, and resume enhancement.
- app.agents.job_search: Multi-agent pipeline for market parsing, discovery, matching, and ranking.
"""

from app.agents import job_search, resume

__all__ = ["resume", "job_search"]
