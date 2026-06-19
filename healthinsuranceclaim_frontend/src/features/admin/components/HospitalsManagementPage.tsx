import { Box, Chip } from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { ToggleOff, ToggleOn } from '@mui/icons-material';
import { ManagementPageLayout } from '../../../design-system';
import { adminApi } from '../services/adminApi';
import { useApiData } from '../../../shared/hooks/useApiData';

export const HospitalsManagementPage = () => {
  const { data: hospitals, loading, refetch } = useApiData(() => adminApi.getAllHospitals());

  const handleToggleStatus = async (userId: number) => {
    await adminApi.toggleUserStatus(userId);
    refetch();
  };

  const columns: GridColDef[] = [
    { field: 'serialNo', headerName: 'S.No', width: 70, renderCell: (params: any) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1 },
    { field: 'name', headerName: 'Hospital Name', width: 200 },
    { field: 'licenseNumber', headerName: 'License Number', width: 150 },
    { field: 'email', headerName: 'Email', width: 250 },
    { field: 'contactNumber', headerName: 'Contact', width: 150 },
    { field: 'address', headerName: 'Address', width: 200 },
    { field: 'isActive', headerName: 'Status', width: 100, renderCell: (params: any) => (
      <Chip 
        label={params.value ? 'Active' : 'Inactive'} 
        color={params.value ? 'success' : 'error'} 
        size="small" 
      />
    ) },
    { field: 'createdAt', headerName: 'Registered', width: 150, renderCell: (params: any) => {
      try {
        return params.value ? new Date(params.value).toLocaleDateString() : 'N/A';
      } catch {
        return 'N/A';
      }
    }},
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params: any) => [
        <GridActionsCellItem 
          icon={params.row.isActive ? <ToggleOff /> : <ToggleOn />} 
          label="Toggle" 
          onClick={() => handleToggleStatus(params.row.userId)} 
        />
      ]
    }
  ];

  return (
    <ManagementPageLayout 
      title="Hospitals Management" 
      subtitle="Manage hospital registrations and information"
    >
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid 
          rows={Array.isArray(hospitals) ? hospitals : []} 
          columns={columns} 
          loading={loading} 
          getRowId={(row) => row.id}
          hideFooter
        />
      </Box>
    </ManagementPageLayout>
  );
};