/**
 * Wraps interactive elements inside an <a> tag so they can respond to
 * pointer events (hover, tap → tooltip) without triggering navigation.
 *
 * Server-compatible version: no onClick handler.
 */

export function BlockLinkPropagationServer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={className}>{children}</div>
}
