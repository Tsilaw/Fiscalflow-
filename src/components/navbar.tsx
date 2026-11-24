"use client";

import Link from "next/link";
import { useTheme } from "./theme-provider";
import {
  FileText,
  Moon,
  Sun,
  ShieldCheck,
  Search,
  User,
  LogOut,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar({ onTrackOrderClick }: { onTrackOrderClick?: () => void }) {
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  const displayName = String(user?.fullName || (user as any)?.full_name || user?.email || "Account").split(" ")[0];

  return (
    <header className="w-full border-b border-line bg-surface/95 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-2">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0 group">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-accent text-on-accent flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="font-heading font-bold text-lg sm:text-xl tracking-tight text-ink">
            FiscalFlow
          </span>
        </Link>

        {/* Desktop Navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-muted">
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

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Theme toggle pill */}
          <button
            onClick={toggle}
            aria-label="Toggle Theme"
            className="h-9 px-3 rounded-full border border-line bg-surface hover:bg-bg text-ink text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-warning" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-muted" />
                <span>Dark</span>
              </>
            )}
          </button>

          {/* Admin link pill */}
          <Link
            href="/admin"
            className="h-9 px-3.5 rounded-full border border-line bg-surface hover:bg-bg text-ink text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>Admin</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href={user?.role === "admin" ? "/admin" : "/dashboard"}
                className="h-9 px-3.5 rounded-full border border-line bg-surface text-ink text-xs font-semibold flex items-center gap-1.5 hover:bg-bg transition-colors shadow-sm"
              >
                <User className="w-3.5 h-3.5 text-accent" />
                <span>{displayName}</span>
              </Link>
              <button
                onClick={handleLogout}
                title="Log out"
                className="w-9 h-9 rounded-full border border-line text-muted hover:text-error flex items-center justify-center transition-colors shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="h-9 px-3.5 rounded-full border border-line bg-surface hover:bg-bg text-ink text-xs font-semibold flex items-center justify-center shadow-sm transition-all"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="h-9 px-3.5 rounded-full bg-accent text-on-accent text-xs font-semibold flex items-center justify-center hover:opacity-90 shadow-sm transition-all"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Action Buttons (Compact on < 640px) */}
        <div className="flex sm:hidden items-center gap-1.5">
          <button
            onClick={toggle}
            aria-label="Toggle Theme"
            className="w-9 h-9 rounded-full border border-line bg-surface text-ink flex items-center justify-center transition-colors shadow-sm"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-warning" />
            ) : (
              <Moon className="w-4 h-4 text-muted" />
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            className="w-9 h-9 rounded-full border border-line bg-surface text-ink flex items-center justify-center transition-colors shadow-sm"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-line bg-surface px-5 py-5 space-y-4 animate-fade-in-up shadow-xl">
          <div className="space-y-1">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onTrackOrderClick) onTrackOrderClick();
                else window.location.href = "/dashboard#history";
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-bg text-sm font-semibold text-ink text-left"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 text-accent" />
                <span>Track Order</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-muted" />
            </button>

            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block p-3 rounded-xl hover:bg-bg text-sm font-medium text-ink"
            >
              How it works
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block p-3 rounded-xl hover:bg-bg text-sm font-medium text-ink"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block p-3 rounded-xl hover:bg-bg text-sm font-medium text-ink"
            >
              FAQ
            </a>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-bg text-sm font-semibold text-ink"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>Admin Portal</span>
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-accent/10 text-accent">
                Admin
              </span>
            </Link>
          </div>

          <div className="pt-3 border-t border-line">
            {user ? (
              <div className="space-y-2">
                <Link
                  href={user?.role === "admin" ? "/admin" : "/dashboard"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full h-11 px-4 rounded-xl bg-surface-lifted text-ink text-sm font-semibold flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4 text-accent" />
                    <span>{user?.fullName || displayName}</span>
                  </span>
                  <span className="text-xs text-muted">Dashboard →</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full h-10 px-4 rounded-xl border border-line text-error text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-11 rounded-xl border border-line bg-surface text-ink text-xs font-semibold flex items-center justify-center shadow-sm"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-11 rounded-xl bg-accent text-on-accent text-xs font-semibold flex items-center justify-center shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
