import { REGEX_PATTERNS, VALIDATION_MESSAGES } from '../constants';

export const BASE_VALIDATION_RULES = {
  email: {
    required: VALIDATION_MESSAGES.REQUIRED.EMAIL,
    pattern: {
      value: REGEX_PATTERNS.EMAIL,
      message: VALIDATION_MESSAGES.INVALID.EMAIL
    },
    maxLength: {
      value: 100,
      message: VALIDATION_MESSAGES.LENGTH.EMAIL_MAX
    }
  },

  password: {
    required: VALIDATION_MESSAGES.REQUIRED.PASSWORD,
    pattern: {
      value: REGEX_PATTERNS.STRONG_PASSWORD,
      message: VALIDATION_MESSAGES.INVALID.PASSWORD
    },
    minLength: {
      value: 8,
      message: VALIDATION_MESSAGES.LENGTH.PASSWORD_MIN
    }
  },

  firstName: {
    required: VALIDATION_MESSAGES.REQUIRED.FIRST_NAME,
    pattern: {
      value: REGEX_PATTERNS.NAME,
      message: VALIDATION_MESSAGES.INVALID.NAME
    },
    minLength: {
      value: 2,
      message: VALIDATION_MESSAGES.LENGTH.NAME_MIN
    },
    maxLength: {
      value: 50,
      message: VALIDATION_MESSAGES.LENGTH.NAME_MAX
    }
  },

  lastName: {
    required: VALIDATION_MESSAGES.REQUIRED.LAST_NAME,
    pattern: {
      value: REGEX_PATTERNS.NAME,
      message: VALIDATION_MESSAGES.INVALID.NAME
    },
    minLength: {
      value: 2,
      message: VALIDATION_MESSAGES.LENGTH.NAME_MIN
    },
    maxLength: {
      value: 50,
      message: VALIDATION_MESSAGES.LENGTH.NAME_MAX
    }
  },

  phone: {
    required: VALIDATION_MESSAGES.REQUIRED.PHONE,
    pattern: {
      value: REGEX_PATTERNS.PHONE_10_DIGIT,
      message: VALIDATION_MESSAGES.INVALID.PHONE
    }
  },

  address: {
    required: VALIDATION_MESSAGES.REQUIRED.ADDRESS,
    minLength: {
      value: 10,
      message: VALIDATION_MESSAGES.LENGTH.ADDRESS_MIN
    },
    maxLength: {
      value: 200,
      message: VALIDATION_MESSAGES.LENGTH.ADDRESS_MAX
    }
  }
} as const;