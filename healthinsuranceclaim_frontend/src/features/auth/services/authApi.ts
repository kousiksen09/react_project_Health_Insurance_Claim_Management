import { apiClient } from '../../../shared/services/apiClient';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterCustomerRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  address: string;
}

interface RegisterHospitalRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  address: string;
  phone: string;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  token: string;
  role: number;
  email: string;
  userId: number;
  isActive?: boolean;
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const formData = new FormData();
    formData.append('email', credentials.email);
    formData.append('password', credentials.password);
    const response = await apiClient.postFormData<AuthResponse>('/api/auth/login', formData);
    
    if (!response.success) {
      throw new Error(response.message || 'Login failed');
    }
    
    return response;
  },

  registerCustomer: async (data: RegisterCustomerRequest): Promise<AuthResponse> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });
    const response = await apiClient.postFormData<AuthResponse>('/api/auth/register/customer', formData);
    
    if (!response.success) {
      throw new Error(response.message || 'Registration failed');
    }
    
    return response;
  },

  registerHospital: async (data: RegisterHospitalRequest): Promise<AuthResponse> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });
    const response = await apiClient.postFormData<AuthResponse>('/api/auth/register/hospital', formData);
    
    if (!response.success) {
      throw new Error(response.message || 'Registration failed');
    }
    
    return response;
  }
};