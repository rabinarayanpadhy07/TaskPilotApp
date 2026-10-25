import { useRef, useState } from "react"
import { Pencil } from "lucide-react"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { parseApiError } from "@/lib/api-errors"
import { cn } from "@/lib/utils"

/**
 * Click-to-edit issue title. Enter saves, Escape cancels; blur saves too.
 * `onSave(title)` must return a promise that rejects on failure.
 */
export function EditableTitle({ value, onSave, disabled = false }) {
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState(null)
  const editing = draft !== null
  // Escape unmounts the input; ignore the blur that may follow. Also avoid double saves.
  const skipBlur = useRef(false)
  const saving = useRef(false)

  function cancel() {
    skipBlur.current = true
    setDraft(null)
    setError(null)
  }

  async function commit() {
    if (saving.current) return
    const next = draft?.trim() ?? ""
    if (!next) {
      setError("The title can't be empty.")
      return
    }
    if (next === value) {
      setDraft(null)
      return
    }
    saving.current = true
    try {
      await onSave(next)
      skipBlur.current = true
      setDraft(null)
      setError(null)
    } catch (err) {
      const parsed = parseApiError(err)
      setError(parsed.fieldErrors.title ?? parsed.message)
    } finally {
      saving.current = false
    }
  }

  if (!editing) {
    return (
      <h1 className="text-xl leading-snug sm:text-2xl">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            skipBlur.current = false
            setDraft(value)
          }}
          className="focus-ring group -mx-1.5 w-[calc(100%+0.75rem)] cursor-pointer rounded-md px-1.5 py-0.5 text-left hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent"
          aria-label={`Title: ${value}. Edit title`}
        >
          {value}
          {!disabled && (
            <Pencil aria-hidden="true" className="ml-2 inline size-3.5 align-baseline text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
          )}
        </button>
      </h1>
    )
  }

  return (
    <div>
      <label htmlFor="issue-title-input" className="sr-only">
        Issue title
      </label>
      <textarea
        id="issue-title-input"
        rows={1}
        value={draft}
        autoFocus
        maxLength={255}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "issue-title-error" : "issue-title-hint"}
        onChange={(event) => {
          setDraft(event.target.value.replace(/\n/g, " "))
          setError(null)
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            commit()
          } else if (event.key === "Escape") {
            event.preventDefault()
            cancel()
          }
        }}
        onBlur={() => {
          if (skipBlur.current) {
            skipBlur.current = false
            return
          }
          commit()
        }}
        className="field-sizing-content -mx-1.5 w-[calc(100%+0.75rem)] resize-none rounded-md border border-primary bg-surface px-1.5 py-0.5 text-xl leading-snug font-semibold tracking-tight text-foreground ring-[3px] ring-ring/20 outline-none sm:text-2xl aria-invalid:border-danger aria-invalid:ring-danger/20"
      />
      {error ? (
        <p id="issue-title-error" className="mt-1 text-xs text-danger-text">
          {error}
        </p>
      ) : (
        <p id="issue-title-hint" className="mt-1 text-xs text-muted-foreground">
          Enter to save · Esc to cancel
        </p>
      )}
    </div>
  )
}

/** Click-to-edit description. Ctrl/⌘ + Enter saves, Escape cancels. */
export function EditableDescription({ value, onSave, disabled = false }) {
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function save() {
    if (draft === value) {
      setDraft(null)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
      setDraft(null)
    } catch (err) {
      setError(parseApiError(err).message || "Couldn't save the description.")
    } finally {
      setSaving(false)
    }
  }

  if (draft === null) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setDraft(value)}
        aria-label={value ? "Edit description" : "Add a description"}
        className={cn(
          "focus-ring -mx-2 block w-[calc(100%+1rem)] cursor-pointer rounded-md px-2 py-1.5 text-left text-sm leading-6 hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent",
          value ? "whitespace-pre-wrap text-foreground" : "text-muted-foreground"
        )}
      >
        {value || (disabled ? "No description." : "Add a description…")}
      </button>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      <label htmlFor="issue-description-input" className="sr-only">
        Description
      </label>
      <Textarea
        id="issue-description-input"
        value={draft}
        autoFocus
        rows={6}
        maxLength={10000}
        placeholder="Add context, acceptance criteria or steps to reproduce…"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            save()
          } else if (event.key === "Escape") {
            event.preventDefault()
            setDraft(null)
            setError(null)
          }
        }}
        className="min-h-32"
      />
      {error && <Alert variant="danger">{error} Your text is kept below so you can try again.</Alert>}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} loading={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={saving}
          onClick={() => {
            setDraft(null)
            setError(null)
          }}
        >
          Cancel
        </Button>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">Ctrl/⌘ + Enter to save · Esc to cancel</span>
      </div>
    </div>
  )
}
