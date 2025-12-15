'use client';

import { BarChart3, ChevronRight } from 'lucide-react';

export function WorkRhythmCardSkeleton() {
  const windowLabel = 'the last 4 weeks';

  return (
    <section
      className="
        rounded-2xl border border-white/10 
        bg-[#111520] 
        px-5 py-4 
        flex flex-col gap-4 
        w-full
        animate-pulse
      "
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="
              h-7 w-7 flex items-center justify-center
              rounded-lg bg-[#181E2A] border border-white/10
            "
          >
            <BarChart3 className="h-4 w-4 text-white/40" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="h-3 w-32 rounded bg-[#1A2234]" />
            <div className="h-2 w-40 rounded bg-[#151A28]" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1 text-[11px] text-[#4C5B86]">
          View timeline
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </header>

      <div className="relative flex flex-col gap-2">
        <div
          className="
            w-full h-32 
            rounded-xl 
            border border-white/5 
            bg-[#0C101A]
            overflow-hidden 
            relative
          "
        >
          <div className="absolute inset-1 flex">
            <div className="flex flex-col justify-between mr-1">
              {['Early', 'Morning', 'Midday', 'Afternoon', 'Eve'].map((t) => (
                <span key={t} className="h-2 w-6 rounded bg-[#151A28]" />
              ))}
            </div>
            <div className="flex-1 grid grid-rows-5 grid-cols-7 gap-[4px]">
              {Array.from({ length: 4 * 7 }).map((_, i) => (
                <div key={i} className="rounded-full bg-[#1A2234]" />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between px-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="h-2 w-6 rounded bg-[#151A28]" />
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-[11px] text-[#4C5B86]">
          Building your typical week based on {windowLabel}…
        </p>
        <div className="space-y-1">
          <div className="h-2.5 w-4/5 rounded bg-[#151A28]" />
          <div className="h-2.5 w-3/5 rounded bg-[#151A28]" />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="h-6 w-40 rounded-full bg-[#151A28]" />
          <span className="h-6 w-44 rounded-full bg-[#151A28]" />
        </div>
      </div>
    </section>
  );
}
