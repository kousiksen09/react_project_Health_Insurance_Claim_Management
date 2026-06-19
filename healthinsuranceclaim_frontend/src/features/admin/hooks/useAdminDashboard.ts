import { useApiData } from '../../../shared/hooks/useApiData';
import { adminApi } from '../services/adminApi';

export const useAdminDashboard = () => {
  const { data: dashboardData, loading, error, refetch } = useApiData(() => adminApi.getDashboard());

  return {
    dashboardData,
    loading,
    error,
    refreshDashboard: refetch
  };
};