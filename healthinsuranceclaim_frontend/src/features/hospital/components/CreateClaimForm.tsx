import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { hospitalApi } from '../services/hospitalApi';
import { ROUTES } from '../../../shared/utils/constants';

interface CreateClaimRequest {
  policyNumber: string;
  claimAmount: number;
  treatmentDetails: string;
  treatmentDate: string;
  documents: File[];
  documentTypes: string[];
}

import { DOCUMENT_TYPE_OPTIONS } from '../../../shared/utils/documentTypes';

export const CreateClaimForm = () => {
  const [loading, setLoading] = useState(false);
  const [treatmentDate, setTreatmentDate] = useState<dayjs.Dayjs | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [policyData, setPolicyData] = useState<any>(null);
  const [policyVerified, setPolicyVerified] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<Omit<CreateClaimRequest, 'documents' | 'documentTypes'>>();
  const policyNumber = watch('policyNumber');

  const handleVerifyPolicy = async () => {
    if (!policyNumber?.trim()) {
      enqueueSnackbar('Please enter a policy number', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      const data = await hospitalApi.getCustomerPolicy(policyNumber);
      console.log('Policy data received:', data);
      setPolicyData(data);
      setPolicyVerified(true);
      enqueueSnackbar('Policy verified successfully!', { variant: 'success' });
    } catch (error) {
      setPolicyData(null);
      setPolicyVerified(false);
      enqueueSnackbar('Policy not found or invalid', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: Omit<CreateClaimRequest, 'documents' | 'documentTypes'>) => {
    if (!policyVerified) {
      enqueueSnackbar('Please verify the policy number first', { variant: 'error' });
      return;
    }

    if (documents.length === 0) {
      enqueueSnackbar('Please upload at least one document', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      
      const claimData: CreateClaimRequest = {
        ...data,
        documents,
        documentTypes: selectedDocTypes
      };

      await hospitalApi.createClaim(claimData);
      enqueueSnackbar('Claim submitted successfully!', { variant: 'success' });
      navigate(ROUTES.CLAIMS);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create claim', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    setTreatmentDate(date);
    if (date) setValue('treatmentDate', date.format('YYYY-MM-DD'));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setDocuments(files);
    setSelectedDocTypes(files.map(() => DOCUMENT_TYPE_OPTIONS[0].value));
  };

  const handleDocTypeChange = (index: number, type: string) => {
    const newTypes = [...selectedDocTypes];
    newTypes[index] = type;
    setSelectedDocTypes(newTypes);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Create New Claim
      </Typography>

      <Paper sx={{ p: 4 }}>


        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'start' }}>
                <TextField
                  required
                  fullWidth
                  id="policyNumber"
                  label="Policy Number"
                  {...register('policyNumber', { required: 'Policy number is required' })}
                  error={!!errors.policyNumber}
                  helperText={errors.policyNumber?.message}
                  onChange={(e) => {
                    register('policyNumber').onChange(e);
                    setPolicyVerified(false);
                    setPolicyData(null);
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleVerifyPolicy}
                  disabled={loading || !policyNumber}
                  sx={{ mt: 0.5, minWidth: 120 }}
                >
                  Verify
                </Button>
              </Box>
              {policyData && policyVerified && (
                <Card sx={{ mt: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="body2">
                      ✓ Policy verified - Customer: {policyData.customerName} | Coverage: ₹{policyData.coverageAmount?.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Policy: {policyData.policyName} | Premium: {(policyData.premiumAmount || policyData.premium) ? `₹${(policyData.premiumAmount || policyData.premium).toLocaleString()}` : 'N/A'} | Start: {policyData.purchaseDate ? new Date(policyData.purchaseDate).toLocaleDateString() : 'N/A'} | End: {policyData.expiryDate ? new Date(policyData.expiryDate).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                id="claimAmount"
                label="Claim Amount"
                type="number"
                {...register('claimAmount', { 
                  required: 'Claim amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than 0' }
                })}
                error={!!errors.claimAmount}
                helperText={errors.claimAmount?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Treatment Date"
                  value={treatmentDate}
                  onChange={handleDateChange}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: !!errors.treatmentDate,
                      helperText: errors.treatmentDate?.message
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="treatmentDetails"
                label="Treatment Details"
                multiline
                rows={4}
                {...register('treatmentDetails', { required: 'Treatment details are required' })}
                error={!!errors.treatmentDetails}
                helperText={errors.treatmentDetails?.message}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Upload Documents
              </Typography>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
                style={{ marginBottom: '16px' }}
              />
              {documents.map((file, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Chip label={file.name} />
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Document Type</InputLabel>
                    <Select
                      value={selectedDocTypes[index] || ''}
                      label="Document Type"
                      onChange={(e) => handleDocTypeChange(index, e.target.value)}
                    >
                      {DOCUMENT_TYPE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              ))}
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Submit Claim'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(ROUTES.CLAIMS)}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};