# Squeek Power Planner design

## Overview

The interface serves Sepolia stakers who want to understand a change before making it. It is a compact, dark dashboard: charcoal surfaces, warm off-white text, lime actions, and a small hamster/wheel illustration. Wallet lookup is the first task, followed by four summary metrics and the NFT collection. There is no marketing hero. The Simulator uses an editable plan beside a before/after comparison; mobile stacks these in reading order.

The implementation source of truth is `src/style.css`, followed by the actual components in `src/ui.tsx`, `src/App.tsx`, `src/Simulator.tsx` and `src/wallet.tsx`. The values below describe the delivered source/export. Rendered checks and unresolved coverage are recorded in `artifacts/validation.md`.

## Colors

Canonical colors are hexadecimal CSS custom properties at `src/style.css:1`. Reuse semantic names in components.

| Semantic token | Value / primitive | Use |
| --- | --- | --- |
| `--background` | `#101310` / `--neutral-950` | Page and inset fields |
| `--surface` | `#171c17` / `--neutral-900` | Metrics, panels, chooser |
| `--surface-hover` | `#1d241d` / `--neutral-850` | Hover and notice surfaces |
| `--surface-active` | `#252e24` / `--neutral-800` | Selected filter, compact image backing |
| `--border` | `#364333` / `--neutral-700` | Dividers and quiet outlines |
| `--text` | `#f0f2eb` / `--neutral-100` | Main text |
| `--muted` | `#a7b0a3` / `--neutral-500` | Supporting text and source labels |
| `--accent`, `--focus` | `#c6ef82` / `--lime-400` | Main action, selected navigation, focus |
| `--accent-hover` | `#b1db6d` / `--lime-500` | Primary-button hover |
| `--accent-text` | `#19230e` | Text on lime |
| `--accent-surface` | `#242e1c` | Account-power metric, chosen action |
| `--warning` | `#f0c880` / `--amber-300` | Burn acknowledgement, eligibility warnings |
| `--error` | `#ffafa3` / `--red-300` | Validation and request errors |
| `--diagram-line` | `#526348` | Decorative wheel geometry |

Status is always accompanied by words or an icon; color alone never explains custody, errors or eligibility. The actual wallet logos retain their own brand colors. The image outline is neutral white at 10% (`#ffffff1a`); the modal backdrop is `#000a`. Dark mode is the only theme. No light-mode palette or unimplemented contrast claims are implied. Automated rendered text-contrast checks passed; see the validation report for their scope.

## Typography

The sans stack is `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`. This is a system-font interface with no downloaded font. Exact glyphs/available font weights depend on the OS. Code uses `'SFMono-Regular', Consolas, 'Liberation Mono', monospace`; it is not used for ordinary prose.

| Token | Size at 16px root | Role |
| --- | ---: | --- |
| `--text-xs` | 12px / .75rem | Provenance, metadata, compact mobile labels, JSON |
| `--text-sm` | 14px / .875rem | Controls, supporting text, tables |
| `--text-base` | 16px / 1rem | Body, inputs, small headings |
| `--text-lg` | 20px / 1.25rem | Section headings and brand |
| `--text-xl` | 28px / 1.75rem | Numeric emphasis and mobile page title |
| `--text-display` | 40px / 2.5rem | Desktop page title |

Weights are 400 for body, 500 for controls/numbers, 600 for headings and primary actions. Body line height is 1.55; h1 is 1.15, h2 1.3, h3 and metric values 1.4. Page headings use −.04em tracking (−.03em on mobile), h2 −.02em. There is no tracked uppercase eyebrow. Headings balance; paragraphs use pretty wrapping. About text is capped at 68ch, helper copy generally 43–78ch. Numeric columns use `tabular-nums`. Long addresses/calldata wrap anywhere, and JSON uses `pre-wrap` rather than causing page overflow.

## Layout

`.container` is centered, at most 1200px with 32px gutters; it becomes 1280px above 1500px with 48px gutters. Header is capped at 1320px. Spacing is implemented directly in CSS, mostly multiples of four: 4/8/12/16px within controls, 20/24/28/32px between groups, 40/64px for page rhythm. There is no separate spacing-token API. Use these existing classes before introducing another local spacing scheme.

Desktop metrics form four equal columns, collection and sidebar use `1fr 300px`, NFT cards use three columns, and Simulator is `1.15fr 1fr`. Its results panel is in normal document flow. About uses a readable article plus a 320px reference sidebar.

| Breakpoint | Implemented changes |
| --- | --- |
| ≤1100px | Two-column NFT grid, 270px wallet sidebar, smaller panel padding; action icons stack above labels |
| ≤900px | Metrics become two columns; Simulator and Network stack; About sidebar narrows |
| ≤700px | 20px gutters, 28px title, single wallet/About column, navigation spans the width; refresh keeps icon and accessible name |
| ≤500px | 16px gutters, full-width lookup button below input, two compact metric/NFT columns, vertical merge fields, single sidebar, wallet dialog becomes bottom sheet |

Primary lookup, product name and all four navigation items are visible in the first 390×844 viewport. Rendered reflow was checked at 320, 390, 768 and 1440px with loaded/error/planner states, and at 768px with root text enlarged to 200%. Native browser zoom and every possible viewport are not claimed. Long output remains selectable and wrapped. Dialog height uses `100dvh`, scrolls internally and includes bottom safe-area padding on phones.

## Elevation & Depth

The system is flat. Surfaces separate sections by tone; borders separate controls, cards and rows. There are no box shadows or text gradients. Avoid combining a decorative border and shadow on the same panel. Native modal `<dialog>` supplies the top layer; its backdrop dims the page. The only explicit high z-index is the keyboard skip link. Wheel art is decorative and has no animation.

## Shapes

`--radius-sm: 8px` is for inputs/buttons and inset blocks; `--radius: 14px` for cards and panels; `--radius-lg: 20px` for the dialog. Segmented controls use a local 5px inner radius. Mobile sheet rounds its top corners to 20px. Status dots are circles. Token imagery has a square aspect ratio with `object-fit: contain`, so artwork is not cropped. The repeated control outline is 1px; keyboard focus is a 2px lime outline offset 4px.

## Components

| Component / pattern | Source | Behavior and reuse |
| --- | --- | --- |
| `Metric` | `src/ui.tsx` | `label`, `value`, optional `unit`, `hint`, `source`, `derived`, `accent`; unknown values omit units and display Unavailable/Not loaded |
| `Source` | `src/ui.tsx` | Native details/summary shows API/Contract and block/time; expands to endpoint, ISO timestamp and optional block hash; `derived` prefixes Calculated |
| `Notice` | `src/ui.tsx` | Neutral/warning/error tone, icon plus text; errors have `role=alert`; retained beside the relevant interaction |
| `Copy` | `src/ui.tsx` | Unsigned JSON clipboard control; copied state, failure instructions and disabled stale-output state; selectable JSON remains available |
| `Icon`, `WheelArt` | `src/ui.tsx` | Small consistent stroke icons and decorative wheel SVG; hidden from accessibility tree |
| Buttons | `src/style.css` | `.button` is a 44px outlined action; `.primary` uses lime; `.text-button`/`.text-link` are secondary; disabled opacity and explicit loading labels |
| Navigation | `src/App.tsx` | Hash links, `aria-current`, icon plus text, underline selection; route change focuses main and returns to top |
| Wallet lookup | `src/App.tsx` | Visible input label, paste supported, inline validation and invalid state, View wallet, public-reserve shortcut, loading/retry; successful results announced |
| `TokenImage`, `TokenCard` | `src/App.tsx` | Real image or explicit loading/pending/unavailable fallback; retry when appropriate, custody words, level, power, next height, contextual plan action |
| Simulator | `src/Simulator.tsx` | Pressed action buttons, labelled native selects/checkboxes/amount input, before/after table, exact power breakdown, dynamic result announcement; missing inputs block preparation |
| `ConnectControl` | `src/wallet.tsx` | Single connect button; labelled native modal; named providers/mobile links; opening, rejection, switch and disconnect states; Escape/backdrop close and focus return |

The lookup and TokenCard are currently local patterns, not an exported component library. Source and Metric are the reuse points for new numeric panels. Keep their provenance visible near the value. Each major action has a text label; secondary source summaries are at least 26px tall, comfortably spaced but smaller than 44px. Deposit rows and wallet rows provide broad click/touch regions. Disabled actions are explained adjacent to their controls.

Transitions name only border-color and transform (150ms); press feedback scales to .96. Foreground and background changes are immediate, preventing low-contrast intermediate colors when a button changes variant. `prefers-reduced-motion` removes transitions/press scaling, and JS navigation honors the preference. There is no endless animation. Forced-colors styles preserve control borders and use system Highlight focus. These styles exist; OS forced-color behavior was not manually exercised.

## Do's and Don'ts

- Begin a new route with `.container`, `.page-heading` and the existing type scale. Add a hash-route entry and a meaningful heading; use a true link for navigation.
- Use one prominent lime action for the current task. Reuse the quiet outlined/text styles for secondary actions.
- Show source/block or time next to new metrics. Keep unknown values unknown; retain exact base units for calculations and copied calls.
- Reuse semantic colors and the existing six font sizes. Do not add marketing slogans, tiny uppercase labels, decorative gradients or a second accent system.
- Keep controls native and labelled. Preserve focus, error recovery, reduced motion and 320px reflow when adding content.
- Keep live data distinct from synthetic test fixtures. Never replace unavailable NFT art or balances with invented holdings.

Better Interface and document-web-design attribution is retained in `THIRD_PARTY_NOTICES.md` and `artifacts/licenses/design-guides.txt`.
