import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-md border border-border/80 bg-card text-card-foreground shadow-card', className)} {...props} />
));
Card.displayName = 'Card';
const CardHeader = ({ className, ...props }) => <div className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />;
const CardTitle = ({ className, ...props }) => <h3 className={cn('font-semibold leading-none tracking-tight', className)} {...props} />;
const CardDescription = ({ className, ...props }) => <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
const CardContent = ({ className, ...props }) => <div className={cn('p-5 pt-0', className)} {...props} />;
const CardFooter = ({ className, ...props }) => <div className={cn('flex items-center p-5 pt-0', className)} {...props} />;

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
