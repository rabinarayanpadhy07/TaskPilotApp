import { ArrowLeft, Compass } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

export function NotFoundPage() {
  return (
    <EmptyState
      className="min-h-[60vh]"
      headingLevel="h1"
      icon={Compass}
      title="Page not found"
      description="The page you're looking for doesn't exist or may have been moved."
      action={
        <Button variant="secondary" asChild>
          <Link to="/">
            <ArrowLeft />
            Back to home
          </Link>
        </Button>
      }
    />
  )
}
