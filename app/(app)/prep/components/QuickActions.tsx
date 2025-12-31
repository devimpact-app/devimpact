'use client';

import { ReactNode } from 'react';
import {
  ClipboardList,
  MessageSquare,
  ArrowUpCircle,
  Briefcase,
  Sparkles,
  Hourglass,
  ChevronRight,
  Calendar1,
  ListChecks,
  RotateCcw,
} from 'lucide-react';

type QuickActionsProps = {
  onOneOnOnePrepClick?: () => void;
  onStandupPrepClick?: () => void;
  onRetroPrepClick?: () => void;
  onPlanningPrepClick?: () => void;
};

type ActionKey = 'one_on_one' | 'standup' | 'retro' | 'planning';

type ActionConfig = {
  key: ActionKey;
  label: string;
  description: string;
  icon: ReactNode;
  status: 'ready' | 'coming_soon';
  primaryCtaLabel: string;
};

const ACTIONS: ActionConfig[] = [
  {
    key: 'one_on_one',
    label: 'Prep for your next 1:1',
    description:
      'Auto-collect recent wins, questions, and blockers to bring into your next 1:1.',
    icon: <MessageSquare className="h-5 w-5" />,
    status: 'ready',
    primaryCtaLabel: 'Open 1:1 prep',
  },
  {
    key: 'standup',
    label: 'Prep for team standup',
    description:
      'Summarize what happened yesterday, what today will look like, and any notable blockers',
    icon: <Calendar1 className="h-5 w-5" />,
    status: 'ready',
    primaryCtaLabel: 'Open standup prep',
  },
  {
    key: 'planning',
    label: 'Prep for sprint planning',
    description:
      'Review recent work, capacity constraints, and upcoming commitments before planning the next sprint.',
    icon: <ListChecks className="h-5 w-5" />,
    status: 'coming_soon',
    primaryCtaLabel: 'Open planning prep',
  },
  {
    key: 'retro',
    label: 'Prep for sprint retro',
    description:
      'Reflect on what went well, what slowed things down, and which improvements are worth carrying forward.',
    icon: <RotateCcw className="h-5 w-5" />,
    status: 'coming_soon',
    primaryCtaLabel: 'Open retro prep',
  },
];

export function PrepQuickActions({
  onOneOnOnePrepClick,
  onStandupPrepClick,
  onRetroPrepClick,
  onPlanningPrepClick,
}: QuickActionsProps) {
  const handleClick = (key: ActionKey, status: ActionConfig['status']) => {
    if (status === 'coming_soon') return; // no-op for now

    switch (key) {
      case 'standup':
        onStandupPrepClick?.();
        break;
      case 'one_on_one':
        onOneOnOnePrepClick?.();
        break;
      case 'retro':
        onRetroPrepClick?.();
        break;
      case 'planning':
        onPlanningPrepClick?.();
        break;
    }
  };

  return (
    <section
      className="
        relative rounded-2xl border border-[#1F2433] 
        bg-[#070A12] px-4 py-4 sm:py-5 
        shadow-[0_18px_45px_rgba(0,0,0,0.65)]
      "
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-[#151B28] via-transparent to-transparent opacity-80" />

      <header className="relative flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A1A8C7]">
          Quick actions
        </h3>
      </header>

      <div className="relative my-3 h-px bg-gradient-to-r from-transparent via-[#2A3350] to-transparent" />

      <div className="relative grid gap-6 pt-2 md:grid-cols-3 xl:grid-cols-4">
        {ACTIONS.map((action) => {
          const isDisabled = action.status === 'coming_soon';

          return (
            <button
              key={action.key}
              type="button"
              onClick={() => handleClick(action.key, action.status)}
              disabled={isDisabled}
              className={`
                group flex flex-col items-start rounded-xl border
                border-[#272E3F]
                 bg-[#0E111A]
                px-4 py-5 text-left transition
                hover:-translate-y-[1px] hover:border-[#3d377f]
                hover:shadow-[0_0_18px_rgba(18,34,64,0.8)]
                ${
                  isDisabled
                    ? 'cursor-not-allowed opacity-65 hover:border-[#272E3F] hover:shadow-none'
                    : ''
                }
              `}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2">
                  <div
                    className="
                      flex h-8 w-8 items-center justify-center
                      rounded-lg border border-[#30384A] bg-[#181E2A]
                      relative after:absolute after:inset-0
                      after:rounded-lg
                      after:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent)]
                    "
                  >
                    <div className="text-[#E5EBFF]">{action.icon}</div>
                  </div>
                  <span className="text-sm font-medium text-[#F5F7FF]">
                    {action.label}
                  </span>
                </div>

                {action.status === 'coming_soon' && (
                  <span
                    className="
                      flex items-center gap-1 rounded-full 
                      border border-[#2B3245] bg-[#151925] 
                      px-2 py-[2px] text-[10px] text-[#9CA3C7]
                    "
                  >
                    <Hourglass className="h-3 w-3" />
                    Soon
                  </span>
                )}
              </div>

              <p className="mt-4 text-[11px] leading-snug text-[#A1A8C7]">
                {action.description}
              </p>

              <span
                className={`
                  mt-4 inline-flex items-center gap-1.5 rounded-full 
                  border px-2.5 py-1.5 text-[11px] font-medium
                  ${
                    isDisabled
                      ? 'border-[#30384A] bg-[#151925] text-[#737A94]'
                      : 'border-[#3C3E66] bg-[#1A2142] text-[#7C8BFF] group-hover:bg-[#2A2C4F]'
                  }
                `}
              >
                {action.primaryCtaLabel}
                {!isDisabled && <ChevronRight className="h-3.5 w-3.5" />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
