import * as React from "react"
import { cva } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "focus-ring inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-danger/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Main call to action. Use at most once per view.
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover",
        // Standard action on a white surface
        secondary:
          "border border-border bg-surface text-foreground shadow-xs hover:border-input hover:bg-hover",
        // Low-emphasis action: toolbars, icon buttons, menus
        ghost: "text-foreground hover:bg-hover",
        destructive:
          "bg-danger text-white shadow-xs hover:bg-danger-text focus-visible:ring-danger/25",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5",
        default: "h-9 px-4 has-[>svg]:px-3",
        lg: "h-10 px-5 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-xs": "size-7 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * @param {object} props
 * @param {"default"|"secondary"|"ghost"|"destructive"|"link"} [props.variant]
 * @param {"sm"|"default"|"lg"|"icon"|"icon-sm"|"icon-xs"} [props.size]
 * @param {boolean} [props.asChild] Render the child element (e.g. a router Link) with button styles.
 * @param {boolean} [props.loading] Shows a spinner and disables the button.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
