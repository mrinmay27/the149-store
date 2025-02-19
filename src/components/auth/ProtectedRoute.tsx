import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import Loading from '../ui/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsAuthenticated(false);
          return;
        }

        // If we have a session but no userProfile, fetch it
        if (!userProfile) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, designation, phone, is_admin, is_approved, avatar_url')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUserProfile({
              id: String(profile.id),
              name: String(profile.name),
              designation: String(profile.designation),
              phone: String(profile.phone),
              is_admin: Boolean(profile.is_admin),
              is_approved: Boolean(profile.is_approved),
              avatar_url: profile.avatar_url ? String(profile.avatar_url) : undefined
            });
          } else {
            // If no profile exists, sign out
            await supabase.auth.signOut();
            setIsAuthenticated(false);
            return;
          }
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        navigate('/auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, setUserProfile, userProfile]);

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 