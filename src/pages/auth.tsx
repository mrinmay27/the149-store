import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '@/components/auth/AuthForm';
import { getCurrentUser } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-store';

const AuthPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    checkAuth();
    // Apply theme class to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const checkAuth = async () => {
    const user = await getCurrentUser();
    if (user) {
      navigate('/');
    }
  };

  const handleAuthSuccess = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <AuthForm onAuthSuccess={handleAuthSuccess} />
    </div>
  );
};

export default AuthPage; 