import { useState } from 'react';
import { Dumbbell, Plus, Upload } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { ActivityList } from '../components/activities/ActivityList';
import { ActivityDetail } from '../components/activities/ActivityDetail';
import { ActivityForm } from '../components/activities/ActivityForm';
import { ImportActivityModal } from '../components/activities/ImportActivityModal';
import { SessionList } from '../components/sessions/SessionList';
import { SessionDetail } from '../components/sessions/SessionDetail';
import { SessionForm } from '../components/sessions/SessionForm';
import { useCreateActivity } from '../api/activities';
import { useCreateSession } from '../api/sessions';
import { cn } from '../lib/utils';

type Mode = 'activities' | 'sessions';

export function PlaymakerPage() {
  const [mode, setMode] = useState<Mode>('activities');
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [newActivityOpen, setNewActivityOpen] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const createActivity = useCreateActivity();
  const createSession = useCreateSession();

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div className="w-72 shrink-0 border-r border-navy-700 flex flex-col overflow-hidden bg-navy-900">
        <div className="px-4 py-4 border-b border-navy-700 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell size={16} className="text-gold" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Playmaker</h1>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 mb-3 border-b border-navy-700 pb-2">
            <button
              onClick={() => setMode('activities')}
              className={cn(
                'flex-1 text-xs py-1 transition-colors',
                mode === 'activities'
                  ? 'text-white border-b-2 border-gold -mb-[2px]'
                  : 'text-muted hover:text-white'
              )}
            >
              Activities
            </button>
            <button
              onClick={() => setMode('sessions')}
              className={cn(
                'flex-1 text-xs py-1 transition-colors',
                mode === 'sessions'
                  ? 'text-white border-b-2 border-gold -mb-[2px]'
                  : 'text-muted hover:text-white'
              )}
            >
              Sessions
            </button>
          </div>

          {mode === 'activities' ? (
            <>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload size={12} /> Import
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setNewActivityOpen(true)}
                >
                  <Plus size={12} /> New
                </Button>
              </div>
            </>
          ) : (
            <Button
              size="sm"
              className="w-full text-xs"
              onClick={() => setNewSessionOpen(true)}
            >
              <Plus size={12} /> New Session
            </Button>
          )}
        </div>

        {mode === 'activities' ? (
          <ActivityList selectedId={selectedActivityId} onSelect={setSelectedActivityId} />
        ) : (
          <SessionList selectedId={selectedSessionId} onSelect={setSelectedSessionId} />
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-hidden bg-navy-900">
        {mode === 'activities' ? (
          selectedActivityId ? (
            <ActivityDetail
              key={selectedActivityId}
              activityId={selectedActivityId}
              onDeleted={() => setSelectedActivityId(null)}
              onCloned={(id) => setSelectedActivityId(id)}
              onProgressionClick={(id) => setSelectedActivityId(id)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <Dumbbell size={48} className="text-navy-700 mb-4" />
              <h2 className="text-white font-semibold mb-1">No Activity Selected</h2>
              <p className="text-muted text-sm">
                Select an activity from the list, or import / create a new one.
              </p>
            </div>
          )
        ) : (
          selectedSessionId ? (
            <SessionDetail
              key={selectedSessionId}
              sessionId={selectedSessionId}
              onDeleted={() => setSelectedSessionId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <Dumbbell size={48} className="text-navy-700 mb-4" />
              <h2 className="text-white font-semibold mb-1">No Session Selected</h2>
              <p className="text-muted text-sm">
                Select a session from the list, or create a new one.
              </p>
            </div>
          )
        )}
      </div>

      {/* New Activity dialog */}
      <Dialog open={newActivityOpen} onOpenChange={(v) => !v && setNewActivityOpen(false)}>
        <DialogContent title="New Activity" className="max-w-2xl">
          <ActivityForm
            onSubmit={(values) => {
              createActivity.mutate(values, {
                onSuccess: (a) => {
                  setSelectedActivityId(a.id);
                  setNewActivityOpen(false);
                },
              });
            }}
            isPending={createActivity.isPending}
            onCancel={() => setNewActivityOpen(false)}
            submitLabel="Create Activity"
          />
        </DialogContent>
      </Dialog>

      {/* New Session dialog */}
      <Dialog open={newSessionOpen} onOpenChange={(v) => !v && setNewSessionOpen(false)}>
        <DialogContent title="New Session" className="max-w-lg">
          <SessionForm
            onSubmit={(values) => {
              createSession.mutate(values, {
                onSuccess: (s) => {
                  setSelectedSessionId(s.id);
                  setNewSessionOpen(false);
                },
              });
            }}
            isPending={createSession.isPending}
            onCancel={() => setNewSessionOpen(false)}
            submitLabel="Create Session"
          />
        </DialogContent>
      </Dialog>

      <ImportActivityModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onCreated={(id) => setSelectedActivityId(id)}
      />

    </div>
  );
}
