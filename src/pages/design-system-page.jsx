import { useState } from "react"
import {
  Archive,
  Copy,
  Inbox,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { UserAvatar } from "@/components/user-avatar"
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const colorTokens = [
  { name: "Primary", token: "--primary", value: "#7C3AED" },
  { name: "Background", token: "--background", value: "#FAF9FF" },
  { name: "Surface", token: "--surface", value: "#FFFFFF" },
  { name: "Text", token: "--foreground", value: "#1F1937" },
  { name: "Secondary text", token: "--muted-foreground", value: "#77718B" },
  { name: "Border", token: "--border", value: "#E8E3F2" },
  { name: "Selected", token: "--selected", value: "#F3EEFF" },
  { name: "Hover", token: "--hover", value: "#F6F3FC" },
  { name: "Success", token: "--success", value: "#16A34A" },
  { name: "Warning", token: "--warning", value: "#D97706" },
  { name: "Danger", token: "--danger", value: "#DC2626" },
]

function Section({ title, description, children }) {
  const id = title.toLowerCase().replace(/\s+/g, "-")
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t pt-8 lg:grid-cols-[14rem_1fr] lg:gap-10">
      <div>
        <h2 id={id}>{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Row({ children }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>
}

function CreateTaskDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Create task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>Add a task to the current project backlog.</DialogDescription>
        </DialogHeader>
        <form
          id="create-task-form"
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            setOpen(false)
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" placeholder="e.g. Design onboarding flow" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-assignee">Assignee</Label>
            <Input id="task-assignee" placeholder="Search people" leadingIcon={Search} />
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="create-task-form">
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DesignSystemPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Design system"
        description="Reference for TaskPilot tokens and components. Visible in development only."
      />

      <Section title="Colors" description="Defined once as CSS variables in src/index.css.">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {colorTokens.map((color) => (
            <li key={color.token} className="overflow-hidden rounded-lg border bg-surface">
              <div className="h-12 border-b" style={{ backgroundColor: `var(${color.token})` }} />
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{color.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {color.value} · {color.token}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Typography" description="Inter. Restrained scale, 14px body.">
        <div className="flex flex-col gap-3">
          <p className="text-2xl font-semibold tracking-tight">Display · 24 / semibold</p>
          <h1>Page title · 20 / semibold</h1>
          <h2>Section title · 16 / semibold</h2>
          <h3>Card title · 14 / semibold</h3>
          <p>Body · 14 / regular. Plan sprints, track issues and ship with confidence.</p>
          <p className="text-muted-foreground">Secondary · 14 / regular, muted foreground.</p>
          <p className="text-xs text-muted-foreground">Caption · 12 / regular</p>
        </div>
      </Section>

      <Section title="Buttons" description="One primary action per view.">
        <div className="flex flex-col gap-4">
          <Row>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
            <Button variant="link">Link</Button>
          </Row>
          <Row>
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button>
              <Plus />
              With icon
            </Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
          </Row>
          <Row>
            <Button variant="secondary" size="icon" aria-label="Star">
              <Star />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="More options">
              <MoreHorizontal />
            </Button>
          </Row>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-md gap-5">
          <div className="grid gap-2">
            <Label htmlFor="ds-name">Project name</Label>
            <Input id="ds-name" placeholder="e.g. Mobile app" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ds-search">With icon</Label>
            <Input id="ds-search" type="search" placeholder="Search" leadingIcon={Search} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ds-key">Project key</Label>
            <Input id="ds-key" defaultValue="mobile app" aria-invalid="true" aria-describedby="ds-key-error" />
            <p id="ds-key-error" className="text-xs text-danger-text">
              Use 2–10 uppercase letters, e.g. MOB.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ds-disabled">Disabled</Label>
            <Input id="ds-disabled" placeholder="Not editable" disabled />
          </div>
        </div>
      </Section>

      <Section title="Badges" description="Status and metadata labels.">
        <div className="flex flex-col gap-3">
          <Row>
            <Badge>Backlog</Badge>
            <Badge variant="primary">In progress</Badge>
            <Badge variant="success">Done</Badge>
            <Badge variant="warning">In review</Badge>
            <Badge variant="danger">Blocked</Badge>
            <Badge variant="outline">v1.2</Badge>
          </Row>
          <Row>
            <Badge dot>Backlog</Badge>
            <Badge variant="primary" dot>In progress</Badge>
            <Badge variant="success" dot>Done</Badge>
            <Badge variant="warning" dot>In review</Badge>
            <Badge variant="danger" dot>Blocked</Badge>
          </Row>
        </div>
      </Section>

      <Section title="Avatars">
        <Row>
          <UserAvatar name="Alex Morgan" size="sm" />
          <UserAvatar name="Priya Shah" />
          <UserAvatar name="Jordan Lee" size="lg" />
          <AvatarGroup>
            <UserAvatar name="Alex Morgan" />
            <UserAvatar name="Priya Shah" />
            <UserAvatar name="Jordan Lee" />
            <AvatarGroupCount>+4</AvatarGroupCount>
          </AvatarGroup>
        </Row>
      </Section>

      <Section title="Card">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Website redesign</CardTitle>
            <CardDescription>Marketing site refresh for Q4 launch.</CardDescription>
            <CardAction>
              <Badge variant="primary" dot>Active</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            24 open tasks · 8 completed this week
          </CardContent>
          <CardFooter className="justify-between border-t">
            <AvatarGroup>
              <UserAvatar name="Alex Morgan" size="sm" />
              <UserAvatar name="Priya Shah" size="sm" />
            </AvatarGroup>
            <Button variant="secondary" size="sm">Open</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Overlays" description="Dialog, dropdown and tooltip. All keyboard accessible.">
        <Row>
          <CreateTaskDialog />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                Actions
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Task</DropdownMenuLabel>
              <DropdownMenuItem>
                <Pencil />
                Edit
                <DropdownMenuShortcut>E</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Hover or focus me</Button>
            </TooltipTrigger>
            <TooltipContent>Tooltips explain icon-only controls</TooltipContent>
          </Tooltip>
        </Row>
      </Section>

      <Section title="Empty state">
        <EmptyState
          variant="bordered"
          icon={Inbox}
          title="No tasks in this sprint"
          description="Drag tasks from the backlog or create a new one to start planning."
          action={
            <>
              <Button variant="secondary">View backlog</Button>
              <Button>
                <Plus />
                Create task
              </Button>
            </>
          }
        />
      </Section>
    </div>
  )
}
