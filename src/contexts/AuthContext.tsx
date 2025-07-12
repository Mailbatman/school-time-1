import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { createClient } from '@/util/supabase/component';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from 'next/router';

export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT_STUDENT';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
}

interface AuthContextType {
  user: SupabaseUser | null;
  userProfile: UserProfile | null;
  createUser: (user: SupabaseUser, firstName?: string, lastName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  initializing: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  createUser: async () => {},
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  initializing: true
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const supabase = createClient();
  const { toast } = useToast();

  const fetchUserProfile = async (user: SupabaseUser | null) => {
    if (!user) {
      setUserProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('User')
        .select('id, email, firstName, lastName, role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('Could not fetch user profile:', error.message);
        setUserProfile(null);
        return;
      }
      
      setUserProfile(data as UserProfile);
    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      await fetchUserProfile(user);
      setInitializing(false);
    };

    fetchSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setTimeout(async () => {
        const authUser = session?.user ?? null;
        setUser(authUser);
        await fetchUserProfile(authUser);
        setInitializing(false);
      }, 0);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const createUser = async (user: SupabaseUser, firstName?: string, lastName?: string) => {
    try {
      const { data, error } = await supabase
        .from('User')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      if (!data) {
        const { error: insertError } = await supabase
          .from('User')
          .insert({
            id: user.id,
            email: user.email,
            firstName,
            lastName,
            role: 'PARENT_STUDENT',
          });
        if (insertError) {
          throw insertError;
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create user profile",
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      await fetchUserProfile(data.user);
    }
    
    if (error) {
      throw error;
    } else {
      toast({
        title: "Success",
        description: "You have successfully signed in",
      });
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (data.user) {
      await createUser(data.user, firstName, lastName);
    }

    if (error) {
      throw error;
    } else {
      toast({
        title: "Success",
        description: "Sign up successful! Please login to continue.",
      });
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      setUserProfile(null);
      toast({
        title: "Success",
        description: "You have successfully signed out",
      });
      router.push('/');
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      createUser,
      signIn,
      signUp,
      signOut,
      resetPassword,
      initializing,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);