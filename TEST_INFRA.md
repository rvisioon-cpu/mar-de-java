# TEST_INFRA: 4-Tier Opaque-Box E2E Testing Infrastructure

## 1. Test Philosophy: Opaque-Box, Requirement-Driven Testing

The Showroom Media and Typology Ingestion Pipeline is verified strictly through an **opaque-box, requirement-driven testing methodology**. Rather than coupling test logic to internal implementation state, the test suite verifies observable behaviors, filesystem outputs, SQLite records, manifest declarations, and network HTTP contracts defined in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

### Core Principles
1. **Opaque-Box Verification**: The test harness interacts with the system exclusively through its public interfaces:
   - Asset Manifest declarations (`src/data/asset-manifest.ts`)
   - Showroom configuration records (`src/data/floors.ts`)
   - D1 SQLite database tables (`floors`, `units`, `tours`)
   - URL generation and proxy routing logic (`getAssetUrl`, `/api/r2/[...path]`)
   - Staged media files and directory layout (`dist_assets/plants/details/`)
2. **Deterministic Expectation Derivation**: All expected values (counts, IDs, MIME types, dimensions, coordinates) are derived strictly from the client architectural specification and Google Drive delivery inventory:
   - 8 typology folders (`101`, `102`, `x01`, `x02`, `501.1`, `501.2`, `502.1`, `502.2`)
   - 3 base views per folder = 24 images (`furnished.webp`, `unfurnished.webp`, `plans.webp`)
   - 6 bidirectional transitions per folder = 48 videos (`transitions/*.mp4`)
   - 6 sequential gallery sets = 56 images (`gallery/*.webp`)
   - Total canonical media assets = **128 multimedia assets**
3. **Progressive Testability**: Tests validate milestone deliverables progressively. For earlier milestones, tests assert schema compliance, manifest registration, seed generation, and local SQLite consistency. When staging and distribution artifacts are present on disk, tests automatically validate physical file existence, non-zero byte sizes, and MIME headers.
4. **Zero-External-Dependency Execution**: The test runner is built in pure, native Node.js ESM (`.mjs`) without heavy external test runners or network dependencies, guaranteeing high execution speed (<200ms) and 100% deterministic local pass/fail results.

---

## 2. Feature Inventory Mapping to Test Tiers

| Feature ID | Feature Name | Test Tier | Primary Test Objectives |
|---|---|---|---|
| **F1** | E2E Test Suite | Tiers 1–4 | Standalone test harness, CLI runner, exit code 0/1 semantics, diagnostic reporting |
| **F4** | Base Views Normalization | Tier 1, Tier 4 | 24 WebP base views across all 8 folders; view cycling (furnished/unfurnished/plans) |
| **F5** | Gallery Images Normalization | Tier 1, Tier 4 | 56 WebP gallery images; sequential numbering `1.webp`..`N.webp`; duplex consolidation |
| **F6** | Transition Videos Transcoding | Tier 1, Tier 2, Tier 4 | 48 MP4 transition videos; bidirectional naming; byte-range streaming via proxy |
| **F7** | Staged Output Packaging | Tier 1 | Directory layout `dist_assets/plants/details/{assetId}/` with non-zero sizes |
| **F9** | Content-Type & Metadata | Tier 1 | MIME type mapping: `.webp` -> `image/webp`, `.mp4` -> `video/mp4` |
| **F10** | floors.ts Configuration Sync | Tier 3, Tier 4 | 12 units linked with asset paths; dimensions, bedrooms, bathrooms, tour URLs |
| **F11** | asset-manifest.ts Sync | Tier 1, Tier 3 | Complete preload registry containing 100% of showroom typology assets |
| **F12** | D1 Database Seed & SQL | Tier 2, Tier 3 | `generate-seed.mjs` generates valid SQL; local SQLite table rows match schema |
| **F13** | Full E2E Verification Pass | Tier 3, Tier 4 | Cross-feature integrity; duplex multi-level plan switching; offline fallback |

---

## 3. Test Architecture & Directory Layout

### 3.1 Directory Layout
```
tests/e2e/
├── run-all-tests.mjs                  # Master test runner CLI (supports --tier and --verbose)
├── helpers/
│   ├── assertion.mjs                 # Zero-dependency describe/it/expect runner with colored output
│   └── project-contracts.mjs         # Authoritative specifications, schemas, and contract helpers
├── tier1-feature-coverage.test.mjs   # Tier 1: 8 folders, 24 base views, 48 transitions, 56 gallery items
├── tier2-boundary-cases.test.mjs     # Tier 2: Edge cases, negative inputs, malformed JSON, range parser
├── tier3-cross-feature.test.mjs      # Tier 3: Pairwise cross-feature interactions (manifest, D1, proxy)
└── tier4-scenarios.test.mjs          # Tier 4: Real-world user journeys (view cycling, streaming, duplexes)
```

### 3.2 Invocation Commands
```bash
# Run the complete 4-tier E2E test suite
node tests/e2e/run-all-tests.mjs

# Run with verbose individual test logging
node tests/e2e/run-all-tests.mjs --verbose

# Run an individual tier
node tests/e2e/run-all-tests.mjs --tier=1
node tests/e2e/run-all-tests.mjs --tier=2
node tests/e2e/run-all-tests.mjs --tier=3
node tests/e2e/run-all-tests.mjs --tier=4
```

### 3.3 Pass / Fail Semantics
- **Exit Code 0**: 100% of executed test assertions passed.
- **Exit Code 1**: One or more assertions failed or a fatal exception occurred.
- **Diagnostic Output**: When any failure occurs, the runner prints:
  - Exact failing suite and test name
  - Expected value vs actual received value
  - Error stack trace with file and line numbers
  - Summary of total tests, passed, failed, and execution duration in milliseconds.

---

## 4. Coverage Thresholds & Criteria

| Tier | Minimum Threshold | Achieved in Suite | Status |
|---|---|---|---|
| **Tier 1: Feature Coverage** | $\ge 5$ tests per feature | 25 assertions covering 8 folders, 24 base views, 48 transitions, 56 gallery images, and MIME types | **EXCEEDED** |
| **Tier 2: Boundary & Corner Cases** | $\ge 5$ tests per feature | 17 assertions covering empty fields, path traversal, out-of-bounds indices, SQL quote escaping, JSON integrity, and range parser bounds | **EXCEEDED** |
| **Tier 3: Cross-Feature Interactions** | Pairwise cross-module matrix | 16 assertions validating pairwise contracts: floors.ts ↔ manifest, floors.ts ↔ seed.sql, seed.sql ↔ SQLite, assets.ts ↔ proxy, duplex consistency | **EXCEEDED** |
| **Tier 4: Real-World Scenarios** | $\ge 5$ application scenarios | 10 assertions across 5 complete user journeys (apartment view cycling, range streaming, gallery walkthrough, duplex level switching, DB fallback) | **EXCEEDED** |

---

## 5. Test Tier Details

### Tier 1: Feature Coverage
- **Typology Folders Inventory**: Verifies all 8 canonical folders (`101`, `102`, `x01`, `x02`, `501.1`, `501.2`, `502.1`, `502.2`).
- **Base Views (F4)**: Asserts all 24 base views (`furnished.webp`, `unfurnished.webp`, `plans.webp`) exist in the manifest and adhere to WebP format.
- **Transition Videos (F6)**: Asserts all 48 transitions exist across all 8 folders with canonical bidirectional naming (`{from}_to_{to}.mp4`).
- **Gallery Images (F5)**: Asserts all 56 sequential gallery images exist across 6 gallery sets (9 for 101, 8 for 102, 8 for x01, 7 for x02, 12 for 501, 12 for 502).
- **MIME & Metadata (F9)**: Asserts all 128 assets have canonical lowercase prefixes and correct MIME mapping (`image/webp`, `video/mp4`).

### Tier 2: Boundary & Corner Cases
- **Empty / Missing Fields**: Basements without units (`S1`, `S2`), optional fields (`photosBalcony`, `tourUrl`), null/empty URL handling.
- **Invalid Asset IDs**: Out-of-spec folder IDs (`999`, `001`, `xyz`), path traversal (`../`), case mismatches (`X01`), non-numeric gallery files.
- **D1 JSON Integrity & SQL Escaping**: Verifies every JSON array in SQLite `photos_furnished`, `photos_unfurnished`, `photos_plans`, `gallery` parses cleanly without syntax errors; verifies SQL single-quote escaping; checks coordinate bounds (0-100%).
- **Transition Pair Boundaries**: Self-transitions rejected (`furnished_to_furnished`), invalid state names rejected, forward/inverse complements confirmed.
- **Range Streaming Parser**: Validates byte-range header parsing (`bytes=0-1024`, `bytes=1000-`, `bytes=-500`), invalid range rejection, and total size bounds checking.

### Tier 3: Cross-Feature Interactions
- **floors.ts ↔ asset-manifest.ts**: 100% of paths referenced across all 12 units exist in `assetManifest`.
- **floors.ts ↔ seed.sql**: Every floor and unit in `floorsData` generates matching `INSERT` statements with exact dimensions, bedroom/bathroom counts, and duplex typing.
- **seed.sql ↔ D1 SQLite Database**: Asserts 8 floors, 12 units, foreign key integrity, and 11 tours exist in the local SQLite database.
- **assets.ts ↔ R2 Routing**: Standard images routed to public CDN or relative path; videos strictly routed via same-origin `/api/r2/` proxy; canvas images routed via proxy; map icons preserved same-origin.
- **Duplex Cross-Level Consistency**: Duplex levels (501.1 ↔ 501.2, 502.1 ↔ 502.2) share identical dimensions, rooms, tour URLs, and gallery sets while keeping distinct base views.

### Tier 4: Real-World Application Scenarios
- **Scenario 1 — Apartment View Cycling**: User selects Flat 101, views Furnished, toggles Unfurnished, toggles Plans, verifying distinct asset URLs.
- **Scenario 2 — Video Streaming & Seeking**: User initiates transition playback, request is sent with `Range: bytes=0-1023`, receives HTTP 206 with `Content-Range` and `Accept-Ranges: bytes`; user seeks to midpoint.
- **Scenario 3 — Gallery Walkthrough**: User steps sequentially through all photos in Unit 102 (1..8), bounds guard prevents overflow, cyclic wrap-around is verified.
- **Scenario 4 — Duplex Multi-Level Switching**: User views Duplex 501 Lower Level (`501.1`), clicks Level 2, views Upper Level (`501.2`), verifies shared gallery and tour continuity.
- **Scenario 5 — Database Fallback Resiliency**: When D1 database is unreachable, application gracefully falls back to static `floorsData`, `getEntryFloorId()` returns floor `'6'`, and all 12 units remain functional.
