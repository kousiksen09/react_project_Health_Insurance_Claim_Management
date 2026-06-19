let globalErrorState = { message: '', show: false, type: 'error' as 'error' | 'success' };
const subscribers = new Set<(state: typeof globalErrorState) => void>();

export const useGlobalError = () => {
  const subscribe = (callback: (state: typeof globalErrorState) => void) => {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  };

  const showError = (message: string) => {
    globalErrorState = { message, show: true, type: 'error' };
    subscribers.forEach(callback => callback(globalErrorState));
  };

  const showSuccess = (message: string) => {
    globalErrorState = { message, show: true, type: 'success' };
    subscribers.forEach(callback => callback(globalErrorState));
  };

  const hideError = () => {
    globalErrorState = { ...globalErrorState, show: false };
    subscribers.forEach(callback => callback(globalErrorState));
  };

  return { showError, showSuccess, hideError, subscribe, state: globalErrorState };
};