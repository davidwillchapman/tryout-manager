import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Edit2, Trash2, Copy, Plus, ExternalLink, X, Clock, Tag as TagIcon, ImageIcon, Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { ActivityForm } from './ActivityForm';
import { TagForm } from './TagForm';
import { ProgressionPicker } from './ProgressionPicker';
import {
  useActivity,
  useUpdateActivity,
  useDeleteActivity,
  useCloneActivity,
  useDeleteTag,
  useAddReference,
  useUpdateReference,
  useDeleteReference,
  useDeleteProgression,
  useUploadImage,
} from '../../api/activities';
import type { ActivityDetail as ActivityDetailType, ActivityReference } from '../../types';

interface ActivityDetailProps {
  activityId: number;
  onDeleted: () => void;
  onCloned: (id: number) => void;
  onProgressionClick: (id: number) => void;
}

export function ActivityDetail({ activityId, onDeleted, onCloned, onProgressionClick }: ActivityDetailProps) {
  const { data: activity, isLoading } = useActivity(activityId);
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const cloneActivity = useCloneActivity();
  const uploadImage = useUploadImage();
  const imageRef = useRef<HTMLInputElement>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [tagFormOpen, setTagFormOpen] = useState(false);
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [addRefOpen, setAddRefOpen] = useState(false);

  if (isLoading) return <div className="p-6 text-muted text-sm">Loading…</div>;
  if (!activity) return null;

  const handleDelete = () => {
    if (confirm(`Delete "${activity.title}"? This cannot be undone.`)) {
      deleteActivity.mutate(activity.id, { onSuccess: onDeleted });
    }
  };

  const handleClone = () => {
    cloneActivity.mutate(activity.id, { onSuccess: (a) => onCloned(a.id) });
  };

  const baseFields = {
    title: activity.title, summary: activity.summary, description: activity.description,
    activity_type: activity.activity_type, duration_minutes: activity.duration_minutes,
    field_setup: activity.field_setup, coaching_points: activity.coaching_points,
    flexibility_notes: activity.flexibility_notes, video_url: activity.video_url, video_type: activity.video_type,
  };

  const handleImageUpload = (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('images', file);
    uploadImage.mutate(fd, {
      onSuccess: (img) => updateActivity.mutate({ id: activity.id, ...baseFields, image_id: img.id, image_url: img.url }),
    });
  };

  const handleRemoveImage = () => {
    updateActivity.mutate({ id: activity.id, ...baseFields, image_id: null, image_url: null });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-navy-700 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight">{activity.title}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {activity.activity_type && <Badge>{activity.activity_type}</Badge>}
              {activity.duration_minutes && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Clock size={11} /> {activity.duration_minutes} min
                </span>
              )}
              {(activity.tags?.length ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <TagIcon size={11} /> {activity.tags.length} tag{activity.tags.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
              <Edit2 size={13} /> Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClone} disabled={cloneActivity.isPending}>
              <Copy size={13} /> Clone
            </Button>
            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={handleDelete}>
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        {/* Summary */}
        <Section label="Summary">
          <p className="text-sm text-gray-300">{activity.summary}</p>
        </Section>

        {/* Description */}
        <Section label="Description">
          <MarkdownBlock>{activity.description}</MarkdownBlock>
        </Section>

        {/* Image */}
        <Section
          label="Image"
          action={activity.image_url ? (
            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={handleRemoveImage} disabled={updateActivity.isPending}>
              <X size={12} /> Remove
            </Button>
          ) : undefined}
        >
          <input
            ref={imageRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files?.[0] ?? null)}
          />
          {activity.image_url ? (
            <div
              className="relative inline-block group cursor-pointer"
              onClick={() => imageRef.current?.click()}
              title="Click to replace image"
            >
              <img src={activity.image_url} alt={activity.title} className="rounded max-h-64 object-contain border border-navy-700" />
              <div className="absolute inset-0 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <Upload size={16} className="text-white" />
                <span className="text-white text-xs font-medium">Replace</span>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-navy-600 rounded-lg p-5 cursor-pointer hover:border-gold transition-colors"
              onClick={() => imageRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleImageUpload(e.dataTransfer.files[0] ?? null); }}
            >
              {uploadImage.isPending || updateActivity.isPending ? (
                <p className="text-xs text-muted">Uploading…</p>
              ) : (
                <>
                  <ImageIcon size={20} className="text-navy-600 mb-1" />
                  <p className="text-xs text-muted">Drag & drop or click to add image</p>
                </>
              )}
            </div>
          )}
          {uploadImage.isError && <p className="text-xs text-red-400 mt-1">{String((uploadImage.error as Error).message)}</p>}
        </Section>

        {/* Video */}
        {activity.video_url && activity.video_type && (
          <Section label="Video">
            <VideoEmbed url={activity.video_url} type={activity.video_type} />
          </Section>
        )}

        {/* DNA Tags */}
        <Section
          label="DNA Tags"
          action={<Button size="sm" variant="ghost" onClick={() => setTagFormOpen(true)}><Plus size={12} /> Add Tag</Button>}
        >
          {activity.tags.length === 0 ? (
            <p className="text-xs text-muted italic">No tags yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {activity.tags.map((tag) => (
                <TagRow key={tag.id} activityId={activity.id} tag={tag} />
              ))}
            </div>
          )}
        </Section>

        {/* Field Setup */}
        {activity.field_setup && (
          <Section label="Field Setup">
            <MarkdownBlock>{activity.field_setup}</MarkdownBlock>
          </Section>
        )}

        {/* Coaching Points */}
        {activity.coaching_points && (
          <Section label="Coaching Points">
            <MarkdownBlock>{activity.coaching_points}</MarkdownBlock>
          </Section>
        )}

        {/* Flexibility Notes */}
        {activity.flexibility_notes && (
          <Section label="Flexibility Notes">
            <MarkdownBlock>{activity.flexibility_notes}</MarkdownBlock>
          </Section>
        )}

        {/* External References */}
        <Section
          label="External References"
          action={<Button size="sm" variant="ghost" onClick={() => setAddRefOpen(true)}><Plus size={12} /> Add</Button>}
        >
          {activity.references.length === 0 ? (
            <p className="text-xs text-muted italic">No references yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {activity.references.map((ref) => (
                <ReferenceRow key={ref.id} activityId={activity.id} reference={ref} />
              ))}
            </div>
          )}
        </Section>

        {/* Progressions */}
        <Section
          label="Progressions"
          action={<Button size="sm" variant="ghost" onClick={() => setProgressionOpen(true)}><Plus size={12} /> Add</Button>}
        >
          {activity.progressions.length === 0 ? (
            <p className="text-xs text-muted italic">No progressions linked yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {activity.progressions.map((p) => (
                <ProgressionRow
                  key={p.id}
                  activityId={activity.id}
                  progression={p}
                  onClick={() => onProgressionClick(p.progression_activity_id)}
                />
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => !v && setEditOpen(false)}>
        <DialogContent title="Edit Activity" className="max-w-2xl">
          <ActivityForm
            initialValues={activity}
            onSubmit={(values) => {
              updateActivity.mutate({ id: activity.id, ...values }, { onSuccess: () => setEditOpen(false) });
            }}
            isPending={updateActivity.isPending}
            onCancel={() => setEditOpen(false)}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      <TagForm activityId={activity.id} open={tagFormOpen} onClose={() => setTagFormOpen(false)} />

      <ProgressionPicker
        activityId={activity.id}
        existingProgressions={activity.progressions}
        open={progressionOpen}
        onClose={() => setProgressionOpen(false)}
      />

      <AddReferenceDialog
        activityId={activity.id}
        refCount={activity.references.length}
        open={addRefOpen}
        onClose={() => setAddRefOpen(false)}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function VideoEmbed({ url, type }: { url: string; type: 'youtube' | 'vimeo' | 'upload' }) {
  if (type === 'youtube') {
    const id = extractYouTubeId(url);
    if (!id) return <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">{url}</a>;
    return (
      <div className="aspect-video w-full">
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          className="w-full h-full rounded"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (type === 'vimeo') {
    const id = extractVimeoId(url);
    if (!id) return <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">{url}</a>;
    return (
      <div className="aspect-video w-full">
        <iframe
          src={`https://player.vimeo.com/video/${id}`}
          className="w-full h-full rounded"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return <video controls src={url} className="w-full rounded max-h-64" />;
}

function Section({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function MarkdownBlock({ children }: { children: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

function TagRow({ activityId, tag }: { activityId: number; tag: ActivityDetailType['tags'][0] }) {
  const deleteTag = useDeleteTag();
  const parts = [tag.framework_name, tag.phase_title, tag.principle_title, tag.sub_principle_title].filter(Boolean);

  return (
    <div className="flex items-center justify-between gap-2 bg-navy-800 border border-navy-700 rounded px-3 py-2">
      <p className="text-xs text-gray-300">{parts.join(' › ')}</p>
      <button
        onClick={() => deleteTag.mutate({ activityId, tagId: tag.id })}
        className="text-muted hover:text-red-400 transition-colors shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function ReferenceRow({ activityId, reference }: { activityId: number; reference: ActivityReference }) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(reference.url);
  const [label, setLabel] = useState(reference.label ?? '');
  const updateRef = useUpdateReference();
  const deleteRef = useDeleteReference();

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5 bg-navy-800 border border-navy-700 rounded p-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" className="h-7 text-xs" />
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className="h-7 text-xs" />
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          <Button size="sm" onClick={() => {
            updateRef.mutate(
              { activityId, refId: reference.id, url, label: label || null, order_index: reference.order_index },
              { onSuccess: () => setEditing(false) }
            );
          }} disabled={updateRef.isPending}>Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <a
        href={reference.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 flex-1 min-w-0"
      >
        <ExternalLink size={11} className="shrink-0" />
        <span className="truncate">{reference.label || reference.url}</span>
      </a>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => setEditing(true)} className="text-muted hover:text-white p-0.5"><Edit2 size={11} /></button>
        <button
          onClick={() => deleteRef.mutate({ activityId, refId: reference.id })}
          className="text-muted hover:text-red-400 p-0.5"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}

function ProgressionRow({
  activityId,
  progression,
  onClick,
}: {
  activityId: number;
  progression: ActivityDetailType['progressions'][0];
  onClick: () => void;
}) {
  const deleteProgression = useDeleteProgression();

  return (
    <div className="flex items-center gap-2 group">
      <button
        onClick={onClick}
        className="flex-1 min-w-0 text-left bg-navy-800 border border-navy-700 rounded px-3 py-2 hover:border-gold transition-colors"
      >
        <p className="text-sm font-medium text-white group-hover:text-gold transition-colors truncate">{progression.progression_title}</p>
        {progression.progression_summary && (
          <p className="text-xs text-muted mt-0.5 truncate">{progression.progression_summary}</p>
        )}
      </button>
      <button
        onClick={() => deleteProgression.mutate({ activityId, progressionId: progression.id })}
        className="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function AddReferenceDialog({
  activityId,
  refCount,
  open,
  onClose,
}: {
  activityId: number;
  refCount: number;
  open: boolean;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const addRef = useAddReference();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addRef.mutate(
      { activityId, url, label: label || null, order_index: refCount },
      {
        onSuccess: () => {
          setUrl(''); setLabel('');
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Add Reference">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">URL *</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" required type="url" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Label</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Display name (optional)" />
          </div>
          {addRef.isError && <p className="text-xs text-red-400">{String((addRef.error as Error).message)}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={addRef.isPending}>Add Reference</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
