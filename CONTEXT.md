# CategorizeOnce — Domain Glossary

## Preamble Rows

Rows at the top of a bank CSV export that precede the actual column header row. Contain metadata (e.g., export timestamp, account info) that is not transaction data and must be discarded before parsing. Example: BMO Mastercard exports include 2 preamble rows before the real header.

## Header Row

The row in the uploaded CSV that contains column names. In a clean CSV this is row 1. When preamble rows are present, the user designates which row is the header row during the import preview step.

## Identifier

The column the user selects as the payee/payer field. Used as the key for mapping rules. Chosen during the ChooseIdentifier wizard step.

## Mapping Rules

Persisted lookup table (`localStorage`, key `co:expense_mapping_rules`) from identifier value → category string. Applied automatically to future imports.

## Category

A string assigned to a transaction. Supports subcategories via `::` delimiter (e.g., `Expense::Grocery`). Split on export into `CO_category`, `CO_category_2`, etc.

## Synthetic Fields

Two fields injected by the app into every parsed transaction row — not present in the source CSV:
- `CO_id`: integer index, used as React list key and row target
- `CO_category`: empty string initially; filled during categorization; stripped on export
