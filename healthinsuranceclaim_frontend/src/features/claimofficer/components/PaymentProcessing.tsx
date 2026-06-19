import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { Payment, CheckCircle } from '@mui/icons-material';
import { claimOfficerApi } from '../services/claimOfficerApi';

export const PaymentProcessing = () => {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  useEffect(() => {
    fetchApprovedClaims();
  }, []);

  const fetchApprovedClaims = async () => {
    try {
      const claimsData = await claimOfficerApi.getAllClaims() as any[];

      const approvedClaims = claimsData.filter((claim: any) => claim.status === 4); 
      setClaims(approvedClaims);
    } catch (error) {
      console.error('Failed to fetch claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = (claim: any) => {
    setSelectedClaim(claim);
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedClaim) return;
    
    try {
      await claimOfficerApi.processPayment(selectedClaim.id);
      setPaymentDialogOpen(false);
      fetchApprovedClaims();
    } catch (error) {
      console.error('Failed to process payment:', error);
    }
  };

  const getStatusLabel = (status: number) => {
    const statusMap: { [key: number]: string } = {
      1: 'Submitted',
      2: 'Under Review', 
      3: 'Documents Requested',
      4: 'Approved',
      5: 'Rejected',
      6: 'Paid'
    };
    return statusMap[status] || 'Unknown';
  };

  const getStatusColor = (status: number) => {
    const colorMap: { [key: number]: 'success' | 'warning' | 'error' | 'info' | 'default' } = {
      1: 'warning',
      2: 'info',
      3: 'warning', 
      4: 'success',
      5: 'error',
      6: 'success'
    };
    return colorMap[status] || 'default';
  };

  const columns: GridColDef[] = [
    { field: 'claimNumber', headerName: 'Claim Number', width: 150 },
    { field: 'customerName', headerName: 'Customer', width: 200 },
    { field: 'hospitalName', headerName: 'Hospital', width: 200 },
    { field: 'approvedAmount', headerName: 'Approved Amount', width: 150, renderCell: (params: any) => `₹${(params.value || 0).toLocaleString()}` },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120, 
      renderCell: (params: any) => (
        <Chip 
          label={getStatusLabel(params.value)} 
          color={getStatusColor(params.value)} 
          size="small" 
        />
      )
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params: any) => [
        <GridActionsCellItem
          icon={<Payment />}
          label="Process Payment"
          onClick={() => handleProcessPayment(params.row)}
          disabled={params.row.status === 6} 
        />
      ]
    }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Payment Processing</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Process payments for approved claims
      </Typography>
      
      <Paper sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={claims}
          columns={columns}
          loading={loading}
          hideFooter
          disableColumnMenu
          disableColumnSorting
        />
      </Paper>

      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Process Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Claim: {selectedClaim?.claimNumber}</Typography>
            <Typography variant="body1" gutterBottom>
              Customer: {selectedClaim?.customerName}
            </Typography>
            <Typography variant="body1" gutterBottom>
              Hospital: {selectedClaim?.hospitalName}
            </Typography>
            <Typography variant="h6" color="primary" gutterBottom>
              Amount to Pay: ₹{selectedClaim?.approvedAmount?.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              This will mark the claim as paid and initiate the payment process.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmPayment} variant="contained" startIcon={<CheckCircle />}>
            Confirm Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};