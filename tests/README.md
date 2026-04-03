# Playwright E2E Tests

Comprehensive end-to-end tests for Labitat using Playwright. All tests use **real user interactions only** - clicking, typing, dragging - no API shortcuts.

## Setup

### Install Browsers

```bash
pnpm exec playwright install chromium
```

## Running Tests

### Run all tests

```bash
pnpm test
```

### Run tests in headed mode (see browser)

```bash
pnpm test:headed
```

### Run tests in debug mode

```bash
pnpm test:debug
```

### Run specific test file

```bash
pnpm test tests/e2e/auth.test.ts
```

### Run tests by name pattern

```bash
pnpm test -- --grep "login"
```

### Show HTML report

```bash
pnpm test:report
```

## Test Files

- **auth.test.ts** - Login, logout, authentication flows
- **dashboard.test.ts** - Dashboard display, empty states, edit mode
- **groups.test.ts** - Group CRUD operations, drag-and-drop reordering
- **items.test.ts** - Item CRUD operations, service configuration, drag-and-drop
- **settings.test.ts** - Dashboard title editing, theme switching, dialog keyboard shortcuts

## Test Data

Tests create their own data and clean up through UI interactions. Each test:
1. Logs in via the login form
2. Creates necessary groups/items through dialogs
3. Performs assertions
4. Cleans up by deleting created items (when possible)

## Fixtures

The `tests/fixtures.ts` file provides:
- `authenticatedPage` - Pre-logged in page fixture

## Data Test IDs

Components use `data-testid` attributes for reliable selectors:

| Component | Test ID |
|-----------|---------|
| Login form | `login-form` |
| Email input | `email-input` |
| Password input | `password-input` |
| Submit button | `submit-button` |
| Dashboard title | `dashboard-title` |
| Edit button | `edit-button` |
| Edit bar | `edit-bar` |
| Add group button | `add-group-button` |
| Group dialog | `group-dialog` |
| Item dialog | `item-dialog` |
| Logout button | `logout-button` |
| Empty state | `empty-state` |

## CI/CD

Tests run in CI with:
- Chromium browser only
- No parallelization (single worker)
- 2 retries on failure
- Trace collection on first retry

## Debugging

1. Use `--debug` flag for step-through debugging
2. Use `--ui` for UI mode with time travel
3. Check `test-results/` folder for screenshots and videos
4. Use `console.log()` in tests - output appears in terminal

## Common Issues

### Tests fail because element not found
- The test database is wiped and re-migrated before every run. If issues persist, delete `data/labitat.test.db` manually.
- Increase timeout in playwright.config.ts if needed

### Drag and drop tests flaky
- Drag operations use bounding boxes which can vary
- Tests verify position changed, not exact coordinates

### Theme tests fail
- Theme persistence uses localStorage which may vary
- Tests check for class changes, not specific theme names
