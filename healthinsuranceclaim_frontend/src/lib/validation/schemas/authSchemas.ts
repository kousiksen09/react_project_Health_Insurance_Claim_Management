import { BASE_VALIDATION_RULES } from '../rules/baseRules';
import { validateDateOfBirth } from '../utils/customValidators';

export const LOGIN_VALIDATION_SCHEMA = {
  email: BASE_VALIDATION_RULES.email,
  password: {
    required: 'Password is required'
  }
} as const;

export const REGISTER_CUSTOMER_VALIDATION_SCHEMA = {
  firstName: BASE_VALIDATION_RULES.firstName,
  lastName: BASE_VALIDATION_RULES.lastName,
  email: BASE_VALIDATION_RULES.email,
  password: BASE_VALIDATION_RULES.password,
  phone: BASE_VALIDATION_RULES.phone,
  address: BASE_VALIDATION_RULES.address,
  dateOfBirth: {
    validate: validateDateOfBirth
  }
} as const;

export const REGISTER_HOSPITAL_VALIDATION_SCHEMA = {
  firstName: BASE_VALIDATION_RULES.firstName,
  lastName: BASE_VALIDATION_RULES.lastName,
  name: {
    required: 'Hospital name is required',
    minLength: {
      value: 3,
      message: 'Hospital name must be at least 3 characters'
    },
    maxLength: {
      value: 100,
      message: 'Hospital name cannot exceed 100 characters'
    }
  },
  email: BASE_VALIDATION_RULES.email,
  password: BASE_VALIDATION_RULES.password,
  phone: BASE_VALIDATION_RULES.phone,
  address: BASE_VALIDATION_RULES.address,
  licenseNumber: {
    required: 'License number is required',
    pattern: {
      value: /^[A-Z0-9]{6,20}$/,
      message: 'License number must be 6-20 alphanumeric characters'
    }
  }
} as const;