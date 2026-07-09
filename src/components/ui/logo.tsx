import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3 text-white", className)}>
      <span className="relative flex size-9 items-center justify-center rounded-2xl border border-sky-200/18 bg-sky-300/10">
        <span className="absolute inset-[7px] rounded-[10px] border border-sky-200/28" />
        <span className="size-2 rounded-full bg-sky-200 shadow-[0_0_20px_rgba(125,211,252,0.7)]" />
      </span>
      <span className="text-base font-semibold tracking-[0.2em] uppercase">Osmion</span>
    </Link>
  );
}
