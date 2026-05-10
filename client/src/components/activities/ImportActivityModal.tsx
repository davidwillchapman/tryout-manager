import { useRef, useState } from 'react';
import { Upload, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';
import { useImportActivity } from '../../api/activities';

interface ImportActivityModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}

export function ImportActivityModal({ open, onClose, onCreated }: ImportActivityModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const importActivity = useImportActivity();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    importActivity.mutate(fd, {
      onSuccess: (result) => {
        setWarnings(result.warnings);
        if (result.warnings.length === 0) {
          setFile(null);
          onCreated(result.activity.id);
          onClose();
        } else {
          onCreated(result.activity.id);
        }
      },
    });
  };

  const handleClose = () => {
    setFile(null);
    setWarnings([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent title="Import Activity">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Markdown File (.md / .txt) *</label>
            <div
              className="flex items-center gap-3 border border-navy-600 rounded px-3 py-2 cursor-pointer hover:border-gold transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={14} className="text-muted shrink-0" />
              <span className="text-sm text-muted truncate">{file ? file.name : 'Choose file…'}</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".md,.txt"
              className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setWarnings([]); }}
            />
          </div>

          {warnings.length > 0 && (
            <div className="rounded border border-yellow-600/40 bg-yellow-900/20 p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-semibold mb-1">
                <AlertTriangle size={12} /> Import succeeded with warnings
              </div>
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-yellow-300">{w}</p>
              ))}
            </div>
          )}

          {importActivity.isError && (
            <p className="text-xs text-red-400">{String((importActivity.error as Error).message)}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={handleClose}>
              {warnings.length > 0 ? 'Close' : 'Cancel'}
            </Button>
            {warnings.length === 0 && (
              <Button type="submit" disabled={!file || importActivity.isPending}>
                {importActivity.isPending ? 'Importing…' : 'Import'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
