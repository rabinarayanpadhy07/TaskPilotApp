import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarRange,
  Check,
  Columns3,
  History,
  Layers,
  Lock,
  Rocket,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react"
import { Link } from "react-router"

import { Brand } from "@/components/layout/brand"
import { Button } from "@/components/ui/button"
import { WORKSPACE_ROLES } from "@/models/roles"

const FEATURES = [
  {
    icon: Columns3,
    title: "Boards that keep up",
    body: "Drag issues across To do, In progress, In review and Done. Ranking and status update for everyone instantly.",
  },
  {
    icon: CalendarRange,
    title: "Backlog & sprints",
    body: "Groom the backlog, plan sprints with story points and close them with a velocity snapshot of what shipped.",
  },
  {
    icon: Layers,
    title: "Epics, stories & subtasks",
    body: "Break big goals into epics, stories, tasks, bugs and subtasks, and see progress roll up automatically.",
  },
  {
    icon: BarChart3,
    title: "Reports",
    body: "Velocity, workload and status breakdowns across every project in the workspace, without spreadsheets.",
  },
  {
    icon: Bell,
    title: "Inbox & mentions",
    body: "Get notified when you're assigned, mentioned or when work you follow changes status.",
  },
  {
    icon: History,
    title: "Full activity history",
    body: "Every change, comment and attachment is recorded, so you always know who did what and when.",
  },
]

const STEPS = [
  {
    icon: Rocket,
    title: "Create a workspace",
    body: "Sign up and set up a workspace for your company or team in under a minute.",
  },
  {
    icon: UserPlus,
    title: "Invite your team",
    body: "Send invitations with the right role for each person, and group people into teams.",
  },
  {
    icon: Check,
    title: "Plan and ship",
    body: "Create projects, fill the backlog, start a sprint and watch the board move.",
  },
]

const CURRENT_YEAR = new Date().getFullYear()

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main-content"
        className="focus-ring sr-only rounded-md bg-surface px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>
      <LandingHeader />
      <main id="main-content" className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Roles />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="TaskPilot home" className="focus-ring flex rounded-md">
          <Brand />
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Line grid, faded out toward the edges and bottom */}
      <div
        aria-hidden="true"
        className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_0%,#000_40%,transparent_100%)]"
      />
      {/* Soft brand glow behind the headline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[480px] max-w-4xl rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-6 sm:pt-32 sm:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.1]">
            Plan, track and ship work <span className="text-primary">with your team</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
            TaskPilot brings your backlog, sprints and boards together so everyone knows what to work on next and
            nothing slips through the cracks.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link to="/register">
                Create your free account
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" className="w-full sm:w-auto" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[13px] font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base text-pretty text-muted-foreground">{description}</p>}
    </div>
  )
}

function Features() {
  return (
    <section id="features" className="scroll-mt-16 border-t bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Features"
          title="Everything your team needs to stay on track"
          description="From the first idea in the backlog to the sprint review, TaskPilot keeps the whole picture in one place."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border bg-background p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex size-10 items-center justify-center rounded-lg border border-primary/10 bg-selected text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-t py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="How it works" title="Up and running in three steps" />
        <ol className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            <li key={title} className="relative text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <p className="mt-5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Step {index + 1}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Roles() {
  return (
    <section id="roles" className="scroll-mt-16 border-t bg-surface py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-[2fr_3fr]">
        <div>
          <p className="text-[13px] font-semibold tracking-wide text-primary uppercase">Roles & access</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            The right access for every person
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Five workspace roles, project-level roles and private projects keep sensitive work visible only to the
            people who need it.
          </p>
          <ul className="mt-6 grid gap-3 text-sm">
            <li className="flex items-center gap-2.5">
              <Lock aria-hidden="true" className="size-4 text-primary" />
              Private projects for confidential work
            </li>
            <li className="flex items-center gap-2.5">
              <Users aria-hidden="true" className="size-4 text-primary" />
              Teams and project members you control
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
              Every request checked on the server
            </li>
          </ul>
        </div>
        <ul className="grid gap-3">
          {WORKSPACE_ROLES.map((role) => (
            <li key={role.value} className="flex gap-4 rounded-xl border bg-background p-4">
              <span className="mt-0.5 inline-flex h-6 shrink-0 items-center rounded-full bg-selected px-2.5 text-xs font-semibold text-primary">
                {role.label}
              </span>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="border-t py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground shadow-lg sm:px-12">
          <div
            aria-hidden="true"
            className="bg-grid pointer-events-none absolute inset-0 [--grid-line:rgb(255_255_255/0.12)] [--grid-size:32px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_80%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-2xl"
          />
          <h2 className="relative text-3xl font-semibold tracking-tight text-balance text-primary-foreground sm:text-4xl">
            Ready to get your team moving?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-base text-primary-foreground/85">
            Create a workspace, invite your teammates and start your first sprint today.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" className="w-full border-transparent sm:w-auto" asChild>
              <Link to="/register">
                Get started free
                <ArrowRight />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="w-full text-primary-foreground hover:bg-white/10 sm:w-auto"
              asChild
            >
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer className="border-t bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <Brand />
        <p>© {CURRENT_YEAR} TaskPilot. Plan, track and ship work with your team.</p>
        <div className="flex gap-4">
          <Link to="/login" className="focus-ring rounded-sm hover:text-foreground">
            Sign in
          </Link>
          <Link to="/register" className="focus-ring rounded-sm hover:text-foreground">
            Create account
          </Link>
        </div>
      </div>
    </footer>
  )
}
