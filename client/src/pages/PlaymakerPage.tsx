import { useRef, useState } from 'react';
import { Download, Dumbbell, Plus, Upload, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { ActivityList } from '../components/activities/ActivityList';
import { ActivityDetail } from '../components/activities/ActivityDetail';
import { ActivityForm } from '../components/activities/ActivityForm';
import { ImportActivityModal } from '../components/activities/ImportActivityModal';
import { SessionList } from '../components/sessions/SessionList';
import { SessionDetail } from '../components/sessions/SessionDetail';
import { SessionForm } from '../components/sessions/SessionForm';
import { useCreateActivity, exportActivitiesJson, useImportActivitiesBulk, type BulkImportResult } from '../api/activities';
import { useCreateSession } from '../api/sessions';

type Mode = 'activities' | 'sessions';

export function PlaymakerPage({ defaultMode }: { defaultMode: Mode }) {
  const mode = defaultMode;
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [newActivityOpen, setNewActivityOpen] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState<BulkImportResult | null>(null);
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const createActivity = useCreateActivity();
  const createSession = useCreateSession();
  const importBulk = useImportActivitiesBulk();

  const handleExport = async () => {
    setIsExporting(true);
    try { await exportActivitiesJson(); } finally { setIsExporting(false); }
  };

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBulkImportResult(null);
    setBulkImportError(null);
    try {
      const text = await file.text();
      const result = await importBulk.mutateAsync(text);
      setBulkImportResult(result);
    } catch (err) {
      setBulkImportError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div className="w-72 shrink-0 border-r border-navy-700 flex flex-col overflow-hidden bg-navy-900">
        <div className="px-4 py-4 border-b border-navy-700 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell size={16} className="text-gold" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Playmaker</h1>
          </div>

          {mode === 'activities' ? (
            <>
              <input
                ref={bulkFileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleBulkFileChange}
              />
              <div className="flex gap-2 mb-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-xs"
                  onClick={handleExport}
                  disabled={isExporting}
                  title="Export all activities to JSON"
                >
                  <Download size={12} /> {isExporting ? 'Exporting…' : 'Export'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-xs"
                  onClick={() => bulkFileRef.current?.click()}
                  disabled={importBulk.isPending}
                  title="Import activities from JSON export"
                >
                  <Upload size={12} /> {importBulk.isPending ? 'Importing…' : 'Import All'}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload size={12} /> Import .md
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setNewActivityOpen(true)}
                >
                  <Plus size={12} /> New
                </Button>
              </div>
              {(bulkImportResult || bulkImportError) && (
                <div className={`mt-2 rounded p-2 text-xs flex items-start gap-2 ${bulkImportError ? 'bg-red-950/40 text-red-300 border border-red-700' : (bulkImportResult?.errors.length ?? 0) > 0 ? 'bg-yellow-950/30 text-yellow-200 border border-yellow-700' : 'bg-navy-800 text-white border border-navy-600'}`}>
                  <div className="flex-1">
                    {bulkImportError ? (
                      <p>Import failed: {bulkImportError}</p>
                    ) : bulkImportResult ? (
                      <>
                        <p>Imported {bulkImportResult.imported} activit{bulkImportResult.imported !== 1 ? 'ies' : 'y'}{bulkImportResult.errors.length > 0 ? `, ${bulkImportResult.errors.length} skipped` : ''}.</p>
                        {bulkImportResult.tag_warnings.length > 0 && (
                          <ul className="mt-1 list-disc list-inside space-y-0.5 text-yellow-300">
                            {bulkImportResult.tag_warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
                            {bulkImportResult.tag_warnings.length > 5 && <li>…and {bulkImportResult.tag_warnings.length - 5} more</li>}
                          </ul>
                        )}
                      </>
                    ) : null}
                  </div>
                  <button type="button" onClick={() => { setBulkImportResult(null); setBulkImportError(null); }} className="text-muted hover:text-white shrink-0">
                    <X size={12} />
                  </button>
                </div>
              )}
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
