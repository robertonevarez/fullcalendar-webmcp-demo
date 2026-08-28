import { ds, spacing } from '@/lib/design-system';
import { cn } from '@/lib/utils';

type LayoutProps = {
  children?: React.ReactNode;
  className?: string;
};

export function Page({ children, className }: LayoutProps) {
  return (
    <main className={cn('min-h-[calc(100vh-5rem)]', ds.content, spacing.stack, className)}>
      {children}
    </main>
  );
}

export function Section({ children, className }: LayoutProps) {
  return <section className={cn(ds.section, className)}>{children}</section>;
}

export function Panel({ children, className }: LayoutProps) {
  return <div className={cn(ds.panel, spacing.stack, className)}>{children}</div>;
}

export function Shell({ children, className }: LayoutProps) {
  return <div className={cn(ds.shell, className)}>{children}</div>;
}
