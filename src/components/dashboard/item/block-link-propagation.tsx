"use client"

/**
 * Wraps interactive elements inside an <a> tag so they can respond to
 * pointer events (hover, tap → tooltip) without triggering navigation.
 */

export function BlockLinkPropagation({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className} onClick={(e) => e.preventDefault()}>
      {children}
    </div>
  )
}
