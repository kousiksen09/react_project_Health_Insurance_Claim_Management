import { useAuth } from '../../../shared/hooks/useAuth';
import { useProfile } from '../../../shared/hooks/useProfile';
import { UserRole } from '../../../shared/types';
import { CustomerProfile } from './CustomerProfile';
import { HospitalProfile } from './HospitalProfile';
import { ClaimOfficerProfile } from './ClaimOfficerProfile';
import { AdminProfile } from './AdminProfile';
import { Alert, Typography } from '@mui/material';

export const ProfilePage = () => {
  const { user } = useAuth();
  const { profile, loading, error, refreshProfile } = useProfile();

  if (loading) return <Typography>Loading profile...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!user) return <Alert severity="error">User not found</Alert>;
  if (!profile) return <Alert severity="warning">Profile not found</Alert>;

  switch (user.role) {
    case UserRole.Customer:
      return <CustomerProfile profile={profile} refreshProfile={refreshProfile} />;
    case UserRole.Hospital:
      return <HospitalProfile profile={profile} />;
    case UserRole.ClaimOfficer:
      return <ClaimOfficerProfile />;
    case UserRole.Admin:
      return <AdminProfile />;
    default:
      return <Alert severity="error">Unknown user role</Alert>;
  }
};