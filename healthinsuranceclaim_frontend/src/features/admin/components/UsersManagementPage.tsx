import { Box, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { ManagementPageLayout } from '../../../design-system';
import { adminApi } from '../services/adminApi';
import { useApiData } from '../../../shared/hooks/useApiData';

export const UsersManagementPage = () => {
  const { data: users, loading } = useApiData(() => adminApi.getAllUsers());

  const columns: GridColDef[] = [
    { field: 'serialNo', headerName: 'S.No', width: 70, renderCell: (params: any) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'email', headerName: 'Email', width: 250 },
    { field: 'role', headerName: 'Role', width: 120, renderCell: (params: any) => {
      const roleLabels = { 1: 'Admin', 2: 'Customer', 3: 'Hospital', 4: 'Claim Officer' };
      return roleLabels[params.value as keyof typeof roleLabels] || 'Unknown';
    }},
    { field: 'isActive', headerName: 'Status', width: 100, renderCell: (params: any) => (
      <Chip 
        label={params.value ? 'Active' : 'Inactive'} 
        color={params.value ? 'success' : 'error'} 
        size="small" 
      />
    ) },
    { field: 'createdAt', headerName: 'Created', width: 150, renderCell: (params: any) => {
      try {
        return params.value ? new Date(params.value).toLocaleDateString() : 'N/A';
      } catch {
        return 'N/A';
      }
    }}
  ];

  return (
    <ManagementPageLayout 
      title="Users Management" 
      subtitle="Manage all system users and their access levels"
    >
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid 
          rows={Array.isArray(users) ? users : []} 
          columns={columns} 
          loading={loading} 
          getRowId={(row) => row.id}
          hideFooter
        />
      </Box>
    </ManagementPageLayout>
  );
};