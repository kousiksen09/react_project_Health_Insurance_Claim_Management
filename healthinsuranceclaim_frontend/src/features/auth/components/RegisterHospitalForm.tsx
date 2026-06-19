import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { authApi } from '../services/authApi';
import { ROUTES } from '../../../shared/utils/constants';
import { REGISTER_HOSPITAL_VALIDATION_SCHEMA } from '../../../lib/validation';
import { useValidatedForm } from '../../../lib/hooks/useValidatedForm';
import { useSnackbar } from 'notistack';
import type { RegisterHospitalRequest } from '../types';

export const RegisterHospitalForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { register, handleValidatedSubmit, formState: { errors } } = useValidatedForm<RegisterHospitalRequest>();

  const onSubmit = async (data: RegisterHospitalRequest) => {
    try {
      setLoading(true);
      setError('');
      await authApi.registerHospital(data);
      
      enqueueSnackbar('Registration successful! Please login with your credentials.', { variant: 'success' });
      navigate(ROUTES.LOGIN, { 
        state: { message: 'Registration successful! Please login with your credentials.' }
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'radial-gradient(ellipse at top, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%)',
      display: 'flex'
    }}>
      {/* Left Half - Real Hospital Image */}
      <Box sx={{ 
        flex: 1, 
        backgroundImage: 'url(https://images.unsplash.com/photo-1538108149393-fbbd81895907?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80)',
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
          background: 'linear-gradient(45deg, rgba(127, 179, 211, 0.6) 0%, rgba(168, 216, 234, 0.4) 100%)',
          zIndex: 1
        }
      }}>
        <Box sx={{ textAlign: 'center', color: 'white', p: 4, position: 'relative', zIndex: 2 }}>
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
            Healthcare Partner
          </Typography>
          <Typography variant="h4" gutterBottom>
            Hospital Registration
          </Typography>
          <Typography variant="h6" sx={{ mt: 3, opacity: 0.9 }}>
            Join our network as a healthcare provider to streamline claim processing
          </Typography>
        </Box>
      </Box>
      
      {/* Right Half - Registration Form */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 4,
        overflow: 'auto'
      }}>
        <Paper elevation={3} sx={{ padding: 4, width: '100%', maxWidth: 500 }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Hospital Registration
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleValidatedSubmit(onSubmit)} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  id="firstName"
                  label="Hospital Name (First Part)"
                  placeholder="e.g., City General"
                  autoFocus
                  {...register('firstName', REGISTER_HOSPITAL_VALIDATION_SCHEMA.firstName)}
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  id="lastName"
                  label="Hospital Name (Second Part)"
                  placeholder="e.g., Medical Center"
                  {...register('lastName', REGISTER_HOSPITAL_VALIDATION_SCHEMA.lastName)}
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  autoComplete="email"
                  {...register('email', REGISTER_HOSPITAL_VALIDATION_SCHEMA.email)}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  {...register('password', REGISTER_HOSPITAL_VALIDATION_SCHEMA.password)}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  id="licenseNumber"
                  label="License Number"
                  {...register('licenseNumber', REGISTER_HOSPITAL_VALIDATION_SCHEMA.licenseNumber)}
                  error={!!errors.licenseNumber}
                  helperText={errors.licenseNumber?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  required
                  fullWidth
                  id="phone"
                  label="Phone Number"
                  {...register('phone', REGISTER_HOSPITAL_VALIDATION_SCHEMA.phone)}
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  required
                  fullWidth
                  id="address"
                  label="Address"
                  multiline
                  rows={3}
                  {...register('address', REGISTER_HOSPITAL_VALIDATION_SCHEMA.address)}
                  error={!!errors.address}
                  helperText={errors.address?.message}
                />
              </Grid>
            </Grid>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Register'}
            </Button>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              Already have an account? <Link to={ROUTES.LOGIN}>Sign in</Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};