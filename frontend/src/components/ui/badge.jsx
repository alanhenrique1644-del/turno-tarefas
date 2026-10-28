import * as React from 'react';
import { cn } from '@/lib/utils';

function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'border border-transparent bg-primary/15 text-primary-foreground',
    secondary: 'border border-transparent bg-secondary text-secondary-foreground',
    outline: 'border border-border text-muted-foreground',
    success: 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    subtle: 'border border-indigo-300/15 bg-indigo-300/[0.07] text-indigo-100/80',
  };
  return <span className={cn('inline-flex w-fit items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]', variants[variant] || variants.default, className)} {...props} />;
}

export { Badge };
