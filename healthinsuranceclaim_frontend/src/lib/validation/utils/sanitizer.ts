/**
 * Sanitizes string input by trimming whitespace and removing potentially harmful characters
 */
export const sanitizeString = (value: string): string => {
  return value.trim().replace(/[<>]/g, '');
};

/**
 * Sanitizes all string fields in a form data object
 */
export const sanitizeFormData = <T extends Record<string, any>>(data: T): T => {
  const sanitized = {} as T;
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeString(value) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value;
    }
  }
  
  return sanitized;
};