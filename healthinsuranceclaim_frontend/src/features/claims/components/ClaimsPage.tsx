
import {
  Box,
  Typography,
  Paper,
  Chip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useClaimsData } from '../hooks/useClaimsData';
import { CLAIM_STATUS_COLORS, CLAIM_STATUS_LABELS } from '../../../shared/utils/constants';
import { UserRole } from '../../../shared/types';

export const ClaimsPage = () => {
  const { user } = useAuth();
  const { claims, loading } = useClaimsData();

  const baseColumns = [
    { field: 'claimNumber', headerName: 'Claim Number', width: 150, sortable: false },
    { field: 'hospitalName', headerName: 'Hospital', width: 200, sortable: false },
    { field: 'claimAmount', headerName: 'Claim Amount', width: 120, sortable: false, renderCell: (params: any) => `₹${(params.value || 0).toLocaleString()}` },
    { field: 'treatmentDetails', headerName: 'Treatment Details', width: 200, sortable: false },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      sortable: false,
      renderCell: (params: any) => (
        <Chip
          label={CLAIM_STATUS_LABELS[params.value as keyof typeof CLAIM_STATUS_LABELS]}
          sx={{ backgroundColor: CLAIM_STATUS_COLORS[params.value as keyof typeof CLAIM_STATUS_COLORS], color: 'white' }}
        />
      ),
    },
    { field: 'approvedAmount', headerName: 'Approved Amount', width: 150, sortable: false, renderCell: (params: any) => params.value ? `₹${params.value.toLocaleString()}` : '-' },
  ];

  const columns = user?.role === UserRole.Customer 
    ? baseColumns 
    : [
        { field: 'claimNumber', headerName: 'Claim Number', width: 150, sortable: false },
        { field: 'customerName', headerName: 'Customer', width: 200, sortable: false },
        ...baseColumns.slice(1)
      ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {user?.role === UserRole.Customer ? 'My Claims' : 'All Claims'}
      </Typography>
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={claims}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          hideFooter
          disableColumnMenu
        />
      </Paper>
    </Box>
  );
};