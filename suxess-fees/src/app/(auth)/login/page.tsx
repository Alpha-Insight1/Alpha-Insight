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
    <div className="min-h-screen flex items-center justify-center bg-[#1a56a8] p-4 sm:p-6">
      {/* Decorative background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-white/5 blur-sm" />
        <div className="absolute left-10 bottom-10 h-96 w-96 rounded-full bg-blue-400/10" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/5" />
      </div>

      <div className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl bg-white min-h-[520px]">
        {/* Left brand panel */}
        <div className="relative hidden md:flex flex-col justify-between bg-gradient-to-br from-[#0c3d7a] via-[#1a56a8] to-[#2b7de0] p-10 text-white">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-white/10" />
            <div className="absolute left-20 bottom-24 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-300/20" />
            <div className="absolute right-10 bottom-10 h-24 w-24 rounded-full bg-white/10" />
          </div>

          <div className="relative z-10">
            <Image
              src="/alpha-insight-logo.jpg"
              alt="Alpha Insight"
              width={56}
              height={56}
              className="rounded-xl object-contain bg-white p-1 shadow"
              priority
            />
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
              fees, outstanding, reports, and more in one place.
            </p>
          </div>

          <p className="relative z-10 text-[11px] text-blue-200/80">
            Strategy &amp; Business Analytics
          </p>
        </div>

        {/* Right form panel */}
        <div className="flex flex-col justify-center p-8 sm:p-10 bg-white">
          <div className="md:hidden flex items-center gap-3 mb-8">
            <Image
              src="/alpha-insight-logo.jpg"
              alt="Alpha Insight"
              width={44}
              height={44}
              className="rounded-lg object-contain"
              priority
            />
            <div>
              <p className="font-bold text-[#0c3d7a]">Alpha Insight</p>
              <p className="text-xs text-gray-500">Director &amp; secretary login</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
            <p className="text-sm text-gray-500 mt-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1a56a8]/30 focus:border-[#1a56a8] transition"
                  placeholder="director@school.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1a56a8]/30 focus:border-[#1a56a8] transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
              className="w-full bg-[#0c3d7a] hover:bg-[#1a56a8] text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 shadow-lg shadow-blue-900/20"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-10">
            For school <span className="font-medium text-gray-500">directors</span>{" "}
            and <span className="font-medium text-gray-500">secretaries</span>
            <br />
            <span className="mt-1 inline-block">
              Powered by{" "}
              <span className="font-semibold text-[#0c3d7a]">Alpha Insight</span>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
