import { Typography, Container } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { People, LocalHospital, Policy, Assignment, AccountCircle, Business } from '@mui/icons-material';
import { adminApi } from '../../admin/services/adminApi';
import { useApiData } from '../../../shared/hooks/useApiData';
import { StatCard } from '../../../shared/components';

export const AdminDashboardPage = () => {
  const { data: stats } = useApiData(() => adminApi.getDashboard());



  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
        Admin Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={<AccountCircle fontSize="large" />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard title="Active Policies" value={stats?.totalPolicies || 0} icon={<Policy fontSize="large" />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard title="Total Claims" value={stats?.totalClaims || 0} icon={<Assignment fontSize="large" />} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard title="Customers" value={stats?.totalCustomers || 0} icon={<People fontSize="large" />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard title="Hospitals" value={stats?.totalHospitals || 0} icon={<LocalHospital fontSize="large" />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard title="Claim Officers" value={stats?.totalClaimOfficers || 0} icon={<Business fontSize="large" />} />
        </Grid>
      </Grid>

    </Container>
  );
};