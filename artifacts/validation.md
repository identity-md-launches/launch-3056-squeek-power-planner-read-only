# Implementation and validation record

Date: **2026-11-06**. This is the worker's own evidence, not independent certification.

## Scope and consequential choices

Implemented Wallet, Simulator, Network and About as hash routes in a React/TypeScript static application. The production export is `dist/`. All financial inputs come from the assigned public API or published Sepolia contracts. There is no backend, new token, contract, key handling, signing or transaction broadcast. Pasted-address lookup remains the primary action; connection is optional.

The design follows the supplied Better Interface reference across its six domains. The dark charcoal/lime direction and wheel illustration were ordinary implementation choices. An inspectable address from the official deployment record supplies the public-reserve shortcut. All synthetic data lives in test fixtures, outside the bundle.

Forecasts are snapshot comparisons, not guarantees. Multiple actions can be compared together, but unsigned preparation emits one currently valid step at a time. This avoids treating an unexecuted approval/deposit as real chain state. The owner must refresh/replan after each externally executed step. Network reads use a public RPC; preparation pins a confirmed block and fails closed on identity/eligibility/simulation errors.

## Actual checks

| Check | Result | Evidence / coverage |
| --- | --- | --- |
| Production build | Passed, exit 0 | Vite 7.3.7, final `dist/` built after the last source change |
| Strict TypeScript | Passed, exit 0 | TypeScript 5.9.3, `noEmit`, strict mode, all `src/` |
| Model/parser suite | 24 passed, 0 failed | `tests/model.test.ts`: all levels, exact decimal parsing, deposits/boost, wallet/deposited merges, gates/cooldowns/custody, maturity, changed denominator, unknown vs zero, stream expiry, malformed API and safe image data |
| Export interaction suite | 20 passed | `tests/browser.mjs`: keyboard lookup/focus, invalid and valid address, modal Escape/focus return, custody filter/activity, combined plans, merge confirmation, mature Max, RPC failure, navigation, unavailable/retry, mobile links, reflow, no uncaught errors |
| Wallet-provider suite | 4 passed | `tests/wallet-browser.mjs`: two EIP-6963 providers, hidden duplicate generic row, recoverable rejection, wrong-network switch/add (4902), disconnect, no signing/send requests |
| Automated accessibility | 8 states, 0 violations | `tests/a11y-browser.mjs`: empty/loaded wallet, dialog, deposit, merge, invalid unstake, Network, About; axe 4.14.0 |
| Live read/simulation suite | Passed | `tests/live-browser.mjs`: real official API, deployment graph, custody/eligibility, safe-transfer deposit, wallet-held merge, SQK approval/stake, unstake quote/simulation, clipboard equality |
| Design probe | 16/16 passed | Pinned `taste.mjs`, final export, report in `artifacts/taste.json` |
| Static export integrity | Passed | `scripts/check-export.mjs`: 11 files, **910,729 bytes**, relative local references, metadata, no maps/archives/caches/symlinks |
| Documentation destinations | Passed after correction | The About-page documentation destinations returned HTTP 200; the original guessed merge URL returned 404 and was replaced with the official NFT reference |

The final live unstake quote used Sepolia block **12,076,803**. For 1 SQK mature principal the UI showed a burned fee of **0.020001 SQK** and net **0.979998 SQK**, each truncated to six decimal places. The accepted maximum fee and encoded call preserved full precision. Both quote and preparation were contract reads/simulations; no exit actually occurred. A zero daily projection in the live screenshots was the API's expired/idle funding stream, not a fabricated fallback.

The live reserve was `0xd5dab9f1d15e9d45548078726c54732a5b59eb78`, from the official deployment. Live deposit used #8990, and merge used #8990/#8991. The public staker used for the mature exit was `0xbb97ae918a92eafe81304e1829eacb0da0c66e47`, discovered through the official `/squeeks/4001` custody response. These are read-only test subjects, not default recipients or substituted owner settings. Future live tests may legitimately fail when their ownership/eligibility changes.

## Commands and environment adaptations

Normal rebuild/check commands are in README. Dependencies in this worker were installed in disposable `test/scratch/toolchain/`, and its generated lockfile was copied to the root. Root dependency/cache directories were not written. The actual final worker commands were:

```sh
node test/scratch/toolchain/node_modules/typescript/bin/tsc --noEmit -p test/scratch/tsconfig.json
PLANNER_DEPS="$PWD/test/scratch/toolchain/node_modules" node test/scratch/toolchain/node_modules/vite/bin/vite.js build
TSX_TSCONFIG_PATH=test/scratch/tsconfig.json node --import ./test/scratch/toolchain/node_modules/tsx/dist/loader.mjs --test tests/model.test.ts
node scripts/check-export.mjs
node tests/browser.mjs
node tests/wallet-browser.mjs
node tests/a11y-browser.mjs
PLANNER_CURL_BRIDGE=1 node tests/live-browser.mjs
node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

Browser invocations used `IMD_PLAYWRIGHT` and `PLAYWRIGHT_EXECUTABLE` pointing to the installed Playwright and Chromium headless-shell binary; axe used `PLANNER_AXE` pointing to the scratch dependency. The probe used the installed browser cache via `PLAYWRIGHT_BROWSERS_PATH` and `TMPDIR=test/scratch/t`. The scratch TypeScript configuration extends the delivered config and only redirects module/type resolution to the permitted dependency directory. All scratch material is excluded and removed before delivery.

The provided browser service and regular Chromium launch failed because the machine's temporary Unix socket path was too long. Chromium headless shell with a short scratch temp path worked. Direct external network requests from that browser failed with `net::ERR_EMPTY_RESPONSE`; live browser checks therefore used the documented test-only curl bridge to the same API/RPC URLs. Fixtures and that transport are never part of `dist/`. The browser suites still loaded the real production HTML/CSS/JS from a local **`/preview/` subpath**.

Vite emitted ignored client-module `"use client"` directives and a main-chunk-size warning (704.62 kB minified, about 204 kB gzip). They did not fail the build. The complete export is under its 2 MiB allocation. No source maps, npm tarballs, browser binaries or dependency directories are delivered.

## Better Interface coverage

Each domain includes source review and rendered checks; a checked domain does not imply its unperformed subchecks passed.

| Domain | Status and evidence | Limits / not applicable |
| --- | --- | --- |
| Accessibility | **Checked.** Native buttons/links/forms/dialog/details, explicit field and dialog labels, headings/landmarks, text plus status color, 2px focus ring, keyboard-only address entry/error, modal Escape/focus return, live status messages, reduced motion, 8 axe scans. `keyboard-focus-390.png` confirms visible focus. | Screen-reader session and OS forced-colors **not reviewed**. Native browser zoom **not reviewed**; 200% root text enlargement tested separately. No autoplay media: **not applicable**. |
| Layout | **Checked.** Source grids/breakpoints plus screenshots, reflow at 320/390/768/1440. Loaded wallet, merge/exit simulator, Network/About, error/retry and mobile chooser checked. Product/address action fit first 390×844 screen. Long addresses, exact fees and calldata wrap. | Physical phone safe-area/keyboard overlay and every intermediate viewport **not reviewed**. Drag/drop and complex data tables **not applicable**. |
| Writing | **Checked.** Direct verbs beside controls; no marketing hero; “Unavailable” distinct from zero; no fixed-yield promise; donor named before irreversible burn; fees and unsigned-only behavior explained. Probe copy budget passes. Broken merge documentation link corrected. | No localization or translated copy requested; **not applicable**. Copy comprehension was worker review, not user research. |
| Typography | **Checked.** Six rem-based sizes, three requested weights, system sans, mono only for code, balanced headings, bounded prose measure, tabular numeric columns and wrapping. Probe size/family/tracking/casing checks pass. | Exact OS font rendering differs. No webfont loading: **not applicable**. Safari typography **not reviewed**. |
| Colors | **Checked.** Primitive-to-semantic tokens, visible text labels with color, state surfaces, primary/hover/error/focus colors. Probe measured rendered text against solid backgrounds and passed 4.5:1 normal / 3:1 large; axe found no contrast violation in eight scanned states. | APCA and color-vision simulation **not reviewed**. Token-art contrast is external artwork, not UI text. There is no light theme. |
| UI | **Checked.** Consistent controls/panels, plain surface hierarchy, matching local wallet marks, real NFT imagery, loading/empty/pending/error/retry states, stale call/quote disabling, exact burn confirmation, clipboard success, mobile sheet, explicit transitions. Probe chrome, targets and motion pass. | Physical mobile wallet handoff, real extension and Coinbase passkey ceremony **not reviewed**. Payment/transaction submission **not applicable** to this read-only app. |

Probe details: no horizontal overflow, text overlap, floating-control overlap or clipped text at the measured entry states. All 15 first-screen controls meet 24px-or-spacing criteria at 390px; five secondary controls are below the 44px comfort target. Primary buttons are at least 44px, wallet rows 56px. The source disclosures deliberately remain compact and separated. All sixteen checks (render, layout, targets, contrast, casing, tracking, eyebrows, type sizes, type faces, glyphs, slogans, repetition, copy budget, chrome, motion, share) passed. The probe is an entry-page measure; the separate browser/axe suites cover the other routes.

## Findings, repairs and rechecks

Locations identify the final implementation. Findings are grouped by root cause; the report does not claim an external audit.

| Severity | Location / finding | Applied fix and evidence |
| --- | --- | --- |
| High | `src/api.ts:5`, `src/model.ts:64`: unavailable fields must not appear as zero or allow a plausible invented projection | Parsing propagates nested unknown states, distinguishes real zero and rejects incomplete tokens. Parser/model tests and HTTP-200-unavailable browser recovery pass. |
| High | `src/chain.ts:31`: pooled RPC latest heads returned a missing-block error during preparation | Pin all reads to head minus 12, verify deployment/graph and recheck block hash. Real deposit, merge, approval/stake and exit simulations passed. |
| Medium | `src/wallet.tsx:36`: dialog needed an explicit accessible name | Added heading association with `aria-labelledby`; dialog axe scan and Escape/focus-return interaction pass. |
| Medium | `src/App.tsx:78`: a plain `#main` skip link could enter the hash router | Prevent default hash navigation and focus/scroll the main region; native links remain keyboard reachable. Main lookup keyboard path and route interactions pass. |
| Medium | `src/App.tsx:85`, `src/Simulator.tsx:63`: visual results changed without a dedicated status announcement | Added concise screen-reader status regions. Eight axe states pass; a real screen-reader session remains unperformed. |
| Medium | `src/wallet.tsx:13`: phone handoff needed the actual Rabby open-dapp format | Use the official `go.rabby.io/mobile/?_cmd=open-dapp&dapp=` link; all four mobile links and Smart Wallet row tested in mobile emulation. Actual app handoff remains unperformed. |
| Medium | `src/App.tsx:15`: image errors and pending metadata needed explicit recoverable states | Preserve Loading/Image pending/Image unavailable; retry available when appropriate; never substitute artwork. Live collection displayed real images and honest unavailable tiles. |
| Medium | `src/App.tsx:119`: merge documentation URL returned HTTP 404 | Replaced with `developers/nft/#merge`; HTTP 200 confirmed, final export rebuilt. |
| Low | `src/style.css:8`: font stack named an unbundled typeface | Use the native system sans stack; no font network dependency or implied font download. Probe typography passes. |
| Low | `src/App.tsx:94`, `src/style.css:362`: smooth scrolling/press feedback should honor reduced motion | JS scroll checks media preference; reduced-motion CSS disables transforms and transitions. Probe motion check and reduced-motion interaction context pass. |
| Medium | `src/style.css:19`: one axe rerun caught a 1.76:1 intermediate text contrast while the lookup button changed from primary to secondary on navigation | Removed foreground/background crossfades; border and press feedback remain. Rebuilt and rechecked all eight axe states. This fixes the transient state rather than delaying the test. |

No observed first-screen or repeated design-probe failure remains. These repairs do not establish full WCAG compliance or wallet-platform compatibility.

## Evidence artifacts

- `screenshots/first-screen-390.png`: final probe entry viewport, showing the product and main action.
- `screenshots/keyboard-focus-390.png`: keyboard-focused lookup with visible outline.
- `screenshots/wallet-live-1440.png`: real reserve portfolio with provenance and NFT data.
- `screenshots/unsigned-deposit-1440.png`: live verified deposit preparation.
- `screenshots/unstake-live-390.png`: mobile live quote and unsigned output, exact full-precision confirmation.
- `screenshots/network-live-1440.png`: live network snapshot, including idle stream when reported.
- `screenshots/mobile-connect.png`: phone-emulated connect choices with wallet marks.
- `taste.json`: final pinned probe output. Full scratch logs, fixture screenshots and browser caches are not submitted.

Screenshots are observational captures, not fixtures injected into the application. Live screenshots used the test transport described above. Synthetic-fixture screenshots were not selected as live evidence.

## Delivery and remaining limits

**Complete for the stated implementation and static-export scope.** The first-screen, build, typecheck, useful interactions, six-domain review, design documentation and relative production export are delivered. Public IPFS pinning is the IdentityMD handoff stage; no published URL was available or claimed here.

WebKit was downloaded into scratch but could not launch because required system libraries (including GTK4/GStreamer/ICU) are absent. Safari, actual mobile wallet browsers, hardware input devices, native zoom, screen readers, Coinbase passkeys and public-gateway CORS behavior remain unverified. The application reports failed external reads as unavailable. Live account reads and current-rate projections are snapshots and can become stale; no future reward prediction or eventual transaction success is certified.

The delivered additions total **2,856,033 bytes** across **61 files**, below **8,388,608 bytes**. `dist/` contributes 910,729 bytes. Every allocation in `bundle-budget.md`, including the explicit 1,024-byte `.gitignore` allocation, is checked. Source, public assets, official ABI/deployment records, tests, package manifest/lockfile, licenses, documentation and complete export remain included. Generated dependencies/caches, scratch outputs and submodules are absent from the submission file list.
