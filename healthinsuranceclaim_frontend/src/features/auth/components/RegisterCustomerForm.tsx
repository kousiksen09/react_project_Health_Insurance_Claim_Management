import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { authApi } from '../services/authApi';
import { ROUTES } from '../../../shared/utils/constants';
import { REGISTER_CUSTOMER_VALIDATION_SCHEMA } from '../../../lib/validation';
import { useValidatedForm } from '../../../lib/hooks/useValidatedForm';

interface RegisterCustomerRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  address: string;
}

export const RegisterCustomerForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<dayjs.Dayjs | null>(null);
  const navigate = useNavigate();

  const { register, handleValidatedSubmit, formState: { errors }, setValue } = useValidatedForm<RegisterCustomerRequest>();

  const onSubmit = async (data: RegisterCustomerRequest) => {
    try {
      setLoading(true);
      setError('');
      const result = await authApi.registerCustomer(data);
      
      // Check if response indicates failure
      if (result && typeof result === 'object' && 'success' in result && result.success === false) {
        setError(result.message || 'Registration failed');
        return;
      }
      
      // Registration successful, redirect to login
      navigate(ROUTES.LOGIN, { 
        state: { message: 'Registration successful! Please login with your credentials.' }
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    setDateOfBirth(date);
    if (date) setValue('dateOfBirth', date.format('YYYY-MM-DD'));
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'radial-gradient(ellipse at top, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%)',
      display: 'flex'
    }}>
      {/* Left Half - Real Healthcare Image */}
      <Box sx={{ 
        flex: 1, 
        backgroundImage: 'url(https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80)',
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
            Join Our Community
          </Typography>
          <Typography variant="h4" gutterBottom>
            Customer Registration
          </Typography>
          <Typography variant="h6" sx={{ mt: 3, opacity: 0.9 }}>
            Register as a customer to manage your health insurance claims easily
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
            Customer Registration
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleValidatedSubmit(onSubmit)} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="firstName"
                  label="First Name"
                  autoFocus
                  {...register('firstName', REGISTER_CUSTOMER_VALIDATION_SCHEMA.firstName)}
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="lastName"
                  label="Last Name"
                  {...register('lastName', REGISTER_CUSTOMER_VALIDATION_SCHEMA.lastName)}
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  autoComplete="email"
                  {...register('email', REGISTER_CUSTOMER_VALIDATION_SCHEMA.email)}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  {...register('password', REGISTER_CUSTOMER_VALIDATION_SCHEMA.password)}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Date of Birth"
                    value={dateOfBirth}
                    onChange={handleDateChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !!errors.dateOfBirth,
                        helperText: errors.dateOfBirth?.message
                      },
                      popper: {
                        disablePortal: true
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="phone"
                  label="Phone Number"
                  {...register('phone', REGISTER_CUSTOMER_VALIDATION_SCHEMA.phone)}
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="address"
                  label="Address"
                  multiline
                  rows={3}
                  {...register('address', REGISTER_CUSTOMER_VALIDATION_SCHEMA.address)}
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