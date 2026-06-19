import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { useSnackbar } from 'notistack';
import { customerApi } from '../services/customerApi';

interface Policy {
  id: number;
  policyNumber: string;
  policyName: string;
  coverageAmount: number;
  purchaseDate: string;
  expiryDate: string;
  status: number;
  customerName: string;
}

export const MyPolicies = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewalDialogOpen, setRenewalDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [processing, setProcessing] = useState(false);
  const [transactionNumber, setTransactionNumber] = useState('');

  const fetchPolicies = async () => {
    try {
      const data = await customerApi.getMyPolicies() as Policy[];
      setPolicies(data);
    } catch (error) {
      console.error('Failed to fetch policies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const validateTransactionNumber = (txnNumber: string) => {
    const patterns = [
      /^TXN\d{12,16}$/i,
      /^UTR\d{12}$/i,
      /^[A-Z0-9]{10,20}$/i,
      /^\d{12,16}$/,
    ];
    return patterns.some(pattern => pattern.test(txnNumber));
  };

  const handleRenewPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setTransactionNumber('');
    setRenewalDialogOpen(true);
  };

  const handleRenewalSubmit = async () => {
    if (!selectedPolicy || !transactionNumber.trim()) {
      enqueueSnackbar('Please enter a transaction number', { variant: 'error' });
      return;
    }

    if (!validateTransactionNumber(transactionNumber.trim())) {
      enqueueSnackbar('Invalid transaction number format. Please enter a valid transaction ID from your bank/payment gateway.', { variant: 'error' });
      return;
    }
    
    setProcessing(true);
    try {
      await customerApi.renewPolicy(selectedPolicy.id, paymentMethod, transactionNumber.trim());
      setRenewalDialogOpen(false);
      enqueueSnackbar(`Policy renewed successfully! Transaction Number: ${transactionNumber}`, { variant: 'success' });
      fetchPolicies(); // Refresh policies
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to renew policy';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Typography>Loading policies...</Typography>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>My Policies</Typography>
      {policies.length === 0 ? (
        <Typography color="textSecondary">No policies found</Typography>
      ) : (
        <Grid container spacing={2}>
          {policies.map((policy) => (
            <Grid size={{ xs: 12, md: 6 }} key={policy.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{policy.policyNumber}</Typography>
                  <Typography color="textSecondary">{policy.policyName}</Typography>
                  <Typography>Coverage: ₹{policy.coverageAmount.toLocaleString()}</Typography>
                  <Typography>Purchase Date: {new Date(policy.purchaseDate).toLocaleDateString()}</Typography>
                  <Typography>Expiry Date: {new Date(policy.expiryDate).toLocaleDateString()}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Chip label={policy.status === 1 ? 'Active' : 'Inactive'} color={policy.status === 1 ? 'success' : 'default'} size="small" />
                    {policy.status === 0 && new Date(policy.expiryDate) < new Date() ? (
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => handleRenewPolicy(policy)}
                      >
                        Renew
                      </Button>
                    ) : null}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      <Dialog open={renewalDialogOpen} onClose={() => setRenewalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Renew Policy</DialogTitle>
        <DialogContent>
          {selectedPolicy && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>{selectedPolicy.policyNumber}</Typography>
              <Typography color="textSecondary" sx={{ mb: 1 }}>{selectedPolicy.policyName}</Typography>
              <Typography>Coverage: ₹{selectedPolicy.coverageAmount.toLocaleString()}</Typography>
              <Typography>Current Expiry: {new Date(selectedPolicy.expiryDate).toLocaleDateString()}</Typography>
              
              <FormControl fullWidth sx={{ mt: 3, mb: 2 }}>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  label="Payment Method"
                >
                  <MenuItem value="Credit Card">Credit Card</MenuItem>
                  <MenuItem value="Debit Card">Debit Card</MenuItem>
                  <MenuItem value="Net Banking">Net Banking</MenuItem>
                  <MenuItem value="UPI">UPI</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Transaction Number"
                value={transactionNumber}
                onChange={(e) => setTransactionNumber(e.target.value)}
                placeholder="e.g., TXN1234567890123 or UTR123456789012"
                required
                helperText="Enter the transaction number from your payment gateway/bank"
                error={transactionNumber.length > 0 && !validateTransactionNumber(transactionNumber)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewalDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRenewalSubmit} 
            variant="contained" 
            disabled={processing || !transactionNumber.trim()}
          >
            {processing ? 'Processing...' : 'Renew Policy'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};