import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  IconButton,
  Fade,
  InputAdornment
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { PersonAdd, Close, Email, Lock, Person, Visibility, VisibilityOff } from '@mui/icons-material';

import { useSnackbar } from 'notistack';
import { adminApi } from '../services/adminApi';
import type { ClaimOfficerRequest } from '../services/adminApi';
import { CLAIM_OFFICER_VALIDATION_SCHEMA } from '../../../lib/validation';
import { useValidatedForm } from '../../../lib/hooks/useValidatedForm';

interface AddClaimOfficerFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddClaimOfficerForm = ({ open, onClose, onSuccess }: AddClaimOfficerFormProps) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const { register, handleValidatedSubmit, formState: { errors }, reset } = useValidatedForm<ClaimOfficerRequest>();

  const handleClose = () => {
    reset();
    setError('');
    setShowPassword(false);
    onClose();
  };

  const onSubmit = async (data: ClaimOfficerRequest) => {
    if (loading) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      await adminApi.addClaimOfficer(data);
      enqueueSnackbar('Claim Officer created successfully', { variant: 'success' });
      handleClose();
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create claim officer';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      slotProps={{
        paper: {
          sx: { 
            borderRadius: 3,
            minHeight: '60vh'
          }
        }
      }}
    >
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>

        <Box sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          p: 4,
          position: 'relative'
        }}>
          <IconButton
            onClick={handleClose}
            sx={{ 
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <Close />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <PersonAdd sx={{ fontSize: 32 }} />
            <Typography variant="h4" fontWeight="600">
              Add New Claim Officer
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Create a new claim officer account to handle insurance claim reviews
          </Typography>
        </Box>

        <DialogContent sx={{ p: 4 }}>
          <Fade in={!!error} timeout={300}>
            <Box>
              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </Fade>

          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              bgcolor: 'grey.50', 
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'grey.200'
            }}
          >
            <Stack spacing={4}>

              <Box>
                <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person /> Personal Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="First Name"
                      variant="outlined"
                      placeholder="Enter first name"
                      {...register('firstName', CLAIM_OFFICER_VALIDATION_SCHEMA.firstName)}
                      error={!!errors.firstName}
                      helperText={errors.firstName?.message}
                      disabled={loading}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          bgcolor: 'white'
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      variant="outlined"
                      placeholder="Enter last name"
                      {...register('lastName', CLAIM_OFFICER_VALIDATION_SCHEMA.lastName)}
                      error={!!errors.lastName}
                      helperText={errors.lastName?.message}
                      disabled={loading}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          bgcolor: 'white'
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>


              <Box>
                <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Lock /> Account Credentials
                </Typography>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    variant="outlined"
                    placeholder="Enter professional email address"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email color="action" />
                          </InputAdornment>
                        )
                      }
                    }}
                    {...register('email', CLAIM_OFFICER_VALIDATION_SCHEMA.email)}
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: 'white'
                      }
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    variant="outlined"
                    placeholder="Create a secure password"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            disabled={loading}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    {...register('password', CLAIM_OFFICER_VALIDATION_SCHEMA.password)}
                    error={!!errors.password}
                    helperText={errors.password?.message || 'Minimum 8 characters required'}
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: 'white'
                      }
                    }}
                  />
                </Stack>
              </Box>
            </Stack>
          </Paper>


          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button 
              onClick={handleClose}
              variant="outlined"
              disabled={loading}
              sx={{ 
                minWidth: 120,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleValidatedSubmit(onSubmit)}
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PersonAdd />}
              sx={{ 
                minWidth: 160,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)'
                }
              }}
            >
              {loading ? 'Creating Officer...' : 'Create Officer'}
            </Button>
          </Box>
        </DialogContent>
      </Box>
    </Dialog>
  );
};