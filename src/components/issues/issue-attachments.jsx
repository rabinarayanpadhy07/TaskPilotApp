import { useRef, useState } from "react"
import { File, FileImage, FileText, Paperclip, Trash2, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { useAttachments, useDeleteAttachment, useMemberMap, useUploadAttachment } from "@/api/hooks"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { parseApiError } from "@/lib/api-errors"
import { formatFileSize } from "@/lib/dates"
import { cn, formatRelativeTime } from "@/lib/utils"
import { ATTACHMENT_ACCEPT, ATTACHMENT_MAX_BYTES } from "@/models/issue"

function fileIcon(contentType) {
  if (contentType?.startsWith("image/")) return FileImage
  if (contentType === "application/pdf" || contentType?.startsWith("text/")) return FileText
  return File
}

/** Client-side check for fast feedback; the API must validate uploads too. */
function validateFile(file) {
  if (file.size > ATTACHMENT_MAX_BYTES) return `${file.name} is larger than ${formatFileSize(ATTACHMENT_MAX_BYTES)}.`
  if (file.size === 0) return `${file.name} is empty.`
  return null
}

let uploadSeq = 0

/**
 * Attachment list with drag-and-drop / file-picker upload and per-file
 * progress. With sample data, files stay in this browser tab only.
 */
export function IssueAttachments({ issue, disabled = false }) {
  const { data: attachments, isPending } = useAttachments(issue.key)
  const upload = useUploadAttachment(issue.key)
  const remove = useDeleteAttachment(issue.key)
  const memberMap = useMemberMap()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState([]) // { id, name, progress, error }

  const patchUpload = (id, patch) => setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)))

  function startUploads(fileList) {
    for (const file of Array.from(fileList)) {
      const id = `up-${++uploadSeq}`
      const problem = validateFile(file)
      setUploads((list) => [...list, { id, name: file.name, progress: 0, error: problem }])
      if (problem) continue

      upload.mutate(
        { file, onProgress: (progress) => patchUpload(id, { progress }) },
        {
          onSuccess: () => setUploads((list) => list.filter((u) => u.id !== id)),
          onError: (err) => patchUpload(id, { error: parseApiError(err, "Upload failed.").message }),
        }
      )
    }
  }

  return (
    <section aria-labelledby="issue-attachments-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="issue-attachments-heading" className="flex items-center gap-2">
          Attachments
          {attachments?.length > 0 && <span className="text-sm font-normal text-muted-foreground">{attachments.length}</span>}
        </h2>
        {!disabled && (
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload />
            Upload
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose files to attach"
        onChange={(event) => {
          startUploads(event.target.files)
          event.target.value = ""
        }}
      />

      {!disabled && (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            startUploads(event.dataTransfer.files)
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition-colors",
            dragging ? "border-primary bg-selected" : "border-input bg-surface"
          )}
        >
          <Paperclip aria-hidden="true" className="size-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drop files here or{" "}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="focus-ring cursor-pointer rounded-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              browse
            </button>
          </p>
          <p className="text-xs text-muted-foreground">
            Up to {formatFileSize(ATTACHMENT_MAX_BYTES)} each.
          </p>
        </div>
      )}

      {uploads.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 gap-2" aria-label="Uploads in progress" aria-live="polite">
          {uploads.map((item) => (
            <li key={item.id} className="rounded-lg border bg-surface px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                {item.error ? (
                  <button
                    type="button"
                    onClick={() => setUploads((list) => list.filter((u) => u.id !== item.id))}
                    aria-label={`Dismiss error for ${item.name}`}
                    className="focus-ring cursor-pointer rounded-sm text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                ) : (
                  <span className="text-xs tabular-nums text-muted-foreground">{item.progress}%</span>
                )}
              </div>
              {item.error ? (
                <p role="alert" className="mt-1 text-xs text-danger-text">
                  {item.error}
                </p>
              ) : (
                <div
                  role="progressbar"
                  aria-label={`Uploading ${item.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item.progress}
                  className="mt-2 h-1 overflow-hidden rounded-full bg-muted"
                >
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${item.progress}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {isPending && <Skeleton className="mt-3 h-12 w-full" />}
      {attachments?.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Attached files">
          {attachments.map((file) => {
            const Icon = fileIcon(file.contentType)
            const uploader = memberMap[file.uploadedById]
            return (
              <li key={file.id} className="flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  {file.url ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="focus-ring block truncate rounded-sm text-sm font-medium hover:text-primary"
                    >
                      {file.fileName}
                    </a>
                  ) : (
                    <span className="block truncate text-sm font-medium" title="Sample file: no content to download">
                      {file.fileName}
                    </span>
                  )}
                  <p className="truncate text-xs text-muted-foreground">
                    {formatFileSize(file.size)} · {uploader?.name ?? "Someone"} · {formatRelativeTime(file.createdAt)}
                  </p>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${file.fileName}`}
                    className="text-muted-foreground hover:text-danger-text"
                    onClick={() =>
                      remove.mutate(file.id, {
                        onError: (err) => toast.error("Couldn't remove the file", { description: parseApiError(err).message }),
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {attachments?.length === 0 && uploads.length === 0 && disabled && (
        <p className="text-sm text-muted-foreground">No attachments.</p>
      )}
    </section>
  )
}
