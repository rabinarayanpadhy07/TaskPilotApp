/**
 * Ordering for the board and backlog. Ranks are numbers; moving an item puts
 * it halfway between its new neighbours. The server owns the final rank and
 * can renumber a list when gaps get too small (see docs/workspace-api.md).
 */
export const RANK_STEP = 1000

export function rankBetween(before, after) {
  if (before == null && after == null) return RANK_STEP
  if (before == null) return after - RANK_STEP
  if (after == null) return before + RANK_STEP
  return (before + after) / 2
}

export const byRank = (a, b) => a.rank - b.rank || a.key.localeCompare(b.key, undefined, { numeric: true })
