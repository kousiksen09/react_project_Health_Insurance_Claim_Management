export const CREATE_CLAIM_VALIDATION_SCHEMA = {
  policyNumber: {
    required: 'Policy number is required',
    pattern: {
      value: /^[A-Z0-9]{8,20}$/,
      message: 'Policy number must be 8-20 alphanumeric characters'
    }
  },
  claimAmount: {
    required: 'Claim amount is required',
    min: { value: 0.01, message: 'Amount must be greater than 0' },
    max: { value: 10000000, message: 'Amount cannot exceed ₹1 crore' }
  },
  treatmentDetails: {
    required: 'Treatment details are required',
    minLength: { value: 10, message: 'Treatment details must be at least 10 characters' },
    maxLength: { value: 1000, message: 'Treatment details cannot exceed 1000 characters' }
  },
  treatmentDate: {
    required: 'Treatment date is required',
    validate: (value: string) => {
      const date = new Date(value);
      const today = new Date();
      if (date > today) return 'Treatment date cannot be in the future';
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      if (date < oneYearAgo) return 'Treatment date cannot be more than 1 year ago';
      return true;
    }
  }
} as const;

export const DOCUMENT_UPLOAD_VALIDATION_SCHEMA = {
  claimId: {
    required: 'Claim ID is required',
    pattern: {
      value: /^\d+$/,
      message: 'Claim ID must be a valid number'
    }
  }
} as const;