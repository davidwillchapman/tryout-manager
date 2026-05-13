import { useRef, useState } from 'react';
import { ImageIcon, X, Upload, Link, Film } from 'lucide-react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { useUploadImage, useUploadVideo } from '../../api/activities';
import type { Activity } from '../../types';

const ACTIVITY_TYPES = [
  'Warm Up', 'Possession', 'Finishing', 'Scrimmage', 'Set Piece',
  'Defending', 'Transition', 'Technical', 'Fitness', 'Other',
];

type ActivityFormValues = Omit<Activity, 'id' | 'tag_count' | 'created_at' | 'updated_at'>;

interface ActivityFormProps {
  initialValues?: Partial<ActivityFormValues>;
  onSubmit: (values: ActivityFormValues) => void;
  isPending?: boolean;
  onCancel: () => void;
  submitLabel?: string;
}

function detectVideoType(url: string): 'youtube' | 'vimeo' | null {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/vimeo\.com/.test(url)) return 'vimeo';
  return null;
}

export function ActivityForm({ initialValues, onSubmit, isPending, onCancel, submitLabel = 'Save' }: ActivityFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [summary, setSummary] = useState(initialValues?.summary ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [activityType, setActivityType] = useState(initialValues?.activity_type ?? '');
  const [customType, setCustomType] = useState('');
  const [durationStr, setDurationStr] = useState(initialValues?.duration_minutes?.toString() ?? '');
  const [fieldSetup, setFieldSetup] = useState(initialValues?.field_setup ?? '');
  const [coachingPoints, setCoachingPoints] = useState(initialValues?.coaching_points ?? '');
  const [flexibilityNotes, setFlexibilityNotes] = useState(initialValues?.flexibility_notes ?? '');

  // Image state
  const [imageId, setImageId] = useState<number | null>(initialValues?.image_id ?? null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialValues?.image_url ?? null);
  const imageRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadImage();

  // Video state
  const [videoUrl, setVideoUrl] = useState(initialValues?.video_url ?? '');
  const [videoType, setVideoType] = useState<'youtube' | 'vimeo' | 'upload' | null>(initialValues?.video_type ?? null);
  const [videoMode, setVideoMode] = useState<'url' | 'upload'>('url');
  const videoRef = useRef<HTMLInputElement>(null);
  const uploadVideo = useUploadVideo();

  const [showCustom, setShowCustom] = useState(() => {
    const v = initialValues?.activity_type ?? '';
    return v !== '' && !ACTIVITY_TYPES.includes(v);
  });

  const handleTypeChange = (v: string) => {
    setActivityType(v);
    if (v === 'Other') {
      setShowCustom(true);
      setCustomType('');
    } else {
      setShowCustom(false);
    }
  };

  const handleImageFile = (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('images', file);
    uploadImage.mutate(fd, {
      onSuccess: (img) => {
        setImageId(img.id);
        setImagePreview(img.url);
      },
    });
  };

  const handleVideoUrlChange = (url: string) => {
    setVideoUrl(url);
    const detected = detectVideoType(url);
    setVideoType(detected);
  };

  const handleVideoFile = (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('video', file);
    uploadVideo.mutate(fd, {
      onSuccess: (vid) => {
        setVideoUrl(vid.url);
        setVideoType('upload');
      },
    });
  };

  const clearVideo = () => {
    setVideoUrl('');
    setVideoType(null);
    if (videoRef.current) videoRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedType = showCustom ? (customType || null) : (activityType || null);
    onSubmit({
      title,
      summary,
      description,
      activity_type: resolvedType,
      duration_minutes: durationStr ? parseInt(durationStr, 10) || null : null,
      field_setup: fieldSetup || null,
      coaching_points: coachingPoints || null,
      flexibility_notes: flexibilityNotes || null,
      image_id: imageId,
      image_url: imagePreview,
      video_url: videoUrl || null,
      video_type: videoType,
    });
  };

  const selectValue = showCustom ? 'Other' : (activityType || '');

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <label className="block text-xs text-muted mb-1">Title *</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Activity title" required />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Summary * <span className="font-normal opacity-60">(1–2 sentences)</span></label>
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Brief summary…" required />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Description *</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Full description of rules, organization, and flow…" required />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-muted mb-1">Activity Type</label>
          <select
            value={selectValue}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="flex h-9 w-full rounded border border-navy-600 bg-navy-900 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="">— None —</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {showCustom && (
            <Input
              className="mt-1"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Custom type…"
            />
          )}
        </div>
        <div className="w-32">
          <label className="block text-xs text-muted mb-1">Duration (min)</label>
          <Input
            type="number"
            value={durationStr}
            onChange={(e) => setDurationStr(e.target.value)}
            placeholder="e.g. 20"
            min={1}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Field Setup <span className="font-normal opacity-60">(markdown)</span></label>
        <Textarea value={fieldSetup} onChange={(e) => setFieldSetup(e.target.value)} rows={4} placeholder="Field dimensions, markings, player setup…" className="font-mono text-xs" />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Coaching Points <span className="font-normal opacity-60">(markdown)</span></label>
        <Textarea value={coachingPoints} onChange={(e) => setCoachingPoints(e.target.value)} rows={4} placeholder="- First key point&#10;- Second key point" className="font-mono text-xs" />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Flexibility Notes</label>
        <Textarea value={flexibilityNotes} onChange={(e) => setFlexibilityNotes(e.target.value)} rows={3} placeholder="How this activity can be adapted…" />
      </div>

      {/* Image section */}
      <div>
        <label className="block text-xs text-muted mb-1">Image</label>
        {imagePreview ? (
          <div className="relative inline-block">
            <img src={imagePreview} alt="Activity" className="max-h-40 rounded object-contain border border-navy-600" />
            <button
              type="button"
              onClick={() => { setImageId(null); setImagePreview(null); }}
              className="absolute -top-2 -right-2 bg-navy-700 border border-navy-600 rounded-full p-0.5 text-muted hover:text-red-400 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed border-navy-600 rounded-lg p-4 cursor-pointer hover:border-gold transition-colors"
            onClick={() => imageRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleImageFile(e.dataTransfer.files[0] ?? null); }}
          >
            {uploadImage.isPending ? (
              <p className="text-xs text-muted">Uploading…</p>
            ) : (
              <>
                <ImageIcon size={24} className="text-navy-600 mb-1" />
                <p className="text-xs text-muted">Drag & drop or click to choose</p>
                <p className="text-xs text-muted opacity-60">JPG, PNG, GIF, WebP</p>
              </>
            )}
          </div>
        )}
        <input
          ref={imageRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
          className="hidden"
          onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
        />
        {uploadImage.isError && (
          <p className="text-xs text-red-400 mt-1">{String((uploadImage.error as Error).message)}</p>
        )}
      </div>

      {/* Video section */}
      <div>
        <label className="block text-xs text-muted mb-1">Video</label>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => { setVideoMode('url'); clearVideo(); }}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${videoMode === 'url' ? 'border-gold text-gold' : 'border-navy-600 text-muted hover:text-white'}`}
          >
            <Link size={11} /> URL
          </button>
          <button
            type="button"
            onClick={() => { setVideoMode('upload'); clearVideo(); }}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${videoMode === 'upload' ? 'border-gold text-gold' : 'border-navy-600 text-muted hover:text-white'}`}
          >
            <Film size={11} /> Upload file
          </button>
        </div>

        {videoMode === 'url' ? (
          <div className="flex gap-2 items-center">
            <Input
              value={videoUrl}
              onChange={(e) => handleVideoUrlChange(e.target.value)}
              placeholder="YouTube, Vimeo, or direct .mp4 URL"
            />
            {videoUrl && (
              <button type="button" onClick={clearVideo} className="text-muted hover:text-red-400 shrink-0">
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <div>
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-navy-600 rounded-lg p-4 cursor-pointer hover:border-gold transition-colors"
              onClick={() => videoRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleVideoFile(e.dataTransfer.files[0] ?? null); }}
            >
              {uploadVideo.isPending ? (
                <p className="text-xs text-muted">Uploading…</p>
              ) : (
                <>
                  <Upload size={24} className="text-navy-600 mb-1" />
                  <p className="text-xs text-muted">Drag & drop or click to choose</p>
                  <p className="text-xs text-muted opacity-60">MP4, MOV, WebM, OGV (max 200 MB)</p>
                </>
              )}
            </div>
            <input
              ref={videoRef}
              type="file"
              accept=".mp4,.mov,.webm,.ogv,video/*"
              className="hidden"
              onChange={(e) => handleVideoFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {videoUrl && videoType && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-green-400">
            <Film size={11} />
            <span>
              {videoType === 'youtube' && 'YouTube video attached'}
              {videoType === 'vimeo' && 'Vimeo video attached'}
              {videoType === 'upload' && 'Video file uploaded'}
            </span>
            <button type="button" onClick={clearVideo} className="ml-auto text-muted hover:text-red-400">
              <X size={11} />
            </button>
          </div>
        )}

        {uploadVideo.isError && (
          <p className="text-xs text-red-400 mt-1">{String((uploadVideo.error as Error).message)}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1 sticky bottom-0 bg-navy-800 pb-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  );
}
