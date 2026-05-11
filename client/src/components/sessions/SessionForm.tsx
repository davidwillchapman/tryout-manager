import { useState } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import type { SessionPlan, GamePhase } from '../../types';

const GAME_PHASES: GamePhase[] = [
  'Attacking',
  'Attacking to Defending Transition',
  'Defending',
  'Defending to Attacking Transition',
  'Other',
];

type SessionFormValues = Omit<SessionPlan, 'id' | 'activity_count' | 'created_at' | 'updated_at'>;

interface SessionFormProps {
  initialValues?: Partial<SessionFormValues>;
  onSubmit: (values: SessionFormValues) => void;
  isPending?: boolean;
  onCancel: () => void;
  submitLabel?: string;
}

export function SessionForm({ initialValues, onSubmit, isPending, onCancel, submitLabel = 'Save' }: SessionFormProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>(initialValues?.game_phase ?? 'Attacking');
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [objective, setObjective] = useState(initialValues?.overall_objective ?? '');
  const [mainPrinciple, setMainPrinciple] = useState(initialValues?.main_principle ?? '');
  const [sub1, setSub1] = useState(initialValues?.sub_principle_1 ?? '');
  const [sub2, setSub2] = useState(initialValues?.sub_principle_2 ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      game_phase: gamePhase,
      title,
      overall_objective: objective,
      main_principle: mainPrinciple,
      sub_principle_1: sub1 || null,
      sub_principle_2: sub2 || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <label className="block text-xs text-muted mb-1">Game Phase *</label>
        <select
          value={gamePhase}
          onChange={(e) => setGamePhase(e.target.value as GamePhase)}
          className="flex h-9 w-full rounded border border-navy-600 bg-navy-900 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold"
          required
        >
          {GAME_PHASES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Session Title *</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Session title" required />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Overall Objective *</label>
        <Textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={3}
          placeholder="What is the overall goal of this session?"
          required
        />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Main Principle *</label>
        <Input value={mainPrinciple} onChange={(e) => setMainPrinciple(e.target.value)} placeholder="Main coaching principle" required />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Sub Principle 1</label>
        <Input value={sub1} onChange={(e) => setSub1(e.target.value)} placeholder="Optional sub-principle" />
      </div>

      {sub1.trim() && (
        <div>
          <label className="block text-xs text-muted mb-1">Sub Principle 2</label>
          <Input value={sub2} onChange={(e) => setSub2(e.target.value)} placeholder="Optional sub-principle" />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1 sticky bottom-0 bg-navy-800 pb-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  );
}
