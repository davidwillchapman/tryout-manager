# Implementation Plan: Activity Image & Video Support

## Overview

Add image and video media to activities. Media is available only on create/edit (not import). A single image can be linked to an activity; a single video can be embedded via YouTube, Vimeo, or a local uploaded file.

---

## 1. Database (`server/src/db.ts`)

### 1a. Directory setup
- Add `fs.mkdirSync` call for `data/videos` directory alongside the existing `data/images` call.

### 1b. Schema additions — migrations on `activities`
Add three new columns via `ALTER TABLE ... ADD COLUMN` migrations (with `.catch(() => {})` to ignore if already present):

```sql
ALTER TABLE activities ADD COLUMN image_id INTEGER REFERENCES activity_images(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN video_url TEXT;
ALTER TABLE activities ADD COLUMN video_type TEXT;
```

`video_type` will hold `'youtube'`, `'vimeo'`, or `'upload'`.  
`image_id` is a FK into the existing `activity_images` table.  
`video_url` stores the raw YouTube/Vimeo URL or `/videos/<filename>` for local uploads.

---

## 2. Server

### 2a. `server/src/index.ts`
- Add `app.use('/videos', express.static(path.resolve(__dirname, '../../data/videos')))` alongside the existing `/images` static route.

### 2b. `server/src/routes/activities.ts`

**New multer config** — video disk storage:
```ts
const videoStorage = multer.diskStorage({
  destination: path.resolve(__dirname, '../../../data/videos'),
  filename: (_req, file, cb) => { /* same timestamp + random pattern */ },
});
const videoUpload = multer({
  storage: videoStorage,
  fileFilter: /* allow mp4, mov, webm, ogg */,
  limits: { fileSize: 200 * 1024 * 1024 },  // 200 MB
});
```

**New route** — `POST /videos`:
- Accepts a single `video` file via `videoUpload.single('video')`.
- Returns `{ id, filename, url: '/videos/<filename>' }` (no DB record needed — URL is sufficient).

**Updated Zod schema** — add optional nullable fields to `activitySchema`:
```ts
image_id: z.number().int().optional().nullable(),
video_url: z.string().optional().nullable(),
video_type: z.enum(['youtube', 'vimeo', 'upload']).optional().nullable(),
```

**Updated `GET /:id`** — JOIN `activity_images` to fetch the linked image URL:
```sql
SELECT a.*, ai.filename AS image_filename
FROM activities a
LEFT JOIN activity_images ai ON ai.id = a.image_id
WHERE a.id = ?
```
Map `image_filename` → `image_url: '/images/<filename>'` in the response (or `null`).

**Updated `GET /` list** — same LEFT JOIN so list items include `image_url` if ever needed.

**Updated `POST /` (create)** and **`PUT /:id` (update)**:
- Accept and persist `image_id`, `video_url`, `video_type` from the validated body.

**Updated `POST /:id/clone`**:
- Copy `image_id`, `video_url`, `video_type` to the cloned activity.

---

## 3. Client

### 3a. `client/src/types.ts`
Extend `Activity`:
```ts
image_id: number | null;
image_url: string | null;
video_url: string | null;
video_type: 'youtube' | 'vimeo' | 'upload' | null;
```

### 3b. `client/src/api/activities.ts`
Add a new mutation hook:
```ts
export function useUploadVideo() { ... }
// POST /activities/videos with FormData, returns { url: string }
```

Update `useCreateActivity` and `useUpdateActivity` mutation types to include the new fields.

### 3c. `client/src/components/activities/ActivityForm.tsx`

The form gains two new optional sections below "Flexibility Notes":

**Image section:**
- A compact inline file picker (drag-and-drop zone, same UX as `ImageUploadModal`).
- On file selection, immediately call `POST /activities/images` and store the returned `image_id` in form state.
- While uploading show a spinner; on success show a thumbnail preview with an "×" remove button that clears `image_id`.
- If editing an activity that already has `image_url`, show the existing thumbnail on mount with the same remove option.

**Video section:**
- A URL input field labeled "Video URL" (YouTube, Vimeo, or direct `.mp4` link).
- On blur/change, auto-detect type: if URL contains `youtube.com` or `youtu.be` → `'youtube'`; `vimeo.com` → `'vimeo'`; otherwise → `null` (URL is only saved if a type can be detected or user explicitly selects).
- A secondary option: "Upload video file" toggle — shows a file input accepting `.mp4 .mov .webm .ogv`. On selection, calls `POST /activities/videos`, stores the returned URL + `video_type: 'upload'` in form state.
- Show a small inline preview or badge confirming what video is attached.
- An "×" remove button to clear `video_url` / `video_type`.

Form `onSubmit` passes `image_id`, `video_url`, `video_type` alongside existing fields.

### 3d. `client/src/components/activities/ActivityDetail.tsx`

Add two new `<Section>` blocks in the body (after "Summary"):

**Image section** — only renders if `activity.image_url`:
```tsx
<Section label="Image">
  <img src={activity.image_url} className="rounded max-h-64 object-contain" />
</Section>
```

**Video section** — only renders if `activity.video_url`:
- `video_type === 'youtube'`: render `<iframe>` with `https://www.youtube.com/embed/<id>` extracted from URL.
- `video_type === 'vimeo'`: render `<iframe>` with `https://player.vimeo.com/video/<id>`.
- `video_type === 'upload'`: render `<video controls src={activity.video_url} className="w-full rounded" />`.

Place the Video section after Image, before DNA Tags.

### 3e. `client/src/pages/PlaymakerPage.tsx`

Remove the standalone "Upload Image" button and the `imageOpen` state + `ImageUploadModal` usage. Image upload is now handled inline within the ActivityForm. The `ImageUploadModal` component itself can be deleted if no other consumer exists.

---

## 4. File Change Summary

| File | Change |
|------|--------|
| `server/src/db.ts` | Add `data/videos` mkdir; add 3 ALTER TABLE migrations |
| `server/src/index.ts` | Add `/videos` static route |
| `server/src/routes/activities.ts` | Video multer + `POST /videos` route; schema + CRUD updates; clone update |
| `client/src/types.ts` | Extend `Activity` with media fields |
| `client/src/api/activities.ts` | Add `useUploadVideo` hook |
| `client/src/components/activities/ActivityForm.tsx` | Add Image + Video sections |
| `client/src/components/activities/ActivityDetail.tsx` | Add Image + Video display sections |
| `client/src/pages/PlaymakerPage.tsx` | Remove standalone image upload button/modal |
| `client/src/components/activities/ImageUploadModal.tsx` | Delete (functionality moved inline) |

---

## 5. Key Decisions & Notes

- **One image per activity** — stored as a FK `image_id` on the activity row. Keeps the data model simple and consistent with the singular framing in the requirements.
- **One video per activity** — `video_url` + `video_type` on the activity row. No separate join table needed.
- **Two-step image attach in form** — upload fires immediately on file selection (optimistic UX) and the returned `image_id` is held in form state until save. This avoids multipart form complexity on the main create/update endpoints.
- **Video upload is optional** — URL entry is the primary path (no server storage needed for YouTube/Vimeo). File upload is an explicit secondary path.
- **No import support** — image and video fields are not parsed by `parseActivityMarkdown` and are silently ignored on import, per requirements.
- **Clone copies media references** — a cloned activity shares the same `image_id` and `video_url` (not duplicated on disk).
