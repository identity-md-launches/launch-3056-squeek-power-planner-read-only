# Submission path budget

Limit: **8,388,608 bytes (8 MiB)** of additions. The budgets below are explicit allocations, not measured sizes. The measured final total is recorded in validation.md.

| Path | Maximum allocated bytes | Purpose |
| --- | ---: | --- |
| `.gitignore` | 1,024 | Exclude generated dependencies/caches at every depth and disposable scratch tests. No source or export exclusions. |
| `dist/` | 2,097,152 | Complete static production export, local wallet marks, favicon and share image. |
| `src/` | 786,432 | React/TypeScript/CSS, official ABIs and pinned deployment record. |
| `public/` | 262,144 | Source assets copied into the export. |
| `tests/` | 262,144 | Model, interaction, wallet and live-read validation sources; synthetic data only in test fixtures. |
| `scripts/` | 65,536 | Rebuild/verification helpers if needed. |
| `artifacts/` | 3,145,728 | Review, validation and selected screenshots; no dependency archives or machine configuration. |
| Root manifests, lockfile, configuration and documentation | 1,048,576 | Build reproducibility, README, DESIGN, third-party notices. |
| **Allocated total** | **7,668,736** | **719,872 bytes of headroom** |

Positive inclusion rules `!/artifacts/` and `!/artifacts/**` keep the required reports in the submission, ahead of the generated-file exclusions. Exclusion rules are limited to `**/node_modules/`, `**/.cache/`, `**/.npm/`, `**/.vite/`, `**/coverage/`, `**/*.tsbuildinfo`, and `test/scratch/`. The required `dist/` directory is intentionally included. Browser binaries, package caches, toolchain dependencies, downloaded documentation and intermediate test logs stay in disposable scratch space.
