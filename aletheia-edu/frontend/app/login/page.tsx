"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { signInWithEmail, signUpWithEmail, ensureSession } from "@/lib/auth";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Use a valid email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "up") {
        await signUpWithEmail(supabase, email.trim(), password);
        toast.success("Account created. You can continue.");
      } else {
        await signInWithEmail(supabase, email.trim(), password);
        toast.success("Signed in.");
      }
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Auth failed. Check Email provider is enabled in Supabase.");
    } finally {
      setBusy(false);
    }
  }

  async function continueAsGuest() {
    setBusy(true);
    try {
      await ensureSession(supabase);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Could not start guest session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">
      <div className="text-center space-y-2">
        <p className="text-xs tracking-greek uppercase text-ink-faint">Account</p>
        <h1 className="font-serif text-3xl text-ink">
          {mode === "in" ? "Sign in" : "Create account"}
        </h1>
        <p className="text-sm text-ink-soft">
          Optional — you can also continue as a guest. Courses are saved to the account you use when you forge them.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-3.5 rounded-xl border border-ink/20 bg-cream text-ink focus:outline-none focus:border-ink"
          required
          autoComplete="email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 6)"
          className="w-full p-3.5 rounded-xl border border-ink/20 bg-cream text-ink focus:outline-none focus:border-ink"
          required
          minLength={6}
          autoComplete={mode === "up" ? "new-password" : "current-password"}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3.5 rounded-full bg-ink text-cream font-medium hover:bg-ink-soft transition-colors disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="text-center space-y-3">
        <button
          type="button"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="text-sm text-ink-soft hover:text-ink"
        >
          {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
        <div className="greek-rule max-w-[120px] mx-auto" />
        <button
          type="button"
          onClick={continueAsGuest}
          disabled={busy}
          className="text-sm text-ink hover:underline disabled:opacity-50"
        >
          Continue as guest
        </button>
        <div>
          <Link href="/" className="text-xs text-ink-faint hover:text-ink">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
