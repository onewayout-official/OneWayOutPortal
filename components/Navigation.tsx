"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, DollarSign, TrendingUp, TrendingDown, FileText, BarChart3, LogOut, Smile, Wallet, HelpCircle, ShoppingCart, Shield, GraduationCap, CalendarCheck, ClipboardList, UserCog, Eye } from "lucide-react";
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
      className={`flex flex-col items-center gap-1 px-4 py-3 transition-colors md:flex-row md:rounded-lg md:px-4 md:py-2.5 md:gap-3 ${
        isActive
          ? "md:bg-white/20 font-semibold"
          : "opacity-80 hover:opacity-100 hover:md:bg-white/10"
      } text-white`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="text-xs font-medium md:text-sm">{label}</span>
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const { logout, isAdmin, isCoachesAdmin } = useAuth();

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

  const allNavItems = visibleSections.flatMap((s) => s.items);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t-2 bg-white dark:bg-gray-900 md:relative md:border-t-0 md:border-r-0 md:min-h-screen md:text-white md:bg-transparent"
      style={{ borderColor: '#2f6064' }}
    >
      {/* Desktop sidebar */}
      <div
        className="hidden md:flex flex-col p-4 gap-6 h-full min-h-screen"
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

      {/* Mobile bottom bar */}
      <div className="flex md:hidden justify-around w-full py-1">
        {allNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-3 transition-colors ${
                isActive ? 'font-semibold' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
              }`}
              style={isActive ? { color: '#2f6064' } : {}}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="flex flex-col items-center gap-1 px-2 py-3 transition-colors text-red-600"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-xs font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}

