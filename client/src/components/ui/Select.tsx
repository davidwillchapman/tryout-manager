import * as RadixSelect from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, placeholder, disabled, className, children }: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger
        className={cn(
          'flex h-9 w-full items-center justify-between rounded border border-navy-600 bg-navy-900',
          'px-3 text-sm text-white placeholder:text-muted',
          'focus:outline-none focus:ring-2 focus:ring-gold',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          '[&>span]:truncate',
          className
        )}
      >
        <RadixSelect.Value placeholder={<span className="text-muted">{placeholder ?? 'Select...'}</span>} />
        <RadixSelect.Icon>
          <ChevronDown size={14} className="text-muted" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-auto rounded border border-navy-600 bg-navy-800 shadow-xl"
          position="popper"
          sideOffset={4}
        >
          <RadixSelect.Viewport className="p-1">
            {children}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export function SelectItem({ value, children }: SelectItemProps) {
  return (
    <RadixSelect.Item
      value={value}
      className={cn(
        'relative flex cursor-pointer items-center rounded px-3 py-1.5 text-sm text-white',
        'select-none outline-none',
        'data-[highlighted]:bg-navy-700',
        'data-[state=checked]:text-gold'
      )}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="absolute right-2">
        <Check size={12} />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
}

export function SelectGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <RadixSelect.Group>
      <RadixSelect.Label className="px-3 py-1 text-xs font-semibold text-muted uppercase tracking-wider">
        {label}
      </RadixSelect.Label>
      {children}
    </RadixSelect.Group>
  );
}
