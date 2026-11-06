# Squeek Power Planner

A read-only Sepolia planning tool for Squeekchain stakers. Look up a wallet, compare deposits, merges and SQK stake changes, then copy a simulated unsigned call for the owner to review in their own wallet. The site never requests a signature, stores keys or broadcasts transactions.

## Run and rebuild

Use Node 22.12+ or Node 24 and npm. No environment file, API key, WalletConnect project ID or backend is required.

```sh
npm ci
npm run dev
```

Production checks and export:

```sh
npm run typecheck
npm test
npm run build
node scripts/check-export.mjs
npm run preview
```

Open the URL printed by Vite. The delivered `dist/` is already built; serving it requires no npm installation. For example, `python3 -m http.server 4173 --directory dist` previews the export locally. Wallet connections and clipboard access need HTTPS or localhost. Do not open `index.html` with a `file:` URL.

`vite.config.mjs` uses `base: './'`, all runtime assets are local, and navigation uses hash routes. The export works under a gateway subpath without server rewrites. Publish the **contents of `dist/`**. IdentityMD's delivery plane pins this export to IPFS after handoff; no public URL or CID was created or verified in this worker session.

## Use the planner

1. Paste a Sepolia address and select **View wallet**, or use **Connect**. **View public reserve** looks up the real reserve address in the published deployment record; it is not a demo portfolio.
2. Wallet shows wallet-held/deposited Squeeks, level, next merge height, account power, network share, claimable SQK and the daily comparison rate. Use custody filters, **Load more Squeeks** and the recent activity disclosure.
3. Simulator can combine deposits, one merge, and either a stake or unstake. The comparison includes the SQK power boost and changes the total-network denominator. Wallet-held NFTs contribute no staking power. A wallet-held merge changes no power until the survivor is deposited.
4. An unstake must fit mature principal. **Quote exit fee** reads the contract; accept the exact maximum burn before preparing. A merge requires an explicit acknowledgement naming the permanently burned donor.
5. **Prepare next unsigned call** verifies the deployment, re-reads eligibility and simulates from the owner. Copy the displayed JSON. It contains `chainId`, `from`, and `calls` with `to`, `data`, `value`; wallets with custom transaction entry can use the individual call fields. Review and re-simulate externally. The planner does not call `wallet_sendCalls` or any send/sign method.
6. Execute a chosen step in the owner's wallet, refresh, and recreate the remaining plan. Preparation emits only the next currently valid call. Deposits use owner-initiated ERC-721 safe transfer. If SQK allowance is insufficient, the next step is an exact-amount approval; refresh after approval to prepare the stake.

Browser wallets are discovered through EIP-6963, with an injected fallback. The same connect sheet provides Coinbase Wallet/Smart Wallet and phone links to MetaMask, Coinbase Wallet, Rabby and Phantom's own browsers. No relay is configured. Network switching is user initiated; all planner reads remain on Sepolia regardless of the connected wallet's chain. Disconnect leaves the public-address lookup visible.

## Sources and calculation boundaries

The only protocol data sources are [Squeekchain's public API](https://api.squeekchain.com/v1/status) and direct Sepolia reads of the five published contracts. API routes used: `/status`, `/core`, `/economy/state`, `/accounts/{address}`, `/accounts/{address}/activity` and `/squeeks/{tokenId}`. Images come from the latter's contract-derived image data URI; arbitrary remote image URLs and HTML are not rendered.

Contract addresses are in `src/chain.ts`. The five unmodified ABI files in `src/abi/` came from [the official ABI directory](https://docs.squeekchain.com/developers/#contract-reference). `src/deployment.json` is the official [Sepolia deployment record](https://docs.squeekchain.com/assets/deployments/sepolia.json), revision 7, fetched 2026-11-06. Auxiliary proxy identity and admin-owner signatures come from the official [Quickstart](https://docs.squeekchain.com/developers/quickstart/).

The public RPC is `https://ethereum-sepolia-rpc.publicnode.com`, chain **11155111**. Reads used for preparation share one confirmed height (head minus 12); the hash is rechecked after simulation. Core/Mining/Staking implementation, layout, admin and governance bindings, NFT/Token runtime hashes, mining activation, supply and funding reconciliation must match the pinned deployment. A mismatch stops preparation. Updating a protocol deployment requires reviewing and replacing the official record/ABIs, then rebuilding; the application does not silently trust an upgrade.

Every numeric panel has API or contract provenance, with a block or observed time and expandable endpoint/time details. Calculations identify their input snapshots. API `status: unavailable`, including nested unavailable/unverified/absent fields, remains **Unavailable**, never a numeric zero. Refresh fetches new snapshots; background focus refetch and automatic retries are disabled. Pagination stays on the account's safe snapshot and rejects a changed block.

Power uses exact integer arithmetic. NFT base power is `round(1000 × 2.2^(L−1))`. With staked base units S, deposited NFT power P, reference power P_ref and conversion c, SQK power is `floor(S × 10^18 × (P_ref + P) / (c × P_ref))`; account power is P + Q. The next total is old total minus old account power plus planned power. API power and token balances use 18 decimals; token-card base power is in whole power units.

Daily SQK is the current stream's per-second rate × 86,400 × account share. It is a comparison extrapolation, not a 24-hour payout promise. Without more funding, the current stream expires; future funding and other accounts can change the outcome. Independent API reads can have different safe heights, shown explicitly. Claimable rewards remain the current account snapshot and are not projected. Display amounts truncate to their stated precision; calldata and accepted fees retain all base units. Unstake quotes and copied simulations expire in the UI after two minutes; unstake calldata also carries a ten-minute deadline from the read block.

See [staking mechanics](https://docs.squeekchain.com/developers/staking/), [NFT merges](https://docs.squeekchain.com/developers/nft/#merge), and [Build with AI](https://docs.squeekchain.com/developers/build-with-ai/). Plans and pasted addresses stay in page memory. Address queries reach the official API, and reads/simulations reach the public RPC. Wallet SDKs can retain connection state locally and contact their own services when selected.

## Validation

Browser suites serve the actual `dist/` under `/preview/` to exercise relative URLs. Install a browser once:

```sh
npx playwright install chromium
npm run test:browser
npm run test:wallet
npm run test:a11y
npm run test:live
```

`test:browser` uses labelled synthetic fixtures in `tests/fixtures.mjs`; they are not runtime assets. `test:wallet` uses mock EIP-1193 providers and never opens a real wallet. `test:live` uses live official API/RPC reads and public accounts, sends no transactions, and can fail as those accounts or protocol eligibility change. `PLANNER_BROWSER=webkit` selects an installed WebKit engine; OS libraries are also required. `IMD_PLAYWRIGHT`, `PLAYWRIGHT_EXECUTABLE`, `PLANNER_AXE` and `PLANNER_TEST_TMPDIR` optionally point the tests at an external tool installation. `PLANNER_CURL_BRIDGE=1` is a test-only transport fallback using curl to the same official endpoints; nothing from this bridge is shipped.

Actual results on 2026-11-06: production build and strict TypeScript check passed; **24 model tests, 20 browser interaction checks, 4 connector checks, 8 axe states and all 16 pinned design-probe checks passed**. Live deposit, wallet-held merge, SQK approval/stake preparation and quoted unstake simulations passed, including exact clipboard JSON. No transaction was sent. The export integrity check passed. See [the validation report](artifacts/validation.md) for commands, evidence, fixes, byte counts and coverage limits.

This worker installed dependencies only under disposable `test/scratch/toolchain/` because root dependency directories were out of scope. It ran the same tools using `PLANNER_DEPS` (Vite aliases) and a scratch TypeScript config resolving that directory. These adapters are unnecessary for normal `npm ci`. Only the source manifest and reproducible lockfile are delivered.

Remaining limits: direct external browser networking failed in this worker, so live browser validation used the test-only curl bridge. Safari/WebKit could not launch due to missing system libraries. Physical mobile-app handoffs, a real Coinbase passkey ceremony, real extensions, screen-reader use and a public IPFS gateway were not tested. Vite reports client-module directive warnings and a 704.62 kB main chunk warning; the build succeeds, with no source maps or dependency archives in the export.

## Repository map

- `src/model.ts`, `api.ts`, `chain.ts`: exact calculations, strict API parsing and read-only contract preparation.
- `src/App.tsx`, `Simulator.tsx`, `wallet.tsx`, `ui.tsx`, `style.css`: four routes, wallet chooser and reusable UI.
- `public/`, `dist/`: source assets and complete production export.
- `tests/`, `scripts/check-export.mjs`: reproducible checks; scratch outputs are ignored.
- [DESIGN.md](DESIGN.md): implemented design system; [validation](artifacts/validation.md): six-domain review and evidence; [path budget](artifacts/bundle-budget.md): explicit submission allocations.
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md): dependency, wallet-mark and design-guide attribution.
