import React from 'react';
import { CssBaseline, ThemeProvider, Box } from '@mui/material';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './store';
import { appTheme } from './theme/theme';
import { Navbar } from './components/common/Navbar';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ResumeAnalyzerPage } from './components/resume-analyzer/ResumeAnalyzerPage';
import { JobSearchPage } from './components/job-search/JobSearchPage';

export const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <BrowserRouter>
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <Box component="main" sx={{ flexGrow: 1 }}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/resume-analyzer" element={<ResumeAnalyzerPage />} />
                <Route path="/resume" element={<Navigate to="/resume-analyzer" replace />} />
                <Route path="/job-search" element={<JobSearchPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Box>
          </Box>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
