import { useState } from "react"
import { Bell, BellOff, CheckCheck } from "lucide-react"
import { Link } from "react-router"

import { useMarkNotificationsRead, useNotifications, useUnreadCount } from "@/api/hooks"
import { NotificationList } from "@/components/notifications/notification-list"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const MAX_ITEMS = 6

/** Bell in the top bar: unread count, latest notifications, mark all read. */
export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const { data: notifications = [], isPending, isError, refetch } = useNotifications()
  const unread = useUnreadCount()
  const markAll = useMarkNotificationsRead()
  const list = (unreadOnly ? notifications.filter((n) => !n.read) : notifications).slice(0, MAX_ITEMS)
  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={label} className="relative text-muted-foreground hover:text-foreground data-[state=open]:bg-hover">
              <Bell aria-hidden="true" />
              {unread > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ring-2 ring-surface"
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <h2 className="text-sm font-semibold">Notifications</h2>
          <div role="group" aria-label="Show" className="ml-2 inline-flex rounded-md bg-muted p-0.5">
            {[
              { value: false, label: "All" },
              { value: true, label: "Unread" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={unreadOnly === option.value}
                onClick={() => setUnreadOnly(option.value)}
                className={cn(
                  "focus-ring h-6 cursor-pointer rounded-[4px] px-2 text-xs font-medium",
                  unreadOnly === option.value ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="ml-auto h-7 text-muted-foreground" disabled={unread === 0} onClick={() => markAll.mutate()}>
            <CheckCheck />
            Mark all read
          </Button>
        </div>
        <div className="max-h-[min(26rem,70vh)] overflow-y-auto">
          {isError ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Couldn't load notifications.{" "}
              <button type="button" onClick={() => refetch()} className="focus-ring cursor-pointer rounded-sm font-medium text-primary hover:underline">
                Retry
              </button>
            </div>
          ) : !isPending && list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
              <BellOff aria-hidden="true" className="size-5" />
              {unreadOnly ? "You're all caught up." : "No notifications yet."}
            </div>
          ) : (
            <NotificationList notifications={list} isPending={isPending} compact onNavigate={() => setOpen(false)} />
          )}
        </div>
        <div className="border-t p-1.5">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link to="/inbox" onClick={() => setOpen(false)}>
              Open inbox
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
