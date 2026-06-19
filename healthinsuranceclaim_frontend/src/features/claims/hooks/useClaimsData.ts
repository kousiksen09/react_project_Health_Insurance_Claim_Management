import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../../admin/services/adminApi';
import { claimsApi } from '../services/claimsApi';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useGlobalError } from '../../../shared/hooks/useGlobalError';

import { UserRole } from '../../../shared/types';

// Global singleton state
let globalClaimsState = {
  claims: [] as any[],
  claimOfficers: [] as any[],
  loading: false,
  fetched: false,
  userRole: null as number | null,
  lastFetchTime: 0
};
const subscribers = new Set<() => void>();
let fetchPromise: Promise<void> | null = null;

const CACHE_DURATION = 30000; // 30 seconds cache

const fetchClaimsData = async (userRole: number, showError: (msg: string) => void, forceRefresh = false) => {
  // Return existing promise if already fetching
  if (fetchPromise && !forceRefresh) {
    return fetchPromise;
  }

  // Check cache validity
  const now = Date.now();
  if (!forceRefresh && 
      globalClaimsState.fetched && 
      globalClaimsState.userRole === userRole && 
      (now - globalClaimsState.lastFetchTime) < CACHE_DURATION) {
    return Promise.resolve();
  }

  fetchPromise = (async () => {
    globalClaimsState.loading = true;
    subscribers.forEach(callback => callback());
    
    try {
      let claimsData: any[] = [];
      let officersData: any[] = [];

      if (userRole === UserRole.Admin) {
        const response = await adminApi.getClaimsManagementData();
        claimsData = response.claims || [];
        officersData = response.claimOfficers || [];
      } else if (userRole === UserRole.Customer) {
        claimsData = (await claimsApi.getMyClaims()) || [];
      } else if (userRole === UserRole.ClaimOfficer) {
        const { claimOfficerApi } = await import('../../claimofficer/services/claimOfficerApi');
        const officerClaims = await claimOfficerApi.getAllClaims();
        claimsData = Array.isArray(officerClaims) ? officerClaims : [];
      }
      
      globalClaimsState.claims = claimsData;
      globalClaimsState.claimOfficers = officersData;
      globalClaimsState.fetched = true;
      globalClaimsState.userRole = userRole;
      globalClaimsState.lastFetchTime = now;
    } catch (err) {
      showError('Failed to fetch claims data');
    } finally {
      globalClaimsState.loading = false;
      fetchPromise = null;
      subscribers.forEach(callback => callback());
    }
  })();
  
  return fetchPromise;
};

export const useClaimsData = () => {
  const { user } = useAuth();
  const { showError } = useGlobalError();
  const [, forceUpdate] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const callback = () => {
      if (isMounted.current) {
        forceUpdate(prev => prev + 1);
      }
    };
    
    subscribers.add(callback);
    
    if (user?.role) {
      fetchClaimsData(user.role, showError);
    }

    return () => {
      isMounted.current = false;
      subscribers.delete(callback);
    };
  }, [user?.role, showError]);

  const refetch = async () => {
    if (user?.role) {
      await fetchClaimsData(user.role, showError, true);
    }
  };

  return {
    claims: globalClaimsState.claims,
    claimOfficers: globalClaimsState.claimOfficers,
    loading: globalClaimsState.loading,
    refetch
  };
};