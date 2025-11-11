"use client";
import { useState } from "react";
import { signOutAction } from "../actions";
import { Menu } from "lucide-react";

export function SimpleMenu({ user }) {
  const [open, setOpen] = useState(false);
  const initials = (user.name?.split(" ") || [])
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        className="inline-flex items-center justify-center h-8 w-8 flex-none shrink-0 rounded-full border border-border bg-background cursor-pointer"
      >
        <Menu className="h-5 w-5 text-text-primary" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-surface-alt p-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)] z-50">
          <a
            href="/settings/integrations"
            className="block rounded-lg px-3 py-2 text-sm text-text-primary hover:bg-background/60"
          >
            Integrations
          </a>
          <form className="mt-1" action={signOutAction}>
            <button
              type="submit"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-text-secondary hover:bg-background/60 hover:text-text-primary"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
