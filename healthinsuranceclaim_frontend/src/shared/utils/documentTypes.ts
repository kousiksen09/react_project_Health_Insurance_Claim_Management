export const DOCUMENT_TYPES = {
  BILL: 'bills',
  PRESCRIPTION: 'prescriptions', 
  REPORT: 'reports',
  ADDITIONAL: 'additional_documents'
} as const;

export const DOCUMENT_TYPE_OPTIONS = [
  { value: DOCUMENT_TYPES.BILL, label: 'Medical Bill' },
  { value: DOCUMENT_TYPES.PRESCRIPTION, label: 'Prescription' },
  { value: DOCUMENT_TYPES.REPORT, label: 'Medical Report' },
  { value: DOCUMENT_TYPES.ADDITIONAL, label: 'Additional Document' }
] as const;