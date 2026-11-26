import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

export type Role = 'admin' | 'teacher' | 'student' | null;
export type Profile = { id: string; full_name: string; email: string | null; roll_no: string | null; college_name: string; department: string; teaching_subject: string; phone: string; study_year: string };
export type AuthState = {
  user: User | null;
  role: Role;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  retry: () => Promise<void>;
  signOut: () => Promise<void>;
};

// Keep context identity outside the refreshable provider component module.
export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}