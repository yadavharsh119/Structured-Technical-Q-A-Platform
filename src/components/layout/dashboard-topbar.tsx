import { IconButton } from "@/components/ui/icon-button";
import type { UserProfile } from "@/lib/types";

export function DashboardTopbar({ profile }: { profile: UserProfile }) {
  return (
    <div className="flex flex-col gap-4 border-b border-white/8 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="rounded-full border border-white/8 bg-white/4 px-4 py-3 text-sm text-[var(--foreground-muted)]">
        Search, command, or jump to a surface
      </div>
      <div className="flex items-center justify-between gap-4 lg:justify-end">
        <div className="text-right">
          <p className="text-sm font-medium text-white">{profile.name}</p>
          <p className="text-xs text-[var(--foreground-muted)]">
            {profile.role} · {profile.team}
          </p>
        </div>
        <IconButton
          label="Open account menu"
          icon={
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-sky-300/18 text-sm font-semibold text-sky-100">
              {profile.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
          }
        />
      </div>
    </div>
  );
}
