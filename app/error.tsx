"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, RefreshCw, ArrowLeft, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    console.error("[labitat] Page error:", error)
  }, [error])

  const handleReload = () => {
    setIsRetrying(true)
    reset()
  }

  const isDatabaseError =
    error?.message?.toLowerCase().includes("database") ||
    error?.message?.toLowerCase().includes("sqlite") ||
    error?.message?.toLowerCase().includes("no such table") ||
    error?.message?.toLowerCase().includes("relation") ||
    error?.message?.toLowerCase().includes("undefined")

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        {/* Icon */}
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-8 text-destructive" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground">
            {isDatabaseError
              ? "The dashboard couldn't load. This might happen if the database isn't set up yet."
              : "The page encountered an unexpected error while loading."}
          </p>
        </div>

        {/* Error details */}
        {process.env.NODE_ENV === "development" && (
          <details className="w-full rounded-lg border bg-muted/50 p-3 text-left">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Error details
            </summary>
            <pre className="mt-2 text-xs break-all whitespace-pre-wrap text-destructive">
              {error.message}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            disabled={isRetrying}
          >
            <ArrowLeft className="mr-2 size-4" />
            Go back
          </Button>
          <Button size="sm" onClick={handleReload} disabled={isRetrying}>
            <RefreshCw
              className={`mr-2 size-4 ${isRetrying ? "animate-spin" : ""}`}
            />
            Try again
          </Button>
          {isDatabaseError && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/setup")}
            >
              <Settings className="mr-2 size-4" />
              Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
