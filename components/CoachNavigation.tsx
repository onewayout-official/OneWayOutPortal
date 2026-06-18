"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const coachNavItems = [
  { href: "/coach", label: "My Appointments", icon: CalendarCheck },
];

function CoachNavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: typeof CalendarCheck;
  isActive: boolean;
}) {
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

export default function CoachNavigation() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t-2 bg-white dark:bg-gray-900 md:relative md:border-t-0 md:border-r-0 md:min-h-screen md:text-white md:bg-transparent"
      style={{ borderColor: "#2f6064" }}
    >
      <div
        className="hidden md:flex flex-col p-4 gap-6 h-full min-h-screen"
        style={{ backgroundColor: "#2f6064" }}
      >
        <div>
          <h3 className="px-4 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "#efc19e" }}>
            Coach Portal
          </h3>
          <div className="flex flex-col gap-0.5 mt-1">
            {coachNavItems.map((item) => (
              <CoachNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={pathname === item.href}
              />
            ))}
          </div>
        </div>

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

      <div className="flex md:hidden justify-around w-full py-1">
        {coachNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-4 py-3 transition-colors ${
              pathname === item.href
                ? "font-semibold"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
            }`}
            style={pathname === item.href ? { color: "#2f6064" } : {}}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
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
