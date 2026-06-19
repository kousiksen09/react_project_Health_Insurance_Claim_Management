import { useCallback } from 'react';
import { profileApi } from '../services/profileApi';
import { useAuth } from './useAuth';
import { useApiData } from './useApiData';
import { UserRole } from '../types';

export const useProfile = () => {
  const { user } = useAuth();

  const fetcher = useCallback(() => {
    if (!user) return Promise.resolve(null);
    
    switch (user.role) {
      case UserRole.Customer:
        return profileApi.getCustomerProfile();
      case UserRole.Hospital:
        return profileApi.getHospitalProfile();
      case UserRole.ClaimOfficer:
        return profileApi.getClaimOfficerProfile();
      case UserRole.Admin:
        return profileApi.getAdminProfile();
      default:
        return Promise.resolve(null);
    }
  }, [user?.role]);

  const { data: profile, loading, error, refetch } = useApiData(fetcher);

  return {
    profile,
    loading,
    error,
    refreshProfile: refetch
  };
};