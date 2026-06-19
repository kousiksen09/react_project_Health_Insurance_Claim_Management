import { useState, useEffect } from 'react';
import { Box, Button, Dialog, DialogContent, TextField, FormControl, InputLabel, Select, MenuItem, Alert, Typography, Paper, Stack, IconButton, Fade, InputAdornment, CircularProgress } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Close, Policy as PolicyIcon, CurrencyRupee, Schedule } from '@mui/icons-material';
import { adminApi, type Policy } from '../services/adminApi';

interface PolicyFormData {
  name: string;
  description: string;
  premium: string;
  coverageAmount: string;
  durationMonths: string;
  policyType: number;
}

interface AddPolicyFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  policy?: Policy | null;
  isEditing?: boolean;
}

export const AddPolicyForm = ({ open, onClose, onSuccess, policy, isEditing = false }: AddPolicyFormProps) => {
  const [formData, setFormData] = useState<PolicyFormData>({
    name: '',
    description: '',
    premium: '',
    coverageAmount: '',
    durationMonths: '',
    policyType: 1
  });

  useEffect(() => {
    if (policy && isEditing) {
      setFormData({
        name: policy.name,
        description: policy.description,
        premium: policy.premium.toString(),
        coverageAmount: policy.coverageAmount.toString(),
        durationMonths: policy.durationMonths.toString(),
        policyType: policy.policyType
      });
    } else {
      setFormData({
        name: '',
        description: '',
        premium: '',
        coverageAmount: '',
        durationMonths: '',
        policyType: 1
      });
    }
    setError('');
    setFieldErrors({});
  }, [policy, isEditing, open]);
  const [error, setError] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [submitting, setSubmitting] = useState(false);

  const policyTypes = [
    { value: 1, label: 'Individual' },
    { value: 2, label: 'Family' },
    { value: 3, label: 'Senior' }
  ];

  const fieldStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      bgcolor: 'white'
    },
    '& input[type=number]': {
      '-moz-appearance': 'textfield'
    },
    '& input[type=number]::-webkit-outer-spin-button': {
      '-webkit-appearance': 'none',
      margin: 0
    },
    '& input[type=number]::-webkit-inner-spin-button': {
      '-webkit-appearance': 'none',
      margin: 0
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Policy name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Policy name must be at least 3 characters';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }
    
    const premium = parseFloat(formData.premium);
    if (!formData.premium) {
      errors.premium = 'Premium amount is required';
    } else if (isNaN(premium) || premium <= 0) {
      errors.premium = 'Premium must be a positive number';
    } else if (premium < 100) {
      errors.premium = 'Premium must be at least ₹100';
    }
    
    const coverageAmount = parseFloat(formData.coverageAmount);
    if (!formData.coverageAmount) {
      errors.coverageAmount = 'Coverage amount is required';
    } else if (isNaN(coverageAmount) || coverageAmount <= 0) {
      errors.coverageAmount = 'Coverage amount must be a positive number';
    } else if (coverageAmount < 10000) {
      errors.coverageAmount = 'Coverage amount must be at least ₹10,000';
    }
    
    const durationMonths = parseInt(formData.durationMonths);
    if (!formData.durationMonths) {
      errors.durationMonths = 'Duration is required';
    } else if (isNaN(durationMonths) || durationMonths <= 0) {
      errors.durationMonths = 'Duration must be a positive number';
    } else if (durationMonths < 1 || durationMonths > 120) {
      errors.durationMonths = 'Duration must be between 1 and 120 months';
    }
    
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setError('Please fix the errors below');
      return;
    }
    
    const premium = parseFloat(formData.premium);
    const coverageAmount = parseFloat(formData.coverageAmount);
    const durationMonths = parseInt(formData.durationMonths);
    
    const submitData = {
      name: formData.name,
      description: formData.description,
      premium,
      coverageAmount,
      durationMonths,
      policyType: formData.policyType
    };

    setSubmitting(true);
    try {
      if (isEditing && policy) {
        await adminApi.updatePolicy(policy.id, submitData);
      } else {
        await adminApi.createPolicy(submitData);
      }
      onSuccess();
    } catch (error) {
      setError(`Failed to ${isEditing ? 'update' : 'create'} policy`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof PolicyFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      slotProps={{
        paper: {
          sx: { 
            borderRadius: 3,
            maxHeight: '90vh',
            height: 'auto'
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
            onClick={onClose}
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
            <PolicyIcon sx={{ fontSize: 32 }} />
            <Typography variant="h4" fontWeight="600">
              {isEditing ? 'Edit Policy' : 'Add New Policy'}
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            {isEditing ? 'Update policy details and coverage information' : 'Create a new insurance policy with coverage details'}
          </Typography>
        </Box>

        <DialogContent sx={{ p: 4, maxHeight: '70vh', overflow: 'auto' }}>
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
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Policy Name"
                    variant="outlined"
                    placeholder="Enter policy name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    error={!!fieldErrors.name}
                    helperText={fieldErrors.name}
                    disabled={submitting}
                    sx={fieldStyles}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Description"
                    variant="outlined"
                    placeholder="Enter policy description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    error={!!fieldErrors.description}
                    helperText={fieldErrors.description}
                    disabled={submitting}
                    multiline
                    rows={3}
                    sx={fieldStyles}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Policy Type</InputLabel>
                    <Select
                      value={formData.policyType}
                      onChange={(e) => handleInputChange('policyType', Number(e.target.value))}
                      label="Policy Type"
                      disabled={submitting}
                      sx={{
                        borderRadius: 2,
                        bgcolor: 'white'
                      }}
                    >
                      {policyTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Box>
                <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CurrencyRupee /> Financial Details
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Premium Amount"
                      type="number"
                      variant="outlined"
                      placeholder="Enter premium amount"
                      value={formData.premium}
                      onChange={(e) => handleInputChange('premium', e.target.value)}
                      error={!!fieldErrors.premium}
                      helperText={fieldErrors.premium}
                      disabled={submitting}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              ₹
                            </InputAdornment>
                          )
                        }
                      }}
                      sx={fieldStyles}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Coverage Amount"
                      type="number"
                      variant="outlined"
                      placeholder="Enter coverage amount"
                      value={formData.coverageAmount}
                      onChange={(e) => handleInputChange('coverageAmount', e.target.value)}
                      error={!!fieldErrors.coverageAmount}
                      helperText={fieldErrors.coverageAmount}
                      disabled={submitting}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              ₹
                            </InputAdornment>
                          )
                        }
                      }}
                      sx={fieldStyles}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule /> Duration
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Duration (Months)"
                      type="number"
                      variant="outlined"
                      placeholder="Enter duration in months"
                      value={formData.durationMonths}
                      onChange={(e) => handleInputChange('durationMonths', e.target.value)}
                      error={!!fieldErrors.durationMonths}
                      helperText={fieldErrors.durationMonths || 'Duration between 1 and 120 months'}
                      disabled={submitting}
                      sx={fieldStyles}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button 
              onClick={onClose}
              variant="outlined"
              disabled={submitting}
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
              onClick={handleSubmit}
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <PolicyIcon />}
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
              {submitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Policy' : 'Create Policy')}
            </Button>
          </Box>
        </DialogContent>
      </Box>
    </Dialog>
  );
};