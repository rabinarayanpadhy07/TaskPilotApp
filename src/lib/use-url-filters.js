import { useCallback } from "react"
import { useSearchParams } from "react-router"

/**
 * Filter state stored in the URL query string, so filtered views survive
 * reloads and can be shared. Multi-value filters are comma-separated.
 *
 *   const { values, set, clear, activeCount } = useUrlFilters({ q: "", status: [] })
 */
export function useUrlFilters(defaults) {
  const [params, setParams] = useSearchParams()
  const names = Object.keys(defaults).join(",")

  const values = {}
  for (const [name, fallback] of Object.entries(defaults)) {
    const raw = params.get(name)
    values[name] = Array.isArray(fallback) ? (raw ? raw.split(",").filter(Boolean) : fallback) : (raw ?? fallback)
  }

  const set = useCallback(
    (name, value) => {
      setParams(
        () => {
          // Start from the live URL: React Router's updater argument reflects the
          // last render, so rapid successive updates could otherwise drop changes.
          const next = new URLSearchParams(window.location.search)
          const serialized = Array.isArray(value) ? value.join(",") : value
          if (serialized) next.set(name, serialized)
          else next.delete(name)
          return next
        },
        // flushSync: controls bound to the URL update immediately instead of in a transition
        { replace: true, flushSync: true }
      )
    },
    [setParams]
  )

  /** Clears every filter, or only `only` (an array of names) when given. */
  const clear = useCallback((only) => {
    setParams(
      () => {
        const next = new URLSearchParams(window.location.search)
        for (const name of Array.isArray(only) ? only : names.split(",")) next.delete(name)
        return next
      },
      { replace: true, flushSync: true }
    )
  }, [names, setParams])

  const activeCount = Object.entries(defaults).filter(([name, fallback]) =>
    Array.isArray(fallback) ? values[name].length > 0 : values[name] !== fallback
  ).length

  return { values, set, clear, activeCount }
}
