export interface JobPostingItem {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  posted: string;
  description: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  agent_summary: string;
  application_tip?: string | null;
}

export interface ParsedCandidateProfile {
  full_name: string;
  detected_role: string;
  seniority_level: string;
  years_of_experience: number;
  primary_skills: string[];
  secondary_skills: string[];
  domains: string[];
}

export interface MarketQueryParameters {
  search_queries: string[];
  boolean_string: string;
  target_titles: string[];
  experience_range: string;
  recommended_locations: string[];
}

export interface OpportunityRankingSummary {
  total_jobs_evaluated: number;
  recommended_jobs_count: number;
  top_career_trajectory: string;
  market_competitiveness: string;
}

export interface AgentExecutionStep {
  agent_name: string;
  status: string;
  summary: string;
}

export interface JobSearchProcessResponse {
  filename: string;
  target_role?: string | null;
  preferred_location?: string | null;
  candidate_profile: ParsedCandidateProfile;
  market_parameters: MarketQueryParameters;
  discovered_jobs: JobPostingItem[];
  ranking_summary: OpportunityRankingSummary;
  agent_trace: AgentExecutionStep[];
  raw_text_preview?: string;
}

export interface JobStreamStepEvent {
  type: 'step_update' | 'complete' | 'error';
  node_id?: string;
  agent_id?: string;
  agent_name?: string;
  status?: string;
  model?: string;
  detail?: string;
  progress?: number;
  message?: string;
  result?: JobSearchProcessResponse;
}

export interface JobAgentStep {
  id: string;
  name: string;
  role: string;
  description: string;
  status: 'pending' | 'running' | 'completed';
  details?: string;
}

