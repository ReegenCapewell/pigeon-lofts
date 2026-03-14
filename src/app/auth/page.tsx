"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const text = await res.text();
        if (res.ok) {
          setMessage("Signed up! Now switch to Log in.");
        } else {
          setMessage(`Signup error ${res.status}: ${text}`);
        }
      } else {
        const res = await signIn("credentials", { redirect: false, email, password });
        if (res?.ok) {
          setMessage("Logged in! Redirecting...");
          router.push("/");
        } else {
          setMessage("Invalid email or password.");
        }
      }
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            LoftTracker
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Racing pigeon management
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm shadow-black/5 dark:shadow-slate-950/50">
          <h2 className="text-lg font-semibold mb-1 text-slate-900 dark:text-slate-50">
            {mode === "signup" ? "Create an account" : "Welcome back"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            {mode === "signup"
              ? "Set up access so you can manage lofts and birds."
              : "Log in to manage lofts and birds."}
          </p>

          <div className="flex gap-2 mb-5 text-sm">
            <button
              type="button"
              className={`flex-1 py-2 rounded-full border text-center transition font-medium ${
                mode === "signup"
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500"
              }`}
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
            <button
              type="button"
              className={`flex-1 py-2 rounded-full border text-center transition font-medium ${
                mode === "login"
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500"
              }`}
              onClick={() => setMode("login")}
            >
              Log in
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            <div>
              <label className="block text-xs mb-1 font-medium text-slate-600 dark:text-slate-400">
                Email
              </label>
              <input
                className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
              />
            </div>
            <div>
              <label className="block text-xs mb-1 font-medium text-slate-600 dark:text-slate-400">
                Password
              </label>
              <input
                className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium mt-2 transition disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
            </button>
          </form>

          {message && (
            <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5">
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
