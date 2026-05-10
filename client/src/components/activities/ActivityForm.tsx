import { useState } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import type { Activity } from '../../types';

const ACTIVITY_TYPES = [
  'Warm Up', 'Possession', 'Finishing', 'Scrimmage', 'Set Piece',
  'Defending', 'Transition', 'Technical', 'Fitness', 'Other',
];

type ActivityFormValues = Omit<Activity, 'id' | 'tag_count' | 'created_at' | 'updated_at'>;

interface ActivityFormProps {
  initialValues?: Partial<ActivityFormValues>;
  onSubmit: (values: ActivityFormValues) => void;
  isPending?: boolean;
  onCancel: () => void;
  submitLabel?: string;
}

export function ActivityForm({ initialValues, onSubmit, isPending, onCancel, submitLabel = 'Save' }: ActivityFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [summary, setSummary] = useState(initialValues?.summary ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [activityType, setActivityType] = useState(initialValues?.activity_type ?? '');
  const [customType, setCustomType] = useState('');
  const [durationStr, setDurationStr] = useState(initialValues?.duration_minutes?.toString() ?? '');
  const [fieldSetup, setFieldSetup] = useState(initialValues?.field_setup ?? '');
  const [coachingPoints, setCoachingPoints] = useState(initialValues?.coaching_points ?? '');
  const [flexibilityNotes, setFlexibilityNotes] = useState(initialValues?.flexibility_notes ?? '');

  const [showCustom, setShowCustom] = useState(() => {
    const v = initialValues?.activity_type ?? '';
    return v !== '' && !ACTIVITY_TYPES.includes(v);
  });

  const handleTypeChange = (v: string) => {
    setActivityType(v);
    if (v === 'Other') {
      setShowCustom(true);
      setCustomType('');
    } else {
      setShowCustom(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedType = showCustom ? (customType || null) : (activityType || null);
    onSubmit({
      title,
      summary,
      description,
      activity_type: resolvedType,
      duration_minutes: durationStr ? parseInt(durationStr, 10) || null : null,
      field_setup: fieldSetup || null,
      coaching_points: coachingPoints || null,
      flexibility_notes: flexibilityNotes || null,
    });
  };

  const selectValue = showCustom ? 'Other' : (activityType || '');

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <label className="block text-xs text-muted mb-1">Title *</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Activity title" required />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Summary * <span className="font-normal opacity-60">(1–2 sentences)</span></label>
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Brief summary…" required />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Description *</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Full description of rules, organization, and flow…" required />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-muted mb-1">Activity Type</label>
          <select
            value={selectValue}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="flex h-9 w-full rounded border border-navy-600 bg-navy-900 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="">— None —</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {showCustom && (
            <Input
              className="mt-1"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Custom type…"
            />
          )}
        </div>
        <div className="w-32">
          <label className="block text-xs text-muted mb-1">Duration (min)</label>
          <Input
            type="number"
            value={durationStr}
            onChange={(e) => setDurationStr(e.target.value)}
            placeholder="e.g. 20"
            min={1}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Field Setup <span className="font-normal opacity-60">(markdown)</span></label>
        <Textarea value={fieldSetup} onChange={(e) => setFieldSetup(e.target.value)} rows={4} placeholder="Field dimensions, markings, player setup…" className="font-mono text-xs" />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Coaching Points <span className="font-normal opacity-60">(markdown)</span></label>
        <Textarea value={coachingPoints} onChange={(e) => setCoachingPoints(e.target.value)} rows={4} placeholder="- First key point&#10;- Second key point" className="font-mono text-xs" />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Flexibility Notes</label>
        <Textarea value={flexibilityNotes} onChange={(e) => setFlexibilityNotes(e.target.value)} rows={3} placeholder="How this activity can be adapted…" />
      </div>

      <div className="flex justify-end gap-2 pt-1 sticky bottom-0 bg-navy-800 pb-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  );
}
