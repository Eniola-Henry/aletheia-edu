import { SupabaseClient } from "@supabase/supabase-js";

/**
 * ensureSession — current user, or anonymous sign-in if none.
 * Also ensures public.profiles row for FK safety.
 *
 * Requires: Anonymous Sign-ins enabled in Supabase
 * (Auth → Providers → Anonymous).
 * Optional: Email provider for sign-up / sign-in.
 */
export async function ensureSession(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  let currentUser = user;

  if (!currentUser) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("Anonymous sign-in failed:", error.message);
      throw error;
    }
    currentUser = data.user;
  }

  if (!currentUser) {
    throw new Error("Could not establish a session");
  }

  try {
    const name =
      currentUser.email?.split("@")[0] ||
      currentUser.user_metadata?.full_name ||
      "Learner";
    await supabase.from("profiles").upsert(
      { id: currentUser.id, full_name: name },
      { onConflict: "id" }
    );
  } catch (profileErr) {
    console.warn("Could not upsert profile:", profileErr);
  }

  return currentUser;
}

export async function signUpWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string
) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (data.user) {
    await supabase.from("profiles").upsert(
      { id: data.user.id, full_name: email.split("@")[0] },
      { onConflict: "id" }
    );
  }
  return data;
}

export async function signInWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string
) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut(supabase: SupabaseClient) {
  await supabase.auth.signOut();
}
