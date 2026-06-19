import { BASE_VALIDATION_RULES } from '../rules/baseRules';

export const CLAIM_OFFICER_VALIDATION_SCHEMA = {
  firstName: BASE_VALIDATION_RULES.firstName,
  lastName: BASE_VALIDATION_RULES.lastName,
  email: BASE_VALIDATION_RULES.email,
  password: BASE_VALIDATION_RULES.password
} as const;