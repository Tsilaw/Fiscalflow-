"use client";

import { Navbar } from "@/components/navbar";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
        }),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = {};
        }
      } else {
        const text = await res.text().catch(() => "");
        if (res.status === 502) {
          data = { error: "Service is temporarily spinning up (502 Bad Gateway). Please wait 15 seconds and try again." };
        } else if (res.status === 503) {
          data = { error: "Service is temporarily unavailable. Please retry in a few moments." };
        } else {
          data = { error: text.slice(0, 150) || `Server error (${res.status} ${res.statusText})` };
        }
      }

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      console.error("[REGISTER_CLIENT_ERROR]", err);
      setError(err?.message || "Unable to reach server. Please check your connection or wait a few seconds if service is spinning up.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col transition-colors">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-[460px] rounded-3xl bg-surface border border-line p-7 sm:p-10 shadow-xl transition-all">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mx-auto mb-3 shadow-sm">
              <FileText className="w-6 h-6 text-accent" />
            </div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink tracking-tight">
              Create an account
            </h1>
            <p className="text-muted text-xs sm:text-sm mt-1.5">
              Start converting your Ethiopian fiscal exports into balanced Excel files.
            </p>
          </div>

          {/* Error notification */}
          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-error/10 border border-error/20 text-error text-xs font-medium flex items-center gap-2.5 animate-fade-in-up">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Abebe Bikila"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-line bg-surface-lifted/40 text-ink text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="abebe@company.com"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-line bg-surface-lifted/40 text-ink text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Phone Number (optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0911 234 567"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-line bg-surface-lifted/40 text-ink text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-9 pr-8 rounded-xl border border-line bg-surface-lifted/40 text-ink text-xs sm:text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-line bg-surface-lifted/40 text-ink text-xs sm:text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-3 rounded-full bg-accent text-on-accent font-semibold text-sm hover:opacity-90 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? "Creating your account..." : "Create Account"}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Footer switch to login */}
          <div className="mt-6 text-center text-xs text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-accent font-semibold hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
