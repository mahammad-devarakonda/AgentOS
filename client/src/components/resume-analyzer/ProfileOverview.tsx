import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import {
  Person as PersonIcon,
  WorkOutlined as WorkOutlineIcon,
  School as SchoolIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import type { ExtractedResumeProfile } from '../../types/resume';

interface ProfileOverviewProps {
  profile: ExtractedResumeProfile;
}

export const ProfileOverview: React.FC<ProfileOverviewProps> = ({ profile }) => {
  const { contact, skills, work_experience, education, projects } = profile;

  return (
    <Card elevation={0}>
      <CardContent sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <PersonIcon color="primary" fontSize="small" /> {contact.full_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {[contact.email, contact.phone, contact.location].filter(Boolean).join(' • ')}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={`${profile.total_years_experience} Yrs Experience`}
            variant="outlined"
          />
        </Stack>

        {profile.professional_summary && (
          <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
            {profile.professional_summary}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.8 }}
        >
          <CodeIcon fontSize="small" color="primary" /> Extracted Skills
        </Typography>

        <Stack spacing={1.5}>
          {skills.technical_skills.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Technical Skills
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                {skills.technical_skills.map((skill, idx) => (
                  <Chip key={idx} label={skill} size="small" sx={{ bgcolor: '#f1f5f9' }} />
                ))}
              </Box>
            </Box>
          )}

          {skills.tools_and_frameworks.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Tools & Frameworks
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                {skills.tools_and_frameworks.map((tool, idx) => (
                  <Chip key={idx} label={tool} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}

          {skills.soft_skills.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Soft Skills
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                {skills.soft_skills.map((soft, idx) => (
                  <Chip key={idx} label={soft} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
        </Stack>

        {work_experience.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.8 }}
            >
              <WorkOutlineIcon fontSize="small" color="primary" /> Work Experience (
              {work_experience.length})
            </Typography>
            <Stack spacing={2}>
              {work_experience.map((exp, idx) => (
                <Box key={idx} sx={{ pl: 1.5, borderLeft: '2px solid #cbd5e1' }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {exp.role} — {exp.company}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {exp.duration}
                    </Typography>
                  </Stack>
                  <Stack spacing={0.4} sx={{ mt: 0.5 }}>
                    {exp.highlights.map((bullet, bIdx) => (
                      <Typography key={bIdx} variant="body2" color="text.secondary">
                        • {bullet}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </>
        )}

        {projects.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Projects ({projects.length})
            </Typography>
            <Stack spacing={1.5}>
              {projects.map((proj, idx) => (
                <Box key={idx}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {proj.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {proj.description}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {proj.technologies.map((tech, tIdx) => (
                      <Chip key={tIdx} label={tech} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              ))}
            </Stack>
          </>
        )}

        {education.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}
            >
              <SchoolIcon fontSize="small" color="primary" /> Education
            </Typography>
            <Stack spacing={1}>
              {education.map((edu, idx) => (
                <Box key={idx}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {edu.degree}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {edu.institution} {edu.graduation_year ? `• ${edu.graduation_year}` : ''}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
};
