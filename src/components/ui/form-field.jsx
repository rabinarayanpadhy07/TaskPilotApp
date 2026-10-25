import * as React from "react"
import { CircleAlert } from "lucide-react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * Label + control + hint + inline error. Wires `id`, `aria-invalid` and
 * `aria-describedby` onto the single child control automatically. When the
 * control is nested (e.g. inside a <Controller>), pass a function instead:
 * `{(controlProps) => <Controller render={({ field }) => <X {...controlProps} />} />}`.
 *
 * @param {object} props
 * @param {string} props.id            id for the control
 * @param {React.ReactNode} props.label
 * @param {string} [props.error]       validation message; shown under the control
 * @param {React.ReactNode} [props.hint] helper text, shown under the error
 * @param {React.ReactNode} [props.labelAction] element aligned right of the label (e.g. a link)
 */
function FormField({ id, label, error, hint, labelAction, className, children }) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined

  const controlProps = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  }
  // Render-prop form for controls wrapped in another component (e.g. RHF <Controller>)
  const control =
    typeof children === "function"
      ? children(controlProps)
      : React.cloneElement(React.Children.only(children), controlProps)

  return (
    <div data-slot="form-field" className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>
      {control}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-xs leading-4 text-danger-text">
          <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
      {hint && (
        <div id={hintId} className="text-xs leading-4 text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  )
}

export { FormField }
