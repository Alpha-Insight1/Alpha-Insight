"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  AlertCircle,
  Receipt,
  Wallet,
  UserCog,
  Package,
  Contact,
  BookOpen,
  ClipboardCheck,
  Banknote,
  GraduationCap,
  ListChecks,
  Award,
  Bus,
  MessageCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show?: "all" | "admin" | "secretary";
};

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, show: "all" },
  { href: "/messages", label: "Messages", icon: MessageCircle, show: "all" },
  { href: "/payments", label: "Record Payment", icon: CreditCard, show: "all" },
  { href: "/outstanding", label: "Outstanding", icon: AlertCircle, show: "all" },
  { href: "/fee-tracker", label: "Fees Tracker", icon: ListChecks, show: "all" },
  { href: "/students", label: "Students", icon: Users, show: "all" },
  { href: "/receipts", label: "Receipts", icon: Receipt, show: "all" },
  { href: "/school-bus", label: "School Bus", icon: Bus, show: "all" },
  { href: "/exam-register", label: "Exam Register", icon: ClipboardCheck, show: "all" },
  { href: "/expenses", label: "Expenses", icon: Wallet, show: "all" },
  { href: "/teacher-pay", label: "Teacher Daily Pay", icon: BookOpen, show: "all" },
  { href: "/private-lessons", label: "Private Lessons", icon: GraduationCap, show: "all" },
  { href: "/inventory", label: "Inventory", icon: Package, show: "all" },
  { href: "/scholarships", label: "Scholarships", icon: Award, show: "admin" },
  { href: "/parents", label: "Parents · SMS", icon: Contact, show: "admin" },
  { href: "/loans", label: "Teacher Loans", icon: Banknote, show: "admin" },
  { href: "/staff", label: "Staff & Salaries", icon: UserCog, show: "admin" },
];

export function Sidebar({
  roleLabel,
  campusLabel,
  isAdminUser,
}: {
  roleLabel?: string;
  campusLabel?: string;
  isAdminUser?: boolean;
  isMainCampus?: boolean;
  isTutorialCampus?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const visible = navItems.filter((item) => {
    if (!item.show || item.show === "all") return true;
    if (item.show === "admin") return !!isAdminUser;
    if (item.show === "secretary") return !isAdminUser;
    return true;
  });

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Image
            src="/alpha-insight-logo.jpg"
            alt="Alpha Insight"
            width={48}
            height={48}
            className="rounded-xl object-contain shadow-md bg-white p-1 ring-1 ring-slate-200"
            priority
          />
          <div className="min-w-0">
            <p className="font-bold text-slate-800 dark:text-white text-sm tracking-tight truncate">
              Alpha Insight
            </p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">
              School OS
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-slate-50/90 dark:bg-white/5 border border-slate-100/80 dark:border-white/5 px-3 py-2.5">
          <p className="text-xs font-semibold text-slate-700 truncate">
            {roleLabel || "User"}
          </p>
          <p className="text-[10px] text-slate-400 truncate">
            {campusLabel || "School"}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
        {visible.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 dark:bg-indigo-500 dark:text-white"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  active ? "text-white dark:text-white" : "text-slate-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100 space-y-2">
        <ThemeToggle className="w-full justify-center border-slate-200 bg-white text-slate-600 hover:bg-slate-50" />
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/50 flex items-center px-3 gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl text-slate-700 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Image
          src="/alpha-insight-logo.jpg"
          alt="Alpha Insight"
          width={28}
          height={28}
          className="rounded-lg object-contain bg-white p-0.5 border border-slate-200"
        />
        <span className="text-slate-800 font-semibold text-sm truncate">
          Alpha Insight
        </span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-white flex flex-col shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 p-2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <NavLinks mobile />
          </aside>
        </div>
      )}

      {/* Desktop — light sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl border-r border-slate-200/60 dark:border-white/5 flex-col z-30 shadow-[1px_0_0_rgba(15,23,42,0.03)]">
        <NavLinks />
      </aside>
    </>
  );
}
