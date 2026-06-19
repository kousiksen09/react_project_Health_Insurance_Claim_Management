import React, { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { UserRole } from '../types';

interface User {
  id: number;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  token?: string;
  isActive?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      const userData = JSON.parse(storedUser);
      if (userData.isActive !== false) {
        setUser(userData);
      } else {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    logout,
    isAuthenticated: !!user,
    setUser
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};