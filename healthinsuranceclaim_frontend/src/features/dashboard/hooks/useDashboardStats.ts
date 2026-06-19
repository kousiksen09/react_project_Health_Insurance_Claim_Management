import { useApiData } from '../../../shared/hooks/useApiData';
import { adminApi } from '../../admin/services/adminApi';

export const useDashboardStats = () => {
  const { data: stats, loading, error, refetch } = useApiData(() => adminApi.getDashboard());

  return {
    stats,
    loading,
    error,
    refreshStats: refetch
  };
};