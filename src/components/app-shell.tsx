import Link from "next/link";
import { Bell, BookOpenCheck, ClipboardCheck, Database, FileText, Map, PlugZap, Radar, ScrollText } from "lucide-react";

import { AuthControls } from "@/components/auth-controls";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Publications", icon: FileText },
  { href: "/review", label: "Review", icon: ClipboardCheck },
  { href: "/product-maps", label: "Product maps", icon: Map },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/digest", label: "Digest", icon: Bell },
  { href: "/sources", label: "Sources", icon: Database },
  { href: "/service-catalogue", label: "Services", icon: BookOpenCheck },
  { href: "/integrations", label: "Config", icon: PlugZap },
  { href: "/audit", label: "Audit", icon: ScrollText },
];

export function AppShell({ children, active = "/" }: { children: React.ReactNode; active?: string }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-white">
              <Radar className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-zinc-950">
                EU Financial Reg Horizon Scanner
              </span>
              <span className="hidden text-xs text-zinc-500 sm:block">MVP foundation</span>
            </span>
          </Link>

          <div className="ml-3 shrink-0">
            <AuthControls />
          </div>
        </div>
        <nav
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-8"
          aria-label="Main navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium",
                  isActive
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
