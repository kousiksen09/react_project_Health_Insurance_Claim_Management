import { useState } from 'react';
import { Box, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, Snackbar, Alert } from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { Edit, ToggleOff, ToggleOn, Add, Delete } from '@mui/icons-material';
import { ManagementPageLayout } from '../../../design-system';
import { adminApi, type Policy } from '../services/adminApi';
import { useApiData } from '../../../shared/hooks/useApiData';
import { AddPolicyForm } from './AddPolicyForm';

export const PoliciesManagementPage = () => {
  const { data: policies, loading, refetch } = useApiData(() => adminApi.getAllPolicies());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [policyToDelete, setPolicyToDelete] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleToggleStatus = async (id: number) => {
    await adminApi.togglePolicyStatus(id);
    refetch();
  };

  const handleDeleteClick = (id: number) => {
    setPolicyToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (policyToDelete) {
      try {
        await adminApi.deletePolicy(policyToDelete);
        refetch();
      } catch (error: any) {
        setErrorMessage(error.response?.data || 'Failed to delete policy');
      }
    }
    setDeleteDialogOpen(false);
    setPolicyToDelete(null);
  };

  const handleAddPolicy = () => {
    setIsEditing(false);
    setSelectedPolicy(null);
    setDialogOpen(true);
  };

  const handleEditPolicy = (policy: Policy) => {
    setIsEditing(true);
    setSelectedPolicy(policy);
    setDialogOpen(true);
  };



  const getPolicyTypeLabel = (type: number) => {
    const policyType = policyTypes.find(pt => pt.value === type);
    return policyType ? policyType.label : 'Unknown';
  };

  const columns: GridColDef[] = [
    { field: 'serialNo', headerName: 'S.No', width: 70, renderCell: (params: any) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1 },
    { field: 'name', headerName: 'Policy Name', width: 200 },
    { field: 'policyType', headerName: 'Type', width: 120, renderCell: (params: any) => getPolicyTypeLabel(params.value) },
    { field: 'premium', headerName: 'Premium', width: 120, renderCell: (params: any) => `₹${params.value || 0}` },
    { field: 'coverageAmount', headerName: 'Coverage', width: 150, renderCell: (params: any) => `₹${params.value || 0}` },
    { field: 'durationMonths', headerName: 'Duration (Months)', width: 150 },
    { field: 'activeCustomersCount', headerName: 'Active Customers', width: 130 },
    { field: 'isActive', headerName: 'Status', width: 100, renderCell: (params: any) => (
      <Chip 
        label={params.value ? 'Active' : 'Inactive'} 
        color={params.value ? 'success' : 'error'} 
        size="small" 
      />
    ) },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params: any) => [
        <GridActionsCellItem 
          key="edit" 
          icon={<Edit />} 
          label="Edit" 
          onClick={() => handleEditPolicy(params.row)} 
          disabled={params.row.activeCustomersCount > 0}
        />,
        <GridActionsCellItem key="toggle" icon={params.row.isActive ? <ToggleOff /> : <ToggleOn />} label="Toggle" onClick={() => handleToggleStatus(params.row.id)} disabled={params.row.activeCustomersCount > 0} />,
        <GridActionsCellItem 
          key="delete" 
          icon={<Delete />} 
          label="Delete" 
          onClick={() => handleDeleteClick(params.row.id)} 
          disabled={params.row.activeCustomersCount > 0}
        />
      ]
    }
  ];

  const policyTypes = [
    { value: 1, label: 'Individual' },
    { value: 2, label: 'Family' },
    { value: 3, label: 'Senior' }
  ];

  return (
    <ManagementPageLayout title="Policies Management" subtitle="Manage insurance policies">
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          startIcon={<Add />} 
          onClick={handleAddPolicy}
        >
          Add Policy
        </Button>
      </Box>
      
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid 
          rows={policies || []} 
          columns={columns} 
          loading={loading} 
          hideFooter 
          disableColumnMenu
          disableColumnSorting
          getRowId={(row) => row.id}
        />
      </Box>
      
      <AddPolicyForm
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          setDialogOpen(false);
          refetch();
        }}
        policy={selectedPolicy}
        isEditing={isEditing}
      />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Policy</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this policy? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={!!errorMessage} 
        autoHideDuration={6000} 
        onClose={() => setErrorMessage('')}
      >
        <Alert onClose={() => setErrorMessage('')} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>

    </ManagementPageLayout>
  );
};