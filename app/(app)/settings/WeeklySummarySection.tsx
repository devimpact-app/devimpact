import { useState } from 'react';

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-white/85">{label}</div>
        {description ? (
          <div className="mt-1 text-[13px] text-white/60">{description}</div>
        ) : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={[
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border',
          'transition focus:outline-none focus:ring-2 focus:ring-white/15',
          checked
            ? 'border-emerald-400/25 bg-emerald-400/15'
            : 'border-white/10 bg-white/[0.04]',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-5 w-5 rounded-full',
            'shadow-sm shadow-black/40 transition-transform',
            checked
              ? 'translate-x-6 bg-emerald-200/90'
              : 'translate-x-1 bg-white/70',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

export function WeeklySummaryEmailSection({
  weeklySummaryEmailEnabled: initialWeeklySummaryEmailEnabled,
}: {
  weeklySummaryEmailEnabled: boolean;
}) {
  const [weeklySummaryEmailEnabled, setWeeklySummaryEmailEnabled] =
    useState<boolean>(initialWeeklySummaryEmailEnabled);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleToggle(newToggle: boolean) {
    setIsLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch(`/api/settings/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          weeklySummaryEmailEnabled: newToggle,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setError(text || 'Failed to update setting.');
        return;
      }

      setSuccess('Settings updated successfully.');
      setWeeklySummaryEmailEnabled(newToggle);
    } catch (err) {
      setError('Network error while updating settings');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-5 py-4 shadow-sm shadow-black/30">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-[15px] font-medium text-white/85">
              Notifications
            </h2>
            <p className="text-[13px] text-white/65">
              Control what DevImpact sends to your inbox.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <Toggle
            checked={weeklySummaryEmailEnabled}
            onChange={(v) => handleToggle(v)}
            label="Weekly summary email"
            description="Send me a weekly summary when it’s generated."
            disabled={isLoading}
          />

          <div className="mt-3 border-t border-white/10 pt-3 text-[12px] text-white/45">
            You can always view summaries in DevImpact, even when email is off.
          </div>
        </div>
      </section>
      {(error || success) && (
        <div className="space-y-1 text-xs">
          {error && (
            <p className="rounded-md border border-red-900 bg-red-950/60 px-3 py-2 text-red-200">
              There was an error processing your request. Please try again
              later.
            </p>
          )}
          {success && (
            <p className="rounded-md border border-emerald-900 bg-emerald-950/60 px-3 py-2 text-emerald-200">
              {success}
            </p>
          )}
        </div>
      )}
    </>
  );
}
