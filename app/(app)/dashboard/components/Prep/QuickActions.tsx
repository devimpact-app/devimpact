'use client';

import { ReactNode } from 'react';
import { MessageSquare, ChevronRight, Calendar1 } from 'lucide-react';

type QuickActionsProps = {
  onOneOnOnePrepClick?: () => void;
  onStandupPrepClick?: () => void;
  disableActions: boolean;
  calendarConnected?: boolean;
};

type ActionKey = 'one_on_one' | 'standup';

type ActionConfig = {
  key: ActionKey;
  label: string;
  icon: ReactNode;
  status: 'ready' | 'coming_soon';
};

const ACTIONS: ActionConfig[] = [
  {
    key: 'one_on_one',
    label: '1:1 prep',
    icon: <MessageSquare className="h-4 w-4" />,
    status: 'ready',
  },
  {
    key: 'standup',
    label: 'Standup prep',
    icon: <Calendar1 className="h-4 w-4" />,
    status: 'ready',
  },
];

export function PrepDashboardQuickActions({
  onOneOnOnePrepClick,
  onStandupPrepClick,
  disableActions,
  calendarConnected,
}: QuickActionsProps) {
  const handleClick = (key: ActionKey) => {
    switch (key) {
      case 'standup':
        onStandupPrepClick?.();
        break;
      case 'one_on_one':
        onOneOnOnePrepClick?.();
        break;
    }
  };

  return (
    <section
      className="
  relative overflow-hidden rounded-2xl
  border border-white/10
  bg-[#0B0F18]
  px-4 py-3
"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/6 to-transparent opacity-60" />
      </div>

      <header className="relative flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
            Quick actions
          </h3>
          <p className="mt-1 text-[12.5px] leading-snug text-white/70">
            Generates instantly from recent work.
            <span className="text-white/45">
              {' '}
              Works without calendar — connect later for automation.
            </span>
          </p>
        </div>
      </header>

      <div className="relative mt-3 grid gap-3 sm:grid-cols-2">
        {ACTIONS.map((action) => {
          const isDisabled = action.status === 'coming_soon' || disableActions;

          return (
            <button
              key={action.key}
              type="button"
              onClick={() => handleClick(action.key)}
              disabled={isDisabled}
              className={`
                group flex w-full items-center justify-between gap-3
                rounded-xl border border-white/10 bg-white/[0.03]
                px-3 py-3 text-left
                transition
                hover:bg-white/[0.055]
                hover:border-white/20
                hover:shadow-[0_10px_24px_rgba(0,0,0,0.45)]
                ${isDisabled ? 'cursor-not-allowed opacity-55 hover:bg-white/[0.03] hover:border-white/10 hover:shadow-none' : ''}
              `}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className="
                    flex h-7 w-7 shrink-0 items-center justify-center
                    rounded-lg border border-[#30384A] bg-[#181E2A]
                    relative after:absolute after:inset-0 after:rounded-lg
                    after:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent)]
                  "
                >
                  <div className="text-[#E5EBFF]">{action.icon}</div>
                </div>

                <span className="truncate text-[13px] font-medium text-[#F5F7FF]">
                  {action.label}
                </span>
              </div>

              <ChevronRight
                className={`
  h-4 w-4 shrink-0 transition
  ${isDisabled ? 'text-white/25' : 'text-white/35 group-hover:text-[#7C8BFF]'}
`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
