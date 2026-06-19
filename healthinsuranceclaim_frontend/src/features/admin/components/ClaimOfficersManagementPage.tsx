import { Box, Button, Chip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { ToggleOff, ToggleOn, Delete, Add } from '@mui/icons-material';
import { ManagementPageLayout } from '../../../design-system';
import { adminApi } from '../services/adminApi';
import { useApiData } from '../../../shared/hooks/useApiData';
import { AddClaimOfficerForm } from './AddClaimOfficerForm';
import { useState } from 'react';

export const ClaimOfficersManagementPage = () => {
  const { data: officers, loading, refetch } = useApiData(() => adminApi.getClaimOfficers());
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, officerId: null as number | null });

  const handleToggleStatus = async (id: number) => {
    await adminApi.toggleClaimOfficerStatus(id);
    refetch();
  };

  const handleDeleteClick = (id: number) => {
    setDeleteDialog({ open: true, officerId: id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.officerId) {
      await adminApi.deleteClaimOfficer(deleteDialog.officerId);
      refetch();
    }
    setDeleteDialog({ open: false, officerId: null });
  };

  const columns: GridColDef[] = [
    { field: 'serialNo', headerName: 'S.No', width: 70, renderCell: (params: any) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1 },
    { field: 'firstName', headerName: 'First Name', width: 150 },
    { field: 'lastName', headerName: 'Last Name', width: 150 },
    { field: 'email', headerName: 'Email', width: 250 },
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
      width: 150,
      getActions: (params: any) => [
        <GridActionsCellItem 
          icon={params.row.isActive ? <ToggleOff /> : <ToggleOn />} 
          label="Toggle" 
          onClick={() => handleToggleStatus(params.row.id)} 
        />,
        <GridActionsCellItem 
          icon={<Delete />} 
          label="Delete" 
          onClick={() => handleDeleteClick(params.row.id)} 
        />
      ]
    }
  ];

  return (
    <ManagementPageLayout title="Claim Officers Management" subtitle="Manage claim officers">
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          startIcon={<Add />} 
          onClick={() => setShowAddForm(true)}
        >
          Add Officer
        </Button>
      </Box>
      
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid 
          rows={Array.isArray(officers) ? officers : []} 
          columns={columns} 
          loading={loading} 
          getRowId={(row) => row.id}
          hideFooter
          disableColumnMenu
          disableColumnSorting
        />
      </Box>
      
      {showAddForm && (
        <AddClaimOfficerForm 
          open={showAddForm} 
          onClose={() => setShowAddForm(false)} 
          onSuccess={() => {
            console.log('🔄 ClaimOfficersManagementPage onSuccess called');
            refetch();
          }} 
        />
      )}
      
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, officerId: null })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this claim officer? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, officerId: null })}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </ManagementPageLayout>
  );
};