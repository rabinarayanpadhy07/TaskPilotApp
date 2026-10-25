import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { issueFormSchema } from "@/validation/issue-schemas"

export const emptyIssueValues = {
  projectId: "",
  type: "task",
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  assigneeId: null,
  labels: [],
  dueDate: null,
  storyPoints: null,
  parentId: null,
  sprintId: null,
}

/** React Hook Form instance for <IssueForm>, validated with Zod. */
export function useIssueForm(defaultValues) {
  return useForm({
    resolver: zodResolver(issueFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { ...emptyIssueValues, ...defaultValues },
  })
}
