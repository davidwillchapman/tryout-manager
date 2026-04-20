import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import type { Group } from '../../types';

interface GroupFormProps {
  initial?: Group;
  onSubmit: (data: { name: string; description?: string | null }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function GroupForm({ initial, onSubmit, onCancel, isLoading }: GroupFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description: description || null });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="block text-xs text-muted mb-1">Group Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pool A" required />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes" rows={2} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isLoading || !name}>
          {isLoading ? 'Saving...' : initial ? 'Save Changes' : 'Create Group'}
        </Button>
      </div>
    </form>
  );
}
