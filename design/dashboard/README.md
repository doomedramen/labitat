# Dashboard design studies

Two interactive interpretations of the existing dashboard. Neither is imported by the application, exposed through a Next.js route, or wired to production data.

## Run and compare

```sh
pnpm design:dev
pnpm design:test
pnpm design:build
```

Use the repository's Node 22 toolchain. Open:

- Precision instrument: <http://127.0.0.1:5173/?direction=precision&theme=dark>
- Layered slate: <http://127.0.0.1:5173/?direction=slate&theme=dark>
- Change `theme=light` for either light theme, or use the sun/moon button.

The direction switch preserves search, filters, draft arrangement, and metric selections. Review tools contain the annotated reference board, five data scenarios, and simulated save outcomes. This control strip is part of the review environment, not the proposed product navigation.

## Design intent

Both designs preserve header → controls → visible activity → ordered service groups. The same 34 synthetic services, six groups, four download entries, and three streams populate each direction. The first two activity entries are visible initially; expansion reveals all available fixture entries.

Precision uses warm graphite/porcelain, orange, monospaced measurements, 8px corners, and fine boundaries. Slate uses blue-grey/white surfaces, cyan, proportional tabular measurements, 16px corners, and subtle surface depth. Layout and interaction differences are deliberately constrained so this is a visual redesign of the product, not another information-architecture proposal.

The latest spacing revision follows the user's comparison of service metrics against download rows: full-width metric buttons have **16px vertical / 20px horizontal internal padding**, with 18px horizontal padding on phones. The service header has its own inset. Metric content no longer touches the clickable area's edges. No large empty panel is painted behind unoccupied service slots.

## Reference board and source inspection

The in-preview board is an annotated set of original typographic studies, clearly labelled as studies rather than product screenshots. Sources were read and their actual rendered pages inspected:

| Source                                                                          | Observation                                                                                    | Transfer into this design                                                                                                  |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [Vercel Geist materials](https://vercel.com/geist/materials)                    | Surface treatments distinguish elevation with restrained fills, radii and shadows.             | Semantic background/panel/raised/inset layers and distinct control states; no pure-black outline-only canvas.              |
| [teenage engineering OP–1 field guide](https://teenage.engineering/guides/op-1) | Hardware controls are grouped consistently within a precise neutral enclosure.                 | Precision's warm palette, repeated alignment, measured numbering, and sparse accent. No fake hardware knobs.               |
| [Nothing](https://nothing.tech)                                                 | Distinctive type treatment and repeated brand details create identity.                         | Repeated micro-labels and a restrained visual signature, without dot-matrix data labels or the black marketing background. |
| [Homarr demo](https://demo.homarr.dev/)                                         | Its actual demo combines source-specific downloads, playback, apps, and resource measurements. | Keep activity lists and recognizable service identities visible; do not imitate its many independently sized widgets.      |
| [Homepage](https://gethomepage.dev/)                                            | Service grouping and operational integrations anchor the dashboard.                            | Stable group order and useful selected metrics remain the foundation.                                                      |

## Interactive coverage and boundaries

- Search by service name, type, or group; `/` and Cmd/Ctrl+K focus search. Health/stale filters overlap honestly and preserve order.
- Card-wide launch links and separate metric details buttons; status popups expose details for launcher-only services. Native modal focus containment; Escape, browser Back, URL restoration, and focus return. Launch links open reserved synthetic `.example.test` destinations in a new tab.
- Full selected metrics in details, with first four in the overview. Settings support metric hide/show/reorder in memory. History intentionally shows an honest empty state and range controls; no fake measurements are plotted.
- Arrange offers native pointer drag, keyboard/button order controls, cross-group selects, group ordering, empty-group drop targets, Save, Cancel, pending state, retryable failures, and conflict recovery. The fixture is reset by refresh. Native drag is supplemented by explicit move controls on touch devices.
- All data is synthetic. No application API, database, polling, credential, history, or saved-configuration changes. Existing `ServiceMetric` and `DownloadItemData` contracts are reused through type-only imports.
- Fonts load from Google Fonts; authentic icons load from the existing selfh.st CDN. Unavailable icons fall back to a neutral server symbol. These are the only external presentation dependencies.

## Review and verification

Automated browser recordings and screenshots are generated under ignored `test-results/`. Run `pnpm exec playwright show-report design/dashboard/playwright-report` to review them.

The suite checks both directions and both themes at 320, 390, 430, 768, 1440 and 1920px; actual metric collisions and horizontal overflow; 44px mobile controls; reduced motion; search/filter stability; independent launch; URL refresh/back; activity expansion and source details; metric settings; save/cancel/failure/conflict; cross-group drag and empty groups; and a 720×450 CSS viewport corresponding to 200% desktop reflow at 1440×900. Full interaction walkthroughs are recorded on Chromium and WebKit.

The separate local axe-core audit checked WCAG A/AA rules against overview and open details in both themes and directions, with no violations after theme transitions settled. Automated results are supporting evidence, not a claim of complete accessibility certification.

### Visual review changes

| Before                                                                      | After                                                                       | Why                                                            |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Service metrics button had zero horizontal padding inside an inset article. | Full-width button with its own 20px side insets, matching activity actions. | Content and focus/hover surfaces have the same breathing room. |
| Precision's incomplete grid rows painted large solid empty blocks.          | Individual service surfaces on the page background.                         | Unoccupied slots no longer look like missing cards.            |
| Long rate values could run into adjacent measurements.                      | Units separated below values on desktop, inline with spacing on mobile.     | Preserve full values and legibility instead of shrinking text. |
| WebKit's native select ignored the minimum-height intent.                   | Explicit 44px select height.                                                | Reliable touch target across engines.                          |
| Light theme briefly inherited dark initial colours.                         | Initial theme/direction applied before React renders.                       | Avoid a flash and transitional contrast artifacts.             |

**Recommendation:** Layered slate is the stronger continuation of this product: clearer surface depth and familiar service identities, with a less austere reading experience. Precision is a credible alternative for a more instrument-like character, especially in light mode. Neither is presented as guaranteed award-winning work; visual selection and further critique are the next milestone.

**Outstanding:** physical-phone validation, native browser 200% zoom confirmation (the suite covers equivalent CSS reflow), and user selection of a visual direction. Production integration and production CI verification belong to the next phase, after selection.
