import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Grid, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useSnackbar } from 'notistack';
import { customerApi } from '../services/customerApi';

interface PolicyOption {
  id: number;
  name: string;
  description: string;
  coverageAmount: number;
  premium: number;
  policyType: number;
  isActive: boolean;
}

export const BrowsePolicies = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [policies, setPolicies] = useState<PolicyOption[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      
      try {
        const policiesData = await customerApi.getAvailablePolicies();
        
        if (!isMounted) return;
        setPolicies(policiesData);
      } catch (error) {
        if (isMounted) {
          enqueueSnackbar('Failed to load policies. Please try again.', { variant: 'error' });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [processing, setProcessing] = useState(false);
  const [transactionNumber, setTransactionNumber] = useState('');
  const [premiumQuote, setPremiumQuote] = useState<any>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);



  const handlePurchase = async (policy: PolicyOption) => {
    setSelectedPolicy(policy);
    setTransactionNumber('');
    setPremiumQuote(null);
    setPaymentDialogOpen(true);
    
    // Fetch premium quote from backend
    setLoadingQuote(true);
    try {
      const quote = await customerApi.getPremiumQuote(policy.id);
      setPremiumQuote(quote);
    } catch (error) {
      enqueueSnackbar('Failed to calculate premium. Please try again.', { variant: 'error' });
    } finally {
      setLoadingQuote(false);
    }
  };

  const validateTransactionNumber = (txnNumber: string) => {
    // Transaction number validation patterns
    const patterns = [
      /^TXN\d{12,16}$/i,           // TXN followed by 12-16 digits
      /^UTR\d{12}$/i,             // UTR followed by 12 digits  
      /^[A-Z0-9]{10,20}$/i,       // Alphanumeric 10-20 chars
      /^\d{12,16}$/,              // Pure numeric 12-16 digits
    ];
    return patterns.some(pattern => pattern.test(txnNumber));
  };

  const handlePaymentSubmit = async () => {
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
      await customerApi.purchasePolicy({ 
        policyId: selectedPolicy.id, 
        paymentMethod,
        transactionNumber: transactionNumber.trim(),
        notes: 'Policy purchase from dashboard'
      });
      setPaymentDialogOpen(false);
      enqueueSnackbar(`Policy purchased successfully! Transaction Number: ${transactionNumber}`, { variant: 'success' });
    } catch (error: any) {
      const errorMessage = typeof error.response?.data === 'string' 
        ? error.response.data 
        : error.response?.data?.message || error.message || 'Failed to purchase policy';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Typography>Loading available policies...</Typography>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Available Policies</Typography>
      {policies.length === 0 ? (
        <Typography color="textSecondary">No policies available</Typography>
      ) : (
        <Grid container spacing={2}>
          {policies.map((policy) => (
            <Grid item xs={12} md={6} key={policy.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{policy.name}</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {policy.description}
                  </Typography>
                  <Typography variant="h6" color="primary">
                    Coverage: ₹{(policy.coverageAmount || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    Premium: ₹{(policy.premium || 0).toLocaleString()} (Lump Sum)
                  </Typography>
                  <Button 
                    variant="contained" 
                    onClick={() => handlePurchase(policy)}
                    sx={{ mt: 2 }}
                    fullWidth
                  >
                    Purchase Policy
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent>
          {selectedPolicy && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>{selectedPolicy.name}</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                {selectedPolicy.description}
              </Typography>
              
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>Premium Calculation</Typography>
                {loadingQuote ? (
                  <Typography>Calculating premium based on your profile...</Typography>
                ) : premiumQuote ? (
                  <>
                    <Typography>Coverage Amount: ₹{(premiumQuote.coverageAmount || 0).toLocaleString()}</Typography>
                    <Typography>Base Premium: ₹{(premiumQuote.basePremium || 0).toLocaleString()}</Typography>
                    <Typography>Age Factor: ₹{(premiumQuote.ageFactor || 0).toLocaleString()}</Typography>
                    <Typography>Medical Loading: ₹{(premiumQuote.medicalFactor || 0).toLocaleString()}</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>Net Premium: ₹{(premiumQuote.netPremium || 0).toLocaleString()}</Typography>
                    <Typography>GST (18%): ₹{(premiumQuote.gst || 0).toLocaleString()}</Typography>
                    <Typography variant="h6" sx={{ mt: 1, pt: 1, borderTop: '1px solid #ddd' }} color="primary">
                      Total Payable: ₹{(premiumQuote.totalAmount || 0).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      * One-time payment for {premiumQuote.durationMonths || 12} months coverage
                    </Typography>
                  </>
                ) : (
                  <Typography color="error">Unable to calculate premium. Please try again.</Typography>
                )}
              </Box>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
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
                sx={{ mb: 2 }}
                helperText="Valid formats: TXN + 12-16 digits, UTR + 12 digits, or bank reference number"
                error={transactionNumber.length > 0 && !validateTransactionNumber(transactionNumber)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handlePaymentSubmit} 
            variant="contained" 
            disabled={processing || !transactionNumber.trim() || !premiumQuote}
          >
            {processing ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};