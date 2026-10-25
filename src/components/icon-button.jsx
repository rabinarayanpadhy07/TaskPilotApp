import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * Icon-only button with a tooltip and matching accessible name. Forwards all
 * props (including ref), so it can be the child of a Radix `asChild` trigger,
 * e.g. <DialogTrigger asChild><IconButton label="Create" icon={Plus} /></DialogTrigger>.
 */
export function IconButton({
  label,
  icon: Icon,
  tooltipSide = "bottom",
  variant = "ghost",
  size = "icon",
  className,
  children,
  ...props
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size}
          aria-label={props["aria-label"] ?? label}
          className={cn(variant === "ghost" && "text-muted-foreground hover:text-foreground", className)}
          {...props}
        >
          <Icon aria-hidden="true" />
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  )
}
