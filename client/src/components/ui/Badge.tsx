import { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  muted?: boolean;
}

export function Badge({ className, muted, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono bg-navy-700 text-white',
        muted && 'opacity-60',
        className
      )}
      {...props}
    />
  );
}
