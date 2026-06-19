export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterCustomerRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  address: string;
}

export interface RegisterHospitalRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  address: string;
  phone: string;
}

export interface AuthResponse {
  token: string;
  role: number;
  email: string;
  userId: number;
}