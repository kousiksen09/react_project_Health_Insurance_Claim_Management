import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { useLogin } from '../hooks/useLogin';
import { ROUTES } from '../../../shared/utils/constants';
import { LOGIN_VALIDATION_SCHEMA } from '../../../lib/validation';
import { useValidatedForm } from '../../../lib/hooks/useValidatedForm';

interface LoginRequest {
  email: string;
  password: string;
}

export const LoginForm = () => {
  const { login, loading, error } = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message;

  const { register, handleValidatedSubmit, formState: { errors } } = useValidatedForm<LoginRequest>();

  const onSubmit = async (data: LoginRequest) => {
    try {
      await login(data);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      // Error handled in hook
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 30%, #81c784 100%)',
      display: 'flex'
    }}>
      {/* Left Half - Hero Section with Real Image */}
      <Box sx={{ 
        flex: 1, 
        backgroundImage: 'url(https://images.unsplash.com/photo-1584515933487-779824d29309?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(45deg, rgba(44, 90, 160, 0.8) 0%, rgba(0, 172, 193, 0.6) 100%)',
          zIndex: 1
        }
      }}>
        <Box sx={{ 
          textAlign: 'center', 
          color: 'white', 
          maxWidth: 500,
          position: 'relative',
          zIndex: 2,
          p: 4
        }}>
          <Typography variant="h2" gutterBottom sx={{ fontWeight: 800, mb: 2 }}>
            HealthCare+
          </Typography>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 300, mb: 4 }}>
            Smart Claims Management
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, lineHeight: 1.6 }}>
            Experience seamless healthcare claim processing with our intelligent platform designed for modern healthcare providers
          </Typography>
        </Box>
      </Box>
      
      {/* Right Half - Login Form */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <Paper elevation={0} sx={{ 
          padding: 6, 
          width: '100%', 
          maxWidth: 420,
          backgroundColor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
              Welcome Back
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Sign in to continue to your dashboard
            </Typography>
          </Box>

          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleValidatedSubmit(onSubmit)} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              autoComplete="email"
              autoFocus
              {...register('email', LOGIN_VALIDATION_SCHEMA.email)}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              {...register('password', LOGIN_VALIDATION_SCHEMA.password)}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Button 
              type="submit" 
              fullWidth 
              variant="contained" 
              size="large"
              sx={{ 
                mt: 3, 
                mb: 2, 
                py: 1.5,
                background: 'linear-gradient(45deg, #2c5aa0 30%, #00acc1 90%)',
                boxShadow: '0 4px 15px rgba(44, 90, 160, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1e3f73 30%, #00838f 90%)',
                  boxShadow: '0 6px 20px rgba(44, 90, 160, 0.4)',
                }
              }} 
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" align="center">Don't have an account?</Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 1 }}>
              <Button component={Link} to={ROUTES.REGISTER_CUSTOMER} variant="outlined" size="small">
                Register as Customer
              </Button>
              <Button component={Link} to={ROUTES.REGISTER_HOSPITAL} variant="outlined" size="small">
                Register as Hospital
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};