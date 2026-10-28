import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn('flex min-h-24 w-full border border-input bg-background/70 px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
));
Textarea.displayName = 'Textarea';
export { Textarea };
