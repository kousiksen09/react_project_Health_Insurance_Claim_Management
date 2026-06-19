import { createTheme } from '@mui/material/styles';


export const THEME_CONSTANTS = {
  gradients: {
    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 30%, #81c784 100%)',
    primary: 'linear-gradient(45deg, #2c5aa0 30%, #00acc1 90%)',
    primaryHover: 'linear-gradient(45deg, #1e3f73 30%, #00838f 90%)',
    overlay: 'linear-gradient(45deg, rgba(44, 90, 160, 0.8) 0%, rgba(0, 172, 193, 0.6) 100%)'
  },
  glassmorphism: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.2)'
  },
  shadows: {
    primary: '0 4px 15px rgba(44, 90, 160, 0.3)',
    primaryHover: '0 6px 20px rgba(44, 90, 160, 0.4)',
    card: '0 12px 40px rgba(44, 90, 160, 0.2)'
  }
};

export const enhancedTheme = createTheme({
  palette: {
    primary: {
      main: '#2c5aa0',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#00acc1',
      light: '#4dd0e1',
      dark: '#00838f',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    error: {
      main: '#f44336',
      light: '#ef5350',
      dark: '#d32f2f',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      fontSize: '3rem',
    },
    h2: {
      fontWeight: 800,
      fontSize: '2.5rem',
    },
    h3: {
      fontWeight: 800,
      fontSize: '2rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.5rem',
    },
    h6: {
      fontWeight: 300,
      fontSize: '1.25rem',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          '&.gradient-button': {
            background: THEME_CONSTANTS.gradients.primary,
            boxShadow: THEME_CONSTANTS.shadows.primary,
            '&:hover': {
              background: THEME_CONSTANTS.gradients.primaryHover,
              boxShadow: THEME_CONSTANTS.shadows.primaryHover,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '&.glassmorphism': {
            ...THEME_CONSTANTS.glassmorphism,
            borderRadius: 12,
            boxShadow: 'none',
          },
        },
      },
    },
  },
});