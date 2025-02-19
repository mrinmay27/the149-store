import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

if (!supabaseServiceKey) {
  throw new Error('Missing Supabase service key');
}

// Create singleton instances
let supabaseInstance: ReturnType<typeof createClient>;
let adminClientInstance: ReturnType<typeof createClient>;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  }
  return supabaseInstance;
})();

// Create a service role client for admin operations
export const adminClient = (() => {
  if (!adminClientInstance) {
    adminClientInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  }
  return adminClientInstance;
})();

interface SignUpData {
  phone: string;
  pin: string;
  name: string;
  designation: string;
}

// Helper function to create a consistent password
function createUserPassword(pin: string): string {
    return `Store149#${pin}`;  // Simple consistent format
}

// Auth helper functions
export const signUpWithPhone = async (phone: string, pin: string, name: string, designation: string) => {
  try {
    // Clean the phone number
    const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '');
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', cleanPhone)
      .single();

    if (existingUser) {
      throw new Error('An account with this phone number already exists. Please sign in instead.');
    }

    // Create email and password
    const email = `${cleanPhone}@the149.store`;
    const password = createUserPassword(pin);

    // Force Owner designation for admin phone number
    const finalDesignation = cleanPhone === '9999999999' ? 'Owner' : designation;

    console.log('Attempting signup with:', {
      email,
      phone: cleanPhone,
      designation: finalDesignation,
      is_admin: cleanPhone === '9999999999'
    });

    // Create auth user with email
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: null,
        data: {
          phone: cleanPhone,
          name: name,
          designation: finalDesignation,
          is_admin: cleanPhone === '9999999999',
          is_approved: cleanPhone === '9999999999'  // Auto-approve admin
        }
      }
    });

    if (authError) {
      console.error('Detailed auth error:', {
        message: authError.message,
        status: authError.status,
        name: authError.name,
        details: authError
      });
      
      if (authError.message.includes('invalid email')) {
        throw new Error('Server configuration error. Please contact support.');
      }
      throw authError;
    }

    if (!authData?.user) {
      throw new Error('No user data returned from sign up');
    }

    console.log('Auth signup successful:', {
      userId: authData.user.id,
      email: authData.user.email
    });

    // Create profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          phone: cleanPhone,
          pin: pin,
          name: name,
          designation: finalDesignation,
          is_admin: cleanPhone === '9999999999',
          is_approved: cleanPhone === '9999999999'  // Auto-approve admin
        }
      ])
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw profileError;
    }

    console.log('Profile created successfully:', {
      id: profileData.id,
      phone: profileData.phone,
      designation: profileData.designation
    });

    return { data: profileData, error: null };
  } catch (error) {
    console.error('Error in signUpWithPhone:', error);
    return { data: null, error: String(error) };
  }
};

export const signInWithPhone = async (phone: string, pin: string) => {
  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const email = `${cleanPhone}@the149.store`;
    const password = createUserPassword(pin);

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) throw new Error('Invalid PIN. Please check your PIN and try again.');
    if (!authData.session) throw new Error('Sign in failed. Please try again.');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.session.user.id)
      .single();

    if (profileError) throw new Error('Could not fetch your profile. Please try again.');
    if (!profile) throw new Error('Profile not found. Please contact support.');

    if (!profile.is_admin && !profile.is_approved) {
      throw new Error('Your account is pending approval');
    }

    if (profile.phone === '9999999999') {
      profile.designation = 'Owner';
    }

    return { 
      data: { 
        session: authData.session, 
        profile 
      }, 
      error: null 
    };
  } catch (error: any) {
    console.error('Auth error:', error);
    await supabase.auth.signOut();
    return { data: null, error: error.message };
  }
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const approveUser = async (phone: string, shouldApprove: boolean) => {
  try {
    const { error } = await supabase.rpc('approve_user', {
      user_phone: phone,
      should_approve: shouldApprove
    });
    
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Approval error:', error);
    return { error: error.message };
  }
};

// For testing only
export const cleanupDatabase = async () => {
  try {
    const { error } = await supabase.rpc('cleanup_database');
    if (error) throw error;
    await supabase.auth.signOut();
    return { error: null };
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return { error: error.message };
  }
};
