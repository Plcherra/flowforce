
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AuthError, UserMetadata } from '@/types/common';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, metadata?: UserMetadata) => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ERROR_FALLBACK: AuthError = {
  message: 'Something went wrong while communicating with the authentication service.',
};

const normalizeAuthError = (error: unknown): AuthError => {
  if (error && typeof error === 'object') {
    const authError = error as { message?: string; status?: number; code?: string };
    return {
      message: typeof authError.message === 'string' && authError.message.length > 0 ? authError.message : AUTH_ERROR_FALLBACK.message,
      status: typeof authError.status === 'number' ? authError.status : undefined,
      code: typeof authError.code === 'string' ? authError.code : undefined,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return AUTH_ERROR_FALLBACK;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    const hydrateSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch (error) {
        console.error('Failed to hydrate auth session', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    hydrateSession().catch((error) => {
      console.error('Unexpected auth initialization error', error);
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Check if Supabase is configured by checking the config values
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY || 
          SUPABASE_URL.includes('placeholder') || 
          SUPABASE_ANON_KEY.includes('placeholder')) {
        const error = {
          message: 'Supabase is not configured. Please create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. See SETUP_SUPABASE.md for details.',
        };
        toast({
          title: 'Configuration Error',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Provide more helpful error messages
        let errorMessage = error.message;
        if (error.message.includes('Invalid API key') || error.message.includes('invalid_api_key')) {
          errorMessage = 'Invalid API key. Please check your .env.local file has the correct NEXT_PUBLIC_SUPABASE_ANON_KEY. See SETUP_SUPABASE.md for help.';
        }
        
        toast({
          title: 'Sign In Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        return { error: { ...error, message: errorMessage } };
      }

      return { error: null };
    } catch (err) {
      const normalizedError = normalizeAuthError(err);
      toast({
        title: 'Sign In Failed',
        description: normalizedError.message,
        variant: 'destructive',
      });
      return { error: normalizedError };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    metadata: UserMetadata = {} as UserMetadata,
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            ...metadata,
          },
        },
      });

      if (error) {
        toast({
          title: 'Sign Up Failed',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }

      toast({
        title: 'Check your email',
        description: "We've sent you a confirmation link to complete your registration.",
      });

      return { error: null };
    } catch (err) {
      const normalizedError = normalizeAuthError(err);
      toast({
        title: 'Sign Up Failed',
        description: normalizedError.message,
        variant: 'destructive',
      });
      return { error: normalizedError };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        toast({
          title: 'Reset Failed',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }

      toast({
        title: 'Check your email',
        description: "We've sent you a password reset link.",
      });

      return { error: null };
    } catch (err) {
      const normalizedError = normalizeAuthError(err);
      toast({
        title: 'Reset Failed',
        description: normalizedError.message,
        variant: 'destructive',
      });
      return { error: normalizedError };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          title: 'Password Update Failed',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }

      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated.',
      });

      return { error: null };
    } catch (err) {
      const normalizedError = normalizeAuthError(err);
      toast({
        title: 'Password Update Failed',
        description: normalizedError.message,
        variant: 'destructive',
      });
      return { error: normalizedError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
    } catch (err) {
      const normalizedError = normalizeAuthError(err);
      toast({
        title: 'Sign out failed',
        description: normalizedError.message,
        variant: 'destructive',
      });
    }
  };

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
