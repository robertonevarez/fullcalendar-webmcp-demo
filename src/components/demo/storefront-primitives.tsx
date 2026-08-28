import { Clock3, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDaysLabel, formatHoursLabel, formatPriceCents } from '@/demo/format';
import type {
  DemoAvailabilityInput,
  DemoBusinessNotice,
  DemoConfig,
  DemoPublicAppointment,
  DemoServiceInput,
} from '@/demo/types';
import { cn } from '@/lib/utils';

type StorefrontNavProps = {
  businessName: string;
  descriptor: string;
  links: Array<{ href: string; label: string }>;
  actionLabel: string;
  actionHref?: string;
  className?: string;
  brandClassName?: string;
  linkClassName?: string;
  actionClassName?: string;
};

export function StorefrontNav({
  businessName,
  descriptor,
  links,
  actionLabel,
  actionHref = '#visit',
  className,
  brandClassName,
  linkClassName,
  actionClassName,
}: StorefrontNavProps) {
  return (
    <header className={cn('shrink-0 border-b px-5 py-4 md:px-7 md:py-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <a href="#top" className={cn('min-w-0 leading-none', brandClassName)}>
          <span className="block truncate text-[0.95rem] font-semibold tracking-[-0.02em]">
            {businessName}
          </span>
          <span className="mt-1 block text-[0.62rem] font-medium uppercase tracking-[0.18em] opacity-60">
            {descriptor}
          </span>
        </a>
        <a
          href={actionHref}
          className={cn(
            'inline-flex shrink-0 items-center border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40',
            actionClassName,
          )}
        >
          {actionLabel}
        </a>
      </div>
      <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.68rem] font-medium uppercase tracking-[0.12em]" aria-label="Primary">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={cn('opacity-65 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none', linkClassName)}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

type StorefrontActionProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function StorefrontAction({ href, children, className }: StorefrontActionProps) {
  return (
    <a
      href={href}
      className={cn(
        'inline-flex items-center border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40',
        className,
      )}
    >
      {children}
    </a>
  );
}

export function ServiceMeta({ service, className }: { service: DemoServiceInput; className?: string }) {
  return (
    <p className={cn('text-xs tabular-nums opacity-60', className)}>
      {formatPriceCents(Math.round(service.price_dollars * 100)).replace(/\.00$/, '')}
      <span aria-hidden> · </span>
      {service.duration_minutes} min
    </p>
  );
}

export function BusinessHours({
  availability,
  label = 'Hours',
  showIcon = true,
  className,
}: {
  availability: DemoAvailabilityInput;
  label?: string;
  showIcon?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] opacity-55">
        {showIcon ? <Clock3 aria-hidden className="size-3.5" /> : null}
        <span>{label}</span>
      </div>
      <p className="text-sm font-medium">{formatDaysLabel(availability.days)}</p>
      <p className="text-sm opacity-65">{formatHoursLabel(availability.open, availability.close)}</p>
    </div>
  );
}

export function ServiceArea({
  postalCodes,
  locationLabel,
  label = 'Service area',
  showIcon = true,
  className,
}: {
  postalCodes: string[];
  locationLabel?: string;
  label?: string;
  showIcon?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] opacity-55">
        {showIcon ? <MapPin aria-hidden className="size-3.5" /> : null}
        <span>{label}</span>
      </div>
      {locationLabel ? <p className="text-sm font-medium">{locationLabel}</p> : null}
      <p className="text-xs tabular-nums opacity-65">{postalCodes.join(' · ')}</p>
    </div>
  );
}

export function TeamList({
  staff,
  label,
  className,
}: {
  staff: string[];
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] opacity-55">{label}</p>
      <p className="text-sm font-medium">{staff.join(' · ')}</p>
    </div>
  );
}

export function BookingNotice({
  config,
  lastBooking,
  businessNotice,
  className,
}: {
  config: DemoConfig;
  lastBooking: DemoPublicAppointment | null;
  businessNotice: DemoBusinessNotice | null;
  className?: string;
}) {
  const serviceName = businessNotice?.service_name ?? lastBooking?.service_name;
  const whenLabel = businessNotice?.when_label;
  const providerName = businessNotice?.provider_name ?? lastBooking?.provider_name;

  if (!serviceName || !whenLabel) return null;

  return (
    <aside
      className={cn('shrink-0 border-t px-5 py-3.5 md:px-7', className)}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] opacity-60">
          {businessNotice?.headline ?? 'Appointment received'}
        </p>
        <p className="text-xs opacity-60">{whenLabel}</p>
      </div>
      <p className="mt-1 text-sm font-medium">{serviceName}</p>
      {providerName ? <p className="mt-0.5 text-xs opacity-60">With {providerName}</p> : null}
      <p className="mt-2 text-[0.68rem] opacity-55">
        Details would be sent to {businessNotice?.notification_email ?? config.notificationEmail}
      </p>
    </aside>
  );
}
