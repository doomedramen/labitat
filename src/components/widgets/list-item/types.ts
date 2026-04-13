/**
 * Shared types for list item components.
 * Server-compatible (no React hooks).
 */

export type ListItemTrailingItem = {
  /** Icon component (rendered with consistent styling) */
  icon?: React.ElementType;
  /** Visual tooltip text on the icon (title attribute) */
  iconTitle?: string;
  /** Visible text content */
  text?: string;
  /** Screen reader label (defaults to text, then iconTitle) */
  label?: string;
};

export type ListItemProps = {
  /** Primary text */
  title: string;
  /** Secondary text shown before title */
  subtitle?: string;
  /** Progress percentage (0–100). Renders bottom bar when provided */
  progress?: number;
  /** Icon component shown on the left */
  leading?: React.ElementType;
  /** If provided, leading becomes a clickable button */
  onLeadingClick?: () => void;
  /** Structured trailing content (icons + text with consistent styling) */
  trailing?: ListItemTrailingItem[];
  /** Separator between trailing items (default "·") */
  divider?: string;
  /** Tooltip content */
  tooltip?: React.ReactNode;
  /** Replaces entire inner layout (keeps container + progress bar) */
  children?: React.ReactNode;
  /** Additional className for the container */
  className?: string;
};
