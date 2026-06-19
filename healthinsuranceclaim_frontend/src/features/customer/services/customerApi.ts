import { apiClient } from '../../../shared/services/apiClient';

const CACHE_DURATION = 30000; // 30 seconds
const cache = new Map<string, { data: any; timestamp: number }>();

export interface CustomerProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
}

export interface UpdateCustomerProfileRequest {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  profileImage?: File;
}

export interface PurchasePolicyRequest {
  policyId: number;
  paymentMethod: string;
  transactionNumber: string;
  notes?: string;
}

export const customerApi = {
  getProfile: async (): Promise<CustomerProfile> => {
    const cacheKey = 'customer-profile';
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    const data = await apiClient.get<CustomerProfile>('/api/customer/profile');
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  updateProfile: async (data: UpdateCustomerProfileRequest): Promise<string> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'profileImage' && value instanceof File) {
          formData.append(key, value);
        } else if (key !== 'profileImage') {
          formData.append(key, value.toString());
        }
      }
    });
    return apiClient.putFormData<string>('/api/customer/profile', formData);
  },

  purchasePolicy: async (data: PurchasePolicyRequest): Promise<string> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    return apiClient.postFormData<string>('/api/customer/purchase-policy', formData);
  },

  getMyPolicies: async () => {
    return apiClient.get('/api/customer/my-policies');
  },

  getMyClaims: async () => {
    return apiClient.get('/api/claims/my-claims');
  },

  getPaymentHistory: async () => {
    return apiClient.get('/api/customer/payment-history');
  },

  getAvailablePolicies: async () => {
    const cacheKey = 'available-policies';
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    const data = await apiClient.get('/api/customer/available-policies');
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  getEligiblePolicies: async () => {
    const cacheKey = 'eligible-policies';
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    const data = await apiClient.get('/api/customer/eligible-policies');
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  getPoliciesWithProfile: async () => {
    const cacheKey = 'policies-with-profile';
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    const data = await apiClient.get('/api/customer/policies-with-profile');
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  },

  getPremiumQuote: async (policyId: number) => {
    return apiClient.get(`/api/customer/premium-quote/${policyId}`);
  },

  renewPolicy: async (customerPolicyId: number, paymentMethod: string, transactionNumber: string): Promise<string> => {
    const formData = new FormData();
    formData.append('paymentMethod', paymentMethod);
    formData.append('transactionNumber', transactionNumber);
    return apiClient.postFormData<string>(`/api/customer/renew-policy/${customerPolicyId}`, formData);
  },

  searchPolicies: async (searchTerm: string) => {
    return apiClient.get(`/api/policies/search?searchTerm=${encodeURIComponent(searchTerm)}`);
  },

  filterPolicies: async (filters: {
    policyType?: number;
    minPremium?: number;
    maxPremium?: number;
    minCoverage?: number;
    maxCoverage?: number;
  }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    return apiClient.get(`/api/policies/filter?${params.toString()}`);
  }
};