/**
 * Authentication hooks and context provider
 *
 * Provides authentication state management, sign-in, sign-up, password reset,
 * and session management functionality for the application.
 *
 * @module hooks/useAuth
 * @example
 * ```typescript
 * const { user, signIn, signOut } = useAuth();
 *
 * // Sign in
 * const { error } = await signIn('user@example.com', 'password');
 *
 * // Sign out
 * await signOut();
 * ```
 */

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AuthError, UserMetadata } from "@/types/common";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { logger } from "@/utils/logger";
import {
  getMobilePasswordResetRedirectUrl,
  getMobileSignUpRedirectUrl,
  registerMobileAppResumeHandler,
} from "@/services/mobile/mobileAuthRouting";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    metadata?: UserMetadata,
  ) => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ERROR_FALLBACK: AuthError = {
  message:
    "Something went wrong while communicating with the authentication service.",
};

const normalizeAuthError = (error: unknown): AuthError => {
  if (error && typeof error === "object") {
    const authError = error as {
      message?: string;
      status?: number;
      code?: string;
    };
    return {
      message:
        typeof authError.message === "string" && authError.message.length > 0
          ? authError.message
          : AUTH_ERROR_FALLBACK.message,
      status:
        typeof authError.status === "number" ? authError.status : undefined,
      code: typeof authError.code === "string" ? authError.code : undefined,
    };
  }

  if (typeof error === "string") {
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
    let hasHandledInitialUrl = false;

    const syncSession = async (source: string) => {
      try {
        const url =
          typeof window !== "undefined"
            ? new URL(window.location.href)
            : null;
        const authCode = url?.searchParams.get("code");

        if (!hasHandledInitialUrl && authCode) {
          hasHandledInitialUrl = true;
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(authCode);
          if (error) throw error;

          if (url && typeof window !== "undefined") {
            url.searchParams.delete("code");
            window.history.replaceState(
              window.history.state,
              document.title,
              `${url.pathname}${url.search}${url.hash}`,
            );
          }

          if (!isMounted) return;
          setSession(data.session);
          setUser(data.session?.user ?? null);
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch (error) {
        logger.error("Failed to sync auth session", {
          error,
          context: { source },
          tags: ["error", "auth", "mobile-app-shell"],
        });
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    const unregisterResumeHandler = registerMobileAppResumeHandler(() => {
      syncSession("app_resume").catch((error) => {
        logger.error("Unexpected auth resume error", {
          error,
          tags: ["error", "auth", "mobile-app-shell"],
        });
      });
    });

    syncSession("initial_hydration").catch((error) => {
      logger.error("Unexpected auth initialization error", {
        error,
        tags: ["error"],
      });
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unregisterResumeHandler();
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password
   *
   * @param email - User email address
   * @param password - User password
   * @returns Object with error property (null if successful)
   *
   * @example
   * ```typescript
   * const { error } = await signIn('user@example.com', 'password123');
   * if (error) {
   *   console.error('Sign in failed:', error.message);
   * }
   * ```
   */
  const signIn = async (email: string, password: string) => {
    try {
      // Check if Supabase is configured by checking the config values
      if (
        !SUPABASE_URL ||
        !SUPABASE_ANON_KEY ||
        SUPABASE_URL.includes("placeholder") ||
        SUPABASE_ANON_KEY.includes("placeholder")
      ) {
        const error = {
          message:
            "Supabase is not configured. Please create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. See SETUP_SUPABASE.md for details.",
        };
        toast({
          title: "Configuration Error",
          description: error.message,
          variant: "destructive",
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
        if (
          error.message.includes("Invalid API key") ||
          error.message.includes("invalid_api_key")
        ) {
          errorMessage =
            "Invalid API key. Please check your .env.local file has the correct NEXT_PUBLIC_SUPABASE_ANON_KEY. See SETUP_SUPABASE.md for help.";
        }

        toast({
          title: "Sign In Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return { error: { ...error, message: errorMessage } };
      }

      return { error: null };
    } catch (err) {
      const normalizedError = normalizeAuthError(err);
      toast({
        title: "Sign In Failed",
        description: normalizedError.message,
        variant: "destructive",
      });
      return { error: normalizedError };
    }
  };

  /**
   * Sign up a new user with email and password
   *
   * @param email - User email address
   * @param password - User password
   * @param firstName - User first name
   * @param lastName - User last name
   * @param metadata - Optional user metadata
   * @returns Object with error property (null if successful)
   *
   * @example
   * ```typescript
   * const { error } = await signUp(
   *   'user@example.com',
   *   'password123',
   *   'John',
   *   'Doe'
   * );
   * ```
   */
  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    metadata: UserMetadata = {} as UserMetadata,
  ) => {
    const redirectUrl = getMobileSignUpRedirectUrl();

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
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Check your email",
        description:
          "We've sent you a confirmation link to complete your registration.",
      });

      return { error: null };
    } catch (err) {
      const normalizedError = normalizeAuthError(err);
      toast({
        title: "Sign Up Failed",
        description: normalizedError.message,
        variant: "destructive",
      });
      return { error: normalizedError };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getMobilePasswordResetRedirectUrl(),
      });

      if (error) {
        toast({
          title: "Reset Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });

      return { error: null };
    } catch (err) {
      const normalizedError = normalizeAuthError(err);
      toast({
        title: "Reset Failed",
        description: normalizedError.message,
        variant: "destructive",
      });
      return { error: normalizedError };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          title: "Password Update Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });

      return { error: null };
    } catch (err) {
      const normalizedError = normalizeAuthError(err);
      toast({
        title: "Password Update Failed",
        description: normalizedError.message,
        variant: "destructive",
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
        title: "Signed out",
        description: "You have been successfully signed out.",
      });

      // Ensure we leave any protected UI after logout.
      window.location.href = "/auth";
    } catch (err) {
      const normalizedError = normalizeAuthError(err);
      toast({
        title: "Sign out failed",
        description: normalizedError.message,
        variant: "destructive",
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
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

/**
 * useAuth - Hook to access authentication context
 *
 * Provides access to current user, session, loading state, and authentication methods.
 * Must be used within an AuthProvider.
 *
 * @returns Authentication context with user, session, loading state, and auth methods
 * @throws Error if used outside AuthProvider
 *
 * @example
 * ```typescript
 * const { user, loading, signIn, signOut } = useAuth();
 *
 * if (loading) return <Loading />;
 * if (!user) return <LoginForm />;
 *
 * return <Dashboard user={user} />;
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
