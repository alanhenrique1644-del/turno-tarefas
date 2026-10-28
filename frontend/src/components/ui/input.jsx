import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input ref={ref} type={type} className={cn('flex h-10 w-full border border-input bg-background/70 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
));
Input.displayName = 'Input';
export { Input };
