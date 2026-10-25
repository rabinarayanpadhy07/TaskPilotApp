import { z } from "zod"

import { PROJECT_ROLES, WORKSPACE_ROLES } from "@/models/roles"

/* Client-side checks for quick feedback; the API re-validates and authorizes everything. */

export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter an email address.")
    .pipe(z.email("Enter a valid email address, like name@company.com.")),
  role: z.enum(WORKSPACE_ROLES.map((r) => r.value), { message: "Choose a role." }),
})

export const projectMemberSchema = z.object({
  userId: z.string().min(1, "Choose a person."),
  role: z.enum(PROJECT_ROLES.map((r) => r.value), { message: "Choose a role." }),
})
