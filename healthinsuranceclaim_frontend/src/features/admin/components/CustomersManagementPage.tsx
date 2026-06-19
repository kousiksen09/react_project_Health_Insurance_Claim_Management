import { Box, Chip, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { ToggleOn, ToggleOff } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { ManagementPageLayout } from '../../../design-system';
import { adminApi } from '../services/adminApi';
import { useApiData } from '../../../shared/hooks/useApiData';

export const CustomersManagementPage = () => {
  const { data: customers, loading, refetch } = useApiData(() => adminApi.getCustomers());
  const { enqueueSnackbar } = useSnackbar();

  const handleToggleStatus = async (customerId: number) => {
    try {
      const response = await adminApi.toggleCustomerStatus(customerId);
      if (response.success) {
        enqueueSnackbar(response.message, { variant: 'success' });
        refetch();
      } else {
        enqueueSnackbar(response.message, { variant: 'error' });
      }
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to update customer status', { variant: 'error' });
    }
  };

  const columns: GridColDef[] = [
    { field: 'serialNo', headerName: 'S.No', width: 70, renderCell: (params: any) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'email', headerName: 'Email', width: 250 },
    { field: 'phoneNumber', headerName: 'Phone', width: 150 },
    { field: 'address', headerName: 'Address', width: 200 },
    { field: 'isActive', headerName: 'Status', width: 100, renderCell: (params: any) => (
      <Chip 
        label={params.value ? 'Active' : 'Inactive'} 
        color={params.value ? 'success' : 'error'} 
        size="small" 
      />
    ) },
    { field: 'actions', headerName: 'Actions', width: 120, renderCell: (params: any) => (
      <IconButton 
        onClick={() => handleToggleStatus(params.row.userId)}
        color={params.row.isActive ? 'error' : 'success'}
        size="small"
      >
        {params.row.isActive ? <ToggleOff /> : <ToggleOn />}
      </IconButton>
    ) },
    { field: 'createdAt', headerName: 'Registered', width: 150, renderCell: (params: any) => {
      try {
        return params.value ? new Date(params.value).toLocaleDateString() : 'N/A';
      } catch {
        return 'N/A';
      }
    }}
  ];

  return (
    <ManagementPageLayout 
      title="Customers Management" 
      subtitle="Manage customer accounts and information"
    >
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid 
          rows={Array.isArray(customers) ? customers : []} 
          columns={columns} 
          loading={loading} 
          getRowId={(row) => row.id}
          hideFooter
        />
      </Box>
    </ManagementPageLayout>
  );
};