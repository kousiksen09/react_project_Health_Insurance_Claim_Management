import { Box, Typography, Container, Paper } from '@mui/material';
import type { ReactNode } from 'react';
import { THEME_CONSTANTS } from './theme';

interface ManagementPageLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export const ManagementPageLayout = ({ title, subtitle, children }: ManagementPageLayoutProps) => {
  return (
    <Box sx={{ 
      position: 'fixed',
      top: '60px',
      left: '240px',
      right: 0,
      bottom: 0,
      background: THEME_CONSTANTS.gradients.background,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box sx={{ 
        flexShrink: 0,
        py: 3,
        px: 4,
        textAlign: 'center'
      }}>
        <Typography 
          variant="h3" 
          gutterBottom 
          sx={{ 
            fontWeight: 800, 
            background: THEME_CONSTANTS.gradients.primary,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1
          }}
        >
          {title}
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 300 }}>
          {subtitle}
        </Typography>
      </Box>
      
      <Box sx={{ 
        flex: 1,
        px: 4,
        pb: 4,
        overflow: 'hidden',
        display: 'flex'
      }}>
        <Container maxWidth="lg" sx={{ 
          flex: 1,
          display: 'flex',
          overflow: 'hidden'
        }}>
          <Paper 
            elevation={0}
            sx={{ 
              ...THEME_CONSTANTS.glassmorphism,
              borderRadius: 3,
              p: 3,
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {children}
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};