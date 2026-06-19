export const REGEX_PATTERNS = {
  EMAIL: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  PHONE_INDIAN: /^[6-9]\d{9}$/,
  PHONE_10_DIGIT: /^\d{10}$/,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  NAME: /^[A-Za-z\s]{2,50}$/,
  LICENSE_NUMBER: /^[A-Z0-9]{6,20}$/,
  AMOUNT: /^\d+(\.\d{1,2})?$/
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED: {
    EMAIL: 'Email is required',
    PASSWORD: 'Password is required',
    FIRST_NAME: 'First name is required',
    LAST_NAME: 'Last name is required',
    PHONE: 'Phone number is required',
    ADDRESS: 'Address is required',
    DATE_OF_BIRTH: 'Date of birth is required',
    LICENSE_NUMBER: 'License number is required'
  },
  INVALID: {
    EMAIL: 'Please enter a valid email address',
    PHONE: 'Please enter a valid 10-digit phone number',
    PASSWORD: 'Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number and 1 special character',
    NAME: 'Name can only contain letters and spaces',
    LICENSE_NUMBER: 'License number must be 6-20 alphanumeric characters'
  },
  LENGTH: {
    EMAIL_MAX: 'Email cannot exceed 100 characters',
    NAME_MIN: 'Name must be at least 2 characters',
    NAME_MAX: 'Name cannot exceed 50 characters',
    PASSWORD_MIN: 'Password must be at least 8 characters',
    ADDRESS_MIN: 'Address must be at least 10 characters',
    ADDRESS_MAX: 'Address cannot exceed 200 characters'
  },
  AGE: {
    MIN: 'Minimum age required is 18',
    MAX: 'Please enter a valid date of birth'
  }
} as const;