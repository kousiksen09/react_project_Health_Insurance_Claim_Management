import { VALIDATION_MESSAGES } from '../constants';

/**
 * Validates date of birth to ensure user is between 18-100 years old
 */
export const validateDateOfBirth = (value: string) => {
  if (!value) return VALIDATION_MESSAGES.REQUIRED.DATE_OF_BIRTH;
  
  const date = new Date(value);
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  
  // Adjust age if birthday hasn't occurred this year
  if (date.getMonth() > today.getMonth() || 
      (date.getMonth() === today.getMonth() && date.getDate() > today.getDate())) {
    age--;
  }
  
  if (age < 18) {
    return VALIDATION_MESSAGES.AGE.MIN;
  }
  if (age > 100) return VALIDATION_MESSAGES.AGE.MAX;
  
  return true;
};

/**
 * Validates treatment date to ensure it's not in future and not older than 1 year
 */
export const validateTreatmentDate = (value: string) => {
  if (!value) return 'Treatment date is required';
  
  const date = new Date(value);
  const today = new Date();
  
  if (date > today) return 'Treatment date cannot be in the future';
  
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  
  if (date < oneYearAgo) return 'Treatment date cannot be more than 1 year ago';
  
  return true;
};

/**
 * Creates a password confirmation validator
 */
export const createPasswordConfirmValidator = (password: string) => (value: string) => {
  if (!value) return 'Please confirm your password';
  if (value !== password) return 'Passwords do not match';
  return true;
};

/**
 * Validates claim amount
 */
export const validateClaimAmount = (value: number | string) => {
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  if (!amount || amount <= 0) return 'Amount must be greater than 0';
  if (amount > 10000000) return 'Amount cannot exceed ₹1 crore';
  return true;
};

/**
 * Validates rejection reason
 */
export const validateRejectionReason = (value: string) => {
  if (!value || value.trim().length === 0) return 'Rejection reason is required';
  if (value.trim().length < 10) return 'Rejection reason must be at least 10 characters';
  if (value.length > 500) return 'Rejection reason cannot exceed 500 characters';
  return true;
};