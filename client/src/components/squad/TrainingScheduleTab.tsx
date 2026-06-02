import { useState } from 'react';
import { Plus, CalendarDays } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Select, SelectItem } from '../ui/Select';
import { ScheduledSessionCard } from './ScheduledSessionCard';
import { ScheduledSessionDetail } from './ScheduledSessionDetail';
import { useScheduledSessions, useCreateScheduledSession, useDeleteScheduledSession } from '../../api/scheduledSessions';
import { useSessions } from '../../api/sessions';

interface Props {
  teamId: number;
}

export function TrainingScheduleTab({ teamId }: Props) {
  const { data: sessions = [], isLoading } = useScheduledSessions(teamId);
  const { data: sessionTemplates = [] } = useSessions();
  const createSession = useCreateScheduledSession(teamId);
  const deleteSession = useDeleteScheduledSession(teamId);

  const [addOpen, setAddOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSourceId || !selectedDate) return;
    createSession.mutate(
      { source_session_id: Number(selectedSourceId), date: selectedDate },
      {
        onSuccess: (s) => {
          setAddOpen(false);
          setSelectedSourceId('');
          setSelectedDate('');
          setSelectedSessionId(s.id);
        },
      }
    );
  }

  if (selectedSessionId !== null) {
    return (
      <ScheduledSessionDetail
        sessionId={selectedSessionId}
        onBack={() => setSelectedSessionId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-navy-700 shrink-0">
        <span className="text-xs text-muted">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={14} className="mr-1" />
          Add Session
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && <p className="text-muted text-sm p-2">Loading…</p>}
        {!isLoading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted">
            <CalendarDays size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No scheduled sessions yet.</p>
            <p className="text-xs mt-1">Add a session to build your training schedule.</p>
          </div>
        )}
        {sessions.map((s) => (
          <ScheduledSessionCard
            key={s.id}
            session={s}
            onClick={() => setSelectedSessionId(s.id)}
            onDelete={() => deleteSession.mutate(s.id)}
          />
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={(v) => !v && setAddOpen(false)}>
        <DialogContent title="Add Scheduled Session">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1">Session Template *</label>
              <Select
                value={selectedSourceId}
                onValueChange={setSelectedSourceId}
                placeholder="Choose a session…"
              >
                {sessionTemplates.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.title}
                  </SelectItem>
                ))}
              </Select>
              {sessionTemplates.length === 0 && (
                <p className="text-xs text-muted mt-1">No sessions found. Create one in Playmaker first.</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Date *</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!selectedSourceId || !selectedDate || createSession.isPending}
              >
                {createSession.isPending ? 'Creating…' : 'Create Session'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
