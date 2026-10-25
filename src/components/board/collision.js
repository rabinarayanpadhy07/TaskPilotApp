import { closestCorners, pointerWithin } from "@dnd-kit/core"

/**
 * Collision detection for multi-container lists (board columns, backlog
 * sections). Uses what's under the pointer, preferring items over their
 * container so drops land in position; empty containers still accept drops.
 * Keyboard drags have no pointer and fall back to closest corners.
 */
export function createContainerCollision(containerPrefix) {
  return (args) => {
    const hits = pointerWithin(args)
    if (hits.length > 0) {
      const items = hits.filter((hit) => !String(hit.id).startsWith(containerPrefix))
      return items.length > 0 ? items : hits
    }
    return closestCorners(args)
  }
}
