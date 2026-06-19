import { apiClient } from '../../../shared/services/apiClient';


export interface ClaimOfficerRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalCustomers: number;
  totalHospitals: number;
  totalClaimOfficers: number;
  totalPolicies: number;
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
}

export interface Policy {
  id: number;
  name: string;
  description: string;
  premium: number;
  coverageAmount: number;
  durationMonths: number;
  policyType: number;
  isActive: boolean;
  activeCustomersCount?: number;
  createdAt?: string;
}

export const adminApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    return apiClient.get<DashboardStats>('/api/admin/dashboard');
  },

  getAllUsers: async () => {
    return apiClient.get('/api/admin/users');
  },

  getCustomers: async () => {
    return apiClient.get('/api/admin/customers');
  },

  toggleCustomerStatus: async (id: number): Promise<{success: boolean, message: string}> => {
    return apiClient.put<{success: boolean, message: string}>(`/api/admin/customers/${id}/toggle-status`);
  },

  getAllHospitals: async () => {
    return apiClient.get('/api/admin/hospitals');
  },

  getAllPolicies: async (): Promise<Policy[]> => {
    const response = await apiClient.get<any[]>('/api/admin/policies');
    return response.map((policy: any) => ({
      id: policy.Id || policy.id,
      name: policy.Name || policy.name,
      description: policy.Description || policy.description,
      premium: policy.Premium || policy.premium,
      coverageAmount: policy.CoverageAmount || policy.coverageAmount,
      durationMonths: policy.DurationMonths || policy.durationMonths,
      policyType: policy.PolicyType || policy.policyType,
      isActive: policy.IsActive !== undefined ? policy.IsActive : policy.isActive,
      activeCustomersCount: policy.ActiveCustomersCount || policy.activeCustomersCount,
      createdAt: policy.CreatedAt || policy.createdAt
    }));
  },

  getPolicy: async (id: number): Promise<Policy> => {
    return apiClient.get<Policy>(`/api/admin/policies/${id}`);
  },

  createPolicy: async (data: Omit<Policy, 'id' | 'isActive' | 'activeCustomersCount' | 'createdAt'>): Promise<Policy> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });
    return apiClient.postFormData<Policy>('/api/admin/policies', formData);
  },

  updatePolicy: async (id: number, data: Omit<Policy, 'id' | 'isActive' | 'activeCustomersCount' | 'createdAt'>): Promise<string> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });
    return apiClient.putFormData<string>(`/api/admin/policies/${id}`, formData);
  },


  toggleUserStatus: async (id: number): Promise<string> => {
    return apiClient.put<string>(`/api/admin/users/${id}/toggle-status`);
  },

  deleteUser: async (id: number): Promise<string> => {
    return apiClient.delete<string>(`/api/admin/users/${id}`);
  },

  addClaimOfficer: async (data: ClaimOfficerRequest): Promise<string> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    return apiClient.postFormData<string>('/api/admin/claim-officers', formData);
  },

  getClaimOfficers: async () => {
    return apiClient.get('/api/admin/claim-officers');
  },

  toggleClaimOfficerStatus: async (id: number): Promise<string> => {
    return apiClient.put<string>(`/api/admin/claim-officers/${id}/toggle-status`);
  },

  deleteClaimOfficer: async (id: number): Promise<string> => {
    return apiClient.delete<string>(`/api/admin/claim-officers/${id}`);
  },

  getAllClaims: async () => {
    return apiClient.get('/api/admin/claims');
  },

  assignClaimOfficer: async (claimId: number, officerId: number): Promise<string> => {
    return apiClient.put<string>(`/api/admin/claims/${claimId}/assign-officer/${officerId}`);
  },

  togglePolicyStatus: async (id: number): Promise<string> => {
    return apiClient.put<string>(`/api/admin/policies/${id}/toggle-status`);
  },

  deletePolicy: async (id: number): Promise<string> => {
    return apiClient.delete<string>(`/api/admin/policies/${id}`);
  },

  getClaimsManagementData: async (): Promise<{ claims: any[], claimOfficers: any[] }> => {
    return apiClient.get<{ claims: any[], claimOfficers: any[] }>('/api/admin/claims-management');
  }
};