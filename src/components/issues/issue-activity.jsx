import { useState } from "react"
import { History, MessageSquare, MoreHorizontal, Pencil, RotateCw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  useAddComment,
  useComments,
  useCurrentMember,
  useDeleteComment,
  useEditComment,
  useIssueActivity,
  useMemberMap,
  useSprints,
} from "@/api/hooks"
import { describeActivity } from "@/components/issues/describe-activity"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/user-avatar"
import { parseApiError } from "@/lib/api-errors"
import { formatDateTime } from "@/lib/dates"
import { formatRelativeTime } from "@/lib/utils"

function Timestamp({ value, prefix = "" }) {
  return (
    <time dateTime={value} title={formatDateTime(value)} className="text-xs text-muted-foreground">
      {prefix}
      {formatRelativeTime(value)}
    </time>
  )
}

function ActivitySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4" aria-busy="true" aria-label="Loading">
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="grid flex-1 grid-cols-1 gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function LoadError({ what, onRetry }) {
  return (
    <Alert
      variant="danger"
      action={
        <Button size="sm" variant="secondary" onClick={onRetry}>
          <RotateCw />
          Retry
        </Button>
      }
    >
      Couldn't load {what}.
    </Alert>
  )
}

function EmptyNote({ icon: Icon, children }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-dashed bg-surface px-4 py-5 text-sm text-muted-foreground">
      <Icon aria-hidden="true" className="size-4" />
      {children}
    </p>
  )
}

/** Shared textarea editor for new and edited comments. Ctrl/⌘ + Enter submits. */
function CommentEditor({ id, initial = "", submitLabel, pendingLabel, onSubmit, onCancel, autoFocus }) {
  const [body, setBody] = useState(initial)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const trimmed = body.trim()

  async function submit() {
    if (!trimmed) {
      setError("Write a comment first.")
      return
    }
    setError(null)
    setPending(true)
    try {
      await onSubmit(trimmed)
      if (!onCancel) setBody("")
    } catch (err) {
      const parsed = parseApiError(err)
      setError(parsed.fieldErrors.body ?? parsed.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-w-0 flex-1 grid-cols-1 gap-2">
      <label htmlFor={id} className="sr-only">
        {onCancel ? "Edit comment" : "Add a comment"}
      </label>
      <Textarea
        id={id}
        value={body}
        rows={3}
        maxLength={5000}
        autoFocus={autoFocus}
        placeholder="Add a comment…"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => {
          setBody(event.target.value)
          if (error) setError(null)
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            submit()
          } else if (event.key === "Escape" && onCancel) {
            event.preventDefault()
            onCancel()
          }
        }}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger-text">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button size="sm" onClick={submit} loading={pending} disabled={!trimmed || (onCancel && trimmed === initial)}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          Ctrl/⌘ + Enter to save
        </span>
      </div>
    </div>
  )
}

function DeleteCommentDialog({ open, onOpenChange, onConfirm, pending }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete this comment?</DialogTitle>
          <DialogDescription>It will be removed for everyone. This can't be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm} loading={pending}>
            Delete comment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * One comment. Edit/delete appear only when the API's per-comment
 * permissions allow them; the server enforces them regardless.
 */
function CommentItem({ comment, author, issueKey }) {
  const editComment = useEditComment(issueKey)
  const deleteComment = useDeleteComment(issueKey)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const { canEdit, canDelete } = comment.permissions ?? {}

  return (
    <li className="flex gap-3">
      <UserAvatar name={author?.name ?? "Unknown"} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="text-sm font-medium">{author?.name ?? "Former member"}</span>
          <Timestamp value={comment.createdAt} />
          {comment.editedAt && (
            <span className="text-xs text-muted-foreground" title={`Edited ${formatDateTime(comment.editedAt)}`}>
              (edited)
            </span>
          )}
          {(canEdit || canDelete) && !editing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" className="ml-auto text-muted-foreground" aria-label="Comment actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onSelect={() => setEditing(true)}>
                    <Pencil />
                    Edit comment
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
                    <Trash2 />
                    Delete comment
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {editing ? (
          <div className="mt-2">
            <CommentEditor
              id={`edit-comment-${comment.id}`}
              initial={comment.body}
              autoFocus
              submitLabel="Save"
              pendingLabel="Saving…"
              onSubmit={async (body) => {
                await editComment.mutateAsync({ id: comment.id, body })
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-foreground">{comment.body}</p>
        )}
      </div>
      <DeleteCommentDialog
        open={confirming}
        onOpenChange={setConfirming}
        pending={deleteComment.isPending}
        onConfirm={() =>
          deleteComment.mutate(comment.id, {
            onSuccess: () => setConfirming(false),
            onError: (err) => toast.error("Couldn't delete the comment", { description: parseApiError(err).message }),
          })
        }
      />
    </li>
  )
}

function CommentComposer({ issueKey, me, canComment }) {
  const addComment = useAddComment(issueKey)
  if (!canComment) return <p className="text-sm text-muted-foreground">You don't have permission to comment on this issue.</p>
  return (
    <div className="flex gap-3">
      {me && <UserAvatar name={me.name} className="mt-0.5 hidden sm:flex" />}
      <CommentEditor
        id={`comment-${issueKey}`}
        submitLabel="Comment"
        pendingLabel="Posting…"
        onSubmit={(body) => addComment.mutateAsync({ body })}
      />
    </div>
  )
}

function HistoryLine({ event, actor, context }) {
  return (
    <li className="relative flex gap-3">
      <UserAvatar name={actor?.name ?? "Unknown"} size="sm" className="ring-4 ring-surface" />
      <p className="min-w-0 flex-1 pt-0.5 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{actor?.name ?? "Someone"}</span> {describeActivity(event, context)} ·{" "}
        <Timestamp value={event.createdAt} />
      </p>
    </li>
  )
}

/**
 * Comments and history for an issue, in accessible tabs: everything
 * chronologically, comments only, or field changes only.
 */
export function IssueActivity({ issue, issuesById }) {
  const comments = useComments(issue.key)
  const history = useIssueActivity(issue.key)
  const { data: sprints = [] } = useSprints(issue.projectId)
  const { data: me } = useCurrentMember()
  const memberMap = useMemberMap()
  const context = { memberMap, issuesById, sprintsById: Object.fromEntries(sprints.map((s) => [s.id, s])) }
  const canComment = issue.permissions?.canComment !== false

  // "commented" events duplicate the comments themselves in the combined view
  const events = (history.data ?? []).filter((event) => event.kind !== "commented")
  const timeline = [
    ...(comments.data ?? []).map((comment) => ({ type: "comment", at: comment.createdAt, comment })),
    ...events.map((event) => ({ type: "event", at: event.createdAt, event })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  const commentList = (list) => (
    <ul className="grid grid-cols-1 gap-5" aria-label="Comments">
      {list.map((comment) => (
        <CommentItem key={comment.id} comment={comment} author={memberMap[comment.authorId]} issueKey={issue.key} />
      ))}
    </ul>
  )

  return (
    <section aria-labelledby="issue-activity-heading">
      <h2 id="issue-activity-heading" className="mb-3">
        Activity
      </h2>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="comments">
            Comments
            {comments.data?.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">{comments.data.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="grid grid-cols-1 gap-6 pt-2">
          <CommentComposer issueKey={issue.key} me={me} canComment={canComment} />
          {(comments.isPending || history.isPending) && <ActivitySkeleton />}
          {(comments.isError || history.isError) && (
            <LoadError
              what="activity"
              onRetry={() => {
                comments.refetch()
                history.refetch()
              }}
            />
          )}
          {!comments.isPending && !history.isPending && timeline.length === 0 && <EmptyNote icon={History}>No activity yet.</EmptyNote>}
          {timeline.length > 0 && (
            <ol className="grid grid-cols-1 gap-5" aria-label="All activity">
              {timeline.map((item) =>
                item.type === "comment" ? (
                  <CommentItem key={item.comment.id} comment={item.comment} author={memberMap[item.comment.authorId]} issueKey={issue.key} />
                ) : (
                  <HistoryLine key={item.event.id} event={item.event} actor={memberMap[item.event.actorId]} context={context} />
                )
              )}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="comments" className="grid grid-cols-1 gap-6 pt-2">
          <CommentComposer issueKey={issue.key} me={me} canComment={canComment} />
          {comments.isPending && <ActivitySkeleton />}
          {comments.isError && <LoadError what="comments" onRetry={() => comments.refetch()} />}
          {comments.data?.length === 0 && <EmptyNote icon={MessageSquare}>No comments yet. Start the conversation.</EmptyNote>}
          {comments.data?.length > 0 && commentList([...comments.data].reverse())}
        </TabsContent>

        <TabsContent value="history" className="pt-2">
          {history.isPending && <ActivitySkeleton />}
          {history.isError && <LoadError what="history" onRetry={() => history.refetch()} />}
          {events.length === 0 && history.isSuccess && <EmptyNote icon={History}>No changes recorded yet.</EmptyNote>}
          {events.length > 0 && (
            <ol
              className="relative grid grid-cols-1 gap-4 before:absolute before:top-2 before:bottom-2 before:left-3 before:w-px before:bg-border"
              aria-label="History"
            >
              {[...events].reverse().map((event) => (
                <HistoryLine key={event.id} event={event} actor={memberMap[event.actorId]} context={context} />
              ))}
            </ol>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}
