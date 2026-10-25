import { z } from "zod"

/*
 * Client-side validation mirrors Django's defaults so users see problems early.
 * The server remains the source of truth: its field errors are shown inline too.
 */

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .pipe(z.email("Enter a valid email address, like name@company.com."))

export const PASSWORD_MIN_LENGTH = 8

/** Mirrors Django's MinimumLengthValidator and NumericPasswordValidator. */
export const passwordRules = [
  { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (value) => value.length >= PASSWORD_MIN_LENGTH },
  { id: "numeric", label: "Not only numbers", test: (value) => value.length > 0 && !/^\d+$/.test(value) },
]

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean(),
})

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(150, "Use 150 characters or fewer."),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
    .max(128, "Use 128 characters or fewer.")
    .refine((value) => !/^\d+$/.test(value), "Your password can't be only numbers."),
})

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const workspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter a workspace name of at least 2 characters.")
    .max(60, "Use 60 characters or fewer."),
  slug: z
    .string()
    .min(3, "Use at least 3 characters.")
    .max(40, "Use 40 characters or fewer.")
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens, e.g. acme-design."),
})

/** Accepts a full invitation link (…/invite/<token>) or the bare code. */
export function extractInviteToken(input) {
  const value = input.trim()
  const fromLink = value.match(/\/invite\/([^/?#\s]+)/)
  return fromLink ? decodeURIComponent(fromLink[1]) : value
}

export const joinWorkspaceSchema = z.object({
  invite: z
    .string()
    .trim()
    .min(1, "Paste your invitation link or code.")
    .refine(
      (value) => /^[A-Za-z0-9_-]{6,128}$/.test(extractInviteToken(value)),
      "That doesn't look like a TaskPilot invitation. Check the link in your email."
    ),
})

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(128, "Use 128 characters or fewer.")
  .refine((value) => !/^\d+$/.test(value), "Your password can't be only numbers.")

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((values) => values.password === values.confirm, { path: ["confirm"], message: "The passwords don't match." })

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password."), newPassword, confirm: z.string() })
  .refine((values) => values.newPassword === values.confirm, { path: ["confirm"], message: "The passwords don't match." })

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(150, "Use 150 characters or fewer."),
  title: z.string().trim().max(150, "Use 150 characters or fewer."),
})
