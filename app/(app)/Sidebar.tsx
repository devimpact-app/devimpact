'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  LineChart,
  Users,
  Settings,
  FolderKanban,
  Compass,
  User,
  Target,
  Focus,
  LogOut,
  Sparkle,
  Orbit,
  Lightbulb,
  CalendarClock,
  Icon,
  ClipboardList,
} from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { signOutAction } from './dashboard/actions';
import Image from 'next/image';

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', Icon: Home },
  { href: '/timeline', label: 'Timeline', Icon: CalendarClock },
  { href: '/insights', label: 'Insights', Icon: Lightbulb },
  { href: '/prep', label: 'Prep', Icon: ClipboardList },
];

type SidebarProps = {
  userName?: string | null;
  avatarUrl?: string | null;
};

export function Sidebar({ userName, avatarUrl }: SidebarProps) {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initials =
    userName
      ?.split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  const settingsHref = '/settings';
  const settingsActive = pathname === settingsHref;

  return (
    <nav className="relative flex flex-col bg-gradient-to-b from-indigo-950/40 via-indigo-950/30 to-indigo-950/20 backdrop-blur border-r border-white/15 text-white w-[90px] p-4">
      <div className="relative mx-auto mt-1 mb-6 flex h-11 w-11 items-center justify-center">
        <Image
          src="/images/landing/devimpact-logo-light.svg"
          alt=""
          width={36}
          height={36}
          className="opacity-90 rounded-lg border-2 border-indigo-400"
        />
        {/* <Orbit className="h-7 w-7 text-indigo-400" /> */}
      </div>

      <div className="flex h-full flex-col gap-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'group relative grid place-items-center rounded-xl py-3 transition',
                active
                  ? 'bg-white/15 ring-1 ring-white/20 shadow'
                  : 'hover:bg-white/10'
              )}
              aria-label={label}
              title={label}
            >
              <Icon
                className={clsx(
                  'h-5 w-5 transition',
                  active ? 'text-white' : 'text-blue-200 group-hover:text-white'
                )}
              />
              <span className="pointer-events-none absolute left-[84px] z-10 hidden rounded-md bg-indigo-900 px-2 py-1 text-xs text-white shadow group-hover:block">
                {label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto space-y-2 pt-4">
        <div className="relative flex  justify-center items-center">
          <button
            ref={btnRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen((v) => !v);
              }
            }}
            className={clsx(
              'group grid place-items-center rounded-xl p-2 transition ring-1 ring-white/0',
              open ? 'bg-white/15 ring-white/20' : 'hover:bg-white/10'
            )}
            title={userName || 'Account'}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={userName || 'User avatar'}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-white/20 text-white/90 grid place-items-center text-xs font-semibold">
                {initials}
              </div>
            )}
          </button>

          {open && (
            <div
              ref={menuRef}
              role="menu"
              className="absolute bottom-full left-full z-50 
                 min-w-44 rounded-xl border border-white/10 
                 bg-[#0f1220]/95 backdrop-blur p-1 shadow-2xl"
            >
              <div className="px-3 py-2 text-xs text-white/60">
                {userName || 'Your account'}
              </div>

              <Link
                href="/settings"
                role="menuitem"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>

              <form action={signOutAction}>
                <button
                  type="submit"
                  role="menuitem"
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
