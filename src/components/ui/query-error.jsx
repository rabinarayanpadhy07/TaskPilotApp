import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { parseApiError } from "@/lib/api-errors"

/**
 * A failed query: the server's (or network) message plus a retry button.
 * Use it before empty states, so a failure never looks like "nothing here".
 */
export function QueryError({ error, onRetry, title = "Couldn't load this", retrying = false, className }) {
  const { message } = parseApiError(error)
  return (
    <Alert
      variant="danger"
      title={title}
      className={className}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" loading={retrying} onClick={() => onRetry()}>
            Try again
          </Button>
        )
      }
    >
      {message}
    </Alert>
  )
}
