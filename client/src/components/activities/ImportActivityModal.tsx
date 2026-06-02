import { useRef, useState } from 'react';
import { Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';
import { useImportActivity, useImportActivitiesBulk } from '../../api/activities';

interface ImportActivityModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}

export function ImportActivityModal({ open, onClose, onCreated }: ImportActivityModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [bulkResult, setBulkResult] = useState<{ imported: number; errors: Array<{ title: string; message: string }>; tag_warnings: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importActivity = useImportActivity();
  const importBulk = useImportActivitiesBulk();

  const isJson = file?.name.endsWith('.json') ?? false;
  const isPending = importActivity.isPending || importBulk.isPending;
  const isDone = warnings.length > 0 || bulkResult !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (isJson) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        importBulk.mutate(text, {
          onSuccess: (result) => {
            setBulkResult(result);
          },
        });
      };
      reader.readAsText(file);
    } else {
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
    }
  };

  const handleClose = () => {
    setFile(null);
    setWarnings([]);
    setBulkResult(null);
    onClose();
  };

  const hasErrors = importActivity.isError || importBulk.isError;
  const errorMessage = hasErrors
    ? String(((importActivity.error ?? importBulk.error) as Error).message)
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent title="Import Activity">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">File (.md / .txt / .json) *</label>
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
              accept=".md,.txt,.json"
              className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setWarnings([]); setBulkResult(null); }}
            />
            {isJson && (
              <p className="text-xs text-muted mt-1">JSON export file — all activities will be imported.</p>
            )}
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

          {bulkResult !== null && (
            <div className="flex flex-col gap-2">
              <div className="rounded border border-green-600/40 bg-green-900/20 p-3 flex items-center gap-2">
                <CheckCircle size={13} className="text-green-400 shrink-0" />
                <span className="text-xs text-green-300">{bulkResult.imported} {bulkResult.imported === 1 ? 'activity' : 'activities'} imported</span>
              </div>
              {(bulkResult.errors.length > 0 || bulkResult.tag_warnings.length > 0) && (
                <div className="rounded border border-yellow-600/40 bg-yellow-900/20 p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-semibold mb-1">
                    <AlertTriangle size={12} /> Warnings
                  </div>
                  {bulkResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-yellow-300">"{err.title}": {err.message}</p>
                  ))}
                  {bulkResult.tag_warnings.map((w, i) => (
                    <p key={`tw-${i}`} className="text-xs text-yellow-300">{w}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <p className="text-xs text-red-400">{errorMessage}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={handleClose}>
              {isDone ? 'Close' : 'Cancel'}
            </Button>
            {!isDone && (
              <Button type="submit" disabled={!file || isPending}>
                {isPending ? 'Importing…' : 'Import'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
