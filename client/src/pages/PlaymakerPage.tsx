import { useState } from 'react';
import { Dumbbell, Plus, Upload, Image } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { ActivityList } from '../components/activities/ActivityList';
import { ActivityDetail } from '../components/activities/ActivityDetail';
import { ActivityForm } from '../components/activities/ActivityForm';
import { ImportActivityModal } from '../components/activities/ImportActivityModal';
import { ImageUploadModal } from '../components/activities/ImageUploadModal';
import { useCreateActivity } from '../api/activities';

export function PlaymakerPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const createActivity = useCreateActivity();

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div className="w-72 shrink-0 border-r border-navy-700 flex flex-col overflow-hidden bg-navy-900">
        <div className="px-4 py-4 border-b border-navy-700 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell size={16} className="text-gold" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Playmaker</h1>
          </div>
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
              onClick={() => setNewOpen(true)}
            >
              <Plus size={12} /> New
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="w-full mt-2 text-xs justify-start"
            onClick={() => setImageOpen(true)}
          >
            <Image size={12} /> Upload Image
          </Button>
        </div>

        <ActivityList selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-hidden bg-navy-900">
        {selectedId ? (
          <ActivityDetail
            key={selectedId}
            activityId={selectedId}
            onDeleted={() => setSelectedId(null)}
            onCloned={(id) => setSelectedId(id)}
            onProgressionClick={(id) => setSelectedId(id)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Dumbbell size={48} className="text-navy-700 mb-4" />
            <h2 className="text-white font-semibold mb-1">No Activity Selected</h2>
            <p className="text-muted text-sm">
              Select an activity from the list, or import / create a new one.
            </p>
          </div>
        )}
      </div>

      {/* New Activity dialog */}
      <Dialog open={newOpen} onOpenChange={(v) => !v && setNewOpen(false)}>
        <DialogContent title="New Activity" className="max-w-2xl">
          <ActivityForm
            onSubmit={(values) => {
              createActivity.mutate(values, {
                onSuccess: (a) => {
                  setSelectedId(a.id);
                  setNewOpen(false);
                },
              });
            }}
            isPending={createActivity.isPending}
            onCancel={() => setNewOpen(false)}
            submitLabel="Create Activity"
          />
        </DialogContent>
      </Dialog>

      <ImportActivityModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onCreated={(id) => setSelectedId(id)}
      />

      <ImageUploadModal
        open={imageOpen}
        onClose={() => setImageOpen(false)}
      />
    </div>
  );
}
