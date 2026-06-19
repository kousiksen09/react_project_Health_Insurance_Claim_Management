import { useForm } from 'react-hook-form';
import { sanitizeFormData } from '../validation';

/**
 * Enhanced form hook with built-in validation and sanitization
 */
export const useValidatedForm = <T extends Record<string, any>>(
  options?: Parameters<typeof useForm<T>>[0]
) => {
  const form = useForm<T>(options);

  const handleValidatedSubmit = (
    onSubmit: (data: T) => void | Promise<void>
  ) => {
    return form.handleSubmit(async (data) => {
      const sanitizedData = sanitizeFormData(data);
      await onSubmit(sanitizedData);
    });
  };

  return {
    ...form,
    handleValidatedSubmit
  };
};