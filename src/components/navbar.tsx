"use client";

import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";
import {
  Sun,
  Moon,
  FileText,
  Search,
  ShieldCheck,
  User,
  LogOut,
} from "lucide-react";

export function Navbar({ onTrackOrderClick }: { onTrackOrderClick?: () => void }) {
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  return (
    <header className="w-full border-b border-line bg-surface/90 backdrop-blur sticky top-0 z-50 transition-colors">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-accent text-on-accent flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading font-bold text-xl tracking-tight text-ink">
            FiscalFlow
          </span>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-muted">
          <a href="#how-it-works" className="hover:text-ink transition-colors">
            How it works
          </a>
          <a href="#pricing" className="hover:text-ink transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-ink transition-colors">
            FAQ
          </a>
          <button
            onClick={onTrackOrderClick || (() => { window.location.href = "/dashboard#history"; })}
            className="flex items-center gap-1.5 hover:text-ink transition-colors"
          >
            <Search className="w-4 h-4 text-muted" />
            <span>Track Order</span>
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Theme toggle pill */}
          <button
            onClick={toggle}
            aria-label="Toggle Theme"
            className="h-10 px-3.5 rounded-full border border-line bg-surface hover:bg-bg text-ink text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4 text-warning" />
                <span>Light mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-muted" />
                <span>Dark mode</span>
              </>
            )}
          </button>

          {/* Admin link pill */}
          <Link
            href="/admin"
            className="h-10 px-3.5 rounded-full border border-line bg-surface hover:bg-bg text-ink text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span>Admin</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href={user?.role === "admin" ? "/admin" : "/dashboard"}
                className="h-10 px-3.5 rounded-full border border-line bg-surface text-ink text-xs font-semibold flex items-center gap-2 hover:bg-bg transition-colors shadow-sm"
              >
                <User className="w-3.5 h-3.5 text-accent" />
                <span>{String(user?.fullName || (user as any)?.full_name || user?.email || "Account").split(" ")[0]}</span>
              </Link>
              <button
                onClick={handleLogout}
                title="Log out"
                className="w-10 h-10 rounded-full border border-line text-muted hover:text-error flex items-center justify-center transition-colors shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="h-10 px-4 rounded-full border border-line bg-surface hover:bg-bg text-ink text-xs font-semibold flex items-center justify-center shadow-sm transition-all"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="h-10 px-4 rounded-full bg-accent text-on-accent text-xs font-semibold flex items-center justify-center hover:opacity-90 shadow-sm transition-all"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
