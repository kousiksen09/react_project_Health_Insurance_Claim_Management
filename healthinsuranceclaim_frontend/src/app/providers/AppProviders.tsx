import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { SnackbarProvider } from 'notistack';
import { AuthProvider } from '../../shared/hooks/useAuth';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2c5aa0', light: '#5a7bc8', dark: '#1e3f73' },
    secondary: { main: '#00acc1', light: '#4dd0e1', dark: '#00838f' },
    background: { default: '#f8fffe', paper: '#ffffff' },
    text: { primary: '#263238', secondary: '#546e7a' },
    success: { main: '#4caf50' },
    warning: { main: '#ff9800' },
    error: { main: '#f44336' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, fontSize: '1.875rem' },
    h6: { fontWeight: 600, fontSize: '1.125rem' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
        },
      },
    },
  },
});

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider 
        maxSnack={3} 
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        dense
        preventDuplicate
      >
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <AuthProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              {children}
            </BrowserRouter>
          </AuthProvider>
        </LocalizationProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
};