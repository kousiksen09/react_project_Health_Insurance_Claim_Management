export interface CreateClaimRequest {
  policyNumber: string;
  claimAmount: number;
  treatmentDetails: string;
  treatmentDate: string;
  documents: File[];
  documentTypes: string[];
}

export interface ProcessClaimRequest {
  status: number;
  rejectionReason?: string;
  approvedAmount?: number;
  documentRequest?: string;
}