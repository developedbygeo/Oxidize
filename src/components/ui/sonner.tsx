import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500" />,
        info: <InfoIcon className="size-4 text-blue-500" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
        error: <OctagonXIcon className="size-4 text-red-500" />,
        loading: <Loader2Icon className="size-4 animate-spin text-primary" />,
      }}
      toastOptions={{
        classNames: {
          toast: 'group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toaster]:!text-muted-foreground',
          success: 'group-[.toaster]:border-emerald-500/30 group-[.toaster]:bg-emerald-500/10',
          error: 'group-[.toaster]:border-red-500/30 group-[.toaster]:bg-red-500/10',
          warning: 'group-[.toaster]:border-amber-500/30 group-[.toaster]:bg-amber-500/10',
          info: 'group-[.toaster]:border-blue-500/30 group-[.toaster]:bg-blue-500/10',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
