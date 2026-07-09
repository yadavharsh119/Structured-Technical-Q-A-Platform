"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DashboardSidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 flex-col border-r border-white/8 bg-slate-950/55 p-6 backdrop-blur-xl lg:flex">
      <Logo href="/app" />
      <div className="mt-8 space-y-1">
        {items.map((item) => {
          const isActive =
            item.href === "/app"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.status === "ready" ? item.href : "#"}
              className={cn(
                "group flex items-center justify-between rounded-2xl px-4 py-3",
                item.status === "ready"
                  ? isActive
                    ? "bg-white/10 text-white"
                    : "text-[var(--foreground-muted)] hover:bg-white/6 hover:text-white"
                  : "cursor-not-allowed text-slate-500",
              )}
              aria-disabled={item.status === "upcoming"}
            >
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                {item.description ? (
                  <p className="mt-1 text-xs opacity-80">{item.description}</p>
                ) : null}
              </div>
              {item.status === "upcoming" ? (
                <Badge className="px-2 py-0.5 text-[10px]">Soon</Badge>
              ) : null}
            </Link>
          );
        })}
      </div>
      <div className="mt-auto rounded-[28px] border border-white/10 bg-white/4 p-4">
        <p className="text-xs font-semibold tracking-[0.22em] text-sky-200 uppercase">
          Platform note
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
          This shell is wired to typed mock contracts so live services can replace the seam cleanly.
        </p>
      </div>
    </aside>
  );
}
