import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { BudgetProfile } from "@/lib/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const saveProfile = async (profile: BudgetProfile) => {
    if (!user) return;
    await supabase.from("profiles").update({
      budget_profile: profile as any,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
  };

  const loadProfile = async (): Promise<BudgetProfile | null> => {
    if (!user) return null;
    const { data } = await supabase.from("profiles").select("budget_profile").eq("id", user.id).single();
    return (data?.budget_profile as unknown as BudgetProfile) ?? null;
  };

  return { user, loading, signUp, signIn, signOut, saveProfile, loadProfile };
}
