"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, DollarSign, TrendingUp, TrendingDown, FileText, BarChart3, LogOut, Smile, Wallet, HelpCircle, ShoppingCart, Shield, GraduationCap, CalendarCheck, ClipboardList, UserCog, Eye, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: Home },
      { href: "/financial-plan", label: "Financial Information", icon: BarChart3 },
      { href: "/my-1-plan", label: "FNA", icon: ClipboardList },
      { href: "/book-financial-session", label: "Book Financial Planning Session", icon: CalendarCheck },
    ],
  },
  {
    label: "Actions",
    items: [
      { href: "/mood", label: "Mood", icon: Smile },
      { href: "/earn", label: "Earn", icon: DollarSign },
      { href: "/budget", label: "Budget", icon: Wallet },
      { href: "/help-me", label: "Help me", icon: HelpCircle },
      { href: "/course", label: "Course", icon: GraduationCap },
      { href: "/spend", label: "Spend", icon: ShoppingCart },
      { href: "/review-debt", label: "Review debt", icon: FileText },
    ],
  },
  
  {
    label: "My Money",
    items: [
      { href: "/income", label: "Income", icon: TrendingUp },
      { href: "/expenses", label: "Expenses", icon: TrendingDown },
      
    ],
  },
  {
    label: "My Net Worth",
    items: [
      { href: "/assets", label: "Assets", icon: DollarSign },
      
      { href: "/debts", label: "Debts", icon: FileText },
    ],
  },
  
  {
    label: "Account",
    items: [
      { href: "/profile", label: "Profile", icon: User },
    ],
  },
];

function NavLink({ href, label, icon: Icon, isActive }: { href: string; label: string; icon: typeof Home; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={`flex w-full flex-row items-center gap-3 rounded-lg px-4 py-2.5 text-left transition-colors ${
        isActive
          ? "bg-white/20 font-semibold"
          : "opacity-80 hover:bg-white/10 hover:opacity-100"
      } text-white`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const { logout, isAdmin, isCoachesAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const visibleSections = navSections.map((section) => {
    if (section.label !== "Account") return section;
    const items = [...section.items];
    if (isAdmin) items.push({ href: "/admin", label: "Admin", icon: Shield });
    if (isCoachesAdmin) {
      items.push({ href: "/admin/coaches", label: "Manage Coaches", icon: UserCog });
      items.push({ href: "/coach/demo", label: "Coach Demo", icon: Eye });
    }
    return { ...section, items };
  });

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileMenuOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#2f6064] text-white shadow-lg md:hidden"
        aria-label="Open navigation menu"
        aria-expanded={isMobileMenuOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          />

          <nav
            className="relative flex h-full w-[min(20rem,85vw)] flex-col overflow-y-auto p-4 text-white shadow-2xl"
            style={{ backgroundColor: '#2f6064' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wide text-white/80">Menu</span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-6">
              {visibleSections.map((section) => (
                <div key={section.label}>
                  <h3 className="px-4 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: '#efc19e' }}>
                    {section.label}
                  </h3>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <NavLink
                          key={item.href}
                          href={item.href}
                          label={item.label}
                          icon={item.icon}
                          isActive={isActive}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-4">
              <button
                onClick={logout}
                className="flex w-full flex-row items-center gap-3 rounded-lg border border-white/15 px-4 py-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      <nav className="hidden md:relative md:block md:min-h-screen md:text-white md:bg-transparent">
        {/* Desktop sidebar */}
        <div
          className="flex flex-col p-4 gap-6 h-full min-h-screen"
          style={{ backgroundColor: '#2f6064' }}
        >
        {visibleSections.map((section) => (
          <div key={section.label}>
            <h3 className="px-4 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: '#efc19e' }}>
              {section.label}
            </h3>
            <div className="flex flex-col gap-0.5 mt-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={isActive}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout at bottom */}
        <div className="mt-auto pt-4 border-t border-white/20">
          <button
            onClick={logout}
            className="flex flex-row w-full items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-white/70 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
      </nav>
    </>
  );
}

