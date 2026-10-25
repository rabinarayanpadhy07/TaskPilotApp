import { Toaster as Sonner } from "sonner"

/**
 * App-wide toast region (Sonner). Toasts are announced politely to screen
 * readers; use `toast.success()` / `toast.error()` from "sonner".
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-border !bg-surface !text-foreground !shadow-lg !font-sans !text-sm !gap-2.5",
          description: "!text-muted-foreground !text-[13px]",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-danger",
          actionButton: "!bg-primary !text-primary-foreground !rounded-md !font-medium",
          closeButton: "!border-border !bg-surface !text-muted-foreground hover:!bg-hover",
        },
      }}
    />
  )
}
