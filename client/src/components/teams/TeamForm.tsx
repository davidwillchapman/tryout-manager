import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select, SelectItem } from '../ui/Select';
import { useGroups } from '../../api/groups';
import type { Team } from '../../types';

interface TeamFormProps {
  initial?: Team;
  onSubmit: (data: { name: string; description?: string | null; group_id: number }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TeamForm({ initial, onSubmit, onCancel, isLoading }: TeamFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [groupId, setGroupId] = useState(initial?.group_id?.toString() ?? '');
  const { data: groups = [] } = useGroups();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description: description || null, group_id: parseInt(groupId) });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="block text-xs text-muted mb-1">Team Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Team 1" required />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Group *</label>
        <Select value={groupId} onValueChange={setGroupId} placeholder="Select a group">
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
          ))}
        </Select>
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes" rows={2} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isLoading || !name || !groupId}>
          {isLoading ? 'Saving...' : initial ? 'Save Changes' : 'Create Team'}
        </Button>
      </div>
    </form>
  );
}
