import { apiClient } from '../../../shared/services/apiClient';


interface Claim {
  id: number;
  claimNumber: string;
  claimAmount: number;
  treatmentDetails: string;
  treatmentDate: string;
  submissionDate: string;
  status: number;
  rejectionReason?: string;
  documentRequest?: string;
  approvedAmount?: number;
  processedDate?: string;
  customerName: string;
  hospitalName: string;
  claimOfficerName?: string;
}



export interface CreateClaimRequest {
  policyNumber: string;
  claimAmount: number;
  treatmentDetails: string;
  treatmentDate: string;
  documents: File[];
  documentTypes: string[];
}

export const hospitalApi = {

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
    
    return apiClient.postFormData<string>('/api/hospital/claims', formData);
  },

  getHospitalClaims: async (): Promise<Claim[]> => {
    return apiClient.get<Claim[]>('/api/hospital/claims');
  },

  getClaimsByStatus: async (status: string): Promise<Claim[]> => {
    return apiClient.get<Claim[]>(`/api/hospital/claims/status/${status}`);
  },

  getCustomerPolicy: async (policyNumber: string) => {
    return apiClient.get(`/api/hospital/customer-policy/${policyNumber}`);
  },

  getCustomerPolicies: async (customerId: number) => {
    return apiClient.get(`/api/hospital/customer/${customerId}/policies`);
  },

  getClaimByNumber: async (claimNumber: string): Promise<Claim> => {
    const claims = await apiClient.get<Claim[]>('/api/hospital/claims');
    const claim = claims.find(c => c.claimNumber === claimNumber);
    if (!claim) {
      throw new Error('Claim not found');
    }
    return claim;
  },

  uploadAdditionalDocuments: async (claimId: number, documents: File[], documentTypes: string[]): Promise<string> => {
    const formData = new FormData();
    
    // Append each document file
    documents.forEach(file => {
      formData.append('documents', file);
    });
    
    // Append each document type
    documentTypes.forEach(type => {
      formData.append('documentTypes', type);
    });
    
    return apiClient.postFormData<string>(`/api/hospital/claims/${claimId}/upload-documents`, formData);
  }
};