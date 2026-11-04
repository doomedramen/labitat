# Mobile-first dashboard redesign

The desktop and phone screenshots showed a dashboard dominated by repeated card borders, blank space, and small text. This redesign replaces individual cards with compact service rows inside shared group panels. It keeps live health, launch links, inspection, history, and atomic arrangement behavior.

| Before                                             | After                                                                                | Why                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Every service occupied a large standalone card     | Shared group panels with subtle row separators                                       | Make groups easier to scan and remove repeated visual chrome                                   |
| Mobile reserved 136px even for a simple launcher   | 96px metric rows and 60px launcher rows                                              | Spend space on observations, with a full 44px launch target and a separate 44px details target |
| Desktop groups consumed a full-width grid each     | Whole panels balance across two, three, or four columns                              | Use horizontal space without mixing services from different groups                             |
| Repeated “Service details” placeholders            | Quiet launcher rows with an inspect control                                          | Remove text that conveys no service information                                                |
| All metric layouts reserved four equal empty cells | One to four selected metrics share the available row, with compact pairs below 360px | Give services with fewer observations more readable labels                                     |
| Muted cards and small values had little hierarchy  | Graphite/mint and ivory/teal themes, larger values, clear labels                     | Prioritize service identity and measurements                                                   |
| Move controls crowded each tile                    | Drag handles plus a row-specific Arrange popover                                     | Keep touch controls usable without permanently showing every option                            |
| Browser tests did not gate publishing              | Chromium and mobile WebKit checks gate Docker and docs deployment                    | Check the actual responsive interaction paths in CI                                            |

Panel placement depends on saved configuration, never on observation values. Saved DOM order and nondecreasing panel starting positions preserve reading order. Filters may change the visible arrangement, but do not write a new order. Explicitly hidden metrics collapse into a launcher row; a failed observation does not resize a metric row.

## Validation

- 899 unit tests pass, including fine-pointer and touch panel placement without overlap.
- Production browser suite: 85 passed; six existing disabled cases remain disabled.
- Additional final checks cover phone and landscape WebKit, 16px search/select inputs, separate launch/inspect tap targets, full-screen details, and cross-group arrangement cancellation.
- A synthetic 34-service fixture exercises six unequal groups, native rates, unavailable observations, failures, link-only services, and both themes at 320, 390, 600, 1440, and 1800px.
- The separate 24-service fixture fits a 1440 × 900 viewport. Existing checks cover zoom reflow, keyboard focus, URL restoration, history, save failures, concurrency rejection, and 100-service render isolation.
- Type checking, lint, production build, all 53 adapter validations, documentation coverage, and documentation build pass.

Screenshots are synthetic fixtures, not a connection to the deployed homelab. Mobile WebKit emulation verifies layout and browser behavior; physical phone keyboard behavior, Safari browser chrome, and touch feel still need checking on hardware.

See the [operator guide](../operator-dashboard.md) and [performance notes](../performance.md) for current geometry and behavior. This review supersedes the row dimensions in the earlier operator v2 review.
