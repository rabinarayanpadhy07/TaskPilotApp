import * as React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

/**
 * Avatar for a person: shows their photo when available, otherwise initials.
 * @param {{ name: string, src?: string, size?: "sm"|"default"|"lg", className?: string }} props
 */
export function UserAvatar({ name, src, size = "default", className, ...props }) {
  return (
    <Avatar size={size} className={className} {...props}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback aria-label={name}>{getInitials(name)}</AvatarFallback>
    </Avatar>
  )
}
