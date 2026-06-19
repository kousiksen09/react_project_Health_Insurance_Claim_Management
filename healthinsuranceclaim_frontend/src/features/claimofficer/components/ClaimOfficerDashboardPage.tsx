import { useState } from 'react';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { Description, Payment } from '@mui/icons-material';
import { DocumentManagement } from './DocumentManagement';
import { PaymentProcessing } from './PaymentProcessing';


export const ClaimOfficerDashboardPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Claims Management</Typography>
      </Box>

      <Paper sx={{ width: '100%', mt: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Document Management" icon={<Description />} />
          <Tab label="Payment Processing" icon={<Payment />} />
        </Tabs>
    
        <Box sx={{ p: 3 }}>
          {activeTab === 0 && <DocumentManagement />}
          {activeTab === 1 && <PaymentProcessing />}
        </Box>
      </Paper>
    </Box>
  );
};