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

export interface AuthContextType {
  user: any; // Replace with proper user type from Supabase
  session: any; // Replace with proper session type from Supabase
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, metadata?: any) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
}