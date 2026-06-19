export const API_BASE_URL = 'https://localhost:7021';



export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER_CUSTOMER: '/register/customer',
  REGISTER_HOSPITAL: '/register/hospital',
  DASHBOARD: '/dashboard',
  CLAIMS: '/claims',
  MY_CLAIMS: '/my-claims',
  PENDING_CLAIMS: '/pending-claims',
  CREATE_CLAIM: '/create-claim',
  PROFILE: '/profile',
  HOSPITALS: '/hospitals',
  NOTIFICATIONS: '/notifications',
  ADMIN_USERS: '/admin/users',
  ADMIN_CUSTOMERS: '/admin/customers',
  ADMIN_HOSPITALS: '/admin/hospitals',
  ADMIN_POLICIES: '/admin/policies',
  ADMIN_CLAIMS: '/admin/claims',
  ADMIN_OFFICERS: '/admin/officers'
} as const;

export const CLAIM_STATUS_COLORS = {
  1: '#ff9800',
  2: '#2196f3',
  3: '#ff5722',
  4: '#4caf50',
  5: '#f44336',
  6: '#9c27b0'
} as const;

export const CLAIM_STATUS_LABELS = {
  1: 'Submitted',
  2: 'Under Review',
  3: 'Documents Requested',
  4: 'Approved',
  5: 'Rejected',
  6: 'Paid'
} as const;

export const USER_ROLE_LABELS = {
  1: 'Admin',
  2: 'Customer',
  3: 'Hospital',
  4: 'Claim Officer'
} as const;