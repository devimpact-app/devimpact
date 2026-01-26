import Link from 'next/link';

export function ActionButton({
  children,
  onClick,
  href,
  variant = 'primary',
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const base =
    'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-white/20';
  const styles =
    variant === 'primary'
      ? 'border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.10]'
      : 'border-white/10 bg-transparent text-white/75 hover:bg-white/[0.04] hover:text-white';

  const cls = [
    base,
    styles,
    disabled ? 'opacity-60 pointer-events-none' : '',
  ].join(' ');

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cls} disabled={disabled}>
      {children}
    </button>
  );
}
