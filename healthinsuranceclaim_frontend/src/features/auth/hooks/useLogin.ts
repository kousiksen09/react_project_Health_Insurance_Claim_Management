import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../../shared/hooks/useAuth';
import { authApi } from '../services/authApi';
import type { UserRole } from '../../../shared/types';

interface LoginRequest {
  email: string;
  password: string;
}

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const login = async (credentials: LoginRequest) => {
    try {
      setLoading(true);
      setError('');
      const response = await authApi.login(credentials);

      const userData = {
        id: response.userId,
        email: response.email,
        role: response.role as UserRole,
        token: response.token
      };

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      enqueueSnackbar('Login successful! Welcome back.', { variant: 'success' });
    } catch (err: any) {
      const errorMessage = err.message || 'Invalid email or password';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};