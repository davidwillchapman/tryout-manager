import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { usePeriodizationPlan, useUpdatePeriodizationPlan } from '../../api/periodization';

interface Props {
  teamId: number;
}

export function PeriodizationPlanTab({ teamId }: Props) {
  const { data: plan, isLoading } = usePeriodizationPlan(teamId);
  const update = useUpdatePeriodizationPlan(teamId);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [draft, setDraft] = useState<string | null>(null);

  if (isLoading) return <div className="p-4 text-muted text-sm">Loading…</div>;

  const content = draft ?? plan?.content ?? '';

  function handleSave() {
    update.mutate(content, {
      onSuccess: () => setDraft(null),
    });
  }

  const isDirty = draft !== null && draft !== (plan?.content ?? '');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-navy-700 shrink-0">
        <div className="flex gap-1">
          {(['edit', 'preview'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-xs px-3 py-1.5 rounded transition-colors capitalize ${
                mode === m ? 'bg-navy-700 text-white' : 'text-muted hover:text-white'
              }`}
            >
              {m === 'edit' ? 'Edit' : 'Preview'}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          disabled={!isDirty || update.isPending}
          onClick={handleSave}
        >
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {mode === 'edit' ? (
          <Textarea
            className="h-full min-h-[300px] font-mono text-xs leading-relaxed"
            value={content}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write your periodization plan in Markdown…"
          />
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            {content ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : (
              <p className="text-muted italic">No content yet. Switch to Edit to add your plan.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
