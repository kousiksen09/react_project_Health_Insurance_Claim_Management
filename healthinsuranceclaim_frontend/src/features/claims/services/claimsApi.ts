import { apiClient } from '../../../shared/services/apiClient';
import type { Claim } from '../../../shared/types';

interface CreateClaimRequest {
  policyNumber: string;
  claimAmount: number;
  treatmentDetails: string;
  treatmentDate: string;
  documents: File[];
  documentTypes: string[];
}

interface ProcessClaimRequest {
  status: number;
  rejectionReason?: string;
  approvedAmount?: number;
  documentRequest?: string;
}

export const claimsApi = {
  getAllClaims: async (): Promise<Claim[]> => {
    return apiClient.get<Claim[]>('/api/claims');
  },

  getMyClaims: async (): Promise<Claim[]> => {
    return apiClient.get<Claim[]>('/api/claims/my-claims');
  },

  getPendingClaims: async (): Promise<Claim[]> => {
    return apiClient.get<Claim[]>('/api/claims/pending');
  },

  createClaim: async (data: CreateClaimRequest): Promise<string> => {
    const formData = new FormData();
    formData.append('policyNumber', data.policyNumber);
    formData.append('claimAmount', data.claimAmount.toString());
    formData.append('treatmentDetails', data.treatmentDetails);
    formData.append('treatmentDate', data.treatmentDate);
    
    data.documents.forEach((file, index) => {
      formData.append('documents', file);
      formData.append('documentTypes', data.documentTypes[index]);
    });
    
    return apiClient.postFormData<string>('/api/claims', formData);
  },

  processClaim: async (id: number, data: ProcessClaimRequest): Promise<string> => {
    const formData = new FormData();
    formData.append('status', data.status.toString());
    if (data.rejectionReason) formData.append('rejectionReason', data.rejectionReason);
    if (data.approvedAmount) formData.append('approvedAmount', data.approvedAmount.toString());
    if (data.documentRequest) formData.append('documentRequest', data.documentRequest);
    
    return apiClient.putFormData<string>(`/api/claims/${id}/process`, formData);
  },

  approveClaim: async (id: number, approvedAmount?: number): Promise<string> => {
    const formData = new FormData();
    if (approvedAmount) formData.append('approvedAmount', approvedAmount.toString());
    
    return apiClient.putFormData<string>(`/api/claims/${id}/approve`, formData);
  },

  rejectClaim: async (id: number, rejectionReason: string): Promise<string> => {
    const formData = new FormData();
    formData.append('rejectionReason', rejectionReason);
    
    return apiClient.putFormData<string>(`/api/claims/${id}/reject`, formData);
  }
};