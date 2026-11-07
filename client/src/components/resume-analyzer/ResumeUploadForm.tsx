import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  AutoAwesome as AutoAwesomeIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';

interface ResumeUploadFormProps {
  loading: boolean;
  error: string | null;
  onSubmitFile: (file: File, targetRole: string, jobDescription: string) => void;
  onSubmitText: (rawText: string, targetRole: string, jobDescription: string) => void;
}

export const ResumeUploadForm: React.FC<ResumeUploadFormProps> = ({
  loading,
  error,
  onSubmitFile,
  onSubmitText,
}) => {
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tabIndex === 0 && selectedFile) {
      onSubmitFile(selectedFile, targetRole, jobDescription);
    } else if (tabIndex === 1 && rawText.trim().length >= 20) {
      onSubmitText(rawText, targetRole, jobDescription);
    }
  };

  const isSubmitDisabled =
    loading ||
    (tabIndex === 0 && !selectedFile) ||
    (tabIndex === 1 && rawText.trim().length < 20);

  return (
    <Card elevation={4} sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Resume Processing Input
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload a PDF/DOCX resume or paste raw text to trigger the LangGraph + Groq multi-agent pipeline.
        </Typography>

        <Tabs
          value={tabIndex}
          onChange={(_, newValue) => setTabIndex(newValue)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<CloudUploadIcon />} iconPosition="start" label="Upload File (PDF / DOCX)" />
          <Tab icon={<DescriptionIcon />} iconPosition="start" label="Paste Resume Text" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            {tabIndex === 0 ? (
              <Box
                sx={{
                  border: '2px dashed rgba(99, 102, 241, 0.5)',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  bgcolor: 'rgba(99, 102, 241, 0.04)',
                }}
              >
                <input
                  accept=".pdf,.docx,.txt"
                  style={{ display: 'none' }}
                  id="resume-file-upload"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="resume-file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    sx={{ mb: 1 }}
                  >
                    Select Resume (PDF, DOCX, TXT)
                  </Button>
                </label>
                <Typography variant="body2" color="text.secondary">
                  {selectedFile
                    ? `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
                    : 'No file selected yet'}
                </Typography>
              </Box>
            ) : (
              <TextField
                label="Paste Full Resume Text"
                placeholder="Paste candidate resume content here..."
                multiline
                minRows={7}
                fullWidth
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
            )}

            <TextField
              label="Target Role (Optional)"
              placeholder="e.g., Senior AI / Backend Engineer"
              fullWidth
              size="small"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />

            <TextField
              label="Target Job Description (Optional)"
              placeholder="Paste the job description to compute ATS keyword match & skill gaps..."
              multiline
              minRows={3}
              fullWidth
              size="small"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitDisabled}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
              sx={{ py: 1.4, fontWeight: 600 }}
            >
              {loading ? 'Running LangGraph Agents (Extractor -> Analyzer -> Enhancer)...' : 'Run Multi-Agent Analysis'}
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};
