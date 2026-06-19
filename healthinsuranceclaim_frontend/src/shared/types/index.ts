export const UserRole = {
  Admin: 1,
  Customer: 2,
  Hospital: 3,
  ClaimOfficer: 4,
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ClaimStatus = {
  Submitted: 1,
  UnderReview: 2,
  DocumentsRequested: 3,
  Approved: 4,
  Rejected: 5,
  Paid: 6,
} as const;

export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];

export interface User {
  id: number;
  email: string;
  role: UserRole;
  token?: string;
}

export interface Claim {
  id: number;
  claimNumber: string;
  claimAmount: number;
  treatmentDetails: string;
  treatmentDate: string;
  submissionDate: string;
  status: ClaimStatus;
  rejectionReason?: string;
  documentRequest?: string;
  approvedAmount?: number;
  processedDate?: string;
  customerName: string;
  hospitalName: string;
  claimOfficerName?: string;
}

export type { Claim as ClaimType };

export interface DashboardData {
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
