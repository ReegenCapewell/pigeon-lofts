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
        // Use our custom signup API
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
        // Use NextAuth for login
        const res = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });
        if (res?.ok) {
          setMessage("Logged in! Redirecting...");
          router.push("/lofts"); // ⬅ redirect to lofts page
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
    <main className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm bg-slate-900/80 border border-slate-700 rounded-2xl p-6 shadow-lg shadow-slate-950/50">
        <h1 className="text-xl font-semibold mb-1 text-slate-50">
          {mode === "signup" ? "Create an account" : "Welcome back"}
        </h1>
        <p className="text-xs text-slate-400 mb-4">
          {mode === "signup"
            ? "Set up access so you can manage lofts and birds."
            : "Log in to manage lofts and birds."}
        </p>

        <div className="flex gap-2 mb-5 text-sm">
          <button
            type="button"
            className={`flex-1 py-2 rounded-full border text-center transition ${
              mode === "signup"
                ? "bg-sky-500 text-white border-sky-500"
                : "border-slate-600 hover:border-sky-500"
            }`}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded-full border text-center transition ${
              mode === "login"
                ? "bg-sky-500 text-white border-sky-500"
                : "border-slate-600 hover:border-sky-500"
            }`}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs mb-1 text-slate-300">Email</label>
            <input
              className="w-full border border-slate-700 bg-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-slate-300">
              Password
            </label>
            <input
              className="w-full border border-slate-700 bg-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-full border border-sky-500 bg-sky-500 text-white text-sm font-medium mt-3 hover:bg-sky-400 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "signup"
              ? "Create account"
              : "Log in"}
          </button>
        </form>

        {message && (
          <p className="mt-3 text-xs text-slate-300 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
