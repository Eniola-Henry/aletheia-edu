"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { signOut } from "@/lib/auth";

export default function Header() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function handleSignOut() {
    await signOut(supabase);
    setEmail(null);
    window.location.href = "/";
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-md border-b border-ink/10">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between gap-3">
        <Link href="/" className="group flex items-center gap-2 min-w-0">
          <span className="font-serif text-xl sm:text-2xl tracking-tight text-ink group-hover:opacity-70 transition-opacity truncate">
            Aletheia
            <span className="text-ink-soft font-sans text-xs sm:text-sm tracking-greek uppercase ml-1 relative -top-0.5">
              .edu
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link
            href="/dashboard"
            className="hidden sm:inline text-sm text-ink-soft hover:text-ink transition-colors"
          >
            Courses
          </Link>
          {email ? (
            <button
              onClick={handleSignOut}
              className="text-xs sm:text-sm text-ink-soft hover:text-ink max-w-[120px] truncate"
              title={email}
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="text-xs sm:text-sm text-ink-soft hover:text-ink"
            >
              Sign in
            </Link>
          )}
          <Link
            href="/dashboard"
            className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-full border border-ink/80 text-ink text-xs sm:text-sm font-medium hover:bg-ink hover:text-cream transition-colors duration-200"
          >
            Begin
          </Link>
        </div>
      </nav>
    </header>
  );
}
