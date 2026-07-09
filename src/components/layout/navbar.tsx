"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Logo } from "@/components/ui/logo";
import type { NavItem } from "@/lib/types";

interface NavbarProps {
  items: NavItem[];
}

export function Navbar({ items }: NavbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      <div className="container-shell pt-4">
        <div className="rounded-full border border-white/10 bg-slate-950/65 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <Logo />
            <nav className="hidden items-center gap-7 md:flex">
              {items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm text-[var(--foreground-muted)] hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="hidden items-center gap-3 md:flex">
              <ButtonLink href="/sign-in" variant="ghost" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink href="/app" size="sm">
                Enter platform
              </ButtonLink>
            </div>
            <div className="md:hidden">
              <IconButton
                icon={
                  <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-1.5">
                    <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                  </svg>
                }
                label="Open menu"
                onClick={() => setOpen((value) => !value)}
              />
            </div>
          </div>
          <AnimatePresence>
            {open ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="overflow-hidden md:hidden"
              >
                <div className="mt-4 space-y-2 border-t border-white/8 pt-4">
                  {items.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="block rounded-2xl px-3 py-2 text-sm text-[var(--foreground-muted)] hover:bg-white/6 hover:text-white"
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </a>
                  ))}
                  <div className="grid gap-2 pt-2">
                    <ButtonLink href="/sign-in" variant="secondary" size="sm">
                      Sign in
                    </ButtonLink>
                    <ButtonLink href="/app" size="sm">
                      Enter platform
                    </ButtonLink>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
