import { apiClient } from './apiClient';
import { createFormData } from '../utils/formDataUtils';

export interface ProfileData {
  id: number;
  email: string;
  role: number;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  isActive: boolean;
  customer?: CustomerProfile;
  hospital?: HospitalProfile;
}

export interface CustomerProfile {
  customerNumber: string;
  dateOfBirth: string;
  phone: string;
  address: string;
}

export interface HospitalProfile {
  name: string;
  licenseNumber: string;
  address: string;
  contactNumber: string;
}



export interface UpdateCustomerProfileRequest {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  profileImage?: File;
}

export interface UpdateHospitalProfileRequest {
  firstName: string;
  lastName: string;
  name: string;
  address: string;
  contactNumber: string;
  profileImage?: File;
}

export interface UpdateClaimOfficerProfileRequest {
  firstName: string;
  lastName: string;
  profileImage?: File;
}

export interface UpdateAdminProfileRequest {
  firstName: string;
  lastName: string;
  profileImage?: File;
}

export const profileApi = {

  getCustomerProfile: async (): Promise<ProfileData> => {
    return apiClient.get<ProfileData>('/api/customer/profile');
  },

  getHospitalProfile: async (): Promise<ProfileData> => {
    return apiClient.get<ProfileData>('/api/hospital/profile');
  },

  getClaimOfficerProfile: async (): Promise<ProfileData> => {
    return apiClient.get<ProfileData>('/api/claimofficer/profile');
  },

  getAdminProfile: async (): Promise<ProfileData> => {
    return apiClient.get<ProfileData>('/api/admin/profile');
  },

 
  updateCustomerProfile: async (data: UpdateCustomerProfileRequest): Promise<string> => {
    return apiClient.putFormData<string>('/api/customer/profile', createFormData(data));
  },

  updateHospitalProfile: async (data: UpdateHospitalProfileRequest): Promise<string> => {
    return apiClient.putFormData<string>('/api/hospital/profile', createFormData(data));
  },

  updateClaimOfficerProfile: async (data: UpdateClaimOfficerProfileRequest): Promise<string> => {
    return apiClient.putFormData<string>('/api/claimofficer/profile', createFormData(data));
  },

  updateAdminProfile: async (data: UpdateAdminProfileRequest): Promise<string> => {
    return apiClient.putFormData<string>('/api/admin/profile', createFormData(data));
  }
};