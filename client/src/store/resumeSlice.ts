import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  LivePipelineStep,
  ResumeProcessResponse,
  StreamStepEvent,
} from '../types/resume';
import { resumeApi } from '../services/api';

const createInitialPipelineSteps = (): LivePipelineStep[] => [
  {
    nodeId: 'document_parser',
    stepNumber: 1,
    title: 'Step 1: Document Text Extraction',
    status: 'pending',
    detail: 'Reads PDF / DOCX / text content and prepares it for the agents',
  },
  {
    nodeId: 'extractor_agent',
    stepNumber: 2,
    title: 'Step 2: Agent 1 — Profile Extractor',
    status: 'pending',
    detail: 'Extracts candidate contact details, categorized skills, experience & education',
  },
  {
    nodeId: 'analyzer_agent',
    stepNumber: 3,
    title: 'Step 3: Agent 2 — ATS & Quality Scorer',
    status: 'pending',
    detail: 'Evaluates ATS compatibility, quantified impact & keyword gaps (0–100 score)',
  },
  {
    nodeId: 'enhancer_agent',
    stepNumber: 4,
    title: 'Step 4: Agent 3 — Resume Coach & Enhancer',
    status: 'pending',
    detail: 'Generates executive summary and before/after bullet point rewrites',
  },
  {
    nodeId: 'verifier_agent',
    stepNumber: 5,
    title: 'Step 5: Agent 4 — QA Verifier (Runs if Score < 90)',
    status: 'pending',
    detail: 'Audits all previous agents’ work and verifies fixes if score is below 90',
  },
];

interface ResumeState {
  result: ResumeProcessResponse | null;
  loading: boolean;
  error: string | null;
  progress: number;
  pipelineSteps: LivePipelineStep[];
}

const initialState: ResumeState = {
  result: null,
  loading: false,
  error: null,
  progress: 0,
  pipelineSteps: createInitialPipelineSteps(),
};

export const analyzeResumeFile = createAsyncThunk<
  ResumeProcessResponse,
  { file: File; targetRole?: string; jobDescription?: string },
  { rejectValue: string }
>(
  'resume/analyzeFile',
  async ({ file, targetRole, jobDescription }, { dispatch, rejectWithValue }) => {
    try {
      return await resumeApi.processFileStream(
        file,
        targetRole,
        jobDescription,
        (event) => {
          dispatch(updatePipelineProgress(event));
        }
      );
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : 'Failed to analyze resume file'
      );
    }
  }
);

export const analyzeResumeText = createAsyncThunk<
  ResumeProcessResponse,
  { rawText: string; targetRole?: string; jobDescription?: string },
  { rejectValue: string }
>(
  'resume/analyzeText',
  async ({ rawText, targetRole, jobDescription }, { dispatch, rejectWithValue }) => {
    try {
      return await resumeApi.processTextStream(
        rawText,
        targetRole,
        jobDescription,
        (event) => {
          dispatch(updatePipelineProgress(event));
        }
      );
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : 'Failed to analyze resume text'
      );
    }
  }
);

const resumeSlice = createSlice({
  name: 'resume',
  initialState,
  reducers: {
    clearResumeResult(state) {
      state.result = null;
      state.error = null;
      state.progress = 0;
      state.pipelineSteps = createInitialPipelineSteps();
    },
    updatePipelineProgress(state, action: PayloadAction<StreamStepEvent>) {
      const event = action.payload;
      if (typeof event.progress === 'number') {
        state.progress = event.progress;
      }
      if (event.type === 'step_update' && event.node_id) {
        const target = state.pipelineSteps.find((s) => s.nodeId === event.node_id);
        if (target) {
          if (event.status) target.status = event.status;
          if (event.detail) target.detail = event.detail;
          if (event.agent_label) target.agentLabel = event.agent_label;
        }
      }
    },
  },
  extraReducers: (builder) => {
    const startPipeline = (state: ResumeState) => {
      state.loading = true;
      state.error = null;
      state.result = null;
      state.progress = 8;
      state.pipelineSteps = createInitialPipelineSteps();
      state.pipelineSteps[0].status = 'running';
      state.pipelineSteps[0].detail = 'Reading and extracting resume text...';
    };

    const failPipeline = (state: ResumeState, errorMsg?: string) => {
      state.loading = false;
      state.error = errorMsg || 'Unexpected error occurred';
      const runningStep = state.pipelineSteps.find((s) => s.status === 'running');
      if (runningStep) {
        runningStep.status = 'error';
        runningStep.detail = state.error;
      }
    };

    builder
      .addCase(analyzeResumeFile.pending, startPipeline)
      .addCase(analyzeResumeFile.fulfilled, (state, action) => {
        state.loading = false;
        state.progress = 100;
        state.result = action.payload;
      })
      .addCase(analyzeResumeFile.rejected, (state, action) => {
        failPipeline(state, action.payload);
      })
      .addCase(analyzeResumeText.pending, startPipeline)
      .addCase(analyzeResumeText.fulfilled, (state, action) => {
        state.loading = false;
        state.progress = 100;
        state.result = action.payload;
      })
      .addCase(analyzeResumeText.rejected, (state, action) => {
        failPipeline(state, action.payload);
      });
  },
});

export const { clearResumeResult, updatePipelineProgress } = resumeSlice.actions;
export default resumeSlice.reducer;
