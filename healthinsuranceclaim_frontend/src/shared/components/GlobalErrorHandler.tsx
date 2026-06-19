import { useGlobalError } from '../hooks/useGlobalError';
import { Alert, Snackbar } from '@mui/material';

export const GlobalErrorHandler = () => {
  const { state, hideError } = useGlobalError();

  return (
    <Snackbar
      open={state.show}
      autoHideDuration={6000}
      onClose={hideError}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert onClose={hideError} severity={state.type}>
        {state.message}
      </Alert>
    </Snackbar>
  );
};