export interface ContactInfo {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
}

export interface SkillCategory {
  technical_skills: string[];
  tools_and_frameworks: string[];
  soft_skills: string[];
}

export interface WorkExperienceItem {
  company: string;
  role: string;
  duration: string;
  location?: string | null;
  highlights: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  graduation_year?: string | null;
  gpa_or_honors?: string | null;
}

export interface ProjectItem {
  title: string;
  description: string;
  technologies: string[];
  link?: string | null;
}

export interface ExtractedResumeProfile {
  contact: ContactInfo;
  professional_summary: string;
  total_years_experience: number;
  skills: SkillCategory;
  work_experience: WorkExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: string[];
}

export interface SectionScores {
  impact_and_metrics: number;
  ats_compatibility: number;
  skills_relevance: number;
  experience_clarity: number;
}

export interface ResumeAnalysisEvaluation {
  overall_score: number;
  role_fit_assessment: string;
  section_scores: SectionScores;
  key_strengths: string[];
  skill_gaps_or_missing_keywords: string[];
  red_flags: string[];
}

export interface BulletRewriteItem {
  section: string;
  original_bullet: string;
  improved_bullet: string;
  rationale: string;
}

export interface ResumeEnhancementOutput {
  improved_summary: string;
  bullet_rewrites: BulletRewriteItem[];
  actionable_recommendations: string[];
}

export interface VerificationAuditOutput {
  triggered: boolean;
  initial_score: number;
  verified_projected_score: number;
  audit_verdict: string;
  verified_checks: string[];
  critical_fixes_to_reach_90_plus: string[];
  upgraded_summary: string;
}

export interface AgentExecutionStep {
  agent_name: string;
  status: string;
  summary: string;
}

export interface ResumeProcessResponse {
  filename: string;
  target_role?: string | null;
  extracted_profile: ExtractedResumeProfile;
  analysis: ResumeAnalysisEvaluation;
  enhancements: ResumeEnhancementOutput;
  verification?: VerificationAuditOutput | null;
  agent_trace: AgentExecutionStep[];
  raw_text_preview: string;
}

export type AgentNodeId =
  | 'document_parser'
  | 'extractor_agent'
  | 'analyzer_agent'
  | 'enhancer_agent'
  | 'verifier_agent';

export type StepStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'error';

export interface LivePipelineStep {
  nodeId: AgentNodeId;
  stepNumber: number;
  title: string;
  agentLabel?: string;
  status: StepStatus;
  detail: string;
}

export interface StreamStepEvent {
  type: 'step_update' | 'complete' | 'error';
  node_id?: AgentNodeId;
  status?: StepStatus;
  agent_label?: string;
  model?: string;
  detail?: string;
  progress?: number;
  result?: ResumeProcessResponse;
  message?: string;
}
