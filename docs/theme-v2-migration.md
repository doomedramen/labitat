# Theme System v2 Migration Guide

## Overview

This guide covers the migration from Theme System v1 to the new comprehensive Theme System v2 for Labitat.

## What's New in v2

### 1. Expanded Color Palette (12 → 20 Variables)

**Old v1 Variables:**

- `--background`, `--card`, `--card-text`, `--border`, `--text`
- `--sub-card`, `--sub-card-text`
- `--graph-1`, `--graph-2`
- `--success`, `--danger`, `--error`

**New v2 Variables:**

- **Surface (4):** `--color-bg-root`, `--color-bg-surface`, `--color-bg-elevated`, `--color-bg-overlay`
- **Content (4):** `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-inverse`
- **Border (2):** `--color-border-default`, `--color-border-subtle`
- **Accent (2):** `--color-accent-primary`, `--color-accent-secondary`
- **Semantic (4):** `--color-semantic-success`, `--color-semantic-warning`, `--color-semantic-error`, `--color-semantic-info`
- **Data Viz (8):** `--color-data-1` through `--color-data-8`

### 2. Dynamic State Generation

v2 uses CSS `color-mix()` to automatically generate state variants:

```css
/* These are automatically generated - no need to define in themes */
--primary-hover: color-mix(in oklch, var(--primary) 92%, var(--color-text-inverse));
--primary-active: color-mix(in oklch, var(--primary) 85%, var(--color-text-inverse));
--primary-subtle: color-mix(in oklch, var(--primary) 15%, var(--color-bg-root));
--success-subtle: color-mix(in oklch, var(--success) 15%, var(--color-bg-root));
--destructive-subtle: color-mix(in oklch, var(--destructive) 15%, var(--color-bg-root));
```

### 3. Themed Shadow System

Shadows are now theme-aware using `color-mix()`:

```css
--shadow-color: color-mix(in oklch, var(--color-accent-primary) 15%, oklch(0% 0 0));
--shadow-md: 0 4px 6px -1px color-mix(in oklch, var(--shadow-color) 15%, transparent);
```

### 4. Proper Semantic Naming

- `--danger` (v1, confusing) → `--color-semantic-warning` (v2, clear)
- `--graph-1/2` → `--color-data-1` through `--color-data-8`

## Breaking Changes

### For Theme Authors

1. **New attribute required:** Add `data-theme-version="2"` to use v2 themes
2. **Variable names changed:** All variables now use `--color-*` prefix
3. **More variables:** 20 base variables instead of 12
4. **No state variables:** States are auto-generated via `color-mix()`

### For Component Developers

1. **New utility classes available:**
   - `bg-success-subtle`, `bg-warning-subtle`, `bg-destructive-subtle`
   - `shadow-success`, `shadow-warning`, `shadow-error`, `shadow-info`, `shadow-primary`

2. **Fixed hardcoded colors:**
   - Replace `bg-amber-500` with `bg-warning`
   - Replace `text-amber-500` with `text-warning`

## Migration Steps

### Step 1: Update HTML Attribute

Add `data-theme-version="2"` to your `<html>` tag:

```html
<!-- v1 -->
<html data-palette="dracula">
  <!-- v2 -->
  <html data-palette="dracula" data-theme-version="2"></html>
</html>
```

### Step 2: Update Custom Components

Replace old variable references:

```css
/* v1 */
.custom-card {
  background: var(--card);
  color: var(--card-text);
  border-color: var(--border);
}

/* v2 */
.custom-card {
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
  border-color: var(--color-border-default);
}
```

### Step 3: Use New Semantic Colors

```css
/* v1 - confusing */
.status-warning {
  background: var(--danger); /* Why is warning called danger? */
}

/* v2 - clear */
.status-warning {
  background: var(--color-semantic-warning);
}
```

### Step 4: Use State Variants

```css
/* v1 - manual */
.button:hover {
  background: color-mix(in oklch, var(--primary) 90%, white);
}

/* v2 - pre-generated */
.button:hover {
  background: var(--primary-hover);
}
```

## Backward Compatibility

v1 themes continue to work without changes. The v2 system is opt-in via the `data-theme-version="2"` attribute.

## Theme Variable Reference

### Surface Colors

| Variable              | Usage                       |
| --------------------- | --------------------------- |
| `--color-bg-root`     | App/page background         |
| `--color-bg-surface`  | Cards, containers           |
| `--color-bg-elevated` | Modals, popovers, dialogs   |
| `--color-bg-overlay`  | Overlays, scrims, backdrops |

### Content Colors

| Variable                 | Usage                         |
| ------------------------ | ----------------------------- |
| `--color-text-primary`   | Headings, primary text        |
| `--color-text-secondary` | Labels, secondary text        |
| `--color-text-muted`     | Hints, placeholders, disabled |
| `--color-text-inverse`   | Text on colored backgrounds   |

### Semantic Colors

| Variable                   | Usage                           |
| -------------------------- | ------------------------------- |
| `--color-semantic-success` | Healthy status, success states  |
| `--color-semantic-warning` | Caution, warnings, degraded     |
| `--color-semantic-error`   | Errors, critical states         |
| `--color-semantic-info`    | Neutral info, processing states |

### Data Visualization

| Variable         | Default Usage                    |
| ---------------- | -------------------------------- |
| `--color-data-1` | Primary accent / first series    |
| `--color-data-2` | Secondary accent / second series |
| `--color-data-3` | Success / third series           |
| `--color-data-4` | Pink/magenta / fourth series     |
| `--color-data-5` | Yellow / fifth series            |
| `--color-data-6` | Orange / sixth series            |
| `--color-data-7` | Red / seventh series             |
| `--color-data-8` | Blue/indigo / eighth series      |

## Auto-Generated State Variables

For each semantic and accent color, these variants are auto-generated:

- `[color]-hover`: 92% mix with inverse (hover state)
- `[color]-active`: 85% mix with inverse (active/pressed state)
- `[color]-subtle`: 15% mix with background (subtle backgrounds)
- `[color]-subtle-hover`: 25% mix with background (hover on subtle)

Examples:

- `--primary-hover`, `--primary-active`, `--primary-subtle`
- `--success-subtle`, `--success-hover`
- `--destructive-subtle`, `--destructive-hover`
- `--warning-subtle`, `--warning-hover`
- `--info-subtle`, `--info-hover`

## Shadow Variables

Standard elevation shadows (theme-aware):

- `--shadow-2xs` through `--shadow-2xl`

Colored glow shadows:

- `--shadow-success`
- `--shadow-warning`
- `--shadow-error`
- `--shadow-info`
- `--shadow-primary`

## FAQ

### Q: Can I use v1 and v2 themes together?

A: Yes, v1 themes work without the `data-theme-version="2"` attribute. You can mix and match during migration.

### Q: Do I need to update all 15 themes?

A: We've already updated all 15 built-in themes to support v2. Just add the attribute to use them.

### Q: What happens if I forget `data-theme-version="2"`?

A: The theme will fall back to v1 behavior with the old 12-variable system.

### Q: Are there performance implications?

A: `color-mix()` is calculated by the browser's CSS engine and has minimal performance impact. The benefit of reduced CSS output outweighs any cost.

### Q: Can I still override specific state colors?

A: Yes, just define the specific state variable after importing the semantic mapping. Auto-generated variables use the cascade.

## Migration Checklist

- [ ] Add `data-theme-version="2"` to HTML element
- [ ] Update custom CSS variable references
- [ ] Replace hardcoded colors (amber-500 → warning)
- [ ] Test all themes
- [ ] Update component documentation
- [ ] Remove v1 theme files (optional, post-migration)
