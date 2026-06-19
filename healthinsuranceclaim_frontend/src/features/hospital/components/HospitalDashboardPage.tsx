import { useState } from 'react';
import { Box, Typography, Grid, Button, Paper, Tabs, Tab, TextField, Alert, CircularProgress, Card, CardContent } from '@mui/material';
import { Assignment, Upload, Search } from '@mui/icons-material';
import { HospitalClaims } from './HospitalClaims';
import { DocumentUpload } from './DocumentUpload';
import { hospitalApi } from '../services/hospitalApi';
import { useSnackbar } from 'notistack';


export const HospitalDashboardPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [policyNumber, setPolicyNumber] = useState('');
  const [policyData, setPolicyData] = useState<any>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handlePolicyLookup = async () => {
    if (!policyNumber.trim()) {
      enqueueSnackbar('Please enter a policy number', { variant: 'error' });
      return;
    }

    try {
      setPolicyLoading(true);
      const data = await hospitalApi.getCustomerPolicy(policyNumber);
      console.log('Policy lookup data:', data);
      setPolicyData(data);
      enqueueSnackbar('Policy found successfully!', { variant: 'success' });
    } catch (error) {
      setPolicyData(null);
      enqueueSnackbar('Policy not found', { variant: 'error' });
    } finally {
      setPolicyLoading(false);
    }
  };


  return (
    <Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Hospital Management</Typography>
      </Box>

      <Paper sx={{ width: '100%', mt: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="All Claims" icon={<Assignment />} />
          <Tab label="Document Upload" icon={<Upload />} />
          <Tab label="Policy Lookup" icon={<Search />} />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <Box>
              <HospitalClaims />
            </Box>
          )}
          {activeTab === 1 && (
            <Box>
              <DocumentUpload />
            </Box>
          )}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Customer Policy Lookup
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                Look up customer policy details before creating claims.
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'start' }}>
                <TextField
                  label="Policy Number"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="Enter policy number"
                  fullWidth
                />
                <Button
                  variant="contained"
                  startIcon={policyLoading ? <CircularProgress size={20} /> : <Search />}
                  onClick={handlePolicyLookup}
                  disabled={policyLoading || !policyNumber}
                  sx={{ minWidth: 120 }}
                >
                  {policyLoading ? 'Searching...' : 'Search'}
                </Button>
              </Box>

              {policyData && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Policy Details
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography><strong>Customer:</strong> {policyData.customerName}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography><strong>Policy Number:</strong> {policyData.policyNumber}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography><strong>Coverage Amount:</strong> ₹{policyData.coverageAmount?.toLocaleString()}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography><strong>Premium:</strong> {(policyData.premiumAmount || policyData.premium) ? `₹${(policyData.premiumAmount || policyData.premium).toLocaleString()}` : 'N/A'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography><strong>Start Date:</strong> {policyData.purchaseDate ? new Date(policyData.purchaseDate).toLocaleDateString() : 'N/A'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography><strong>End Date:</strong> {policyData.expiryDate ? new Date(policyData.expiryDate).toLocaleDateString() : 'N/A'}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};