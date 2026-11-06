import React from 'react';
import { Box } from '@mui/material';
import { Navbar } from '../components/Navbar';
import { ResumePage } from './ResumePage';

export const DashboardPage: React.FC = () => {


  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 8 }}>
      <Navbar />
      <ResumePage />
    </Box>
  );
};
