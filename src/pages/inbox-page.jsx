import { CheckCheck, Inbox, RotateCw } from "lucide-react"

import { useMarkNotificationsRead, useNotifications, useUnreadCount } from "@/api/hooks"
import { NotificationList } from "@/components/notifications/notification-list"
import { PageHeader } from "@/components/page-header"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useUrlFilters } from "@/lib/use-url-filters"
import { cn } from "@/lib/utils"
import { NOTIFICATION_CATEGORIES } from "@/models/notification"

const filterDefaults = { category: "", unread: "" }

export function InboxPage() {
  const { data: notifications = [], isPending, isError, refetch, isFetching } = useNotifications()
  const unread = useUnreadCount()
  const markAll = useMarkNotificationsRead()
  const { values, set } = useUrlFilters(filterDefaults)

  const categories = [{ value: "", label: "All" }, ...NOTIFICATION_CATEGORIES]
  const counts = Object.fromEntries(categories.map((c) => [c.value, notifications.filter((n) => (!c.value || n.category === c.value) && !n.read).length]))
  const visible = notifications.filter((n) => (!values.category || n.category === values.category) && (!values.unread || !n.read))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inbox"
        description={unread > 0 ? `You have ${unread} unread ${unread === 1 ? "notification" : "notifications"}.` : "You're all caught up."}
        actions={
          <Button variant="secondary" disabled={unread === 0} loading={markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheck />
            Mark all as read
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Notification categories" className="relative -mx-1 flex gap-1 overflow-x-auto px-1">
          {categories.map((category) => {
            const active = values.category === category.value
            return (
              <button
                key={category.value || "all"}
                type="button"
                aria-pressed={active}
                title={category.description}
                onClick={() => set("category", category.value)}
                className={cn(
                  "focus-ring flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "bg-selected text-selected-foreground" : "text-muted-foreground hover:bg-hover hover:text-foreground"
                )}
              >
                {category.label}
                {counts[category.value] > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground">{counts[category.value]}</span>
                )}
              </button>
            )
          })}
        </nav>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={Boolean(values.unread)}
            onChange={(event) => set("unread", event.target.checked ? "1" : "")}
            className="size-4 cursor-pointer accent-primary"
          />
          Unread only
        </label>
      </div>

      {isError ? (
        <Alert
          variant="danger"
          action={
            <Button size="sm" variant="secondary" onClick={() => refetch()} loading={isFetching}>
              <RotateCw />
              Retry
            </Button>
          }
        >
          Couldn't load your notifications.
        </Alert>
      ) : !isPending && visible.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={Inbox}
          title={notifications.length === 0 ? "Nothing here yet" : "No notifications match"}
          description={
            notifications.length === 0
              ? "Assignments, mentions, comments and updates on your issues will arrive here."
              : "Try another category, or turn off “Unread only”."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
          <NotificationList notifications={visible} isPending={isPending} />
        </div>
      )}
    </div>
  )
}
