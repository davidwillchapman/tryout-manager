import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex w-full rounded border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white',
        'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold',
        'disabled:opacity-50 disabled:cursor-not-allowed resize-none',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export { Textarea };
