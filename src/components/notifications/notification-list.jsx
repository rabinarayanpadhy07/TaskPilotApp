import { AtSign, CircleDot, Mail, MailOpen, MessageSquare, UserPlus } from "lucide-react"
import { Link } from "react-router"

import { useMarkNotificationsRead, useMarkNotificationUnread, useMemberMap } from "@/api/hooks"
import { IconButton } from "@/components/icon-button"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user-avatar"
import { paths } from "@/lib/routes"
import { cn, formatRelativeTime } from "@/lib/utils"
import { notificationCategoryLabel } from "@/models/notification"

const categoryIcons = {
  assignment: UserPlus,
  mention: AtSign,
  comment: MessageSquare,
  update: CircleDot,
}

function targetFor(notification) {
  if (notification.issueKey && notification.projectId) return paths.issue({ projectId: notification.projectId, key: notification.issueKey })
  if (notification.projectId) return paths.project(notification.projectId)
  return "/inbox"
}

/**
 * One notification: opening it marks it read; the trailing button toggles
 * read/unread without navigating.
 */
export function NotificationItem({ notification, compact = false, onNavigate }) {
  const memberMap = useMemberMap()
  const markRead = useMarkNotificationsRead()
  const markUnread = useMarkNotificationUnread()
  const actor = memberMap[notification.actorId]
  const Icon = categoryIcons[notification.category] ?? CircleDot

  return (
    <div className={cn("group relative flex items-start gap-3 transition-colors hover:bg-hover", compact ? "px-3 py-2.5" : "px-4 py-3.5 sm:px-5", !notification.read && "bg-selected/40")}>
      <Link
        to={targetFor(notification)}
        onClick={() => {
          if (!notification.read) markRead.mutate([notification.id])
          onNavigate?.()
        }}
        className="focus-ring flex min-w-0 flex-1 items-start gap-3 rounded-sm"
      >
        <span className="relative mt-0.5 shrink-0">
          <UserAvatar name={actor?.name ?? "Someone"} size={compact ? "sm" : "default"} />
          <span
            className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-surface text-primary ring-1 ring-border"
            title={notificationCategoryLabel[notification.category]}
          >
            <Icon aria-hidden="true" className="size-2.5" strokeWidth={2.5} />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{actor?.name ?? "Someone"}</span> {notification.summary}{" "}
            {notification.issueKey && <span className="font-mono text-xs text-foreground">{notification.issueKey}</span>}
          </span>
          {notification.issueTitle && (
            <span className={cn("block truncate text-sm", notification.read ? "text-muted-foreground" : "font-medium text-foreground")}>
              {notification.issueTitle}
            </span>
          )}
          {notification.excerpt && !compact && (
            <span className="mt-1 line-clamp-2 block border-l-2 border-border pl-2 text-[13px] text-muted-foreground">{notification.excerpt}</span>
          )}
          <span className="mt-0.5 block text-xs text-muted-foreground">
            <time dateTime={notification.createdAt}>{formatRelativeTime(notification.createdAt)}</time>
            <span className="sr-only">{notification.read ? ", read" : ", unread"}</span>
          </span>
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        {!notification.read && <span aria-hidden="true" className="size-2 rounded-full bg-primary group-hover:hidden group-focus-within:hidden" />}
        <IconButton
          label={notification.read ? "Mark as unread" : "Mark as read"}
          icon={notification.read ? Mail : MailOpen}
          size="icon-xs"
          className={cn(!notification.read && "hidden group-hover:inline-flex group-focus-within:inline-flex")}
          onClick={() => (notification.read ? markUnread.mutate(notification.id) : markRead.mutate([notification.id]))}
        />
      </div>
    </div>
  )
}

export function NotificationList({ notifications, isPending, compact = false, onNavigate, label = "Notifications" }) {
  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Loading notifications" className="divide-y">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-3 flex-1" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <ul className="divide-y" aria-label={label}>
      {notifications.map((notification) => (
        <li key={notification.id}>
          <NotificationItem notification={notification} compact={compact} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  )
}
