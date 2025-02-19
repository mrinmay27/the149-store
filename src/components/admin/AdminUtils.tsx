import { useEffect } from 'react';
import { supabase, cleanupDatabase } from '@/lib/supabase';

declare global {
  interface Window {
    supabase: typeof supabase;
    adminUtils: {
      cleanupDatabase: () => Promise<{ error: string | null }>;
    };
  }
}

export const AdminUtils = () => {
  useEffect(() => {
    // Expose supabase client and admin utilities to window object
    window.supabase = supabase;
    window.adminUtils = {
      cleanupDatabase,
    };

    return () => {
      // Cleanup when component unmounts
      delete window.supabase;
      delete window.adminUtils;
    };
  }, []);

  return null; // This component doesn't render anything
};

export default AdminUtils; 