import { useSearchParams } from "react-router"

/** The issue open in the side panel, stored as `?issue=KEY` so it can be shared. */
export function useIssuePanel() {
  const [params, setParams] = useSearchParams()
  const openKey = params.get("issue")
  const update = (key) =>
    setParams(
      () => {
        const next = new URLSearchParams(window.location.search)
        if (key) next.set("issue", key)
        else next.delete("issue")
        return next
      },
      { replace: !key, flushSync: true }
    )
  return { openKey, open: (key) => update(key), close: () => update(null) }
}
