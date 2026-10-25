import { cloneElement } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Explains why a control is disabled. Pass `reason` when the caller lacks
 * permission (render the child with `disabled`); without a reason the child
 * renders as is. The wrapper is focusable so keyboard users get the
 * explanation too. Presentation only: the API rejects the action regardless.
 */
export function Restricted({ reason, side = "top", children }) {
  if (!reason) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="focus-ring inline-flex w-fit cursor-not-allowed rounded-md">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side}>{reason}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Renders a dialog's trigger element disabled, with the reason in a tooltip.
 * Dialogs use it instead of opening when the caller lacks permission.
 */
export function DisabledTrigger({ reason, children }) {
  return <Restricted reason={reason}>{cloneElement(children, { disabled: true, "aria-disabled": true })}</Restricted>
}
