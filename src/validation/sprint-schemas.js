import { z } from "zod"

const optionalDate = z.string().nullable()

/** Planned sprints may omit dates; when given, the end must be after the start. */
export const sprintFormSchema = z
  .object({
    name: z.string().trim().min(1, "Give the sprint a name.").max(60, "Use 60 characters or fewer."),
    goal: z.string().max(500, "Use 500 characters or fewer."),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.startDate) !== Boolean(value.endDate)) {
      ctx.addIssue({ code: "custom", path: [value.startDate ? "endDate" : "startDate"], message: "Set both dates, or leave both empty." })
    } else if (value.startDate && value.endDate <= value.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "The end date must be after the start date." })
    }
  })

/** Starting a sprint requires both dates. */
export const startSprintSchema = z
  .object({
    goal: z.string().max(500, "Use 500 characters or fewer."),
    startDate: z.string().min(1, "Choose a start date."),
    endDate: z.string().min(1, "Choose an end date."),
  })
  .refine((value) => value.endDate > value.startDate, { path: ["endDate"], message: "The end date must be after the start date." })

export const epicFormSchema = z.object({
  title: z.string().trim().min(1, "Give the epic a name.").max(255, "Use 255 characters or fewer."),
  description: z.string().max(10000, "Use 10,000 characters or fewer."),
  status: z.string(),
  priority: z.string(),
  assigneeId: z.string().nullable(),
  dueDate: z.string().nullable(),
})
