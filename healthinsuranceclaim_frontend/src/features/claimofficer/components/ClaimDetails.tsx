import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { DataGrid } from '@mui/x-data-grid';
import { claimOfficerApi } from '../services/claimOfficerApi';

interface Claim {
  id: number;
  claimNumber: string;
  claimAmount: number;
  treatmentDetails: string;
  treatmentDate: string;
  submissionDate: string;
  status: number;
  rejectionReason?: string;
  documentRequest?: string;
  approvedAmount?: number;
  processedDate?: string;
  customerName: string;
  hospitalName: string;
  claimOfficerName?: string;
}

export const ClaimDetails = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [documentRequest, setDocumentRequest] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllClaims();
  }, []);

  const fetchAllClaims = async () => {
    try {
      const claimsData = await claimOfficerApi.getPendingClaims() as Claim[];
      setClaims(claimsData);
    } catch (error) {
      setError('Failed to fetch claims');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: number) => {
    const statusMap = {
      0: 'Submitted',
      1: 'Under Review',
      2: 'Approved',
      3: 'Rejected',
      4: 'Documents Requested',
      5: 'Paid'
    };
    return statusMap[status as keyof typeof statusMap] || 'Unknown';
  };

  const getStatusColor = (status: number) => {
    const colorMap = {
      0: 'info',
      1: 'warning',
      2: 'success',
      3: 'error',
      4: 'secondary',
      5: 'success'
    };
    return colorMap[status as keyof typeof colorMap] || 'default';
  };

  const handleProcessClaim = async (claim: Claim) => {
    setSelectedClaim(claim);
    setRejectionReason('');
    setDocumentRequest('');
    setProcessStatus('');
    
    // Get auto-calculated amount
    try {
      const result = await claimOfficerApi.calculateAmount(claim.id, claim.claimAmount) as { approvedAmount?: number };
      setCalculatedAmount(result.approvedAmount || claim.claimAmount);
    } catch (error) {
      setCalculatedAmount(claim.claimAmount);
    }
    
    setProcessDialogOpen(true);
  };

  const handleProcessSubmit = async () => {
    if (!selectedClaim || !processStatus) return;

    try {
      switch (processStatus) {
        case 'approve':
          await claimOfficerApi.approveClaim(selectedClaim.id);
          break;
        case 'reject':
          if (!rejectionReason.trim()) {
            setError('Rejection reason is required');
            return;
          }
          await claimOfficerApi.rejectClaim(selectedClaim.id, rejectionReason);
          break;
        case 'request-documents':
          if (!documentRequest.trim()) {
            setError('Document request message is required');
            return;
          }
          await claimOfficerApi.requestDocuments(selectedClaim.id, documentRequest);
          break;
        case 'process-payment':
          await claimOfficerApi.processPayment(selectedClaim.id);
          break;
      }
      setProcessDialogOpen(false);
      setSelectedClaim(null);
      fetchAllClaims();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process claim';
      setError(errorMessage);
    }
  };

  const columns = [
    { field: 'claimNumber', headerName: 'Claim Number', width: 150 },
    { field: 'customerName', headerName: 'Customer', width: 200 },
    { field: 'hospitalName', headerName: 'Hospital', width: 200 },
    { field: 'claimAmount', headerName: 'Requested', width: 120, valueFormatter: (params: any) => `₹${params?.value?.toLocaleString() || 0}` },
    { field: 'approvedAmount', headerName: 'Approved', width: 120, valueFormatter: (params: any) => params?.value ? `₹${params.value.toLocaleString()}` : '-' },
    { field: 'treatmentDate', headerName: 'Treatment Date', width: 130, valueFormatter: (params: any) => new Date(params?.value).toLocaleDateString() },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 150,
      renderCell: (params: any) => (
        <Chip 
          label={getStatusLabel(params.value)} 
          color={getStatusColor(params.value) as any}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params: any) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => handleProcessClaim(params.row)}
          disabled={params.row.status === 3 || params.row.status === 5}
        >
          Process
        </Button>
      )
    }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Pending Claims
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={claims}
          columns={columns}
          loading={loading}
          hideFooter
        />
      </Paper>

      <Dialog open={processDialogOpen} onClose={() => setProcessDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Process Claim: {selectedClaim?.claimNumber}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Action</InputLabel>
                  <Select
                    value={processStatus}
                    onChange={(e) => setProcessStatus(e.target.value)}
                    label="Action"
                  >
                    <MenuItem value="approve">Approve</MenuItem>
                    <MenuItem value="reject">Reject</MenuItem>
                    <MenuItem value="request-documents">Request Documents</MenuItem>
                    <MenuItem value="process-payment">Process Payment</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {processStatus === 'approve' && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="success">
                    <strong>Auto-calculated approved amount: ₹{calculatedAmount.toLocaleString()}</strong>
                    <br />
                    <small>Calculated based on policy type and coverage limits</small>
                  </Alert>
                </Grid>
              )}
              
              {processStatus === 'reject' && (
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Rejection Reason"
                    multiline
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </Grid>
              )}
              
              {processStatus === 'request-documents' && (
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Document Request Message"
                    multiline
                    rows={4}
                    value={documentRequest}
                    onChange={(e) => setDocumentRequest(e.target.value)}
                    required
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProcessDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleProcessSubmit} 
            variant="contained"
            disabled={!processStatus}
          >
            Process
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};