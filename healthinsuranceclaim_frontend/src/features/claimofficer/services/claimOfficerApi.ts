import { apiClient } from '../../../shared/services/apiClient';

export const claimOfficerApi = {
  getPendingClaims: async () => {
    return apiClient.get('/api/claimofficer/claims/pending');
  },

  getAllClaims: async (): Promise<unknown[]> => {
    return apiClient.get<unknown[]>('/api/claimofficer/claims');
  },

  getClaimDetails: async (id: number) => {
    return apiClient.get(`/api/claimofficer/claims/${id}`);
  },

  approveClaim: async (id: number, approvedAmount?: number): Promise<string> => {
    const formData = new FormData();
    if (approvedAmount) formData.append('approvedAmount', approvedAmount.toString());
    return apiClient.putFormData<string>(`/api/claimofficer/claims/${id}/approve`, formData);
  },

  rejectClaim: async (id: number, rejectionReason: string): Promise<string> => {
    const formData = new FormData();
    formData.append('rejectionReason', rejectionReason);
    return apiClient.putFormData<string>(`/api/claimofficer/claims/${id}/reject`, formData);
  },

  requestDocuments: async (id: number, documentRequest: string): Promise<string> => {
    const formData = new FormData();
    formData.append('documentRequest', documentRequest);
    return apiClient.putFormData<string>(`/api/claimofficer/claims/${id}/request-documents`, formData);
  },

  calculateAmount: async (id: number, requestedAmount: number) => {
    const formData = new FormData();
    formData.append('requestedAmount', requestedAmount.toString());
    return apiClient.postFormData(`/api/claimofficer/claims/${id}/calculate-amount`, formData);
  },

  processPayment: async (id: number): Promise<string> => {
    return apiClient.put<string>(`/api/claimofficer/claims/${id}/process-payment`);
  },

  getClaimDocuments: async (id: number) => {
    return apiClient.get(`/api/claimofficer/claims/${id}/documents`);
  },

  downloadDocument: async (documentId: number) => {
    const response = await fetch(`https://localhost:7021/api/claimofficer/documents/${documentId}/download`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `document_${documentId}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      throw new Error('Failed to download document');
    }
  }
};