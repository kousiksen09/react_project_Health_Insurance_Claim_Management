import { useState } from 'react';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Policy, Payment } from '@mui/icons-material';
import { MyPolicies } from './MyPolicies';
import { PaymentHistory } from './PaymentHistory';
import { BrowsePolicies } from './BrowsePolicies';

export const CustomerDashboardPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Dashboard</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ width: '100%' }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab label="Browse Policies" icon={<Policy />} />
              <Tab label="My Policies" icon={<Policy />} />
              <Tab label="Payment History" icon={<Payment />} />
            </Tabs>
        
        <Box sx={{ p: 3 }}>
          {activeTab === 0 && <BrowsePolicies />}
          {activeTab === 1 && <MyPolicies />}
          {activeTab === 2 && <PaymentHistory />}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};