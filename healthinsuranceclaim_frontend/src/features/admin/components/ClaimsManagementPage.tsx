import { useState } from 'react';
import { Box, FormControl, Select, MenuItem, Chip, Snackbar, Alert, CircularProgress, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { ManagementPageLayout } from '../../../design-system';
import { adminApi } from '../services/adminApi';
import { useApiData } from '../../../shared/hooks/useApiData';
import { CLAIM_STATUS_COLORS, CLAIM_STATUS_LABELS } from '../../../shared/utils/constants';

export const ClaimsManagementPage = () => {
  const { data: claimsData, loading, refetch } = useApiData(() => adminApi.getClaimsManagementData());
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [assigning, setAssigning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleAssignFromDropdown = async (claim: any, officerId: string) => {
    try {
      setAssigning(true);
      setSelectedClaim(claim);
      const claimId = claim.id || claim.Id;
      await adminApi.assignClaimOfficer(claimId, parseInt(officerId));
      setSuccessMessage('Claim officer assigned successfully');
      refetch();
    } catch (error: any) {
      setErrorMessage(error.response?.data || 'Failed to assign claim officer');
    } finally {
      setAssigning(false);
      setSelectedClaim(null);
    }
  };

  const columns: GridColDef[] = [
    { field: 'serialNo', headerName: 'S.No', width: 70, renderCell: (params: any) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1 },
    { field: 'claimNumber', headerName: 'Claim Number', width: 150 },
    { field: 'customerName', headerName: 'Customer', width: 200 },
    { field: 'hospitalName', headerName: 'Hospital', width: 200 },
    { field: 'claimAmount', headerName: 'Amount', width: 120, renderCell: (params: any) => {
      const amount = params.value || params.row.claimAmount || 0;
      return `₹${amount.toLocaleString()}`;
    } },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 150,
      renderCell: (params: any) => (
        <Chip
          label={CLAIM_STATUS_LABELS[params.value as keyof typeof CLAIM_STATUS_LABELS] || 'Unknown'}
          sx={{ backgroundColor: CLAIM_STATUS_COLORS[params.value as keyof typeof CLAIM_STATUS_COLORS] || '#gray', color: 'white' }}
        />
      )
    },
    { 
      field: 'claimOfficerName', 
      headerName: 'Assigned Officer', 
      width: 220, 
      renderCell: (params: any) => {
        const officerName = params.value;
        const isUnassigned = officerName === 'Unassigned' || !officerName;
        const claimId = params.row.id || params.row.Id;
        const isCurrentlyAssigning = assigning && selectedClaim?.id === claimId;
        
        if (isUnassigned) {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
                <Select
                  value={''}
                  displayEmpty
                  disabled={isCurrentlyAssigning}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAssignFromDropdown(params.row, e.target.value as string);
                    }
                  }}
                  sx={{ 
                    height: 36,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    '& .MuiSelect-select': {
                      py: 1,
                      fontSize: '0.875rem'
                    },
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <MenuItem value="" disabled sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                    {isCurrentlyAssigning ? 'Assigning...' : 'Select Officer'}
                  </MenuItem>
                  {claimsData?.claimOfficers?.map((officer: any) => (
                    <MenuItem 
                      key={officer.id || officer.Id} 
                      value={officer.id || officer.Id}
                      sx={{
                        '&:hover': {
                          bgcolor: 'primary.light',
                          color: 'primary.contrastText'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box 
                          sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: 'success.main' 
                          }} 
                        />
                        {(officer.firstName || officer.FirstName)} {(officer.lastName || officer.LastName)}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {isCurrentlyAssigning && (
                <CircularProgress size={16} sx={{ color: 'primary.main' }} />
              )}
            </Box>
          );
        }
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box 
              sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: 'success.main' 
              }} 
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {officerName}
            </Typography>
          </Box>
        );
      }
    }
  ];

  return (
    <ManagementPageLayout title="Claims Management" subtitle="Manage and assign claims to officers">
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid 
          rows={claimsData?.claims || []} 
          columns={columns} 
          loading={loading} 
          getRowId={(row) => row.id || row.Id}
          hideFooter
          disableColumnMenu
          disableColumnSorting
        />
      </Box>
      
      <Snackbar open={!!errorMessage} autoHideDuration={6000} onClose={() => setErrorMessage('')}>
        <Alert onClose={() => setErrorMessage('')} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
      
      <Snackbar open={!!successMessage} autoHideDuration={4000} onClose={() => setSuccessMessage('')}>
        <Alert onClose={() => setSuccessMessage('')} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>
    </ManagementPageLayout>
  );
};