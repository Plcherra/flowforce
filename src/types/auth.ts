// Authentication related types
export interface AuthFormData {
  email: string;
  password: string;
}

export interface SignUpFormData extends AuthFormData {
  firstName: string;
  lastName: string;
}

export interface InviteData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  birthDate?: string;
  role: string;
}

import type { User, Session } from "@supabase/supabase-js";

export interface AuthContextType {
  user: User | null; // User type from Supabase
  session: Session | null; // Session type from Supabase
  loading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: unknown | null }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    metadata?: Record<string, unknown>,
  ) => Promise<{ error: unknown | null }>;
  signOut: () => Promise<void>;
}
