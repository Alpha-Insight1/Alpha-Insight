"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Soft pastel background (matches app) */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-[#dbeafe] via-[#eef4fb] to-[#e0e7ff] dark:from-[#0b1220] dark:via-[#0f172a] dark:to-[#1e1b4b]" />
      <div className="pointer-events-none fixed -left-24 top-10 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl dark:bg-indigo-900/30" />
      <div className="pointer-events-none fixed -right-16 bottom-0 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl dark:bg-blue-900/20" />

      <div className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/60 dark:shadow-black/40 border border-white/60 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl min-h-[520px]">
        {/* Left brand panel */}
        <div className="relative hidden md:flex flex-col justify-between bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-10 text-white">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-white/10" />
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-white/10" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex rounded-2xl bg-white p-2 shadow-lg">
              <Image
                src="/alpha-insight-logo.jpg"
                alt="Alpha Insight"
                width={64}
                height={64}
                className="rounded-xl object-contain"
                priority
              />
            </div>
          </div>

          <div className="relative z-10 space-y-3">
            <p className="text-xs font-semibold tracking-[0.2em] text-blue-100 uppercase">
              Welcome
            </p>
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
              Alpha Insight
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed max-w-xs">
              School operations &amp; analytics for directors and secretaries —
              clear numbers, calm interface.
            </p>
          </div>

          <p className="relative z-10 text-[11px] text-blue-100/80">
            Strategy &amp; Business Analytics
          </p>
        </div>

        {/* Right form */}
        <div className="flex flex-col justify-center p-8 sm:p-10">
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="rounded-2xl bg-white p-1.5 shadow border border-slate-100">
              <Image
                src="/alpha-insight-logo.jpg"
                alt="Alpha Insight"
                width={52}
                height={52}
                className="rounded-xl object-contain"
                priority
              />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white">
                Alpha Insight
              </p>
              <p className="text-xs text-slate-500">Director &amp; secretary</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Sign in
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Access your school dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-sm p-3 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                  placeholder="director@school.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 shadow-lg shadow-indigo-500/25"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-10">
            For school directors and secretaries
            <br />
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              Alpha Insight
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
