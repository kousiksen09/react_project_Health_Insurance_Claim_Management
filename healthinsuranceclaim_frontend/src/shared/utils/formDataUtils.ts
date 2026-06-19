/**
 * Converts an object to FormData with PascalCase keys for backend compatibility
 * @param data - Object to convert
 * @returns FormData instance
 */
export const createFormData = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const backendKey = key.charAt(0).toUpperCase() + key.slice(1);
      if (value instanceof File) {
        formData.append(backendKey, value);
      } else {
        formData.append(backendKey, value.toString());
      }
    }
  });
  
  return formData;
};