# ADR 0001 — Single raw parse for header row selection

## Status

Accepted

## Context

Bank CSV exports (e.g., BMO Mastercard) include preamble rows before the real column header. PapaParse's `header: true` mode always treats row 1 as the header, so preamble rows corrupt column names and inject garbage data rows. The app needs to let users designate which row is the real header.

Two approaches were considered:

**Option A — Single parse, manual processing:**
Parse once with `header: false` (produces array-of-arrays). Show first 10 rows as a preview. User clicks the header row. App slices the array: rows above = discarded, clicked row = field names, rows below = data. Map data rows to objects using those field names. No second parse needed.

**Option B — Two-pass parse:**
Parse once with `header: false` for preview. After user selects row N, re-invoke PapaParse on the original file with a `beforeFirstChunk` transform that strips the first N lines, then parses with `header: true`.

## Decision

Option A — single parse with manual array slicing.

## Rationale

- One parse is simpler and faster; the file object may not be accessible after the first parse callback
- Array slicing is trivial (`data.slice(N)`, field extraction from `data[N]`)
- No need to re-trigger file reading or store the raw File object beyond the preview step
- Keeps all preamble logic inside `ImportStatement` with no changes to `CsvDropZone`

## Consequences

- `CsvDropZone` must pass `header: false` to PapaParse instead of `header: true`
- `ImportStatement` now owns header row selection and field-name extraction (previously delegated to PapaParse's `meta.fields`)
- The preview table renders raw string arrays, not objects — `TransactionTable` and downstream components are unaffected since the final data shape is identical
