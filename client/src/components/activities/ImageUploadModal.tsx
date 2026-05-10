import { useRef, useState } from 'react';
import { ImageIcon, Upload, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog, DialogContent } from '../ui/Dialog';
import { useUploadImage } from '../../api/activities';
import type { UploadedImage } from '../../types';

interface ImageUploadModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImageUploadModal({ open, onClose }: ImageUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedImage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadImage();

  const handleFileChange = (f: File | null) => {
    setFile(f);
    setUploaded(null);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('images', file);
    uploadImage.mutate(fd, {
      onSuccess: (img) => setUploaded(img),
    });
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setUploaded(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent title="Upload Image">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed border-navy-600 rounded-lg p-6 cursor-pointer hover:border-gold transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFileChange(f);
            }}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-48 rounded object-contain" />
            ) : (
              <>
                <ImageIcon size={32} className="text-navy-600 mb-2" />
                <p className="text-sm text-muted">Drag & drop or click to choose</p>
                <p className="text-xs text-muted mt-0.5">JPG, PNG, GIF, WebP</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />

          {uploaded && (
            <div className="flex items-center gap-2 rounded border border-green-600/40 bg-green-900/20 px-3 py-2">
              <Check size={14} className="text-green-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-green-300 font-medium">Uploaded successfully</p>
                <p className="text-xs text-muted truncate">{uploaded.filename}</p>
              </div>
            </div>
          )}

          {uploadImage.isError && (
            <p className="text-xs text-red-400">{String((uploadImage.error as Error).message)}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              {uploaded ? 'Close' : 'Cancel'}
            </Button>
            {!uploaded && (
              <Button type="submit" disabled={!file || uploadImage.isPending}>
                {uploadImage.isPending ? (
                  <span className="flex items-center gap-1.5"><Upload size={13} /> Uploading…</span>
                ) : (
                  <span className="flex items-center gap-1.5"><Upload size={13} /> Upload</span>
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
