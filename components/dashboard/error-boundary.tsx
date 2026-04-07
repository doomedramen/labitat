"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error?: Error
}

/**
 * Error boundary that catches render errors in widget components.
 * Prevents one failing widget from crashing the entire dashboard.
 */
export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center gap-2 rounded-md bg-red-500/10 px-2.5 py-2 text-xs text-red-500">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="font-medium">Failed to load widget</span>
        </div>
      )
    }

    return this.props.children
  }
}
