import { z } from "zod"

import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES, parentRequired } from "@/models/issue"
import { PROJECT_KEY_PATTERN } from "@/models/project"

const values = (list) => list.map((item) => item.value)

export const issueFormSchema = z
  .object({
    projectId: z.string().min(1, "Choose a project."),
    type: z.enum(values(ISSUE_TYPES)),
    title: z.string().trim().min(1, "Enter a title.").max(255, "Use 255 characters or fewer."),
    description: z.string().max(10000, "Use 10,000 characters or fewer."),
    status: z.enum(values(ISSUE_STATUSES)),
    priority: z.enum(values(ISSUE_PRIORITIES)),
    assigneeId: z.string().nullable(),
    labels: z.array(z.string()).max(10, "Use up to 10 labels."),
    dueDate: z.string().nullable(),
    storyPoints: z.number().int().min(0).max(100).nullable(),
    parentId: z.string().nullable(),
    sprintId: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    if (parentRequired(value.type) && !value.parentId) {
      ctx.addIssue({ code: "custom", path: ["parentId"], message: "Choose the issue this subtask belongs to." })
    }
  })

export const projectFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a project name of at least 2 characters.").max(80, "Use 80 characters or fewer."),
  key: z.string().regex(PROJECT_KEY_PATTERN, "Use 2–10 uppercase letters or digits, starting with a letter."),
  description: z.string().max(500, "Use 500 characters or fewer."),
  visibility: z.enum(["workspace", "private"]),
  leadId: z.string({ error: "Choose a project lead." }).min(1, "Choose a project lead."),
})

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment first.").max(5000, "Use 5,000 characters or fewer."),
})
