import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

interface DialogContentProps extends RadixDialog.DialogContentProps {
  title: string;
  description?: string;
}

export function DialogContent({ title, description, children, className, ...props }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 bg-black/60 z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in" />
      <RadixDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'w-full max-w-lg bg-navy-800 rounded-lg border border-navy-600 shadow-xl',
          'p-6 focus:outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out data-[state=open]:fade-in',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <RadixDialog.Title className="text-lg font-semibold text-white">{title}</RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="text-sm text-muted mt-0.5">{description}</RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close className="text-muted hover:text-white transition-colors rounded focus:outline-none focus:ring-2 focus:ring-gold">
            <X size={18} />
          </RadixDialog.Close>
        </div>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export const DialogClose = RadixDialog.Close;
